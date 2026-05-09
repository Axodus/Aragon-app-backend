import { type ISupportedNetwork, NetworksEnum } from '@types'
import ProviderModule from '@modules/provider'
import config from '@config'
import utils from '@helpers/utils'
import { axodusChainRegistry } from '@src/chains'

export const NetworkHelper = {
  supportedNetworks(): ISupportedNetwork[] {
    const configuredNetworks = config.SUPPORTED_NETWORKS || []
    const networks = axodusChainRegistry
      .supportedNetworks(configuredNetworks)
      .map(chain => chain.network)
      .filter(network => Object.values(NetworksEnum).includes(network))

    const result = networks.reduce((acc: any, networkName) => {
      const provider = ProviderModule.getAnyRpcProvider(networkName)
      if (provider) {
        const rawNetwork = {
          networkName,
          provider,
        }
        acc.push(rawNetwork)
      }

      return acc
    }, [])

    return result as ISupportedNetwork[]
  },
  getAverageBlockTime(network: NetworksEnum): number {
    const chain = axodusChainRegistry.byNetwork(network)
    const networkConfig = config.NODES[chain?.configKey || utils.networkToAragon(network)]
    return networkConfig.INTERVAL_BLOCK_TIME
  },
}
