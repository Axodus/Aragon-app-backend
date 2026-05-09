import type { ChainRegistryEntry, ChainRole, GovernancePluginCapability } from '../types'
import { IPluginInterfaceType, NetworksEnum } from '@types'

const evmPluginCapabilities: Readonly<Partial<Record<IPluginInterfaceType, GovernancePluginCapability>>> = {
  [IPluginInterfaceType.tokenVoting]: {
    interfaceType: IPluginInterfaceType.tokenVoting,
    label: 'Token Voting',
    adapter: 'evm',
    actions: { createProposal: true, vote: true, execute: true, settings: true },
    executionModes: ['direct', 'remote', 'federal'],
    votingPowerStrategy: 'erc20-votes',
    compatibleRoles: ['execution', 'voting', 'spoke'],
    requiresDeployment: true,
    requiresIndexer: true,
  },
  [IPluginInterfaceType.nativeTokenVoting]: {
    interfaceType: IPluginInterfaceType.nativeTokenVoting,
    label: 'Native Token Voting',
    adapter: 'evm',
    actions: { createProposal: true, vote: true, execute: true, settings: true },
    executionModes: ['direct', 'remote', 'federal'],
    votingPowerStrategy: 'native-token-adapter',
    compatibleRoles: ['execution', 'voting', 'spoke'],
    requiresDeployment: true,
    requiresIndexer: true,
  },
  [IPluginInterfaceType.multisig]: {
    interfaceType: IPluginInterfaceType.multisig,
    label: 'Multisig',
    adapter: 'evm',
    actions: { createProposal: true, vote: true, execute: true, settings: true },
    executionModes: ['direct', 'remote', 'federal'],
    votingPowerStrategy: 'multisig-membership',
    compatibleRoles: ['execution', 'voting', 'spoke'],
    requiresDeployment: true,
    requiresIndexer: true,
  },
  [IPluginInterfaceType.admin]: {
    interfaceType: IPluginInterfaceType.admin,
    label: 'Admin',
    adapter: 'evm',
    actions: { createProposal: true, vote: false, execute: true, settings: true },
    executionModes: ['direct', 'remote', 'federal'],
    votingPowerStrategy: 'admin-permission',
    compatibleRoles: ['execution', 'spoke'],
    requiresDeployment: true,
    requiresIndexer: true,
  },
  [IPluginInterfaceType.lockToVote]: {
    interfaceType: IPluginInterfaceType.lockToVote,
    label: 'Lock To Vote',
    adapter: 'evm',
    actions: { createProposal: true, vote: true, execute: true, settings: true },
    executionModes: ['direct', 'remote', 'federal'],
    votingPowerStrategy: 'lock-to-vote',
    compatibleRoles: ['execution', 'voting', 'spoke'],
    requiresDeployment: true,
    requiresIndexer: true,
  },
  [IPluginInterfaceType.gauge]: {
    interfaceType: IPluginInterfaceType.gauge,
    label: 'Gauge',
    adapter: 'evm',
    actions: { createProposal: true, vote: true, execute: true, settings: true },
    executionModes: ['direct', 'remote', 'federal'],
    votingPowerStrategy: 'gauge-weight',
    compatibleRoles: ['execution', 'voting', 'spoke'],
    requiresDeployment: true,
    requiresIndexer: true,
  },
  [IPluginInterfaceType.capitalDistributor]: {
    interfaceType: IPluginInterfaceType.capitalDistributor,
    label: 'Capital Distributor',
    adapter: 'evm',
    actions: { createProposal: true, vote: false, execute: true, settings: true },
    executionModes: ['direct', 'remote', 'federal'],
    votingPowerStrategy: 'treasury-policy',
    compatibleRoles: ['execution', 'spoke'],
    requiresDeployment: true,
    requiresIndexer: true,
  },
  [IPluginInterfaceType.spp]: {
    interfaceType: IPluginInterfaceType.spp,
    label: 'Staged Proposal Processor',
    adapter: 'evm',
    actions: { createProposal: true, vote: false, execute: true, settings: true },
    executionModes: ['direct', 'remote', 'federal'],
    votingPowerStrategy: 'staged-proposal',
    compatibleRoles: ['execution', 'spoke'],
    requiresDeployment: true,
    requiresIndexer: true,
  },
}

const harmonyPluginCapabilities: Readonly<Partial<Record<IPluginInterfaceType, GovernancePluginCapability>>> = {
  [IPluginInterfaceType.tokenVoting]: {
    interfaceType: IPluginInterfaceType.tokenVoting,
    label: 'Token Voting',
    adapter: 'harmony',
    actions: { createProposal: true, vote: true, execute: true, settings: true },
    executionModes: ['legacy-adapter'],
    votingPowerStrategy: 'erc20-votes',
    compatibleRoles: ['voting', 'spoke'],
    requiresDeployment: true,
    requiresIndexer: true,
    legacy: true,
  },
  [IPluginInterfaceType.nativeTokenVoting]: {
    interfaceType: IPluginInterfaceType.nativeTokenVoting,
    label: 'Native Token Voting',
    adapter: 'harmony',
    actions: { createProposal: true, vote: true, execute: true, settings: true },
    executionModes: ['legacy-adapter'],
    votingPowerStrategy: 'native-token-adapter',
    compatibleRoles: ['voting', 'spoke'],
    requiresDeployment: true,
    requiresIndexer: true,
    legacy: true,
  },
  [IPluginInterfaceType.multisig]: {
    interfaceType: IPluginInterfaceType.multisig,
    label: 'Multisig',
    adapter: 'harmony',
    actions: { createProposal: true, vote: true, execute: true, settings: true },
    executionModes: ['legacy-adapter'],
    votingPowerStrategy: 'multisig-membership',
    compatibleRoles: ['voting', 'spoke'],
    requiresDeployment: true,
    requiresIndexer: true,
    legacy: true,
  },
  [IPluginInterfaceType.admin]: {
    interfaceType: IPluginInterfaceType.admin,
    label: 'Admin',
    adapter: 'harmony',
    actions: { createProposal: true, vote: false, execute: true, settings: true },
    executionModes: ['legacy-adapter'],
    votingPowerStrategy: 'admin-permission',
    compatibleRoles: ['spoke'],
    requiresDeployment: true,
    requiresIndexer: true,
    legacy: true,
  },
  [IPluginInterfaceType.harmonyVoting]: {
    interfaceType: IPluginInterfaceType.harmonyVoting,
    label: 'Harmony Voting',
    adapter: 'harmony',
    actions: { createProposal: true, vote: true, execute: true, settings: true },
    executionModes: ['legacy-adapter'],
    votingPowerStrategy: 'harmony-validator-snapshot',
    compatibleRoles: ['voting', 'spoke'],
    requiresDeployment: true,
    requiresIndexer: true,
    legacy: true,
  },
  [IPluginInterfaceType.harmonyHipVoting]: {
    interfaceType: IPluginInterfaceType.harmonyHipVoting,
    label: 'Harmony HIP Voting',
    adapter: 'harmony',
    actions: { createProposal: true, vote: true, execute: true, settings: true },
    executionModes: ['legacy-adapter'],
    votingPowerStrategy: 'harmony-validator-snapshot',
    compatibleRoles: ['voting', 'spoke'],
    requiresDeployment: true,
    requiresIndexer: true,
    legacy: true,
  },
  [IPluginInterfaceType.harmonyDelegationVoting]: {
    interfaceType: IPluginInterfaceType.harmonyDelegationVoting,
    label: 'Harmony Delegation Voting',
    adapter: 'harmony',
    actions: { createProposal: true, vote: true, execute: true, settings: true },
    executionModes: ['legacy-adapter'],
    votingPowerStrategy: 'harmony-delegation-snapshot',
    compatibleRoles: ['voting', 'spoke'],
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
  pluginCapabilities,
}: {
  governance: boolean
  voting: boolean
  treasury: boolean
  remoteExecution: boolean
  constitutionalConditions: boolean
  pluginCapabilities: Readonly<Partial<Record<IPluginInterfaceType, GovernancePluginCapability>>>
}) => ({
  governance,
  voting,
  treasury,
  remoteExecution,
  constitutionalConditions,
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
      pluginCapabilities: evmPluginCapabilities,
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
      pluginCapabilities: harmonyPluginCapabilities,
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
      pluginCapabilities: harmonyPluginCapabilities,
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
      pluginCapabilities: evmPluginCapabilities,
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
      pluginCapabilities: evmPluginCapabilities,
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
      pluginCapabilities: evmPluginCapabilities,
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
      pluginCapabilities: evmPluginCapabilities,
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
