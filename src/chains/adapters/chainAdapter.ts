import type { HexAddress } from '@types'
import type { ChainRegistryEntry } from '../types'

export interface NormalizedBlockRef {
  readonly chainId: number
  readonly blockNumber: number
  readonly blockHash?: string
  readonly timestamp?: number
}

export interface VotingPowerSnapshot {
  readonly voter: HexAddress
  readonly votingPower: string
  readonly source: 'erc20-votes' | 'wrapped-votes' | 'harmony-staking' | 'merkle-snapshot' | 'oracle'
  readonly block: NormalizedBlockRef
}

export interface ChainGovernanceAdapter {
  readonly chain: ChainRegistryEntry

  normalizeAddress(address: string): HexAddress

  getVotingPowerSnapshot(params: {
    readonly voter: HexAddress
    readonly snapshotBlock: number
    readonly strategy: VotingPowerSnapshot['source']
  }): Promise<VotingPowerSnapshot | null>
}
