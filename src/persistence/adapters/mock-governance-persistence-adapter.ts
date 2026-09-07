import type { AuditRepository } from '../repositories/audit-repository'
import type { DecisionRepository } from '../repositories/decision-repository'
import type { EmergencyActionRepository } from '../repositories/emergency-action-repository'
import type { ExecutionIntentRepository } from '../repositories/execution-intent-repository'
import type { IndexCheckpointRepository } from '../repositories/index-checkpoint-repository'
import type { ProposalRepository } from '../repositories/proposal-repository'
import type { ProposalVersionRepository } from '../repositories/proposal-version-repository'
import type { ReceiptReferenceRepository } from '../repositories/receipt-reference-repository'
import type { ReviewRepository } from '../repositories/review-repository'
import type { SnapshotRepository } from '../repositories/snapshot-repository'
import type { VoteRepository } from '../repositories/vote-repository'
import type { GovernanceListFilter, PaginatedRepositoryList } from '../types/pagination'
import { repositoryError } from '../types/repository-errors'
import { err, ok, type RepositoryResult } from '../types/repository-result'
import type {
  GovernanceAuditRecord,
  GovernanceDecisionRecord,
  GovernanceEmergencyActionRecord,
  GovernanceEmergencyRatificationRecord,
  GovernanceExecutionIntentRecord,
  GovernanceIndexCheckpointRecord,
  GovernancePersistenceMetadata,
  GovernanceProposalEventRecord,
  GovernanceProposalRecord,
  GovernanceProposalVersionRecord,
  GovernanceReceiptReferenceRecord,
  GovernanceReviewRecord,
  GovernanceSnapshotRecord,
  GovernanceVoteRecord,
} from '../types/governance-persistence-records'

type StoredRecord = GovernancePersistenceMetadata & {
  tenantId?: string
  proposalId?: string
  actorId?: string
  status?: string
  executionStatus?: string
  entityType?: string
  entityId?: string
  scope?: string
  indexName?: string
}

interface MockGovernancePersistenceStore {
  proposals: Map<string, GovernanceProposalRecord>
  proposalEvents: Map<string, GovernanceProposalEventRecord>
  proposalVersions: Map<string, GovernanceProposalVersionRecord>
  decisions: Map<string, GovernanceDecisionRecord>
  votes: Map<string, GovernanceVoteRecord>
  reviews: Map<string, GovernanceReviewRecord>
  executionIntents: Map<string, GovernanceExecutionIntentRecord>
  emergencyActions: Map<string, GovernanceEmergencyActionRecord>
  auditRecords: Map<string, GovernanceAuditRecord>
  snapshots: Map<string, GovernanceSnapshotRecord>
  indexCheckpoints: Map<string, GovernanceIndexCheckpointRecord>
  receiptReferences: Map<string, GovernanceReceiptReferenceRecord>
  idempotency: Map<string, { payload: string; value: unknown }>
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }

  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
    .join(',')}}`
}

const sortedRecords = <T extends StoredRecord>(records: T[], idField: keyof T) =>
  [...records].sort((left, right) => {
    const dateSort = left.createdAt.localeCompare(right.createdAt)
    if (dateSort !== 0) {
      return dateSort
    }
    return String(left[idField]).localeCompare(String(right[idField]))
  })

const applyFilter = <T extends StoredRecord>(records: T[], filter: GovernanceListFilter = {}) =>
  records.filter(record => {
    if (filter.tenantId && record.tenantId !== filter.tenantId) return false
    if (filter.proposalId && record.proposalId !== filter.proposalId) return false
    if (filter.actorId && record.actorId !== filter.actorId) return false
    if (filter.status && record.status !== filter.status && record.executionStatus !== filter.status) return false
    if (filter.entityType && record.entityType !== filter.entityType) return false
    if (filter.entityId && record.entityId !== filter.entityId) return false
    if (filter.scope && record.scope !== filter.scope) return false
    if (filter.indexName && record.indexName !== filter.indexName) return false
    return true
  })

const paginate = <T>(items: T[], filter: GovernanceListFilter = {}): PaginatedRepositoryList<T> => {
  const offset = Math.max(filter.offset ?? 0, 0)
  const limit = Math.max(filter.limit ?? items.length, 0)

  return {
    items: items.slice(offset, offset + limit).map(clone),
    total: items.length,
    limit,
    offset,
  }
}

const notFound = (entity: string, id: string) =>
  err(repositoryError('NOT_FOUND', `${entity} not found`, { entity, id }))

const duplicate = (entity: string, id: string) =>
  err(repositoryError('DUPLICATE_RECORD', `${entity} already exists`, { entity, id }))

const createEmptyStore = (): MockGovernancePersistenceStore => ({
  proposals: new Map(),
  proposalEvents: new Map(),
  proposalVersions: new Map(),
  decisions: new Map(),
  votes: new Map(),
  reviews: new Map(),
  executionIntents: new Map(),
  emergencyActions: new Map(),
  auditRecords: new Map(),
  snapshots: new Map(),
  indexCheckpoints: new Map(),
  receiptReferences: new Map(),
  idempotency: new Map(),
})

export class MockGovernancePersistenceAdapter {
  private store = createEmptyStore()

  public readonly proposals: ProposalRepository = new MockProposalRepository(() => this.store)
  public readonly proposalVersions: ProposalVersionRepository = new MockProposalVersionRepository(() => this.store)
  public readonly decisions: DecisionRepository = new MockDecisionRepository(() => this.store)
  public readonly votes: VoteRepository = new MockVoteRepository(() => this.store)
  public readonly reviews: ReviewRepository = new MockReviewRepository(() => this.store)
  public readonly executionIntents: ExecutionIntentRepository = new MockExecutionIntentRepository(() => this.store)
  public readonly emergencyActions: EmergencyActionRepository = new MockEmergencyActionRepository(() => this.store)
  public readonly audit: AuditRepository = new MockAuditRepository(() => this.store)
  public readonly snapshots: SnapshotRepository = new MockSnapshotRepository(() => this.store)
  public readonly indexCheckpoints: IndexCheckpointRepository = new MockIndexCheckpointRepository(() => this.store)
  public readonly receiptReferences: ReceiptReferenceRepository = new MockReceiptReferenceRepository(() => this.store)

  resetForTests() {
    this.store = createEmptyStore()
  }
}

class MockRepositoryBase {
  constructor(protected readonly getStore: () => MockGovernancePersistenceStore) {}

  protected createRecord<T extends StoredRecord>(
    collectionName: string,
    collection: Map<string, T>,
    id: string,
    input: T,
  ): RepositoryResult<T> {
    const idempotencyResult = this.getIdempotencyResult(collectionName, input)
    if (idempotencyResult) {
      return idempotencyResult
    }

    if (collection.has(id)) {
      return duplicate(collectionName, id)
    }

    const record = clone(input)
    collection.set(id, record)
    this.setIdempotency(collectionName, input, record)
    return ok(clone(record))
  }

  protected getRecord<T extends StoredRecord>(
    collectionName: string,
    collection: Map<string, T>,
    id: string,
  ): RepositoryResult<T> {
    const record = collection.get(id)
    return record ? ok(clone(record)) : notFound(collectionName, id)
  }

  protected listRecords<T extends StoredRecord>(
    records: T[],
    idField: keyof T,
    filter?: GovernanceListFilter,
  ): RepositoryResult<PaginatedRepositoryList<T>> {
    const filtered = applyFilter(records, filter)
    return ok(paginate(sortedRecords(filtered, idField), filter))
  }

  private getIdempotencyResult<T extends StoredRecord>(collectionName: string, input: T): RepositoryResult<T> | null {
    if (!input.idempotencyKey) {
      return null
    }

    const idempotencyId = `${collectionName}:${input.idempotencyKey}`
    const payload = stableStringify(input)
    const current = this.getStore().idempotency.get(idempotencyId)

    if (!current) {
      return null
    }

    if (current.payload !== payload) {
      return err(
        repositoryError('DUPLICATE_RECORD', 'Conflicting idempotency key', {
          collectionName,
          idempotencyKey: input.idempotencyKey,
        }),
      )
    }

    return ok(clone(current.value as T))
  }

  private setIdempotency<T extends StoredRecord>(collectionName: string, input: T, value: T) {
    if (!input.idempotencyKey) {
      return
    }

    this.getStore().idempotency.set(`${collectionName}:${input.idempotencyKey}`, {
      payload: stableStringify(input),
      value: clone(value),
    })
  }
}

class MockProposalRepository extends MockRepositoryBase implements ProposalRepository {
  async createProposal(input: GovernanceProposalRecord) {
    return this.createRecord('proposal', this.getStore().proposals, input.proposalId, {
      ...input,
      events: input.events ?? [],
    })
  }

  async getProposalById(proposalId: string) {
    return this.getRecord('proposal', this.getStore().proposals, proposalId)
  }

  async listProposals(filter?: GovernanceListFilter) {
    return this.listRecords([...this.getStore().proposals.values()], 'proposalId', filter)
  }

  async updateProposalStatus(
    proposalId: string,
    statusChange: { status: string; actorId: string; reason?: string; requestId?: string; correlationId?: string },
  ) {
    const proposal = this.getStore().proposals.get(proposalId)
    if (!proposal) {
      return notFound('proposal', proposalId)
    }

    const updated: GovernanceProposalRecord = {
      ...proposal,
      status: statusChange.status,
      updatedAt: new Date().toISOString(),
      requestId: statusChange.requestId ?? proposal.requestId,
      correlationId: statusChange.correlationId ?? proposal.correlationId,
    }
    this.getStore().proposals.set(proposalId, updated)
    return ok(clone(updated))
  }

  async appendProposalEvent(proposalId: string, event: GovernanceProposalEventRecord) {
    const proposal = this.getStore().proposals.get(proposalId)
    if (!proposal) {
      return notFound('proposal', proposalId)
    }

    const result = this.createRecord('proposalEvent', this.getStore().proposalEvents, event.eventId, event)
    if (!result.ok) {
      return result
    }

    const events = [...(proposal.events ?? []), result.value]
    this.getStore().proposals.set(proposalId, { ...proposal, events, updatedAt: event.createdAt })
    return ok(clone(result.value))
  }

  async getProposalTimeline(proposalId: string) {
    const proposal = this.getStore().proposals.get(proposalId)
    if (!proposal) {
      return notFound('proposal', proposalId)
    }

    return ok(sortedRecords(proposal.events ?? [], 'eventId').map(clone))
  }
}

class MockProposalVersionRepository extends MockRepositoryBase implements ProposalVersionRepository {
  async createProposalVersion(input: GovernanceProposalVersionRecord) {
    return this.createRecord(
      'proposalVersion',
      this.getStore().proposalVersions,
      this.versionId(input.proposalId, input.version),
      input,
    )
  }

  async getProposalVersion(proposalId: string, version: number) {
    return this.getRecord('proposalVersion', this.getStore().proposalVersions, this.versionId(proposalId, version))
  }

  async listProposalVersions(proposalId: string) {
    return ok(
      sortedRecords(
        [...this.getStore().proposalVersions.values()].filter(version => version.proposalId === proposalId),
        'version',
      ).map(clone),
    )
  }

  async getLatestProposalVersion(proposalId: string) {
    const versions = sortedRecords(
      [...this.getStore().proposalVersions.values()].filter(version => version.proposalId === proposalId),
      'version',
    )
    const latest = versions[versions.length - 1]
    return latest ? ok(clone(latest)) : notFound('proposalVersion', proposalId)
  }

  private versionId(proposalId: string, version: number) {
    return `${proposalId}:${version}`
  }
}

class MockDecisionRepository extends MockRepositoryBase implements DecisionRepository {
  async recordDecision(input: GovernanceDecisionRecord) {
    return this.createRecord('decision', this.getStore().decisions, input.decisionId, input)
  }

  async getDecisionById(decisionId: string) {
    return this.getRecord('decision', this.getStore().decisions, decisionId)
  }

  async listDecisions(filter?: GovernanceListFilter) {
    return this.listRecords([...this.getStore().decisions.values()], 'decisionId', filter)
  }

  async listDecisionsForProposal(proposalId: string) {
    return ok(
      sortedRecords(
        [...this.getStore().decisions.values()].filter(decision => decision.proposalId === proposalId),
        'decisionId',
      ).map(clone),
    )
  }
}

class MockVoteRepository extends MockRepositoryBase implements VoteRepository {
  async recordVote(input: GovernanceVoteRecord) {
    return this.createRecord('vote', this.getStore().votes, input.voteId, input)
  }

  async getVoteById(voteId: string) {
    return this.getRecord('vote', this.getStore().votes, voteId)
  }

  async listVotesForProposal(proposalId: string) {
    return ok(
      sortedRecords(
        [...this.getStore().votes.values()].filter(vote => vote.proposalId === proposalId),
        'voteId',
      ).map(clone),
    )
  }

  async listVotesByActor(actorId: string) {
    return ok(
      sortedRecords(
        [...this.getStore().votes.values()].filter(vote => vote.actorId === actorId),
        'voteId',
      ).map(clone),
    )
  }
}

class MockReviewRepository extends MockRepositoryBase implements ReviewRepository {
  async recordReview(input: GovernanceReviewRecord) {
    return this.createRecord('review', this.getStore().reviews, input.reviewId, input)
  }

  async getReviewById(reviewId: string) {
    return this.getRecord('review', this.getStore().reviews, reviewId)
  }

  async listReviewsForProposal(proposalId: string) {
    return ok(
      sortedRecords(
        [...this.getStore().reviews.values()].filter(review => review.proposalId === proposalId),
        'reviewId',
      ).map(clone),
    )
  }

  async listPendingReviews(filter?: GovernanceListFilter) {
    return ok(
      sortedRecords(
        applyFilter(
          [...this.getStore().reviews.values()].filter(review => review.status === 'pending'),
          filter,
        ),
        'reviewId',
      ).map(clone),
    )
  }
}

class MockExecutionIntentRepository extends MockRepositoryBase implements ExecutionIntentRepository {
  async recordExecutionIntent(input: GovernanceExecutionIntentRecord) {
    if ((input as GovernanceExecutionIntentRecord & { executionEnabled?: boolean }).executionEnabled) {
      return err(
        repositoryError('EXECUTION_FORBIDDEN', 'Mock execution intents must remain disabled', {
          intentId: input.intentId,
        }),
      )
    }

    return this.createRecord('executionIntent', this.getStore().executionIntents, input.intentId, input)
  }

  async getExecutionIntentById(intentId: string) {
    return this.getRecord('executionIntent', this.getStore().executionIntents, intentId)
  }

  async listExecutionIntents(filter?: GovernanceListFilter) {
    return this.listRecords([...this.getStore().executionIntents.values()], 'intentId', filter)
  }

  async markExecutionBlocked(intentId: string, reason: string) {
    const intent = this.getStore().executionIntents.get(intentId)
    if (!intent) {
      return notFound('executionIntent', intentId)
    }

    const blocked: GovernanceExecutionIntentRecord = {
      ...intent,
      executionEnabled: false,
      executionStatus: 'blocked',
      blockedReason: reason,
      updatedAt: new Date().toISOString(),
    }
    this.getStore().executionIntents.set(intentId, blocked)
    return ok(clone(blocked))
  }
}

class MockEmergencyActionRepository extends MockRepositoryBase implements EmergencyActionRepository {
  async recordEmergencyAction(input: GovernanceEmergencyActionRecord) {
    return this.createRecord('emergencyAction', this.getStore().emergencyActions, input.actionId, {
      ...input,
      ratifications: input.ratifications ?? [],
    })
  }

  async getEmergencyActionById(actionId: string) {
    return this.getRecord('emergencyAction', this.getStore().emergencyActions, actionId)
  }

  async listEmergencyActions(filter?: GovernanceListFilter) {
    return this.listRecords([...this.getStore().emergencyActions.values()], 'actionId', filter)
  }

  async recordRatification(actionId: string, ratification: GovernanceEmergencyRatificationRecord) {
    const action = this.getStore().emergencyActions.get(actionId)
    if (!action) {
      return notFound('emergencyAction', actionId)
    }

    if ((action.ratifications ?? []).some(current => current.ratificationId === ratification.ratificationId)) {
      return duplicate('emergencyRatification', ratification.ratificationId)
    }

    const updated = {
      ...action,
      ratifications: [...(action.ratifications ?? []), clone(ratification)],
      updatedAt: ratification.createdAt,
    }
    this.getStore().emergencyActions.set(actionId, updated)
    return ok(clone(updated))
  }
}

class MockAuditRepository extends MockRepositoryBase implements AuditRepository {
  async appendAuditRecord(input: GovernanceAuditRecord) {
    return this.createRecord('auditRecord', this.getStore().auditRecords, input.auditId, input)
  }

  async getAuditRecordById(auditId: string) {
    return this.getRecord('auditRecord', this.getStore().auditRecords, auditId)
  }

  async listAuditRecords(filter?: GovernanceListFilter) {
    return this.listRecords([...this.getStore().auditRecords.values()], 'auditId', filter)
  }

  async listAuditRecordsForEntity(entityType: string, entityId: string) {
    return ok(
      sortedRecords(
        [...this.getStore().auditRecords.values()].filter(
          audit => audit.entityType === entityType && audit.entityId === entityId,
        ),
        'auditId',
      ).map(clone),
    )
  }
}

class MockSnapshotRepository extends MockRepositoryBase implements SnapshotRepository {
  async createSnapshot(input: GovernanceSnapshotRecord) {
    return this.createRecord('snapshot', this.getStore().snapshots, input.snapshotId, input)
  }

  async getSnapshotById(snapshotId: string) {
    return this.getRecord('snapshot', this.getStore().snapshots, snapshotId)
  }

  async getLatestSnapshot(scope: string) {
    const snapshots = sortedRecords(
      [...this.getStore().snapshots.values()].filter(snapshot => snapshot.scope === scope),
      'snapshotId',
    )
    const latest = snapshots[snapshots.length - 1]
    return latest ? ok(clone(latest)) : notFound('snapshot', scope)
  }

  async listSnapshots(filter?: GovernanceListFilter) {
    return this.listRecords([...this.getStore().snapshots.values()], 'snapshotId', filter)
  }
}

class MockIndexCheckpointRepository extends MockRepositoryBase implements IndexCheckpointRepository {
  async createCheckpoint(input: GovernanceIndexCheckpointRecord) {
    return this.createRecord('indexCheckpoint', this.getStore().indexCheckpoints, input.checkpointId, input)
  }

  async getLatestCheckpoint(indexName: string) {
    const checkpoints = sortedRecords(
      [...this.getStore().indexCheckpoints.values()].filter(checkpoint => checkpoint.indexName === indexName),
      'checkpointId',
    )
    const latest = checkpoints[checkpoints.length - 1]
    return latest ? ok(clone(latest)) : notFound('indexCheckpoint', indexName)
  }

  async listCheckpoints(filter?: GovernanceListFilter) {
    return this.listRecords([...this.getStore().indexCheckpoints.values()], 'checkpointId', filter)
  }
}

class MockReceiptReferenceRepository extends MockRepositoryBase implements ReceiptReferenceRepository {
  async recordReceiptReference(input: GovernanceReceiptReferenceRecord) {
    return this.createRecord('receiptReference', this.getStore().receiptReferences, input.receiptId, input)
  }

  async getReceiptReferenceById(receiptId: string) {
    return this.getRecord('receiptReference', this.getStore().receiptReferences, receiptId)
  }

  async listReceiptReferences(filter?: GovernanceListFilter) {
    return this.listRecords([...this.getStore().receiptReferences.values()], 'receiptId', filter)
  }

  async listReceiptsForEntity(entityType: string, entityId: string) {
    return ok(
      sortedRecords(
        [...this.getStore().receiptReferences.values()].filter(
          receipt => receipt.entityType === entityType && receipt.entityId === entityId,
        ),
        'receiptId',
      ).map(clone),
    )
  }
}
