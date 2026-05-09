import type { HexAddress, IPluginInterfaceType, NetworksEnum } from '@types'

export type ChainRole = 'execution' | 'voting' | 'spoke'

export type ChainFamily = 'evm' | 'harmony' | 'future'

export type ChainEnvironment = 'mainnet' | 'testnet' | 'local'

export type ChainAdapterKey = 'evm' | 'harmony'

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
  readonly supportedPluginTypes: readonly IPluginInterfaceType[]
  readonly pluginCapabilities: Readonly<Partial<Record<IPluginInterfaceType, GovernancePluginCapability>>>
}

export interface GovernancePluginCapability {
  readonly interfaceType: IPluginInterfaceType
  readonly label: string
  readonly adapter: ChainAdapterKey
  readonly actions: Readonly<Record<GovernancePluginAction, boolean>>
  readonly executionModes: readonly GovernanceExecutionMode[]
  readonly votingPowerStrategy: VotingPowerStrategy
  readonly compatibleRoles: readonly ChainRole[]
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
