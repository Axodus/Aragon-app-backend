import GovernanceExecutorService from '@services/governance-executor/governanceExecutorService'
import GovernanceExecutionReceiptService from '@services/governance-execution-receipt/governanceExecutionReceiptService'
import GovernanceProposalRepository from './governanceProposalRepository'

const source = 'governance proposal lifecycle registry'

function withMetadata(data: unknown, totalRecords?: number) {
  return {
    data,
    metadata: {
      source,
      totalRecords,
      repositoryMode: GovernanceProposalRepository.repositoryMode,
      safeImplementation: true,
      frontendAuthority: false,
      productionExecutionEnabled: false,
    },
  }
}

const GovernanceProposalService = {
  listProposals: async () => {
    const proposals = await GovernanceProposalRepository.listProposals()
    return withMetadata(proposals, proposals.length)
  },

  getProposal: async (proposalId: string) =>
    withMetadata(await GovernanceProposalRepository.getProposalById(proposalId)),

  listDaoProposals: async (daoId: string) => {
    const proposals = await GovernanceProposalRepository.listProposalsForDao(daoId)
    return withMetadata(proposals, proposals.length)
  },

  listTenantProposals: async (tenantId: string) => {
    const proposals = await GovernanceProposalRepository.listProposalsForTenant(tenantId)
    return withMetadata(proposals, proposals.length)
  },

  getProposalExecutor: async (proposalId: string) => {
    const proposal = await GovernanceProposalRepository.getProposalById(proposalId)
    if (!proposal?.executorRef) {
      return withMetadata(null)
    }

    return GovernanceExecutorService.getExecutor(proposal.executorRef)
  },

  getProposalExecutionReceipt: async (proposalId: string) =>
    GovernanceExecutionReceiptService.getExecutionReceiptForProposal(proposalId),
}

export default GovernanceProposalService
