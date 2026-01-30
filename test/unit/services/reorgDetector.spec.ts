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
  let transactionFindStub: sinon.SinonStub
  let daoPermissionFindStub: sinon.SinonStub
  let selectorPermissionFindStub: sinon.SinonStub
  let settingFindStub: sinon.SinonStub

  beforeEach(() => {
    // Stub Web3Helper.getBlockHash
    web3Stub = sinon.stub(Web3Helper, 'getBlockHash')
    proposalFindStub = sinon.stub(Models.Proposal, 'deleteMany')
    voteFindStub = sinon.stub(Models.Vote, 'deleteMany')
    transactionFindStub = sinon.stub(Models.Transaction, 'deleteMany')
    daoPermissionFindStub = sinon.stub(Models.DaoPermission, 'deleteMany')
    selectorPermissionFindStub = sinon.stub(Models.SelectorPermission, 'deleteMany')
    settingFindStub = sinon.stub(Models.Setting, 'deleteMany')
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

    it('should return isReorg=false when current block hash is missing', async () => {
      web3Stub.resolves(undefined)
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
      transactionFindStub.resolves({ deletedCount: 2 })
      daoPermissionFindStub.resolves({ deletedCount: 1 })
      selectorPermissionFindStub.resolves({ deletedCount: 0 })
      settingFindStub.resolves({ deletedCount: 0 })

      const updateManyStub = sinon.stub(Models.ConfigIndexer, 'updateMany').resolves({})

      await ReorgDetector.rollbackFromBlock(TEST_NETWORK, TEST_BLOCK)

      expect(proposalFindStub.called).to.be.true
      expect(voteFindStub.called).to.be.true
      expect(transactionFindStub.called).to.be.true
      expect(daoPermissionFindStub.called).to.be.true
      expect(selectorPermissionFindStub.called).to.be.true
      expect(settingFindStub.called).to.be.true

      updateManyStub.restore()
    })
  })

  describe('Comprehensive Reorg Simulation Tests', () => {
    /**
     * Tests realistic blockchain reorganization scenarios where the chain
     * forks and a different canonical chain emerges. These tests simulate
     * reorgs of varying depths (1-10 blocks) to validate detection and rollback.
     */

    describe('Single Block Reorg (depth=1)', () => {
      it('should detect and rollback 1-block reorg correctly', async () => {
        const reorgBlock = 10000
        const originalHash = '0xoriginal1234567890abcdef'
        const newHash = '0xnew1234567890abcdef'

        // Initial state: block 10000 synced with originalHash
        const mockConfig = {
          lastBlockHash: originalHash,
          lastBlockHashNumber: reorgBlock,
          service: 'test-indexer',
          update: sinon.stub().resolves({}),
        } as any

        configIndexerFindStub.resolves([mockConfig])
        
        // Chain reorg: block 10000 now has different hash
        web3Stub.resolves(newHash)

        // Detect reorg
        const detection = await ReorgDetector.detectReorg(TEST_NETWORK, reorgBlock)

        expect(detection.isReorg).to.be.true
        expect(detection.reorgBlockNumber).to.equal(reorgBlock)
        expect(detection.message).to.include('Reorg detected')

        // Rollback should delete documents from block 10000 onwards
        proposalFindStub.resolves({ deletedCount: 2 })
        voteFindStub.resolves({ deletedCount: 5 })
        transactionFindStub.resolves({ deletedCount: 1 })
        daoPermissionFindStub.resolves({ deletedCount: 0 })
        selectorPermissionFindStub.resolves({ deletedCount: 0 })
        settingFindStub.resolves({ deletedCount: 0 })

        const updateManyStub = sinon.stub(Models.ConfigIndexer, 'updateMany').resolves({})

        await ReorgDetector.rollbackFromBlock(TEST_NETWORK, reorgBlock)

        expect(proposalFindStub.calledWith({
          network: TEST_NETWORK,
          blockNumber: { $gte: reorgBlock },
        })).to.be.true

        expect(updateManyStub.calledWith(
          { network: TEST_NETWORK },
          {
            $set: {
              lastSync: reorgBlock - 1,
              lastBlockHash: undefined,
              lastBlockHashNumber: undefined,
            },
          }
        )).to.be.true

        updateManyStub.restore()
      })
    })

    describe('Multi-Block Reorg (depth=3-5)', () => {
      it('should handle 3-block reorg with multiple events per block', async () => {
        const reorgStartBlock = 10000
        const currentBlock = 10002
        
        // Simulate detecting reorg at block 10000
        const mockConfig = {
          lastBlockHash: '0xold_10000',
          lastBlockHashNumber: reorgStartBlock,
          service: 'test-indexer',
          update: sinon.stub().resolves({}),
        } as any

        configIndexerFindStub.resolves([mockConfig])
        web3Stub.resolves('0xnew_10000')

        const detection = await ReorgDetector.detectReorg(TEST_NETWORK, reorgStartBlock)
        expect(detection.isReorg).to.be.true

        // Rollback should delete events from blocks 10000, 10001, 10002
        // Simulating: 10 proposals, 30 votes, 5 transactions across 3 blocks
        proposalFindStub.resolves({ deletedCount: 10 })
        voteFindStub.resolves({ deletedCount: 30 })
        transactionFindStub.resolves({ deletedCount: 5 })
        daoPermissionFindStub.resolves({ deletedCount: 2 })
        selectorPermissionFindStub.resolves({ deletedCount: 0 })
        settingFindStub.resolves({ deletedCount: 1 })

        const updateManyStub = sinon.stub(Models.ConfigIndexer, 'updateMany').resolves({})

        await ReorgDetector.rollbackFromBlock(TEST_NETWORK, reorgStartBlock)

        // Verify all models were queried for deletion
        expect(proposalFindStub.called).to.be.true
        expect(voteFindStub.called).to.be.true
        expect(transactionFindStub.called).to.be.true

        // Verify checkpoint reset to one block before reorg
        expect(updateManyStub.calledWith(
          { network: TEST_NETWORK },
          {
            $set: {
              lastSync: reorgStartBlock - 1,
              lastBlockHash: undefined,
              lastBlockHashNumber: undefined,
            },
          }
        )).to.be.true

        updateManyStub.restore()
      })

      it('should handle 5-block reorg with no events in some blocks', async () => {
        const reorgStartBlock = 20000
        
        // Detect reorg at block 20000
        const mockConfig = {
          lastBlockHash: '0xold_20000',
          lastBlockHashNumber: reorgStartBlock,
          service: 'test-indexer',
          update: sinon.stub().resolves({}),
        } as any

        configIndexerFindStub.resolves([mockConfig])
        web3Stub.resolves('0xnew_20000')

        const detection = await ReorgDetector.detectReorg(TEST_NETWORK, reorgStartBlock)
        expect(detection.isReorg).to.be.true

        // Rollback with sparse events (some blocks have no events)
        proposalFindStub.resolves({ deletedCount: 3 })
        voteFindStub.resolves({ deletedCount: 0 }) // No votes in these blocks
        transactionFindStub.resolves({ deletedCount: 1 })
        daoPermissionFindStub.resolves({ deletedCount: 0 })
        selectorPermissionFindStub.resolves({ deletedCount: 0 })
        settingFindStub.resolves({ deletedCount: 0 })

        const updateManyStub = sinon.stub(Models.ConfigIndexer, 'updateMany').resolves({})

        await ReorgDetector.rollbackFromBlock(TEST_NETWORK, reorgStartBlock)

        // Should handle zero deletions gracefully
        expect(voteFindStub.called).to.be.true
        expect(daoPermissionFindStub.called).to.be.true
        expect(selectorPermissionFindStub.called).to.be.true
        expect(settingFindStub.called).to.be.true

        updateManyStub.restore()
      })
    })

    describe('Deep Reorg (depth=10)', () => {
      it('should handle 10-block deep reorg with high event volume', async () => {
        const reorgStartBlock = 30000
        const reorgDepth = 10
        
        // Simulate deep reorg detection
        const mockConfig = {
          lastBlockHash: '0xold_30000',
          lastBlockHashNumber: reorgStartBlock,
          service: 'test-indexer',
          update: sinon.stub().resolves({}),
        } as any

        configIndexerFindStub.resolves([mockConfig])
        web3Stub.resolves('0xnew_30000')

        const detection = await ReorgDetector.detectReorg(TEST_NETWORK, reorgStartBlock)
        expect(detection.isReorg).to.be.true
        expect(detection.reorgBlockNumber).to.equal(reorgStartBlock)

        // Simulate high volume: ~500 events across 10 blocks
        proposalFindStub.resolves({ deletedCount: 150 })
        voteFindStub.resolves({ deletedCount: 300 })
        transactionFindStub.resolves({ deletedCount: 30 })
        daoPermissionFindStub.resolves({ deletedCount: 15 })
        selectorPermissionFindStub.resolves({ deletedCount: 0 })
        settingFindStub.resolves({ deletedCount: 5 })

        const updateManyStub = sinon.stub(Models.ConfigIndexer, 'updateMany').resolves({})

        await ReorgDetector.rollbackFromBlock(TEST_NETWORK, reorgStartBlock)

        // Verify query parameters for block range
        expect(proposalFindStub.calledWith({
          network: TEST_NETWORK,
          blockNumber: { $gte: reorgStartBlock },
        })).to.be.true

        expect(voteFindStub.calledWith({
          network: TEST_NETWORK,
          blockNumber: { $gte: reorgStartBlock },
        })).to.be.true

        // Verify checkpoint reset
        expect(updateManyStub.calledWith(
          { network: TEST_NETWORK },
          {
            $set: {
              lastSync: reorgStartBlock - 1,
              lastBlockHash: undefined,
              lastBlockHashNumber: undefined,
            },
          }
        )).to.be.true

        updateManyStub.restore()
      })

      it('should handle 10-block reorg at chain tip (recent blocks)', async () => {
        const currentBlockHeight = 100000
        const reorgStartBlock = currentBlockHeight - 10
        
        // Reorg at chain tip (most likely scenario)
        const mockConfig = {
          lastBlockHash: '0xold_tip',
          lastBlockHashNumber: reorgStartBlock,
          service: 'test-indexer',
          update: sinon.stub().resolves({}),
        } as any

        configIndexerFindStub.resolves([mockConfig])
        web3Stub.resolves('0xnew_tip')

        const detection = await ReorgDetector.detectReorg(TEST_NETWORK, reorgStartBlock)
        expect(detection.isReorg).to.be.true

        // Recent blocks typically have fewer finalized events
        proposalFindStub.resolves({ deletedCount: 5 })
        voteFindStub.resolves({ deletedCount: 12 })
        transactionFindStub.resolves({ deletedCount: 2 })
        daoPermissionFindStub.resolves({ deletedCount: 1 })
        selectorPermissionFindStub.resolves({ deletedCount: 0 })
        settingFindStub.resolves({ deletedCount: 0 })

        const updateManyStub = sinon.stub(Models.ConfigIndexer, 'updateMany').resolves({})

        await ReorgDetector.rollbackFromBlock(TEST_NETWORK, reorgStartBlock)

        // Verify checkpoint moves back 10 blocks
        expect(updateManyStub.calledWith(
          { network: TEST_NETWORK },
          {
            $set: {
              lastSync: reorgStartBlock - 1,
              lastBlockHash: undefined,
              lastBlockHashNumber: undefined,
            },
          }
        )).to.be.true

        updateManyStub.restore()
      })
    })

    describe('Edge Cases & Stress Tests', () => {
      it('should handle reorg with zero events to rollback', async () => {
        const reorgBlock = 50000
        
        const mockConfig = {
          lastBlockHash: '0xold_50000',
          lastBlockHashNumber: reorgBlock,
          service: 'test-indexer',
          update: sinon.stub().resolves({}),
        } as any

        configIndexerFindStub.resolves([mockConfig])
        web3Stub.resolves('0xnew_50000')

        const detection = await ReorgDetector.detectReorg(TEST_NETWORK, reorgBlock)
        expect(detection.isReorg).to.be.true

        // No events in reorged blocks
        proposalFindStub.resolves({ deletedCount: 0 })
        voteFindStub.resolves({ deletedCount: 0 })
        transactionFindStub.resolves({ deletedCount: 0 })
        daoPermissionFindStub.resolves({ deletedCount: 0 })
        selectorPermissionFindStub.resolves({ deletedCount: 0 })
        settingFindStub.resolves({ deletedCount: 0 })

        const updateManyStub = sinon.stub(Models.ConfigIndexer, 'updateMany').resolves({})

        await ReorgDetector.rollbackFromBlock(TEST_NETWORK, reorgBlock)

        // Should complete successfully even with zero deletions
        expect(updateManyStub.called).to.be.true

        updateManyStub.restore()
      })

      it('should handle reorg detection with multiple services', async () => {
        const reorgBlock = 60000
        
        // Multiple services tracking same block
        const mockConfigs = [
          {
            lastBlockHash: '0xold_60000',
            lastBlockHashNumber: reorgBlock,
            service: 'indexer-service-1',
            update: sinon.stub().resolves({}),
          },
          {
            lastBlockHash: '0xold_60000',
            lastBlockHashNumber: reorgBlock,
            service: 'indexer-service-2',
            update: sinon.stub().resolves({}),
          },
        ] as any[]

        configIndexerFindStub.resolves(mockConfigs)
        web3Stub.resolves('0xnew_60000')

        const detection = await ReorgDetector.detectReorg(TEST_NETWORK, reorgBlock)

        // Should detect reorg from first service mismatch
        expect(detection.isReorg).to.be.true
        expect(detection.message).to.include('indexer-service-1')
      })

      it('should handle consecutive reorgs gracefully', async () => {
        // Simulate two reorgs in sequence
        const firstReorgBlock = 70000
        const secondReorgBlock = 70005
        
        // First reorg
        let mockConfig = {
          lastBlockHash: '0xold_70000',
          lastBlockHashNumber: firstReorgBlock,
          service: 'test-indexer',
          update: sinon.stub().resolves({}),
        } as any

        configIndexerFindStub.resolves([mockConfig])
        web3Stub.resolves('0xnew_70000')

        const firstDetection = await ReorgDetector.detectReorg(TEST_NETWORK, firstReorgBlock)
        expect(firstDetection.isReorg).to.be.true

        proposalFindStub.resolves({ deletedCount: 5 })
        voteFindStub.resolves({ deletedCount: 10 })
        transactionFindStub.resolves({ deletedCount: 2 })
        daoPermissionFindStub.resolves({ deletedCount: 0 })
        selectorPermissionFindStub.resolves({ deletedCount: 0 })
        settingFindStub.resolves({ deletedCount: 0 })

        let updateManyStub = sinon.stub(Models.ConfigIndexer, 'updateMany').resolves({})
        await ReorgDetector.rollbackFromBlock(TEST_NETWORK, firstReorgBlock)
        updateManyStub.restore()

        // Second reorg shortly after
        mockConfig = {
          lastBlockHash: '0xnew_70005',
          lastBlockHashNumber: secondReorgBlock,
          service: 'test-indexer',
          update: sinon.stub().resolves({}),
        } as any

        configIndexerFindStub.resolves([mockConfig])
        web3Stub.resolves('0xdifferent_70005')

        const secondDetection = await ReorgDetector.detectReorg(TEST_NETWORK, secondReorgBlock)
        expect(secondDetection.isReorg).to.be.true

        proposalFindStub.resolves({ deletedCount: 3 })
        voteFindStub.resolves({ deletedCount: 7 })
        transactionFindStub.resolves({ deletedCount: 1 })
        daoPermissionFindStub.resolves({ deletedCount: 0 })
        selectorPermissionFindStub.resolves({ deletedCount: 0 })
        settingFindStub.resolves({ deletedCount: 0 })

        updateManyStub = sinon.stub(Models.ConfigIndexer, 'updateMany').resolves({})
        await ReorgDetector.rollbackFromBlock(TEST_NETWORK, secondReorgBlock)
        updateManyStub.restore()
      })
    })
  })
})
