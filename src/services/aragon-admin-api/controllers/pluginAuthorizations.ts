import { Models } from '@dbModels'
import logger from '@logger'

const llo = logger.logMeta.bind(null, { service: 'PluginAuthorizationsController' })

const PluginAuthorizationsController = {
  // Solicitar acesso ao plugin
  requestAccess: async ({ daoAddress, network, pluginSlug, requestedBy }: any) => {
    const existing = await Models.PluginAuthorization.findOne({
      daoAddress: daoAddress.toLowerCase(),
      network,
      pluginSlug,
    })

    if (existing) {
      return existing
    }

    const authorization = await Models.PluginAuthorization.create({
      daoAddress: daoAddress.toLowerCase(),
      network,
      pluginSlug,
      status: 'pending',
      requestedBy,
      requestedAt: new Date(),
    })

    logger.info('Plugin access requested', llo({ daoAddress, pluginSlug, network }))

    return authorization
  },

  // Aprovar acesso (admin only)
  approveAccess: async ({ daoAddress, network, pluginSlug, approvedBy }: any) => {
    const authorization = await Models.PluginAuthorization.findOneAndUpdate(
      {
        daoAddress: daoAddress.toLowerCase(),
        network,
        pluginSlug,
      },
      {
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
      },
      { new: true, upsert: true }
    )

    logger.info('Plugin access approved', llo({ daoAddress, pluginSlug, network }))

    return authorization
  },

  // Verificar se DAO tem acesso
  checkAccess: async ({ daoAddress, network, pluginSlug }: any) => {
    const authorization = await Models.PluginAuthorization.findOne({
      daoAddress: daoAddress.toLowerCase(),
      network,
      pluginSlug,
      status: 'approved',
    })

    return !!authorization
  },
}

export default PluginAuthorizationsController