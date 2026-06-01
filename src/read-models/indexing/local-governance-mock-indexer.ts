import {
  type GovernanceIndexCheckpointRecord,
  type MockGovernancePersistenceAdapter,
  type RepositoryError,
} from '@src/persistence'
import type { MockGovernanceReadModelProjector } from '../projectors/mock-governance-read-model-projector'
import type { ActorActivityReadModel } from '../types/actor-activity-read-model'
import type { AuditTrailReadModel } from '../types/audit-trail-read-model'
import type { DecisionHistoryReadModel } from '../types/decision-history-read-model'
import type { EmergencyActionReadModel } from '../types/emergency-action-read-model'
import type { GovernanceTimelineReadModel } from '../types/governance-timeline-read-model'
import type { ProposalListReadModel } from '../types/proposal-list-read-model'
import type { ReadModelMetadata } from '../types/read-model-metadata'
import type { TenantGovernanceSummaryReadModel } from '../types/tenant-governance-summary-read-model'
import { localGovernanceIndexingError, type LocalGovernanceIndexingError } from './local-governance-indexing-errors'
import {
  localIndexingErr,
  localIndexingOk,
  type LocalGovernanceIndexingResult,
} from './local-governance-indexing-result'
import type {
  LocalGovernanceIndexCheckpoint,
  LocalGovernanceIndexInput,
  LocalGovernanceIndexName,
  LocalGovernanceIndexingStats,
  LocalGovernanceProposalIndexSnapshot,
  LocalGovernanceTenantIndexSnapshot,
} from './local-governance-indexing-types'

type Clock = () => string
type IdFactory = () => string

export interface LocalGovernanceMockIndexerDependencies {
  persistence: MockGovernancePersistenceAdapter
  projector: MockGovernanceReadModelProjector
  clock?: Clock
  idFactory?: IdFactory
}

const SOURCE_VERSION = 'governance-local-mock-indexer/v1'

const readModelCount = (value: unknown): number => {
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).length
  }
  return 1
}

const maxDate = (dates: Array<string | null | undefined>) =>
  dates.filter((date): date is string => Boolean(date)).sort((left, right) => right.localeCompare(left))[0] ?? null

const sanitizeDetails = (details?: Record<string, unknown>) => {
  if (!details) return undefined
  return Object.fromEntries(
    Object.entries(details).filter(([key]) => !['secret', 'privateKey', 'credential', 'token'].includes(key)),
  )
}

class LocalGovernanceProjectionFailure extends Error {
  constructor(readonly indexingError: LocalGovernanceIndexingError) {
    super(indexingError.message)
    this.name = 'LocalGovernanceProjectionFailure'
  }
}

export class LocalGovernanceMockIndexer {
  private readonly persistence: MockGovernancePersistenceAdapter
  private readonly projector: MockGovernanceReadModelProjector
  private readonly clock: Clock
  private readonly idFactory: IdFactory

  constructor(dependencies: LocalGovernanceMockIndexerDependencies) {
    this.persistence = dependencies.persistence
    this.projector = dependencies.projector
    this.clock = dependencies.clock ?? (() => new Date().toISOString())
    this.idFactory = dependencies.idFactory ?? (() => `local-index-${Date.now()}`)
  }

  async index(input: LocalGovernanceIndexInput): Promise<LocalGovernanceIndexingResult<unknown>> {
    switch (input.indexName) {
      case 'full-tenant':
        return this.indexTenant(input)
      case 'proposal-detail':
        return this.indexProposal(input)
      case 'governance-timeline':
        return this.indexTimeline(input)
      case 'decision-history':
        return this.indexDecisionHistory(input)
      case 'actor-activity':
        return this.indexActorActivity(input)
      case 'emergency-actions':
        return this.indexEmergencyActions(input)
      case 'audit-trail':
        return this.indexAuditTrail(input)
      case 'proposal-list':
      case 'tenant-governance-summary':
        return this.indexNamedTenantReadModel(input)
      default:
        return this.fail(
          input,
          localGovernanceIndexingError('UNSUPPORTED_INDEX', 'Unsupported local governance index', {
            indexName: (input as { indexName?: string }).indexName,
          }),
        )
    }
  }

  async indexTenant(
    input: Omit<LocalGovernanceIndexInput, 'indexName'> & { indexName?: LocalGovernanceIndexName },
  ): Promise<LocalGovernanceIndexingResult<LocalGovernanceTenantIndexSnapshot>> {
    const request = { ...input, indexName: 'full-tenant' as const }
    const validation = this.validateBaseRequest(request)
    if (validation) return this.fail(request, validation)

    return this.run(request, async checkpointId => {
      const [proposalList, governanceTimeline, decisionHistory, tenantGovernanceSummary, emergencyActions, auditTrail] =
        await Promise.all([
          this.projector.projectProposalList({ tenantId: request.tenantId }),
          this.projector.projectGovernanceTimeline({ tenantId: request.tenantId }),
          this.projector.projectDecisionHistory({ tenantId: request.tenantId }),
          this.projector.projectTenantGovernanceSummary({ tenantId: request.tenantId }),
          this.projector.projectEmergencyActions({ tenantId: request.tenantId }),
          this.projector.projectAuditTrail({ tenantId: request.tenantId }),
        ])

      if (!proposalList.ok) throw new LocalGovernanceProjectionFailure(this.toProjectionError(proposalList.error))
      if (!governanceTimeline.ok)
        throw new LocalGovernanceProjectionFailure(this.toProjectionError(governanceTimeline.error))
      if (!decisionHistory.ok) throw new LocalGovernanceProjectionFailure(this.toProjectionError(decisionHistory.error))
      if (!tenantGovernanceSummary.ok)
        throw new LocalGovernanceProjectionFailure(this.toProjectionError(tenantGovernanceSummary.error))
      if (!emergencyActions.ok)
        throw new LocalGovernanceProjectionFailure(this.toProjectionError(emergencyActions.error))
      if (!auditTrail.ok) throw new LocalGovernanceProjectionFailure(this.toProjectionError(auditTrail.error))

      return {
        proposalList: this.withCheckpoint(proposalList.value, checkpointId),
        governanceTimeline: this.withCheckpoint(governanceTimeline.value, checkpointId),
        decisionHistory: this.withCheckpoint(decisionHistory.value, checkpointId),
        tenantGovernanceSummary: this.withCheckpoint(tenantGovernanceSummary.value, checkpointId),
        emergencyActions: this.withCheckpoint(emergencyActions.value, checkpointId),
        auditTrail: this.withCheckpoint(auditTrail.value, checkpointId),
      }
    })
  }

  async indexProposal(
    input: Omit<LocalGovernanceIndexInput, 'indexName'> & { indexName?: LocalGovernanceIndexName },
  ): Promise<LocalGovernanceIndexingResult<LocalGovernanceProposalIndexSnapshot>> {
    const request = { ...input, indexName: 'proposal-detail' as const }
    const validation = this.validateBaseRequest(request) ?? this.requireField(request.proposalId, 'proposalId')
    if (validation) return this.fail(request, validation)

    return this.run(request, async checkpointId => {
      const [proposalDetail, governanceTimeline, decisionHistory] = await Promise.all([
        this.projector.projectProposalDetail({ tenantId: request.tenantId, proposalId: request.proposalId! }),
        this.projector.projectGovernanceTimeline({ tenantId: request.tenantId, proposalId: request.proposalId }),
        this.projector.projectDecisionHistory({ tenantId: request.tenantId, proposalId: request.proposalId }),
      ])
      if (!proposalDetail.ok) throw new LocalGovernanceProjectionFailure(this.toProjectionError(proposalDetail.error))
      if (!governanceTimeline.ok)
        throw new LocalGovernanceProjectionFailure(this.toProjectionError(governanceTimeline.error))
      if (!decisionHistory.ok) throw new LocalGovernanceProjectionFailure(this.toProjectionError(decisionHistory.error))

      return {
        proposalDetail: this.withCheckpoint(proposalDetail.value, checkpointId),
        governanceTimeline: this.withCheckpoint(governanceTimeline.value, checkpointId),
        decisionHistory: this.withCheckpoint(decisionHistory.value, checkpointId),
      }
    })
  }

  async indexTimeline(
    input: Omit<LocalGovernanceIndexInput, 'indexName'> & { indexName?: LocalGovernanceIndexName },
  ): Promise<LocalGovernanceIndexingResult<GovernanceTimelineReadModel>> {
    const request = { ...input, indexName: 'governance-timeline' as const }
    const validation = this.validateBaseRequest(request)
    if (validation) return this.fail(request, validation)

    return this.run(request, async checkpointId => {
      const result = await this.projector.projectGovernanceTimeline(request)
      if (!result.ok) throw new LocalGovernanceProjectionFailure(this.toProjectionError(result.error))
      return this.withCheckpoint(result.value, checkpointId)
    })
  }

  async indexDecisionHistory(
    input: Omit<LocalGovernanceIndexInput, 'indexName'> & { indexName?: LocalGovernanceIndexName },
  ): Promise<LocalGovernanceIndexingResult<DecisionHistoryReadModel>> {
    const request = { ...input, indexName: 'decision-history' as const }
    const validation = this.validateBaseRequest(request)
    if (validation) return this.fail(request, validation)

    return this.run(request, async checkpointId => {
      const result = await this.projector.projectDecisionHistory(request)
      if (!result.ok) throw new LocalGovernanceProjectionFailure(this.toProjectionError(result.error))
      return this.withCheckpoint(result.value, checkpointId)
    })
  }

  async indexActorActivity(
    input: Omit<LocalGovernanceIndexInput, 'indexName'> & { indexName?: LocalGovernanceIndexName },
  ): Promise<LocalGovernanceIndexingResult<ActorActivityReadModel>> {
    const request = { ...input, indexName: 'actor-activity' as const }
    const validation = this.validateBaseRequest(request) ?? this.requireField(request.actorId, 'actorId')
    if (validation) return this.fail(request, validation)

    return this.run(request, async checkpointId => {
      const result = await this.projector.projectActorActivity({ ...request, actorId: request.actorId! })
      if (!result.ok) throw new LocalGovernanceProjectionFailure(this.toProjectionError(result.error))
      return this.withCheckpoint(result.value, checkpointId)
    })
  }

  async indexEmergencyActions(
    input: Omit<LocalGovernanceIndexInput, 'indexName'> & { indexName?: LocalGovernanceIndexName },
  ): Promise<LocalGovernanceIndexingResult<EmergencyActionReadModel>> {
    const request = { ...input, indexName: 'emergency-actions' as const }
    const validation = this.validateBaseRequest(request)
    if (validation) return this.fail(request, validation)

    return this.run(request, async checkpointId => {
      const result = await this.projector.projectEmergencyActions(request)
      if (!result.ok) throw new LocalGovernanceProjectionFailure(this.toProjectionError(result.error))
      return this.withCheckpoint(result.value, checkpointId)
    })
  }

  async indexAuditTrail(
    input: Omit<LocalGovernanceIndexInput, 'indexName'> & { indexName?: LocalGovernanceIndexName },
  ): Promise<LocalGovernanceIndexingResult<AuditTrailReadModel>> {
    const request = { ...input, indexName: 'audit-trail' as const }
    const validation = this.validateBaseRequest(request)
    if (validation) return this.fail(request, validation)

    return this.run(request, async checkpointId => {
      const result = await this.projector.projectAuditTrail(request)
      if (!result.ok) throw new LocalGovernanceProjectionFailure(this.toProjectionError(result.error))
      return this.withCheckpoint(result.value, checkpointId)
    })
  }

  async getLastCheckpoint(input: {
    tenantId: string
    indexName: LocalGovernanceIndexName
  }): Promise<LocalGovernanceIndexingResult<LocalGovernanceIndexCheckpoint | null>> {
    const validation = this.validateBaseRequest(input)
    if (validation) return this.fail(input, validation)

    const checkpoints = await this.persistence.indexCheckpoints.listCheckpoints({
      tenantId: input.tenantId,
      indexName: input.indexName,
    })
    if (!checkpoints.ok) return this.fail(input, this.toCheckpointError(checkpoints.error))

    const latest = checkpoints.value.items[checkpoints.value.items.length - 1]
    const checkpoint = latest ? this.fromCheckpointRecord(latest) : null
    const stats = this.stats(input, this.clock(), this.clock(), 0, checkpoint ? 1 : 0, 'complete')

    if (!checkpoint) {
      const emptyCheckpoint = this.buildCheckpoint(input, this.clock(), null, 'complete')
      return localIndexingOk(null, emptyCheckpoint, stats, ['no checkpoint found'])
    }

    return localIndexingOk(checkpoint, checkpoint, stats)
  }

  private async indexNamedTenantReadModel(
    input: LocalGovernanceIndexInput,
  ): Promise<LocalGovernanceIndexingResult<ProposalListReadModel | TenantGovernanceSummaryReadModel>> {
    const validation = this.validateBaseRequest(input)
    if (validation) return this.fail(input, validation)

    return this.run(input, async checkpointId => {
      if (input.indexName === 'proposal-list') {
        const result = await this.projector.projectProposalList(input)
        if (!result.ok) throw new LocalGovernanceProjectionFailure(this.toProjectionError(result.error))
        return this.withCheckpoint(result.value, checkpointId)
      }

      const result = await this.projector.projectTenantGovernanceSummary({ tenantId: input.tenantId })
      if (!result.ok) throw new LocalGovernanceProjectionFailure(this.toProjectionError(result.error))
      return this.withCheckpoint(result.value, checkpointId)
    })
  }

  private async run<T>(
    input: LocalGovernanceIndexInput,
    project: (checkpointId: string) => Promise<T>,
  ): Promise<LocalGovernanceIndexingResult<T>> {
    const startedAt = this.clock()
    const checkpointId = this.idFactory()

    try {
      const value = await project(checkpointId)
      const finishedAt = this.clock()
      const sourceRecordCount = await this.countSourceRecords(input.tenantId)
      const lastSourceEventAt = this.lastSourceEventAt(value)
      const checkpoint = this.buildCheckpoint(input, finishedAt, lastSourceEventAt, 'complete', checkpointId)
      const checkpointResult = await this.persistCheckpoint(checkpoint, input, finishedAt)

      if (!checkpointResult.ok) {
        return localIndexingErr(
          this.toCheckpointError(checkpointResult.error),
          checkpoint,
          this.stats(input, startedAt, finishedAt, sourceRecordCount, readModelCount(value), 'failed'),
        )
      }

      return localIndexingOk(
        value,
        checkpoint,
        this.stats(input, startedAt, finishedAt, sourceRecordCount, readModelCount(value), 'complete'),
      )
    } catch (caught) {
      const finishedAt = this.clock()
      const error = this.normalizeCaughtError(caught)
      const checkpoint = this.buildCheckpoint(input, finishedAt, null, 'failed', checkpointId, error.code)
      await this.persistCheckpoint(checkpoint, input, finishedAt)

      return localIndexingErr(
        error,
        checkpoint,
        this.stats(input, startedAt, finishedAt, 0, 0, 'failed', [error.message]),
      )
    }
  }

  private readonly validateBaseRequest = (input: {
    tenantId?: string
    indexName?: string
  }): LocalGovernanceIndexingError | null => {
    if ((input as Record<string, unknown>).executionRequested) {
      return localGovernanceIndexingError('EXECUTION_FORBIDDEN', 'Local indexing cannot request execution')
    }
    if (!input.tenantId) {
      return localGovernanceIndexingError('MISSING_TENANT_SCOPE', 'Local indexing requires tenant scope')
    }
    if (!input.indexName) {
      return localGovernanceIndexingError('INVALID_INDEX_REQUEST', 'Local indexing requires index name')
    }
    return null
  }

  private readonly requireField = (value: string | undefined, field: string): LocalGovernanceIndexingError | null =>
    value
      ? null
      : localGovernanceIndexingError('INVALID_INDEX_REQUEST', `Missing required index field: ${field}`, { field })

  private readonly toProjectionError = (error: RepositoryError) =>
    localGovernanceIndexingError(
      error.code === 'NOT_FOUND' ? 'SOURCE_RECORD_NOT_FOUND' : 'PROJECTION_FAILED',
      error.message,
      {
        repositoryCode: error.code,
        ...sanitizeDetails(error.details),
      },
    )

  private readonly toCheckpointError = (error: RepositoryError) =>
    localGovernanceIndexingError('CHECKPOINT_FAILED', error.message, {
      repositoryCode: error.code,
      ...sanitizeDetails(error.details),
    })

  private readonly normalizeCaughtError = (caught: unknown): LocalGovernanceIndexingError => {
    if (caught instanceof LocalGovernanceProjectionFailure) {
      return caught.indexingError
    }

    const maybeIndexingError = caught as LocalGovernanceIndexingError
    if (maybeIndexingError?.code && maybeIndexingError?.message) {
      return maybeIndexingError
    }

    return localGovernanceIndexingError('PROJECTION_FAILED', 'Local governance projection failed')
  }

  private readonly withCheckpoint = <T extends { metadata: ReadModelMetadata }>(value: T, checkpointId: string): T => ({
    ...value,
    metadata: {
      ...value.metadata,
      freshness: 'fresh',
      indexCheckpointId: checkpointId,
    },
  })

  private readonly buildCheckpoint = (
    input: { tenantId: string; indexName: LocalGovernanceIndexName; correlationId?: string | null },
    lastIndexedAt: string,
    lastSourceEventAt: string | null,
    status: 'complete' | 'failed',
    checkpointId = this.idFactory(),
    errorCode: string | null = null,
  ): LocalGovernanceIndexCheckpoint => ({
    checkpointId,
    tenantId: input.tenantId,
    indexName: input.indexName,
    sourceVersion: SOURCE_VERSION,
    lastIndexedAt,
    lastSourceEventAt,
    status,
    errorCode,
    correlationId: input.correlationId ?? null,
  })

  private readonly persistCheckpoint = async (
    checkpoint: LocalGovernanceIndexCheckpoint,
    input: LocalGovernanceIndexInput,
    createdAt: string,
  ) =>
    this.persistence.indexCheckpoints.createCheckpoint({
      checkpointId: checkpoint.checkpointId,
      indexName: checkpoint.indexName,
      tenantId: checkpoint.tenantId,
      position: JSON.stringify(checkpoint),
      correlationId: checkpoint.correlationId ?? input.correlationId ?? undefined,
      createdAt,
      updatedAt: createdAt,
    })

  private readonly fromCheckpointRecord = (record: GovernanceIndexCheckpointRecord): LocalGovernanceIndexCheckpoint => {
    try {
      return JSON.parse(record.position) as LocalGovernanceIndexCheckpoint
    } catch {
      return {
        checkpointId: record.checkpointId,
        tenantId: record.tenantId ?? 'unknown',
        indexName: record.indexName as LocalGovernanceIndexName,
        sourceVersion: SOURCE_VERSION,
        lastIndexedAt: record.updatedAt ?? record.createdAt,
        lastSourceEventAt: null,
        status: 'complete',
        errorCode: null,
        correlationId: record.correlationId ?? null,
      }
    }
  }

  private readonly countSourceRecords = async (tenantId: string) => {
    const [proposals, decisions, emergencies, audits, intents, receipts] = await Promise.all([
      this.persistence.proposals.listProposals({ tenantId }),
      this.persistence.decisions.listDecisions({ tenantId }),
      this.persistence.emergencyActions.listEmergencyActions({ tenantId }),
      this.persistence.audit.listAuditRecords({ tenantId }),
      this.persistence.executionIntents.listExecutionIntents({ tenantId }),
      this.persistence.receiptReferences.listReceiptReferences({ tenantId }),
    ])

    return [proposals, decisions, emergencies, audits, intents, receipts].reduce(
      (total, result) => total + (result.ok ? result.value.items.length : 0),
      0,
    )
  }

  private readonly lastSourceEventAt = (value: unknown): string | null => {
    const models = Object.values(value as Record<string, unknown>)
    const values = models.length ? models : [value]
    return maxDate(values.map(model => (model as { metadata?: ReadModelMetadata }).metadata?.lastSourceEventAt))
  }

  private readonly stats = (
    input: { tenantId: string; indexName: LocalGovernanceIndexName; correlationId?: string | null },
    startedAt: string,
    finishedAt: string,
    sourceRecordCount: number,
    modelCount: number,
    status: 'complete' | 'failed',
    warnings: string[] = [],
  ): LocalGovernanceIndexingStats => ({
    indexName: input.indexName,
    tenantId: input.tenantId,
    startedAt,
    finishedAt,
    durationMs: Math.max(Date.parse(finishedAt) - Date.parse(startedAt), 0),
    sourceRecordCount,
    readModelCount: modelCount,
    status,
    warnings,
    correlationId: input.correlationId ?? null,
  })

  private fail<T>(
    input: { tenantId?: string; indexName?: string; correlationId?: string | null },
    error: LocalGovernanceIndexingError,
  ): LocalGovernanceIndexingResult<T> {
    const now = this.clock()
    const checkpoint =
      input.tenantId && input.indexName
        ? this.buildCheckpoint(
            {
              tenantId: input.tenantId,
              indexName: input.indexName as LocalGovernanceIndexName,
              correlationId: input.correlationId,
            },
            now,
            null,
            'failed',
            this.idFactory(),
            error.code,
          )
        : undefined

    return localIndexingErr(error, checkpoint)
  }
}
