import GovernanceExecutionReceiptRepository from './governanceExecutionReceiptRepository'

const source = 'governance execution receipt registry'

function withMetadata(data: unknown, totalRecords?: number) {
  return {
    data,
    metadata: {
      source,
      totalRecords,
      repositoryMode: GovernanceExecutionReceiptRepository.repositoryMode,
      safeImplementation: true,
      defaultReceiptStatus: 'mock',
      defaultReceiptSource: 'mock_service',
      productionProofEnabled: false,
      fakeTransactionHashesAllowed: false,
    },
  }
}

const GovernanceExecutionReceiptService = {
  listExecutionReceipts: async () => {
    const receipts = await GovernanceExecutionReceiptRepository.listExecutionReceipts()
    return withMetadata(receipts, receipts.length)
  },

  getExecutionReceipt: async (executionReceiptId: string) =>
    withMetadata(await GovernanceExecutionReceiptRepository.getExecutionReceiptById(executionReceiptId)),

  getExecutionReceiptForProposal: async (proposalId: string) =>
    withMetadata(await GovernanceExecutionReceiptRepository.getExecutionReceiptForProposal(proposalId)),

  listTenantExecutionReceipts: async (tenantId: string) => {
    const receipts = await GovernanceExecutionReceiptRepository.listExecutionReceiptsForTenant(tenantId)
    return withMetadata(receipts, receipts.length)
  },

  listDaoExecutionReceipts: async (daoId: string) => {
    const receipts = await GovernanceExecutionReceiptRepository.listExecutionReceiptsForDao(daoId)
    return withMetadata(receipts, receipts.length)
  },
}

export default GovernanceExecutionReceiptService
