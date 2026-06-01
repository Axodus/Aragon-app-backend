export interface QueryPagination {
  limit?: number
  offset?: number
}

export interface TenantScopedQuery extends QueryPagination {
  tenantId: string
}

export interface DateRangeQuery {
  dateFrom?: string
  dateTo?: string
}

export interface ListProposalsQuery extends TenantScopedQuery, DateRangeQuery {
  status?: string
  proposerActorId?: string
  decisionStatus?: string
  reviewStatus?: string
  emergencyFlag?: boolean
  tags?: string[]
}

export interface GetProposalDetailQuery extends TenantScopedQuery {
  proposalId: string
}

export interface GetGovernanceTimelineQuery extends TenantScopedQuery, DateRangeQuery {
  proposalId?: string
  entityType?: string
  entityId?: string
  severity?: string
}

export interface ListDecisionHistoryQuery extends TenantScopedQuery, DateRangeQuery {
  proposalId?: string
  decisionStatus?: string
  authority?: string
}

export interface ListEmergencyActionsQuery extends TenantScopedQuery, DateRangeQuery {
  proposalId?: string
  status?: string
  severity?: string
}

export interface GetTenantGovernanceSummaryQuery extends TenantScopedQuery {}

export interface ListAuditTrailQuery extends TenantScopedQuery, DateRangeQuery {
  actorId?: string
  actionType?: string
  entityType?: string
  entityId?: string
}

export interface ListActorActivityQuery extends TenantScopedQuery, DateRangeQuery {
  actorId: string
  actionType?: string
  entityType?: string
  entityId?: string
}

export type GovernanceReadModelQuery =
  | ListProposalsQuery
  | GetProposalDetailQuery
  | GetGovernanceTimelineQuery
  | ListDecisionHistoryQuery
  | ListEmergencyActionsQuery
  | GetTenantGovernanceSummaryQuery
  | ListAuditTrailQuery
  | ListActorActivityQuery
