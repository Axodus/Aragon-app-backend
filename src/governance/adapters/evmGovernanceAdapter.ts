import { IPluginInterfaceType, ITokenType } from '@types'
import { AdminGovernance } from '../adminGovernance'
import { CapitalDistributorGovernance } from '../capitalDistributorGovernance'
import { Erc20Governance } from '../erc20Governance'
import { GaugeGovernance } from '../gaugeGovernance'
import { LockToVoteGovernance } from '../lockToVoteGovernance'
import { MultisigGovernance } from '../multisigGovernance'
import { VeGovernance } from '../veGovernance'
import type { GovernanceAdapter, GovernanceAdapterParams, GovernanceInstance } from './governanceAdapter'

export class EvmGovernanceAdapter implements GovernanceAdapter {
  private readonly supportedTypes = new Set<IPluginInterfaceType>([
    IPluginInterfaceType.tokenVoting,
    IPluginInterfaceType.nativeTokenVoting,
    IPluginInterfaceType.lockToVote,
    IPluginInterfaceType.multisig,
    IPluginInterfaceType.admin,
    IPluginInterfaceType.capitalDistributor,
    IPluginInterfaceType.gauge,
  ])

  supports(interfaceType: IPluginInterfaceType): boolean {
    return this.supportedTypes.has(interfaceType)
  }

  create(params: GovernanceAdapterParams): GovernanceInstance {
    switch (params.interfaceType) {
      case IPluginInterfaceType.tokenVoting:
        if (params.tokenType === ITokenType.escrowAdapter) {
          return new VeGovernance(params.address, params.network, params.extraParams)
        }
        return new Erc20Governance(params.address, params.network)

      case IPluginInterfaceType.nativeTokenVoting:
        return new Erc20Governance(params.address, params.network)

      case IPluginInterfaceType.lockToVote:
        return new LockToVoteGovernance(params.address, params.network)

      case IPluginInterfaceType.multisig:
        return new MultisigGovernance(params.address, params.network)

      case IPluginInterfaceType.admin:
        return new AdminGovernance(params.address, params.network)

      case IPluginInterfaceType.capitalDistributor:
        return new CapitalDistributorGovernance(params.address, params.network)

      case IPluginInterfaceType.gauge:
        return new GaugeGovernance(params.address, params.network)

      default:
        throw new Error(`Unsupported EVM governance type: ${params.interfaceType}`)
    }
  }
}
