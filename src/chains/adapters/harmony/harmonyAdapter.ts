import type { HexAddress } from '@types'
import { toHarmonyHexAddress } from '@src/utils/harmonyAddressUtils'
import type { ChainGovernanceAdapter, VotingPowerSnapshot } from '../chainAdapter'
import type { ChainRegistryEntry } from '../../types'

export class HarmonyChainAdapter implements ChainGovernanceAdapter {
  constructor(readonly chain: ChainRegistryEntry) {}

  normalizeAddress(address: string): HexAddress {
    return toHarmonyHexAddress(address) as HexAddress
  }

  async getVotingPowerSnapshot(params: {
    readonly voter: HexAddress
    readonly snapshotBlock: number
    readonly strategy: VotingPowerSnapshot['source']
  }): Promise<VotingPowerSnapshot | null> {
    return {
      voter: this.normalizeAddress(params.voter),
      votingPower: '0',
      source: params.strategy === 'harmony-staking' ? 'harmony-staking' : params.strategy,
      block: {
        chainId: this.chain.chainId,
        blockNumber: params.snapshotBlock,
      },
    }
  }
}
