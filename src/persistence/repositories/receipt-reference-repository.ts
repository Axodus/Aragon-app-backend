import type { GovernanceListFilter, PaginatedRepositoryList } from '../types/pagination'
import type { RepositoryResult } from '../types/repository-result'
import type { GovernanceReceiptReferenceRecord } from '../types/governance-persistence-records'

export interface ReceiptReferenceRepository {
  recordReceiptReference: (
    input: GovernanceReceiptReferenceRecord,
  ) => Promise<RepositoryResult<GovernanceReceiptReferenceRecord>>
  getReceiptReferenceById: (receiptId: string) => Promise<RepositoryResult<GovernanceReceiptReferenceRecord>>
  listReceiptReferences: (
    filter?: GovernanceListFilter,
  ) => Promise<RepositoryResult<PaginatedRepositoryList<GovernanceReceiptReferenceRecord>>>
  listReceiptsForEntity: (
    entityType: string,
    entityId: string,
  ) => Promise<RepositoryResult<GovernanceReceiptReferenceRecord[]>>
}
