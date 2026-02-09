import logger from '@logger'
import BottleneckModule from '@modules/bottleneck'
import ProviderModule from '@modules/provider'
import { retryRequest } from '@helpers/retryRequest'
import utils from '@helpers/utils'
import { type HexAddress, type NetworksEnum } from '@types'
import { JsonRpcProvider } from 'ethers'
import config from '@config'

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

const fallbackProviders = new Map<NetworksEnum, JsonRpcProvider>()

const getDefaultHarmonyRpcUrl = (network: NetworksEnum): string | undefined => {
  if (network === 'harmony-mainnet') return 'https://api.harmony.one'
  if (network === 'harmony-testnet') return 'https://api.s0.b.hmny.io'
  return undefined
}

const getHarmonyRpcUrlFromEnv = (network: NetworksEnum): string | undefined => {
  const networkKey = utils.networkToAragon(network)
  if (!networkKey) return undefined
  const nodeConfig = (config.NODES as any)?.[networkKey]
  const url = nodeConfig?.ARAGON_RPC

  if (typeof url !== 'string') return undefined
  const trimmed = url.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function getHarmonyProvider(network: NetworksEnum) {
  const provider = ProviderModule.getAnyRpcProvider(network)
  if (!provider) {
    const envUrl = getHarmonyRpcUrlFromEnv(network)
    const fallbackUrl = getDefaultHarmonyRpcUrl(network)
    const effectiveUrl = envUrl ?? fallbackUrl

    if (!effectiveUrl) {
      throw new Error(`No RPC provider configured for network ${network}`)
    }

    const cached = fallbackProviders.get(network)
    if (cached) return cached

    logger.warn('No Harmony RPC provider available; using fallback endpoint', llo({ network, rpcUrl: effectiveUrl }))
    const fallback = new JsonRpcProvider(effectiveUrl)
    fallbackProviders.set(network, fallback)
    return fallback
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

  async getValidatorInformation(validatorAddress: HexAddress, network: NetworksEnum): Promise<any> {
    try {
      return await callRpc<any>('hmyv2_getValidatorInformation', [validatorAddress], network)
    } catch (error) {
      logger.error('Error getValidatorInformation', llo({ network, validatorAddress, error }))
      throw error
    }
  },

  async getDelegationsByValidator(validatorAddress: HexAddress, network: NetworksEnum): Promise<any[]> {
    try {
      const delegations = await callRpc<any>('hmyv2_getDelegationsByValidator', [validatorAddress], network)
      return Array.isArray(delegations) ? delegations : []
    } catch (error) {
      logger.error('Error getDelegationsByValidator', llo({ network, validatorAddress, error }))
      throw error
    }
  },

  async getDelegationsByDelegator(delegatorAddress: HexAddress, network: NetworksEnum): Promise<any[]> {
    try {
      const delegations = await callRpc<any>('hmyv2_getDelegationsByDelegator', [delegatorAddress], network)
      return Array.isArray(delegations) ? delegations : []
    } catch (error) {
      logger.error('Error getDelegationsByDelegator', llo({ network, delegatorAddress, error }))
      throw error
    }
  },
}

export type { HarmonyHeader, HarmonyBlock, ValidatorInformationByBlock }
export default HarmonyRpc
