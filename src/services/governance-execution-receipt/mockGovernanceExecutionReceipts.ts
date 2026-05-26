import type { GovernanceExecutorReason } from '@services/governance-executor/types'
import type { GovernanceExecutionReceipt } from './types'

const reason = (
  reasonCode: string,
  reasonSeverity: GovernanceExecutorReason['reasonSeverity'],
  source: string,
  message: string,
): GovernanceExecutorReason => ({
  reasonCode,
  reasonSeverity,
  source,
  message,
})

const createdAt = '2026-05-26T00:00:00.000Z'

const governanceExecutionReceipts: GovernanceExecutionReceipt[] = [
  {
    executionReceiptId: 'receipt-mock-executable-001',
    governanceExecutionRef: 'governance-execution://tenant-executive-dao/proposal-mock-executable-001/mock-receipt',
    governanceProposalRef: 'governance-proposal://tenant-executive-dao/proposal-mock-executable-001',
    proposalId: 'proposal-mock-executable-001',
    daoId: 'dao-executive-001',
    tenantId: 'tenant-executive-dao',
    executorRef: 'governance-executor://tenant-executive-dao/mock-tenant-executor',
    proposalType: 'capability-change',
    executionMode: 'mock_execution',
    executionStatus: 'mock_executed',
    executionTxHash: null,
    executionBlockNumber: null,
    chainId: 11155111,
    policyVersion: 'governance-executor-policy-v0.mock',
    constitutionalReference: 'axodus-constitution://v0.mock',
    receiptStatus: 'mock',
    receiptSource: 'mock_service',
    reasonCodes: [
      reason(
        'MOCK_EXECUTION_MODE_ACTIVE',
        'warning',
        'governance execution receipt registry',
        'Receipt is a mock proof reference only. It is not an on-chain transaction proof.',
      ),
    ],
    createdAt,
    executedAt: createdAt,
    indexedAt: null,
  },
  {
    executionReceiptId: 'receipt-queued-mock-ready-001',
    governanceExecutionRef: 'governance-execution://tenant-executive-dao/proposal-tenant-queued-001/mock-ready',
    governanceProposalRef: 'governance-proposal://tenant-executive-dao/proposal-tenant-queued-001',
    proposalId: 'proposal-tenant-queued-001',
    daoId: 'dao-executive-001',
    tenantId: 'tenant-executive-dao',
    executorRef: 'governance-executor://tenant-executive-dao/mock-tenant-executor',
    proposalType: 'local-proposal',
    executionMode: 'mock_execution',
    executionStatus: 'mock_ready',
    executionTxHash: null,
    executionBlockNumber: null,
    chainId: 11155111,
    policyVersion: 'governance-executor-policy-v0.mock',
    constitutionalReference: 'axodus-constitution://v0.mock',
    receiptStatus: 'draft',
    receiptSource: 'mock_service',
    reasonCodes: [
      reason(
        'MOCK_RECEIPT_PENDING',
        'info',
        'governance execution receipt registry',
        'Proposal is queued and can only create a mock receipt after executable validation.',
      ),
    ],
    createdAt,
    executedAt: null,
    indexedAt: null,
  },
  {
    executionReceiptId: 'receipt-harmony-observer-blocked-001',
    governanceExecutionRef: 'governance-execution://tenant-community-dao/proposal-harmony-observer-001/blocked',
    governanceProposalRef: 'governance-proposal://tenant-community-dao/proposal-harmony-observer-001',
    proposalId: 'proposal-harmony-observer-001',
    daoId: 'dao-community-001',
    tenantId: 'tenant-community-dao',
    executorRef: 'governance-executor://tenant-community-dao/legacy-observer',
    proposalType: 'legacy-voting-observation',
    executionMode: 'documentation_only',
    executionStatus: 'blocked',
    executionTxHash: null,
    executionBlockNumber: null,
    chainId: 1666600000,
    policyVersion: 'governance-executor-policy-v0.mock',
    constitutionalReference: 'axodus-constitution://v0.mock',
    receiptStatus: 'invalid',
    receiptSource: 'mock_service',
    reasonCodes: [
      reason(
        'EXECUTION_CHAIN_NOT_AUTHORIZED',
        'constitutional',
        'governance execution receipt registry',
        'Legacy Harmony observer cannot produce Axodus execution proof.',
      ),
    ],
    createdAt,
    executedAt: null,
    indexedAt: null,
  },
]

export { governanceExecutionReceipts }
