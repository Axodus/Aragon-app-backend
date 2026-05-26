import { governanceExecutors } from './mockGovernanceExecutors'
import type { GovernanceExecutorRef } from './types'

interface GovernanceExecutorRepositoryAdapter {
  listExecutors: () => Promise<GovernanceExecutorRef[]>
  getExecutorById: (executorId: string) => Promise<GovernanceExecutorRef | null>
  getExecutorForDao: (daoId: string) => Promise<GovernanceExecutorRef | null>
  getExecutorForTenant: (tenantId: string) => Promise<GovernanceExecutorRef | null>
  getExecutorByProposalType: (
    proposalType: string,
    daoId?: string,
    tenantId?: string,
  ) => Promise<GovernanceExecutorRef | null>
  isExecutorBlocked: (executorId: string) => Promise<boolean>
  isProposalTypeSupported: (executorId: string, proposalType: string) => Promise<boolean>
}

const isBlocked = (executor: GovernanceExecutorRef | null) =>
  !executor ||
  executor.executorStatus === 'blocked' ||
  executor.executorStatus === 'disabled' ||
  executor.emergencyDisabled ||
  executor.executionMode === 'production_execution' ||
  executor.isProductionExecutor

const GovernanceExecutorRepository = {
  repositoryMode: 'mock_audit_boundary',

  listExecutors: async () => governanceExecutors,

  getExecutorById: async (executorId: string) =>
    governanceExecutors.find(
      executor => executor.executorId === executorId || executor.governanceExecutorRef === executorId,
    ) ?? null,

  getExecutorForDao: async (daoId: string) => governanceExecutors.find(executor => executor.daoId === daoId) ?? null,

  getExecutorForTenant: async (tenantId: string) =>
    governanceExecutors.find(executor => executor.tenantId === tenantId) ?? null,

  getExecutorByProposalType: async (proposalType: string, daoId?: string, tenantId?: string) =>
    governanceExecutors.find(executor => {
      const scopeMatches = (!daoId || executor.daoId === daoId) && (!tenantId || executor.tenantId === tenantId)
      return scopeMatches && executor.supportedProposalTypes.includes(proposalType)
    }) ?? null,

  isExecutorBlocked: async (executorId: string) =>
    isBlocked(await GovernanceExecutorRepository.getExecutorById(executorId)),

  isProposalTypeSupported: async (executorId: string, proposalType: string) =>
    Boolean(
      (await GovernanceExecutorRepository.getExecutorById(executorId))?.supportedProposalTypes.includes(proposalType),
    ),

  list: async () => GovernanceExecutorRepository.listExecutors(),

  findByExecutorId: async (executorId: string) => GovernanceExecutorRepository.getExecutorById(executorId),

  findByDaoId: async (daoId: string) => GovernanceExecutorRepository.getExecutorForDao(daoId),

  findByTenantId: async (tenantId: string) => GovernanceExecutorRepository.getExecutorForTenant(tenantId),
} satisfies GovernanceExecutorRepositoryAdapter & {
  repositoryMode: 'mock_audit_boundary'
  list: () => Promise<GovernanceExecutorRef[]>
  findByExecutorId: (executorId: string) => Promise<GovernanceExecutorRef | null>
  findByDaoId: (daoId: string) => Promise<GovernanceExecutorRef | null>
  findByTenantId: (tenantId: string) => Promise<GovernanceExecutorRef | null>
}

export default GovernanceExecutorRepository
