export interface PaginationParams {
  limit?: number
  offset?: number
}

export interface GovernanceListFilter extends PaginationParams {
  tenantId?: string
  proposalId?: string
  actorId?: string
  status?: string
  entityType?: string
  entityId?: string
  scope?: string
  indexName?: string
}

export interface PaginatedRepositoryList<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}
