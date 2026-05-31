import Router, { type RouterContext } from '@koa/router'
import ValidationSchema, { RequireRules } from '@helpers/validationSchema'
import ProposalSchema from '@api/routers/schema/proposal'
import ProposalController from '@api/controllers/proposal'
import {
  type HexAddress,
  type ICanCreateProposalParams,
  type IPaginationParams,
  type IPairParams,
  type IProposalExtraParams,
  type NetworksEnum,
} from '@types'
import PaginationSchema from '@api/routers/schema/pagination'
import Utils from '@helpers/utils'

const ProposalRouter = {
  createProposalValidationError: (ctx: RouterContext, error: any) => {
    ctx.status = 400
    ctx.body = {
      message: 'createProposal request validation failed.',
      reasonCode: 'CREATE_PROPOSAL_VALIDATION_FAILED',
      reasonSeverity: 'warning',
      source: 'backend submission boundary',
      details: {
        errors: error.details?.map((detail: any) => detail.message) ?? [],
      },
    }
  },

  createProposalGuardrailError: (
    ctx: RouterContext,
    reasonCode: string,
    reasonSeverity: string,
    source: string,
    message: string,
    details: Record<string, any> = {},
  ) => {
    ctx.status = 409
    ctx.body = {
      message,
      reasonCode,
      reasonSeverity,
      source,
      details,
    }
  },

  createProposal: async function (ctx: RouterContext) {
    const validation = ProposalSchema.createProposalRequest.validate((ctx.request as any).body, {
      abortEarly: false,
      stripUnknown: true,
    })

    if (validation.error) {
      ProposalRouter.createProposalValidationError(ctx, validation.error)
      return
    }

    const request = validation.value

    if (request.submissionMode === 'onchain' || request.guardrails.noOnchainSubmission === false) {
      ProposalRouter.createProposalGuardrailError(
        ctx,
        'REMOTE_EXECUTION_GUARDRAIL_ACTIVE',
        'critical',
        'backend submission boundary',
        'The createProposal endpoint only accepts non-on-chain review submissions in this phase.',
        { submissionMode: request.submissionMode, noOnchainSubmission: request.guardrails.noOnchainSubmission },
      )
      return
    }

    if (!request.creator.walletAddress) {
      ProposalRouter.createProposalGuardrailError(
        ctx,
        'WALLET_NOT_CONNECTED',
        'warning',
        'wallet or DAO permission state',
        'A connected wallet is required before backend createProposal submission.',
      )
      return
    }

    if (!request.chain.network) {
      ProposalRouter.createProposalGuardrailError(
        ctx,
        'EXECUTION_CHAIN_NOT_AUTHORIZED',
        'critical',
        'chain capability',
        'A target governance network is required before backend createProposal submission.',
      )
      return
    }

    if (!request.plugin.id && !request.plugin.address && !request.plugin.interfaceType) {
      ProposalRouter.createProposalGuardrailError(
        ctx,
        'PLUGIN_CAPABILITY_NOT_REGISTERED',
        'warning',
        'plugin capability',
        'A registered or observed governance plugin is required before backend createProposal submission.',
      )
      return
    }

    ctx.status = 202
    ctx.body = await ProposalController.createProposalRequest(request)
  },

  listCreateProposalRequests: async function (ctx: RouterContext) {
    const validation = ProposalSchema.listCreateProposalRequests.validate(ctx.query, {
      abortEarly: false,
      stripUnknown: true,
    })

    if (validation.error) {
      ProposalRouter.createProposalValidationError(ctx, validation.error)
      return
    }

    ctx.body = await ProposalController.listCreateProposalRequests(validation.value)
  },

  getCreateProposalRequest: async function (ctx: RouterContext) {
    const receipt = await ProposalController.getCreateProposalRequest(ctx.params.id)

    if (!receipt) {
      ProposalRouter.createProposalGuardrailError(
        ctx,
        'CREATE_PROPOSAL_REQUEST_NOT_FOUND',
        'info',
        'backend submission boundary',
        'No observed createProposal request exists for the provided id.',
        { id: ctx.params.id },
      )
      ctx.status = 404
      return
    }

    ctx.body = receipt
  },

  getWithPagination: async function (ctx: RouterContext) {
    const result = await ValidationSchema.validateRoute(ctx, {
      paginationSort: 'incrementalId',
      extraParams: {
        network: ctx.query.network as NetworksEnum,
        daoAddress: ctx.query.daoAddress as HexAddress,
        pluginAddress: ctx.query.pluginAddress as HexAddress,
        creatorAddress: ctx.query.creatorAddress as HexAddress,
        daoInfo: Utils.parseBoolean(ctx.query.daoInfo),
        isExecuted: Utils.parseBoolean(ctx.query.isExecuted),
        isSubProposal: Utils.parseBoolean(ctx.query.isSubProposal),
        proposalIndex: ctx.query.proposalIndex?.toString(),
        incrementalId: ctx.query.incrementalId !== undefined ? Number(ctx.query.incrementalId || 0) : undefined,
      },
      pairParams: {
        daoId: ctx.query.daoId as string,
        onlyActive: Utils.parseBoolean(ctx.query.onlyActive),
      },
      requireRule: RequireRules.daoIdOrNetworkWithAddress(['daoAddress', 'pluginAddress', 'creatorAddress']),
      schemas: {
        extra: ProposalSchema.getExtraParams,
        pair: PaginationSchema.getPairParams,
      },
    })

    ctx.body = await ProposalController.getProposalsWithPagination(
      result.paginationParams as IPaginationParams,
      result.extraParams as IProposalExtraParams,
      result.pairParams as IPairParams,
    )
  },

  getProposalBySlug: async function (ctx: RouterContext) {
    const result = await ValidationSchema.validateRoute(ctx, {
      params: {
        slug: ctx.params.slug,
      },
      pairParams: {
        daoId: ctx.query.daoId as string,
      },
      schemas: {
        params: ProposalSchema.getProposalBySlug,
        pair: ProposalSchema.getProposalDaoId,
      },
    })

    ctx.body = await ProposalController.getProposalBySlug(result.params.slug, result.pairParams)
  },

  getProposalById: async function (ctx: RouterContext) {
    const result = await ValidationSchema.validateRoute(ctx, {
      params: {
        id: ctx.params.id,
      },
      schemas: {
        params: ProposalSchema.getProposalById,
      },
    })

    ctx.body = await ProposalController.getProposalById(result.params.id)
  },

  getProposalDecodedActions: async function (ctx: RouterContext) {
    const result = await ValidationSchema.validateRoute(ctx, {
      params: {
        id: ctx.params.id,
      },
      schemas: {
        params: ProposalSchema.getProposalById,
      },
    })

    ctx.body = await ProposalController.getProposalDecodedActions(result.params.id)
  },

  canCreateProposal: async function (ctx: RouterContext) {
    const result = await ValidationSchema.validateRoute(ctx, {
      extraParams: {
        memberAddress: ctx.query.memberAddress as HexAddress,
        pluginAddress: ctx.query.pluginAddress as HexAddress,
        network: ctx.query.network as NetworksEnum,
      },
      schemas: {
        extra: ProposalSchema.canCreateProposal,
      },
    })

    ctx.body = {
      status: await ProposalController.canCreateProposal(result.extraParams as ICanCreateProposalParams),
    }
  },

  router(): Router {
    const router = new Router()

    /**
     * @api {get} / Get Proposals
     * @apiName Proposals
     * @apiGroup Proposals
     * @apiDescription Get Proposals
     *
     * @apiSampleRequest /
     *
     */
    router.get('/', ProposalRouter.getWithPagination)

    /**
     * @api {get} /proposal/canCreateProposal
     * @apiDescription Check if the user is allowed to create the proposal
     */
    router.get('/can-create-proposal', ProposalRouter.canCreateProposal)

    /**
     * @api {get} /proposal/create
     * @apiDescription List observed non-on-chain createProposal review requests.
     */
    router.get('/create', ProposalRouter.listCreateProposalRequests)

    /**
     * @api {post} /proposal/create
     * @apiDescription Accept a non-on-chain Axodus createProposal request for backend review.
     */
    router.post('/create', ProposalRouter.createProposal)

    /**
     * @api {get} /proposal/create/:id
     * @apiDescription Read observed non-on-chain createProposal request state.
     */
    router.get('/create/:id', ProposalRouter.getCreateProposalRequest)

    /**
     * @api {get} /:id Get Proposal by Id
     * @apiName Proposals
     * @apiGroup Proposals
     * @apiDescription Get Proposal by Id
     *
     * @apiSampleRequest /proposal/:id
     */
    router.get('/:id', ProposalRouter.getProposalById)

    /**
     * @api {get} /:id Get Proposal by Slug
     * @apiName Proposals
     * @apiGroup Proposals
     * @apiDescription Get Proposal by Slug
     *
     * @apiSampleRequest /proposal/slug/:slug
     */
    router.get('/slug/:slug', ProposalRouter.getProposalBySlug)

    /**
     * @api {get} /:id/actions Get Decoded Actions for a Proposal
     * @apiName ProposalActions
     * @apiGroup Proposals
     * @apiDescription Get decoded actions for a proposal when rawActions array length is more than zero
     *
     * @apiSampleRequest /proposal/:id/actions
     */
    router.get('/:id/actions', ProposalRouter.getProposalDecodedActions)

    return router
  },
}

export default ProposalRouter
