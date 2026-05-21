import GovernanceConstitutionalController from '@api/controllers/governanceConstitutional'
import GovernanceTenantController from '@api/controllers/governanceTenant'

type GovernanceStanding = 'compliant' | 'restricted' | 'sanctioned' | 'suspended' | 'under-review'
type ReasonSeverity = 'info' | 'warning' | 'critical' | 'constitutional'
type RestrictionState = 'allowed' | 'limited' | 'denied' | 'disabled' | 'review-required'

type RuntimeReason = {
  reasonCode: string
  reasonSeverity: ReasonSeverity
  source: string
  message: string
  timestamp: string
}

type RuntimeValidationInput = {
  tenantId: string
  capability: string
  operation?: string
  action?: string
  source?: string
  resource?: string
  requestedBy?: string
  metadata?: Record<string, unknown>
}

type ProposalLifecycleState = 'approved' | 'rejected' | 'executed'

type ProposalEffectInput = {
  proposalId: string
  tenantId: string
  lifecycleState: ProposalLifecycleState
  source?: string
  executedBy?: string
  capabilitiesGranted?: string[]
  capabilitiesRevoked?: string[]
  restrictions?: Record<string, RestrictionState>
  treasuryPolicy?: Partial<TreasuryPolicy>
  constitutionalStanding?: GovernanceStanding
  governanceStatus?: GovernanceStanding
  federationTier?: string
  metadata?: Record<string, unknown>
}

type TreasuryPolicy = {
  tenantId: string
  status: 'active' | 'review-required' | 'restricted' | 'frozen' | 'not-configured'
  withdrawLimitUsd: number
  allocationLimitUsd: number
  crossChainLimitUsd: number
  maxStrategyExposurePercent: number
  allowedStrategies: string[]
  blockedStrategies: string[]
  allowedChains: number[]
  riskControls: {
    highRiskBlocked: boolean
    requiresMultisigAboveUsd: number
    requiresConstitutionalReviewAboveUsd: number
  }
  updatedAt: string
  source: string
}

type TreasuryOperationInput = {
  tenantId: string
  operation: 'withdraw' | 'allocate' | 'cross-chain-transfer' | 'strategy-exposure'
  amountUsd?: number
  strategy?: string
  chainId?: number
  destinationChainId?: number
  riskLevel?: 'low' | 'moderate' | 'high' | 'critical'
  requestedBy?: string
  source?: string
  metadata?: Record<string, unknown>
}

type EmergencyDirective = {
  id: string
  type: 'TRADING_HALT' | 'TREASURY_FREEZE' | 'TENANT_QUARANTINE' | 'CAPABILITY_REVOKED' | 'AGENT_EXECUTION_DISABLED'
  status: 'active' | 'monitoring' | 'resolved'
  scope: 'federation' | 'tenant' | 'capability'
  tenantId?: string
  capability?: string
  reasonCode: string
  reasonSeverity: ReasonSeverity
  source: string
  message: string
  issuedAt: string
}

type RuntimeTelemetry = {
  validationRequests: number
  deniedOperations: number
  reviewRequiredOperations: number
  restrictionTriggers: Record<string, number>
  constitutionalViolations: Record<string, number>
  emergencyDirectives: number
  lastValidationAt: string | null
}

const runtimeBoundary =
  'Governance runtime validation is the backend authority surface for machine-consumable capability checks. Final on-chain execution still requires contract, indexer and execution-adapter confirmation.'

const policyBoundary =
  'Governance policy responses are machine-readable authority snapshots for ACS and product nuclei. Runtime state is authoritative for backend validation, while long-term persistence must be backed by registries, contracts, indexers and audit storage.'

const capabilityAliases: Record<string, string> = {
  'proposal.create': 'tenant-local-proposal-management',
  createProposal: 'tenant-local-proposal-management',
  'proposal.execute': 'constitutional-proposal-review',
  executeProposal: 'constitutional-proposal-review',
  'treasury.withdraw': 'treasury-policy-execution',
  treasuryWithdraw: 'treasury-policy-execution',
  'legacy.voting.observe': 'legacy-spoke-voting-observation',
  legacyVotingObservation: 'legacy-spoke-voting-observation',
  trading: 'trading.execution',
  'trading.execute': 'trading.execution',
  'marketplace.publish': 'marketplace.publishing',
  marketplacePublishing: 'marketplace.publishing',
  'agent.execute': 'ai-agent.execution',
  aiAgentExecution: 'ai-agent.execution',
}

const emergencyDirectives: EmergencyDirective[] = [
  {
    id: 'directive-tenant-community-quarantine',
    type: 'TENANT_QUARANTINE',
    status: 'active',
    scope: 'tenant',
    tenantId: 'tenant-community-dao',
    reasonCode: 'EXECUTION_CHAIN_NOT_AUTHORIZED',
    reasonSeverity: 'constitutional',
    source: 'Constitutional Governance',
    message: 'Legacy Harmony tenant context is quarantined from Axodus execution authority.',
    issuedAt: '2026-05-20T00:00:00.000Z',
  },
  {
    id: 'directive-community-agent-disabled',
    type: 'AGENT_EXECUTION_DISABLED',
    status: 'active',
    scope: 'tenant',
    tenantId: 'tenant-community-dao',
    reasonCode: 'AGENT_PERMISSION_SCOPE_EXCEEDED',
    reasonSeverity: 'constitutional',
    source: 'Constitutional Governance',
    message: 'AI agent execution is disabled for observer/legacy tenant contexts.',
    issuedAt: '2026-05-20T00:00:00.000Z',
  },
  {
    id: 'directive-treasury-policy-freeze-monitor',
    type: 'TREASURY_FREEZE',
    status: 'monitoring',
    scope: 'capability',
    capability: 'treasury-policy-execution',
    reasonCode: 'TREASURY_POLICY_REQUIRES_REVIEW',
    reasonSeverity: 'constitutional',
    source: 'treasury policy',
    message: 'Treasury freeze directive is available for ACS enforcement when policy review escalates.',
    issuedAt: '2026-05-20T00:00:00.000Z',
  },
  {
    id: 'directive-trading-halt-monitor',
    type: 'TRADING_HALT',
    status: 'monitoring',
    scope: 'federation',
    reasonCode: 'REMOTE_EXECUTION_GUARDRAIL_ACTIVE',
    reasonSeverity: 'warning',
    source: 'Constitutional Governance',
    message: 'Federation trading halt directive is queryable by ACS but not currently active.',
    issuedAt: '2026-05-20T00:00:00.000Z',
  },
]

const telemetry: RuntimeTelemetry = {
  validationRequests: 0,
  deniedOperations: 0,
  reviewRequiredOperations: 0,
  restrictionTriggers: {},
  constitutionalViolations: {},
  emergencyDirectives: emergencyDirectives.filter(directive => directive.status === 'active').length,
  lastValidationAt: null,
}

const validationDecisions: any[] = []
const policySnapshots = new Map<string, any[]>()
const tenantCapabilityGrants = new Map<string, Set<string>>()
const tenantCapabilityRevocations = new Map<string, Set<string>>()
const tenantRestrictionMutations = new Map<string, Record<string, RestrictionState>>()
const tenantConstitutionalMutations = new Map<
  string,
  {
    constitutionalStanding?: GovernanceStanding
    governanceStatus?: GovernanceStanding
    federationTier?: string
  }
>()
const proposalEffectReceipts = new Map<string, any[]>()
const tenantOperationalHistory = new Map<string, any[]>()
const tenantTreasuryPolicies = new Map<string, TreasuryPolicy>()
const treasuryReceipts = new Map<string, any[]>()

const standingReasonCode: Record<GovernanceStanding, string> = {
  compliant: 'GOVERNANCE_RUNTIME_ALLOWED',
  restricted: 'TENANT_OPERATION_RESTRICTED',
  sanctioned: 'TENANT_CONSTITUTIONALLY_SANCTIONED',
  suspended: 'TENANT_CONSTITUTIONALLY_SUSPENDED',
  'under-review': 'TENANT_CONSTITUTIONAL_STANDING_UNDER_REVIEW',
}

const defaultRestrictions: Record<string, RestrictionState> = {
  proposalCreation: 'allowed',
  proposalExecution: 'allowed',
  trading: 'allowed',
  treasuryWithdraw: 'review-required',
  marketplacePublishing: 'allowed',
  aiAgentExecution: 'limited',
}

const standingRestrictions: Record<GovernanceStanding, Record<string, RestrictionState>> = {
  compliant: defaultRestrictions,
  'under-review': {
    proposalCreation: 'limited',
    proposalExecution: 'review-required',
    trading: 'limited',
    treasuryWithdraw: 'review-required',
    marketplacePublishing: 'limited',
    aiAgentExecution: 'disabled',
  },
  restricted: {
    proposalCreation: 'limited',
    proposalExecution: 'review-required',
    trading: 'limited',
    treasuryWithdraw: 'denied',
    marketplacePublishing: 'denied',
    aiAgentExecution: 'disabled',
  },
  sanctioned: {
    proposalCreation: 'denied',
    proposalExecution: 'denied',
    trading: 'denied',
    treasuryWithdraw: 'denied',
    marketplacePublishing: 'denied',
    aiAgentExecution: 'disabled',
  },
  suspended: {
    proposalCreation: 'disabled',
    proposalExecution: 'disabled',
    trading: 'disabled',
    treasuryWithdraw: 'disabled',
    marketplacePublishing: 'disabled',
    aiAgentExecution: 'disabled',
  },
}

function runtimeReason(
  reasonCode: string,
  reasonSeverity: ReasonSeverity,
  source: string,
  message: string,
): RuntimeReason {
  return {
    reasonCode,
    reasonSeverity,
    source,
    message,
    timestamp: new Date().toISOString(),
  }
}

function normalizeCapability(capability: string) {
  return capabilityAliases[capability] ?? capability
}

function normalizeStanding(value: unknown): GovernanceStanding {
  if (value === 'restricted' || value === 'sanctioned' || value === 'suspended' || value === 'under-review') {
    return value
  }

  return 'compliant'
}

function restrictionKeyForCapability(capabilityId: string) {
  if (capabilityId === 'tenant-local-proposal-management') return 'proposalCreation'
  if (capabilityId === 'constitutional-proposal-review') return 'proposalExecution'
  if (capabilityId === 'treasury-policy-execution') return 'treasuryWithdraw'
  if (capabilityId === 'legacy-spoke-voting-observation') return 'proposalExecution'
  if (capabilityId.toLowerCase().includes('marketplace')) return 'marketplacePublishing'
  if (capabilityId.toLowerCase().includes('trading')) return 'trading'
  if (capabilityId.toLowerCase().includes('agent')) return 'aiAgentExecution'
  return 'proposalExecution'
}

function isBlockingRestriction(restriction: RestrictionState) {
  return restriction === 'denied' || restriction === 'disabled'
}

function isBlockingCapabilityStatus(status?: string) {
  return status === 'restricted' || status === 'disabled' || status === 'suspended'
}

function isBlockingStanding(standing: GovernanceStanding) {
  return standing === 'suspended' || standing === 'sanctioned'
}

function standingMessage(standing: GovernanceStanding) {
  if (standing === 'suspended') return 'Tenant constitutional standing is suspended; runtime operations are disabled.'
  if (standing === 'sanctioned') return 'Tenant is constitutionally sanctioned; runtime operations are denied.'
  if (standing === 'restricted')
    return 'Tenant is constitutionally restricted; sensitive runtime operations are blocked.'
  if (standing === 'under-review')
    return 'Tenant constitutional standing is under review; runtime operations are limited.'
  return 'Tenant constitutional standing permits runtime validation.'
}

function buildTenantRestrictions(tenant: any) {
  const standing = normalizeStanding(tenant?.constitutionalStanding ?? tenant?.governanceStatus)
  const restrictions = { ...standingRestrictions[standing] }
  const reasonCodes = Array.isArray(tenant?.reasonCodes) ? tenant.reasonCodes : []
  const productsEnabled = new Set((tenant?.productsEnabled ?? []).map((product: string) => product.toLowerCase()))
  const treasuryPolicyStatus = tenant?.treasury?.policyStatus

  if (!productsEnabled.has('treasury')) {
    restrictions.treasuryWithdraw = 'denied'
  } else if (treasuryPolicyStatus === 'review-required') {
    restrictions.treasuryWithdraw = 'review-required'
  } else if (treasuryPolicyStatus === 'restricted') {
    restrictions.treasuryWithdraw = 'denied'
  }

  if (reasonCodes.some((reason: any) => reason.reasonCode === 'EXECUTION_CHAIN_NOT_AUTHORIZED')) {
    restrictions.proposalExecution = 'denied'
    restrictions.trading = 'denied'
    restrictions.treasuryWithdraw = 'denied'
  }

  if (!productsEnabled.has('acs')) {
    restrictions.aiAgentExecution = standing === 'compliant' ? 'limited' : restrictions.aiAgentExecution
  }

  Object.entries(tenantRestrictionMutations.get(tenant?.id) ?? {}).forEach(([key, value]) => {
    restrictions[key] = value
  })

  getActiveDirectivesForTenant(tenant?.id).forEach(directive => {
    if (directive.type === 'TENANT_QUARANTINE') {
      restrictions.proposalCreation = 'denied'
      restrictions.proposalExecution = 'denied'
      restrictions.trading = 'denied'
      restrictions.treasuryWithdraw = 'denied'
      restrictions.marketplacePublishing = 'denied'
      restrictions.aiAgentExecution = 'disabled'
    }

    if (directive.type === 'TREASURY_FREEZE') {
      restrictions.treasuryWithdraw = 'disabled'
    }

    if (directive.type === 'TRADING_HALT') {
      restrictions.trading = 'disabled'
    }

    if (directive.type === 'AGENT_EXECUTION_DISABLED') {
      restrictions.aiAgentExecution = 'disabled'
    }

    if (directive.type === 'CAPABILITY_REVOKED' && directive.capability) {
      restrictions[restrictionKeyForCapability(normalizeCapability(directive.capability))] = 'disabled'
    }
  })

  return restrictions
}

function getActiveDirectivesForTenant(tenantId?: string) {
  return emergencyDirectives.filter(
    directive =>
      directive.status === 'active' &&
      (directive.scope === 'federation' || directive.tenantId === tenantId || directive.scope === 'capability'),
  )
}

function recordTelemetry(decision: any) {
  telemetry.validationRequests += 1
  telemetry.lastValidationAt = decision.timestamp

  if (!decision.allowed) {
    telemetry.deniedOperations += 1
  }

  if (decision.decision === 'review-required') {
    telemetry.reviewRequiredOperations += 1
  }

  if (decision.restrictionKey) {
    telemetry.restrictionTriggers[decision.restrictionKey] =
      (telemetry.restrictionTriggers[decision.restrictionKey] ?? 0) + 1
  }

  if (decision.reasonSeverity === 'constitutional') {
    telemetry.constitutionalViolations[decision.reasonCode] =
      (telemetry.constitutionalViolations[decision.reasonCode] ?? 0) + 1
  }
}

function recordDecision(decision: any) {
  const event = {
    id: `governance-decision-${validationDecisions.length + 1}`,
    type: decision.allowed ? 'capability.validation.allowed' : 'capability.validation.denied',
    tenantId: decision.resolvedTenantId ?? decision.tenantId,
    capability: decision.normalizedCapability,
    operation: decision.operation ?? decision.action ?? null,
    requestedBy: decision.requestedBy ?? null,
    allowed: decision.allowed,
    reasonCode: decision.reasonCode,
    reasonSeverity: decision.reasonSeverity,
    operationalConsequence: decision.allowed
      ? decision.decision === 'review-required'
        ? 'CAPABILITY_REQUIRES_REVIEW'
        : 'CAPABILITY_GRANTED'
      : 'OPERATION_BLOCKED',
    emittedAt: decision.timestamp,
  }

  validationDecisions.unshift(event)
  validationDecisions.splice(100)
  return event
}

function createPolicySnapshot(tenantRuntime: any, source = 'governance policy runtime') {
  const snapshot = {
    id: `policy-snapshot-${tenantRuntime.tenant.id}-${Date.now()}`,
    version: `runtime-${Date.now()}`,
    tenantId: tenantRuntime.tenant.id,
    daoId: tenantRuntime.tenant.daoId,
    constitutionalStanding: tenantRuntime.standing,
    governanceStatus: tenantRuntime.tenant.governanceStatus,
    federationTier: tenantRuntime.tenant.federationTier,
    effectiveRestrictions: tenantRuntime.restrictions,
    treasuryPolicy: getTreasuryPolicyForTenant(tenantRuntime.tenant),
    treasuryRiskMetadata: treasuryRiskMetadata(
      getTreasuryPolicyForTenant(tenantRuntime.tenant),
      tenantRuntime.restrictions,
    ),
    grantedCapabilities: getTenantGrantedCapabilities(tenantRuntime.tenant.id),
    revokedCapabilities: getTenantRevokedCapabilities(tenantRuntime.tenant.id),
    activeDirectives: getActiveDirectivesForTenant(tenantRuntime.tenant.id),
    source,
    createdAt: new Date().toISOString(),
    boundary: policyBoundary,
  }
  const snapshots = policySnapshots.get(tenantRuntime.tenant.id) ?? []

  snapshots.unshift(snapshot)
  snapshots.splice(20)
  policySnapshots.set(tenantRuntime.tenant.id, snapshots)

  return snapshot
}

function capabilityRecordForGrantedCapability(capabilityId: string) {
  return {
    id: capabilityId,
    category: 'runtime-granted',
    scope: restrictionKeyForCapability(capabilityId),
    executionLevel: 'runtime-authorized',
    governanceRequirement: 'proposal effect mutation',
    riskLevel: 'runtime',
    status: 'active',
    authorityLayer: 'Governance Proposal Effect Engine',
    supportedPluginTypes: ['runtime-policy'],
    reasonCodes: [],
  }
}

function getTenantGrantedCapabilities(tenantId: string) {
  return Array.from(tenantCapabilityGrants.get(tenantId) ?? [])
}

function getTenantRevokedCapabilities(tenantId: string) {
  return Array.from(tenantCapabilityRevocations.get(tenantId) ?? [])
}

function isCapabilityGranted(tenantId: string, capability: string) {
  return tenantCapabilityGrants.get(tenantId)?.has(capability) ?? false
}

function isCapabilityRevoked(tenantId: string, capability: string) {
  return tenantCapabilityRevocations.get(tenantId)?.has(capability) ?? false
}

function defaultTreasuryPolicy(tenant: any): TreasuryPolicy {
  const treasuryStatus = tenant?.treasury?.policyStatus ?? 'not-configured'
  const hasTreasury = (tenant?.productsEnabled ?? []).some((product: string) => product.toLowerCase() === 'treasury')

  return {
    tenantId: tenant.id,
    status: hasTreasury ? treasuryStatus : 'not-configured',
    withdrawLimitUsd: hasTreasury ? 25000 : 0,
    allocationLimitUsd: hasTreasury ? 100000 : 0,
    crossChainLimitUsd: hasTreasury ? 50000 : 0,
    maxStrategyExposurePercent: hasTreasury ? 25 : 0,
    allowedStrategies: hasTreasury ? ['governance-ops', 'market-making', 'stablecoin-liquidity'] : [],
    blockedStrategies: ['unregistered-derivatives', 'opaque-custody', 'unverified-bridge'],
    allowedChains: [tenant?.treasury?.chainId].filter(Boolean),
    riskControls: {
      highRiskBlocked: true,
      requiresMultisigAboveUsd: 10000,
      requiresConstitutionalReviewAboveUsd: 50000,
    },
    updatedAt: new Date().toISOString(),
    source: 'tenant treasury policy bootstrap',
  }
}

function getTreasuryPolicyForTenant(tenant: any) {
  return tenantTreasuryPolicies.get(tenant.id) ?? defaultTreasuryPolicy(tenant)
}

function treasuryRiskMetadata(policy: TreasuryPolicy, restrictions: Record<string, RestrictionState>) {
  const policyViolations: string[] = []

  if (policy.status === 'frozen') policyViolations.push('TREASURY_POLICY_FROZEN')
  if (policy.status === 'restricted') policyViolations.push('TREASURY_POLICY_RESTRICTED')
  if (restrictions.treasuryWithdraw === 'denied' || restrictions.treasuryWithdraw === 'disabled') {
    policyViolations.push('TREASURY_WITHDRAW_RESTRICTED')
  }

  return {
    riskExposure:
      policy.status === 'frozen' || policy.status === 'restricted'
        ? 'critical'
        : policy.status === 'review-required'
          ? 'elevated'
          : 'controlled',
    allocationConcentration:
      policy.maxStrategyExposurePercent >= 50 ? 'high' : policy.maxStrategyExposurePercent >= 25 ? 'moderate' : 'low',
    strategyLimits: {
      maxStrategyExposurePercent: policy.maxStrategyExposurePercent,
      allowedStrategies: policy.allowedStrategies,
      blockedStrategies: policy.blockedStrategies,
    },
    executionThresholds: {
      withdrawLimitUsd: policy.withdrawLimitUsd,
      allocationLimitUsd: policy.allocationLimitUsd,
      crossChainLimitUsd: policy.crossChainLimitUsd,
      requiresMultisigAboveUsd: policy.riskControls.requiresMultisigAboveUsd,
      requiresConstitutionalReviewAboveUsd: policy.riskControls.requiresConstitutionalReviewAboveUsd,
    },
    policyViolations,
  }
}

function validateTreasuryOperationAgainstPolicy(
  input: TreasuryOperationInput,
  tenantRuntime: any,
  policy: TreasuryPolicy,
) {
  const reasons: RuntimeReason[] = []
  const amountUsd = input.amountUsd ?? 0
  const restrictions = tenantRuntime.restrictions

  if (restrictions.treasuryWithdraw === 'disabled' || policy.status === 'frozen') {
    reasons.push(
      runtimeReason(
        'TREASURY_OPERATION_FROZEN',
        'constitutional',
        'treasury policy runtime',
        'Treasury operation is blocked because treasury execution is frozen.',
      ),
    )
  }

  if (restrictions.treasuryWithdraw === 'denied' || policy.status === 'restricted') {
    reasons.push(
      runtimeReason(
        'TREASURY_OPERATION_RESTRICTED',
        'critical',
        'treasury policy runtime',
        'Treasury operation is denied by tenant restrictions or treasury policy status.',
      ),
    )
  }

  if (input.operation === 'withdraw' && amountUsd > policy.withdrawLimitUsd) {
    reasons.push(
      runtimeReason(
        'TREASURY_WITHDRAW_LIMIT_EXCEEDED',
        'critical',
        'treasury policy runtime',
        'Requested withdrawal exceeds the tenant treasury withdraw limit.',
      ),
    )
  }

  if (input.operation === 'allocate' && amountUsd > policy.allocationLimitUsd) {
    reasons.push(
      runtimeReason(
        'TREASURY_ALLOCATION_LIMIT_EXCEEDED',
        'critical',
        'treasury policy runtime',
        'Requested allocation exceeds the tenant treasury allocation limit.',
      ),
    )
  }

  if (input.operation === 'cross-chain-transfer' && amountUsd > policy.crossChainLimitUsd) {
    reasons.push(
      runtimeReason(
        'TREASURY_CROSS_CHAIN_LIMIT_EXCEEDED',
        'critical',
        'treasury policy runtime',
        'Requested cross-chain transfer exceeds the tenant treasury cross-chain limit.',
      ),
    )
  }

  if (input.strategy && policy.blockedStrategies.includes(input.strategy)) {
    reasons.push(
      runtimeReason(
        'TREASURY_STRATEGY_BLOCKED',
        'critical',
        'treasury policy runtime',
        'Requested strategy is blocked by treasury policy.',
      ),
    )
  }

  if (input.strategy && policy.allowedStrategies.length > 0 && !policy.allowedStrategies.includes(input.strategy)) {
    reasons.push(
      runtimeReason(
        'TREASURY_STRATEGY_NOT_ALLOWED',
        'warning',
        'treasury policy runtime',
        'Requested strategy is not in the treasury policy allowlist and requires review.',
      ),
    )
  }

  if (input.riskLevel === 'high' || input.riskLevel === 'critical') {
    if (policy.riskControls.highRiskBlocked) {
      reasons.push(
        runtimeReason(
          'TREASURY_HIGH_RISK_OPERATION_BLOCKED',
          'critical',
          'treasury policy runtime',
          'High-risk treasury operations are blocked by policy.',
        ),
      )
    }
  }

  if (input.chainId && policy.allowedChains.length > 0 && !policy.allowedChains.includes(input.chainId)) {
    reasons.push(
      runtimeReason(
        'TREASURY_CHAIN_NOT_ALLOWED',
        'critical',
        'treasury policy runtime',
        'Requested source chain is not authorized by treasury policy.',
      ),
    )
  }

  if (
    input.destinationChainId &&
    policy.allowedChains.length > 0 &&
    !policy.allowedChains.includes(input.destinationChainId)
  ) {
    reasons.push(
      runtimeReason(
        'TREASURY_DESTINATION_CHAIN_NOT_ALLOWED',
        'critical',
        'treasury policy runtime',
        'Requested destination chain is not authorized by treasury policy.',
      ),
    )
  }

  if (!reasons.length && amountUsd > policy.riskControls.requiresConstitutionalReviewAboveUsd) {
    reasons.push(
      runtimeReason(
        'TREASURY_POLICY_REQUIRES_REVIEW',
        'constitutional',
        'treasury policy runtime',
        'Requested treasury operation requires constitutional policy review.',
      ),
    )
  } else if (!reasons.length && amountUsd > policy.riskControls.requiresMultisigAboveUsd) {
    reasons.push(
      runtimeReason(
        'TREASURY_MULTISIG_REVIEW_REQUIRED',
        'warning',
        'treasury policy runtime',
        'Requested treasury operation requires multisig review.',
      ),
    )
  }

  if (!reasons.length) {
    reasons.push(
      runtimeReason(
        'TREASURY_RUNTIME_ALLOWED',
        'info',
        'treasury policy runtime',
        'Treasury operation is allowed by governance-controlled treasury policy.',
      ),
    )
  }

  const blockingReason = reasons.find(reason =>
    [
      'TREASURY_OPERATION_FROZEN',
      'TREASURY_OPERATION_RESTRICTED',
      'TREASURY_WITHDRAW_LIMIT_EXCEEDED',
      'TREASURY_ALLOCATION_LIMIT_EXCEEDED',
      'TREASURY_CROSS_CHAIN_LIMIT_EXCEEDED',
      'TREASURY_STRATEGY_BLOCKED',
      'TREASURY_HIGH_RISK_OPERATION_BLOCKED',
      'TREASURY_CHAIN_NOT_ALLOWED',
      'TREASURY_DESTINATION_CHAIN_NOT_ALLOWED',
    ].includes(reason.reasonCode),
  )
  const primaryReason = blockingReason ?? reasons[0]

  return {
    tenantId: input.tenantId,
    operation: input.operation,
    amountUsd,
    strategy: input.strategy ?? null,
    chainId: input.chainId ?? null,
    destinationChainId: input.destinationChainId ?? null,
    requestedBy: input.requestedBy ?? null,
    allowed: !blockingReason,
    decision: blockingReason ? 'denied' : primaryReason.reasonSeverity === 'info' ? 'allowed' : 'review-required',
    reasonCode: primaryReason.reasonCode,
    reasonSeverity: primaryReason.reasonSeverity,
    source: primaryReason.source,
    timestamp: primaryReason.timestamp,
    reasons,
    treasuryPolicy: policy,
    riskMetadata: treasuryRiskMetadata(policy, restrictions),
    effectiveRestrictions: restrictions,
    constitutionalStanding: tenantRuntime.standing,
  }
}

function defaultCapabilitiesForProposalEffect(input: ProposalEffectInput) {
  const capabilityHints = new Set<string>()
  const actionType = String(input.metadata?.actionType ?? input.metadata?.operation ?? '').toLowerCase()

  if (actionType.includes('trading')) capabilityHints.add('trading.execution')
  if (actionType.includes('marketplace')) capabilityHints.add('marketplace.publishing')
  if (actionType.includes('treasury')) capabilityHints.add('treasury-policy-execution')

  return Array.from(capabilityHints)
}

function recordOperationalHistory(tenantId: string, event: any) {
  const history = tenantOperationalHistory.get(tenantId) ?? []

  history.unshift(event)
  history.splice(100)
  tenantOperationalHistory.set(tenantId, history)
}

function applyProposalMutations(input: ProposalEffectInput) {
  const normalizedGranted = new Set(
    [
      ...(input.capabilitiesGranted ?? []),
      ...(input.lifecycleState === 'approved' ? defaultCapabilitiesForProposalEffect(input) : []),
    ]
      .filter(Boolean)
      .map(normalizeCapability),
  )
  const normalizedRevoked = new Set((input.capabilitiesRevoked ?? []).filter(Boolean).map(normalizeCapability))
  const executedActions: string[] = []
  const mutations: any[] = []

  if (input.lifecycleState === 'rejected') {
    mutations.push({
      type: 'operation-denied',
      reasonCode: 'PROPOSAL_REJECTED_OPERATION_DENIED',
      reasonSeverity: 'warning',
      source: input.source ?? 'proposal lifecycle',
      message: 'Proposal was rejected; requested operation remains denied.',
    })
  }

  normalizedGranted.forEach(capability => {
    const grants = tenantCapabilityGrants.get(input.tenantId) ?? new Set<string>()
    const revocations = tenantCapabilityRevocations.get(input.tenantId) ?? new Set<string>()

    grants.add(capability)
    revocations.delete(capability)
    tenantCapabilityGrants.set(input.tenantId, grants)
    tenantCapabilityRevocations.set(input.tenantId, revocations)
    executedActions.push(`grant:${capability}`)
    mutations.push({ type: 'capability-granted', capability })
  })

  normalizedRevoked.forEach(capability => {
    const grants = tenantCapabilityGrants.get(input.tenantId) ?? new Set<string>()
    const revocations = tenantCapabilityRevocations.get(input.tenantId) ?? new Set<string>()

    grants.delete(capability)
    revocations.add(capability)
    tenantCapabilityGrants.set(input.tenantId, grants)
    tenantCapabilityRevocations.set(input.tenantId, revocations)
    executedActions.push(`revoke:${capability}`)
    mutations.push({ type: 'capability-revoked', capability })
  })

  if (input.restrictions && Object.keys(input.restrictions).length > 0) {
    const restrictions = tenantRestrictionMutations.get(input.tenantId) ?? {}

    Object.entries(input.restrictions).forEach(([key, value]) => {
      restrictions[key] = value
      executedActions.push(`restriction:${key}:${value}`)
      mutations.push({ type: 'restriction-updated', restriction: key, value })
    })

    tenantRestrictionMutations.set(input.tenantId, restrictions)
  }

  if (input.treasuryPolicy && Object.keys(input.treasuryPolicy).length > 0) {
    const existingPolicy =
      tenantTreasuryPolicies.get(input.tenantId) ??
      ({
        tenantId: input.tenantId,
        status: 'review-required',
        withdrawLimitUsd: 0,
        allocationLimitUsd: 0,
        crossChainLimitUsd: 0,
        maxStrategyExposurePercent: 0,
        allowedStrategies: [],
        blockedStrategies: [],
        allowedChains: [],
        riskControls: {
          highRiskBlocked: true,
          requiresMultisigAboveUsd: 0,
          requiresConstitutionalReviewAboveUsd: 0,
        },
        updatedAt: new Date().toISOString(),
        source: 'proposal effect treasury policy bootstrap',
      } as TreasuryPolicy)
    const nextPolicy = {
      ...existingPolicy,
      ...input.treasuryPolicy,
      riskControls: {
        ...existingPolicy.riskControls,
        ...(input.treasuryPolicy.riskControls ?? {}),
      },
      tenantId: input.tenantId,
      updatedAt: new Date().toISOString(),
      source: input.source ?? 'Governance Proposal Effect Engine',
    }

    tenantTreasuryPolicies.set(input.tenantId, nextPolicy as TreasuryPolicy)
    executedActions.push('treasury-policy:update')
    mutations.push({
      type: 'treasury-policy-updated',
      treasuryPolicy: nextPolicy,
    })

    if (nextPolicy.status === 'frozen') {
      const restrictions = tenantRestrictionMutations.get(input.tenantId) ?? {}
      restrictions.treasuryWithdraw = 'disabled'
      tenantRestrictionMutations.set(input.tenantId, restrictions)
      mutations.push({ type: 'restriction-updated', restriction: 'treasuryWithdraw', value: 'disabled' })
    }
  }

  if (input.constitutionalStanding || input.governanceStatus || input.federationTier) {
    const existing = tenantConstitutionalMutations.get(input.tenantId) ?? {}
    const next = {
      ...existing,
      constitutionalStanding: input.constitutionalStanding ?? existing.constitutionalStanding,
      governanceStatus: input.governanceStatus ?? existing.governanceStatus,
      federationTier: input.federationTier ?? existing.federationTier,
    }

    tenantConstitutionalMutations.set(input.tenantId, next)
    executedActions.push('constitutional-state:update')
    mutations.push({
      type: 'constitutional-state-updated',
      constitutionalStanding: next.constitutionalStanding,
      governanceStatus: next.governanceStatus,
      federationTier: next.federationTier,
    })
  }

  return {
    normalizedGranted: Array.from(normalizedGranted),
    normalizedRevoked: Array.from(normalizedRevoked),
    executedActions,
    mutations,
  }
}

async function getTenantRuntimeRecord(tenantId: string) {
  const tenantResponse = await GovernanceTenantController.getTenant(tenantId)
  if (!tenantResponse) return null

  const tenantMutation = tenantConstitutionalMutations.get(tenantResponse.data.id)
  const tenant = {
    ...tenantResponse.data,
    constitutionalStanding: tenantMutation?.constitutionalStanding ?? tenantResponse.data.constitutionalStanding,
    governanceStatus: tenantMutation?.governanceStatus ?? tenantResponse.data.governanceStatus,
    federationTier: tenantMutation?.federationTier ?? tenantResponse.data.federationTier,
  }
  const restrictions = buildTenantRestrictions(tenant)
  const standing = normalizeStanding(tenant?.constitutionalStanding ?? tenant?.governanceStatus)

  return {
    tenant,
    tenantMetadata: tenantResponse.metadata,
    standing,
    restrictions,
  }
}

async function getCapabilityRecords() {
  const capabilitiesResponse = await GovernanceConstitutionalController.listCapabilities()
  return {
    capabilities: capabilitiesResponse.data,
    metadata: capabilitiesResponse.metadata,
  }
}

function notFoundDecision(input: RuntimeValidationInput) {
  const reason = runtimeReason(
    'DAO_TENANT_NOT_FOUND',
    'critical',
    'governance runtime',
    'Runtime validation denied because no DAO tenant record exists for the provided tenant id.',
  )

  return {
    tenantId: input.tenantId,
    capability: input.capability,
    normalizedCapability: normalizeCapability(input.capability),
    operation: input.operation ?? input.action ?? null,
    requestedBy: input.requestedBy ?? null,
    allowed: false,
    decision: 'denied',
    reasonCode: reason.reasonCode,
    reasonSeverity: reason.reasonSeverity,
    source: reason.source,
    timestamp: reason.timestamp,
    reasons: [reason],
    constitutionalStanding: null,
    effectiveRestrictions: null,
  }
}

function blockedByUnknownCapability(input: RuntimeValidationInput, tenantRuntime: any) {
  const reason = runtimeReason(
    'PLUGIN_CAPABILITY_NOT_REGISTERED',
    'critical',
    'governance runtime capability registry',
    'Runtime validation denied because the requested capability is not registered.',
  )

  return {
    tenantId: input.tenantId,
    resolvedTenantId: tenantRuntime.tenant.id,
    capability: input.capability,
    normalizedCapability: normalizeCapability(input.capability),
    operation: input.operation ?? input.action ?? null,
    requestedBy: input.requestedBy ?? null,
    allowed: false,
    decision: 'denied',
    restriction: 'denied',
    reasonCode: reason.reasonCode,
    reasonSeverity: reason.reasonSeverity,
    source: reason.source,
    timestamp: reason.timestamp,
    reasons: [reason],
    constitutionalStanding: tenantRuntime.standing,
    effectiveRestrictions: tenantRuntime.restrictions,
    tenant: {
      id: tenantRuntime.tenant.id,
      daoId: tenantRuntime.tenant.daoId,
      constitutionalStanding: tenantRuntime.standing,
      governanceStatus: tenantRuntime.tenant.governanceStatus,
      federationTier: tenantRuntime.tenant.federationTier,
    },
  }
}

function blockedByRevokedCapability(input: RuntimeValidationInput, tenantRuntime: any) {
  const reason = runtimeReason(
    'CAPABILITY_REVOKED',
    'constitutional',
    'Governance Proposal Effect Engine',
    'Runtime validation denied because a governance proposal revoked this capability.',
  )

  return {
    tenantId: input.tenantId,
    resolvedTenantId: tenantRuntime.tenant.id,
    capability: input.capability,
    normalizedCapability: normalizeCapability(input.capability),
    operation: input.operation ?? input.action ?? null,
    requestedBy: input.requestedBy ?? null,
    allowed: false,
    decision: 'denied',
    restriction: 'disabled',
    reasonCode: reason.reasonCode,
    reasonSeverity: reason.reasonSeverity,
    source: reason.source,
    timestamp: reason.timestamp,
    reasons: [reason],
    constitutionalStanding: tenantRuntime.standing,
    effectiveRestrictions: tenantRuntime.restrictions,
    tenant: {
      id: tenantRuntime.tenant.id,
      daoId: tenantRuntime.tenant.daoId,
      constitutionalStanding: tenantRuntime.standing,
      governanceStatus: tenantRuntime.tenant.governanceStatus,
      federationTier: tenantRuntime.tenant.federationTier,
    },
  }
}

function evaluateCapability(input: RuntimeValidationInput, tenantRuntime: any, capability: any) {
  const normalizedCapability = normalizeCapability(input.capability)
  const restrictionKey = restrictionKeyForCapability(normalizedCapability)
  const restriction = tenantRuntime.restrictions[restrictionKey] ?? 'denied'
  const reasons: RuntimeReason[] = []

  if (isBlockingStanding(tenantRuntime.standing)) {
    reasons.push(
      runtimeReason(
        standingReasonCode[tenantRuntime.standing],
        'constitutional',
        'constitutional standing',
        standingMessage(tenantRuntime.standing),
      ),
    )
  }

  if (isBlockingRestriction(restriction)) {
    reasons.push(
      runtimeReason(
        restriction === 'disabled' ? 'TENANT_CAPABILITY_DISABLED' : 'TENANT_CAPABILITY_DENIED',
        restriction === 'disabled' ? 'constitutional' : 'critical',
        'tenant restriction runtime',
        `Runtime restriction ${restrictionKey} is ${restriction} for this tenant.`,
      ),
    )
  }

  if (isBlockingCapabilityStatus(capability?.status)) {
    reasons.push(
      runtimeReason(
        capability?.reasonCodes?.[0]?.reasonCode ?? 'PLUGIN_CAPABILITY_NOT_REGISTERED',
        capability?.reasonCodes?.[0]?.reasonSeverity ?? 'critical',
        capability?.authorityLayer ?? 'governance runtime capability registry',
        `Capability ${normalizedCapability} is ${capability.status}.`,
      ),
    )
  }

  if (capability?.status === 'review-required' || restriction === 'review-required' || restriction === 'limited') {
    const reasonCode =
      capability?.reasonCodes?.[0]?.reasonCode ??
      (restriction === 'limited' ? 'TENANT_OPERATION_RESTRICTED' : 'TREASURY_POLICY_REQUIRES_REVIEW')

    reasons.push(
      runtimeReason(
        reasonCode,
        capability?.reasonCodes?.[0]?.reasonSeverity ?? (restriction === 'limited' ? 'warning' : 'constitutional'),
        capability?.reasonCodes?.[0]?.source ?? 'governance runtime',
        restriction === 'limited'
          ? `Runtime restriction ${restrictionKey} is limited for this tenant.`
          : `Capability ${normalizedCapability} requires runtime review before execution.`,
      ),
    )
  }

  if (!reasons.length) {
    reasons.push(
      runtimeReason(
        'GOVERNANCE_RUNTIME_ALLOWED',
        'info',
        'governance runtime',
        'Runtime validation allowed this capability for the tenant.',
      ),
    )
  }

  const blocking = reasons.find(reason =>
    [
      'TENANT_CONSTITUTIONALLY_SUSPENDED',
      'TENANT_CONSTITUTIONALLY_SANCTIONED',
      'TENANT_CAPABILITY_DISABLED',
      'TENANT_CAPABILITY_DENIED',
      'PLUGIN_CAPABILITY_NOT_REGISTERED',
    ].includes(reason.reasonCode),
  )
  const primaryReason = blocking ?? reasons[0]
  const allowed = !blocking

  return {
    tenantId: input.tenantId,
    resolvedTenantId: tenantRuntime.tenant.id,
    capability: input.capability,
    normalizedCapability,
    action: input.action ?? null,
    operation: input.operation ?? input.action ?? null,
    resource: input.resource ?? null,
    requestedBy: input.requestedBy ?? null,
    allowed,
    decision: allowed ? (primaryReason.reasonSeverity === 'info' ? 'allowed' : 'review-required') : 'denied',
    restriction,
    restrictionKey,
    reasonCode: primaryReason.reasonCode,
    reasonSeverity: primaryReason.reasonSeverity,
    source: primaryReason.source,
    timestamp: primaryReason.timestamp,
    reasons,
    constitutionalStanding: tenantRuntime.standing,
    effectiveRestrictions: tenantRuntime.restrictions,
    activeDirectives: getActiveDirectivesForTenant(tenantRuntime.tenant.id),
    tenant: {
      id: tenantRuntime.tenant.id,
      daoId: tenantRuntime.tenant.daoId,
      name: tenantRuntime.tenant.name,
      constitutionalStanding: tenantRuntime.standing,
      governanceStatus: tenantRuntime.tenant.governanceStatus,
      federationTier: tenantRuntime.tenant.federationTier,
    },
    capabilityRecord: capability,
  }
}

const GovernanceRuntimeValidator = {
  getTenantRuntime: async (tenantId: string) => {
    const tenantRuntime = await getTenantRuntimeRecord(tenantId)

    if (!tenantRuntime) {
      return {
        data: null,
        metadata: {
          tenantId,
          source: 'governance runtime',
          boundary: runtimeBoundary,
          reason: notFoundDecision({ tenantId, capability: 'runtime.tenant' }).reasons[0],
        },
      }
    }

    return {
      data: {
        tenant: tenantRuntime.tenant,
        constitutionalStanding: tenantRuntime.standing,
        governanceStatus: tenantRuntime.tenant.governanceStatus,
        federationTier: tenantRuntime.tenant.federationTier,
        restrictions: tenantRuntime.restrictions,
        activeDirectives: getActiveDirectivesForTenant(tenantRuntime.tenant.id),
        grantedCapabilities: getTenantGrantedCapabilities(tenantRuntime.tenant.id),
        revokedCapabilities: getTenantRevokedCapabilities(tenantRuntime.tenant.id),
        enforcementState: isBlockingStanding(tenantRuntime.standing) ? 'blocked' : 'active',
        reasonCodes: tenantRuntime.tenant.reasonCodes ?? [],
      },
      metadata: {
        tenantId,
        resolvedTenantId: tenantRuntime.tenant.id,
        source: 'governance runtime',
        tenantSource: tenantRuntime.tenantMetadata.source,
        boundary: runtimeBoundary,
      },
    }
  },

  listTenantCapabilities: async (tenantId: string) => {
    const tenantRuntime = await getTenantRuntimeRecord(tenantId)
    const { capabilities, metadata } = await getCapabilityRecords()

    if (!tenantRuntime) {
      return {
        data: [],
        metadata: {
          tenantId,
          source: 'governance runtime',
          capabilitySource: metadata.source,
          boundary: runtimeBoundary,
          reason: notFoundDecision({ tenantId, capability: 'runtime.capabilities' }).reasons[0],
        },
      }
    }

    return {
      data: [
        ...capabilities,
        ...getTenantGrantedCapabilities(tenantRuntime.tenant.id).map(capabilityRecordForGrantedCapability),
      ].map(capability => evaluateCapability({ tenantId, capability: capability.id }, tenantRuntime, capability)),
      metadata: {
        tenantId,
        resolvedTenantId: tenantRuntime.tenant.id,
        source: 'governance runtime',
        capabilitySource: metadata.source,
        boundary: runtimeBoundary,
      },
    }
  },

  validate: async (input: RuntimeValidationInput) => {
    const tenantRuntime = await getTenantRuntimeRecord(input.tenantId)
    if (!tenantRuntime) return notFoundDecision(input)

    const { capabilities } = await getCapabilityRecords()
    const normalizedCapability = normalizeCapability(input.capability)
    const capability = isCapabilityGranted(tenantRuntime.tenant.id, normalizedCapability)
      ? capabilityRecordForGrantedCapability(normalizedCapability)
      : capabilities.find((capabilityRecord: any) => capabilityRecord.id === normalizedCapability)

    const decision = isCapabilityRevoked(tenantRuntime.tenant.id, normalizedCapability)
      ? blockedByRevokedCapability(input, tenantRuntime)
      : capability
        ? evaluateCapability(input, tenantRuntime, capability)
        : blockedByUnknownCapability(input, tenantRuntime)

    recordTelemetry(decision)
    recordDecision(decision)

    return decision
  },

  getPolicyTenant: async (tenantId: string) => {
    const tenantRuntime = await getTenantRuntimeRecord(tenantId)

    if (!tenantRuntime) {
      return {
        data: null,
        metadata: {
          tenantId,
          source: 'governance policy',
          boundary: policyBoundary,
          reason: notFoundDecision({ tenantId, capability: 'policy.tenant' }).reasons[0],
        },
      }
    }

    const snapshot = createPolicySnapshot(tenantRuntime)

    return {
      data: {
        tenant: tenantRuntime.tenant,
        constitutionalStanding: tenantRuntime.standing,
        governanceStatus: tenantRuntime.tenant.governanceStatus,
        federationTier: tenantRuntime.tenant.federationTier,
        effectiveRestrictions: tenantRuntime.restrictions,
        grantedCapabilities: getTenantGrantedCapabilities(tenantRuntime.tenant.id),
        revokedCapabilities: getTenantRevokedCapabilities(tenantRuntime.tenant.id),
        emergencyDirectives: getActiveDirectivesForTenant(tenantRuntime.tenant.id),
        policySnapshot: snapshot,
      },
      metadata: {
        tenantId,
        resolvedTenantId: tenantRuntime.tenant.id,
        source: 'governance policy',
        boundary: policyBoundary,
      },
    }
  },

  getPolicyRestrictions: async (tenantId: string) => {
    const policy = await GovernanceRuntimeValidator.getPolicyTenant(tenantId)

    return {
      data: policy.data
        ? {
            tenantId: policy.data.tenant.id,
            effectiveRestrictions: policy.data.effectiveRestrictions,
            grantedCapabilities: policy.data.grantedCapabilities,
            revokedCapabilities: policy.data.revokedCapabilities,
            emergencyDirectives: policy.data.emergencyDirectives,
            constitutionalStanding: policy.data.constitutionalStanding,
          }
        : null,
      metadata: policy.metadata,
    }
  },

  getPolicyCapabilities: async (tenantId: string) => GovernanceRuntimeValidator.listTenantCapabilities(tenantId),

  getTreasuryPolicy: async (tenantId: string) => {
    const tenantRuntime = await getTenantRuntimeRecord(tenantId)

    if (!tenantRuntime) {
      return {
        data: null,
        metadata: {
          tenantId,
          source: 'treasury governance runtime',
          boundary: policyBoundary,
          reason: notFoundDecision({ tenantId, capability: 'treasury.policy' }).reasons[0],
        },
      }
    }

    const treasuryPolicy = getTreasuryPolicyForTenant(tenantRuntime.tenant)

    return {
      data: {
        treasuryPolicy,
        riskMetadata: treasuryRiskMetadata(treasuryPolicy, tenantRuntime.restrictions),
        effectiveRestrictions: tenantRuntime.restrictions,
        constitutionalStanding: tenantRuntime.standing,
      },
      metadata: {
        tenantId,
        resolvedTenantId: tenantRuntime.tenant.id,
        source: 'treasury governance runtime',
        boundary: policyBoundary,
      },
    }
  },

  validateTreasuryOperation: async (input: TreasuryOperationInput) => {
    const tenantRuntime = await getTenantRuntimeRecord(input.tenantId)
    const timestamp = new Date().toISOString()

    if (!tenantRuntime) {
      const reason = notFoundDecision({ tenantId: input.tenantId, capability: 'treasury.operation' }).reasons[0]

      return {
        tenantId: input.tenantId,
        operation: input.operation,
        allowed: false,
        decision: 'denied',
        reasonCode: reason.reasonCode,
        reasonSeverity: reason.reasonSeverity,
        source: reason.source,
        timestamp,
        reasons: [reason],
      }
    }

    const policy = getTreasuryPolicyForTenant(tenantRuntime.tenant)
    const decision = validateTreasuryOperationAgainstPolicy(input, tenantRuntime, policy)
    const receipt = {
      id: `treasury-receipt-${input.tenantId}-${Date.now()}`,
      tenantId: input.tenantId,
      operation: input.operation,
      allowed: decision.allowed,
      decision: decision.decision,
      amountUsd: input.amountUsd ?? 0,
      strategy: input.strategy ?? null,
      reasonCode: decision.reasonCode,
      reasonSeverity: decision.reasonSeverity,
      riskMetadata: decision.riskMetadata,
      treasuryPolicy: policy,
      timestamp: decision.timestamp,
      source: input.source ?? 'treasury governance runtime',
    }

    treasuryReceipts.set(input.tenantId, [receipt, ...(treasuryReceipts.get(input.tenantId) ?? [])].slice(0, 100))
    recordOperationalHistory(input.tenantId, {
      id: receipt.id,
      type: 'treasury-operation',
      status: decision.allowed ? decision.decision : 'denied',
      operation: input.operation,
      amountUsd: input.amountUsd ?? 0,
      reasonCode: decision.reasonCode,
      reasonSeverity: decision.reasonSeverity,
      timestamp: decision.timestamp,
      source: receipt.source,
    })
    recordTelemetry({
      ...decision,
      restrictionKey: 'treasuryWithdraw',
    })
    recordDecision({
      ...decision,
      resolvedTenantId: input.tenantId,
      normalizedCapability: 'treasury-policy-execution',
      operation: input.operation,
    })

    return {
      ...decision,
      receipt,
    }
  },

  listTreasuryReceipts: async (tenantId: string) => ({
    data: treasuryReceipts.get(tenantId) ?? [],
    metadata: {
      tenantId,
      source: 'treasury governance runtime',
      boundary: policyBoundary,
    },
  }),

  listEmergencyDirectives: async (tenantId?: string) => ({
    data: tenantId ? getActiveDirectivesForTenant(tenantId) : emergencyDirectives,
    metadata: {
      tenantId: tenantId ?? null,
      source: 'governance emergency directives',
      activeDirectives: emergencyDirectives.filter(directive => directive.status === 'active').length,
      boundary: policyBoundary,
    },
  }),

  listPolicySnapshots: async (tenantId: string) => {
    const snapshots = policySnapshots.get(tenantId)

    if (!snapshots?.length) {
      const tenantRuntime = await getTenantRuntimeRecord(tenantId)
      if (tenantRuntime) createPolicySnapshot(tenantRuntime, 'governance policy snapshot bootstrap')
    }

    return {
      data: policySnapshots.get(tenantId) ?? [],
      metadata: {
        tenantId,
        source: 'governance policy snapshots',
        boundary: policyBoundary,
      },
    }
  },

  getTelemetry: async () => ({
    data: {
      ...telemetry,
      emergencyDirectives: emergencyDirectives.filter(directive => directive.status === 'active').length,
    },
    metadata: {
      source: 'governance runtime telemetry',
      boundary: policyBoundary,
    },
  }),

  listDecisionEvents: async () => ({
    data: validationDecisions,
    metadata: {
      source: 'governance decision broadcast',
      boundary: policyBoundary,
    },
  }),

  applyProposalEffect: async (input: ProposalEffectInput) => {
    const tenantRuntimeBefore = await getTenantRuntimeRecord(input.tenantId)
    const timestamp = new Date().toISOString()

    if (!tenantRuntimeBefore) {
      const receipt = {
        proposalId: input.proposalId,
        tenantId: input.tenantId,
        status: 'failed',
        executedActions: [],
        mutations: [],
        affectedCapabilities: [],
        affectedRestrictions: [],
        reason: notFoundDecision({ tenantId: input.tenantId, capability: 'proposal.effect' }).reasons[0],
        timestamp,
        source: input.source ?? 'Governance Proposal Effect Engine',
      }

      proposalEffectReceipts.set(input.proposalId, [receipt])
      return receipt
    }

    const effects =
      input.lifecycleState === 'executed' || input.lifecycleState === 'approved'
        ? applyProposalMutations(input)
        : applyProposalMutations({ ...input, capabilitiesGranted: [], capabilitiesRevoked: [] })
    const tenantRuntimeAfter = await getTenantRuntimeRecord(input.tenantId)
    const snapshot = tenantRuntimeAfter ? createPolicySnapshot(tenantRuntimeAfter, 'proposal effect execution') : null
    const receipt = {
      proposalId: input.proposalId,
      tenantId: input.tenantId,
      status: 'applied',
      lifecycleState: input.lifecycleState,
      executedActions: effects.executedActions,
      mutations: effects.mutations,
      affectedCapabilities: [...effects.normalizedGranted, ...effects.normalizedRevoked],
      affectedRestrictions: Object.keys(input.restrictions ?? {}),
      constitutionalState: tenantRuntimeAfter
        ? {
            constitutionalStanding: tenantRuntimeAfter.standing,
            governanceStatus: tenantRuntimeAfter.tenant.governanceStatus,
            federationTier: tenantRuntimeAfter.tenant.federationTier,
          }
        : null,
      runtimeReconciliation: {
        status: 'runtime-state-updated',
        indexerStatus: 'pending',
        reasonCode: 'INDEXER_STATE_NOT_READY',
        reasonSeverity: 'info',
        policySnapshotId: snapshot?.id ?? null,
      },
      timestamp,
      source: input.source ?? 'Governance Proposal Effect Engine',
      executedBy: input.executedBy ?? null,
    }

    proposalEffectReceipts.set(input.proposalId, [receipt, ...(proposalEffectReceipts.get(input.proposalId) ?? [])])
    recordOperationalHistory(input.tenantId, {
      id: `tenant-operation-${input.proposalId}-${Date.now()}`,
      type: 'proposal-effect',
      status: receipt.status,
      proposalId: input.proposalId,
      lifecycleState: input.lifecycleState,
      mutations: receipt.mutations,
      timestamp,
      source: receipt.source,
    })
    validationDecisions.unshift({
      id: `governance-decision-${validationDecisions.length + 1}`,
      type: 'proposal.effect.applied',
      tenantId: input.tenantId,
      capability: effects.normalizedGranted[0] ?? effects.normalizedRevoked[0] ?? null,
      operation: 'proposal-effect',
      requestedBy: input.executedBy ?? null,
      allowed: true,
      reasonCode: 'PROPOSAL_EFFECT_APPLIED',
      reasonSeverity: 'info',
      operationalConsequence: 'RUNTIME_STATE_MUTATED',
      emittedAt: timestamp,
    })

    return receipt
  },

  getProposalEffectReceipts: async (proposalId: string) => ({
    data: proposalEffectReceipts.get(proposalId) ?? [],
    metadata: {
      proposalId,
      source: 'Governance Proposal Effect Engine',
      boundary: policyBoundary,
    },
  }),

  listTenantOperationalHistory: async (tenantId: string) => ({
    data: tenantOperationalHistory.get(tenantId) ?? [],
    metadata: {
      tenantId,
      source: 'Governance Proposal Effect Engine',
      boundary: policyBoundary,
    },
  }),
}

export default GovernanceRuntimeValidator
export type { ProposalEffectInput, RuntimeValidationInput, TreasuryOperationInput }
