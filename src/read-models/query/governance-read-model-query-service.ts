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
import { hasElevatedGovernanceRole, normalizePagination, validateQueryEnvelope } from './governance-query-validation'

export interface GovernanceReadModelQueryServiceOptions {
  projector: MockGovernanceReadModelProjector
}

const AUDIT_ROLES = ['governance:auditor', 'governance:admin']
const ACTOR_ACTIVITY_ROLES = ['governance:auditor', 'governance:admin']

const mapRepositoryError = (error: RepositoryError): GovernanceQueryError => {
  if (error.code === 'NOT_FOUND') {
    return governanceQueryError('NOT_FOUND', error.message, error.details)
  }

  if (error.code === 'EXECUTION_FORBIDDEN') {
    return governanceQueryError('EXECUTION_FORBIDDEN', error.message, error.details)
  }

  return governanceQueryError('INVALID_QUERY', error.message, error.details)
}

const fromRepositoryResult = <T>(result: RepositoryResult<T>): GovernanceQueryResult<T> => {
  if (result.ok) {
    return queryOk(result.value, freshnessWarnings(result.value))
  }

  return queryErr(mapRepositoryError(result.error))
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
    const error = validateQueryEnvelope(context, query)
    if (error) return queryErr(error)

    const normalized = normalizePagination(query)
    return fromRepositoryResult(
      await this.projector.projectProposalList({
        tenantId: normalized.tenantId,
        status: normalized.status,
        limit: normalized.limit,
        offset: normalized.offset,
      }),
    )
  }

  async getProposalDetail(
    context: GovernanceQueryContext | null | undefined,
    query: GetProposalDetailQuery & Record<string, unknown>,
  ): Promise<GovernanceQueryResult<ProposalDetailReadModel>> {
    const error = validateQueryEnvelope(context, query) ?? this.requireField(query.proposalId, 'proposalId')
    if (error) return queryErr(error)

    return fromRepositoryResult(
      await this.projector.projectProposalDetail({ tenantId: query.tenantId, proposalId: query.proposalId }),
    )
  }

  async getGovernanceTimeline(
    context: GovernanceQueryContext | null | undefined,
    query: GetGovernanceTimelineQuery & Record<string, unknown>,
  ): Promise<GovernanceQueryResult<GovernanceTimelineReadModel>> {
    const error = validateQueryEnvelope(context, query)
    if (error) return queryErr(error)

    const normalized = normalizePagination(query)
    return fromRepositoryResult(
      await this.projector.projectGovernanceTimeline({
        tenantId: normalized.tenantId,
        proposalId: normalized.proposalId,
        entityType: normalized.entityType,
        entityId: normalized.entityId,
        limit: normalized.limit,
        offset: normalized.offset,
      }),
    )
  }

  async listDecisionHistory(
    context: GovernanceQueryContext | null | undefined,
    query: ListDecisionHistoryQuery & Record<string, unknown>,
  ): Promise<GovernanceQueryResult<DecisionHistoryReadModel>> {
    const error = validateQueryEnvelope(context, query)
    if (error) return queryErr(error)

    const normalized = normalizePagination(query)
    return fromRepositoryResult(
      await this.projector.projectDecisionHistory({
        tenantId: normalized.tenantId,
        proposalId: normalized.proposalId,
        limit: normalized.limit,
        offset: normalized.offset,
      }),
    )
  }

  async listEmergencyActions(
    context: GovernanceQueryContext | null | undefined,
    query: ListEmergencyActionsQuery & Record<string, unknown>,
  ): Promise<GovernanceQueryResult<EmergencyActionReadModel>> {
    const error = validateQueryEnvelope(context, query)
    if (error) return queryErr(error)

    const normalized = normalizePagination(query)
    return fromRepositoryResult(
      await this.projector.projectEmergencyActions({
        tenantId: normalized.tenantId,
        status: normalized.status,
        limit: normalized.limit,
        offset: normalized.offset,
      }),
    )
  }

  async getTenantGovernanceSummary(
    context: GovernanceQueryContext | null | undefined,
    query: GetTenantGovernanceSummaryQuery & Record<string, unknown>,
  ): Promise<GovernanceQueryResult<TenantGovernanceSummaryReadModel>> {
    const error = validateQueryEnvelope(context, query)
    if (error) return queryErr(error)

    return fromRepositoryResult(await this.projector.projectTenantGovernanceSummary({ tenantId: query.tenantId }))
  }

  async listAuditTrail(
    context: GovernanceQueryContext | null | undefined,
    query: ListAuditTrailQuery & Record<string, unknown>,
  ): Promise<GovernanceQueryResult<AuditTrailReadModel>> {
    const error = validateQueryEnvelope(context, query) ?? this.requireElevatedRole(context, AUDIT_ROLES, 'audit trail')
    if (error) return queryErr(error)

    const normalized = normalizePagination(query)
    return fromRepositoryResult(
      await this.projector.projectAuditTrail({
        tenantId: normalized.tenantId,
        actorId: normalized.actorId,
        entityType: normalized.entityType,
        entityId: normalized.entityId,
        limit: normalized.limit,
        offset: normalized.offset,
      }),
    )
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
    return fromRepositoryResult(
      await this.projector.projectActorActivity({
        tenantId: normalized.tenantId,
        actorId: normalized.actorId,
        limit: normalized.limit,
        offset: normalized.offset,
      }),
    )
  }

  private readonly requireField = (value: string | undefined, field: string): GovernanceQueryError | null => {
    if (value) return null
    return governanceQueryError('INVALID_QUERY', `Missing required query field: ${field}`, { field })
  }

  private readonly requireElevatedRole = (
    context: GovernanceQueryContext | null | undefined,
    allowedRoles: string[],
    field: string,
  ): GovernanceQueryError | null => {
    if (context && hasElevatedGovernanceRole(context, allowedRoles)) {
      return null
    }

    return governanceQueryError('RESTRICTED_FIELD', `Reading ${field} requires an elevated Governance role`)
  }

  private readonly canReadActorActivity = (
    context: GovernanceQueryContext | null | undefined,
    query: ListActorActivityQuery,
  ): GovernanceQueryError | null => {
    if (!context) return null
    if (context.actorId && context.actorId === query.actorId) return null
    return this.requireElevatedRole(context, ACTOR_ACTIVITY_ROLES, 'actor activity')
  }
}
