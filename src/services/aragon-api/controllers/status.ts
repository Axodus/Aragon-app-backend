import config from '@config'
import dayjs from '@helpers/dayjs'
import * as packageJson from '@package'
import { type IStatusResponse } from '@types'
import { axodusChainRegistry } from '@src/chains'

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
    })),
}

export default StatusController
