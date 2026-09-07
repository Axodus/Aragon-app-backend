export type RepositoryErrorCode =
  | 'NOT_FOUND'
  | 'DUPLICATE_RECORD'
  | 'INVALID_STATE_TRANSITION'
  | 'VALIDATION_ERROR'
  | 'PERMISSION_CONTEXT_MISSING'
  | 'APPEND_ONLY_VIOLATION'
  | 'EXECUTION_FORBIDDEN'
  | 'PRODUCTION_PERSISTENCE_FORBIDDEN'

export interface RepositoryError {
  code: RepositoryErrorCode
  message: string
  details?: Record<string, unknown>
}

export const repositoryError = (
  code: RepositoryErrorCode,
  message: string,
  details?: Record<string, unknown>,
): RepositoryError => ({
  code,
  message,
  ...(details ? { details } : {}),
})
