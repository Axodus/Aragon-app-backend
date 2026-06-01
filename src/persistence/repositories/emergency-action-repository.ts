import type { GovernanceListFilter, PaginatedRepositoryList } from '../types/pagination'
import type { RepositoryResult } from '../types/repository-result'
import type {
  GovernanceEmergencyActionRecord,
  GovernanceEmergencyRatificationRecord,
} from '../types/governance-persistence-records'

export interface EmergencyActionRepository {
  recordEmergencyAction: (
    input: GovernanceEmergencyActionRecord,
  ) => Promise<RepositoryResult<GovernanceEmergencyActionRecord>>
  getEmergencyActionById: (actionId: string) => Promise<RepositoryResult<GovernanceEmergencyActionRecord>>
  listEmergencyActions: (
    filter?: GovernanceListFilter,
  ) => Promise<RepositoryResult<PaginatedRepositoryList<GovernanceEmergencyActionRecord>>>
  recordRatification: (
    actionId: string,
    ratification: GovernanceEmergencyRatificationRecord,
  ) => Promise<RepositoryResult<GovernanceEmergencyActionRecord>>
}
