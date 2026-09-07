import type { PageInfo } from './pagination'
import type { ReadModelMetadata } from './read-model-metadata'

export interface ActorActivityItem {
  activityId: string
  actorId: string
  tenantId: string
  actionType: string
  entityType: string
  entityId: string
  occurredAt: string
  summary: string
  auditId: string | null
}

export interface ActorActivityReadModel {
  metadata: ReadModelMetadata
  actorId: string
  items: ActorActivityItem[]
  page: PageInfo
}
