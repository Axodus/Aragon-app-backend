import type {
  ChainRegistryEntry,
  ChainRole,
  ConstitutionalCompatibility,
  ConstitutionalCondition,
  ConstitutionalExecutionAuthority,
  ConstitutionalGovernanceLayer,
  ConstitutionalStanding,
  FederationTier,
  GovernancePluginCapability,
  GovernanceStatus,
} from '../types'
import { IPluginInterfaceType, NetworksEnum } from '@types'

const compatible: ConstitutionalCompatibility = {
  status: 'compatible',
  reasonCodes: [],
}

const compliantStanding: ConstitutionalStanding = {
  status: 'compliant',
  reasonCodes: [],
  reasonSeverity: null,
}

const harmonyObserverStanding: ConstitutionalStanding = {
  status: 'under-review',
  reasonCodes: ['REMOTE_EXECUTION_GUARDRAIL_ACTIVE'],
  reasonSeverity: 'constitutional',
}

const governanceStatusFromStanding = (standing: ConstitutionalStanding): GovernanceStatus => standing.status

const federationTierForRoles = (roles: readonly ChainRole[], legacyHarmonyAdapter?: boolean): FederationTier => {
  if (roles.includes('execution')) return 'root'
  if (legacyHarmonyAdapter) return 'observer'
  return 'partner'
}

const executionAuthorityForRoles = (
  roles: readonly ChainRole[],
  remoteExecution: boolean,
  legacyHarmonyAdapter?: boolean,
): ConstitutionalExecutionAuthority => {
  if (roles.includes('execution')) return 'constitutional-root'
  if (legacyHarmonyAdapter) return 'legacy-voting-adapter'
  if (remoteExecution) return 'federated-spoke'
  return 'not-authorized'
}

const constitutionalLayer = ({
  roles,
  federationTier,
  federationMember,
  governance,
  voting,
  treasury,
  remoteExecution,
  constitutionalConditions,
  constitutionalStanding,
  legacyHarmonyAdapter = false,
}: {
  roles: readonly ChainRole[]
  federationTier: FederationTier
  federationMember: boolean
  governance: boolean
  voting: boolean
  treasury: boolean
  remoteExecution: boolean
  constitutionalConditions: boolean
  constitutionalStanding: ConstitutionalStanding
  legacyHarmonyAdapter?: boolean
}): ConstitutionalGovernanceLayer => {
  const executionChainAuthorized = roles.includes('execution')
  const executionReasonCodes = executionChainAuthorized ? [] : ['EXECUTION_CHAIN_NOT_AUTHORIZED' as const]
  const legacyReasonCodes = legacyHarmonyAdapter ? ['REMOTE_EXECUTION_GUARDRAIL_ACTIVE' as const] : []
  const standingReasonCodes = constitutionalStanding.reasonCodes
  const conditionReasonCodes = Array.from(
    new Set([...executionReasonCodes, ...legacyReasonCodes, ...standingReasonCodes]),
  )
  const conditionSeverity =
    conditionReasonCodes.length > 0 ? (constitutionalStanding.reasonSeverity ?? 'constitutional') : null

  const executionModes = [
    ...(executionChainAuthorized ? (['direct', 'federal'] as const) : []),
    ...(remoteExecution ? (['remote'] as const) : []),
    ...(legacyHarmonyAdapter ? (['legacy-adapter'] as const) : []),
  ]

  const executionChainCondition: ConstitutionalCondition = {
    key: 'execution-chain-authorized',
    label: 'Execution chain authorization',
    status: executionChainAuthorized ? 'satisfied' : 'restricted',
    source: 'Constitutional Governance',
    reasonCodes: executionReasonCodes,
    reasonSeverity: executionReasonCodes.length > 0 ? 'constitutional' : null,
  }

  return {
    capabilities: [
      {
        key: 'federal-standards',
        label: 'Federal standards',
        enabled: governance,
        source: 'Constitutional Governance',
        reasonCodes: governance ? [] : ['CHAIN_NOT_CONSTITUTIONALLY_ENABLED'],
        reasonSeverity: governance ? null : 'constitutional',
      },
      {
        key: 'chain-capabilities',
        label: 'Chain capabilities',
        enabled: governance || voting || treasury || remoteExecution,
        source: 'Constitutional Governance',
        reasonCodes: [],
        reasonSeverity: null,
      },
      {
        key: 'plugin-capabilities',
        label: 'Plugin capabilities',
        enabled: governance,
        source: 'Constitutional Governance',
        reasonCodes: governance ? [] : ['PLUGIN_CAPABILITY_NOT_REGISTERED'],
        reasonSeverity: governance ? null : 'warning',
      },
      {
        key: 'constitutional-conditions',
        label: 'Constitutional conditions',
        enabled: constitutionalConditions,
        source: 'Constitutional Governance',
        reasonCodes: constitutionalConditions ? [] : conditionReasonCodes,
        reasonSeverity: constitutionalConditions ? null : conditionSeverity,
      },
      {
        key: 'ecosystem-guardrails',
        label: 'Ecosystem guardrails',
        enabled: true,
        source: 'Constitutional Governance',
        reasonCodes: standingReasonCodes,
        reasonSeverity: constitutionalStanding.reasonSeverity ?? null,
      },
      {
        key: 'treasury-constraints',
        label: 'Treasury constraints',
        enabled: treasury,
        source: 'Constitutional Governance',
        reasonCodes: treasury ? ['TREASURY_POLICY_REQUIRES_REVIEW'] : [],
        reasonSeverity: treasury ? 'warning' : null,
      },
      {
        key: 'federation-requirements',
        label: 'Federation requirements',
        enabled: federationMember,
        source: 'Constitutional Governance',
        reasonCodes: federationMember ? [] : ['LOCAL_GOVERNANCE_MODEL_INCOMPATIBLE'],
        reasonSeverity: federationMember ? null : 'constitutional',
      },
      {
        key: 'cross-chain-legitimacy',
        label: 'Cross-chain legitimacy',
        enabled: voting || remoteExecution,
        source: 'Constitutional Governance',
        reasonCodes: legacyReasonCodes,
        reasonSeverity: legacyReasonCodes.length > 0 ? 'constitutional' : null,
      },
      {
        key: 'agent-execution-boundaries',
        label: 'Agent execution boundaries',
        enabled: true,
        source: 'Constitutional Governance',
        reasonCodes: ['AGENT_PERMISSION_SCOPE_EXCEEDED'],
        reasonSeverity: 'info',
      },
      {
        key: 'transparent-reason-codes',
        label: 'Transparent reason codes',
        enabled: true,
        source: 'Constitutional Governance',
        reasonCodes: [],
        reasonSeverity: null,
      },
    ],
    conditions: [
      {
        key: 'chain-constitutionally-enabled',
        label: 'Chain constitutionally enabled',
        status: governance ? 'satisfied' : 'restricted',
        source: 'Constitutional Governance',
        reasonCodes: governance ? [] : ['CHAIN_NOT_CONSTITUTIONALLY_ENABLED'],
        reasonSeverity: governance ? null : 'constitutional',
      },
      executionChainCondition,
      {
        key: 'plugin-capability-registered',
        label: 'Plugin capability registered',
        status: governance ? 'satisfied' : 'requires-review',
        source: 'Constitutional Governance',
        reasonCodes: governance ? [] : ['PLUGIN_CAPABILITY_NOT_REGISTERED'],
        reasonSeverity: governance ? null : 'warning',
      },
      {
        key: 'local-governance-standing-required',
        label: 'Local governance standing required',
        status: constitutionalStanding.status === 'compliant' ? 'satisfied' : 'requires-review',
        source: 'Constitutional Governance',
        reasonCodes: standingReasonCodes,
        reasonSeverity: constitutionalStanding.reasonSeverity ?? null,
      },
      {
        key: 'treasury-policy-review-required',
        label: 'Treasury policy review required',
        status: treasury ? 'requires-review' : 'not-applicable',
        source: 'Constitutional Governance',
        reasonCodes: treasury ? ['TREASURY_POLICY_REQUIRES_REVIEW'] : [],
        reasonSeverity: treasury ? 'warning' : null,
      },
      {
        key: 'agent-permission-scope-required',
        label: 'Agent permission scope required',
        status: 'requires-review',
        source: 'Constitutional Governance',
        reasonCodes: ['AGENT_PERMISSION_SCOPE_EXCEEDED'],
        reasonSeverity: 'info',
      },
    ],
    authorityModel: {
      authoritySources: [
        '$Neurons',
        'federation-registry',
        'constitutional-condition-registry',
        'treasury-policy-registry',
        'guardrail-registry',
      ],
      constitutionalAsset: '$Neurons',
      localAuthorityPreserved: true,
      localAuthorityBoundary:
        'Local governance controls local operations only while constitutional standing remains observable and valid.',
      treasuryAuthorityBoundary:
        'Treasury-sensitive actions require policy review and transparent reason metadata before execution.',
      agentAuthorityBoundary:
        'AI and agent execution is bounded by explicit permission scopes and cannot become hidden governance authority.',
    },
    federationModel: {
      federationMember,
      federationTier,
      federationRoles: roles,
      membershipSource: 'federation-registry',
      localAutonomy: 'constitutionally-bounded',
      requirements: [
        'chain-constitutionally-enabled',
        'plugin-capability-registered',
        'local-governance-standing-required',
      ],
    },
    executionModel: {
      executionAuthority: executionAuthorityForRoles(roles, remoteExecution, legacyHarmonyAdapter),
      executionChainAuthorized,
      executionModes,
      remoteExecutionGuardrail: remoteExecution && !executionChainAuthorized,
      treasuryReviewRequired: treasury,
      reasonCodes: conditionReasonCodes,
      reasonSeverity: conditionSeverity,
    },
  }
}

const evmPluginCapabilities: Readonly<Partial<Record<IPluginInterfaceType, GovernancePluginCapability>>> = {
  [IPluginInterfaceType.tokenVoting]: {
    interfaceType: IPluginInterfaceType.tokenVoting,
    label: 'Token Voting',
    adapter: 'evm',
    governanceNucleus: 'local',
    actions: { createProposal: true, vote: true, execute: true, settings: true },
    executionModes: ['direct', 'remote', 'federal'],
    votingPowerStrategy: 'erc20-votes',
    compatibleRoles: ['execution', 'voting', 'spoke'],
    constitutionalCompatibility: compatible,
    constitutionalStanding: compliantStanding,
    governanceStatus: 'compliant',
    requiresDeployment: true,
    requiresIndexer: true,
  },
  [IPluginInterfaceType.nativeTokenVoting]: {
    interfaceType: IPluginInterfaceType.nativeTokenVoting,
    label: 'Native Token Voting',
    adapter: 'evm',
    governanceNucleus: 'local',
    actions: { createProposal: true, vote: true, execute: true, settings: true },
    executionModes: ['direct', 'remote', 'federal'],
    votingPowerStrategy: 'native-token-adapter',
    compatibleRoles: ['execution', 'voting', 'spoke'],
    constitutionalCompatibility: compatible,
    constitutionalStanding: compliantStanding,
    governanceStatus: 'compliant',
    requiresDeployment: true,
    requiresIndexer: true,
  },
  [IPluginInterfaceType.multisig]: {
    interfaceType: IPluginInterfaceType.multisig,
    label: 'Multisig',
    adapter: 'evm',
    governanceNucleus: 'local',
    actions: { createProposal: true, vote: true, execute: true, settings: true },
    executionModes: ['direct', 'remote', 'federal'],
    votingPowerStrategy: 'multisig-membership',
    compatibleRoles: ['execution', 'voting', 'spoke'],
    constitutionalCompatibility: compatible,
    constitutionalStanding: compliantStanding,
    governanceStatus: 'compliant',
    requiresDeployment: true,
    requiresIndexer: true,
  },
  [IPluginInterfaceType.admin]: {
    interfaceType: IPluginInterfaceType.admin,
    label: 'Admin',
    adapter: 'evm',
    governanceNucleus: 'local',
    actions: { createProposal: true, vote: false, execute: true, settings: true },
    executionModes: ['direct', 'remote', 'federal'],
    votingPowerStrategy: 'admin-permission',
    compatibleRoles: ['execution', 'spoke'],
    constitutionalCompatibility: compatible,
    constitutionalStanding: compliantStanding,
    governanceStatus: 'compliant',
    requiresDeployment: true,
    requiresIndexer: true,
  },
  [IPluginInterfaceType.lockToVote]: {
    interfaceType: IPluginInterfaceType.lockToVote,
    label: 'Lock To Vote',
    adapter: 'evm',
    governanceNucleus: 'local',
    actions: { createProposal: true, vote: true, execute: true, settings: true },
    executionModes: ['direct', 'remote', 'federal'],
    votingPowerStrategy: 'lock-to-vote',
    compatibleRoles: ['execution', 'voting', 'spoke'],
    constitutionalCompatibility: compatible,
    constitutionalStanding: compliantStanding,
    governanceStatus: 'compliant',
    requiresDeployment: true,
    requiresIndexer: true,
  },
  [IPluginInterfaceType.gauge]: {
    interfaceType: IPluginInterfaceType.gauge,
    label: 'Gauge',
    adapter: 'evm',
    governanceNucleus: 'local',
    actions: { createProposal: true, vote: true, execute: true, settings: true },
    executionModes: ['direct', 'remote', 'federal'],
    votingPowerStrategy: 'gauge-weight',
    compatibleRoles: ['execution', 'voting', 'spoke'],
    constitutionalCompatibility: compatible,
    constitutionalStanding: compliantStanding,
    governanceStatus: 'compliant',
    requiresDeployment: true,
    requiresIndexer: true,
  },
  [IPluginInterfaceType.capitalDistributor]: {
    interfaceType: IPluginInterfaceType.capitalDistributor,
    label: 'Capital Distributor',
    adapter: 'evm',
    governanceNucleus: 'local',
    actions: { createProposal: true, vote: false, execute: true, settings: true },
    executionModes: ['direct', 'remote', 'federal'],
    votingPowerStrategy: 'treasury-policy',
    compatibleRoles: ['execution', 'spoke'],
    constitutionalCompatibility: compatible,
    constitutionalStanding: compliantStanding,
    governanceStatus: 'compliant',
    requiresDeployment: true,
    requiresIndexer: true,
  },
  [IPluginInterfaceType.spp]: {
    interfaceType: IPluginInterfaceType.spp,
    label: 'Staged Proposal Processor',
    adapter: 'evm',
    governanceNucleus: 'local',
    actions: { createProposal: true, vote: false, execute: true, settings: true },
    executionModes: ['direct', 'remote', 'federal'],
    votingPowerStrategy: 'staged-proposal',
    compatibleRoles: ['execution', 'spoke'],
    constitutionalCompatibility: compatible,
    constitutionalStanding: compliantStanding,
    governanceStatus: 'compliant',
    requiresDeployment: true,
    requiresIndexer: true,
  },
}

const harmonyPluginCapabilities: Readonly<Partial<Record<IPluginInterfaceType, GovernancePluginCapability>>> = {
  [IPluginInterfaceType.tokenVoting]: {
    interfaceType: IPluginInterfaceType.tokenVoting,
    label: 'Token Voting',
    adapter: 'harmony',
    governanceNucleus: 'local',
    actions: { createProposal: true, vote: true, execute: true, settings: true },
    executionModes: ['legacy-adapter'],
    votingPowerStrategy: 'erc20-votes',
    compatibleRoles: ['voting', 'spoke'],
    constitutionalCompatibility: compatible,
    constitutionalStanding: compliantStanding,
    governanceStatus: 'compliant',
    requiresDeployment: true,
    requiresIndexer: true,
    legacy: true,
  },
  [IPluginInterfaceType.nativeTokenVoting]: {
    interfaceType: IPluginInterfaceType.nativeTokenVoting,
    label: 'Native Token Voting',
    adapter: 'harmony',
    governanceNucleus: 'local',
    actions: { createProposal: true, vote: true, execute: true, settings: true },
    executionModes: ['legacy-adapter'],
    votingPowerStrategy: 'native-token-adapter',
    compatibleRoles: ['voting', 'spoke'],
    constitutionalCompatibility: compatible,
    constitutionalStanding: compliantStanding,
    governanceStatus: 'compliant',
    requiresDeployment: true,
    requiresIndexer: true,
    legacy: true,
  },
  [IPluginInterfaceType.multisig]: {
    interfaceType: IPluginInterfaceType.multisig,
    label: 'Multisig',
    adapter: 'harmony',
    governanceNucleus: 'local',
    actions: { createProposal: true, vote: true, execute: true, settings: true },
    executionModes: ['legacy-adapter'],
    votingPowerStrategy: 'multisig-membership',
    compatibleRoles: ['voting', 'spoke'],
    constitutionalCompatibility: compatible,
    constitutionalStanding: compliantStanding,
    governanceStatus: 'compliant',
    requiresDeployment: true,
    requiresIndexer: true,
    legacy: true,
  },
  [IPluginInterfaceType.admin]: {
    interfaceType: IPluginInterfaceType.admin,
    label: 'Admin',
    adapter: 'harmony',
    governanceNucleus: 'local',
    actions: { createProposal: true, vote: false, execute: true, settings: true },
    executionModes: ['legacy-adapter'],
    votingPowerStrategy: 'admin-permission',
    compatibleRoles: ['spoke'],
    constitutionalCompatibility: compatible,
    constitutionalStanding: compliantStanding,
    governanceStatus: 'compliant',
    requiresDeployment: true,
    requiresIndexer: true,
    legacy: true,
  },
  [IPluginInterfaceType.harmonyVoting]: {
    interfaceType: IPluginInterfaceType.harmonyVoting,
    label: 'Harmony Voting',
    adapter: 'harmony',
    governanceNucleus: 'local',
    actions: { createProposal: true, vote: true, execute: true, settings: true },
    executionModes: ['legacy-adapter'],
    votingPowerStrategy: 'harmony-validator-snapshot',
    compatibleRoles: ['voting', 'spoke'],
    constitutionalCompatibility: compatible,
    constitutionalStanding: compliantStanding,
    governanceStatus: 'compliant',
    requiresDeployment: true,
    requiresIndexer: true,
    legacy: true,
  },
  [IPluginInterfaceType.harmonyHipVoting]: {
    interfaceType: IPluginInterfaceType.harmonyHipVoting,
    label: 'Harmony HIP Voting',
    adapter: 'harmony',
    governanceNucleus: 'local',
    actions: { createProposal: true, vote: true, execute: true, settings: true },
    executionModes: ['legacy-adapter'],
    votingPowerStrategy: 'harmony-validator-snapshot',
    compatibleRoles: ['voting', 'spoke'],
    constitutionalCompatibility: compatible,
    constitutionalStanding: compliantStanding,
    governanceStatus: 'compliant',
    requiresDeployment: true,
    requiresIndexer: true,
    legacy: true,
  },
  [IPluginInterfaceType.harmonyDelegationVoting]: {
    interfaceType: IPluginInterfaceType.harmonyDelegationVoting,
    label: 'Harmony Delegation Voting',
    adapter: 'harmony',
    governanceNucleus: 'local',
    actions: { createProposal: true, vote: true, execute: true, settings: true },
    executionModes: ['legacy-adapter'],
    votingPowerStrategy: 'harmony-delegation-snapshot',
    compatibleRoles: ['voting', 'spoke'],
    constitutionalCompatibility: compatible,
    constitutionalStanding: compliantStanding,
    governanceStatus: 'compliant',
    requiresDeployment: true,
    requiresIndexer: true,
    legacy: true,
  },
}

const supportedPluginTypes = (
  pluginCapabilities: Readonly<Partial<Record<IPluginInterfaceType, GovernancePluginCapability>>>,
): readonly IPluginInterfaceType[] => Object.keys(pluginCapabilities) as IPluginInterfaceType[]

const chainCapabilities = ({
  governance,
  voting,
  treasury,
  remoteExecution,
  constitutionalConditions,
  localGovernanceModels,
  pluginCapabilities,
  constitutionalStanding = compliantStanding,
  federationMember,
  federationTier,
  roles,
  legacyHarmonyAdapter,
}: {
  governance: boolean
  voting: boolean
  treasury: boolean
  remoteExecution: boolean
  constitutionalConditions: boolean
  localGovernanceModels: readonly string[]
  pluginCapabilities: Readonly<Partial<Record<IPluginInterfaceType, GovernancePluginCapability>>>
  constitutionalStanding?: ConstitutionalStanding
  federationMember: boolean
  federationTier: FederationTier
  roles: readonly ChainRole[]
  legacyHarmonyAdapter?: boolean
}) => ({
  governance,
  voting,
  treasury,
  remoteExecution,
  constitutionalConditions,
  governanceNuclei: ['constitutional', 'local'] as const,
  constitutionalCompatibility: compatible,
  constitutionalStanding,
  governanceStatus: governanceStatusFromStanding(constitutionalStanding),
  localGovernanceModels,
  constitutionalLayer: constitutionalLayer({
    roles,
    federationTier,
    federationMember,
    governance,
    voting,
    treasury,
    remoteExecution,
    constitutionalConditions,
    constitutionalStanding,
    legacyHarmonyAdapter,
  }),
  supportedPluginTypes: supportedPluginTypes(pluginCapabilities),
  pluginCapabilities,
})

const registry: readonly ChainRegistryEntry[] = [
  {
    chainId: 11155111,
    slug: 'ethereum-sepolia',
    network: NetworksEnum.ethereumSepolia,
    configKey: 'ETHEREUM_SEPOLIA',
    name: 'Ethereum Sepolia',
    family: 'evm',
    adapter: 'evm',
    environment: 'testnet',
    roles: ['execution', 'voting', 'spoke'],
    governanceStatus: 'compliant',
    federationMember: true,
    federationTier: federationTierForRoles(['execution', 'voting', 'spoke']),
    contractConfigFile: 'ethereumSepolia.json',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    finality: { confirmationBlocks: 12, reorgWindowBlocks: 96 },
    rpc: [],
    contracts: {},
    capabilities: chainCapabilities({
      governance: true,
      voting: true,
      treasury: true,
      remoteExecution: true,
      constitutionalConditions: true,
      localGovernanceModels: [
        '$Neurons',
        'local-token',
        'auto-generated-platform-token',
        'multisig',
        'gauge',
        'reputation',
        'nft-governance',
        'plugin-defined',
      ],
      pluginCapabilities: evmPluginCapabilities,
      federationMember: true,
      federationTier: federationTierForRoles(['execution', 'voting', 'spoke']),
      roles: ['execution', 'voting', 'spoke'],
    }),
  },
  {
    chainId: 1666600000,
    slug: 'harmony-mainnet',
    network: NetworksEnum.harmonyMainnet,
    configKey: 'HARMONY_MAINNET',
    name: 'Harmony Mainnet',
    family: 'harmony',
    adapter: 'harmony',
    environment: 'mainnet',
    roles: ['voting', 'spoke'],
    governanceStatus: governanceStatusFromStanding(harmonyObserverStanding),
    federationMember: true,
    federationTier: federationTierForRoles(['voting', 'spoke'], true),
    contractConfigFile: 'harmonyMainnet.json',
    legacyHarmonyAdapter: true,
    nativeCurrency: { symbol: 'ONE', decimals: 18 },
    finality: { confirmationBlocks: 100, reorgWindowBlocks: 7200 },
    rpc: [{ url: 'https://api.harmony.one', priority: 1 }],
    contracts: {},
    capabilities: chainCapabilities({
      governance: true,
      voting: true,
      treasury: true,
      remoteExecution: false,
      constitutionalConditions: false,
      localGovernanceModels: [
        '$Neurons',
        'local-token',
        'auto-generated-platform-token',
        'multisig',
        'harmony-validator-snapshot',
        'harmony-delegation-snapshot',
        'plugin-defined',
      ],
      pluginCapabilities: harmonyPluginCapabilities,
      constitutionalStanding: harmonyObserverStanding,
      federationMember: true,
      federationTier: federationTierForRoles(['voting', 'spoke'], true),
      roles: ['voting', 'spoke'],
      legacyHarmonyAdapter: true,
    }),
  },
  {
    chainId: 1666700000,
    slug: 'harmony-testnet',
    network: NetworksEnum.harmonyTestnet,
    configKey: 'HARMONY_TESTNET',
    name: 'Harmony Testnet',
    family: 'harmony',
    adapter: 'harmony',
    environment: 'testnet',
    roles: ['voting', 'spoke'],
    governanceStatus: governanceStatusFromStanding(harmonyObserverStanding),
    federationMember: true,
    federationTier: federationTierForRoles(['voting', 'spoke'], true),
    contractConfigFile: 'harmonyTestnet.json',
    legacyHarmonyAdapter: true,
    nativeCurrency: { symbol: 'ONE', decimals: 18 },
    finality: { confirmationBlocks: 50, reorgWindowBlocks: 3600 },
    rpc: [],
    contracts: {},
    capabilities: chainCapabilities({
      governance: true,
      voting: true,
      treasury: true,
      remoteExecution: false,
      constitutionalConditions: false,
      localGovernanceModels: [
        '$Neurons',
        'local-token',
        'auto-generated-platform-token',
        'multisig',
        'harmony-validator-snapshot',
        'harmony-delegation-snapshot',
        'plugin-defined',
      ],
      pluginCapabilities: harmonyPluginCapabilities,
      constitutionalStanding: harmonyObserverStanding,
      federationMember: true,
      federationTier: federationTierForRoles(['voting', 'spoke'], true),
      roles: ['voting', 'spoke'],
      legacyHarmonyAdapter: true,
    }),
  },
  {
    chainId: 1,
    slug: 'ethereum-mainnet',
    network: NetworksEnum.ethereumMainnet,
    configKey: 'ETHEREUM_MAINNET',
    name: 'Ethereum Mainnet',
    family: 'evm',
    adapter: 'evm',
    environment: 'mainnet',
    roles: ['voting', 'spoke'],
    governanceStatus: 'compliant',
    federationMember: true,
    federationTier: federationTierForRoles(['voting', 'spoke']),
    contractConfigFile: 'ethereumMainnet.json',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    finality: { confirmationBlocks: 12, reorgWindowBlocks: 96 },
    rpc: [],
    contracts: {},
    capabilities: chainCapabilities({
      governance: true,
      voting: true,
      treasury: true,
      remoteExecution: true,
      constitutionalConditions: true,
      localGovernanceModels: [
        '$Neurons',
        'local-token',
        'auto-generated-platform-token',
        'multisig',
        'gauge',
        'reputation',
        'nft-governance',
        'plugin-defined',
      ],
      pluginCapabilities: evmPluginCapabilities,
      federationMember: true,
      federationTier: federationTierForRoles(['voting', 'spoke']),
      roles: ['voting', 'spoke'],
    }),
  },
  {
    chainId: 8453,
    slug: 'base-mainnet',
    network: NetworksEnum.baseMainnet,
    configKey: 'BASE_MAINNET',
    name: 'Base Mainnet',
    family: 'evm',
    adapter: 'evm',
    environment: 'mainnet',
    roles: ['voting', 'spoke'],
    governanceStatus: 'compliant',
    federationMember: true,
    federationTier: federationTierForRoles(['voting', 'spoke']),
    contractConfigFile: 'baseMainnet.json',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    finality: { confirmationBlocks: 30, reorgWindowBlocks: 300 },
    rpc: [],
    contracts: {},
    capabilities: chainCapabilities({
      governance: true,
      voting: true,
      treasury: true,
      remoteExecution: true,
      constitutionalConditions: true,
      localGovernanceModels: [
        '$Neurons',
        'local-token',
        'auto-generated-platform-token',
        'multisig',
        'gauge',
        'reputation',
        'nft-governance',
        'plugin-defined',
      ],
      pluginCapabilities: evmPluginCapabilities,
      federationMember: true,
      federationTier: federationTierForRoles(['voting', 'spoke']),
      roles: ['voting', 'spoke'],
    }),
  },
  {
    chainId: 42161,
    slug: 'arbitrum-mainnet',
    network: NetworksEnum.arbitrumMainnet,
    configKey: 'ARBITRUM_MAINNET',
    name: 'Arbitrum One',
    family: 'evm',
    adapter: 'evm',
    environment: 'mainnet',
    roles: ['voting', 'spoke'],
    governanceStatus: 'compliant',
    federationMember: true,
    federationTier: federationTierForRoles(['voting', 'spoke']),
    contractConfigFile: 'arbitrumMainnet.json',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    finality: { confirmationBlocks: 30, reorgWindowBlocks: 300 },
    rpc: [],
    contracts: {},
    capabilities: chainCapabilities({
      governance: true,
      voting: true,
      treasury: true,
      remoteExecution: true,
      constitutionalConditions: true,
      localGovernanceModels: [
        '$Neurons',
        'local-token',
        'auto-generated-platform-token',
        'multisig',
        'gauge',
        'reputation',
        'nft-governance',
        'plugin-defined',
      ],
      pluginCapabilities: evmPluginCapabilities,
      federationMember: true,
      federationTier: federationTierForRoles(['voting', 'spoke']),
      roles: ['voting', 'spoke'],
    }),
  },
  {
    chainId: 137,
    slug: 'polygon-mainnet',
    network: NetworksEnum.polygonMainnet,
    configKey: 'POLYGON_MAINNET',
    name: 'Polygon Mainnet',
    family: 'evm',
    adapter: 'evm',
    environment: 'mainnet',
    roles: ['voting', 'spoke'],
    governanceStatus: 'compliant',
    federationMember: true,
    federationTier: federationTierForRoles(['voting', 'spoke']),
    contractConfigFile: 'polygonMainnet.json',
    nativeCurrency: { symbol: 'POL', decimals: 18 },
    finality: { confirmationBlocks: 128, reorgWindowBlocks: 512 },
    rpc: [],
    contracts: {},
    capabilities: chainCapabilities({
      governance: true,
      voting: true,
      treasury: true,
      remoteExecution: true,
      constitutionalConditions: true,
      localGovernanceModels: [
        '$Neurons',
        'local-token',
        'auto-generated-platform-token',
        'multisig',
        'gauge',
        'reputation',
        'nft-governance',
        'plugin-defined',
      ],
      pluginCapabilities: evmPluginCapabilities,
      federationMember: true,
      federationTier: federationTierForRoles(['voting', 'spoke']),
      roles: ['voting', 'spoke'],
    }),
  },
]

export class AxodusChainRegistry {
  constructor(private readonly entries: readonly ChainRegistryEntry[] = registry) {}

  all(): readonly ChainRegistryEntry[] {
    return this.entries
  }

  byChainId(chainId: number): ChainRegistryEntry | undefined {
    return this.entries.find(entry => entry.chainId === chainId)
  }

  bySlug(slug: string): ChainRegistryEntry | undefined {
    return this.entries.find(entry => entry.slug === slug)
  }

  byNetwork(network: string): ChainRegistryEntry | undefined {
    return this.entries.find(
      entry => entry.network === network || entry.slug === network || entry.configKey === network,
    )
  }

  byRole(role: ChainRole): readonly ChainRegistryEntry[] {
    return this.entries.filter(entry => entry.roles.includes(role))
  }

  supportedNetworks(requestedNetworks: readonly string[] = []): readonly ChainRegistryEntry[] {
    if (!requestedNetworks.length) return this.entries

    const requested = new Set(requestedNetworks)
    return this.entries.filter(
      entry => requested.has(entry.network) || requested.has(entry.slug) || requested.has(entry.configKey),
    )
  }

  isSupportedPlugin(network: string, interfaceType: IPluginInterfaceType): boolean {
    const chain = this.byNetwork(network)
    return chain?.capabilities.supportedPluginTypes.includes(interfaceType) ?? false
  }

  pluginCapability(network: string, interfaceType: IPluginInterfaceType): GovernancePluginCapability | undefined {
    const chain = this.byNetwork(network)
    return chain?.capabilities.pluginCapabilities[interfaceType]
  }
}

export const axodusChainRegistry = new AxodusChainRegistry()
