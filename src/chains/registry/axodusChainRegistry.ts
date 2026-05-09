import type { ChainRegistryEntry, ChainRole } from '../types'
import { IPluginInterfaceType, NetworksEnum } from '@types'

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
    capabilities: {
      governance: true,
      voting: true,
      treasury: true,
      remoteExecution: true,
      constitutionalConditions: true,
      supportedPluginTypes: [
        IPluginInterfaceType.tokenVoting,
        IPluginInterfaceType.nativeTokenVoting,
        IPluginInterfaceType.multisig,
        IPluginInterfaceType.admin,
        IPluginInterfaceType.lockToVote,
        IPluginInterfaceType.gauge,
        IPluginInterfaceType.capitalDistributor,
        IPluginInterfaceType.spp,
      ],
    },
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
    capabilities: {
      governance: true,
      voting: true,
      treasury: true,
      remoteExecution: false,
      constitutionalConditions: false,
      supportedPluginTypes: [
        IPluginInterfaceType.tokenVoting,
        IPluginInterfaceType.nativeTokenVoting,
        IPluginInterfaceType.multisig,
        IPluginInterfaceType.admin,
        IPluginInterfaceType.harmonyVoting,
        IPluginInterfaceType.harmonyHipVoting,
        IPluginInterfaceType.harmonyDelegationVoting,
      ],
    },
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
    capabilities: {
      governance: true,
      voting: true,
      treasury: true,
      remoteExecution: false,
      constitutionalConditions: false,
      supportedPluginTypes: [
        IPluginInterfaceType.tokenVoting,
        IPluginInterfaceType.nativeTokenVoting,
        IPluginInterfaceType.multisig,
        IPluginInterfaceType.admin,
        IPluginInterfaceType.harmonyVoting,
        IPluginInterfaceType.harmonyHipVoting,
        IPluginInterfaceType.harmonyDelegationVoting,
      ],
    },
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
    capabilities: {
      governance: true,
      voting: true,
      treasury: true,
      remoteExecution: true,
      constitutionalConditions: true,
      supportedPluginTypes: [
        IPluginInterfaceType.tokenVoting,
        IPluginInterfaceType.nativeTokenVoting,
        IPluginInterfaceType.multisig,
        IPluginInterfaceType.admin,
        IPluginInterfaceType.lockToVote,
        IPluginInterfaceType.gauge,
        IPluginInterfaceType.capitalDistributor,
        IPluginInterfaceType.spp,
      ],
    },
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
    capabilities: {
      governance: true,
      voting: true,
      treasury: true,
      remoteExecution: true,
      constitutionalConditions: true,
      supportedPluginTypes: [
        IPluginInterfaceType.tokenVoting,
        IPluginInterfaceType.nativeTokenVoting,
        IPluginInterfaceType.multisig,
        IPluginInterfaceType.admin,
        IPluginInterfaceType.lockToVote,
        IPluginInterfaceType.gauge,
        IPluginInterfaceType.capitalDistributor,
        IPluginInterfaceType.spp,
      ],
    },
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
    capabilities: {
      governance: true,
      voting: true,
      treasury: true,
      remoteExecution: true,
      constitutionalConditions: true,
      supportedPluginTypes: [
        IPluginInterfaceType.tokenVoting,
        IPluginInterfaceType.nativeTokenVoting,
        IPluginInterfaceType.multisig,
        IPluginInterfaceType.admin,
        IPluginInterfaceType.lockToVote,
        IPluginInterfaceType.gauge,
        IPluginInterfaceType.capitalDistributor,
        IPluginInterfaceType.spp,
      ],
    },
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
    capabilities: {
      governance: true,
      voting: true,
      treasury: true,
      remoteExecution: true,
      constitutionalConditions: true,
      supportedPluginTypes: [
        IPluginInterfaceType.tokenVoting,
        IPluginInterfaceType.nativeTokenVoting,
        IPluginInterfaceType.multisig,
        IPluginInterfaceType.admin,
        IPluginInterfaceType.lockToVote,
        IPluginInterfaceType.gauge,
        IPluginInterfaceType.capitalDistributor,
        IPluginInterfaceType.spp,
      ],
    },
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
}

export const axodusChainRegistry = new AxodusChainRegistry()
