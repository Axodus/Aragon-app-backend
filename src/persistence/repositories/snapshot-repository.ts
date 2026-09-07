import type { GovernanceListFilter, PaginatedRepositoryList } from '../types/pagination'
import type { RepositoryResult } from '../types/repository-result'
import type { GovernanceSnapshotRecord } from '../types/governance-persistence-records'

export interface SnapshotRepository {
  createSnapshot: (input: GovernanceSnapshotRecord) => Promise<RepositoryResult<GovernanceSnapshotRecord>>
  getSnapshotById: (snapshotId: string) => Promise<RepositoryResult<GovernanceSnapshotRecord>>
  getLatestSnapshot: (scope: string) => Promise<RepositoryResult<GovernanceSnapshotRecord>>
  listSnapshots: (
    filter?: GovernanceListFilter,
  ) => Promise<RepositoryResult<PaginatedRepositoryList<GovernanceSnapshotRecord>>>
}
