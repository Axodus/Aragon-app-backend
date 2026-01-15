import {
  EnumQueueName,
  type ILogPluginSetupProcessorParams,
  type IGetPluginsByDaoParams,
  type IPluginExtraParams,
} from '@types'
import RabbitMQHelper from '@helpers/rabbitMQ'
import config from '@config'
import logger from '@logger'
import { Models } from '@dbModels'
import { NotFoundError } from '@errors'

const llo = logger.logMeta.bind(null, { service: 'PluginsController' })

const PluginsController = {
  getInstallationData: async ({ pluginAddress, network }: IPluginExtraParams) => {
    try {
      return await RabbitMQHelper.sendMessage(
        EnumQueueName.pluginInstallationData,
        {
          id: `pluginInstallation-${pluginAddress}-${network}`,
          params: { address: pluginAddress, network },
        },
        { waitResponse: true, timeout: config.RABBITMQ.TIMEOUT },
      )
    } catch (error) {
      logger.warn('Error while getting plugin installation data', llo({ error, pluginAddress, network }))
      throw error
    }
  },
  getPluginsByDao: async (params: IGetPluginsByDaoParams) => {
    try {
      const plugins = await Models.Plugin.findByDaoWithFilters(params)

      logger.info(
        'Retrieved plugins by DAO',
        llo({
          daoAddress: params.daoAddress,
          network: params.network,
          count: plugins.length,
          filters: params,
        }),
      )

      return plugins
    } catch (error) {
      logger.warn('Error while getting plugins by DAO', llo({ error, params }))
      throw error
    }
  },

  getLogPluginSetupProcessor: async (extraParams: ILogPluginSetupProcessorParams) => {
    return await Models.LogPluginSetupProcessor.findOne(extraParams)
  },

  getInstallationHelpers: async ({ pluginAddress, network }: IPluginExtraParams) => {
    logger.info('Looking for plugin installation', llo({ network, pluginAddress }))

    const installation = await Models.LogPluginSetupProcessor.findOne({
      network: network.toLowerCase(),
      pluginAddress: pluginAddress.toLowerCase(),
      event: 'InstallationPrepared',
    })
      .select('helpers transactionHash blockNumber _metadata')
      .lean()

    logger.info(
      'Plugin installation query result',
      llo({
        found: !!installation,
        network,
        pluginAddress,
      }),
    )

    if (!installation) {
      const count = await Models.LogPluginSetupProcessor.countDocuments({
        network: network.toLowerCase(),
        pluginAddress: pluginAddress.toLowerCase(),
      })

      logger.warn(
        'Plugin installation not found',
        llo({
          network,
          pluginAddress,
          totalDocsWithPlugin: count,
        }),
      )

      throw new NotFoundError('Plugin installation not found')
    }

    logger.info(
      'Plugin installation helpers retrieved',
      llo({
        network,
        pluginAddress,
        helpersCount: installation.helpers?.length || 0,
        helpers: installation.helpers,
        source: installation._metadata?.source,
      }),
    )

    return {
      helpers: installation.helpers || [],
      metadata: {
        transactionHash: installation.transactionHash,
        blockNumber: installation.blockNumber,
        source: installation._metadata?.source || 'indexer',
      },
    }
  },
}

export default PluginsController
