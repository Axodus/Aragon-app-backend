import type { PageInfo } from './pagination'
import type { ReadModelMetadata } from './read-model-metadata'
import type { GovernanceTimelineSeverity } from './governance-timeline-read-model'

export interface EmergencyActionItem {
  emergencyActionId: string
  tenantId: string
  proposalId: string | null
  actionType: string
  status: string
  severity: GovernanceTimelineSeverity
  reason: string
  createdAt: string
  expiresAt: string | null
  ratificationStatus: string | null
  auditId: string | null
}

export interface EmergencyActionReadModel {
  metadata: ReadModelMetadata
  items: EmergencyActionItem[]
  page: PageInfo
}
