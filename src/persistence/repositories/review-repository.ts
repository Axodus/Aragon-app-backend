import type { GovernanceListFilter } from '../types/pagination'
import type { RepositoryResult } from '../types/repository-result'
import type { GovernanceReviewRecord } from '../types/governance-persistence-records'

export interface ReviewRepository {
  recordReview: (input: GovernanceReviewRecord) => Promise<RepositoryResult<GovernanceReviewRecord>>
  getReviewById: (reviewId: string) => Promise<RepositoryResult<GovernanceReviewRecord>>
  listReviewsForProposal: (proposalId: string) => Promise<RepositoryResult<GovernanceReviewRecord[]>>
  listPendingReviews: (filter?: GovernanceListFilter) => Promise<RepositoryResult<GovernanceReviewRecord[]>>
}
