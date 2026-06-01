export interface GovernancePersistenceMetadata {
  idempotencyKey?: string
  requestId?: string
  correlationId?: string
  createdAt: string
  updatedAt?: string
}

export interface GovernanceProposalEventRecord extends GovernancePersistenceMetadata {
  eventId: string
  proposalId: string
  eventType: string
  actorId?: string
  reason?: string
}

export interface GovernanceProposalRecord extends GovernancePersistenceMetadata {
  proposalId: string
  tenantId: string
  daoId?: string
  actorId?: string
  status: string
  title?: string
  events?: GovernanceProposalEventRecord[]
}

export interface GovernanceProposalVersionRecord extends GovernancePersistenceMetadata {
  proposalId: string
  version: number
  tenantId: string
  actorId?: string
  contentHash?: string
  title?: string
}

export interface GovernanceDecisionRecord extends GovernancePersistenceMetadata {
  decisionId: string
  proposalId: string
  tenantId: string
  actorId: string
  authorityRef: string
  outcome: string
  evidenceReferences?: string[]
}

export interface GovernanceVoteRecord extends GovernancePersistenceMetadata {
  voteId: string
  proposalId: string
  tenantId: string
  actorId: string
  vote: string
  votingPower?: string
}

export interface GovernanceReviewRecord extends GovernancePersistenceMetadata {
  reviewId: string
  proposalId: string
  tenantId: string
  actorId: string
  recommendation: string
  status: string
  rationale?: string
}

export interface GovernanceExecutionIntentRecord extends GovernancePersistenceMetadata {
  intentId: string
  proposalId: string
  tenantId: string
  actorId?: string
  executionEnabled: false
  executionStatus: 'blocked' | 'recorded'
  blockedReason?: string
}

export interface GovernanceEmergencyActionRecord extends GovernancePersistenceMetadata {
  actionId: string
  tenantId: string
  actorId: string
  actionType: string
  status: string
  ratifications?: GovernanceEmergencyRatificationRecord[]
}

export interface GovernanceEmergencyRatificationRecord extends GovernancePersistenceMetadata {
  ratificationId: string
  actionId: string
  actorId: string
  outcome: string
}

export interface GovernanceAuditRecord extends GovernancePersistenceMetadata {
  auditId: string
  tenantId: string
  actorId: string
  actionType: string
  entityType: string
  entityId: string
  previousState?: Record<string, unknown> | null
  newState?: Record<string, unknown> | null
  evidenceReferences?: string[]
}

export interface GovernanceSnapshotRecord extends GovernancePersistenceMetadata {
  snapshotId: string
  scope: string
  tenantId?: string
  source: string
  data: Record<string, unknown>
}

export interface GovernanceIndexCheckpointRecord extends GovernancePersistenceMetadata {
  checkpointId: string
  indexName: string
  tenantId?: string
  position: string
}

export interface GovernanceReceiptReferenceRecord extends GovernancePersistenceMetadata {
  receiptId: string
  entityType: string
  entityId: string
  tenantId?: string
  source: string
  reference: string
}
