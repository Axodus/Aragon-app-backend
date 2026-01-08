import logger from '@logger'
import BottleneckModule from '@modules/bottleneck'
import ProviderModule from '@modules/provider'
import { retryRequest } from '@helpers/retryRequest'
import { type HexAddress, type NetworksEnum } from '@types'

const llo = logger.logMeta.bind(null, { service: 'helpers:HarmonyRpc' })

interface HarmonyHeader {
  blockNumber?: number
  unixtime?: number
  epoch?: number
  [key: string]: any
}

interface HarmonyBlock {
  number?: number
  timestamp?: number
  epoch?: number
  [key: string]: any
}

interface ValidatorInformationByBlock {
  validator?: {
    delegations?: any[]
    [key: string]: any
  }
  [key: string]: any
}

function getHarmonyProvider(network: NetworksEnum) {
  const provider = ProviderModule.getAnyRpcProvider(network)
  if (!provider) {
    throw new Error(`No RPC provider configured for network ${network}`)
  }
  return provider
}

async function callRpc<T>(method: string, params: any[], network: NetworksEnum): Promise<T> {
  const provider = getHarmonyProvider(network)

  return await retryRequest(async () =>
    BottleneckModule.getNodeLimiter(network).schedule(async () => provider.send(method, params)),
  )
}

const HarmonyRpc = {
  async getEpoch(network: NetworksEnum): Promise<number> {
    try {
      const epoch = await callRpc<any>('hmyv2_getEpoch', [], network)
      return Number(epoch)
    } catch (error) {
      logger.error('Error getEpoch', llo({ network, error }))
      throw error
    }
  },

  async epochLastBlock(epoch: number, network: NetworksEnum): Promise<number> {
    try {
      const blockNumber = await callRpc<any>('hmyv2_epochLastBlock', [epoch], network)
      return Number(blockNumber)
    } catch (error) {
      logger.error('Error epochLastBlock', llo({ network, epoch, error }))
      throw error
    }
  },

  async getHeaderByNumber(blockNumber: number, network: NetworksEnum): Promise<HarmonyHeader> {
    try {
      return await callRpc<HarmonyHeader>('hmyv2_getHeaderByNumber', [blockNumber], network)
    } catch (error) {
      logger.error('Error getHeaderByNumber', llo({ network, blockNumber, error }))
      throw error
    }
  },

  async getBlockByNumber(blockNumber: number, network: NetworksEnum): Promise<HarmonyBlock> {
    try {
      return await callRpc<HarmonyBlock>(
        'hmyv2_getBlockByNumber',
        [
          blockNumber,
          {
            inclTx: false,
            fullTx: false,
            inclStaking: false,
            withSigners: false,
          },
        ],
        network,
      )
    } catch (error) {
      logger.error('Error getBlockByNumber', llo({ network, blockNumber, error }))
      throw error
    }
  },

  async getElectedValidatorAddresses(network: NetworksEnum): Promise<HexAddress[]> {
    try {
      const addresses = await callRpc<any>('hmyv2_getElectedValidatorAddresses', [], network)
      return Array.isArray(addresses) ? (addresses as HexAddress[]) : []
    } catch (error) {
      logger.error('Error getElectedValidatorAddresses', llo({ network, error }))
      throw error
    }
  },

  async getAllValidatorAddresses(network: NetworksEnum): Promise<HexAddress[]> {
    try {
      const addresses = await callRpc<any>('hmyv2_getAllValidatorAddresses', [], network)
      return Array.isArray(addresses) ? (addresses as HexAddress[]) : []
    } catch (error) {
      logger.error('Error getAllValidatorAddresses', llo({ network, error }))
      throw error
    }
  },

  async getValidatorInformationByBlockNumber(
    validatorAddress: HexAddress,
    blockNumber: number,
    network: NetworksEnum,
  ): Promise<ValidatorInformationByBlock> {
    try {
      return await callRpc<ValidatorInformationByBlock>(
        'hmyv2_getValidatorInformationByBlockNumber',
        [validatorAddress, blockNumber],
        network,
      )
    } catch (error) {
      logger.error('Error getValidatorInformationByBlockNumber', llo({ network, validatorAddress, blockNumber, error }))
      throw error
    }
  },
}

export type { HarmonyHeader, HarmonyBlock, ValidatorInformationByBlock }
export default HarmonyRpc
