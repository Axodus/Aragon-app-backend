import logger from '@logger'
import { type IWeb3Provider, type IWeb3TokenBalance, NetworksEnum } from '@types'
import { Models } from '@dbModels'
import { ProxyToken } from '@modules/proxyToken'
import utils from '@helpers/utils'
import Alchemy from '@helpers/alchemy'
import Web3Utils from '@helpers/web3Utils'
import BlockScoutHelper from '@helpers/blockScout'
import Web3Helper from '@helpers/web3'
import { evmExplorerClient, EvmExplorerEnum, type EvmExplorerType } from '@helpers/evmExplorerClient'
import { ITransactionType } from '@src/types/transfer'
import { formatUnits } from 'ethers'

const llo = logger.logMeta.bind(null, { service: 'helpers:ProxyWeb3' })

const Web3Provider: IWeb3Provider = {
  getNativeBalance: async ({ address, network }) => {
    const balance = await Web3Helper.getNativeBalance(address, network)
    if (!Number(balance)) {
      return '0'
    }

    const token = await ProxyToken.saveAndGetToken(utils.zeroAddress, network)

    if (!token) {
      logger.error('token not found balance 0', llo())
      return '0'
    }

    const parsedBalance = Alchemy.handleAlchemyCrazyBalance(balance, token?.decimals)
    Alchemy.alchemyCrazyBalanceOnError(address, token?.address, network, balance, token?.decimals)
    return parsedBalance
  },

  getTokenBalances: async ({ address, network }) => {
    const tokensBalance = await Web3Helper.getTokenBalances(address, network)

    // Harmony (e outras redes sem Alchemy) não suportam `alchemy_getTokenBalances`.
    // Como fallback, usamos os tokens ERC20 já vistos no indexador de transfers/transactions
    // e consultamos `balanceOf` via RPC padrão.
    if (tokensBalance.length === 0 && network === NetworksEnum.harmonyMainnet) {
      try {
        const pluginTokenRows = (await Models.Plugin.aggregate([
          {
            $match: {
              network,
              daoAddress: address,
              tokenAddress: { $ne: null },
            },
          },
          {
            $group: {
              _id: '$tokenAddress',
              lastBlock: { $max: '$blockNumber' },
            },
          },
          { $sort: { lastBlock: -1 } },
          { $limit: 200 },
        ])) as Array<{ _id: string }>

        const tokenAddressRows = (await Models.Transaction.aggregate([
          {
            $match: {
              network,
              daoAddress: address,
              type: ITransactionType.erc20,
              tokenAddress: { $ne: null },
            },
          },
          {
            $group: {
              _id: '$tokenAddress',
              lastBlock: { $max: '$blockNumber' },
            },
          },
          { $sort: { lastBlock: -1 } },
          { $limit: 200 },
        ])) as Array<{ _id: string }>

        const candidateTokenAddresses = [...pluginTokenRows, ...tokenAddressRows]
          .map(row => row._id)
          .filter(Boolean)
          .filter(tokenAddress => tokenAddress !== utils.zeroAddress)
          .filter((tokenAddress, index, array) => array.indexOf(tokenAddress) === index)

        const results: IWeb3TokenBalance[] = []
        const concurrency = 10

        for (let i = 0; i < candidateTokenAddresses.length; i += concurrency) {
          const batch = candidateTokenAddresses.slice(i, i + concurrency)

          const batchResults = await Promise.all(
            batch.map(async tokenAddress => {
              const parsedTokenAddress = Web3Utils.parseAddress(tokenAddress) || tokenAddress

              const token = await ProxyToken.saveAndGetToken(parsedTokenAddress, network)
              if (!token) return null

              const rawBalance = await Web3Helper.getERC20Balance(address, parsedTokenAddress, network)
              if (rawBalance <= 0n) return null

              const balance: IWeb3TokenBalance = {
                contractAddress: parsedTokenAddress,
                tokenBalance: formatUnits(rawBalance, token.decimals ?? 18),
                originalBalance: rawBalance.toString(),
              }

              return balance
            }),
          )

          results.push(...(batchResults.filter(Boolean) as IWeb3TokenBalance[]))
        }

        return results
      } catch (error) {
        logger.warn('Harmony fallback getTokenBalances failed', llo({ address, network, error }))
        return []
      }
    }

    return (
      await Promise.all(
        tokensBalance.map(async (tokenBalance: IWeb3TokenBalance) => {
          if (tokenBalance.tokenBalance === utils.emptyData) return null

          const token = await ProxyToken.saveAndGetToken(tokenBalance.contractAddress, network)
          if (!token) return null

          return {
            contractAddress: Web3Utils.parseAddress(tokenBalance.contractAddress) || tokenBalance.contractAddress,
            tokenBalance: Alchemy.handleAlchemyCrazyBalance(tokenBalance.tokenBalance, token?.decimals),
            originalBalance: tokenBalance.tokenBalance,
          }
        }),
      )
    ).filter(Boolean) as IWeb3TokenBalance[]
  },

  fetchContractCreation: async ({ address, network }) => {
    const explorers: EvmExplorerType[] = [EvmExplorerEnum.BLOCKSCOUT, EvmExplorerEnum.ETHERSCAN, EvmExplorerEnum.ROUTESCAN]
    if (network === NetworksEnum.zksyncMainnet || network === NetworksEnum.zksyncSepolia) {
      explorers.unshift(EvmExplorerEnum.ZKSYNC)
    }

    const result = await utils.fallbackCall(
      explorers,
      async (explorerType: EvmExplorerType) => {
        return await evmExplorerClient.fetchContractCreation(explorerType, address, network)
      },
      {
        validate: (result: any) => !!result?.transactionHash,
        onError: (error: any, explorerType: any, index: any) => {
          logger.warn(
            `Failed to fetch contract creation from ${explorerType}`,
            llo({
              error: error.message,
              address,
              network,
              explorerType,
              attemptIndex: index,
            }),
          )
        },
      },
    )

    return result || { blockNumber: 0, transactionHash: null, address }
  },

  fetchContractSourceCode: async ({ address, network }) => {
    const explorers: EvmExplorerType[] = [EvmExplorerEnum.ETHERSCAN, EvmExplorerEnum.BLOCKSCOUT, EvmExplorerEnum.ROUTESCAN]
    if (network === NetworksEnum.zksyncMainnet || network === NetworksEnum.zksyncSepolia) {
      explorers.unshift(EvmExplorerEnum.ZKSYNC)
    }
    const result = await utils.fallbackCall(
      explorers,
      async (explorerType: EvmExplorerType) => {
        return await evmExplorerClient.fetchContractSourceCode(explorerType, address, network)
      },
      {
        validate: (result: any) => !!result,
        onError: (error: any, explorerType: any, index: any) => {
          logger.warn(
            `Failed to fetch contract source code from ${explorerType}`,
            llo({
              error: error.message,
              address,
              network,
              explorerType,
              attemptIndex: index,
            }),
          )
        },
      },
    )

    return result || null
  },

  searchDetailsOfContract: async ({ address, network }) => {
    return await BlockScoutHelper.searchDetails(address, network)
  },
}

export default Web3Provider
