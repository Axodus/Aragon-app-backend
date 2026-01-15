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
    console.log(`[getInstallationHelpers] Looking for plugin installation:`)
    console.log(`  Network: ${network.toLowerCase()}`)
    console.log(`  Plugin: ${pluginAddress.toLowerCase()}`)

    const installation = await Models.LogPluginSetupProcessor.findOne({
      network: network.toLowerCase(),
      pluginAddress: pluginAddress.toLowerCase(),
      event: 'InstallationPrepared',
    })
      .select('helpers transactionHash blockNumber')
      .lean()

    console.log(`[getInstallationHelpers] Found installation:`, installation ? 'YES' : 'NO')

    if (!installation) {
      console.log(`[getInstallationHelpers] Querying collection directly...`)
      const count = await Models.LogPluginSetupProcessor.countDocuments({
        network: network.toLowerCase(),
        pluginAddress: pluginAddress.toLowerCase(),
      })
      console.log(`[getInstallationHelpers] Total docs with this plugin: ${count}`)
      throw new NotFoundError('Plugin installation not found')
    }

    console.log(`[getInstallationHelpers] Helpers:`, installation.helpers)

    return {
      helpers: installation.helpers || [],
    }
  },
}

export default PluginsController
