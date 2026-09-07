import type { ActorActivityReadModel } from '../types/actor-activity-read-model'
import type { AuditTrailReadModel } from '../types/audit-trail-read-model'
import type { DecisionHistoryReadModel } from '../types/decision-history-read-model'
import type { EmergencyActionReadModel } from '../types/emergency-action-read-model'
import type { GovernanceTimelineReadModel } from '../types/governance-timeline-read-model'
import type { ProposalDetailReadModel } from '../types/proposal-detail-read-model'
import type { ProposalListReadModel } from '../types/proposal-list-read-model'
import type { TenantGovernanceSummaryReadModel } from '../types/tenant-governance-summary-read-model'
import type { GovernanceReadOnlyApiEndpointKey } from './governance-api-endpoints'

export interface GovernanceApiEndpointReadModelMap {
  tenantSummary: TenantGovernanceSummaryReadModel
  proposalList: ProposalListReadModel
  proposalDetail: ProposalDetailReadModel
  proposalTimeline: GovernanceTimelineReadModel
  decisionHistory: DecisionHistoryReadModel
  emergencyActions: EmergencyActionReadModel
  auditTrail: AuditTrailReadModel
  actorActivity: ActorActivityReadModel
}

export type GovernanceApiEndpointReadModel<K extends GovernanceReadOnlyApiEndpointKey> =
  GovernanceApiEndpointReadModelMap[K]
