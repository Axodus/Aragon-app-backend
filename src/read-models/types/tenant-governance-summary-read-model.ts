import type { ReadModelMetadata } from './read-model-metadata'

export interface TenantGovernanceSummaryReadModel {
  metadata: ReadModelMetadata
  tenantId: string
  proposalCountsByStatus: Record<string, number>
  openReviews: number
  pendingDecisions: number
  activeEmergencyActions: number
  blockedExecutionIntents: number
  latestDecisionAt: string | null
  latestAuditAt: string | null
}
