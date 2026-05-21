import Router, { type RouterContext } from '@koa/router'
import GovernanceConstitutionalController from '@api/controllers/governanceConstitutional'
import GovernanceTenantController from '@api/controllers/governanceTenant'
import GovernanceSchema from '@api/routers/schema/governance'
import GovernanceRuntimeValidator, {
  type ProposalEffectInput,
  type RuntimeValidationInput,
  type TreasuryOperationInput,
} from '@services/governance-runtime/runtimeValidator'

const notFoundReason = {
  reasonCode: 'DAO_TENANT_NOT_FOUND',
  reasonSeverity: 'warning',
  source: 'DAO tenant registry',
  message: 'No observed DAO tenant record exists for the provided tenant id.',
}

const GovernanceRouter = {
  listCapabilities: async function (ctx: RouterContext) {
    ctx.body = await GovernanceConstitutionalController.listCapabilities()
  },

  listConditions: async function (ctx: RouterContext) {
    ctx.body = await GovernanceConstitutionalController.listConditions()
  },

  getFederationModel: async function (ctx: RouterContext) {
    ctx.body = await GovernanceConstitutionalController.getFederationModel()
  },

  getAuthorityModel: async function (ctx: RouterContext) {
    ctx.body = await GovernanceConstitutionalController.getAuthorityModel()
  },

  getExecutionModel: async function (ctx: RouterContext) {
    ctx.body = await GovernanceConstitutionalController.getExecutionModel()
  },

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

  getTenantRuntime: async function (ctx: RouterContext) {
    const response = await GovernanceRuntimeValidator.getTenantRuntime(ctx.params.tenantId)

    if (!response.data) {
      ctx.status = 404
    }

    ctx.body = response
  },

  listTenantRuntimeCapabilities: async function (ctx: RouterContext) {
    ctx.body = await GovernanceRuntimeValidator.listTenantCapabilities(ctx.params.tenantId)
  },

  validateRuntime: async function (ctx: RouterContext) {
    const validation = GovernanceSchema.runtimeValidate.validate(ctx.request.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    if (validation.error) {
      ctx.status = 400
      ctx.body = {
        reasonCode: 'GOVERNANCE_RUNTIME_VALIDATION_PAYLOAD_INVALID',
        reasonSeverity: 'warning',
        source: 'governance runtime request validation',
        timestamp: new Date().toISOString(),
        message: validation.error.message,
      }
      return
    }

    const decision = await GovernanceRuntimeValidator.validate(validation.value as RuntimeValidationInput)
    if (!decision.allowed) {
      ctx.status = 403
    }

    ctx.body = decision
  },

  getPolicyTenant: async function (ctx: RouterContext) {
    const response = await GovernanceRuntimeValidator.getPolicyTenant(ctx.params.tenantId)

    if (!response.data) {
      ctx.status = 404
    }

    ctx.body = response
  },

  getPolicyCapabilities: async function (ctx: RouterContext) {
    ctx.body = await GovernanceRuntimeValidator.getPolicyCapabilities(ctx.params.tenantId)
  },

  getPolicyRestrictions: async function (ctx: RouterContext) {
    const response = await GovernanceRuntimeValidator.getPolicyRestrictions(ctx.params.tenantId)

    if (!response.data) {
      ctx.status = 404
    }

    ctx.body = response
  },

  getTreasuryPolicy: async function (ctx: RouterContext) {
    const response = await GovernanceRuntimeValidator.getTreasuryPolicy(ctx.params.tenantId)

    if (!response.data) {
      ctx.status = 404
    }

    ctx.body = response
  },

  validateTreasuryOperation: async function (ctx: RouterContext) {
    const validation = GovernanceSchema.treasuryOperation.validate(ctx.request.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    if (validation.error) {
      ctx.status = 400
      ctx.body = {
        reasonCode: 'TREASURY_OPERATION_PAYLOAD_INVALID',
        reasonSeverity: 'warning',
        source: 'treasury governance runtime request validation',
        timestamp: new Date().toISOString(),
        message: validation.error.message,
      }
      return
    }

    const decision = await GovernanceRuntimeValidator.validateTreasuryOperation(
      validation.value as TreasuryOperationInput,
    )
    if (!decision.allowed) {
      ctx.status = 403
    }

    ctx.body = decision
  },

  listTreasuryReceipts: async function (ctx: RouterContext) {
    ctx.body = await GovernanceRuntimeValidator.listTreasuryReceipts(ctx.params.tenantId)
  },

  listPolicyDirectives: async function (ctx: RouterContext) {
    ctx.body = await GovernanceRuntimeValidator.listEmergencyDirectives()
  },

  listTenantPolicyDirectives: async function (ctx: RouterContext) {
    ctx.body = await GovernanceRuntimeValidator.listEmergencyDirectives(ctx.params.tenantId)
  },

  listPolicySnapshots: async function (ctx: RouterContext) {
    ctx.body = await GovernanceRuntimeValidator.listPolicySnapshots(ctx.params.tenantId)
  },

  getPolicyTelemetry: async function (ctx: RouterContext) {
    ctx.body = await GovernanceRuntimeValidator.getTelemetry()
  },

  listPolicyDecisionEvents: async function (ctx: RouterContext) {
    ctx.body = await GovernanceRuntimeValidator.listDecisionEvents()
  },

  applyProposalEffect: async function (ctx: RouterContext) {
    const validation = GovernanceSchema.proposalEffect.validate(ctx.request.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    if (validation.error) {
      ctx.status = 400
      ctx.body = {
        reasonCode: 'GOVERNANCE_PROPOSAL_EFFECT_PAYLOAD_INVALID',
        reasonSeverity: 'warning',
        source: 'governance proposal effect validation',
        timestamp: new Date().toISOString(),
        message: validation.error.message,
      }
      return
    }

    const receipt = await GovernanceRuntimeValidator.applyProposalEffect(validation.value as ProposalEffectInput)
    if (receipt.status === 'failed') {
      ctx.status = 404
    }

    ctx.body = receipt
  },

  getProposalEffectReceipts: async function (ctx: RouterContext) {
    ctx.body = await GovernanceRuntimeValidator.getProposalEffectReceipts(ctx.params.proposalId)
  },

  listTenantOperationalHistory: async function (ctx: RouterContext) {
    ctx.body = await GovernanceRuntimeValidator.listTenantOperationalHistory(ctx.params.tenantId)
  },

  router(): Router {
    const router = new Router()

    router.get('/capabilities', GovernanceRouter.listCapabilities)
    router.get('/conditions', GovernanceRouter.listConditions)
    router.get('/federation', GovernanceRouter.getFederationModel)
    router.get('/authority-model', GovernanceRouter.getAuthorityModel)
    router.get('/execution-model', GovernanceRouter.getExecutionModel)
    router.get('/tenants', GovernanceRouter.listTenants)
    router.get('/tenants/:tenantId', GovernanceRouter.getTenant)
    router.get('/tenants/:tenantId/operations', GovernanceRouter.getTenantOperations)
    router.get('/tenants/:tenantId/receipts', GovernanceRouter.getTenantReceipts)
    router.get('/runtime/tenant/:tenantId', GovernanceRouter.getTenantRuntime)
    router.get('/runtime/capabilities/:tenantId', GovernanceRouter.listTenantRuntimeCapabilities)
    router.post('/runtime/validate', GovernanceRouter.validateRuntime)
    router.get('/policy/tenant/:tenantId', GovernanceRouter.getPolicyTenant)
    router.get('/policy/capabilities/:tenantId', GovernanceRouter.getPolicyCapabilities)
    router.get('/policy/restrictions/:tenantId', GovernanceRouter.getPolicyRestrictions)
    router.get('/policy/directives', GovernanceRouter.listPolicyDirectives)
    router.get('/policy/directives/:tenantId', GovernanceRouter.listTenantPolicyDirectives)
    router.get('/policy/snapshots/:tenantId', GovernanceRouter.listPolicySnapshots)
    router.get('/policy/telemetry', GovernanceRouter.getPolicyTelemetry)
    router.get('/policy/decisions', GovernanceRouter.listPolicyDecisionEvents)
    router.get('/treasury/policy/:tenantId', GovernanceRouter.getTreasuryPolicy)
    router.post('/treasury/validate', GovernanceRouter.validateTreasuryOperation)
    router.get('/treasury/receipts/:tenantId', GovernanceRouter.listTreasuryReceipts)
    router.post('/proposal-effects', GovernanceRouter.applyProposalEffect)
    router.get('/proposal-effects/tenant/:tenantId/operations', GovernanceRouter.listTenantOperationalHistory)
    router.get('/proposal-effects/:proposalId/receipts', GovernanceRouter.getProposalEffectReceipts)

    return router
  },
}

export default GovernanceRouter
