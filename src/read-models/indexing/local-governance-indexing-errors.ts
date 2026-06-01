export type LocalGovernanceIndexingErrorCode =
  | 'INVALID_INDEX_REQUEST'
  | 'MISSING_TENANT_SCOPE'
  | 'SOURCE_RECORD_NOT_FOUND'
  | 'PROJECTION_FAILED'
  | 'CHECKPOINT_FAILED'
  | 'UNSUPPORTED_INDEX'
  | 'EXECUTION_FORBIDDEN'

export interface LocalGovernanceIndexingError {
  code: LocalGovernanceIndexingErrorCode
  message: string
  details?: Record<string, unknown>
}

export const localGovernanceIndexingError = (
  code: LocalGovernanceIndexingErrorCode,
  message: string,
  details?: Record<string, unknown>,
): LocalGovernanceIndexingError => ({
  code,
  message,
  ...(details ? { details } : {}),
})
