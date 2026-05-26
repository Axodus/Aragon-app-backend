import { governanceProposals } from './mockGovernanceProposals'

const GovernanceProposalRepository = {
  repositoryMode: 'mock_audit_boundary',

  listProposals: async () => governanceProposals,

  getProposalById: async (proposalId: string) =>
    governanceProposals.find(
      proposal => proposal.proposalId === proposalId || proposal.governanceProposalRef === proposalId,
    ) ?? null,

  listProposalsForDao: async (daoId: string) => governanceProposals.filter(proposal => proposal.daoId === daoId),

  listProposalsForTenant: async (tenantId: string) =>
    governanceProposals.filter(proposal => proposal.tenantId === tenantId),
}

export default GovernanceProposalRepository
