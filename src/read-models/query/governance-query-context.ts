export interface GovernanceQueryContext {
  tenantId: string
  actorId: string | null
  roles: string[]
  requestId: string | null
  correlationId: string | null
}
