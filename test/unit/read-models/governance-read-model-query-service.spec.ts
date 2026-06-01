import { expect } from 'chai'
import { MockGovernancePersistenceAdapter } from '@src/persistence'
import {
  GovernanceReadModelQueryService,
  MockGovernanceReadModelProjector,
  type GovernanceQueryContext,
} from '@src/read-models'

describe('ReadModels:GovernanceReadModelQueryService', () => {
  const tenantId = 'tenant-1'
  const context: GovernanceQueryContext = {
    tenantId,
    actorId: 'actor-reader',
    roles: ['governance:reader'],
    requestId: 'request-1',
    correlationId: 'correlation-1',
  }

  let adapter: MockGovernancePersistenceAdapter
  let service: GovernanceReadModelQueryService

  beforeEach(async () => {
    adapter = new MockGovernancePersistenceAdapter()
    service = new GovernanceReadModelQueryService({ projector: new MockGovernanceReadModelProjector(adapter) })
    await seedGovernanceRecords(adapter)
  })

  it('fails closed when query context is missing', async () => {
    const result = await service.listProposals(null, { tenantId })

    expect(result.ok).to.equal(false)
    if (!result.ok) expect(result.error.code).to.equal('MISSING_QUERY_CONTEXT')
  })

  it('fails closed when context tenant scope is missing', async () => {
    const result = await service.listProposals({ ...context, tenantId: '' }, { tenantId })

    expect(result.ok).to.equal(false)
    if (!result.ok) expect(result.error.code).to.equal('MISSING_TENANT_SCOPE')
  })

  it('fails closed when query tenant scope does not match context', async () => {
    const result = await service.listProposals(context, { tenantId: 'tenant-2' })

    expect(result.ok).to.equal(false)
    if (!result.ok) expect(result.error.code).to.equal('UNAUTHORIZED')
  })

  it('lists proposals through read-only projection with safe default pagination', async () => {
    const result = await service.listProposals(context, { tenantId, status: 'submitted' })

    expect(result.ok).to.equal(true)
    if (!result.ok) return
    expect(result.value.items.map(item => item.proposalId)).to.deep.equal(['proposal-2'])
    expect(result.value.page.limit).to.equal(25)
    expect(result.value.items[0].executionIntentStatus).to.equal('recorded')
  })

  it('validates pagination limits and offsets', async () => {
    const excessiveLimit = await service.listProposals(context, { tenantId, limit: 101 })
    const negativeOffset = await service.listProposals(context, { tenantId, offset: -1 })

    expect(excessiveLimit.ok).to.equal(false)
    if (!excessiveLimit.ok) expect(excessiveLimit.error.code).to.equal('QUERY_LIMIT_EXCEEDED')
    expect(negativeOffset.ok).to.equal(false)
    if (!negativeOffset.ok) expect(negativeOffset.error.code).to.equal('INVALID_QUERY')
  })

  it('validates date ranges', async () => {
    const result = await service.getGovernanceTimeline(context, {
      tenantId,
      dateFrom: '2026-05-30T00:00:00.000Z',
      dateTo: '2026-05-29T00:00:00.000Z',
    })

    expect(result.ok).to.equal(false)
    if (!result.ok) expect(result.error.code).to.equal('INVALID_QUERY')
  })

  it('returns proposal detail and maps missing proposals to not found', async () => {
    const detail = await service.getProposalDetail(context, { tenantId, proposalId: 'proposal-1' })
    const missing = await service.getProposalDetail(context, { tenantId, proposalId: 'missing-proposal' })

    expect(detail.ok).to.equal(true)
    if (detail.ok) {
      expect(detail.value.proposal.proposalId).to.equal('proposal-1')
      expect(JSON.stringify(detail.value)).not.to.include('sensitive-evidence-payload')
    }
    expect(missing.ok).to.equal(false)
    if (!missing.ok) expect(missing.error.code).to.equal('NOT_FOUND')
  })

  it('returns timeline, decision history, emergency actions and tenant summary read models', async () => {
    const timeline = await service.getGovernanceTimeline(context, { tenantId, proposalId: 'proposal-1' })
    const decisions = await service.listDecisionHistory(context, { tenantId, proposalId: 'proposal-1' })
    const emergencies = await service.listEmergencyActions(context, { tenantId })
    const summary = await service.getTenantGovernanceSummary(context, { tenantId })

    expect(timeline.ok).to.equal(true)
    if (timeline.ok) expect(timeline.value.entries.map(item => item.eventType)).to.include('decision.recorded')
    expect(decisions.ok).to.equal(true)
    if (decisions.ok) expect(decisions.value.items[0].executionImpact).to.equal('record_only')
    expect(emergencies.ok).to.equal(true)
    if (emergencies.ok) expect(emergencies.value.items[0].severity).to.equal('critical')
    expect(summary.ok).to.equal(true)
    if (summary.ok) expect(summary.value.blockedExecutionIntents).to.equal(1)
  })

  it('requires elevated role for audit trail and exposes references only', async () => {
    const denied = await service.listAuditTrail(context, { tenantId, entityType: 'proposal', entityId: 'proposal-1' })
    const allowed = await service.listAuditTrail(
      { ...context, roles: ['governance:auditor'] },
      { tenantId, entityType: 'proposal', entityId: 'proposal-1' },
    )

    expect(denied.ok).to.equal(false)
    if (!denied.ok) expect(denied.error.code).to.equal('RESTRICTED_FIELD')
    expect(allowed.ok).to.equal(true)
    if (!allowed.ok) return
    expect(allowed.value.items[0].evidenceReferenceCount).to.equal(1)
    expect(JSON.stringify(allowed.value)).not.to.include('sensitive-evidence-payload')
  })

  it('restricts actor activity to elevated roles or actor self-scope', async () => {
    const denied = await service.listActorActivity(context, { tenantId, actorId: 'actor-reviewer' })
    const self = await service.listActorActivity(
      { ...context, actorId: 'actor-reviewer' },
      { tenantId, actorId: 'actor-reviewer' },
    )
    const auditor = await service.listActorActivity(
      { ...context, roles: ['governance:auditor'] },
      { tenantId, actorId: 'actor-reviewer' },
    )

    expect(denied.ok).to.equal(false)
    if (!denied.ok) expect(denied.error.code).to.equal('RESTRICTED_FIELD')
    expect(self.ok).to.equal(true)
    if (self.ok) expect(self.value.actorId).to.equal('actor-reviewer')
    expect(auditor.ok).to.equal(true)
    if (auditor.ok) expect(auditor.value.items.map(item => item.actionType)).to.include('review.recorded')
  })

  it('fails closed for execution-shaped query input and never mutates stored records', async () => {
    const blocked = await service.listProposals(context, { tenantId, executionRequested: true })
    expect(blocked.ok).to.equal(false)
    if (!blocked.ok) expect(blocked.error.code).to.equal('EXECUTION_FORBIDDEN')

    const result = await service.listProposals(context, { tenantId })
    expect(result.ok).to.equal(true)
    if (!result.ok) return
    result.value.items[0].status = 'mutated'

    const source = await adapter.proposals.getProposalById(result.value.items[0].proposalId)
    expect(source.ok).to.equal(true)
    if (source.ok) expect(source.value.status).not.to.equal('mutated')
  })
})

const seedGovernanceRecords = async (adapter: MockGovernancePersistenceAdapter) => {
  await adapter.proposals.createProposal({
    proposalId: 'proposal-1',
    tenantId: 'tenant-1',
    daoId: 'dao-1',
    actorId: 'actor-proposer',
    status: 'approved',
    title: 'Treasury policy review',
    createdAt: '2026-05-29T00:00:00.000Z',
    updatedAt: '2026-05-29T00:10:00.000Z',
  })
  await adapter.proposals.createProposal({
    proposalId: 'proposal-2',
    tenantId: 'tenant-1',
    daoId: 'dao-1',
    actorId: 'actor-proposer',
    status: 'submitted',
    title: 'Product enablement',
    createdAt: '2026-05-29T00:01:00.000Z',
    updatedAt: '2026-05-29T00:20:00.000Z',
  })
  await adapter.proposals.createProposal({
    proposalId: 'proposal-tenant-2',
    tenantId: 'tenant-2',
    status: 'submitted',
    createdAt: '2026-05-29T00:03:00.000Z',
  })

  await adapter.proposalVersions.createProposalVersion({
    proposalId: 'proposal-1',
    version: 1,
    tenantId: 'tenant-1',
    actorId: 'actor-proposer',
    title: 'Version 1',
    contentHash: 'hash-v1',
    createdAt: '2026-05-29T00:04:00.000Z',
  })

  await adapter.decisions.recordDecision({
    decisionId: 'decision-1',
    proposalId: 'proposal-1',
    tenantId: 'tenant-1',
    actorId: 'actor-decision',
    authorityRef: 'constitutional-review',
    outcome: 'approved',
    evidenceReferences: ['evidence-ref-1'],
    createdAt: '2026-05-29T00:30:00.000Z',
  })
  await adapter.votes.recordVote({
    voteId: 'vote-1',
    proposalId: 'proposal-1',
    tenantId: 'tenant-1',
    actorId: 'actor-voter',
    vote: 'yes',
    votingPower: '100',
    createdAt: '2026-05-29T00:25:00.000Z',
  })
  await adapter.reviews.recordReview({
    reviewId: 'review-1',
    proposalId: 'proposal-1',
    tenantId: 'tenant-1',
    actorId: 'actor-reviewer',
    recommendation: 'approve-with-conditions',
    status: 'pending',
    rationale: 'sensitive-evidence-payload should not be rendered',
    createdAt: '2026-05-29T00:22:00.000Z',
  })

  await adapter.executionIntents.recordExecutionIntent({
    intentId: 'intent-1',
    proposalId: 'proposal-1',
    tenantId: 'tenant-1',
    executionEnabled: false,
    executionStatus: 'blocked',
    blockedReason: 'production execution disabled',
    createdAt: '2026-05-29T00:35:00.000Z',
  })
  await adapter.executionIntents.recordExecutionIntent({
    intentId: 'intent-2',
    proposalId: 'proposal-2',
    tenantId: 'tenant-1',
    executionEnabled: false,
    executionStatus: 'recorded',
    createdAt: '2026-05-29T00:36:00.000Z',
  })

  await adapter.emergencyActions.recordEmergencyAction({
    actionId: 'emergency-1',
    tenantId: 'tenant-1',
    actorId: 'boardroom-1',
    actionType: 'TREASURY_FREEZE_REVIEW',
    status: 'requested',
    createdAt: '2026-05-29T00:40:00.000Z',
  })
  await adapter.emergencyActions.recordRatification('emergency-1', {
    ratificationId: 'ratification-1',
    actionId: 'emergency-1',
    actorId: 'constitutional-reviewer',
    outcome: 'accepted',
    createdAt: '2026-05-29T00:45:00.000Z',
  })

  await adapter.audit.appendAuditRecord({
    auditId: 'audit-1',
    tenantId: 'tenant-1',
    actorId: 'actor-reviewer',
    actionType: 'proposal.approved.audit',
    entityType: 'proposal',
    entityId: 'proposal-1',
    evidenceReferences: ['evidence-ref-1'],
    newState: { status: 'approved', sensitive: 'sensitive-evidence-payload' },
    createdAt: '2026-05-29T00:50:00.000Z',
  })
  await adapter.receiptReferences.recordReceiptReference({
    receiptId: 'receipt-1',
    entityType: 'proposal',
    entityId: 'proposal-1',
    tenantId: 'tenant-1',
    source: 'mock_service',
    reference: 'receipt-ref-1',
    createdAt: '2026-05-29T00:55:00.000Z',
  })
}
