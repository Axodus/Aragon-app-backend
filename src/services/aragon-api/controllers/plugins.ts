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
    try {
      const installationLog = await Models.LogPluginSetupProcessor.findOne({
        pluginAddress,
        network,
        event: 'InstallationPrepared',
      })

      if (!installationLog) {
        logger.warn('Installation log not found for plugin', llo({ pluginAddress, network }))
        return { helpers: [] }
      }

      // Return helpers array (should be preserved from installation)
      return { helpers: installationLog.helpers || [] }
    } catch (error) {
      logger.warn('Error while getting installation helpers', llo({ error, pluginAddress, network }))
      throw error
    }
  },
}

export default PluginsController
