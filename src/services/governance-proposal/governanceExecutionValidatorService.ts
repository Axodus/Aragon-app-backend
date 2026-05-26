import GovernanceExecutorService from '@services/governance-executor/governanceExecutorService'
import type { ExecutorResolution, GovernanceExecutorReason } from '@services/governance-executor/types'
import GovernanceProposalRepository from './governanceProposalRepository'
import type { GovernanceProposalRecord, ProposalExecutionValidation, ProposalStatus, RequiredNextAction } from './types'

const source = 'governance execution validator'

const terminalStatuses = new Set<ProposalStatus>([
  'executed',
  'expired',
  'cancelled',
  'rejected',
  'blocked',
  'emergency_paused',
])

const blockingReasonCodes = new Set([
  'GOVERNANCE_PROPOSAL_NOT_FOUND',
  'PROPOSAL_DAO_ID_MISSING',
  'PROPOSAL_TENANT_ID_MISSING',
  'PROPOSAL_EXECUTOR_REF_MISSING',
  'GOVERNANCE_EXECUTOR_NOT_FOUND',
  'PROPOSAL_EXECUTOR_REF_MISMATCH',
  'PROPOSAL_LIFECYCLE_TRANSITION_INVALID',
  'PROPOSAL_LIFECYCLE_TERMINAL',
  'EXECUTOR_PROPOSAL_TYPE_NOT_SUPPORTED',
  'EXECUTOR_BLOCKED_BY_POLICY',
  'EMERGENCY_EXECUTION_DISABLED',
  'EXECUTION_CHAIN_NOT_AUTHORIZED',
  'PRODUCTION_EXECUTION_REQUIRES_FUTURE_APPROVAL',
])

const transitionPrerequisites: Record<string, ProposalStatus[]> = {
  queued: ['approved'],
  executable: ['queued'],
  executed: ['executable'],
}

const reason = (
  reasonCode: string,
  reasonSeverity: GovernanceExecutorReason['reasonSeverity'],
  message: string,
): GovernanceExecutorReason => ({
  reasonCode,
  reasonSeverity,
  source,
  message,
})

function requiredNextAction(proposal: GovernanceProposalRecord | null, blocked: boolean): RequiredNextAction {
  if (!proposal) return 'create_proposal'
  if (blocked && proposal.proposalStatus === 'emergency_paused') return 'resolve_emergency'
  if (blocked) return 'resolve_restriction'
  if (proposal.proposalStatus === 'draft') return 'submit_for_review'
  if (proposal.proposalStatus === 'submitted' || proposal.proposalStatus === 'under_review') return 'wait_for_vote'
  if (proposal.proposalStatus === 'approved') return 'wait_for_queue'
  if (proposal.proposalStatus === 'queued') return 'mark_executable'
  if (proposal.proposalStatus === 'executable') return 'create_mock_receipt'
  return 'none'
}

function invalidTransitionReason(proposal: GovernanceProposalRecord, requestedTransition?: string) {
  if (!requestedTransition) return null
  const allowedSources = transitionPrerequisites[requestedTransition]
  if (!allowedSources) return null
  if (allowedSources.includes(proposal.proposalStatus)) return null

  return reason(
    'PROPOSAL_LIFECYCLE_TRANSITION_INVALID',
    'critical',
    `Proposal cannot transition from ${proposal.proposalStatus} to ${requestedTransition}.`,
  )
}

async function validateProposalExecution(
  proposalId: string,
  requestedTransition?: string,
): Promise<ProposalExecutionValidation> {
  const proposal = await GovernanceProposalRepository.getProposalById(proposalId)

  if (!proposal) {
    return {
      allowed: false,
      blocked: true,
      proposalId,
      executorRef: null,
      proposalStatus: null,
      executionStatus: null,
      executionMode: null,
      reasonCodes: [
        reason(
          'GOVERNANCE_PROPOSAL_NOT_FOUND',
          'critical',
          'No observed Governance proposal record exists for the provided proposal id.',
        ),
      ],
      requiredNextAction: 'create_proposal',
    }
  }

  const reasonCodes = [...proposal.reasonCodes]

  if (!proposal.daoId) {
    reasonCodes.push(reason('PROPOSAL_DAO_ID_MISSING', 'critical', 'Proposal cannot progress without a DAO id.'))
  }

  if (!proposal.tenantId) {
    reasonCodes.push(
      reason('PROPOSAL_TENANT_ID_MISSING', 'critical', 'Proposal cannot progress without a DAO tenant id.'),
    )
  }

  if (!proposal.executorRef) {
    reasonCodes.push(
      reason(
        'PROPOSAL_EXECUTOR_REF_MISSING',
        'critical',
        'Every executable Governance proposal must bind to a canonical executor reference.',
      ),
    )
  }

  const executorResolutionResponse = proposal.tenantId
    ? await GovernanceExecutorService.resolveTenantExecutor(proposal.tenantId, proposal.proposalType)
    : null
  const executorResolution = executorResolutionResponse?.data as ExecutorResolution | null
  const executor = executorResolution?.executor ?? null

  if (!executor) {
    reasonCodes.push(
      reason(
        'GOVERNANCE_EXECUTOR_NOT_FOUND',
        'critical',
        'No canonical Governance executor exists for the proposal tenant.',
      ),
    )
  } else if (proposal.executorRef !== executor.governanceExecutorRef && proposal.executorRef !== executor.executorId) {
    reasonCodes.push(
      reason(
        'PROPOSAL_EXECUTOR_REF_MISMATCH',
        'critical',
        'Proposal executor reference does not match the current canonical tenant executor.',
      ),
    )
  }

  if (executorResolution?.reasonCodes.length) {
    reasonCodes.push(...executorResolution.reasonCodes)
  }

  const transitionReason = invalidTransitionReason(proposal, requestedTransition)
  if (transitionReason) reasonCodes.push(transitionReason)

  if (terminalStatuses.has(proposal.proposalStatus)) {
    reasonCodes.push(
      reason(
        'PROPOSAL_LIFECYCLE_TERMINAL',
        'critical',
        `Proposal status ${proposal.proposalStatus} is terminal for execution progression.`,
      ),
    )
  }

  if (executor?.executionMode === 'mock_execution') {
    reasonCodes.push(
      reason(
        'MOCK_RECEIPT_ONLY',
        'warning',
        'Mock execution can only emit mock receipts without tx hash or block number.',
      ),
    )
  }

  if (executor?.executionMode === 'production_execution' || executor?.isProductionExecutor) {
    reasonCodes.push(
      reason(
        'PRODUCTION_EXECUTION_REQUIRES_FUTURE_APPROVAL',
        'constitutional',
        'Production execution remains unavailable in Sprint 02 safe implementation.',
      ),
    )
  }

  const blocked =
    reasonCodes.some(item => blockingReasonCodes.has(item.reasonCode)) ||
    Boolean(executorResolution?.blocked) ||
    !executorResolution?.supported
  const allowed = !blocked && ['queued', 'executable'].includes(proposal.proposalStatus)

  return {
    allowed,
    blocked,
    proposalId: proposal.proposalId,
    executorRef: proposal.executorRef,
    proposalStatus: proposal.proposalStatus,
    executionStatus: proposal.executionStatus,
    executionMode: executor?.executionMode ?? null,
    reasonCodes,
    requiredNextAction: requiredNextAction(proposal, blocked),
  }
}

const GovernanceExecutionValidatorService = {
  validateProposalExecution,
}

export default GovernanceExecutionValidatorService
