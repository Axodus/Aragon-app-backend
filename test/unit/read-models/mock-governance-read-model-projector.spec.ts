import { expect } from 'chai'
import { MockGovernancePersistenceAdapter } from '@src/persistence'
import { MockGovernanceReadModelProjector } from '@src/read-models'

describe('ReadModels:MockGovernanceReadModelProjector', () => {
  const tenantId = 'tenant-1'
  let adapter: MockGovernancePersistenceAdapter
  let projector: MockGovernanceReadModelProjector

  beforeEach(async () => {
    adapter = new MockGovernancePersistenceAdapter()
    projector = new MockGovernanceReadModelProjector(adapter)
    await seedGovernanceRecords(adapter)
  })

  it('projects proposal list with tenant/status filters, pagination and execution intent summary', async () => {
    const result = await projector.projectProposalList({ tenantId, status: 'submitted', limit: 1, offset: 0 })

    expect(result.ok).to.equal(true)
    if (!result.ok) return
    expect(result.value.metadata.freshness).to.equal('fresh')
    expect(result.value.page.total).to.equal(2)
    expect(result.value.page.hasNextPage).to.equal(true)
    expect(result.value.items.map(item => item.proposalId)).to.deep.equal(['proposal-2'])
    expect(result.value.items[0].executionIntentStatus).to.equal('recorded')
  })

  it('projects proposal detail with versions, decisions, votes, reviews, intents, audit and receipt references', async () => {
    const result = await projector.projectProposalDetail({ tenantId, proposalId: 'proposal-1' })

    expect(result.ok).to.equal(true)
    if (!result.ok) return
    expect(result.value.proposal.proposalId).to.equal('proposal-1')
    expect(result.value.latestVersion?.version).to.equal(2)
    expect(result.value.versions).to.have.length(2)
    expect(result.value.decisions.map(item => item.outcome)).to.deep.equal(['approved'])
    expect(result.value.votes.map(item => item.actorId)).to.deep.equal(['actor-voter'])
    expect(result.value.reviews.map(item => item.status)).to.deep.equal(['pending'])
    expect(result.value.executionIntents[0].executionIntentStatus).to.equal('blocked')
    expect(result.value.auditReferences[0].evidenceReferenceCount).to.equal(1)
    expect(result.value.receiptReferences[0].source).to.equal('mock_service')
  })

  it('returns not found for proposal detail outside tenant scope', async () => {
    const result = await projector.projectProposalDetail({ tenantId: 'tenant-2', proposalId: 'proposal-1' })

    expect(result.ok).to.equal(false)
    if (!result.ok) expect(result.error.code).to.equal('NOT_FOUND')
  })

  it('projects timeline entries sorted by occurredAt descending', async () => {
    const result = await projector.projectGovernanceTimeline({ tenantId, proposalId: 'proposal-1' })

    expect(result.ok).to.equal(true)
    if (!result.ok) return
    expect(result.value.entries[0].occurredAt >= result.value.entries[1].occurredAt).to.equal(true)
    expect(result.value.entries.map(item => item.eventType)).to.include.members([
      'decision.recorded',
      'vote.cast',
      'review.recorded',
      'proposal.approved',
      'proposal.approved.audit',
      'receipt.reference_recorded',
    ])
  })

  it('projects decision history with record-only execution impact', async () => {
    const result = await projector.projectDecisionHistory({ tenantId, proposalId: 'proposal-1' })

    expect(result.ok).to.equal(true)
    if (!result.ok) return
    expect(result.value.items).to.have.length(1)
    expect(result.value.items[0].executionImpact).to.equal('record_only')
    expect(result.value.items[0].evidenceReferences).to.deep.equal(['evidence-ref-1'])
  })

  it('projects actor activity without exposing evidence contents', async () => {
    const result = await projector.projectActorActivity({ tenantId, actorId: 'actor-reviewer' })

    expect(result.ok).to.equal(true)
    if (!result.ok) return
    expect(result.value.actorId).to.equal('actor-reviewer')
    expect(result.value.items.map(item => item.actionType)).to.include('review.recorded')
    expect(JSON.stringify(result.value)).not.to.include('sensitive-evidence-payload')
  })

  it('projects tenant governance summary counts', async () => {
    const result = await projector.projectTenantGovernanceSummary({ tenantId })

    expect(result.ok).to.equal(true)
    if (!result.ok) return
    expect(result.value.proposalCountsByStatus.approved).to.equal(1)
    expect(result.value.proposalCountsByStatus.submitted).to.equal(2)
    expect(result.value.openReviews).to.equal(1)
    expect(result.value.activeEmergencyActions).to.equal(1)
    expect(result.value.blockedExecutionIntents).to.equal(1)
  })

  it('projects emergency actions by severity and ratification state', async () => {
    const result = await projector.projectEmergencyActions({ tenantId })

    expect(result.ok).to.equal(true)
    if (!result.ok) return
    expect(result.value.items[0].severity).to.equal('critical')
    expect(result.value.items[0].ratificationStatus).to.equal('ratified')
    expect(result.value.items[0].reason).to.equal('TREASURY_FREEZE_REVIEW')
  })

  it('projects audit trail with evidence reference counts only', async () => {
    const result = await projector.projectAuditTrail({ tenantId, entityType: 'proposal', entityId: 'proposal-1' })

    expect(result.ok).to.equal(true)
    if (!result.ok) return
    expect(result.value.items).to.have.length(1)
    expect(result.value.items[0].evidenceReferenceCount).to.equal(1)
    expect(JSON.stringify(result.value)).not.to.include('sensitive-evidence-payload')
  })

  it('does not mutate underlying records during projection', async () => {
    const result = await projector.projectProposalList({ tenantId })
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
    proposalId: 'proposal-3',
    tenantId: 'tenant-1',
    daoId: 'dao-1',
    actorId: 'actor-other',
    status: 'submitted',
    title: 'Lower priority proposal',
    createdAt: '2026-05-29T00:02:00.000Z',
    updatedAt: '2026-05-29T00:15:00.000Z',
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
  await adapter.proposalVersions.createProposalVersion({
    proposalId: 'proposal-1',
    version: 2,
    tenantId: 'tenant-1',
    actorId: 'actor-proposer',
    title: 'Version 2',
    contentHash: 'hash-v2',
    createdAt: '2026-05-29T00:05:00.000Z',
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
    newState: { status: 'approved' },
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
