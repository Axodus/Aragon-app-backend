import type { PageInfo } from './pagination'
import type { ReadModelMetadata } from './read-model-metadata'

export interface AuditTrailItem {
  auditId: string
  tenantId: string
  actorId: string
  actionType: string
  entityType: string
  entityId: string
  timestamp: string
  decisionReference: string | null
  evidenceReferenceCount: number
  receiptReference: string | null
  riskNotesPresent: boolean
}

export interface AuditTrailReadModel {
  metadata: ReadModelMetadata
  items: AuditTrailItem[]
  page: PageInfo
}
