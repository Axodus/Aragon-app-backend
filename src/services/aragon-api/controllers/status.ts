import config from '@config'
import dayjs from '@helpers/dayjs'
import * as packageJson from '@package'
import { type IStatusResponse } from '@types'
import { axodusChainRegistry } from '@src/chains'
import type { ChainRegistryEntry } from '@src/chains'

const requestedNetworkMatches = (chain: ChainRegistryEntry, network: string): boolean =>
  chain.network === network || chain.slug === network || chain.configKey === network

const isIndexingRequested = (chain: ChainRegistryEntry): boolean => {
  const requestedNetworks = config.SUPPORTED_NETWORKS ?? []
  return requestedNetworks.length === 0 || requestedNetworks.some(network => requestedNetworkMatches(chain, network))
}

const hasConfiguredRpc = (chain: ChainRegistryEntry): boolean => {
  const nodeConfig = config.NODES[chain.configKey]
  return Boolean(nodeConfig?.ARAGON_RPC || nodeConfig?.ALCHEMY_API_KEY || nodeConfig?.DRPC_API_KEY || chain.rpc.length)
}

const getIndexingStatus = (chain: ChainRegistryEntry) => {
  const requested = isIndexingRequested(chain)
  const rpcConfigured = hasConfiguredRpc(chain)

  if (!requested) {
    return {
      requested,
      rpcConfigured,
      status: 'disabled',
      message: 'Chain is present in the Axodus registry but is not enabled in SUPPORTED_NETWORKS.',
    }
  }

  if (!rpcConfigured) {
    return {
      requested,
      rpcConfigured,
      status: 'notConfigured',
      message: 'Chain is enabled but no RPC provider is configured for indexing.',
    }
  }

  return {
    requested,
    rpcConfigured,
    status: 'configured',
    message: 'Chain is enabled and has at least one RPC provider available for indexing.',
  }
}

const StatusController = {
  getStatus: (): IStatusResponse => ({
    status: 'healthy',
    appName: config.APP_NAME,
    service: config.SERVICES.ARAGON_API.NAME,
    nodeVersion: process.version,
    environment: config.ENVIRONMENT,
    supportedNetworks: config.SUPPORTED_NETWORKS,
    appVersionPackage: packageJson.version,
    time: dayjs().format(),
  }),

  getChainRegistry: () =>
    axodusChainRegistry.all().map(chain => ({
      chainId: chain.chainId,
      slug: chain.slug,
      network: chain.network,
      configKey: chain.configKey,
      name: chain.name,
      family: chain.family,
      adapter: chain.adapter,
      environment: chain.environment,
      roles: chain.roles,
      legacyHarmonyAdapter: chain.legacyHarmonyAdapter ?? false,
      finality: chain.finality,
      nativeCurrency: chain.nativeCurrency,
      capabilities: chain.capabilities,
      contractConfigFile: chain.contractConfigFile,
      indexingStatus: getIndexingStatus(chain),
    })),
}

export default StatusController
