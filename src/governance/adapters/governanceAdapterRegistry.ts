import { axodusChainRegistry } from '@src/chains'
import type { IPluginInterfaceType } from '@types'
import { EvmGovernanceAdapter } from './evmGovernanceAdapter'
import type { GovernanceAdapter, GovernanceAdapterParams, GovernanceInstance } from './governanceAdapter'
import { HarmonyGovernanceAdapter } from './harmonyGovernanceAdapter'

export class GovernanceAdapterRegistry {
  private readonly adapters: readonly GovernanceAdapter[] = [new EvmGovernanceAdapter(), new HarmonyGovernanceAdapter()]

  get(interfaceType: IPluginInterfaceType): GovernanceAdapter | undefined {
    return this.adapters.find(adapter => adapter.supports(interfaceType))
  }

  create(params: GovernanceAdapterParams): GovernanceInstance {
    const chain = axodusChainRegistry.byNetwork(params.network)
    if (!chain) throw new Error(`Unsupported governance network: ${params.network}`)

    const adapter = this.get(params.interfaceType)
    if (!adapter) throw new Error(`Unsupported plugin interface type: ${params.interfaceType}`)

    if (!chain.capabilities.supportedPluginTypes.includes(params.interfaceType)) {
      throw new Error(`Plugin ${params.interfaceType} is not supported on ${params.network}`)
    }

    return adapter.create(params)
  }
}

export const governanceAdapterRegistry = new GovernanceAdapterRegistry()
