import { expect } from 'chai'
import { MockGovernancePersistenceAdapter } from '@src/persistence'
import {
  GovernanceReadModelQueryService,
  MockGovernanceReadModelProjector,
  type GovernanceQueryContext,
} from '@src/read-models'

describe('ReadModels:GovernanceReadModelQueryService authorization hardening', () => {
  const tenantId = 'tenant-auth-1'
  const otherTenantId = 'tenant-auth-2'
  const reader: GovernanceQueryContext = {
    tenantId,
    actorId: 'actor-reader',
    roles: ['governance:reader'],
    requestId: 'request-auth-1',
    correlationId: 'correlation-auth-1',
  }
  const reviewer: GovernanceQueryContext = { ...reader, actorId: 'actor-reviewer', roles: ['governance:reviewer'] }
  const auditor: GovernanceQueryContext = { ...reader, actorId: 'actor-auditor', roles: ['governance:auditor'] }
  const admin: GovernanceQueryContext = { ...reader, actorId: null, roles: ['governance:admin'] }

  let adapter: MockGovernancePersistenceAdapter
  let service: GovernanceReadModelQueryService

  beforeEach(async () => {
    adapter = new MockGovernancePersistenceAdapter()
    service = new GovernanceReadModelQueryService({ projector: new MockGovernanceReadModelProjector(adapter) })
    await seedAuthRecords(adapter, tenantId, otherTenantId)
  })

  it('fails closed for missing actor scope unless context is local admin', async () => {
    const denied = await service.listProposals({ ...reader, actorId: null }, { tenantId })
    const allowed = await service.listProposals(admin, { tenantId })

    expect(denied.ok).to.equal(false)
    if (!denied.ok) expect(denied.error.code).to.equal('UNAUTHORIZED')
    expect(allowed.ok).to.equal(true)
  })

  it('fails closed for missing, empty or unknown roles', async () => {
    const noRoles = await service.listProposals({ ...reader, roles: [] }, { tenantId })
    const unknownRole = await service.listProposals({ ...reader, roles: ['governance:superuser'] }, { tenantId })

    expect(noRoles.ok).to.equal(false)
    if (!noRoles.ok) expect(noRoles.error.code).to.equal('UNAUTHORIZED')
    expect(unknownRole.ok).to.equal(false)
    if (!unknownRole.ok) expect(unknownRole.error.code).to.equal('UNAUTHORIZED')
  })

  it('enforces role hierarchy per read model', async () => {
    const proposals = await service.listProposals(reader, { tenantId })
    const detail = await service.getProposalDetail(reader, { tenantId, proposalId: 'proposal-auth-1' })
    const timelineDenied = await service.getGovernanceTimeline(reader, { tenantId })
    const timelineAllowed = await service.getGovernanceTimeline(reviewer, { tenantId })
    const decisionsDenied = await service.listDecisionHistory(reader, { tenantId })
    const decisionsAllowed = await service.listDecisionHistory(reviewer, { tenantId })

    expect(proposals.ok).to.equal(true)
    expect(detail.ok).to.equal(true)
    expect(timelineDenied.ok).to.equal(false)
    if (!timelineDenied.ok) expect(timelineDenied.error.code).to.equal('UNAUTHORIZED')
    expect(timelineAllowed.ok).to.equal(true)
    expect(decisionsDenied.ok).to.equal(false)
    if (!decisionsDenied.ok) expect(decisionsDenied.error.code).to.equal('UNAUTHORIZED')
    expect(decisionsAllowed.ok).to.equal(true)
  })

  it('denies cross-tenant proposal, emergency, audit and actor activity reads', async () => {
    const proposal = await service.getProposalDetail(reader, {
      tenantId: otherTenantId,
      proposalId: 'proposal-other-1',
    })
    const emergency = await service.listEmergencyActions(reader, { tenantId: otherTenantId })
    const audit = await service.listAuditTrail(auditor, { tenantId: otherTenantId })
    const activity = await service.listActorActivity(auditor, { tenantId: otherTenantId, actorId: 'actor-reviewer' })

    for (const result of [proposal, emergency, audit, activity]) {
      expect(result.ok).to.equal(false)
      if (!result.ok) expect(result.error.code).to.equal('UNAUTHORIZED')
    }
  })

  it('sanitizes sensitive proposal detail, decisions, audit trail and actor activity for all roles', async () => {
    const detail = await service.getProposalDetail(reader, { tenantId, proposalId: 'proposal-auth-1' })
    const decisions = await service.listDecisionHistory(reviewer, { tenantId })
    const audit = await service.listAuditTrail(auditor, { tenantId })
    const adminAudit = await service.listAuditTrail(admin, { tenantId })
    const activity = await service.listActorActivity(auditor, { tenantId, actorId: 'actor-reviewer' })

    for (const result of [detail, decisions, audit, adminAudit, activity]) {
      expect(result.ok).to.equal(true)
      if (result.ok) {
        const serialized = JSON.stringify(result.value)
        expect(serialized).not.to.include('sensitive-evidence-payload')
        expect(serialized).not.to.include('private-key-material')
        expect(serialized).not.to.include('permission-context-secret')
      }
    }
  })

  it('redacts critical emergency details for reader/reviewer and preserves sanitized detail for auditor/admin', async () => {
    const readerResult = await service.listEmergencyActions(reader, { tenantId })
    const reviewerResult = await service.listEmergencyActions(reviewer, { tenantId })
    const auditorResult = await service.listEmergencyActions(auditor, { tenantId })
    const adminResult = await service.listEmergencyActions(admin, { tenantId })

    expect(readerResult.ok).to.equal(true)
    if (readerResult.ok) expect(readerResult.value.items[0].actionType).to.equal('restricted_emergency_action')
    expect(reviewerResult.ok).to.equal(true)
    if (reviewerResult.ok) expect(reviewerResult.value.items[0].reason).to.equal('redacted emergency action')
    expect(auditorResult.ok).to.equal(true)
    if (auditorResult.ok) expect(auditorResult.value.items[0].actionType).to.equal('[redacted]')
    expect(adminResult.ok).to.equal(true)
    if (adminResult.ok) expect(adminResult.value.items[0].reason).to.equal('[redacted]')
  })

  it('restricts actor activity to auditor/admin or actor self-scope', async () => {
    const readerDenied = await service.listActorActivity(reader, { tenantId, actorId: 'actor-reviewer' })
    const selfAllowed = await service.listActorActivity(
      { ...reader, actorId: 'actor-reviewer' },
      { tenantId, actorId: 'actor-reviewer' },
    )
    const reviewerDenied = await service.listActorActivity(reviewer, { tenantId, actorId: 'actor-proposer' })
    const auditorAllowed = await service.listActorActivity(auditor, { tenantId, actorId: 'actor-reviewer' })
    const adminAllowed = await service.listActorActivity(admin, { tenantId, actorId: 'actor-reviewer' })

    expect(readerDenied.ok).to.equal(false)
    if (!readerDenied.ok) expect(readerDenied.error.code).to.equal('UNAUTHORIZED')
    expect(selfAllowed.ok).to.equal(true)
    expect(reviewerDenied.ok).to.equal(false)
    if (!reviewerDenied.ok) expect(reviewerDenied.error.code).to.equal('UNAUTHORIZED')
    expect(auditorAllowed.ok).to.equal(true)
    expect(adminAllowed.ok).to.equal(true)
  })

  it('keeps the service surface read-only and rejects execution-shaped inputs without mutating records', async () => {
    const methods = Object.getOwnPropertyNames(GovernanceReadModelQueryService.prototype)
    expect(methods).not.to.include.members([
      'createProposal',
      'updateProposal',
      'recordVote',
      'recordReview',
      'recordDecision',
      'createExecutionIntent',
      'executeProposal',
      'startIndexer',
      'writeDatabase',
      'writeFile',
      'performTreasuryAction',
      'performOnChainWrite',
    ])

    const blocked = await service.getProposalDetail(reader, {
      tenantId,
      proposalId: 'proposal-auth-1',
      treasuryAction: true,
    })
    expect(blocked.ok).to.equal(false)
    if (!blocked.ok) expect(blocked.error.code).to.equal('EXECUTION_FORBIDDEN')

    const stored = await adapter.proposals.getProposalById('proposal-auth-1')
    expect(stored.ok).to.equal(true)
    if (stored.ok) expect(stored.value.status).to.equal('approved')
  })
})

const seedAuthRecords = async (adapter: MockGovernancePersistenceAdapter, tenantId: string, otherTenantId: string) => {
  await adapter.proposals.createProposal({
    proposalId: 'proposal-auth-1',
    tenantId,
    daoId: 'dao-auth-1',
    actorId: 'actor-proposer',
    status: 'approved',
    title: 'Sensitive evidence policy',
    createdAt: '2026-05-29T01:00:00.000Z',
    updatedAt: '2026-05-29T01:10:00.000Z',
  })
  await adapter.proposals.createProposal({
    proposalId: 'proposal-other-1',
    tenantId: otherTenantId,
    daoId: 'dao-other-1',
    actorId: 'actor-other',
    status: 'submitted',
    createdAt: '2026-05-29T01:05:00.000Z',
  })
  await adapter.proposalVersions.createProposalVersion({
    proposalId: 'proposal-auth-1',
    tenantId,
    version: 1,
    actorId: 'actor-proposer',
    title: 'private-key-material version title',
    contentHash: 'content-hash-1',
    createdAt: '2026-05-29T01:11:00.000Z',
  })
  await adapter.decisions.recordDecision({
    decisionId: 'decision-auth-1',
    proposalId: 'proposal-auth-1',
    tenantId,
    actorId: 'actor-decision',
    authorityRef: 'permission-context-secret',
    outcome: 'approved',
    evidenceReferences: ['sensitive-evidence-payload-ref'],
    createdAt: '2026-05-29T01:20:00.000Z',
  })
  await adapter.reviews.recordReview({
    reviewId: 'review-auth-1',
    proposalId: 'proposal-auth-1',
    tenantId,
    actorId: 'actor-reviewer',
    recommendation: 'approve',
    status: 'pending',
    rationale: 'sensitive-evidence-payload',
    createdAt: '2026-05-29T01:21:00.000Z',
  })
  await adapter.audit.appendAuditRecord({
    auditId: 'audit-auth-1',
    tenantId,
    actorId: 'actor-reviewer',
    actionType: 'sensitive-evidence-payload.audit',
    entityType: 'proposal',
    entityId: 'proposal-auth-1',
    evidenceReferences: ['sensitive-evidence-payload-ref'],
    newState: { secret: 'private-key-material' },
    createdAt: '2026-05-29T01:30:00.000Z',
  })
  await adapter.emergencyActions.recordEmergencyAction({
    actionId: 'emergency-auth-1',
    tenantId,
    actorId: 'boardroom-auth-1',
    actionType: 'private-key-material emergency halt',
    status: 'requested',
    createdAt: '2026-05-29T01:40:00.000Z',
  })
}
