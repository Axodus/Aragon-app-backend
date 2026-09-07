import type { PageInfo } from './pagination'
import type { ReadModelMetadata } from './read-model-metadata'

export type DecisionExecutionImpact = 'none' | 'record_only' | 'blocked'

export interface DecisionHistoryItem {
  decisionId: string
  proposalId: string
  tenantId: string
  decisionType: string
  outcome: string
  authority: string
  decidedAt: string
  evidenceReferences: string[]
  executionImpact: DecisionExecutionImpact
  auditId: string | null
}

export interface DecisionHistoryReadModel {
  metadata: ReadModelMetadata
  items: DecisionHistoryItem[]
  page: PageInfo
}
