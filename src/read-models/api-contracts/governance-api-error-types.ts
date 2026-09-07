export type GovernanceApiErrorCode =
  | 'INVALID_QUERY'
  | 'MISSING_AUTH_CONTEXT'
  | 'MISSING_TENANT_SCOPE'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RESTRICTED_FIELD'
  | 'NOT_FOUND'
  | 'STALE_READ_MODEL'
  | 'QUERY_LIMIT_EXCEEDED'
  | 'EXECUTION_FORBIDDEN'
  | 'METHOD_NOT_ALLOWED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'

export interface GovernanceApiErrorBody {
  code: GovernanceApiErrorCode
  message: string
  details?: Record<string, unknown>
}
