import type { PageInfo } from './pagination'
import type { ReadModelMetadata } from './read-model-metadata'

export type GovernanceTimelineSeverity = 'info' | 'warning' | 'critical'

export interface GovernanceTimelineEntry {
  timelineId: string
  tenantId: string
  entityType: string
  entityId: string
  eventType: string
  actorId: string | null
  occurredAt: string
  summary: string
  severity: GovernanceTimelineSeverity
  auditId: string | null
  decisionReference: string | null
  receiptReference: string | null
}

export interface GovernanceTimelineReadModel {
  metadata: ReadModelMetadata
  entries: GovernanceTimelineEntry[]
  page: PageInfo
}
