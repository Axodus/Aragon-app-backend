import type { GovernanceListFilter, PaginatedRepositoryList } from '../types/pagination'
import type { RepositoryResult } from '../types/repository-result'
import type { GovernanceAuditRecord } from '../types/governance-persistence-records'

export interface AuditRepository {
  appendAuditRecord: (input: GovernanceAuditRecord) => Promise<RepositoryResult<GovernanceAuditRecord>>
  getAuditRecordById: (auditId: string) => Promise<RepositoryResult<GovernanceAuditRecord>>
  listAuditRecords: (
    filter?: GovernanceListFilter,
  ) => Promise<RepositoryResult<PaginatedRepositoryList<GovernanceAuditRecord>>>
  listAuditRecordsForEntity: (
    entityType: string,
    entityId: string,
  ) => Promise<RepositoryResult<GovernanceAuditRecord[]>>
}
