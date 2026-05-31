import GovernanceExecutorRepository from './governanceExecutorRepository'
import { executorBoundary } from './mockGovernanceExecutors'
import type { ExecutorResolution, GovernanceExecutorRef, GovernanceExecutorReason } from './types'

const source = 'canonical governance executor registry'

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

function resolveExecutor(executor: GovernanceExecutorRef | null, proposalType?: string): ExecutorResolution {
  if (!executor) {
    return {
      executor: null,
      supported: false,
      blocked: true,
      reasonCodes: [
        reason(
          'GOVERNANCE_EXECUTOR_NOT_FOUND',
          'critical',
          'No canonical Governance executor reference exists for this DAO or tenant.',
        ),
      ],
      boundary: executorBoundary,
    }
  }

  const supported = !proposalType || executor.supportedProposalTypes.includes(proposalType)
  const blocked =
    executor.executorStatus === 'blocked' ||
    executor.executorStatus === 'disabled' ||
    executor.emergencyDisabled ||
    executor.executionMode === 'production_execution' ||
    executor.isProductionExecutor
  const reasonCodes = [...executor.reasonCodes]

  if (!supported) {
    reasonCodes.push(
      reason(
        'EXECUTOR_PROPOSAL_TYPE_NOT_SUPPORTED',
        'warning',
        `Executor does not support proposal type ${proposalType}.`,
      ),
    )
  }

  if (executor.executionMode === 'mock_execution') {
    reasonCodes.push(
      reason(
        'MOCK_EXECUTION_MODE_ACTIVE',
        'warning',
        'Execution mode is mock_execution. API success is not on-chain execution proof.',
      ),
    )
  }

  if (blocked) {
    reasonCodes.push(
      reason(
        executor.emergencyDisabled ? 'EMERGENCY_EXECUTION_DISABLED' : 'EXECUTOR_BLOCKED_BY_POLICY',
        'constitutional',
        'Executor cannot perform real execution under the current policy boundary.',
      ),
    )
  }

  return {
    executor,
    supported,
    blocked,
    reasonCodes,
    boundary: executorBoundary,
  }
}

function withMetadata(data: unknown, totalRecords?: number) {
  return {
    data,
    metadata: {
      source,
      totalRecords,
      boundary: executorBoundary,
      defaultExecutionMode: 'mock_execution',
      productionExecutionEnabled: false,
    },
  }
}

const GovernanceExecutorService = {
  listExecutors: async () => {
    const executors = await GovernanceExecutorRepository.list()
    return withMetadata(executors, executors.length)
  },

  getExecutor: async (executorId: string) =>
    withMetadata(await GovernanceExecutorRepository.findByExecutorId(executorId)),

  resolveDaoExecutor: async (daoId: string, proposalType?: string) =>
    withMetadata(resolveExecutor(await GovernanceExecutorRepository.findByDaoId(daoId), proposalType)),

  resolveTenantExecutor: async (tenantId: string, proposalType?: string) =>
    withMetadata(resolveExecutor(await GovernanceExecutorRepository.findByTenantId(tenantId), proposalType)),
}

export default GovernanceExecutorService
