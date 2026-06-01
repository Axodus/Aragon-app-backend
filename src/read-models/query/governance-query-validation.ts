import type { GovernanceQueryContext } from './governance-query-context'
import { governanceQueryError } from './governance-query-errors'
import type { GovernanceQueryError } from './governance-query-errors'
import type { GovernanceReadModelQuery, QueryPagination } from './governance-query-inputs'

export const DEFAULT_QUERY_LIMIT = 25
export const MAX_QUERY_LIMIT = 100

const forbiddenQueryFields = [
  'execute',
  'execution',
  'executionEnabled',
  'executionRequested',
  'mutate',
  'mutation',
  'submit',
  'vote',
  'review',
  'decision',
  'treasuryAction',
  'onChainWrite',
]

export const hasElevatedGovernanceRole = (context: GovernanceQueryContext, allowedRoles: string[]) =>
  context.roles.some(role => allowedRoles.includes(role))

export const validateQueryContext = (
  context: GovernanceQueryContext | null | undefined,
): GovernanceQueryError | null => {
  if (!context) {
    return governanceQueryError('MISSING_QUERY_CONTEXT', 'Governance query context is required')
  }

  if (!context.tenantId) {
    return governanceQueryError('MISSING_TENANT_SCOPE', 'Governance query context requires tenant scope')
  }

  if (!Array.isArray(context.roles)) {
    return governanceQueryError('INVALID_QUERY', 'Governance query context roles must be an array')
  }

  return null
}

export const validateTenantScope = (
  context: GovernanceQueryContext,
  query: { tenantId?: string },
): GovernanceQueryError | null => {
  if (!query.tenantId) {
    return governanceQueryError('MISSING_TENANT_SCOPE', 'Governance query requires tenant scope')
  }

  if (query.tenantId !== context.tenantId) {
    return governanceQueryError('UNAUTHORIZED', 'Cross-tenant Governance read model queries are not allowed')
  }

  return null
}

export const normalizePagination = <T extends QueryPagination>(query: T): T & { limit: number; offset: number } => ({
  ...query,
  limit: query.limit ?? DEFAULT_QUERY_LIMIT,
  offset: query.offset ?? 0,
})

export const validatePagination = (query: QueryPagination): GovernanceQueryError | null => {
  if (query.limit !== undefined && (!Number.isInteger(query.limit) || query.limit < 0)) {
    return governanceQueryError('INVALID_QUERY', 'Query limit must be a non-negative integer')
  }

  if ((query.limit ?? DEFAULT_QUERY_LIMIT) > MAX_QUERY_LIMIT) {
    return governanceQueryError('QUERY_LIMIT_EXCEEDED', 'Query limit exceeds the maximum allowed value', {
      maxLimit: MAX_QUERY_LIMIT,
    })
  }

  if (query.offset !== undefined && (!Number.isInteger(query.offset) || query.offset < 0)) {
    return governanceQueryError('INVALID_QUERY', 'Query offset must be a non-negative integer')
  }

  return null
}

export const validateDateRange = (query: Record<string, unknown>): GovernanceQueryError | null => {
  const dateFrom = typeof query.dateFrom === 'string' ? query.dateFrom : undefined
  const dateTo = typeof query.dateTo === 'string' ? query.dateTo : undefined
  const from = dateFrom ? Date.parse(dateFrom) : null
  const to = dateTo ? Date.parse(dateTo) : null

  if (dateFrom && Number.isNaN(from)) {
    return governanceQueryError('INVALID_QUERY', 'dateFrom must be a valid date string')
  }

  if (dateTo && Number.isNaN(to)) {
    return governanceQueryError('INVALID_QUERY', 'dateTo must be a valid date string')
  }

  if (from !== null && to !== null && from > to) {
    return governanceQueryError('INVALID_QUERY', 'dateFrom must not be after dateTo')
  }

  return null
}

export const validateNoExecutionIntent = (query: Record<string, unknown>): GovernanceQueryError | null => {
  const forbiddenField = forbiddenQueryFields.find(field => Object.prototype.hasOwnProperty.call(query, field))
  if (!forbiddenField) {
    return null
  }

  return governanceQueryError(
    'EXECUTION_FORBIDDEN',
    'Governance read model queries cannot request mutations or execution',
    {
      field: forbiddenField,
    },
  )
}

export const validateQueryEnvelope = (
  context: GovernanceQueryContext | null | undefined,
  query: GovernanceReadModelQuery & Record<string, unknown>,
): GovernanceQueryError | null => {
  const contextError = validateQueryContext(context)
  if (contextError) return contextError

  const tenantError = validateTenantScope(context!, query)
  if (tenantError) return tenantError

  const paginationError = validatePagination(query)
  if (paginationError) return paginationError

  const dateError = validateDateRange(query)
  if (dateError) return dateError

  return validateNoExecutionIntent(query)
}
