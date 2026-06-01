import type { ActorActivityReadModel } from '../types/actor-activity-read-model'
import type { AuditTrailReadModel } from '../types/audit-trail-read-model'
import type { DecisionHistoryReadModel } from '../types/decision-history-read-model'
import type { EmergencyActionReadModel } from '../types/emergency-action-read-model'
import type { GovernanceTimelineReadModel } from '../types/governance-timeline-read-model'
import type { ProposalDetailReadModel } from '../types/proposal-detail-read-model'
import type { ProposalListReadModel } from '../types/proposal-list-read-model'
import type { TenantGovernanceSummaryReadModel } from '../types/tenant-governance-summary-read-model'

export type LocalGovernanceIndexingStatus = 'pending' | 'complete' | 'failed'
export type LocalGovernanceFreshnessState = 'fresh' | 'stale' | 'rebuilding' | 'unknown' | 'failed'

export type LocalGovernanceIndexName =
  | 'proposal-list'
  | 'proposal-detail'
  | 'governance-timeline'
  | 'decision-history'
  | 'actor-activity'
  | 'tenant-governance-summary'
  | 'emergency-actions'
  | 'audit-trail'
  | 'full-tenant'

export interface LocalGovernanceIndexCheckpoint {
  checkpointId: string
  tenantId: string
  indexName: LocalGovernanceIndexName
  sourceVersion: string
  lastIndexedAt: string
  lastSourceEventAt: string | null
  status: LocalGovernanceIndexingStatus
  errorCode: string | null
  correlationId: string | null
}

export interface LocalGovernanceIndexingStats {
  indexName: LocalGovernanceIndexName
  tenantId: string
  startedAt: string
  finishedAt: string
  durationMs: number
  sourceRecordCount: number
  readModelCount: number
  status: LocalGovernanceIndexingStatus
  warnings: string[]
  correlationId: string | null
}

export interface LocalGovernanceIndexInput {
  tenantId: string
  indexName: LocalGovernanceIndexName
  proposalId?: string
  actorId?: string
  status?: string
  entityType?: string
  entityId?: string
  limit?: number
  offset?: number
  correlationId?: string | null
}

export interface LocalGovernanceTenantIndexSnapshot {
  proposalList: ProposalListReadModel
  governanceTimeline: GovernanceTimelineReadModel
  decisionHistory: DecisionHistoryReadModel
  tenantGovernanceSummary: TenantGovernanceSummaryReadModel
  emergencyActions: EmergencyActionReadModel
  auditTrail: AuditTrailReadModel
  actorActivity?: ActorActivityReadModel
}

export interface LocalGovernanceProposalIndexSnapshot {
  proposalDetail: ProposalDetailReadModel
  governanceTimeline: GovernanceTimelineReadModel
  decisionHistory: DecisionHistoryReadModel
}
