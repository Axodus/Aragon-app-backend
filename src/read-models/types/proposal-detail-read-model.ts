import type { ReadModelMetadata } from './read-model-metadata'
import type { ProposalExecutionIntentStatus } from './proposal-list-read-model'

export interface GovernanceProposalSummary {
  proposalId: string
  tenantId: string
  daoId: string | null
  title: string
  status: string
  proposerActorId: string | null
  createdAt: string
  updatedAt: string
}

export interface GovernanceProposalVersionSummary {
  proposalId: string
  version: number
  title: string | null
  contentHash: string | null
  actorId: string | null
  createdAt: string
}

export interface GovernanceDecisionSummary {
  decisionId: string
  proposalId: string
  outcome: string
  authority: string
  actorId: string
  decidedAt: string
  evidenceReferenceCount: number
}

export interface GovernanceVoteSummary {
  voteId: string
  proposalId: string
  actorId: string
  vote: string
  votingPower: string | null
  castAt: string
}

export interface GovernanceReviewSummary {
  reviewId: string
  proposalId: string
  actorId: string
  recommendation: string
  status: string
  rationalePresent: boolean
  reviewedAt: string
}

export interface GovernanceExecutionIntentSummary {
  intentId: string
  proposalId: string
  executionIntentStatus: ProposalExecutionIntentStatus
  blockedReason: string | null
  recordedAt: string
}

export interface GovernanceEmergencyActionSummary {
  emergencyActionId: string
  tenantId: string
  actionType: string
  status: string
  ratificationCount: number
  createdAt: string
}

export interface GovernanceAuditReference {
  auditId: string
  entityType: string
  entityId: string
  actionType: string
  evidenceReferenceCount: number
}

export interface GovernanceReceiptReferenceSummary {
  receiptId: string
  entityType: string
  entityId: string
  source: string
  reference: string
}

export interface ProposalDetailReadModel {
  metadata: ReadModelMetadata
  proposal: GovernanceProposalSummary
  latestVersion: GovernanceProposalVersionSummary | null
  versions: GovernanceProposalVersionSummary[]
  decisions: GovernanceDecisionSummary[]
  votes: GovernanceVoteSummary[]
  reviews: GovernanceReviewSummary[]
  executionIntents: GovernanceExecutionIntentSummary[]
  emergencyActions: GovernanceEmergencyActionSummary[]
  auditReferences: GovernanceAuditReference[]
  receiptReferences: GovernanceReceiptReferenceSummary[]
}
