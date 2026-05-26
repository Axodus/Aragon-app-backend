import type { ExecutionMode, GovernanceExecutorReason } from '@services/governance-executor/types'

type ProposalStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'voting'
  | 'approved'
  | 'rejected'
  | 'queued'
  | 'executable'
  | 'executed'
  | 'expired'
  | 'cancelled'
  | 'blocked'
  | 'emergency_paused'

type ApprovalStatus = 'not_requested' | 'pending' | 'approved' | 'rejected' | 'blocked'

type ProposalExecutionStatus = 'not_requested' | 'mock_ready' | 'mock_executed' | 'blocked' | 'failed' | 'cancelled'

type RequiredNextAction =
  | 'create_proposal'
  | 'submit_for_review'
  | 'wait_for_vote'
  | 'wait_for_queue'
  | 'mark_executable'
  | 'create_mock_receipt'
  | 'resolve_restriction'
  | 'resolve_emergency'
  | 'update_policy_version'
  | 'none'

interface GovernanceProposalRecord {
  proposalId: string
  governanceProposalRef: string
  daoId: string | null
  tenantId: string | null
  proposalType: string
  proposalStatus: ProposalStatus
  approvalStatus: ApprovalStatus
  executionStatus: ProposalExecutionStatus
  executorRef: string | null
  policyVersion: string
  constitutionalReference: string
  reasonCodes: GovernanceExecutorReason[]
  createdAt: string
  submittedAt: string | null
  approvedAt: string | null
  queuedAt: string | null
  executableAt: string | null
  executedAt: string | null
  cancelledAt: string | null
  expiredAt: string | null
  blockedAt: string | null
}

interface ProposalExecutionValidation {
  allowed: boolean
  blocked: boolean
  proposalId: string | null
  executorRef: string | null
  proposalStatus: ProposalStatus | null
  executionStatus: ProposalExecutionStatus | null
  executionMode: ExecutionMode | null
  reasonCodes: GovernanceExecutorReason[]
  requiredNextAction: RequiredNextAction
}

export type {
  ApprovalStatus,
  GovernanceProposalRecord,
  ProposalExecutionStatus,
  ProposalExecutionValidation,
  ProposalStatus,
  RequiredNextAction,
}
