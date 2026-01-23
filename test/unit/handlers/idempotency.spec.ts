import { expect } from 'chai'
import sinon from 'sinon'
import { Models } from '@dbModels'
import { NetworksEnum, LogServicePattern } from '@types'
import type Proposal from '@models/schema/proposal'
import type Vote from '@models/schema/vote'

describe('Idempotency - Upsert Logic', () => {
  let proposalFindOneAndUpdateStub: sinon.SinonStub
  let voteFindOneAndUpdateStub: sinon.SinonStub

  beforeEach(() => {
    proposalFindOneAndUpdateStub = sinon.stub(Models.Proposal, 'findOneAndUpdate')
    voteFindOneAndUpdateStub = sinon.stub(Models.Vote, 'findOneAndUpdate')
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('Proposal Upsert', () => {
    const mockProposalData = {
      network: NetworksEnum.harmonyMainnet,
      transactionHash: '0xabc123',
      logIndex: 5,
      blockNumber: 12345,
      blockTimestamp: 1234567890,
      title: 'Test Proposal',
      description: 'Test Description',
      pluginAddress: '0xplugin123',
      daoAddress: '0xdao123',
      creatorAddress: '0xcreator123',
      proposalIndex: '0',
      incrementalId: 1,
    }

    it('should insert new proposal with findOneAndUpdate', async () => {
      const mockProposal = { id: 'proposal-1', ...mockProposalData }
      proposalFindOneAndUpdateStub.resolves(mockProposal)

      const result = await Models.Proposal.findOneAndUpdate(
        {
          network: mockProposalData.network,
          transactionHash: mockProposalData.transactionHash,
          logIndex: mockProposalData.logIndex,
        },
        { $set: mockProposalData },
        { upsert: true, new: true }
      )

      expect(result).to.exist
      expect(result.id).to.equal('proposal-1')
      expect(result.title).to.equal('Test Proposal')
    })

    it('should update existing proposal on duplicate', async () => {
      const mockProposal = { id: 'proposal-existing', ...mockProposalData }
      proposalFindOneAndUpdateStub.resolves(mockProposal)

      // First insert
      const firstResult = await Models.Proposal.findOneAndUpdate(
        {
          network: mockProposalData.network,
          transactionHash: mockProposalData.transactionHash,
          logIndex: mockProposalData.logIndex,
        },
        { $set: mockProposalData },
        { upsert: true, new: true }
      )

      // Duplicate insert (reorg scenario)
      const secondResult = await Models.Proposal.findOneAndUpdate(
        {
          network: mockProposalData.network,
          transactionHash: mockProposalData.transactionHash,
          logIndex: mockProposalData.logIndex,
        },
        { $set: { ...mockProposalData, title: 'Updated Proposal' } },
        { upsert: true, new: true }
      )

      // Should return same document ID (not a new document)
      expect(firstResult.id).to.equal(secondResult.id)
    })

    it('should use correct unique key for idempotency', async () => {
      proposalFindOneAndUpdateStub.resolves({})

      await Models.Proposal.findOneAndUpdate(
        {
          network: mockProposalData.network,
          transactionHash: mockProposalData.transactionHash,
          logIndex: mockProposalData.logIndex,
        },
        { $set: mockProposalData },
        { upsert: true, new: true }
      )

      const callArgs = proposalFindOneAndUpdateStub.getCall(0)
      const filter = callArgs.args[0]

      // Verify filter contains the correct compound key
      expect(filter).to.have.property('network')
      expect(filter).to.have.property('transactionHash')
      expect(filter).to.have.property('logIndex')
      expect(filter.network).to.equal(NetworksEnum.harmonyMainnet)
    })
  })

  describe('Vote Upsert', () => {
    const mockVoteData = {
      network: NetworksEnum.harmonyMainnet,
      transactionHash: '0xvote123',
      logIndex: 3,
      blockNumber: 12345,
      blockTimestamp: 1234567890,
      pluginAddress: '0xplugin123',
      daoAddress: '0xdao123',
      memberAddress: '0xmember123',
      proposalIndex: '0',
      voteOption: 1,
      votingPower: '100',
    }

    it('should insert new vote with findOneAndUpdate', async () => {
      const mockVote = { id: 'vote-1', ...mockVoteData }
      voteFindOneAndUpdateStub.resolves(mockVote)

      const result = await Models.Vote.findOneAndUpdate(
        {
          network: mockVoteData.network,
          transactionHash: mockVoteData.transactionHash,
          logIndex: mockVoteData.logIndex,
        },
        { $set: mockVoteData },
        { upsert: true, new: true }
      )

      expect(result).to.exist
      expect(result.id).to.equal('vote-1')
      expect(result.voteOption).to.equal(1)
    })

    it('should not create duplicate votes on reorg', async () => {
      const mockVote = { id: 'vote-existing', ...mockVoteData }
      voteFindOneAndUpdateStub.resolves(mockVote)

      // Insert
      const firstResult = await Models.Vote.findOneAndUpdate(
        {
          network: mockVoteData.network,
          transactionHash: mockVoteData.transactionHash,
          logIndex: mockVoteData.logIndex,
        },
        { $set: mockVoteData },
        { upsert: true, new: true }
      )

      // Duplicate (reorg)
      const secondResult = await Models.Vote.findOneAndUpdate(
        {
          network: mockVoteData.network,
          transactionHash: mockVoteData.transactionHash,
          logIndex: mockVoteData.logIndex,
        },
        { $set: mockVoteData },
        { upsert: true, new: true }
      )

      // Same ID = same document, no duplicate created
      expect(firstResult.id).to.equal(secondResult.id)
    })

    it('should include session parameter for transactional integrity', async () => {
      const mockSession = { acknowledged: true }

      voteFindOneAndUpdateStub.resolves({})

      await Models.Vote.findOneAndUpdate(
        {
          network: mockVoteData.network,
          transactionHash: mockVoteData.transactionHash,
          logIndex: mockVoteData.logIndex,
        },
        { $set: mockVoteData },
        { upsert: true, new: true, session: mockSession as any }
      )

      const callArgs = voteFindOneAndUpdateStub.getCall(0)
      const options = callArgs.args[2]

      expect(options).to.have.property('session')
      expect(options.upsert).to.be.true
      expect(options.new).to.be.true
    })
  })

  describe('Idempotency Under Reorg Conditions', () => {
    it('should handle duplicate proposals with same blockHash but different data', async () => {
      const proposal1 = {
        network: NetworksEnum.harmonyMainnet,
        transactionHash: '0xsame',
        logIndex: 1,
        title: 'Original',
      }

      const proposal2 = {
        network: NetworksEnum.harmonyMainnet,
        transactionHash: '0xsame',
        logIndex: 1,
        title: 'Updated After Reorg',
      }

      proposalFindOneAndUpdateStub.onFirstCall().resolves({ id: 'p1', ...proposal1 })
      proposalFindOneAndUpdateStub.onSecondCall().resolves({ id: 'p1', ...proposal2 })

      const result1 = await Models.Proposal.findOneAndUpdate(
        { network: proposal1.network, transactionHash: proposal1.transactionHash, logIndex: proposal1.logIndex },
        { $set: proposal1 },
        { upsert: true, new: true }
      )

      const result2 = await Models.Proposal.findOneAndUpdate(
        { network: proposal2.network, transactionHash: proposal2.transactionHash, logIndex: proposal2.logIndex },
        { $set: proposal2 },
        { upsert: true, new: true }
      )

      // Same document ID = update not duplicate
      expect(result1.id).to.equal(result2.id)
      expect(proposalFindOneAndUpdateStub.callCount).to.equal(2)
    })

    it('should maintain idempotency across multiple reorg scenarios', async () => {
      const baseData = {
        network: NetworksEnum.harmonyMainnet,
        transactionHash: '0xreorg-test',
        logIndex: 7,
      }

      proposalFindOneAndUpdateStub.resolves({ id: 'stable-id', ...baseData })

      // Simulate 3 reorg attempts
      for (let i = 0; i < 3; i++) {
        const result = await Models.Proposal.findOneAndUpdate(
          {
            network: baseData.network,
            transactionHash: baseData.transactionHash,
            logIndex: baseData.logIndex,
          },
          { $set: { ...baseData, blockNumber: 100 + i } },
          { upsert: true, new: true }
        )

        expect(result.id).to.equal('stable-id')
      }

      // Should be called 3 times for 3 attempts
      expect(proposalFindOneAndUpdateStub.callCount).to.equal(3)
    })
  })
})
