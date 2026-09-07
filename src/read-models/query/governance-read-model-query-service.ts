import type {
  ActorActivityReadModel,
  AuditTrailReadModel,
  DecisionHistoryReadModel,
  EmergencyActionReadModel,
  GovernanceTimelineReadModel,
  MockGovernanceReadModelProjector,
  ProposalDetailReadModel,
  ProposalListReadModel,
  TenantGovernanceSummaryReadModel,
} from '@src/read-models'
import type { RepositoryError, RepositoryResult } from '@src/persistence'
import {
  hasGovernanceQueryRole,
  requireGovernanceQueryRole,
  type GovernanceQueryRole,
} from './governance-query-authorization'
import type { GovernanceQueryContext } from './governance-query-context'
import { governanceQueryError } from './governance-query-errors'
import type { GovernanceQueryError } from './governance-query-errors'
import type {
  GetGovernanceTimelineQuery,
  GetProposalDetailQuery,
  GetTenantGovernanceSummaryQuery,
  ListActorActivityQuery,
  ListAuditTrailQuery,
  ListDecisionHistoryQuery,
  ListEmergencyActionsQuery,
  ListProposalsQuery,
} from './governance-query-inputs'
import { queryErr, queryOk, type GovernanceQueryResult } from './governance-query-result'
import {
  sanitizeActorActivityReadModel,
  sanitizeAuditTrailReadModel,
  sanitizeDecisionHistoryReadModel,
  sanitizeEmergencyActionReadModel,
  sanitizeProposalDetailReadModel,
  sanitizeProposalListReadModel,
  sanitizeTenantGovernanceSummaryReadModel,
  sanitizeTimelineReadModel,
} from './governance-query-sanitization'
import { governanceReadModelSensitivity } from './governance-query-sensitivity'
import { normalizePagination, validateQueryEnvelope } from './governance-query-validation'

export interface GovernanceReadModelQueryServiceOptions {
  projector: MockGovernanceReadModelProjector
}

const mapRepositoryError = (error: RepositoryError): GovernanceQueryError => {
  if (error.code === 'NOT_FOUND') {
    return governanceQueryError('NOT_FOUND', error.message, error.details)
  }

  if (error.code === 'EXECUTION_FORBIDDEN') {
    return governanceQueryError('EXECUTION_FORBIDDEN', error.message, error.details)
  }

  return governanceQueryError('INVALID_QUERY', error.message, error.details)
}

const freshnessWarnings = (value: unknown): string[] | undefined => {
  const metadata = (value as { metadata?: { freshness?: string } }).metadata
  if (!metadata || metadata.freshness === 'fresh') {
    return undefined
  }

  return [`read model freshness is ${metadata.freshness}`]
}

export class GovernanceReadModelQueryService {
  private readonly projector: MockGovernanceReadModelProjector

  constructor(options: GovernanceReadModelQueryServiceOptions) {
    this.projector = options.projector
  }

  async listProposals(
    context: GovernanceQueryContext | null | undefined,
    query: ListProposalsQuery & Record<string, unknown>,
  ): Promise<GovernanceQueryResult<ProposalListReadModel>> {
    const error =
      validateQueryEnvelope(context, query) ??
      this.requireReadModelRole(context!, governanceReadModelSensitivity.ProposalListReadModel.minimumRole)
    if (error) return queryErr(error)

    const normalized = normalizePagination(query)
    const result = await this.projector.projectProposalList({
      tenantId: normalized.tenantId,
      status: normalized.status,
      limit: normalized.limit,
      offset: normalized.offset,
    })
    return this.fromRepositoryResult(result, sanitizeProposalListReadModel)
  }

  async getProposalDetail(
    context: GovernanceQueryContext | null | undefined,
    query: GetProposalDetailQuery & Record<string, unknown>,
  ): Promise<GovernanceQueryResult<ProposalDetailReadModel>> {
    const error =
      validateQueryEnvelope(context, query) ??
      this.requireReadModelRole(context!, governanceReadModelSensitivity.ProposalDetailReadModel.minimumRole) ??
      this.requireField(query.proposalId, 'proposalId')
    if (error) return queryErr(error)

    const result = await this.projector.projectProposalDetail({
      tenantId: query.tenantId,
      proposalId: query.proposalId,
    })
    return this.fromRepositoryResult(result, sanitizeProposalDetailReadModel)
  }

  async getGovernanceTimeline(
    context: GovernanceQueryContext | null | undefined,
    query: GetGovernanceTimelineQuery & Record<string, unknown>,
  ): Promise<GovernanceQueryResult<GovernanceTimelineReadModel>> {
    const error =
      validateQueryEnvelope(context, query) ??
      this.requireReadModelRole(context!, governanceReadModelSensitivity.GovernanceTimelineReadModel.minimumRole)
    if (error) return queryErr(error)

    const normalized = normalizePagination(query)
    const result = await this.projector.projectGovernanceTimeline({
      tenantId: normalized.tenantId,
      proposalId: normalized.proposalId,
      entityType: normalized.entityType,
      entityId: normalized.entityId,
      limit: normalized.limit,
      offset: normalized.offset,
    })
    return this.fromRepositoryResult(result, sanitizeTimelineReadModel)
  }

  async listDecisionHistory(
    context: GovernanceQueryContext | null | undefined,
    query: ListDecisionHistoryQuery & Record<string, unknown>,
  ): Promise<GovernanceQueryResult<DecisionHistoryReadModel>> {
    const error =
      validateQueryEnvelope(context, query) ??
      this.requireReadModelRole(context!, governanceReadModelSensitivity.DecisionHistoryReadModel.minimumRole)
    if (error) return queryErr(error)

    const normalized = normalizePagination(query)
    const result = await this.projector.projectDecisionHistory({
      tenantId: normalized.tenantId,
      proposalId: normalized.proposalId,
      limit: normalized.limit,
      offset: normalized.offset,
    })
    return this.fromRepositoryResult(result, sanitizeDecisionHistoryReadModel)
  }

  async listEmergencyActions(
    context: GovernanceQueryContext | null | undefined,
    query: ListEmergencyActionsQuery & Record<string, unknown>,
  ): Promise<GovernanceQueryResult<EmergencyActionReadModel>> {
    const error =
      validateQueryEnvelope(context, query) ??
      this.requireReadModelRole(context!, governanceReadModelSensitivity.EmergencyActionReadModel.minimumRole)
    if (error) return queryErr(error)

    const normalized = normalizePagination(query)
    const result = await this.projector.projectEmergencyActions({
      tenantId: normalized.tenantId,
      status: normalized.status,
      limit: normalized.limit,
      offset: normalized.offset,
    })
    return this.fromRepositoryResult(result, model => sanitizeEmergencyActionReadModel(model, context!))
  }

  async getTenantGovernanceSummary(
    context: GovernanceQueryContext | null | undefined,
    query: GetTenantGovernanceSummaryQuery & Record<string, unknown>,
  ): Promise<GovernanceQueryResult<TenantGovernanceSummaryReadModel>> {
    const error =
      validateQueryEnvelope(context, query) ??
      this.requireReadModelRole(context!, governanceReadModelSensitivity.TenantGovernanceSummaryReadModel.minimumRole)
    if (error) return queryErr(error)

    const result = await this.projector.projectTenantGovernanceSummary({ tenantId: query.tenantId })
    return this.fromRepositoryResult(result, sanitizeTenantGovernanceSummaryReadModel)
  }

  async listAuditTrail(
    context: GovernanceQueryContext | null | undefined,
    query: ListAuditTrailQuery & Record<string, unknown>,
  ): Promise<GovernanceQueryResult<AuditTrailReadModel>> {
    const error =
      validateQueryEnvelope(context, query) ??
      this.requireReadModelRole(context!, governanceReadModelSensitivity.AuditTrailReadModel.minimumRole)
    if (error) return queryErr(error)

    const normalized = normalizePagination(query)
    const result = await this.projector.projectAuditTrail({
      tenantId: normalized.tenantId,
      actorId: normalized.actorId,
      entityType: normalized.entityType,
      entityId: normalized.entityId,
      limit: normalized.limit,
      offset: normalized.offset,
    })
    return this.fromRepositoryResult(result, sanitizeAuditTrailReadModel)
  }

  async listActorActivity(
    context: GovernanceQueryContext | null | undefined,
    query: ListActorActivityQuery & Record<string, unknown>,
  ): Promise<GovernanceQueryResult<ActorActivityReadModel>> {
    const authorizationError = this.canReadActorActivity(context, query)
    const error =
      validateQueryEnvelope(context, query) ?? this.requireField(query.actorId, 'actorId') ?? authorizationError
    if (error) return queryErr(error)

    const normalized = normalizePagination(query)
    const result = await this.projector.projectActorActivity({
      tenantId: normalized.tenantId,
      actorId: normalized.actorId,
      limit: normalized.limit,
      offset: normalized.offset,
    })
    return this.fromRepositoryResult(result, sanitizeActorActivityReadModel)
  }

  private readonly fromRepositoryResult = <T>(
    result: RepositoryResult<T>,
    sanitizer: (value: T) => T,
  ): GovernanceQueryResult<T> => {
    if (!result.ok) {
      return queryErr(mapRepositoryError(result.error))
    }

    const value = sanitizer(result.value)
    return queryOk(value, freshnessWarnings(value))
  }

  private readonly requireField = (value: string | undefined, field: string): GovernanceQueryError | null => {
    if (value) return null
    return governanceQueryError('INVALID_QUERY', `Missing required query field: ${field}`, { field })
  }

  private readonly requireReadModelRole = (
    context: GovernanceQueryContext,
    minimumRole: GovernanceQueryRole,
  ): GovernanceQueryError | null => requireGovernanceQueryRole(context, minimumRole, 'Governance read model')

  private readonly canReadActorActivity = (
    context: GovernanceQueryContext | null | undefined,
    query: ListActorActivityQuery,
  ): GovernanceQueryError | null => {
    if (!context) return null
    if (hasGovernanceQueryRole(context, governanceReadModelSensitivity.ActorActivityReadModel.minimumRole)) {
      return null
    }
    if (context.actorId && context.actorId === query.actorId && hasGovernanceQueryRole(context, 'governance:reader')) {
      return null
    }
    return governanceQueryError(
      'UNAUTHORIZED',
      'Reading actor activity requires auditor/admin role or actor self-scope',
    )
  }
}
