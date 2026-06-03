import type { GovernanceApiErrorCode } from './governance-api-error-types'

export const GOVERNANCE_API_STATUS_BY_ERROR_CODE = {
  INVALID_QUERY: 400,
  MISSING_AUTH_CONTEXT: 401,
  MISSING_TENANT_SCOPE: 400,
  UNAUTHORIZED: 403,
  FORBIDDEN: 403,
  RESTRICTED_FIELD: 403,
  NOT_FOUND: 404,
  STALE_READ_MODEL: 409,
  QUERY_LIMIT_EXCEEDED: 400,
  EXECUTION_FORBIDDEN: 403,
  METHOD_NOT_ALLOWED: 405,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
} as const satisfies Record<GovernanceApiErrorCode, number>

export type GovernanceApiStatusCode = (typeof GOVERNANCE_API_STATUS_BY_ERROR_CODE)[GovernanceApiErrorCode]
