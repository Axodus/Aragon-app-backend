export interface GovernanceApiPaginationQuery {
  limit?: number
  offset?: number
}

export interface GovernanceApiDateRangeQuery {
  dateFrom?: string
  dateTo?: string
}

export interface GovernanceTenantPathParams {
  tenantId: string
}

export interface GovernanceProposalPathParams {
  tenantId: string
  proposalId: string
}

export type GovernanceProposalListApiQuery = GovernanceApiPaginationQuery &
  GovernanceApiDateRangeQuery & {
    status?: string
    decisionStatus?: string
    reviewStatus?: string
    emergencyFlag?: boolean
    tags?: string[]
  }

export type GovernanceDecisionHistoryApiQuery = GovernanceApiPaginationQuery &
  GovernanceApiDateRangeQuery & {
    proposalId?: string
  }

export type GovernanceEmergencyActionsApiQuery = GovernanceApiPaginationQuery &
  GovernanceApiDateRangeQuery & {
    severity?: string
  }

export type GovernanceAuditTrailApiQuery = GovernanceApiPaginationQuery &
  GovernanceApiDateRangeQuery & {
    actorId?: string
    entityType?: string
    entityId?: string
  }

export type GovernanceActorActivityApiQuery = GovernanceApiPaginationQuery &
  GovernanceApiDateRangeQuery & {
    actorId?: string
    entityType?: string
    entityId?: string
  }

export type GovernanceProposalTimelineApiQuery = GovernanceApiPaginationQuery &
  GovernanceApiDateRangeQuery & {
    severity?: string
    entityType?: string
    entityId?: string
  }
