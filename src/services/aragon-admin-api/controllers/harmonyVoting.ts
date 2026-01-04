import { type HexAddress, NetworksEnum } from '@types'
import HarmonyRpc from '@helpers/harmonyRpc'
import { computeHarmonySnapshot } from '@helpers/harmonySnapshot'
import MerkleTreeHelper from '@helpers/merkleTree'
import { Interface } from 'ethers'
import { HarmonyVotingPlugin } from '@artifacts/HarmonyVotingPlugin'

function pickFirstNumberLike(value: any, keys: string[]): string {
  for (const key of keys) {
    const v = value?.[key]
    if (v !== undefined && v !== null) return String(v)
  }
  return '0'
}

function pickDelegations(validatorInfo: any): any[] {
  const validator = validatorInfo?.validator
  const delegations = validator?.delegations
  return Array.isArray(delegations) ? delegations : []
}

function pickDelegatorAddress(delegation: any): HexAddress | null {
  const addr =
    delegation?.delegator_address ?? delegation?.delegatorAddress ?? delegation?.['delegator-address'] ?? delegation?.delegator
  return addr ? (String(addr) as HexAddress) : null
}

function pickDelegationAmount(delegation: any): string {
  const amount = delegation?.amount ?? delegation?.delegatedAmount ?? delegation?.['delegated-amount']
  return String(amount ?? '0')
}

const HarmonyVotingAdminController = {
  computeSnapshot: async (params: { network: NetworksEnum; endDate: number }) => {
    return await computeHarmonySnapshot({ network: params.network, endDate: params.endDate })
  },

  getValidatorWeightsAtSnapshot: async (params: {
    network: NetworksEnum
    snapshotBlock: number
    electedOnly: boolean
  }): Promise<{ entries: { address: HexAddress; amount: string }[] }> => {
    const { network, snapshotBlock, electedOnly } = params

    const validatorAddresses = electedOnly
      ? await HarmonyRpc.getElectedValidatorAddresses(network)
      : await HarmonyRpc.getAllValidatorAddresses(network)

    const entries: { address: HexAddress; amount: string }[] = []

    for (const validatorAddress of validatorAddresses) {
      const info = await HarmonyRpc.getValidatorInformationByBlockNumber(validatorAddress, snapshotBlock, network)
      const amount = pickFirstNumberLike(info, ['total-delegation', 'totalDelegation', 'total_delegation'])
      entries.push({ address: validatorAddress, amount })
    }

    return { entries }
  },

  getDelegatorWeightsForValidatorAtSnapshot: async (params: {
    network: NetworksEnum
    snapshotBlock: number
    validatorAddress: HexAddress
  }): Promise<{ entries: { address: HexAddress; amount: string }[] }> => {
    const { network, snapshotBlock, validatorAddress } = params

    const info = await HarmonyRpc.getValidatorInformationByBlockNumber(validatorAddress, snapshotBlock, network)
    const delegations = pickDelegations(info)

    const entries: { address: HexAddress; amount: string }[] = []

    for (const delegation of delegations) {
      const delegatorAddress = pickDelegatorAddress(delegation)
      if (!delegatorAddress) continue

      const amount = pickDelegationAmount(delegation)
      entries.push({ address: delegatorAddress, amount })
    }

    return { entries }
  },

  buildMerkle: async (params: { entries: { address: HexAddress; amount: string }[] }) => {
    return await MerkleTreeHelper.generateTreeWithProofs(params.entries)
  },

  encodeSetMerkleRootCalldata: async (params: {
    proposalId: number
    merkleRoot: string
    totalEligiblePower: string
  }) => {
    const iface = new Interface(HarmonyVotingPlugin.abi as any)
    const data = iface.encodeFunctionData('setMerkleRoot', [
      params.proposalId,
      params.merkleRoot,
      params.totalEligiblePower,
    ])
    return { data }
  },

  encodeSubmitVotingPowerCalldata: async (params: {
    proposalId: number
    voter: HexAddress
    votingPower: string
    proof: string[]
  }) => {
    const iface = new Interface(HarmonyVotingPlugin.abi as any)
    const data = iface.encodeFunctionData('submitVotingPower', [
      params.proposalId,
      params.voter,
      params.votingPower,
      params.proof,
    ])
    return { data }
  },
}

export default HarmonyVotingAdminController
