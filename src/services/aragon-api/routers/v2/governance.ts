import Router, { type RouterContext } from '@koa/router'
import GovernanceTenantController from '@api/controllers/governanceTenant'

const notFoundReason = {
  reasonCode: 'DAO_TENANT_NOT_FOUND',
  reasonSeverity: 'warning',
  source: 'DAO tenant registry',
  message: 'No observed DAO tenant record exists for the provided tenant id.',
}

const GovernanceRouter = {
  listTenants: async function (ctx: RouterContext) {
    ctx.body = await GovernanceTenantController.listTenants()
  },

  getTenant: async function (ctx: RouterContext) {
    const tenant = await GovernanceTenantController.getTenant(ctx.params.tenantId)

    if (!tenant) {
      ctx.status = 404
      ctx.body = notFoundReason
      return
    }

    ctx.body = tenant
  },

  getTenantOperations: async function (ctx: RouterContext) {
    ctx.body = await GovernanceTenantController.getTenantOperations(ctx.params.tenantId)
  },

  getTenantReceipts: async function (ctx: RouterContext) {
    ctx.body = await GovernanceTenantController.getTenantReceipts(ctx.params.tenantId)
  },

  router(): Router {
    const router = new Router()

    router.get('/tenants', GovernanceRouter.listTenants)
    router.get('/tenants/:tenantId', GovernanceRouter.getTenant)
    router.get('/tenants/:tenantId/operations', GovernanceRouter.getTenantOperations)
    router.get('/tenants/:tenantId/receipts', GovernanceRouter.getTenantReceipts)

    return router
  },
}

export default GovernanceRouter
