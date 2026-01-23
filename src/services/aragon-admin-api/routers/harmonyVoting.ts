import Router, { type RouterContext } from '@koa/router'
import AuthMiddleware from '@middlewares/auth'
import ValidationSchema from '@helpers/validationSchema'
import HarmonyVotingSchema from '@admin-api/routers/schema/harmonyVoting'
import HarmonyVotingAdminController from '@admin-api/controllers/harmonyVoting'

const HarmonyVotingAdminRouter = {
  computeSnapshot: async (ctx: RouterContext) => {
    const body = ctx.request.body as any
    const params = {
      network: body?.network,
      endDate: body?.endDate,
    }

    const formattedValues = await ValidationSchema.validateParams(HarmonyVotingSchema.snapshotParams, params)
    ctx.body = await HarmonyVotingAdminController.computeSnapshot(formattedValues)
  },

  weightsValidators: async (ctx: RouterContext) => {
    const body = ctx.request.body as any
    const params = {
      network: body?.network,
      snapshotBlock: body?.snapshotBlock,
      electedOnly: body?.electedOnly,
    }

    const formattedValues = await ValidationSchema.validateParams(HarmonyVotingSchema.weightsValidatorsParams, params)
    ctx.body = await HarmonyVotingAdminController.getValidatorWeightsAtSnapshot(formattedValues)
  },

  weightsDelegators: async (ctx: RouterContext) => {
    const body = ctx.request.body as any
    const params = {
      network: body?.network,
      snapshotBlock: body?.snapshotBlock,
      validatorAddress: body?.validatorAddress,
    }

    const formattedValues = await ValidationSchema.validateParams(HarmonyVotingSchema.weightsDelegatorsParams, params)
    ctx.body = await HarmonyVotingAdminController.getDelegatorWeightsForValidatorAtSnapshot(formattedValues)
  },

  buildMerkle: async (ctx: RouterContext) => {
    const body = ctx.request.body as any
    const params = {
      entries: body?.entries,
    }

    const formattedValues = await ValidationSchema.validateParams(HarmonyVotingSchema.merkleParams, params)
    ctx.body = await HarmonyVotingAdminController.buildMerkle(formattedValues)
  },

  calldataSetRoot: async (ctx: RouterContext) => {
    const body = ctx.request.body as any
    const params = {
      proposalId: body?.proposalId,
      merkleRoot: body?.merkleRoot,
      totalEligiblePower: body?.totalEligiblePower,
    }

    const formattedValues = await ValidationSchema.validateParams(HarmonyVotingSchema.calldataSetRootParams, params)
    ctx.body = await HarmonyVotingAdminController.encodeSetMerkleRootCalldata(formattedValues)
  },

  calldataSubmitPower: async (ctx: RouterContext) => {
    const body = ctx.request.body as any
    const params = {
      proposalId: body?.proposalId,
      voter: body?.voter,
      votingPower: body?.votingPower,
      proof: body?.proof,
    }

    const formattedValues = await ValidationSchema.validateParams(HarmonyVotingSchema.calldataSubmitPowerParams, params)
    ctx.body = await HarmonyVotingAdminController.encodeSubmitVotingPowerCalldata(formattedValues)
  },

  router(): Router {
    const router = new Router()
    const authedAdmin = AuthMiddleware.authAssertAdmin()

    router.post('/snapshot', authedAdmin, HarmonyVotingAdminRouter.computeSnapshot)
    router.post('/weights/validators', authedAdmin, HarmonyVotingAdminRouter.weightsValidators)
    router.post('/weights/delegators', authedAdmin, HarmonyVotingAdminRouter.weightsDelegators)
    router.post('/merkle', authedAdmin, HarmonyVotingAdminRouter.buildMerkle)
    router.post('/calldata/set-root', authedAdmin, HarmonyVotingAdminRouter.calldataSetRoot)
    router.post('/calldata/submit-power', authedAdmin, HarmonyVotingAdminRouter.calldataSubmitPower)

    return router
  },
}

export default HarmonyVotingAdminRouter
