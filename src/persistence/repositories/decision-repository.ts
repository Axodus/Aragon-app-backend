import type { GovernanceListFilter, PaginatedRepositoryList } from '../types/pagination'
import type { RepositoryResult } from '../types/repository-result'
import type { GovernanceDecisionRecord } from '../types/governance-persistence-records'

export interface DecisionRepository {
  recordDecision: (input: GovernanceDecisionRecord) => Promise<RepositoryResult<GovernanceDecisionRecord>>
  getDecisionById: (decisionId: string) => Promise<RepositoryResult<GovernanceDecisionRecord>>
  listDecisions: (
    filter?: GovernanceListFilter,
  ) => Promise<RepositoryResult<PaginatedRepositoryList<GovernanceDecisionRecord>>>
  listDecisionsForProposal: (proposalId: string) => Promise<RepositoryResult<GovernanceDecisionRecord[]>>
}
