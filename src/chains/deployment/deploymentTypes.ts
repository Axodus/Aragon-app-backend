import type { HexAddress } from '@types'

export interface ContractDeploymentRef {
  readonly name: string
  readonly address: HexAddress
  readonly chainId: number
  readonly blockNumber?: number
  readonly transactionHash?: string
  readonly version?: string
}
