import type { GovernanceListFilter, PaginatedRepositoryList } from '../types/pagination'
import type { RepositoryResult } from '../types/repository-result'
import type { GovernanceExecutionIntentRecord } from '../types/governance-persistence-records'

export interface ExecutionIntentRepository {
  recordExecutionIntent: (
    input: GovernanceExecutionIntentRecord,
  ) => Promise<RepositoryResult<GovernanceExecutionIntentRecord>>
  getExecutionIntentById: (intentId: string) => Promise<RepositoryResult<GovernanceExecutionIntentRecord>>
  listExecutionIntents: (
    filter?: GovernanceListFilter,
  ) => Promise<RepositoryResult<PaginatedRepositoryList<GovernanceExecutionIntentRecord>>>
  markExecutionBlocked: (intentId: string, reason: string) => Promise<RepositoryResult<GovernanceExecutionIntentRecord>>
}
