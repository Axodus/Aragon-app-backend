import type { HexAddress, IPluginInterfaceType, NetworksEnum } from '@types'

export type ChainRole = 'execution' | 'voting' | 'spoke'

export type ChainFamily = 'evm' | 'harmony' | 'future'

export type ChainEnvironment = 'mainnet' | 'testnet' | 'local'

export type ChainAdapterKey = 'evm' | 'harmony'

export type GovernanceNucleus = 'constitutional' | 'local'

export type GovernancePluginAction = 'createProposal' | 'vote' | 'execute' | 'settings'

export type VotingPowerStrategy =
  | 'erc20-votes'
  | 'native-token-adapter'
  | 'multisig-membership'
  | 'admin-permission'
  | 'lock-to-vote'
  | 'gauge-weight'
  | 'treasury-policy'
  | 'staged-proposal'
  | 'harmony-validator-snapshot'
  | 'harmony-delegation-snapshot'

export type GovernanceExecutionMode = 'direct' | 'remote' | 'federal' | 'legacy-adapter'

export type ConstitutionalCompatibilityStatus = 'compatible' | 'requires-review' | 'incompatible'

export type ConstitutionalStandingStatus = 'compliant' | 'restricted' | 'sanctioned' | 'suspended' | 'under-review'

export type GovernanceStatus = ConstitutionalStandingStatus

export type FederationTier = 'root' | 'partner' | 'sovereign' | 'restricted' | 'observer'

export type GuardrailReasonSeverity = 'info' | 'warning' | 'critical' | 'constitutional'

export type ConstitutionalCapabilityKey =
  | 'federal-standards'
  | 'chain-capabilities'
  | 'plugin-capabilities'
  | 'constitutional-conditions'
  | 'ecosystem-guardrails'
  | 'treasury-constraints'
  | 'federation-requirements'
  | 'cross-chain-legitimacy'
  | 'agent-execution-boundaries'
  | 'transparent-reason-codes'

export type ConstitutionalConditionKey =
  | 'chain-constitutionally-enabled'
  | 'execution-chain-authorized'
  | 'plugin-capability-registered'
  | 'local-governance-standing-required'
  | 'treasury-policy-review-required'
  | 'agent-permission-scope-required'

export type ConstitutionalConditionStatus = 'satisfied' | 'requires-review' | 'restricted' | 'not-applicable'

export type ConstitutionalAuthoritySource =
  | '$Neurons'
  | 'federation-registry'
  | 'constitutional-condition-registry'
  | 'treasury-policy-registry'
  | 'guardrail-registry'

export type ConstitutionalExecutionAuthority =
  | 'constitutional-root'
  | 'federated-spoke'
  | 'legacy-voting-adapter'
  | 'not-authorized'

export type ConstitutionalGuardrailReasonCode =
  | 'CHAIN_NOT_CONSTITUTIONALLY_ENABLED'
  | 'PLUGIN_CAPABILITY_NOT_REGISTERED'
  | 'LOCAL_GOVERNANCE_MODEL_INCOMPATIBLE'
  | 'TREASURY_POLICY_REQUIRES_REVIEW'
  | 'EXECUTION_CHAIN_NOT_AUTHORIZED'
  | 'VOTING_POWER_SOURCE_NOT_VERIFIED'
  | 'INDEXER_STATE_NOT_READY'
  | 'REMOTE_EXECUTION_GUARDRAIL_ACTIVE'
  | 'AGENT_PERMISSION_SCOPE_EXCEEDED'

export interface ConstitutionalCompatibility {
  readonly status: ConstitutionalCompatibilityStatus
  readonly reasonCodes: readonly ConstitutionalGuardrailReasonCode[]
}

export interface ConstitutionalStanding {
  readonly status: ConstitutionalStandingStatus
  readonly reasonCodes: readonly ConstitutionalGuardrailReasonCode[]
  readonly reasonSeverity?: GuardrailReasonSeverity | null
}

export interface ConstitutionalGuardrailReason {
  readonly reasonCode: ConstitutionalGuardrailReasonCode
  readonly reasonSeverity: GuardrailReasonSeverity
  readonly source: string
  readonly scope: string
  readonly network: NetworksEnum
  readonly pluginType?: IPluginInterfaceType
}

export interface ConstitutionalCapability {
  readonly key: ConstitutionalCapabilityKey
  readonly label: string
  readonly enabled: boolean
  readonly source: 'Constitutional Governance'
  readonly reasonCodes: readonly ConstitutionalGuardrailReasonCode[]
  readonly reasonSeverity?: GuardrailReasonSeverity | null
}

export interface ConstitutionalCondition {
  readonly key: ConstitutionalConditionKey
  readonly label: string
  readonly status: ConstitutionalConditionStatus
  readonly source: 'Constitutional Governance'
  readonly reasonCodes: readonly ConstitutionalGuardrailReasonCode[]
  readonly reasonSeverity?: GuardrailReasonSeverity | null
}

export interface ConstitutionalAuthorityModel {
  readonly authoritySources: readonly ConstitutionalAuthoritySource[]
  readonly constitutionalAsset: '$Neurons'
  readonly localAuthorityPreserved: boolean
  readonly localAuthorityBoundary: string
  readonly treasuryAuthorityBoundary: string
  readonly agentAuthorityBoundary: string
}

export interface ConstitutionalFederationModel {
  readonly federationMember: boolean
  readonly federationTier: FederationTier
  readonly federationRoles: readonly ChainRole[]
  readonly membershipSource: 'federation-registry'
  readonly localAutonomy: 'constitutionally-bounded'
  readonly requirements: readonly ConstitutionalConditionKey[]
}

export interface ConstitutionalExecutionModel {
  readonly executionAuthority: ConstitutionalExecutionAuthority
  readonly executionChainAuthorized: boolean
  readonly executionModes: readonly GovernanceExecutionMode[]
  readonly remoteExecutionGuardrail: boolean
  readonly treasuryReviewRequired: boolean
  readonly reasonCodes: readonly ConstitutionalGuardrailReasonCode[]
  readonly reasonSeverity?: GuardrailReasonSeverity | null
}

export interface ConstitutionalGovernanceLayer {
  readonly capabilities: readonly ConstitutionalCapability[]
  readonly conditions: readonly ConstitutionalCondition[]
  readonly authorityModel: ConstitutionalAuthorityModel
  readonly federationModel: ConstitutionalFederationModel
  readonly executionModel: ConstitutionalExecutionModel
}

export type ChainConfigKey =
  | 'ETHEREUM_MAINNET'
  | 'ETHEREUM_SEPOLIA'
  | 'POLYGON_MAINNET'
  | 'HARMONY_MAINNET'
  | 'HARMONY_TESTNET'
  | 'BASE_MAINNET'
  | 'ARBITRUM_MAINNET'

export interface RpcEndpoint {
  readonly url: string
  readonly priority: number
  readonly weight?: number
}

export interface FinalityProfile {
  readonly confirmationBlocks: number
  readonly reorgWindowBlocks: number
}

export interface LayerZeroPeer {
  readonly endpointId: number
  readonly endpointAddress?: HexAddress
  readonly peerAddress?: HexAddress
  readonly messageTypes: readonly string[]
}

export interface OftEndpoint {
  readonly tokenAddress: HexAddress
  readonly endpointAddress: HexAddress
  readonly votingPowerStrategy: 'transport-only' | 'erc20-votes' | 'wrapped-votes' | 'snapshot-attestation'
}

export interface DeployedContracts {
  readonly osxDaoFactory?: HexAddress
  readonly pluginRepoRegistry?: HexAddress
  readonly pluginSetupProcessor?: HexAddress
  readonly axodusMultichainGovernanceRepo?: HexAddress
  readonly axodusMultichainGovernanceSetup?: HexAddress
}

export interface ChainCapabilities {
  readonly governance: boolean
  readonly voting: boolean
  readonly treasury: boolean
  readonly remoteExecution: boolean
  readonly constitutionalConditions: boolean
  readonly governanceNuclei: readonly GovernanceNucleus[]
  readonly constitutionalCompatibility: ConstitutionalCompatibility
  readonly constitutionalStanding: ConstitutionalStanding
  readonly governanceStatus: GovernanceStatus
  readonly localGovernanceModels: readonly string[]
  readonly constitutionalLayer: ConstitutionalGovernanceLayer
  readonly supportedPluginTypes: readonly IPluginInterfaceType[]
  readonly pluginCapabilities: Readonly<Partial<Record<IPluginInterfaceType, GovernancePluginCapability>>>
}

export interface GovernancePluginCapability {
  readonly interfaceType: IPluginInterfaceType
  readonly label: string
  readonly adapter: ChainAdapterKey
  readonly governanceNucleus: GovernanceNucleus
  readonly actions: Readonly<Record<GovernancePluginAction, boolean>>
  readonly executionModes: readonly GovernanceExecutionMode[]
  readonly votingPowerStrategy: VotingPowerStrategy
  readonly compatibleRoles: readonly ChainRole[]
  readonly constitutionalCompatibility: ConstitutionalCompatibility
  readonly constitutionalStanding: ConstitutionalStanding
  readonly governanceStatus: GovernanceStatus
  readonly requiresDeployment: boolean
  readonly requiresIndexer: boolean
  readonly legacy?: boolean
}

export interface ChainRegistryEntry {
  readonly chainId: number
  readonly slug: string
  readonly network: NetworksEnum
  readonly configKey: ChainConfigKey
  readonly name: string
  readonly family: ChainFamily
  readonly adapter: ChainAdapterKey
  readonly environment: ChainEnvironment
  readonly roles: readonly ChainRole[]
  readonly contractConfigFile?: string
  readonly legacyHarmonyAdapter?: boolean
  readonly governanceStatus: GovernanceStatus
  readonly federationMember: boolean
  readonly federationTier: FederationTier
  readonly nativeCurrency: {
    readonly symbol: string
    readonly decimals: number
  }
  readonly finality: FinalityProfile
  readonly rpc: readonly RpcEndpoint[]
  readonly contracts: DeployedContracts
  readonly layerZero?: {
    readonly endpointId: number
    readonly peers: readonly LayerZeroPeer[]
  }
  readonly oft?: readonly OftEndpoint[]
  readonly capabilities: ChainCapabilities
}
