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
  readonly localGovernanceModels: readonly string[]
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
