import logger from '@logger'
import { EnumConnection, EnumQueueName, EnumServiceName, type IService } from '@types'
import { TaskSchedulerState } from '@state/taskSchedulerState'
import { NetworkHelper } from '@helpers/network'
import configIndexer from '@indexer/configIndexer'
import utils from '@helpers/utils'
import { BlockchainLogCrawler } from '@modules/crawlers'
import { SyncAll } from '@indexer/syncAll'
import config from '@config'
import PoolingCrawler from '@modules/poolingCrawler'
import { Models } from '@dbModels'
import RabbitMQHelper from '@helpers/rabbitMQ'
import ConfigIndexerHelper from '@helpers/configIndexer'
import HarmonyVotingFinalizer from './harmonyVotingFinalizer'

import harmonyMainnetContracts from '../../../config/contracts/harmonyMainnet.json'
import harmonyTestnetContracts from '../../../config/contracts/harmonyTestnet.json'

const llo = logger.logMeta.bind(null, { service: 'service:IndexerService' })

type ContractsConfig = Record<string, Record<string, { address: string; blockNumber?: number; deploymentTx?: string }>>

const getIndexerCoreAddresses = async (networkName: string): Promise<string[] | undefined> => {
  const configByNetwork: Partial<Record<string, ContractsConfig>> = {
    'harmony-mainnet': harmonyMainnetContracts as unknown as ContractsConfig,
    'harmony-testnet': harmonyTestnetContracts as unknown as ContractsConfig,
  }

  const cfg = configByNetwork[networkName]
  if (!cfg) return undefined

  const versionKey = Object.keys(cfg)[0]
  const version = versionKey ? cfg[versionKey] : undefined
  if (!version) return undefined

  const candidates = [
    version.DAORegistryProxy?.address,
    version.PluginRepoRegistryProxy?.address,
    version.PluginSetupProcessor?.address,
  ]

  const addresses = candidates
    .filter((address): address is string => typeof address === 'string')
    .map(address => address.toLowerCase())
    .filter(address => address !== '0x0000000000000000000000000000000000000000')

  // CRITICAL FIX: Add all installed plugin addresses for this network
  try {
    const installedPlugins = await Models.Plugin.find({ 
      network: networkName,
      status: 'installed' 
    }).select('address').lean().exec()
    
    const pluginAddresses = installedPlugins
      .map(p => p.address?.toLowerCase())
      .filter((addr): addr is string => typeof addr === 'string' && addr !== '0x0000000000000000000000000000000000000000')
    
    if (pluginAddresses.length > 0) {
      logger.info(`Added ${pluginAddresses.length} installed plugin addresses to indexer for ${networkName}`, llo({ pluginAddresses }))
      addresses.push(...pluginAddresses)
    }
  } catch (error) {
    logger.warn('Failed to fetch installed plugins for indexer', llo({ networkName, error }))
  }

  return addresses.length > 0 ? addresses : undefined
}

const getHarmonyAdaptiveConfig = (networkName: string) => {
  if (networkName !== 'harmony-mainnet' && networkName !== 'harmony-testnet') return undefined

  // Harmony RPC costuma impor limites bem baixos em eth_getLogs (ex.: range <= 1024 blocos).
  // Usamos um batch inicial pequeno e um mínimo mais baixo para evitar ficar preso no limite.
  return {
    initialBatchDays: 0.02,
    minBatchDays: 0.001,
    maxBatchDays: 1,
  }
}

const AragonIndexerService: IService & { repeaters: any } = {
  name: EnumServiceName.ARAGON_INDEXER,
  NEED_CONNECTIONS: [EnumConnection.MONGODB, EnumConnection.BLOCKCHAIN, EnumConnection.RABBITMQ],
  options: { mongoSync: config.MONGO_DB.SYNC_MODELS },
  repeaters: {},

  start: async function () {
    logger.info('IndexerService historical started', llo({}))

    const networks = NetworkHelper.supportedNetworks()

    await Promise.all(
      networks.map(async ({ networkName }) => {
        const logService = ConfigIndexerHelper.builders.indexer(networkName)

        if (
          (networkName === 'harmony-mainnet' || networkName === 'harmony-testnet') &&
          config.NODES[utils.networkToAragon(networkName)]?.FROM_BLOCK === 0
        ) {
          logger.warn(
            'Harmony FROM_BLOCK is 0; historical sync can be extremely slow. Consider setting NODES_HARMONY_*_FROM_BLOCK near your deployment/first DAO block.',
            llo({ networkName }),
          )
        }

        const existingConfig = await Models.ConfigIndexer.findExistingLog({
          network: networkName,
          service: logService,
        })

        // sync historical data
        if (!existingConfig) {
          logger.info('HistoricalCrawler start', llo({ networkName }))
          const address = await getIndexerCoreAddresses(networkName)
          const historicalCrawler = new BlockchainLogCrawler({
            onlyHistorical: true,
            network: networkName,
            address,
            events: utils.filterArrayByProperty(configIndexer, 'enableHistorical'),
            adaptiveConfig: getHarmonyAdaptiveConfig(networkName),
            onError: async (error: any) => logger.error('Error Indexer', llo(error)),
            logService,
            stopOnError: true,
          })
          await historicalCrawler.crawl()
          logger.info('HistoricalCrawler end', llo({ networkName }))
        }

        // sync all metrics by network
        logger.info('Sync all metrics start', llo({ networkName }))
        await RabbitMQHelper.sendMessage(EnumQueueName.allMetrics, {
          id: `${EnumQueueName.allMetrics}-${networkName}`,
          params: { network: networkName },
        })

        // realtime after sync
        logger.info('PoolingCrawler start', llo({ networkName }))

        const taskOptions = {
          fn: () => [[{ poolingCrawler: PoolingCrawler, params: { logService, network: networkName } }]],
          interval: config.NODES[utils.networkToAragon(networkName)].POOLING_INTERVAL,
          checkInterval: config.NODES[utils.networkToAragon(networkName)].POOLING_INTERVAL / 2,
          runNow: true,
          stopOnError: false,
          onError: (error: any) => logger.error('Error pooling logs', llo({ networkName, error })),
        }

        const scheduler = TaskSchedulerState.getInstance()
        await scheduler.startTask(logService, taskOptions)
      }),
    )

    // re-sync all installed plugins
    if (config.SERVICES.ARAGON_INDEXER.SYNC_ALL) {
      logger.info('Sync all plugins start', llo({}))

      const taskOptions = {
        fn: () => [[{ syncAllPlugins: SyncAll }]],
        interval: 5 * 1000,
        runNow: true,
        stopOnError: false,
        onError: (error: any) => logger.error('Error sync all plugins', llo({ error })),
      }
      const scheduler = TaskSchedulerState.getInstance()
      await scheduler.startTask('allPlugins', taskOptions)
    }

    // harmony voting: finalize proposals automatically after endDate
    if (config.SERVICES.ARAGON_INDEXER.HARMONY_VOTING_FINALIZER?.ENABLED) {
      const taskOptions = {
        fn: () => [[{ harmonyVotingFinalizer: HarmonyVotingFinalizer }]],
        interval: config.SERVICES.ARAGON_INDEXER.HARMONY_VOTING_FINALIZER.INTERVAL,
        checkInterval: config.SERVICES.ARAGON_INDEXER.HARMONY_VOTING_FINALIZER.CHECK_INTERVAL,
        runNow: true,
        stopOnError: false,
        onError: (error: any) => logger.error('Error harmony voting finalizer', llo({ error })),
      }

      const scheduler = TaskSchedulerState.getInstance()
      await scheduler.startTask('harmonyVotingFinalizer', taskOptions)
    }
  },

  async stop() {
    const scheduler = TaskSchedulerState.getInstance()
    scheduler.stopTask('allPlugins')

    logger.info('IndexerService service stopped', llo({}))
  },
}

export default AragonIndexerService
