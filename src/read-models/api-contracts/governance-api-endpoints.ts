import type { GovernanceApiHttpMethod } from './governance-api-methods'

export const GOVERNANCE_API_BASE_PATH = '/api/governance/v1'

export const GOVERNANCE_READONLY_API_ENDPOINTS = {
  tenantSummary: `${GOVERNANCE_API_BASE_PATH}/tenants/:tenantId/summary`,
  proposalList: `${GOVERNANCE_API_BASE_PATH}/tenants/:tenantId/proposals`,
  proposalDetail: `${GOVERNANCE_API_BASE_PATH}/tenants/:tenantId/proposals/:proposalId`,
  proposalTimeline: `${GOVERNANCE_API_BASE_PATH}/tenants/:tenantId/proposals/:proposalId/timeline`,
  decisionHistory: `${GOVERNANCE_API_BASE_PATH}/tenants/:tenantId/decisions`,
  emergencyActions: `${GOVERNANCE_API_BASE_PATH}/tenants/:tenantId/emergency-actions`,
  auditTrail: `${GOVERNANCE_API_BASE_PATH}/tenants/:tenantId/audit-trail`,
  actorActivity: `${GOVERNANCE_API_BASE_PATH}/tenants/:tenantId/actor-activity`,
} as const

export type GovernanceReadOnlyApiEndpointKey = keyof typeof GOVERNANCE_READONLY_API_ENDPOINTS
export type GovernanceReadOnlyApiEndpoint = (typeof GOVERNANCE_READONLY_API_ENDPOINTS)[GovernanceReadOnlyApiEndpointKey]

export const GOVERNANCE_FORBIDDEN_API_ENDPOINT_PATTERNS = [
  'POST /api/governance/v1/proposals',
  'PATCH /api/governance/v1/proposals/:proposalId',
  'POST /api/governance/v1/proposals/:proposalId/submit',
  'POST /api/governance/v1/proposals/:proposalId/vote',
  'POST /api/governance/v1/proposals/:proposalId/review',
  'POST /api/governance/v1/proposals/:proposalId/decision',
  'POST /api/governance/v1/proposals/:proposalId/execute',
  'POST /api/governance/v1/treasury/*',
  'POST /api/governance/v1/onchain/*',
  'POST /api/governance/v1/index/*',
] as const

export type GovernanceForbiddenApiEndpointPattern = (typeof GOVERNANCE_FORBIDDEN_API_ENDPOINT_PATTERNS)[number]

export type GovernanceApiAccessLevel = 'public-read' | 'tenant-read' | 'internal-read' | 'restricted-read'

export interface GovernanceApiEndpointMetadata {
  key: GovernanceReadOnlyApiEndpointKey
  method: GovernanceApiHttpMethod
  path: GovernanceReadOnlyApiEndpoint
  accessLevel: GovernanceApiAccessLevel
  restricted: boolean
}

export const GOVERNANCE_READONLY_API_ENDPOINT_METADATA = {
  tenantSummary: {
    key: 'tenantSummary',
    method: 'GET',
    path: GOVERNANCE_READONLY_API_ENDPOINTS.tenantSummary,
    accessLevel: 'tenant-read',
    restricted: false,
  },
  proposalList: {
    key: 'proposalList',
    method: 'GET',
    path: GOVERNANCE_READONLY_API_ENDPOINTS.proposalList,
    accessLevel: 'tenant-read',
    restricted: false,
  },
  proposalDetail: {
    key: 'proposalDetail',
    method: 'GET',
    path: GOVERNANCE_READONLY_API_ENDPOINTS.proposalDetail,
    accessLevel: 'tenant-read',
    restricted: false,
  },
  proposalTimeline: {
    key: 'proposalTimeline',
    method: 'GET',
    path: GOVERNANCE_READONLY_API_ENDPOINTS.proposalTimeline,
    accessLevel: 'internal-read',
    restricted: false,
  },
  decisionHistory: {
    key: 'decisionHistory',
    method: 'GET',
    path: GOVERNANCE_READONLY_API_ENDPOINTS.decisionHistory,
    accessLevel: 'internal-read',
    restricted: false,
  },
  emergencyActions: {
    key: 'emergencyActions',
    method: 'GET',
    path: GOVERNANCE_READONLY_API_ENDPOINTS.emergencyActions,
    accessLevel: 'internal-read',
    restricted: false,
  },
  auditTrail: {
    key: 'auditTrail',
    method: 'GET',
    path: GOVERNANCE_READONLY_API_ENDPOINTS.auditTrail,
    accessLevel: 'restricted-read',
    restricted: true,
  },
  actorActivity: {
    key: 'actorActivity',
    method: 'GET',
    path: GOVERNANCE_READONLY_API_ENDPOINTS.actorActivity,
    accessLevel: 'restricted-read',
    restricted: true,
  },
} as const satisfies Record<GovernanceReadOnlyApiEndpointKey, GovernanceApiEndpointMetadata>
