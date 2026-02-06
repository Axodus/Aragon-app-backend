import Router, { type RouterContext } from '@koa/router'
import {
  type HexAddress,
  type IEventLogPluginType,
  type IGetPluginsByDaoParams,
  type ILogPluginSetupProcessorParams,
  type IPluginExtraParams,
  type IPluginInterfaceType,
  NetworksEnum,
} from '@types'
import ValidationSchema from '@helpers/validationSchema'
import PluginSchema from '@api/routers/schema/plugin'
import PluginsController from '@api/controllers/plugins'
import Utils from '@src/helpers/utils'

const PluginRouter = {
  async getInstallationData(ctx: RouterContext) {
    const result = await ValidationSchema.validateRoute(ctx, {
      extraParams: {
        pluginAddress: ctx.query.pluginAddress as HexAddress,
        network: ctx.query.network as NetworksEnum,
      },
      schemas: {
        extra: PluginSchema.getInstallationData,
      },
    })

    ctx.body = await PluginsController.getInstallationData(result.extraParams as IPluginExtraParams)
  },

  async getPluginsByDao(ctx: RouterContext) {
    const result = await ValidationSchema.validateRoute(ctx, {
      params: {
        network: ctx.params.network,
        daoAddress: ctx.params.daoAddress,
      },
      extraParams: {
        interfaceType: ctx.query.interfaceType as IPluginInterfaceType,
        status: ctx.query.status,
        isProcess: Utils.parseBoolean(ctx.query.isProcess),
        isSupported: Utils.parseBoolean(ctx.query.isSupported),
      },
      schemas: {
        params: PluginSchema.getPluginsByDaoUrlParams,
        extra: PluginSchema.getPluginsByDaoQueryParams,
      },
    })

    const controllerParams = {
      ...result.params,
      ...result.extraParams,
    }

    ctx.body = await PluginsController.getPluginsByDao(controllerParams as IGetPluginsByDaoParams)
  },

  getLogPluginSetupProcessor: async function (ctx: RouterContext) {
    const result = await ValidationSchema.validateRoute(ctx, {
      params: {
        pluginAddress: ctx.params.pluginAddress,
        network: ctx.params.network as NetworksEnum,
        event: ctx.params.event as IEventLogPluginType,
      },
      schemas: {
        params: PluginSchema.getLogPluginSetupProcessor,
      },
    })

    ctx.body = await PluginsController.getLogPluginSetupProcessor(result.params as ILogPluginSetupProcessorParams)
  },

  getInstallationHelpers: async function (ctx: RouterContext) {
    const result = await ValidationSchema.validateRoute(ctx, {
      params: {
        network: ctx.params.network as NetworksEnum,
        pluginAddress: ctx.params.pluginAddress,
      },
      schemas: {
        params: PluginSchema.getInstallationHelpers,
      },
    })

    ctx.body = await PluginsController.getInstallationHelpers(result.params as IPluginExtraParams)
  },

  getHarmonyValidatorConfig: async function (ctx: RouterContext) {
    const result = await ValidationSchema.validateRoute(ctx, {
      params: {
        network: ctx.params.network as NetworksEnum,
        pluginAddress: ctx.params.pluginAddress,
      },
      schemas: {
        params: PluginSchema.getHarmonyValidatorConfig,
      },
    })

    ctx.body = await PluginsController.getHarmonyValidatorConfig(result.params as IPluginExtraParams)
  },

  getHarmonyValidatorInfo: async function (ctx: RouterContext) {
    const result = await ValidationSchema.validateRoute(ctx, {
      params: {
        network: ctx.params.network as NetworksEnum,
        validatorAddress: ctx.params.validatorAddress,
      },
      requireRule: ({ params }) => {
        const harmonyNetworks = [NetworksEnum.harmonyMainnet, NetworksEnum.harmonyTestnet]
        return harmonyNetworks.includes(params.network)
          ? null
          : 'Harmony validator info is only available on Harmony networks.'
      },
      schemas: {
        params: PluginSchema.getHarmonyValidatorInfo,
      },
    })

    ctx.body = await PluginsController.getHarmonyValidatorInfo(result.params as { network: NetworksEnum; validatorAddress: string })
  },

  getHarmonyDelegationsByValidator: async function (ctx: RouterContext) {
    const result = await ValidationSchema.validateRoute(ctx, {
      params: {
        network: ctx.params.network as NetworksEnum,
        validatorAddress: ctx.params.validatorAddress,
      },
      requireRule: ({ params }) => {
        const harmonyNetworks = [NetworksEnum.harmonyMainnet, NetworksEnum.harmonyTestnet]
        return harmonyNetworks.includes(params.network)
          ? null
          : 'Harmony delegations are only available on Harmony networks.'
      },
      schemas: {
        params: PluginSchema.getHarmonyDelegationsByValidator,
      },
    })

    ctx.body = await PluginsController.getHarmonyDelegationsByValidator(result.params as {
      network: NetworksEnum
      validatorAddress: string
    })
  },

  getHarmonyDelegationsByDelegator: async function (ctx: RouterContext) {
    const result = await ValidationSchema.validateRoute(ctx, {
      params: {
        network: ctx.params.network as NetworksEnum,
        delegatorAddress: ctx.params.delegatorAddress,
      },
      requireRule: ({ params }) => {
        const harmonyNetworks = [NetworksEnum.harmonyMainnet, NetworksEnum.harmonyTestnet]
        return harmonyNetworks.includes(params.network)
          ? null
          : 'Harmony delegations are only available on Harmony networks.'
      },
      schemas: {
        params: PluginSchema.getHarmonyDelegationsByDelegator,
      },
    })

    ctx.body = await PluginsController.getHarmonyDelegationsByDelegator(result.params as {
      network: NetworksEnum
      delegatorAddress: string
    })
  },

  getDelegationVotingValidator: async function (ctx: RouterContext) {
    const result = await ValidationSchema.validateRoute(ctx, {
      params: {
        network: ctx.params.network as NetworksEnum,
        pluginAddress: ctx.params.pluginAddress,
      },
      requireRule: ({ params }) => {
        const harmonyNetworks = [NetworksEnum.harmonyMainnet, NetworksEnum.harmonyTestnet]
        return harmonyNetworks.includes(params.network)
          ? null
          : 'Delegation voting validator info is only available on Harmony networks.'
      },
      schemas: {
        params: PluginSchema.getDelegationVotingValidator,
      },
    })

    ctx.body = await PluginsController.getDelegationVotingValidator({
      ...(result.params as { network: NetworksEnum; pluginAddress: HexAddress }),
      ...(result.paginationParams as { page: number; pageSize: number }),
    })
  },

  getDelegationVotingVotingPower: async function (ctx: RouterContext) {
    const result = await ValidationSchema.validateRoute(ctx, {
      params: {
        network: ctx.params.network as NetworksEnum,
        pluginAddress: ctx.params.pluginAddress,
        voterAddress: ctx.params.voterAddress,
      },
      requireRule: ({ params }) => {
        const harmonyNetworks = [NetworksEnum.harmonyMainnet, NetworksEnum.harmonyTestnet]
        return harmonyNetworks.includes(params.network)
          ? null
          : 'Delegation voting voting power is only available on Harmony networks.'
      },
      schemas: {
        params: PluginSchema.getDelegationVotingVotingPower,
      },
    })

    ctx.body = await PluginsController.getDelegationVotingVotingPower(result.params as {
      network: NetworksEnum
      pluginAddress: HexAddress
      voterAddress: string
    })
  },

  router(): Router {
    const router = new Router()

    router.get('/installation-data', PluginRouter.getInstallationData)
    router.get('/by-dao/:network/:daoAddress', PluginRouter.getPluginsByDao)
    router.get('/logs/:pluginAddress/:network/:event', PluginRouter.getLogPluginSetupProcessor)
    router.get('/installation-helpers/:network/:pluginAddress', PluginRouter.getInstallationHelpers)
    router.get('/harmony-config/:network/:pluginAddress', PluginRouter.getHarmonyValidatorConfig)
    router.get('/harmony/validator/:network/:validatorAddress', PluginRouter.getHarmonyValidatorInfo)
    router.get('/harmony/delegations/validator/:network/:validatorAddress', PluginRouter.getHarmonyDelegationsByValidator)
    router.get('/harmony/delegations/delegator/:network/:delegatorAddress', PluginRouter.getHarmonyDelegationsByDelegator)
    router.get('/delegation-voting/:network/:pluginAddress/validator', PluginRouter.getDelegationVotingValidator)
    router.get('/delegation-voting/:network/:pluginAddress/voting-power/:voterAddress', PluginRouter.getDelegationVotingVotingPower)

    return router
  },
}

export default PluginRouter
