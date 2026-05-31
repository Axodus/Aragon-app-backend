import type { GovernanceExecutorReason, GovernanceExecutorRef } from './types'

const executorBoundary =
  'Canonical Governance executor references are safe implementation records only. They do not hold private keys, do not move funds, do not prove on-chain execution and do not grant frontend or service-side sovereign authority.'

const executorReason = (
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

const lifecycle = {
  draft: 'Proposal exists as draft or review request only; no execution authority exists.',
  approved: 'Proposal passed governance approval but still requires executor and policy validation.',
  executable: 'Proposal may be routed to the configured mock executor boundary after runtime validation.',
  executed: 'Execution receipt is a mock/runtime receipt unless indexer and contract evidence prove otherwise.',
}

const governanceExecutors: GovernanceExecutorRef[] = [
  {
    governanceExecutorRef: 'governance-executor://tenant-axodus-root/mock-canonical-executor',
    executorId: 'mock-canonical-root-executor',
    executorType: 'canonical-governance-executor',
    executorStatus: 'mock_only',
    executorScope: 'federation',
    daoId: 'axodus-federal-governance',
    tenantId: 'tenant-axodus-root',
    chainId: 11155111,
    policyVersion: 'governance-executor-policy-v0.mock',
    supportedProposalTypes: ['constitutional-review', 'capability-change', 'treasury-policy-review'],
    executionMode: 'mock_execution',
    executionAuthority: 'Constitutional Governance mock executor boundary',
    isProductionExecutor: false,
    address: null,
    addressStatus: 'not_configured',
    proposalLifecycle: lifecycle,
    authorityBoundary: executorBoundary,
    requiresConstitutionalApproval: true,
    requiresLocalDaoApproval: false,
    emergencyDisabled: false,
    reasonCodes: [
      executorReason(
        'MOCK_EXECUTOR_ONLY',
        'warning',
        'canonical governance executor registry',
        'Executor is a mock-only canonical reference and cannot perform real execution.',
      ),
    ],
    createdAt: '2026-05-26T00:00:00.000Z',
    updatedAt: '2026-05-26T00:00:00.000Z',
  },
  {
    governanceExecutorRef: 'governance-executor://tenant-executive-dao/mock-tenant-executor',
    executorId: 'mock-tenant-executive-executor',
    executorType: 'tenant-governance-executor',
    executorStatus: 'mock_only',
    executorScope: 'tenant',
    daoId: 'dao-executive-001',
    tenantId: 'tenant-executive-dao',
    chainId: 11155111,
    policyVersion: 'governance-executor-policy-v0.mock',
    supportedProposalTypes: ['local-proposal', 'treasury-policy-review', 'capability-change', 'product-access'],
    executionMode: 'mock_execution',
    executionAuthority: 'Local DAO mock executor bounded by Constitutional Governance',
    isProductionExecutor: false,
    address: null,
    addressStatus: 'not_configured',
    proposalLifecycle: lifecycle,
    authorityBoundary: executorBoundary,
    requiresConstitutionalApproval: true,
    requiresLocalDaoApproval: true,
    emergencyDisabled: false,
    reasonCodes: [
      executorReason(
        'MOCK_EXECUTOR_ONLY',
        'warning',
        'canonical governance executor registry',
        'Tenant executor is a mock-only reference for safe implementation and integration testing.',
      ),
      executorReason(
        'TREASURY_POLICY_REQUIRES_REVIEW',
        'constitutional',
        'treasury policy',
        'Treasury-sensitive proposal types require constitutional and local DAO review before any future execution adapter can be used.',
      ),
    ],
    createdAt: '2026-05-26T00:00:00.000Z',
    updatedAt: '2026-05-26T00:00:00.000Z',
  },
  {
    governanceExecutorRef: 'governance-executor://tenant-community-dao/legacy-observer',
    executorId: 'blocked-legacy-community-observer',
    executorType: 'legacy-observer-executor',
    executorStatus: 'blocked',
    executorScope: 'legacy-spoke',
    daoId: 'dao-community-001',
    tenantId: 'tenant-community-dao',
    chainId: 1666600000,
    policyVersion: 'governance-executor-policy-v0.mock',
    supportedProposalTypes: ['legacy-voting-observation'],
    executionMode: 'documentation_only',
    executionAuthority: 'Legacy voting/spoke observer only',
    isProductionExecutor: false,
    address: null,
    addressStatus: 'blocked',
    proposalLifecycle: {
      ...lifecycle,
      executable: 'Legacy Harmony adapter is not executable inside Axodus Governance.',
      executed: 'No Axodus execution receipt can be produced from this legacy observer executor.',
    },
    authorityBoundary: executorBoundary,
    requiresConstitutionalApproval: true,
    requiresLocalDaoApproval: true,
    emergencyDisabled: true,
    reasonCodes: [
      executorReason(
        'EXECUTION_CHAIN_NOT_AUTHORIZED',
        'constitutional',
        'canonical governance executor registry',
        'Harmony is a legacy voting/spoke surface and is not an Axodus execution chain.',
      ),
      executorReason(
        'MOCK_EXECUTOR_ONLY',
        'warning',
        'canonical governance executor registry',
        'Legacy observer executor is documentation-only and cannot perform execution.',
      ),
    ],
    createdAt: '2026-05-26T00:00:00.000Z',
    updatedAt: '2026-05-26T00:00:00.000Z',
  },
]

export { executorBoundary, governanceExecutors }
