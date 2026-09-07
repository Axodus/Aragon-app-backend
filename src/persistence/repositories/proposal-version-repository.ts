import type { RepositoryResult } from '../types/repository-result'
import type { GovernanceProposalVersionRecord } from '../types/governance-persistence-records'

export interface ProposalVersionRepository {
  createProposalVersion: (
    input: GovernanceProposalVersionRecord,
  ) => Promise<RepositoryResult<GovernanceProposalVersionRecord>>
  getProposalVersion: (
    proposalId: string,
    version: number,
  ) => Promise<RepositoryResult<GovernanceProposalVersionRecord>>
  listProposalVersions: (proposalId: string) => Promise<RepositoryResult<GovernanceProposalVersionRecord[]>>
  getLatestProposalVersion: (proposalId: string) => Promise<RepositoryResult<GovernanceProposalVersionRecord>>
}
