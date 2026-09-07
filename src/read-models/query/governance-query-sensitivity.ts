import type { GovernanceQueryRole } from './governance-query-authorization'

export type GovernanceSensitivityLevel = 'public' | 'internal' | 'restricted'

export type GovernanceReadModelName =
  | 'ProposalListReadModel'
  | 'ProposalDetailReadModel'
  | 'GovernanceTimelineReadModel'
  | 'DecisionHistoryReadModel'
  | 'ActorActivityReadModel'
  | 'TenantGovernanceSummaryReadModel'
  | 'EmergencyActionReadModel'
  | 'AuditTrailReadModel'

export interface GovernanceReadModelSensitivityPolicy {
  readModel: GovernanceReadModelName
  sensitivity: GovernanceSensitivityLevel
  minimumRole: GovernanceQueryRole
  sanitizeRestrictedFields: boolean
}

export const governanceReadModelSensitivity: Record<GovernanceReadModelName, GovernanceReadModelSensitivityPolicy> = {
  ProposalListReadModel: {
    readModel: 'ProposalListReadModel',
    sensitivity: 'internal',
    minimumRole: 'governance:reader',
    sanitizeRestrictedFields: true,
  },
  ProposalDetailReadModel: {
    readModel: 'ProposalDetailReadModel',
    sensitivity: 'internal',
    minimumRole: 'governance:reader',
    sanitizeRestrictedFields: true,
  },
  GovernanceTimelineReadModel: {
    readModel: 'GovernanceTimelineReadModel',
    sensitivity: 'internal',
    minimumRole: 'governance:reviewer',
    sanitizeRestrictedFields: true,
  },
  DecisionHistoryReadModel: {
    readModel: 'DecisionHistoryReadModel',
    sensitivity: 'internal',
    minimumRole: 'governance:reviewer',
    sanitizeRestrictedFields: true,
  },
  ActorActivityReadModel: {
    readModel: 'ActorActivityReadModel',
    sensitivity: 'restricted',
    minimumRole: 'governance:auditor',
    sanitizeRestrictedFields: true,
  },
  TenantGovernanceSummaryReadModel: {
    readModel: 'TenantGovernanceSummaryReadModel',
    sensitivity: 'internal',
    minimumRole: 'governance:reader',
    sanitizeRestrictedFields: true,
  },
  EmergencyActionReadModel: {
    readModel: 'EmergencyActionReadModel',
    sensitivity: 'internal',
    minimumRole: 'governance:reader',
    sanitizeRestrictedFields: true,
  },
  AuditTrailReadModel: {
    readModel: 'AuditTrailReadModel',
    sensitivity: 'restricted',
    minimumRole: 'governance:auditor',
    sanitizeRestrictedFields: true,
  },
}
