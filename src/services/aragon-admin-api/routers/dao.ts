import Router, { type RouterContext } from '@koa/router'
import ValidationSchema from '@helpers/validationSchema'
import GenericSchema from '@admin-api/routers/schema/generic'
import DaoAdminController from '@admin-api/controllers/dao'
import AuthMiddleware from '@middlewares/auth'
import DaoSchema from '@api/routers/schema/dao'
import { type IDaoExtraParams, type IPaginationParams, type NetworksEnum } from '@types'

const DaoAdminRouter = {
  getArchivedWithPagination: async function (ctx: RouterContext) {
    const result = await ValidationSchema.validateRoute(ctx, {
      paginationSort: 'metrics.tvlUSD',
      extraParams: {
        networks: ctx.query.networks as NetworksEnum[],
      },
      schemas: {
        extra: DaoSchema.getExtraParamsV2,
      },
    })

    ctx.body = await DaoAdminController.getArchivedDaosWithPagination(
      result.paginationParams as IPaginationParams,
      result.extraParams as IDaoExtraParams,
    )
  },

  setVisibilityStatus: async function (ctx: RouterContext) {
    const params = {
      address: ctx.params.daoAddress,
      network: ctx.params.network,
      status: ctx.params.status,
    }

    const formattedValues = await ValidationSchema.validateParams(GenericSchema.setDaoVisibilityStatusParams, params)

    ctx.body = await DaoAdminController.setVisibilityStatus(formattedValues)
  },

  router(): Router {
    const router = new Router()
    const authedAdminOrRoot = AuthMiddleware.authAssertAdminOrRoot()

    router.get('/archived', authedAdminOrRoot, DaoAdminRouter.getArchivedWithPagination)
    router.post('/set-status/:daoAddress/:network/:status', authedAdminOrRoot, DaoAdminRouter.setVisibilityStatus)

    return router
  },
}

export default DaoAdminRouter
