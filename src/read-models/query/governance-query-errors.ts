export type GovernanceQueryErrorCode =
  | 'INVALID_QUERY'
  | 'MISSING_QUERY_CONTEXT'
  | 'MISSING_TENANT_SCOPE'
  | 'UNAUTHORIZED'
  | 'RESTRICTED_FIELD'
  | 'NOT_FOUND'
  | 'STALE_READ_MODEL'
  | 'QUERY_LIMIT_EXCEEDED'
  | 'EXECUTION_FORBIDDEN'

export interface GovernanceQueryError {
  code: GovernanceQueryErrorCode
  message: string
  details?: Record<string, unknown>
}

export const governanceQueryError = (
  code: GovernanceQueryErrorCode,
  message: string,
  details?: Record<string, unknown>,
): GovernanceQueryError => ({
  code,
  message,
  ...(details ? { details } : {}),
})
