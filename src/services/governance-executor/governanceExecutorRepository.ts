import { governanceExecutors } from './mockGovernanceExecutors'

const GovernanceExecutorRepository = {
  list: async () => governanceExecutors,

  findByExecutorId: async (executorId: string) =>
    governanceExecutors.find(
      executor => executor.executorId === executorId || executor.governanceExecutorRef === executorId,
    ) ?? null,

  findByDaoId: async (daoId: string) => governanceExecutors.find(executor => executor.daoId === daoId) ?? null,

  findByTenantId: async (tenantId: string) =>
    governanceExecutors.find(executor => executor.tenantId === tenantId) ?? null,
}

export default GovernanceExecutorRepository
