import type { GovernanceReadOnlyApiEndpoint } from './governance-api-endpoints'
import type { GovernanceApiErrorCode } from './governance-api-error-types'
import type { GovernanceApiErrorMeta, GovernanceApiResponseMeta } from './governance-api-metadata'
import type { GovernanceApiError, GovernanceApiSuccess } from './governance-api-response-types'
import { GOVERNANCE_API_STATUS_BY_ERROR_CODE } from './governance-api-status-codes'

const requirePathParam = (value: string, name: string): string => {
  if (!value?.trim()) {
    throw new Error(`Missing Governance API path parameter: ${name}`)
  }

  return encodeURIComponent(value)
}

export const buildGovernanceApiSuccess = <T>(data: T, meta: GovernanceApiResponseMeta): GovernanceApiSuccess<T> => ({
  ok: true,
  data,
  meta,
})

export const buildGovernanceApiError = (
  error: GovernanceApiError['error'],
  meta: GovernanceApiErrorMeta,
): GovernanceApiError => ({
  ok: false,
  error,
  meta,
})

export const getGovernanceApiStatusForError = (code: GovernanceApiErrorCode): number =>
  GOVERNANCE_API_STATUS_BY_ERROR_CODE[code]

export const buildGovernanceTenantEndpoint = (
  endpointTemplate: GovernanceReadOnlyApiEndpoint,
  tenantId: string,
): string => endpointTemplate.replace(':tenantId', requirePathParam(tenantId, 'tenantId'))

export const buildGovernanceProposalEndpoint = (
  endpointTemplate: GovernanceReadOnlyApiEndpoint,
  tenantId: string,
  proposalId: string,
): string =>
  buildGovernanceTenantEndpoint(endpointTemplate, tenantId).replace(
    ':proposalId',
    requirePathParam(proposalId, 'proposalId'),
  )
