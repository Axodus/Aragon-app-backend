import { expect } from 'chai'
import sinon from 'sinon'
import { Models } from '@dbModels'
import { NetworksEnum } from '@types'
import { ReorgDetector } from '@services/reorgDetector'
import Web3Helper from '@helpers/web3'
import type Proposal from '@models/schema/proposal'
import type Vote from '@models/schema/vote'
import type ConfigIndexer from '@models/schema/configIndexer'

const TEST_NETWORK = NetworksEnum.harmonyMainnet
const TEST_BLOCK = 12345
const TEST_HASH_1 = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
const TEST_HASH_2 = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'

describe('ReorgDetector', () => {
  let web3Stub: sinon.SinonStub
  let proposalFindStub: sinon.SinonStub
  let voteFindStub: sinon.SinonStub
  let configIndexerFindStub: sinon.SinonStub

  beforeEach(() => {
    // Stub Web3Helper.getBlockHash
    web3Stub = sinon.stub(Web3Helper, 'getBlockHash')
    proposalFindStub = sinon.stub(Models.Proposal, 'deleteMany')
    voteFindStub = sinon.stub(Models.Vote, 'deleteMany')
    configIndexerFindStub = sinon.stub(Models.ConfigIndexer, 'find')
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('detectReorg', () => {
    it('should return isReorg=false when no previous block hash stored', async () => {
      web3Stub.resolves(TEST_HASH_1)
      configIndexerFindStub.resolves([])

      const result = await ReorgDetector.detectReorg(TEST_NETWORK, TEST_BLOCK)

      expect(result.isReorg).to.be.false
    })

    it('should return isReorg=false when block hash matches', async () => {
      web3Stub.resolves(TEST_HASH_1)

      const mockConfig = {
        lastBlockHash: TEST_HASH_1,
        lastBlockHashNumber: TEST_BLOCK,
        update: sinon.stub().resolves({}),
      } as any

      configIndexerFindStub.resolves([mockConfig])

      const result = await ReorgDetector.detectReorg(TEST_NETWORK, TEST_BLOCK)

      expect(result.isReorg).to.be.false
    })

    it('should return isReorg=true when block hash differs', async () => {
      web3Stub.resolves(TEST_HASH_2)

      const mockConfig = {
        lastBlockHash: TEST_HASH_1,
        lastBlockHashNumber: TEST_BLOCK,
        service: 'test-service',
        update: sinon.stub().resolves({}),
      } as any

      configIndexerFindStub.resolves([mockConfig])

      const result = await ReorgDetector.detectReorg(TEST_NETWORK, TEST_BLOCK)

      expect(result.isReorg).to.be.true
      expect(result.reorgBlockNumber).to.equal(TEST_BLOCK)
      expect(result.message).to.include('Reorg detected')
    })

    it('should handle when older block number is stored', async () => {
      web3Stub.resolves(TEST_HASH_1)

      const mockConfig = {
        lastBlockHash: TEST_HASH_1,
        lastBlockHashNumber: TEST_BLOCK - 100,
        update: sinon.stub().resolves({}),
      } as any

      configIndexerFindStub.resolves([mockConfig])

      const result = await ReorgDetector.detectReorg(TEST_NETWORK, TEST_BLOCK)

      expect(result.isReorg).to.be.false
      expect(mockConfig.update.called).to.be.true
    })
  })

  describe('rollbackFromBlock', () => {
    it('should delete proposals at and after reorg block', async () => {
      proposalFindStub.resolves({ deletedCount: 5 })
      voteFindStub.resolves({ deletedCount: 0 })

      const deleteManyStub = sinon.stub(Models.ConfigIndexer, 'updateMany').resolves({})

      await ReorgDetector.rollbackFromBlock(TEST_NETWORK, TEST_BLOCK)

      expect(proposalFindStub.calledWith({
        network: TEST_NETWORK,
        blockNumber: { $gte: TEST_BLOCK },
      })).to.be.true

      deleteManyStub.restore()
    })

    it('should reset ConfigIndexer checkpoint', async () => {
      proposalFindStub.resolves({ deletedCount: 0 })
      voteFindStub.resolves({ deletedCount: 0 })

      const updateManyStub = sinon.stub(Models.ConfigIndexer, 'updateMany').resolves({})

      await ReorgDetector.rollbackFromBlock(TEST_NETWORK, TEST_BLOCK)

      expect(updateManyStub.calledWith(
        { network: TEST_NETWORK },
        {
          $set: {
            lastSync: TEST_BLOCK - 1,
            lastBlockHash: undefined,
            lastBlockHashNumber: undefined,
          },
        }
      )).to.be.true

      updateManyStub.restore()
    })

    it('should handle multiple documents rollback', async () => {
      proposalFindStub.resolves({ deletedCount: 10 })
      voteFindStub.resolves({ deletedCount: 25 })

      const updateManyStub = sinon.stub(Models.ConfigIndexer, 'updateMany').resolves({})

      await ReorgDetector.rollbackFromBlock(TEST_NETWORK, TEST_BLOCK)

      expect(proposalFindStub.called).to.be.true
      expect(voteFindStub.called).to.be.true

      updateManyStub.restore()
    })
  })
})
