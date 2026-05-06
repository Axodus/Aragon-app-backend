import type { ChainRegistryEntry, ChainRole } from '../types'

const registry: readonly ChainRegistryEntry[] = [
  {
    chainId: 1666600000,
    slug: 'harmony-mainnet',
    name: 'Harmony Mainnet',
    family: 'harmony',
    environment: 'mainnet',
    roles: ['voting', 'spoke'],
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
    },
  },
  {
    chainId: 1,
    slug: 'ethereum-mainnet',
    name: 'Ethereum Mainnet',
    family: 'evm',
    environment: 'mainnet',
    roles: ['execution', 'voting', 'spoke'],
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
    },
  },
  {
    chainId: 8453,
    slug: 'base-mainnet',
    name: 'Base Mainnet',
    family: 'evm',
    environment: 'mainnet',
    roles: ['voting', 'spoke'],
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

  byRole(role: ChainRole): readonly ChainRegistryEntry[] {
    return this.entries.filter(entry => entry.roles.includes(role))
  }
}

export const axodusChainRegistry = new AxodusChainRegistry()
