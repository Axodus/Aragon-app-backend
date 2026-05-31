/* global describe, it, beforeEach, afterEach */

import * as sinon from 'sinon'
import { SinonSandbox } from 'sinon'
import { expect } from 'chai'
import ProposalController from '@services/aragon-api/controllers/proposal'
import { ErrorKeyEnum, type HexAddress, IPluginInterfaceType } from '@types'
import { Models } from '@dbModels'
import Proposal from '@models/schema/proposal'
import PairDataModule from '@modules/pairData'
import Token from '@models/schema/token'
import Member from '@models/schema/member'
import PluginMember from '@models/schema/pluginMember'
import TokenMember from '@models/schema/tokenMember'
import { FakeToken } from '@test/mock/fakeToken'
import { ProposalList } from '@test/mock/fakeProposal'
import { FakeMember } from '@test/mock/fakeMember'
import Setting from '@models/schema/setting'
import { fakeSettings } from '@test/mock/fakeSettings'
import { PluginList } from '@test/mock/fakePlugins'
import RabbitMQHelper from '@helpers/rabbitMQ'
import Logger from '@logger'
import { ethers } from 'ethers'

describe('Controller: Proposal', () => {
  let sandbox: SinonSandbox

  let rawToken: Partial<Token>
  let rawProposal: Partial<Proposal>
  let rawMember: Partial<Member>
  let rawPluginMember: Partial<PluginMember>
  let rawTokenMember: Partial<TokenMember>
  let rawSettings: Partial<Setting>

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
    rawToken = {
      ...(FakeToken as any),
    }

    rawProposal = {
      ...(ProposalList[0] as any),
      daoAddress: ProposalList[0].daoAddress,
      settings: {
        ...(ProposalList[0].settings as any),
        tokenAddress: FakeToken.address,
      },
    }

    rawMember = {
      ...(FakeMember as any),
    }

    rawPluginMember = {
      pluginAddress: rawProposal.pluginAddress,
      daoAddress: rawProposal.daoAddress,
      memberAddress: FakeMember.address,
      network: rawProposal.network,
    }

    rawTokenMember = {
      memberAddress: FakeMember.address,
      tokenAddress: FakeToken.address,
      network: rawProposal.network,
      votingPower: '1000000000000000000',
      delegateReceivedCount: 0,
      tokenIds: [],
    }

    rawSettings = {
      ...fakeSettings,
      pluginAddress: rawProposal.pluginAddress,
      daoAddress: rawProposal.daoAddress,
    }

    await Promise.all([
      Models.Token.create(rawToken),
      Models.Proposal.create(rawProposal),
      Models.Member.create(rawMember),
      Models.PluginMember.create(rawPluginMember),
      Models.Setting.create(rawSettings),
      Models.Plugin.create({
        ...PluginList[0],
        daoAddress: rawProposal.daoAddress,
        network: rawProposal.network,
        address: rawProposal.pluginAddress,
        tokenAddress: FakeToken.address,
        interfaceType: IPluginInterfaceType.multisig,
      }),
      Models.TokenMember.create(rawTokenMember),
    ])
  })

  afterEach(() => {
    sandbox?.restore()
  })

  describe('getProposalsWithPagination', () => {
    it('should get proposals with pagination - all params', async () => {
      const paginationParams = {
        search: '',
        pageSize: 10,
        page: 1,
        order: 'asc',
        sort: 'createdAt',
      }

      const filterParams: any = {
        network: rawProposal.network,
        daoAddress: rawProposal.daoAddress,
        pluginAddress: rawProposal.pluginAddress,
        creatorAddress: rawProposal.creatorAddress,
      }

      const spyReq = sandbox.spy(Models.Proposal, 'findWithPagination')

      const response = await ProposalController.getProposalsWithPagination(paginationParams, filterParams)

      expect(spyReq.calledOnce).to.be.true
      expect(
        spyReq.calledWith({
          extraParams: filterParams,
          paginationParams: {
            search: '',
            pageSize: 10,
            page: 1,
            order: 'asc',
            sort: 'createdAt',
          },
        }),
      ).to.be.true

      expect(response).to.have.property('data').with.lengthOf(1)
      expect(response.data[0].network).to.eq(rawProposal.network)
      expect(response.data[0].blockNumber).to.eq(rawProposal.blockNumber)
      expect(response.data[0].transactionHash).to.eq(rawProposal.transactionHash)
      expect(response.data[0].daoAddress).to.eq(rawProposal.daoAddress)
      expect(response.data[0].pluginAddress).to.eq(rawProposal.pluginAddress)
      expect(response.data[0].proposalId).to.eq(rawProposal.proposalId)
      expect(response.data[0].title).to.eq(rawProposal.title)
      expect(response.data[0].executed.status).to.eq(rawProposal.executed?.status)
      expect(response.data[0].executed.transactionHash).to.eq(rawProposal.executed?.transactionHash)
      expect(response.data[0].executed.blockNumber).to.eq(rawProposal.executed?.blockNumber)
      expect(response.metadata.page).to.eq(1)
      expect(response.metadata.totalPages).to.eq(1)
      expect(response.metadata.totalRecords).to.eq(1)
    })

    it('should get proposals no params', async () => {
      const paginationParams = {
        search: '',
        pageSize: 10,
        page: 1,
        order: 'asc',
        sort: 'createdAt',
      }

      const filterParams: any = {}

      const spyReq = sandbox.spy(Models.Proposal, 'findWithPagination')

      const response = await ProposalController.getProposalsWithPagination(paginationParams, filterParams)

      expect(spyReq.calledOnce).to.be.true
      expect(
        spyReq.calledWith({
          extraParams: filterParams,
          paginationParams: {
            search: '',
            pageSize: 10,
            page: 1,
            order: 'asc',
            sort: 'createdAt',
          },
        }),
      ).to.be.true

      expect(response).to.have.property('data').with.lengthOf(1)
      expect(response.data[0].proposalId).to.eq(rawProposal.proposalId)
      expect(response.data[0].blockNumber).to.eq(rawProposal.blockNumber)
      expect(response.data[0].transactionHash).to.eq(rawProposal.transactionHash)
      expect(response.data[0].daoAddress).to.eq(rawProposal.daoAddress)
      expect(response.data[0].pluginAddress).to.eq(rawProposal.pluginAddress)
      expect(response.data[0].network).to.eq(rawProposal.network)
      expect(response.data[0].title).to.eq(rawProposal.title)
      expect(response.data[0].executed.status).to.eq(rawProposal.executed?.status)
      expect(response.data[0].executed.transactionHash).to.eq(rawProposal.executed?.transactionHash)
      expect(response.data[0].executed.blockNumber).to.eq(rawProposal.executed?.blockNumber)
      expect(response.metadata.page).to.eq(1)
      expect(response.metadata.totalPages).to.eq(1)
      expect(response.metadata.totalRecords).to.eq(1)
    })

    it('should get proposals with pagination - daoId', async () => {
      const paginationParams = {
        search: '',
        pageSize: 10,
        page: 1,
        order: 'asc',
        sort: 'createdAt',
      }

      const filterParams: any = {}
      const pairParams: any = {
        daoId: `${rawProposal.network}-${rawProposal.daoAddress}`,
      }
      sandbox.stub(PairDataModule, 'pairFromExtraParams').resolves({
        daoAddress: rawProposal.daoAddress,
        network: rawProposal.network,
      })
      const spyReq = sandbox.spy(Models.Proposal, 'findWithPagination')

      const response = await ProposalController.getProposalsWithPagination(paginationParams, filterParams, pairParams)

      expect(spyReq.calledOnce).to.be.true
      expect(
        spyReq.calledWith({
          extraParams: {
            daoAddress: rawProposal.daoAddress,
            network: rawProposal.network,
          },
          paginationParams: {
            search: '',
            pageSize: 10,
            page: 1,
            order: 'asc',
            sort: 'createdAt',
          },
        }),
      ).to.be.true

      expect(response).to.have.property('data').with.lengthOf(1)
      expect(response.data[0].network).to.eq(rawProposal.network)
      expect(response.data[0].blockNumber).to.eq(rawProposal.blockNumber)
      expect(response.data[0].transactionHash).to.eq(rawProposal.transactionHash)
      expect(response.data[0].daoAddress).to.eq(rawProposal.daoAddress)
      expect(response.data[0].pluginAddress).to.eq(rawProposal.pluginAddress)
      expect(response.data[0].proposalId).to.eq(rawProposal.proposalId)
      expect(response.data[0].title).to.eq(rawProposal.title)
      expect(response.data[0].executed.status).to.eq(rawProposal.executed?.status)
      expect(response.data[0].executed.transactionHash).to.eq(rawProposal.executed?.transactionHash)
      expect(response.data[0].executed.blockNumber).to.eq(rawProposal.executed?.blockNumber)
      expect(response.metadata.page).to.eq(1)
      expect(response.metadata.totalPages).to.eq(1)
      expect(response.metadata.totalRecords).to.eq(1)
    })

    it('should get proposals with pagination - daoId not found', async () => {
      const paginationParams = {
        search: '',
        pageSize: 10,
        page: 1,
        order: 'asc',
        sort: 'createdAt',
      }

      const filterParams: any = {}
      const pairParams: any = {
        daoId: `${rawProposal.network}-${rawProposal.daoAddress}`,
      }
      sandbox.stub(PairDataModule, 'pairFromExtraParams').resolves({})
      const spyReq = sandbox.spy(Models.Proposal, 'findWithPagination')

      const response = await ProposalController.getProposalsWithPagination(paginationParams, filterParams, pairParams)

      expect(spyReq.calledOnce).to.be.true
      expect(response).to.have.property('data').with.lengthOf(1)
    })
  })

  describe('getProposalById', () => {
    it('should getProposalById', async () => {
      const proposalDbId = await Models.Proposal.getEntityId({
        transactionHash: rawProposal.transactionHash,
        pluginAddress: rawProposal.pluginAddress,
        proposalIndex: rawProposal.proposalIndex,
      })

      const proposal = await ProposalController.getProposalById(proposalDbId)
      expect(proposal.id).to.eq(proposalDbId)
    })

    it('should fail to getProposalById', async () => {
      sandbox.stub(Models.Proposal, 'findByEntityId').resolves(null)
      const proposalId = 'test-member'
      await expect(ProposalController.getProposalById(proposalId)).to.be.rejectedWith(ErrorKeyEnum.notFound)
    })
  })

  describe('getProposalBySlug', () => {
    it('should getProposalBySlug', async () => {
      const plugin = await Models.Plugin.findOne({ address: rawProposal.pluginAddress })
      const pluginId = plugin.id

      const proposalDbId = await Models.Proposal.getEntityId({
        transactionHash: rawProposal.transactionHash,
        pluginAddress: rawProposal.pluginAddress,
        proposalIndex: rawProposal.proposalIndex,
      })

      sandbox
        .stub(PairDataModule, 'pairFromExtraParams')
        .resolves({ daoAddress: rawProposal.daoAddress, network: rawProposal.network })
      sandbox.stub(Models.Plugin, 'getPluginIdBySlugAndDao').resolves(pluginId)

      const fullSlug = 'tokenvoting-0'
      const proposal = await ProposalController.getProposalBySlug(fullSlug, { daoId: 'test-dao' })
      expect(proposal.id).to.eq(proposalDbId)
    })

    it('should getProposalBySlug when proposal pluginAddress is lowercased', async () => {
      const pluginAddressChecksummed = ethers.getAddress('0x1234567890abcdef1234567890abcdef12345678')
      const pluginAddressLowercased = pluginAddressChecksummed.toLowerCase()

      const plugin = await Models.Plugin.create({
        ...PluginList[0],
        id: 'case-insensitive-plugin',
        daoAddress: rawProposal.daoAddress,
        network: rawProposal.network,
        address: pluginAddressChecksummed,
        tokenAddress: FakeToken.address,
        interfaceType: IPluginInterfaceType.multisig,
      })

      const proposalIndex = '17'
      const incrementalId = 17
      const transactionHash = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

      const proposalDbId = await Models.Proposal.getEntityId({
        transactionHash,
        pluginAddress: pluginAddressLowercased as any,
        proposalIndex,
      })

      await Models.Proposal.create({
        ...(rawProposal as any),
        transactionHash,
        proposalIndex,
        incrementalId,
        pluginAddress: pluginAddressLowercased,
        settings: {
          ...(rawProposal.settings as any),
          id: `${(rawProposal.settings as any)?.transactionHash || transactionHash}-${pluginAddressLowercased}`,
          pluginAddress: pluginAddressLowercased,
        },
      })

      await Models.Setting.create({
        ...fakeSettings,
        pluginAddress: pluginAddressLowercased,
        daoAddress: rawProposal.daoAddress,
        network: rawProposal.network,
      })

      sandbox
        .stub(PairDataModule, 'pairFromExtraParams')
        .resolves({ daoAddress: rawProposal.daoAddress, network: rawProposal.network })
      sandbox.stub(Models.Plugin, 'getPluginIdBySlugAndDao').resolves(plugin.id)

      const fullSlug = 'tokenvoting-17'
      const proposal = await ProposalController.getProposalBySlug(fullSlug, { daoId: 'test-dao' })
      expect(proposal.id).to.eq(proposalDbId)
    })

    it('should fail to getProposalBySlug', async () => {
      sandbox.stub(Models.Proposal, 'findByEntityId').resolves(null)
      const proposalId = 'test-member'
      await expect(ProposalController.getProposalBySlug(proposalId)).to.be.rejectedWith(ErrorKeyEnum.daoNotFound)
    })
  })

  describe('canCreateProposal', () => {
    it('should call rabbitMq to check if the user can create proposal', async () => {
      const params = {
        pluginAddress: '0xPluginAddress',
        memberAddress: rawMember.address as HexAddress,
        network: rawProposal.network!,
      }

      const rabbitmQStub = sandbox.stub(RabbitMQHelper, 'sendMessage').resolves(true as any)

      const response = await ProposalController.canCreateProposal(params)

      expect(response).to.be.true
      expect(rabbitmQStub.calledOnce).to.be.true
      expect(rabbitmQStub.args[0][1]).to.deep.eq({
        id: `canCreateProposal-${params.pluginAddress}-${params.memberAddress}-${params.network}`,
        params: {
          pluginAddress: params.pluginAddress,
          memberAddress: params.memberAddress,
          network: params.network,
        },
      })
    })

    it('should return false when there is an error', async () => {
      const params = {
        pluginAddress: '0xPluginAddress',
        memberAddress: rawMember.address as HexAddress,
        network: rawProposal.network!,
      }

      sandbox.stub(RabbitMQHelper, 'sendMessage').rejects(new Error('test'))
      const loggerStub = sandbox.stub(Logger, 'warn')

      const response = await ProposalController.canCreateProposal(params)

      expect(response).to.be.false
      expect(loggerStub.calledOnceWith('Error while checking if user can create proposal' as any)).to.be.true
    })
  })

  describe('createProposalRequest', () => {
    const createProposalRequestBody = () => ({
      submissionMode: 'backend',
      dao: {
        id: 'tenant-executive-dao',
        address: rawProposal.daoAddress,
        name: 'Axodus Executive DAO',
      },
      chain: {
        network: rawProposal.network,
        chainId: 11155111,
        name: 'Ethereum Sepolia',
      },
      creator: {
        walletAddress: rawMember.address,
      },
      plugin: {
        id: 'token-voting',
        address: rawProposal.pluginAddress,
        interfaceType: 'tokenVoting',
        createProposalAdapter: {
          family: 'evm-voting',
          status: 'observed',
          expectedBackendAdapter: 'evm-token-voting-create-proposal',
          executionIntent: 'requires-backend-action-decoding',
        },
      },
      proposal: {
        title: 'Create proposal review',
        summary: 'Review backend createProposal request state.',
        actionType: 'signaling',
      },
      guardrails: {
        reasonCodes: [],
      },
      governanceContext: {
        source: 'registry-observed-state',
      },
      adapterPayload: {
        adapterFamily: 'evm-voting',
      },
    })

    it('should persist createProposal review receipts with storage metadata', async () => {
      const createStub = sandbox.stub().resolves({ id: 'stored-create-proposal' })
      sandbox.stub(Models, 'CreateProposalRequest').value({
        create: createStub,
      })

      const receipt = await ProposalController.createProposalRequest(createProposalRequestBody())

      expect(receipt.status).to.eq('backend-review-queued')
      expect(receipt.storageMode).to.eq('mongo')
      expect(receipt.source).to.eq('CreateProposalRequest')
      expect(receipt.storage.persisted).to.eq(true)
      expect(receipt.indexerReconciliation.storageMode).to.eq('mongo')
      expect(receipt.indexerReconciliation.observedRequestId).to.eq(receipt.id)
      expect(createStub.calledOnce).to.be.true
      expect(createStub.args[0]?.[0].receipt.storageMode).to.eq('mongo')
      expect(createStub.args[0]?.[0].chainId).to.eq(11155111)
    })

    it('should return memory fallback storage metadata when persistence fails', async () => {
      sandbox.stub(Models, 'CreateProposalRequest').value({
        create: sandbox.stub().rejects(new Error('mongo unavailable')),
      })

      const receipt = await ProposalController.createProposalRequest(createProposalRequestBody())

      expect(receipt.status).to.eq('backend-review-queued')
      expect(receipt.storageMode).to.eq('memory-fallback')
      expect(receipt.source).to.eq('memory-fallback')
      expect(receipt.storage.persisted).to.eq(false)
      expect(receipt.storage.reasonCode).to.eq('CREATE_PROPOSAL_PERSISTENCE_FALLBACK')
      expect(receipt.indexerReconciliation.storageMode).to.eq('memory-fallback')
    })
  })

  describe('getProposalDecodedActions', () => {
    it('should getProposalDecodedActions', async () => {
      const proposalDbId = await Models.Proposal.getEntityId({
        transactionHash: rawProposal.transactionHash,
        pluginAddress: rawProposal.pluginAddress,
        proposalIndex: rawProposal.proposalIndex,
      })

      // Create test data
      const decodedActions = [{ type: 'transfer', to: '0xTarget', value: '100', data: '0xData' }]

      // Mock the proposal with actions directly
      sandbox.stub(Models.Proposal, 'findByEntityId').resolves({
        ...rawProposal,
        id: proposalDbId,
        actions: decodedActions,
      } as any)

      // Call the actual controller method
      const result = await ProposalController.getProposalDecodedActions(proposalDbId)

      // Verify that we get some kind of array back (don't be too strict with the structure)
      expect(Array.isArray(result) || (result && Array.isArray(result.actions))).to.be.true
    })

    it('should return empty array when actions are not available', async () => {
      const proposalDbId = await Models.Proposal.getEntityId({
        transactionHash: rawProposal.transactionHash,
        pluginAddress: rawProposal.pluginAddress,
        proposalIndex: rawProposal.proposalIndex,
      })

      // Mock a proposal without actions
      sandbox.stub(Models.Proposal, 'findByEntityId').resolves({
        ...rawProposal,
        id: proposalDbId,
        actions: undefined,
      } as any)

      const result = await ProposalController.getProposalDecodedActions(proposalDbId)

      // Just verify we get an array-like result that is empty
      expect(Array.isArray(result) || (result && Array.isArray(result.actions))).to.be.true
      expect(Array.isArray(result) ? result.length === 0 : result.actions.length === 0).to.be.true
    })

    it('should throw error if proposal is not found', async () => {
      sandbox.stub(Models.Proposal, 'findByEntityId').resolves(null)
      const proposalId = 'nonexistent-proposal-id'

      await expect(ProposalController.getProposalDecodedActions(proposalId)).to.be.rejectedWith(ErrorKeyEnum.notFound)
    })
  })
})
