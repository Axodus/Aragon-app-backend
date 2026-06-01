import { expect } from 'chai'
import {
  MockGovernancePersistenceAdapter,
  type GovernanceProposalRecord,
  type GovernanceExecutionIntentRecord,
} from '@src/persistence'

describe('Persistence:MockGovernancePersistenceAdapter', () => {
  const now = '2026-05-29T00:00:00.000Z'
  let adapter: MockGovernancePersistenceAdapter

  const proposal = (proposalId: string, createdAt = now): GovernanceProposalRecord => ({
    proposalId,
    tenantId: 'tenant-1',
    daoId: 'dao-1',
    actorId: 'actor-1',
    status: 'draft',
    title: proposalId,
    createdAt,
  })

  beforeEach(() => {
    adapter = new MockGovernancePersistenceAdapter()
  })

  it('initializes repositories and reset helper', async () => {
    expect(adapter.proposals).to.exist
    expect(adapter.audit).to.exist

    await adapter.proposals.createProposal(proposal('proposal-1'))
    adapter.resetForTests()

    const result = await adapter.proposals.getProposalById('proposal-1')
    expect(result.ok).to.equal(false)
    if (!result.ok) {
      expect(result.error.code).to.equal('NOT_FOUND')
    }
  })

  it('creates, gets and lists proposals deterministically', async () => {
    await adapter.proposals.createProposal(proposal('proposal-b', '2026-05-29T00:00:02.000Z'))
    await adapter.proposals.createProposal(proposal('proposal-a', '2026-05-29T00:00:01.000Z'))

    const getResult = await adapter.proposals.getProposalById('proposal-a')
    expect(getResult.ok).to.equal(true)
    if (getResult.ok) {
      expect(getResult.value.title).to.equal('proposal-a')
    }

    const listResult = await adapter.proposals.listProposals()
    expect(listResult.ok).to.equal(true)
    if (listResult.ok) {
      expect(listResult.value.items.map(item => item.proposalId)).to.deep.equal(['proposal-a', 'proposal-b'])
    }
  })

  it('rejects duplicate proposal IDs and supports deterministic idempotency replay', async () => {
    const input = { ...proposal('proposal-1'), idempotencyKey: 'idem-1' }

    const first = await adapter.proposals.createProposal(input)
    const replay = await adapter.proposals.createProposal(input)
    const duplicate = await adapter.proposals.createProposal(proposal('proposal-1'))
    const conflict = await adapter.proposals.createProposal({
      ...proposal('proposal-2'),
      idempotencyKey: 'idem-1',
    })

    expect(first.ok).to.equal(true)
    expect(replay.ok).to.equal(true)
    expect(duplicate.ok).to.equal(false)
    expect(conflict.ok).to.equal(false)

    if (!duplicate.ok) {
      expect(duplicate.error.code).to.equal('DUPLICATE_RECORD')
    }
    if (!conflict.ok) {
      expect(conflict.error.code).to.equal('DUPLICATE_RECORD')
    }
  })

  it('updates proposal status without implying execution and appends timeline events', async () => {
    await adapter.proposals.createProposal(proposal('proposal-1'))

    const updated = await adapter.proposals.updateProposalStatus('proposal-1', {
      status: 'submitted',
      actorId: 'actor-reviewer',
      reason: 'review requested',
    })
    const event = await adapter.proposals.appendProposalEvent('proposal-1', {
      eventId: 'event-1',
      proposalId: 'proposal-1',
      eventType: 'proposal.submitted',
      actorId: 'actor-reviewer',
      createdAt: '2026-05-29T00:00:03.000Z',
    })
    const timeline = await adapter.proposals.getProposalTimeline('proposal-1')

    expect(updated.ok).to.equal(true)
    expect(event.ok).to.equal(true)
    expect(timeline.ok).to.equal(true)
    if (updated.ok) expect(updated.value.status).to.equal('submitted')
    if (timeline.ok) expect(timeline.value.map(item => item.eventId)).to.deep.equal(['event-1'])
  })

  it('keeps proposal versions append-only', async () => {
    const first = await adapter.proposalVersions.createProposalVersion({
      proposalId: 'proposal-1',
      version: 1,
      tenantId: 'tenant-1',
      actorId: 'actor-1',
      title: 'v1',
      createdAt: now,
    })
    const duplicate = await adapter.proposalVersions.createProposalVersion({
      proposalId: 'proposal-1',
      version: 1,
      tenantId: 'tenant-1',
      actorId: 'actor-2',
      title: 'mutated',
      createdAt: now,
    })
    const latest = await adapter.proposalVersions.getLatestProposalVersion('proposal-1')

    expect(first.ok).to.equal(true)
    expect(duplicate.ok).to.equal(false)
    if (!duplicate.ok) expect(duplicate.error.code).to.equal('DUPLICATE_RECORD')
    if (latest.ok) expect(latest.value.title).to.equal('v1')
  })

  it('records decisions without execution side effects', async () => {
    const result = await adapter.decisions.recordDecision({
      decisionId: 'decision-1',
      proposalId: 'proposal-1',
      tenantId: 'tenant-1',
      actorId: 'governance-council',
      authorityRef: 'constitutional-review',
      outcome: 'approved',
      evidenceReferences: ['evidence-1'],
      createdAt: now,
    })
    const list = await adapter.decisions.listDecisionsForProposal('proposal-1')

    expect(result.ok).to.equal(true)
    expect(list.ok).to.equal(true)
    if (list.ok) expect(list.value).to.have.length(1)
  })

  it('records votes and reviews as append-only governance records', async () => {
    const vote = await adapter.votes.recordVote({
      voteId: 'vote-1',
      proposalId: 'proposal-1',
      tenantId: 'tenant-1',
      actorId: 'voter-1',
      vote: 'yes',
      createdAt: now,
    })
    const review = await adapter.reviews.recordReview({
      reviewId: 'review-1',
      proposalId: 'proposal-1',
      tenantId: 'tenant-1',
      actorId: 'reviewer-1',
      recommendation: 'review-required',
      status: 'pending',
      createdAt: now,
    })
    const pending = await adapter.reviews.listPendingReviews()

    expect(vote.ok).to.equal(true)
    expect(review.ok).to.equal(true)
    expect(pending.ok).to.equal(true)
    if (pending.ok) expect(pending.value.map(item => item.reviewId)).to.deep.equal(['review-1'])
  })

  it('fails closed when execution intent tries to enable execution', async () => {
    const forbidden = await adapter.executionIntents.recordExecutionIntent({
      intentId: 'intent-1',
      proposalId: 'proposal-1',
      tenantId: 'tenant-1',
      executionEnabled: true,
      executionStatus: 'recorded',
      createdAt: now,
    } as unknown as GovernanceExecutionIntentRecord)
    const blocked = await adapter.executionIntents.recordExecutionIntent({
      intentId: 'intent-2',
      proposalId: 'proposal-1',
      tenantId: 'tenant-1',
      executionEnabled: false,
      executionStatus: 'recorded',
      createdAt: now,
    })
    const marked = await adapter.executionIntents.markExecutionBlocked('intent-2', 'production execution disabled')

    expect(forbidden.ok).to.equal(false)
    if (!forbidden.ok) expect(forbidden.error.code).to.equal('EXECUTION_FORBIDDEN')
    expect(blocked.ok).to.equal(true)
    expect(marked.ok).to.equal(true)
    if (marked.ok) {
      expect(marked.value.executionEnabled).to.equal(false)
      expect(marked.value.executionStatus).to.equal('blocked')
    }
  })

  it('records emergency actions and explicit ratifications without executing actions', async () => {
    const action = await adapter.emergencyActions.recordEmergencyAction({
      actionId: 'emergency-1',
      tenantId: 'tenant-1',
      actorId: 'boardroom-1',
      actionType: 'TREASURY_FREEZE_REVIEW',
      status: 'requested',
      createdAt: now,
    })
    const ratified = await adapter.emergencyActions.recordRatification('emergency-1', {
      ratificationId: 'ratification-1',
      actionId: 'emergency-1',
      actorId: 'constitutional-reviewer',
      outcome: 'accepted',
      createdAt: '2026-05-29T00:00:04.000Z',
    })

    expect(action.ok).to.equal(true)
    expect(ratified.ok).to.equal(true)
    if (ratified.ok) expect(ratified.value.ratifications).to.have.length(1)
  })

  it('keeps audit records append-only and listable by entity', async () => {
    const audit = await adapter.audit.appendAuditRecord({
      auditId: 'audit-1',
      tenantId: 'tenant-1',
      actorId: 'actor-1',
      actionType: 'proposal.created',
      entityType: 'proposal',
      entityId: 'proposal-1',
      previousState: null,
      newState: { status: 'draft' },
      createdAt: now,
    })
    const duplicate = await adapter.audit.appendAuditRecord({
      auditId: 'audit-1',
      tenantId: 'tenant-1',
      actorId: 'actor-1',
      actionType: 'proposal.updated',
      entityType: 'proposal',
      entityId: 'proposal-1',
      createdAt: now,
    })
    const list = await adapter.audit.listAuditRecordsForEntity('proposal', 'proposal-1')

    expect(audit.ok).to.equal(true)
    expect(duplicate.ok).to.equal(false)
    if (!duplicate.ok) expect(duplicate.error.code).to.equal('DUPLICATE_RECORD')
    if (list.ok) expect(list.value.map(item => item.auditId)).to.deep.equal(['audit-1'])
  })

  it('stores snapshots and checkpoints as derived records only', async () => {
    await adapter.snapshots.createSnapshot({
      snapshotId: 'snapshot-1',
      scope: 'tenant-1',
      tenantId: 'tenant-1',
      source: 'mock_service',
      data: { openProposals: 1 },
      createdAt: '2026-05-29T00:00:01.000Z',
    })
    await adapter.snapshots.createSnapshot({
      snapshotId: 'snapshot-2',
      scope: 'tenant-1',
      tenantId: 'tenant-1',
      source: 'mock_service',
      data: { openProposals: 2 },
      createdAt: '2026-05-29T00:00:02.000Z',
    })
    await adapter.indexCheckpoints.createCheckpoint({
      checkpointId: 'checkpoint-1',
      indexName: 'proposal-list',
      position: 'block-1',
      createdAt: now,
    })

    const latestSnapshot = await adapter.snapshots.getLatestSnapshot('tenant-1')
    const latestCheckpoint = await adapter.indexCheckpoints.getLatestCheckpoint('proposal-list')

    expect(latestSnapshot.ok).to.equal(true)
    expect(latestCheckpoint.ok).to.equal(true)
    if (latestSnapshot.ok) expect(latestSnapshot.value.snapshotId).to.equal('snapshot-2')
    if (latestCheckpoint.ok) expect(latestCheckpoint.value.position).to.equal('block-1')
  })

  it('stores receipt references without creating Core receipts or approvals', async () => {
    const receipt = await adapter.receiptReferences.recordReceiptReference({
      receiptId: 'receipt-1',
      entityType: 'proposal',
      entityId: 'proposal-1',
      tenantId: 'tenant-1',
      source: 'mock_service',
      reference: 'mock-receipt-reference',
      createdAt: now,
    })
    const list = await adapter.receiptReferences.listReceiptsForEntity('proposal', 'proposal-1')

    expect(receipt.ok).to.equal(true)
    expect(list.ok).to.equal(true)
    if (list.ok) expect(list.value.map(item => item.receiptId)).to.deep.equal(['receipt-1'])
  })

  it('returns safe clones so callers cannot mutate stored records', async () => {
    await adapter.proposals.createProposal(proposal('proposal-1'))

    const first = await adapter.proposals.getProposalById('proposal-1')
    if (first.ok) {
      first.value.status = 'mutated-outside'
    }

    const second = await adapter.proposals.getProposalById('proposal-1')
    expect(second.ok).to.equal(true)
    if (second.ok) expect(second.value.status).to.equal('draft')
  })
})
