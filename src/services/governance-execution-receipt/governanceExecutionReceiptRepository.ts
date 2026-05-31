import { governanceExecutionReceipts } from './mockGovernanceExecutionReceipts'

const GovernanceExecutionReceiptRepository = {
  repositoryMode: 'mock_audit_boundary',

  listExecutionReceipts: async () => governanceExecutionReceipts,

  getExecutionReceiptById: async (executionReceiptId: string) =>
    governanceExecutionReceipts.find(
      receipt =>
        receipt.executionReceiptId === executionReceiptId || receipt.governanceExecutionRef === executionReceiptId,
    ) ?? null,

  getExecutionReceiptForProposal: async (proposalId: string) =>
    governanceExecutionReceipts.find(
      receipt => receipt.proposalId === proposalId || receipt.governanceProposalRef === proposalId,
    ) ?? null,

  listExecutionReceiptsForTenant: async (tenantId: string) =>
    governanceExecutionReceipts.filter(receipt => receipt.tenantId === tenantId),

  listExecutionReceiptsForDao: async (daoId: string) =>
    governanceExecutionReceipts.filter(receipt => receipt.daoId === daoId),
}

export default GovernanceExecutionReceiptRepository
