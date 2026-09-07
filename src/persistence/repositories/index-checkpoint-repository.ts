import type { GovernanceListFilter, PaginatedRepositoryList } from '../types/pagination'
import type { RepositoryResult } from '../types/repository-result'
import type { GovernanceIndexCheckpointRecord } from '../types/governance-persistence-records'

export interface IndexCheckpointRepository {
  createCheckpoint: (
    input: GovernanceIndexCheckpointRecord,
  ) => Promise<RepositoryResult<GovernanceIndexCheckpointRecord>>
  getLatestCheckpoint: (indexName: string) => Promise<RepositoryResult<GovernanceIndexCheckpointRecord>>
  listCheckpoints: (
    filter?: GovernanceListFilter,
  ) => Promise<RepositoryResult<PaginatedRepositoryList<GovernanceIndexCheckpointRecord>>>
}
