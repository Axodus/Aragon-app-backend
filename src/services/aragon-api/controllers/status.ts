import config from '@config'
import dayjs from '@helpers/dayjs'
import * as packageJson from '@package'
import { type IStatusResponse } from '@types'
import { axodusChainRegistry } from '@src/chains'
import type { ChainRegistryEntry, ConstitutionalGuardrailReason, ConstitutionalGuardrailReasonCode } from '@src/chains'

interface IndexingStatus {
  readonly requested: boolean
  readonly rpcConfigured: boolean
  readonly status: 'configured' | 'notConfigured' | 'disabled'
  readonly reasonCode: ConstitutionalGuardrailReasonCode | null
  readonly reasonSeverity: 'warning' | null
  readonly message: string
}

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

const getIndexingStatus = (chain: ChainRegistryEntry): IndexingStatus => {
  const requested = isIndexingRequested(chain)
  const rpcConfigured = hasConfiguredRpc(chain)

  if (!requested) {
    return {
      requested,
      rpcConfigured,
      status: 'disabled',
      reasonCode: 'INDEXER_STATE_NOT_READY',
      reasonSeverity: 'warning',
      message: 'Chain is present in the Axodus registry but is not enabled in SUPPORTED_NETWORKS.',
    }
  }

  if (!rpcConfigured) {
    return {
      requested,
      rpcConfigured,
      status: 'notConfigured',
      reasonCode: 'INDEXER_STATE_NOT_READY',
      reasonSeverity: 'warning',
      message: 'Chain is enabled but no RPC provider is configured for indexing.',
    }
  }

  return {
    requested,
    rpcConfigured,
    status: 'configured',
    reasonCode: null,
    reasonSeverity: null,
    message: 'Chain is enabled and has at least one RPC provider available for indexing.',
  }
}

const getGuardrailReasons = (
  chain: ChainRegistryEntry,
  indexingStatus: IndexingStatus,
): readonly ConstitutionalGuardrailReason[] => {
  const reasons: ConstitutionalGuardrailReason[] = []

  if (indexingStatus.reasonCode) {
    reasons.push({
      reasonCode: indexingStatus.reasonCode,
      reasonSeverity: indexingStatus.reasonSeverity ?? 'warning',
      source: 'indexer readiness',
      scope: chain.name,
      network: chain.network,
    })
  }

  chain.capabilities.constitutionalStanding.reasonCodes.forEach(reasonCode => {
    reasons.push({
      reasonCode,
      reasonSeverity: chain.capabilities.constitutionalStanding.reasonSeverity ?? 'constitutional',
      source: 'Constitutional Governance',
      scope: chain.name,
      network: chain.network,
    })
  })

  Object.entries(chain.capabilities.pluginCapabilities).forEach(([pluginType, capability]) => {
    capability?.constitutionalStanding.reasonCodes.forEach(reasonCode => {
      reasons.push({
        reasonCode,
        reasonSeverity: capability.constitutionalStanding.reasonSeverity ?? 'constitutional',
        source: 'plugin capability',
        scope: `${chain.name} / ${pluginType}`,
        network: chain.network,
        pluginType: capability.interfaceType,
      })
    })
  })

  return reasons
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
    axodusChainRegistry.all().map(chain => {
      const indexingStatus = getIndexingStatus(chain)

      return {
        chainId: chain.chainId,
        slug: chain.slug,
        network: chain.network,
        configKey: chain.configKey,
        name: chain.name,
        family: chain.family,
        adapter: chain.adapter,
        environment: chain.environment,
        roles: chain.roles,
        governanceStatus: chain.governanceStatus,
        federationMember: chain.federationMember,
        federationTier: chain.federationTier,
        constitutionalStanding: chain.capabilities.constitutionalStanding,
        legacyHarmonyAdapter: chain.legacyHarmonyAdapter ?? false,
        finality: chain.finality,
        nativeCurrency: chain.nativeCurrency,
        capabilities: chain.capabilities,
        contractConfigFile: chain.contractConfigFile,
        indexingStatus,
        guardrailReasons: getGuardrailReasons(chain, indexingStatus),
      }
    }),
}

export default StatusController
