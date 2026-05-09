import { axodusChainRegistry } from '../registry/axodusChainRegistry'
import type { ChainAdapterKey } from '../types'
import type { ChainGovernanceAdapter } from './chainAdapter'
import { EvmChainAdapter } from './evmAdapter'
import { HarmonyChainAdapter } from './harmony'

export class ChainAdapterRegistry {
  private readonly adapters = new Map<string, ChainGovernanceAdapter>()

  get(network: string): ChainGovernanceAdapter | undefined {
    const chain = axodusChainRegistry.byNetwork(network)
    if (!chain) return undefined

    const existing = this.adapters.get(chain.slug)
    if (existing) return existing

    const adapter = this.create(chain.adapter, chain.slug)
    if (!adapter) return undefined

    this.adapters.set(chain.slug, adapter)
    return adapter
  }

  private create(adapter: ChainAdapterKey, chainSlug: string): ChainGovernanceAdapter | undefined {
    const chain = axodusChainRegistry.bySlug(chainSlug)
    if (!chain) return undefined

    switch (adapter) {
      case 'evm':
        return new EvmChainAdapter(chain)
      case 'harmony':
        return new HarmonyChainAdapter(chain)
      default:
        return undefined
    }
  }
}

export const chainAdapterRegistry = new ChainAdapterRegistry()
