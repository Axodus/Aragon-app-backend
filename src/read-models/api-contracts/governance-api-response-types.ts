import type { ActorActivityReadModel } from '../types/actor-activity-read-model'
import type { AuditTrailReadModel } from '../types/audit-trail-read-model'
import type { DecisionHistoryReadModel } from '../types/decision-history-read-model'
import type { EmergencyActionReadModel } from '../types/emergency-action-read-model'
import type { GovernanceTimelineReadModel } from '../types/governance-timeline-read-model'
import type { ProposalDetailReadModel } from '../types/proposal-detail-read-model'
import type { ProposalListReadModel } from '../types/proposal-list-read-model'
import type { TenantGovernanceSummaryReadModel } from '../types/tenant-governance-summary-read-model'
import type { GovernanceApiErrorBody } from './governance-api-error-types'
import type { GovernanceApiErrorMeta, GovernanceApiResponseMeta } from './governance-api-metadata'

export interface GovernanceApiSuccess<T> {
  ok: true
  data: T
  meta: GovernanceApiResponseMeta
}

export interface GovernanceApiError {
  ok: false
  error: GovernanceApiErrorBody
  meta: GovernanceApiErrorMeta
}

export type GovernanceApiResponse<T> = GovernanceApiSuccess<T> | GovernanceApiError

export type GovernanceApiTenantSummaryResponse = GovernanceApiResponse<TenantGovernanceSummaryReadModel>
export type GovernanceApiProposalListResponse = GovernanceApiResponse<ProposalListReadModel>
export type GovernanceApiProposalDetailResponse = GovernanceApiResponse<ProposalDetailReadModel>
export type GovernanceApiProposalTimelineResponse = GovernanceApiResponse<GovernanceTimelineReadModel>
export type GovernanceApiDecisionHistoryResponse = GovernanceApiResponse<DecisionHistoryReadModel>
export type GovernanceApiEmergencyActionsResponse = GovernanceApiResponse<EmergencyActionReadModel>
export type GovernanceApiAuditTrailResponse = GovernanceApiResponse<AuditTrailReadModel>
export type GovernanceApiActorActivityResponse = GovernanceApiResponse<ActorActivityReadModel>
