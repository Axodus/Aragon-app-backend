import type { GovernanceListFilter, PaginatedRepositoryList } from '../types/pagination'
import type { RepositoryResult } from '../types/repository-result'
import type { GovernanceProposalEventRecord, GovernanceProposalRecord } from '../types/governance-persistence-records'

export interface ProposalRepository {
  createProposal: (input: GovernanceProposalRecord) => Promise<RepositoryResult<GovernanceProposalRecord>>
  getProposalById: (proposalId: string) => Promise<RepositoryResult<GovernanceProposalRecord>>
  listProposals: (
    filter?: GovernanceListFilter,
  ) => Promise<RepositoryResult<PaginatedRepositoryList<GovernanceProposalRecord>>>
  updateProposalStatus: (
    proposalId: string,
    statusChange: { status: string; actorId: string; reason?: string; requestId?: string; correlationId?: string },
  ) => Promise<RepositoryResult<GovernanceProposalRecord>>
  appendProposalEvent: (
    proposalId: string,
    event: GovernanceProposalEventRecord,
  ) => Promise<RepositoryResult<GovernanceProposalEventRecord>>
  getProposalTimeline: (proposalId: string) => Promise<RepositoryResult<GovernanceProposalEventRecord[]>>
}
