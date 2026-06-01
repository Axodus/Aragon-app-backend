import type { RepositoryResult } from '../types/repository-result'
import type { GovernanceVoteRecord } from '../types/governance-persistence-records'

export interface VoteRepository {
  recordVote: (input: GovernanceVoteRecord) => Promise<RepositoryResult<GovernanceVoteRecord>>
  getVoteById: (voteId: string) => Promise<RepositoryResult<GovernanceVoteRecord>>
  listVotesForProposal: (proposalId: string) => Promise<RepositoryResult<GovernanceVoteRecord[]>>
  listVotesByActor: (actorId: string) => Promise<RepositoryResult<GovernanceVoteRecord[]>>
}
