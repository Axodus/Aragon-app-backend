import { expect } from 'chai'
import { MockGovernancePersistenceAdapter } from '@src/persistence'
import {
  LocalGovernanceMockIndexer,
  MockGovernanceReadModelProjector,
  type LocalGovernanceIndexInput,
} from '@src/read-models'

describe('ReadModels:LocalGovernanceMockIndexer', () => {
  const tenantId = 'tenant-1'
  let adapter: MockGovernancePersistenceAdapter
  let indexer: LocalGovernanceMockIndexer
  let idCounter: number
  let tick: number

  beforeEach(async () => {
    adapter = new MockGovernancePersistenceAdapter()
    idCounter = 0
    tick = 0
    indexer = new LocalGovernanceMockIndexer({
      persistence: adapter,
      projector: new MockGovernanceReadModelProjector(adapter),
      clock: () => `2026-05-29T00:${String(tick++).padStart(2, '0')}:00.000Z`,
      idFactory: () => `checkpoint-${++idCounter}`,
    })
    await seedGovernanceRecords(adapter)
  })

  it('performs manual full tenant indexing with fresh metadata and checkpoint', async () => {
    const result = await indexer.indexTenant({ tenantId, correlationId: 'correlation-1' })

    expect(result.ok).to.equal(true)
    if (!result.ok) return
    expect(result.checkpoint.status).to.equal('complete')
    expect(result.checkpoint.indexName).to.equal('full-tenant')
    expect(result.checkpoint.correlationId).to.equal('correlation-1')
    expect(result.value.proposalList.metadata.freshness).to.equal('fresh')
    expect(result.value.proposalList.metadata.indexCheckpointId).to.equal(result.checkpoint.checkpointId)
    expect(result.value.proposalList.items.map(item => item.proposalId)).to.deep.equal(['proposal-2', 'proposal-1'])
    expect(result.value.tenantGovernanceSummary.blockedExecutionIntents).to.equal(1)
    expect(result.stats.readModelCount).to.equal(6)
    expect(result.stats.sourceRecordCount).to.be.greaterThan(0)
  })

  it('performs manual proposal indexing and filters proposal timeline/decisions', async () => {
    const result = await indexer.indexProposal({ tenantId, proposalId: 'proposal-1' })

    expect(result.ok).to.equal(true)
    if (!result.ok) return
    expect(result.value.proposalDetail.proposal.proposalId).to.equal('proposal-1')
    expect(result.value.governanceTimeline.entries.every(item => item.entityId === 'proposal-1')).to.equal(true)
    expect(result.value.decisionHistory.items).to.have.length(1)
    expect(result.value.proposalDetail.metadata.indexCheckpointId).to.equal(result.checkpoint.checkpointId)
  })

  it('indexes timeline, decision history, emergency actions and audit trail manually', async () => {
    const timeline = await indexer.indexTimeline({ tenantId, proposalId: 'proposal-1' })
    const decisions = await indexer.indexDecisionHistory({ tenantId, proposalId: 'proposal-1' })
    const emergencies = await indexer.indexEmergencyActions({ tenantId })
    const audit = await indexer.indexAuditTrail({ tenantId, entityType: 'proposal', entityId: 'proposal-1' })

    expect(timeline.ok).to.equal(true)
    if (timeline.ok) expect(timeline.value.entries.map(item => item.eventType)).to.include('decision.recorded')
    expect(decisions.ok).to.equal(true)
    if (decisions.ok) expect(decisions.value.items[0].executionImpact).to.equal('record_only')
    expect(emergencies.ok).to.equal(true)
    if (emergencies.ok) expect(emergencies.value.items[0].severity).to.equal('critical')
    expect(audit.ok).to.equal(true)
    if (audit.ok) {
      expect(audit.value.items[0].evidenceReferenceCount).to.equal(1)
      expect(JSON.stringify(audit.value)).not.to.include('sensitive-evidence-payload')
    }
  })

  it('indexes actor activity when actor scope is supplied', async () => {
    const result = await indexer.indexActorActivity({ tenantId, actorId: 'actor-reviewer' })

    expect(result.ok).to.equal(true)
    if (!result.ok) return
    expect(result.value.actorId).to.equal('actor-reviewer')
    expect(result.value.items.map(item => item.actionType)).to.include('review.recorded')
  })

  it('stores and returns the latest mock checkpoint through mock persistence', async () => {
    await indexer.indexTenant({ tenantId })
    const second = await indexer.indexTimeline({ tenantId })
    const latest = await indexer.getLastCheckpoint({ tenantId, indexName: 'governance-timeline' })

    expect(second.ok).to.equal(true)
    expect(latest.ok).to.equal(true)
    if (second.ok && latest.ok && latest.value) {
      expect(latest.value.checkpointId).to.equal(second.checkpoint.checkpointId)
      expect(latest.value.status).to.equal('complete')
    }
  })

  it('fails closed for missing tenant, missing proposal and unsupported indexes', async () => {
    const missingTenant = await indexer.indexTenant({ tenantId: '' })
    const missingProposalId = await indexer.indexProposal({ tenantId })
    const missingProposal = await indexer.indexProposal({ tenantId, proposalId: 'missing-proposal' })
    const unsupported = await indexer.index({ tenantId, indexName: 'unknown' as never })

    expect(missingTenant.ok).to.equal(false)
    if (!missingTenant.ok) expect(missingTenant.error.code).to.equal('MISSING_TENANT_SCOPE')
    expect(missingProposalId.ok).to.equal(false)
    if (!missingProposalId.ok) expect(missingProposalId.error.code).to.equal('INVALID_INDEX_REQUEST')
    expect(missingProposal.ok).to.equal(false)
    if (!missingProposal.ok) {
      expect(missingProposal.error.code).to.equal('SOURCE_RECORD_NOT_FOUND')
      expect(missingProposal.checkpoint?.status).to.equal('failed')
    }
    expect(unsupported.ok).to.equal(false)
    if (!unsupported.ok) expect(unsupported.error.code).to.equal('UNSUPPORTED_INDEX')
  })

  it('fails closed for execution-shaped indexing requests', async () => {
    const request: LocalGovernanceIndexInput & { executionRequested: boolean } = {
      tenantId,
      indexName: 'full-tenant',
      executionRequested: true,
    }
    const result = await indexer.index(request)

    expect(result.ok).to.equal(false)
    if (!result.ok) expect(result.error.code).to.equal('EXECUTION_FORBIDDEN')
  })

  it('does not mutate source records through projected snapshots', async () => {
    const result = await indexer.indexTenant({ tenantId })
    expect(result.ok).to.equal(true)
    if (!result.ok) return

    result.value.proposalList.items[0].status = 'mutated'
    const source = await adapter.proposals.getProposalById(result.value.proposalList.items[0].proposalId)

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
