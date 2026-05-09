import Router, { type RouterContext } from '@koa/router'
import StatusController from '@api/controllers/status'

const StatusRouter = {
  status(ctx: RouterContext) {
    ctx.body = StatusController.getStatus()
  },

  chainRegistry(ctx: RouterContext) {
    ctx.body = StatusController.getChainRegistry()
  },

  router(): Router {
    const router = new Router()

    /**
     * @api {get} / Get status
     * @apiName status
     * @apiGroup Status
     * @apiDescription Get status
     *
     * @apiSampleRequest /
     *
     */
    router.get('/', StatusRouter.status)
    router.get('/registry/chains', StatusRouter.chainRegistry)

    return router
  },
}

export default StatusRouter
