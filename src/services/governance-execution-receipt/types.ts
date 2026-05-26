import type { ExecutionMode, GovernanceExecutorReason } from '@services/governance-executor/types'

type ExecutionStatus =
  | 'not_requested'
  | 'mock_ready'
  | 'mock_executed'
  | 'testnet_pending'
  | 'testnet_executed'
  | 'production_pending'
  | 'production_executed'
  | 'blocked'
  | 'failed'
  | 'cancelled'

type ReceiptStatus = 'draft' | 'mock' | 'pending_index' | 'indexed' | 'verified' | 'rejected' | 'invalid'

type ReceiptSource = 'mock_service' | 'governance_api' | 'indexer' | 'contract_event' | 'manual_review'

interface GovernanceExecutionReceipt {
  executionReceiptId: string
  governanceExecutionRef: string
  governanceProposalRef: string
  proposalId: string
  daoId: string
  tenantId: string
  executorRef: string
  proposalType: string
  executionMode: ExecutionMode
  executionStatus: ExecutionStatus
  executionTxHash: string | null
  executionBlockNumber: number | null
  chainId: number | null
  policyVersion: string
  constitutionalReference: string
  receiptStatus: ReceiptStatus
  receiptSource: ReceiptSource
  reasonCodes: GovernanceExecutorReason[]
  createdAt: string
  executedAt: string | null
  indexedAt: string | null
}

export type { ExecutionStatus, GovernanceExecutionReceipt, ReceiptSource, ReceiptStatus }
