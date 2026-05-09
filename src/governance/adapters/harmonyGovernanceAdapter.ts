import { IPluginInterfaceType } from '@types'
import { HarmonyDelegationGovernance } from '@src/chains/adapters/harmony'
import type { GovernanceAdapter, GovernanceAdapterParams, GovernanceInstance } from './governanceAdapter'

export class HarmonyGovernanceAdapter implements GovernanceAdapter {
  private readonly supportedTypes = new Set<IPluginInterfaceType>([
    IPluginInterfaceType.harmonyVoting,
    IPluginInterfaceType.harmonyHipVoting,
    IPluginInterfaceType.harmonyDelegationVoting,
  ])

  supports(interfaceType: IPluginInterfaceType): boolean {
    return this.supportedTypes.has(interfaceType)
  }

  create(params: GovernanceAdapterParams): GovernanceInstance {
    if (!this.supports(params.interfaceType)) {
      throw new Error(`Unsupported Harmony governance type: ${params.interfaceType}`)
    }

    return new HarmonyDelegationGovernance(params.address, params.network)
  }
}
