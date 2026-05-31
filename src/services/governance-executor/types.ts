type ExecutorStatus =
  | 'draft'
  | 'planned'
  | 'mock_only'
  | 'testnet_candidate'
  | 'active_testnet'
  | 'production_pending'
  | 'active_production'
  | 'deprecated'
  | 'disabled'
  | 'blocked'

type ExecutionMode =
  | 'documentation_only'
  | 'mock_execution'
  | 'testnet_simulation'
  | 'testnet_execution'
  | 'production_execution'

type AddressStatus = 'not_configured' | 'mock_only' | 'testnet_candidate' | 'testnet' | 'production' | 'blocked'

type ExecutorType = 'canonical-governance-executor' | 'tenant-governance-executor' | 'legacy-observer-executor'

type ExecutorScope = 'federation' | 'dao' | 'tenant' | 'legacy-spoke'

type ProposalLifecycleState = 'draft' | 'approved' | 'executable' | 'executed'

interface GovernanceExecutorReason {
  reasonCode: string
  reasonSeverity: 'info' | 'warning' | 'critical' | 'constitutional'
  source: string
  message: string
}

interface GovernanceExecutorRef {
  governanceExecutorRef: string
  executorId: string
  executorType: ExecutorType
  executorStatus: ExecutorStatus
  executorScope: ExecutorScope
  daoId: string
  tenantId: string
  chainId: number | null
  policyVersion: string
  supportedProposalTypes: string[]
  executionMode: ExecutionMode
  executionAuthority: string
  isProductionExecutor: boolean
  address: string | null
  addressStatus: AddressStatus
  proposalLifecycle: Record<ProposalLifecycleState, string>
  authorityBoundary: string
  requiresConstitutionalApproval: boolean
  requiresLocalDaoApproval: boolean
  emergencyDisabled: boolean
  reasonCodes: GovernanceExecutorReason[]
  createdAt: string
  updatedAt: string
}

interface ExecutorResolution {
  executor: GovernanceExecutorRef | null
  supported: boolean
  blocked: boolean
  reasonCodes: GovernanceExecutorReason[]
  boundary: string
}

export type {
  AddressStatus,
  ExecutionMode,
  ExecutorResolution,
  ExecutorScope,
  ExecutorStatus,
  ExecutorType,
  GovernanceExecutorReason,
  GovernanceExecutorRef,
  ProposalLifecycleState,
}
