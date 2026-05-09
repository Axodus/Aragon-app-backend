import type { HexAddress, IPluginInterfaceType, ITokenType, NetworksEnum } from '@types'
import type { BaseGovernance } from '../baseGovernance'

export type GovernanceInstance = BaseGovernance

export interface GovernanceAdapterParams {
  address: HexAddress
  network: NetworksEnum
  interfaceType: IPluginInterfaceType
  tokenType?: ITokenType
  extraParams?: {
    escrowAdapterAddress?: HexAddress
  }
}

export interface GovernanceAdapter {
  supports(interfaceType: IPluginInterfaceType): boolean
  create(params: GovernanceAdapterParams): GovernanceInstance
}
