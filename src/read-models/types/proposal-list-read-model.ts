import type { PageInfo } from './pagination'
import type { ReadModelMetadata } from './read-model-metadata'

export type ProposalExecutionIntentStatus = 'none' | 'recorded' | 'blocked'

export interface ProposalListItem {
  proposalId: string
  tenantId: string
  title: string
  summary: string | null
  status: string
  proposerActorId: string
  createdAt: string
  updatedAt: string
  submittedAt: string | null
  decisionStatus: string | null
  reviewStatus: string | null
  emergencyFlag: boolean
  executionIntentStatus: ProposalExecutionIntentStatus
  latestVersion: number
  tags: string[]
}

export interface ProposalListReadModel {
  metadata: ReadModelMetadata
  items: ProposalListItem[]
  page: PageInfo
}
