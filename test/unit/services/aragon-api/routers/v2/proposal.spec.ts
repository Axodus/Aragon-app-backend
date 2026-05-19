import * as sinon from 'sinon'
import { SinonSandbox } from 'sinon'
import { expect } from 'chai'
import ProposalRouter from '@api/routers/v2/proposal'
import ProposalController from '@api/controllers/proposal'
import { NetworksEnum } from '@types'
import { getAddress } from 'ethers'

describe('RouterV2: Proposal', () => {
  let sandbox: SinonSandbox

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox?.restore()
  })

  describe('getWithPagination', async () => {
    it('Should get proposal with pagination - all params', async () => {
      const filterParams = {
        network: NetworksEnum.ethereumMainnet,
        daoAddress: '0x0eB63a3565942D16C1c1211bD78F1B3Dcfe1A254',
        pluginAddress: '0x0eB63a3565942D16C1c1211bD78F1B3Dcfe1A254',
        creatorAddress: '0x0eB63a3565942D16C1c1211bD78F1B3Dcfe1A254',
        daoInfo: 'false',
        isExecuted: 'false',
        isSubProposal: 'false',
        proposalIndex: '1',
        incrementalId: '1',
      }
      const paginationParams = {
        pageSize: '10',
        page: '1',
        order: 'asc',
        sort: 'createdAt',
      }
      const pairParams = {
        onlyActive: 'true',
        daoId: 'ethereum-mainnet-0x0eB63a3565942D16C1c1211bD78F1B3Dcfe1A254',
      }

      const stubCtrl = sandbox.stub(ProposalController, 'getProposalsWithPagination').returns(true as any)

      const ctx: any = {
        query: { ...filterParams, ...paginationParams, ...pairParams },
      }

      await ProposalRouter.getWithPagination(ctx)

      expect(ctx.body).to.eq(true)
      expect(stubCtrl.calledOnce).to.be.true

      const missingParams = {
        endDateProp: undefined,
        startDateProp: undefined,
        endDate: undefined,
        startDate: undefined,
        search: undefined,
      }

      const expectedExtraParams = {
        network: NetworksEnum.ethereumMainnet,
        daoAddress: getAddress(filterParams.daoAddress),
        pluginAddress: getAddress(filterParams.pluginAddress),
        creatorAddress: getAddress(filterParams.creatorAddress),
        daoInfo: false,
        isExecuted: false,
        isSubProposal: false,
        proposalIndex: '1',
        incrementalId: 1,
      }

      expect(stubCtrl.args[0][0]).to.deep.eq({
        pageSize: 10,
        page: 1,
        order: 'asc',
        sort: 'createdAt',
        ...missingParams,
      })
      expect(stubCtrl.args[0][1]).to.deep.eq(expectedExtraParams)
      expect(stubCtrl.args[0][2]).to.deep.eq({
        onlyActive: true,
        daoId: 'ethereum-mainnet-0x0eB63a3565942D16C1c1211bD78F1B3Dcfe1A254',
      })
    })

    it('Should get proposal with pagination - daoId', async () => {
      const filterParams = {
        daoId: 'ethereum-mainnet-0x0eB63a3565942D16C1c1211bD78F1B3Dcfe1A254',
        daoInfo: 'false',
      }
      const paginationParams = {
        pageSize: '10',
        page: '1',
        order: 'asc',
      }

      const stubCtrl = sandbox.stub(ProposalController, 'getProposalsWithPagination').returns(true as any)

      const ctx: any = {
        query: { ...filterParams, ...paginationParams },
      }

      await ProposalRouter.getWithPagination(ctx)

      expect(ctx.body).to.eq(true)
      expect(stubCtrl.calledOnce).to.be.true

      const missingParams = {
        endDateProp: undefined,
        startDateProp: undefined,
        endDate: undefined,
        startDate: undefined,
        search: undefined,
        sort: 'incrementalId',
      }

      expect(stubCtrl.args[0][0]).to.deep.eq({
        pageSize: 10,
        page: 1,
        order: 'asc',
        ...missingParams,
      })
      expect(stubCtrl.args[0][1]).to.deep.eq({
        network: undefined,
        daoAddress: undefined,
        pluginAddress: undefined,
        creatorAddress: undefined,
        isSubProposal: undefined,
        daoInfo: false,
        isExecuted: undefined,
        incrementalId: undefined,
        proposalIndex: undefined,
      })
      expect(stubCtrl.args[0][2]).to.deep.eq({
        daoId: filterParams.daoId,
        onlyActive: undefined,
      })
    })

    it('Should get proposal with pagination - missing pagination params', async () => {
      const filterParams = {
        network: NetworksEnum.ethereumMainnet,
        daoAddress: '0x0eB63a3565942D16C1c1211bD78F1B3Dcfe1A254',
        daoInfo: 'true',
      }
      const paginationParams = {
        sort: 'createdAt',
      }

      const stubCtrl = sandbox.stub(ProposalController, 'getProposalsWithPagination').returns(true as any)

      const ctx: any = {
        query: { ...filterParams, ...paginationParams },
      }

      await ProposalRouter.getWithPagination(ctx)

      expect(ctx.body).to.eq(true)
      expect(stubCtrl.calledOnce).to.be.true

      const missingParams = {
        endDateProp: undefined,
        startDateProp: undefined,
        endDate: undefined,
        startDate: undefined,
        search: undefined,
        order: 'desc',
        page: 1,
        pageSize: 10,
      }
      expect(stubCtrl.args[0][0]).to.deep.eq({ ...paginationParams, ...missingParams })
      expect(stubCtrl.args[0][1]).to.deep.eq({
        network: filterParams.network,
        daoAddress: getAddress(filterParams.daoAddress),
        pluginAddress: undefined,
        creatorAddress: undefined,
        isExecuted: undefined,
        isSubProposal: undefined,
        proposalIndex: undefined,
        incrementalId: undefined,
        daoInfo: true,
      })
      expect(stubCtrl.args[0][2]).to.deep.eq({
        daoId: undefined,
        onlyActive: undefined,
      })
    })

    it('Should fail validation when neither daoId nor network with address is provided', async () => {
      const ctx: any = {
        query: {
          daoInfo: 'true',
        },
      }

      let error: any
      try {
        await ProposalRouter.getWithPagination(ctx)
      } catch (e) {
        error = e
      }

      expect(error).to.exist
      expect(error.message).to.equal('badParams')
      expect(error.exposeMeta.validationError.errors[0]).to.include(
        'Either daoId must be provided, or network with at least one address field',
      )
    })

    it('Should fail validation when network is provided without any address', async () => {
      const ctx: any = {
        query: {
          network: NetworksEnum.ethereumMainnet,
          daoInfo: 'false',
        },
      }

      let error: any
      try {
        await ProposalRouter.getWithPagination(ctx)
      } catch (e) {
        error = e
      }

      expect(error).to.exist
      expect(error.message).to.equal('badParams')
      expect(error.exposeMeta.validationError.errors[0]).to.include(
        'Either daoId must be provided, or network with at least one address field',
      )
    })

    it('Should handle incrementalId as number 0', async () => {
      const filterParams = {
        daoId: 'ethereum-mainnet-0x0eB63a3565942D16C1c1211bD78F1B3Dcfe1A254',
        incrementalId: '0',
      }

      const stubCtrl = sandbox.stub(ProposalController, 'getProposalsWithPagination').returns(true as any)

      const ctx: any = {
        query: filterParams,
      }

      await ProposalRouter.getWithPagination(ctx)

      expect(stubCtrl.calledOnce).to.be.true
      expect(stubCtrl.args[0][1]?.incrementalId).to.equal(0)
    })

    it('Should handle incrementalId as undefined when not provided', async () => {
      const filterParams = {
        daoId: 'ethereum-mainnet-0x0eB63a3565942D16C1c1211bD78F1B3Dcfe1A254',
      }

      const stubCtrl = sandbox.stub(ProposalController, 'getProposalsWithPagination').returns(true as any)

      const ctx: any = {
        query: filterParams,
      }

      await ProposalRouter.getWithPagination(ctx)

      expect(stubCtrl.calledOnce).to.be.true
      expect(stubCtrl.args[0][1]?.incrementalId).to.be.undefined
    })

    it('Should handle incrementalId as 0 when empty string is provided', async () => {
      const filterParams = {
        daoId: 'ethereum-mainnet-0x0eB63a3565942D16C1c1211bD78F1B3Dcfe1A254',
        incrementalId: '',
      }

      const stubCtrl = sandbox.stub(ProposalController, 'getProposalsWithPagination').returns(true as any)

      const ctx: any = {
        query: filterParams,
      }

      await ProposalRouter.getWithPagination(ctx)

      expect(stubCtrl.calledOnce).to.be.true
      expect(stubCtrl.args[0][1]?.incrementalId).to.equal(0)
    })
  })

  describe('getProposalById', () => {
    it('Should getProposalById', async () => {
      const params = {
        id: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      }

      const stubCtrl = sandbox.stub(ProposalController, 'getProposalById').returns(true as any)

      const ctx: any = {
        params,
        query: {}, // Added empty query object
      }

      await ProposalRouter.getProposalById(ctx)

      expect(ctx.body).to.eq(true)
      expect(stubCtrl.calledOnce).to.be.true
      expect(stubCtrl.args[0]?.[0]).to.eq(getAddress(params.id))
    })

    it('Should handle lowercase address and checksum it', async () => {
      const params = {
        id: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      }

      const stubCtrl = sandbox.stub(ProposalController, 'getProposalById').returns(true as any)

      const ctx: any = {
        params,
        query: {}, // Added empty query object
      }

      await ProposalRouter.getProposalById(ctx)

      expect(ctx.body).to.eq(true)
      expect(stubCtrl.calledOnce).to.be.true
      expect(stubCtrl.calledWith(params.id)).to.be.true
    })
  })

  describe('getProposalBySlug', () => {
    it('Should getProposalBySlug', async () => {
      const params = {
        slug: 'test-1',
      }
      const queryParams = {
        daoId: `${NetworksEnum.polygonMainnet}-0x0eB63a3565942D16C1c1211bD78F1B3Dcfe1A254`,
      }

      const stubCtrl = sandbox.stub(ProposalController, 'getProposalBySlug').returns(true as any)

      const ctx: any = {
        params,
        query: queryParams,
      }

      await ProposalRouter.getProposalBySlug(ctx)

      expect(ctx.body).to.eq(true)
      expect(stubCtrl.calledOnce).to.be.true
      expect(stubCtrl.args[0]?.[0]).to.eq(params.slug)
      expect(stubCtrl.args[0]?.[1]).to.deep.eq({ daoId: queryParams.daoId })
    })

    it('Should fail validation when daoId is missing', async () => {
      const params = {
        slug: 'test-1',
      }

      const ctx: any = {
        params,
        query: {},
      }

      let error: any
      try {
        await ProposalRouter.getProposalBySlug(ctx)
      } catch (e) {
        error = e
      }

      expect(error).to.exist
      expect(error.message).to.equal('badParams')
      expect(error.exposeMeta.validationError.errors[0]).to.include('"daoId" is required')
    })

    it('Should fail validation when slug is invalid', async () => {
      const params = {
        slug: 'invalid_slug',
      }
      const queryParams = {
        daoId: `${NetworksEnum.polygonMainnet}-0x0eB63a3565942D16C1c1211bD78F1B3Dcfe1A254`,
      }

      const ctx: any = {
        params,
        query: queryParams,
      }

      let error: any
      try {
        await ProposalRouter.getProposalBySlug(ctx)
      } catch (e) {
        error = e
      }

      expect(error).to.exist
      expect(error.message).to.equal('badParams')
      expect(error.exposeMeta.validationError.errors[0]).to.include('"slug" is not a valid Slug')
    })
  })

  describe('getProposalDecodedActions', () => {
    it('Should getProposalDecodedActions', async () => {
      const params = {
        id: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      }

      const stubCtrl = sandbox.stub(ProposalController, 'getProposalDecodedActions').returns(true as any)

      const ctx: any = {
        query: {},
        params,
      }

      await ProposalRouter.getProposalDecodedActions(ctx)

      expect(ctx.body).to.eq(true)
      expect(stubCtrl.calledOnce).to.be.true
      expect(stubCtrl.calledWith(getAddress(params.id))).to.be.true
    })

    it('Should handle lowercase address and checksum it', async () => {
      const params = {
        id: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      }

      const stubCtrl = sandbox.stub(ProposalController, 'getProposalDecodedActions').returns(true as any)

      const ctx: any = {
        query: {},
        params,
      }

      await ProposalRouter.getProposalDecodedActions(ctx)

      expect(ctx.body).to.eq(true)
      expect(stubCtrl.calledOnce).to.be.true
      expect(stubCtrl.calledWith(params.id)).to.be.true
    })
  })

  describe('createProposal', () => {
    const createProposalBody = {
      submissionMode: 'backend',
      dao: {
        id: 'ethereum-sepolia-0x0eB63a3565942D16C1c1211bD78F1B3Dcfe1A254',
        address: '0x0eB63a3565942D16C1c1211bD78F1B3Dcfe1A254',
        name: 'Axodus Executive DAO',
        governanceStatus: 'compliant',
        federationTier: 'root',
      },
      chain: {
        network: NetworksEnum.ethereumSepolia,
        chainId: 11155111,
        name: 'Ethereum Sepolia',
        role: 'execution',
        governanceStatus: 'compliant',
        federationMember: true,
        federationTier: 'root',
        constitutionalStanding: {
          status: 'compliant',
          reasonCodes: [],
          reasonSeverity: null,
        },
        constitutionalLayer: {
          executionModel: {
            executionAuthority: 'constitutional-root',
            executionChainAuthorized: true,
            reasonCodes: [],
          },
        },
      },
      creator: {
        walletAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      },
      plugin: {
        id: 'token-voting',
        address: '0x0eB63a3565942D16C1c1211bD78F1B3Dcfe1A254',
        interfaceType: 'token-voting',
        label: 'Token Voting',
        createProposalAdapter: {
          family: 'evm-voting',
          status: 'observed',
          expectedBackendAdapter: 'evm-token-voting-create-proposal',
          executionIntent: 'requires-backend-action-decoding',
        },
      },
      proposal: {
        title: 'Review treasury policy',
        summary: 'Route the treasury policy proposal through backend review.',
        actionType: 'treasury-review',
        votingStart: null,
        votingEnd: null,
        rationale: null,
      },
      guardrails: {
        frontendBoundary: 'UI-generated proposal request preview only.',
        reasonCodes: [
          {
            reasonCode: 'TREASURY_POLICY_REQUIRES_REVIEW',
            reasonSeverity: 'constitutional',
            source: 'treasury policy',
            message: 'Treasury-sensitive proposal drafts require backend review.',
          },
        ],
        requiresBackendValidation: true,
        requiresIndexerReconciliation: true,
        noOnchainSubmission: true,
      },
      governanceContext: {
        source: 'registry-observed-state',
        executionModel: {
          executionAuthority: 'constitutional-root',
          executionChainAuthorized: true,
        },
      },
      adapterPayload: {
        adapterFamily: 'evm-voting',
        requestKind: 'proposal-metadata',
        expectedBackendAdapter: 'evm-token-voting-create-proposal',
      },
    }

    it('Should accept a backend createProposal request for non-on-chain review', async () => {
      const stubCtrl = sandbox.stub(ProposalController, 'createProposalRequest').resolves({
        id: 'backend-create-test',
        status: 'backend-review-queued',
      } as any)

      const ctx: any = {
        request: {
          body: createProposalBody,
        },
      }

      await ProposalRouter.createProposal(ctx)

      expect(ctx.status).to.equal(202)
      expect(ctx.body).to.deep.eq({
        id: 'backend-create-test',
        status: 'backend-review-queued',
      })
      expect(stubCtrl.calledOnce).to.be.true
      expect(stubCtrl.args[0]?.[0].creator.walletAddress).to.equal(getAddress(createProposalBody.creator.walletAddress))
      expect(stubCtrl.args[0]?.[0].guardrails.reasonCodes[0]).to.include({
        reasonCode: 'TREASURY_POLICY_REQUIRES_REVIEW',
        reasonSeverity: 'constitutional',
      })
    })

    it('Should return reason metadata when createProposal validation fails', async () => {
      const ctx: any = {
        request: {
          body: {
            ...createProposalBody,
            proposal: {
              ...createProposalBody.proposal,
              title: '',
            },
          },
        },
      }

      await ProposalRouter.createProposal(ctx)

      expect(ctx.status).to.equal(400)
      expect(ctx.body.reasonCode).to.equal('CREATE_PROPOSAL_VALIDATION_FAILED')
      expect(ctx.body.reasonSeverity).to.equal('warning')
      expect(ctx.body.source).to.equal('backend submission boundary')
      expect(ctx.body.details.errors[0]).to.include('"proposal.title"')
    })

    it('Should block on-chain createProposal requests at the backend boundary', async () => {
      const ctx: any = {
        request: {
          body: {
            ...createProposalBody,
            submissionMode: 'onchain',
            guardrails: {
              ...createProposalBody.guardrails,
              noOnchainSubmission: false,
            },
          },
        },
      }

      await ProposalRouter.createProposal(ctx)

      expect(ctx.status).to.equal(409)
      expect(ctx.body.reasonCode).to.equal('REMOTE_EXECUTION_GUARDRAIL_ACTIVE')
      expect(ctx.body.reasonSeverity).to.equal('critical')
    })

    it('Should require a connected wallet before backend createProposal submission', async () => {
      const ctx: any = {
        request: {
          body: {
            ...createProposalBody,
            creator: {
              walletAddress: null,
            },
          },
        },
      }

      await ProposalRouter.createProposal(ctx)

      expect(ctx.status).to.equal(409)
      expect(ctx.body.reasonCode).to.equal('WALLET_NOT_CONNECTED')
      expect(ctx.body.source).to.equal('wallet or DAO permission state')
    })

    it('Should read observed createProposal request state by id', async () => {
      sandbox.stub(ProposalController, 'getCreateProposalRequest').resolves({
        id: 'backend-create-test',
        status: 'backend-review-queued',
      } as any)

      const ctx: any = {
        params: {
          id: 'backend-create-test',
        },
      }

      await ProposalRouter.getCreateProposalRequest(ctx)

      expect(ctx.body).to.deep.eq({
        id: 'backend-create-test',
        status: 'backend-review-queued',
      })
    })

    it('Should return reason metadata when observed createProposal request is missing', async () => {
      sandbox.stub(ProposalController, 'getCreateProposalRequest').resolves(null)

      const ctx: any = {
        params: {
          id: 'backend-create-missing',
        },
      }

      await ProposalRouter.getCreateProposalRequest(ctx)

      expect(ctx.status).to.equal(404)
      expect(ctx.body.reasonCode).to.equal('CREATE_PROPOSAL_REQUEST_NOT_FOUND')
    })

    it('Should list observed createProposal review requests', async () => {
      const stubCtrl = sandbox.stub(ProposalController, 'listCreateProposalRequests').resolves({
        items: [
          {
            id: 'backend-create-test',
            status: 'backend-review-queued',
          },
        ],
        count: 1,
        source: 'CreateProposalRequest',
        storageMode: 'mongo',
      } as any)

      const ctx: any = {
        query: {
          network: NetworksEnum.ethereumSepolia,
          chainId: '11155111',
          status: 'backend-review-queued',
          daoAddress: createProposalBody.dao.address,
          limit: '5',
        },
      }

      await ProposalRouter.listCreateProposalRequests(ctx)

      expect(stubCtrl.calledOnce).to.be.true
      expect(stubCtrl.args[0]?.[0]).to.deep.eq({
        network: NetworksEnum.ethereumSepolia,
        chainId: 11155111,
        status: 'backend-review-queued',
        daoAddress: getAddress(createProposalBody.dao.address),
        limit: 5,
      })
      expect(ctx.body).to.deep.eq({
        items: [
          {
            id: 'backend-create-test',
            status: 'backend-review-queued',
          },
        ],
        count: 1,
        source: 'CreateProposalRequest',
        storageMode: 'mongo',
      })
    })

    it('Should return reason metadata when createProposal list query validation fails', async () => {
      const ctx: any = {
        query: {
          network: 'unsupported-network',
        },
      }

      await ProposalRouter.listCreateProposalRequests(ctx)

      expect(ctx.status).to.equal(400)
      expect(ctx.body.reasonCode).to.equal('CREATE_PROPOSAL_VALIDATION_FAILED')
      expect(ctx.body.reasonSeverity).to.equal('warning')
    })
  })

  describe('canCreateProposal', () => {
    it('Should check if a member can create a proposal', async () => {
      const queryParams = {
        memberAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        pluginAddress: '0x0eB63a3565942D16C1c1211bD78F1B3Dcfe1A254',
        network: NetworksEnum.ethereumMainnet,
      }

      const stubCtrl = sandbox.stub(ProposalController, 'canCreateProposal').resolves(true)

      const ctx: any = {
        query: queryParams,
      }

      await ProposalRouter.canCreateProposal(ctx)

      expect(stubCtrl.calledOnce).to.be.true
      expect(stubCtrl.args[0]?.[0]).to.deep.eq({
        memberAddress: getAddress(queryParams.memberAddress),
        pluginAddress: getAddress(queryParams.pluginAddress),
        network: queryParams.network,
      })
      expect(ctx.body).to.deep.eq({ status: true })
    })

    it('Should handle lowercase addresses and checksum them', async () => {
      const queryParams = {
        memberAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        pluginAddress: '0x0eb63a3565942d16c1c1211bd78f1b3dcfe1a254',
        network: NetworksEnum.ethereumMainnet,
      }

      const stubCtrl = sandbox.stub(ProposalController, 'canCreateProposal').resolves(false)

      const ctx: any = {
        query: queryParams,
      }

      await ProposalRouter.canCreateProposal(ctx)

      expect(stubCtrl.calledOnce).to.be.true
      expect(stubCtrl.args[0]?.[0]).to.deep.eq({
        memberAddress: getAddress(queryParams.memberAddress),
        pluginAddress: getAddress(queryParams.pluginAddress),
        network: queryParams.network,
      })
      expect(ctx.body).to.deep.eq({ status: false })
    })

    it('Should fail validation when memberAddress is missing', async () => {
      const queryParams = {
        pluginAddress: '0x0eB63a3565942D16C1c1211bD78F1B3Dcfe1A254',
        network: NetworksEnum.ethereumMainnet,
      }

      const ctx: any = {
        query: queryParams,
      }

      let error: any
      try {
        await ProposalRouter.canCreateProposal(ctx)
      } catch (e) {
        error = e
      }

      expect(error).to.exist
      expect(error.message).to.equal('badParams')
      expect(error.exposeMeta.validationError.errors[0]).to.include('"memberAddress" is required')
    })

    it('Should fail validation when pluginAddress is missing', async () => {
      const queryParams = {
        memberAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        network: NetworksEnum.ethereumMainnet,
      }

      const ctx: any = {
        query: queryParams,
      }

      let error: any
      try {
        await ProposalRouter.canCreateProposal(ctx)
      } catch (e) {
        error = e
      }

      expect(error).to.exist
      expect(error.message).to.equal('badParams')
      expect(error.exposeMeta.validationError.errors[0]).to.include('"pluginAddress" is required')
    })

    it('Should fail validation when network is missing', async () => {
      const queryParams = {
        memberAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        pluginAddress: '0x0eB63a3565942D16C1c1211bD78F1B3Dcfe1A254',
      }

      const ctx: any = {
        query: queryParams,
      }

      let error: any
      try {
        await ProposalRouter.canCreateProposal(ctx)
      } catch (e) {
        error = e
      }

      expect(error).to.exist
      expect(error.message).to.equal('badParams')
      expect(error.exposeMeta.validationError.errors[0]).to.include('"network" is required')
    })

    it('Should fail validation when memberAddress is invalid', async () => {
      const queryParams = {
        memberAddress: '0xinvalid',
        pluginAddress: '0x0eB63a3565942D16C1c1211bD78F1B3Dcfe1A254',
        network: NetworksEnum.ethereumMainnet,
      }

      const ctx: any = {
        query: queryParams,
      }

      let error: any
      try {
        await ProposalRouter.canCreateProposal(ctx)
      } catch (e) {
        error = e
      }

      expect(error).to.exist
      expect(error.message).to.equal('badParams')
      expect(error.exposeMeta.validationError.errors[0]).to.include('"memberAddress" is not a valid address')
    })
  })
})
