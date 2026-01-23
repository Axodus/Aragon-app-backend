import { NetworksEnum } from '@types'
import logger from '@logger'
import Web3Helper from '@helpers/web3'
import HarmonyRpc from '@helpers/harmonyRpc'

const llo = logger.logMeta.bind(null, { service: 'helpers:HarmonySnapshot' })

function parseHeaderUnixtime(header: any): number {
  const unixtime = header?.unixtime ?? header?.unixTime ?? header?.timestamp
  return Number(unixtime ?? 0)
}

function parseBlockEpoch(block: any): number {
  const epoch = block?.epoch ?? block?.epochNumber
  return Number(epoch ?? 0)
}

async function findLastBlockAtOrBeforeTimestamp(targetUnixSeconds: number, network: NetworksEnum): Promise<number> {
  const latestBlockNumber = await Web3Helper.getBlockNumber('latest', network)
  if (latestBlockNumber <= 0) {
    throw new Error(`Unable to resolve latest block number for ${network}`)
  }

  const latestHeader = await HarmonyRpc.getHeaderByNumber(latestBlockNumber, network)
  const latestTs = parseHeaderUnixtime(latestHeader)
  if (targetUnixSeconds >= latestTs) return latestBlockNumber

  let low = 0
  let high = latestBlockNumber

  // We want the greatest block with timestamp <= targetUnixSeconds.
  for (let i = 0; i < 80 && low < high; i++) {
    const mid = Math.floor((low + high + 1) / 2)
    const header = await HarmonyRpc.getHeaderByNumber(mid, network)
    const ts = parseHeaderUnixtime(header)

    if (ts <= targetUnixSeconds) {
      low = mid
    } else {
      high = mid - 1
    }
  }

  return low
}

export async function computeHarmonySnapshot(params: { endDate: number; network: NetworksEnum }): Promise<{
  endDate: number
  endBlock: number
  endEpoch: number
  snapshotEpoch: number
  snapshotBlock: number
  snapshotTimestamp: number
}> {
  const { endDate, network } = params

  if (![NetworksEnum.harmonyMainnet, NetworksEnum.harmonyTestnet].includes(network)) {
    throw new Error(`computeHarmonySnapshot only supports Harmony networks (got ${network})`)
  }

  try {
    const endBlock = await findLastBlockAtOrBeforeTimestamp(endDate, network)
    const endBlockData = await HarmonyRpc.getBlockByNumber(endBlock, network)
    const endEpoch = parseBlockEpoch(endBlockData)

    if (endEpoch < 2) {
      throw new Error(`End epoch too small to compute penultimate epoch (endEpoch=${endEpoch})`)
    }

    const snapshotEpoch = endEpoch - 2
    const snapshotBlock = await HarmonyRpc.epochLastBlock(snapshotEpoch, network)
    const snapshotHeader = await HarmonyRpc.getHeaderByNumber(snapshotBlock, network)
    const snapshotTimestamp = parseHeaderUnixtime(snapshotHeader)

    return {
      endDate,
      endBlock,
      endEpoch,
      snapshotEpoch,
      snapshotBlock,
      snapshotTimestamp,
    }
  } catch (error) {
    logger.error('Error computeHarmonySnapshot', llo({ network, endDate, error }))
    throw error
  }
}
