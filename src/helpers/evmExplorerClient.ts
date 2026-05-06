import logger from '@logger'
import axios from 'axios'
import config from '@config'
import {
  type HexAddress,
  type IWeb3TokenBalance,
  type IEtherScanSource,
  type IWeb3ContractCreation,
  NetworksEnum,
} from '@types'
import { retryRequest } from '@helpers/retryRequest'
import BottleneckModule from '@modules/bottleneck'
import ProviderModule from '@modules/provider'
import utils from '@helpers/utils'
import { ethers } from 'ethers'
import Web3Utils from '@helpers/web3Utils'

const llo = logger.logMeta.bind(null, { service: 'helpers:EvmExplorerClient' })

export const EvmExplorerEnum = {
  ETHERSCAN: 'etherscan',
  ROUTESCAN: 'routescan',
  CHILIZ: 'chiliz',
  BLOCKSCOUT: 'blockscout',
  ZKSYNC: 'zksync',
} as const

export type EvmExplorerType = (typeof EvmExplorerEnum)[keyof typeof EvmExplorerEnum]

class EvmExplorerClient {
  private readonly configs: Record<string, any> = {
    [EvmExplorerEnum.ETHERSCAN]: {
      buildUrlAndParams: (network: NetworksEnum, customParams = {}) => ({
        url: config.ETHERSCAN_API.BASE_URI,
        params: {
          ...customParams,
          apikey: config.ETHERSCAN_API.API_KEY,
          chainid: ProviderModule.getChainId(network),
        },
      }),
    },
    [EvmExplorerEnum.ROUTESCAN]: {
      buildUrlAndParams: (network: NetworksEnum, customParams = {}, urlSegments = '') => {
        const chainId = ProviderModule.getChainId(network)
        return {
          url: `${config.ROUTESCAN_API.BASE_URI}/${chainId}/${urlSegments || 'etherscan/api'}`,
          params: customParams,
        }
      },
    },
    [EvmExplorerEnum.BLOCKSCOUT]: {
      buildUrlAndParams: (network: NetworksEnum, customParams = {}) => {
        const networkConfig = config.NODES[utils.networkToAragon(network)]
        const baseUrl = networkConfig?.BLOCKSCOUT_API_URL
        if (!baseUrl) return null

        const apiKey = networkConfig?.BLOCKSCOUT_API_KEY
        return {
          url: `${baseUrl}`,
          params: {
            ...customParams,
            ...(apiKey ? { apikey: apiKey } : {}),
          },
        }
      },
    },
    [EvmExplorerEnum.CHILIZ]: {
      buildUrlAndParams: (_network: NetworksEnum, customParams = {}) => {
        const baseUrl = `${config.CHILIZ_API_URL}/api`
        return {
          url: baseUrl,
          params: {
            ...customParams,
          },
        }
      },
    },
    [EvmExplorerEnum.ZKSYNC]: {
      buildUrlAndParams: (network: NetworksEnum, customParams = {}) => {
        const networkKeyName = network === NetworksEnum.zksyncMainnet ? 'MAINNET_BASE_URI' : 'SEPOLIA_BASE_URI'
        const baseUrl = config.ZKSYNC_BLOCK_EXPLORER_API[networkKeyName]
        return {
          url: baseUrl,
          params: {
            ...customParams,
          },
        }
      },
    },
  }

  private async apiCall(explorerType: EvmExplorerType, params: object, network: NetworksEnum, urlSegments = '') {
    try {
      const explorerConfig = this.configs[explorerType]
      if (!explorerConfig || typeof explorerConfig.buildUrlAndParams !== 'function') {
        return null
      }

      const built = explorerConfig.buildUrlAndParams(network, params, urlSegments) as
        | {
            url: string
            params: object
          }
        | null
      if (!built) {
        return null
      }

      const { url, params: requestParams } = built

      const limiter =
        explorerType === EvmExplorerEnum.BLOCKSCOUT
          ? BottleneckModule.getBlockScoutLimiter(network)
          : explorerType === EvmExplorerEnum.CHILIZ
            ? BottleneckModule.getChilizLimiter(network)
            : BottleneckModule.getEtherScanLimiter(network)

      const response = await retryRequest(async () => limiter.schedule(async () => axios.get(url, { params: requestParams })))

      return response?.data
    } catch (error) {
      logger.warn('Error API call evm explorer', llo({ error, params, urlSegments, explorerType }))
      throw error
    }
  }

  async getTokenBalances(
    explorerType: EvmExplorerType,
    address: HexAddress,
    network: NetworksEnum,
  ): Promise<IWeb3TokenBalance[]> {
    try {
      const params = {
        module: 'account',
        action: 'addresstokenbalance',
        address,
      }

      const response = await this.apiCall(explorerType, params, network)

      return (
        response?.result
          ?.filter(
            (token: any) => token.TokenName.length > 0 && token.TokenSymbol.length > 0 && token.TokenDivisor.length > 0,
          )
          ?.map((token: any) => ({
            contractAddress: Web3Utils.parseAddress(token.TokenAddress) || token.TokenAddress,
            name: token.TokenName,
            symbol: token.TokenSymbol,
            decimals: Number(token.TokenDivisor),
            tokenBalance: utils.parseTokenBalance(token.TokenQuantity, Number(token.TokenDivisor)),
            originalBalance: token.TokenQuantity,
            priceUsd: token.TokenPriceUSD,
          })) ?? []
      )
    } catch (error) {
      logger.warn('Error fetching token balances', llo({ error, address, network, explorerType }))
      return []
    }
  }

  async fetchContractSourceCode(
    explorerType: EvmExplorerType,
    address: HexAddress,
    network: NetworksEnum,
  ): Promise<IEtherScanSource[] | null> {
    try {
      const params = {
        module: 'contract',
        action: 'getsourcecode',
        address,
      }

      const response = await this.apiCall(explorerType, params, network)
      const parsed = this.parseSourceCodeResponse(response)
      if (parsed) return parsed

      // Fallback: some explorers (or endpoints) only expose ABI via `action=getabi`.
      try {
        const abiParams = {
          module: 'contract',
          action: 'getabi',
          address,
        }
        const abiResponse = await this.apiCall(explorerType, abiParams, network)
        const abiResult = abiResponse?.result
        if (
          abiResponse?.status === '1' &&
          abiResponse?.message === 'OK' &&
          typeof abiResult === 'string' &&
          abiResult !== '' &&
          abiResult !== '[]'
        ) {
          // Validate that it looks like JSON ABI.
          try {
            JSON.parse(abiResult)
          } catch {
            return null
          }
          return [
            {
              SourceCode: '',
              ContractName: '',
              ABI: abiResult,
              CompilerVersion: '',
            },
          ]
        }
      } catch (e) {
        logger.warn('Fallback getabi failed', llo({ error: e, address, network, explorerType }))
      }

      return null
    } catch (error) {
      logger.warn('Error fetching contract source code', llo({ error, address, network, explorerType }))
      return null
    }
  }

  async fetchContractCreation(
    explorerType: EvmExplorerType,
    address: HexAddress,
    network: NetworksEnum,
  ): Promise<IWeb3ContractCreation> {
    try {
      const params = {
        module: 'contract',
        action: 'getcontractcreation',
        contractaddresses: address,
      }

      const result = await this.apiCall(explorerType, params, network)
      const parsed = this.parseContractCreationResponse(result, address)

      if (parsed.transactionHash && !parsed.blockNumber) {
        const blockNumber = await this.getBlockNumberFromTxHash(parsed.transactionHash, network)
        return { ...parsed, blockNumber }
      }

      return parsed
    } catch (error) {
      logger.warn('Error fetching contract creation', llo({ error, address, network, explorerType }))
      return { blockNumber: 0, transactionHash: '', address }
    }
  }

  private async getBlockNumberFromTxHash(txHash: string, network: NetworksEnum): Promise<number> {
    try {
      const provider = ProviderModule.getAnyRpcProvider(network)
      const receipt = await provider.getTransactionReceipt(txHash)
      return receipt?.blockNumber || 0
    } catch (error) {
      logger.warn('Error fetching block number from tx hash', llo({ error, txHash, network }))
      return 0
    }
  }

  // Parser methods
  private parseSourceCodeResponse(response: any): IEtherScanSource[] | null {
    if (
      response?.status === '1' &&
      response?.message === 'OK' &&
      response?.result?.length > 0 &&
      response.result[0].ABI !== undefined &&
      response.result[0].ABI !== ''
    ) {
      const name = response.result[0].ContractName
      const ContractName = name.split(':').pop() || name
      return [
        {
          // Some explorers (e.g. Harmony) may return ABI but an empty SourceCode.
          // The caller can still use the ABI (without NatSpec enrichment).
          SourceCode: response.result[0].SourceCode || '',
          ContractName,
          ABI: response.result[0].ABI,
          CompilerVersion: response.result[0].CompilerVersion || response.result[0].CompilerType,
        },
      ]
    }
    return null
  }

  private parseContractCreationResponse(response: any, address: HexAddress): IWeb3ContractCreation {
    if (response?.status === '1' && response?.message === 'OK' && response?.result?.length > 0) {
      return {
        address: ethers.getAddress(response.result[0].contractAddress || address),
        transactionHash: response.result[0].txHash || '',
        blockNumber: response.result[0].blockNumber || 0,
      }
    }
    return { address, transactionHash: '', blockNumber: 0 }
  }

  async fetchTokenInfo(explorerType: EvmExplorerType, address: HexAddress, network: NetworksEnum) {
    try {
      const params = {
        module: 'token',
        action: 'tokeninfo',
        contractaddress: address,
      }

      const response = await this.apiCall(explorerType, params, network)
      return this.parseTokenInfoResponse(response)
    } catch (error) {
      logger.warn('Error fetching token info', llo({ error, address, network, explorerType }))
      return null
    }
  }

  private parseTokenInfoResponse(response: any): any {
    if (response?.status === '1' && response?.message === 'OK' && response?.result?.length > 0) {
      return {
        name: response.result[0].tokenName,
        symbol: response.result[0].symbol,
        decimals: response.result[0].tokenDecimal || response.result[0].divisor || 0,
        priceUsd: response.result[0].tokenPriceUSD || '0',
        totalSupply: response.result[0].totalSupply || '0',
      }
    }
  }

  async fetchNativeTokenPrice(explorerType: EvmExplorerType, network: NetworksEnum): Promise<string> {
    try {
      const params = {
        module: 'stats',
        action: 'ethprice',
      }

      const response = await this.apiCall(explorerType, params, network)

      if (response?.status === '1' && response?.message === 'OK' && response?.result?.ethusd) {
        return response.result.ethusd
      }

      return '0'
    } catch (error) {
      logger.warn('Error fetching native token price', llo({ error, network, explorerType }))
      return '0'
    }
  }
}

export const evmExplorerClient = new EvmExplorerClient()
