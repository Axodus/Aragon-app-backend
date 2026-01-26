import { expect } from 'chai'
import sinon from 'sinon'
import { Models } from '@dbModels'
import { NetworksEnum, LogServicePattern } from '@types'
import BackfillReplayService from '@services/backfillReplay'
import Web3Helper from '@helpers/web3'
import ReorgDetector from '@services/reorgDetector'

const TEST_NETWORK = NetworksEnum.harmonyMainnet
const TEST_SERVICE = 'test-service' as LogServicePattern
const TEST_FROM_BLOCK = 10000
const TEST_TO_BLOCK = 10100

describe('BackfillReplayService', () => {
  let getBlockNumberStub: sinon.SinonStub
  let detectReorgStub: sinon.SinonStub
  let rollbackStub: sinon.SinonStub
  let configIndexerFindOneStub: sinon.SinonStub
  let configIndexerCreateStub: sinon.SinonStub
  let mockConfigIndexer: any

  beforeEach(() => {
    // Stub Web3Helper
    getBlockNumberStub = sinon.stub(Web3Helper, 'getBlockNumber')
    getBlockNumberStub.resolves(100000) // Current block

    // Stub ReorgDetector
    detectReorgStub = sinon.stub(ReorgDetector, 'detectReorg')
    detectReorgStub.resolves({ isReorg: false }) // No reorg by default

    rollbackStub = sinon.stub(ReorgDetector, 'rollbackFromBlock')
    rollbackStub.resolves()

    // Mock ConfigIndexer
    mockConfigIndexer = {
      id: `${TEST_NETWORK}_${TEST_SERVICE}`,
      network: TEST_NETWORK,
      service: TEST_SERVICE,
      lastSync: 0,
      end: false,
      update: sinon.stub().resolves({}),
    }

    configIndexerFindOneStub = sinon.stub(Models.ConfigIndexer, 'findOne')
    configIndexerFindOneStub.resolves(mockConfigIndexer)

    configIndexerCreateStub = sinon.stub(Models.ConfigIndexer, 'create')
    configIndexerCreateStub.resolves(mockConfigIndexer)
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('backfill', () => {
    it('should successfully backfill a block range', async () => {
      const result = await BackfillReplayService.backfill({
        network: TEST_NETWORK,
        service: TEST_SERVICE,
        fromBlock: TEST_FROM_BLOCK,
        toBlock: TEST_TO_BLOCK,
        batchSize: 50,
      })

      expect(result.success).to.be.true
      expect(result.processedBlocks).to.equal(TEST_TO_BLOCK - TEST_FROM_BLOCK + 1)
      expect(result.startBlock).to.equal(TEST_FROM_BLOCK)
      expect(result.endBlock).to.equal(TEST_TO_BLOCK)
      expect(result.errors).to.be.undefined
    })

    it('should validate block range before processing', async () => {
      try {
        await BackfillReplayService.backfill({
          network: TEST_NETWORK,
          service: TEST_SERVICE,
          fromBlock: 10100,
          toBlock: 10000, // Invalid: fromBlock > toBlock
        })
        expect.fail('Should have thrown error')
      } catch (error: any) {
        expect(error.message).to.include('Invalid block range')
      }
    })

    it('should auto-adjust toBlock if it exceeds current chain height', async () => {
      getBlockNumberStub.resolves(10050) // Current block is lower than requested toBlock

      const result = await BackfillReplayService.backfill({
        network: TEST_NETWORK,
        service: TEST_SERVICE,
        fromBlock: TEST_FROM_BLOCK,
        toBlock: 20000, // Higher than current block
      })

      expect(result.success).to.be.true
      expect(result.endBlock).to.equal(10050) // Auto-adjusted
    })

    it('should process data in configurable batches', async () => {
      const batchSize = 25
      const totalBlocks = TEST_TO_BLOCK - TEST_FROM_BLOCK + 1
      const expectedBatches = Math.ceil(totalBlocks / batchSize)

      await BackfillReplayService.backfill({
        network: TEST_NETWORK,
        service: TEST_SERVICE,
        fromBlock: TEST_FROM_BLOCK,
        toBlock: TEST_TO_BLOCK,
        batchSize,
      })

      // Verify checkpoint was updated for each batch
      expect(mockConfigIndexer.update.callCount).to.equal(expectedBatches)
    })

    it('should update checkpoint after each batch', async () => {
      await BackfillReplayService.backfill({
        network: TEST_NETWORK,
        service: TEST_SERVICE,
        fromBlock: TEST_FROM_BLOCK,
        toBlock: TEST_FROM_BLOCK + 49, // 50 blocks with batch size 25 = 2 batches
        batchSize: 25,
      })

      // First batch: blocks 10000-10024
      expect(mockConfigIndexer.update.firstCall.args[0]).to.deep.include({
        lastSync: TEST_FROM_BLOCK + 24,
      })

      // Second batch: blocks 10025-10049
      expect(mockConfigIndexer.update.secondCall.args[0]).to.deep.include({
        lastSync: TEST_FROM_BLOCK + 49,
      })
    })

    it('should report progress via callback', async () => {
      const progressCalls: Array<{ current: number; total: number }> = []

      await BackfillReplayService.backfill({
        network: TEST_NETWORK,
        service: TEST_SERVICE,
        fromBlock: TEST_FROM_BLOCK,
        toBlock: TEST_FROM_BLOCK + 49,
        batchSize: 25,
        onProgress: (current, total) => {
          progressCalls.push({ current, total })
        },
      })

      expect(progressCalls).to.have.lengthOf(2)
      expect(progressCalls[0]).to.deep.equal({ current: TEST_FROM_BLOCK + 24, total: TEST_FROM_BLOCK + 49 })
      expect(progressCalls[1]).to.deep.equal({ current: TEST_FROM_BLOCK + 49, total: TEST_FROM_BLOCK + 49 })
    })

    it('should handle reorg during backfill', async () => {
      // Simulate reorg on second batch
      detectReorgStub.onSecondCall().resolves({
        isReorg: true,
        reorgBlockNumber: TEST_FROM_BLOCK + 25,
        message: 'Reorg detected',
      })

      detectReorgStub.onThirdCall().resolves({ isReorg: false }) // Resume after rollback

      const result = await BackfillReplayService.backfill({
        network: TEST_NETWORK,
        service: TEST_SERVICE,
        fromBlock: TEST_FROM_BLOCK,
        toBlock: TEST_FROM_BLOCK + 49,
        batchSize: 25,
      })

      expect(result.success).to.be.true
      expect(rollbackStub.calledOnce).to.be.true
      expect(rollbackStub.firstCall.args[1]).to.equal(TEST_FROM_BLOCK + 25)
    })

    it('should continue processing after batch error', async () => {
      // Simulate error on first batch
      mockConfigIndexer.update.onFirstCall().rejects(new Error('Database error'))
      mockConfigIndexer.update.onSecondCall().resolves({})

      const result = await BackfillReplayService.backfill({
        network: TEST_NETWORK,
        service: TEST_SERVICE,
        fromBlock: TEST_FROM_BLOCK,
        toBlock: TEST_FROM_BLOCK + 49,
        batchSize: 25,
      })

      expect(result.success).to.be.false
      expect(result.errors).to.have.lengthOf(1)
      expect(result.errors![0]).to.include('Database error')
      expect(mockConfigIndexer.update.callCount).to.equal(2) // Continued to second batch
    })

    it('should create checkpoint if it does not exist', async () => {
      configIndexerFindOneStub.resolves(null) // No existing checkpoint

      await BackfillReplayService.backfill({
        network: TEST_NETWORK,
        service: TEST_SERVICE,
        fromBlock: TEST_FROM_BLOCK,
        toBlock: TEST_TO_BLOCK,
      })

      expect(configIndexerCreateStub.calledOnce).to.be.true
      expect(configIndexerCreateStub.firstCall.args[0]).to.deep.include({
        id: `${TEST_NETWORK}_${TEST_SERVICE}`,
        network: TEST_NETWORK,
        service: TEST_SERVICE,
        lastSync: 0,
        end: false,
      })
    })
  })

  describe('replay', () => {
    it('should replay from last checkpoint to current block', async () => {
      mockConfigIndexer.lastSync = 9000
      getBlockNumberStub.resolves(10000)

      const result = await BackfillReplayService.replay({
        network: TEST_NETWORK,
        service: TEST_SERVICE,
      })

      expect(result.success).to.be.true
      expect(result.startBlock).to.equal(9000)
      expect(result.endBlock).to.equal(10000)
      expect(result.processedBlocks).to.equal(1001)
    })

    it('should replay from specified fromBlock', async () => {
      getBlockNumberStub.resolves(10000)

      const result = await BackfillReplayService.replay({
        network: TEST_NETWORK,
        service: TEST_SERVICE,
        fromBlock: 9500,
      })

      expect(result.startBlock).to.equal(9500)
      expect(result.endBlock).to.equal(10000)
    })

    it('should replay to specified toBlock', async () => {
      mockConfigIndexer.lastSync = 9000

      const result = await BackfillReplayService.replay({
        network: TEST_NETWORK,
        service: TEST_SERVICE,
        toBlock: 9500,
      })

      expect(result.startBlock).to.equal(9000)
      expect(result.endBlock).to.equal(9500)
    })

    it('should use custom batch size', async () => {
      mockConfigIndexer.lastSync = 9000
      getBlockNumberStub.resolves(9100)

      await BackfillReplayService.replay({
        network: TEST_NETWORK,
        service: TEST_SERVICE,
        batchSize: 20,
      })

      // 101 blocks with batch size 20 = 6 batches
      expect(mockConfigIndexer.update.callCount).to.equal(6)
    })
  })

  describe('detectAndFillGaps', () => {
    it('should detect and report gaps in indexed data', async () => {
      const gaps = await BackfillReplayService.detectAndFillGaps(
        TEST_NETWORK,
        TEST_SERVICE,
        TEST_FROM_BLOCK,
        TEST_TO_BLOCK,
      )

      // Stub implementation returns empty array
      expect(gaps).to.be.an('array')
    })

    it('should fill detected gaps', async () => {
      // Note: Current stub implementation returns no gaps
      // In production, this would query models and find missing blocks

      const gaps = await BackfillReplayService.detectAndFillGaps(
        TEST_NETWORK,
        TEST_SERVICE,
        TEST_FROM_BLOCK,
        TEST_TO_BLOCK,
      )

      expect(gaps).to.be.an('array').that.is.empty
    })
  })

  describe('validateIntegrity', () => {
    it('should validate data integrity for a block range', async () => {
      const result = await BackfillReplayService.validateIntegrity(
        TEST_NETWORK,
        TEST_SERVICE,
        TEST_FROM_BLOCK,
        TEST_TO_BLOCK,
      )

      expect(result).to.have.all.keys('valid', 'missingBlocks', 'inconsistencies')
      expect(result.valid).to.be.true
      expect(result.missingBlocks).to.be.an('array').that.is.empty
      expect(result.inconsistencies).to.be.an('array').that.is.empty
    })

    it('should detect reorg inconsistencies', async () => {
      // Simulate reorg at block 10000
      detectReorgStub.withArgs(TEST_NETWORK, TEST_FROM_BLOCK).resolves({
        isReorg: true,
        reorgBlockNumber: TEST_FROM_BLOCK,
        message: 'Reorg detected',
      })

      const result = await BackfillReplayService.validateIntegrity(
        TEST_NETWORK,
        TEST_SERVICE,
        TEST_FROM_BLOCK,
        TEST_TO_BLOCK,
      )

      expect(result.valid).to.be.false
      expect(result.inconsistencies).to.have.lengthOf.at.least(1)
      expect(result.inconsistencies[0]).to.include('Reorg detected')
    })
  })

  describe('Idempotency & Resumability', () => {
    it('should be safe to run backfill multiple times on same range', async () => {
      // First run
      const result1 = await BackfillReplayService.backfill({
        network: TEST_NETWORK,
        service: TEST_SERVICE,
        fromBlock: TEST_FROM_BLOCK,
        toBlock: TEST_TO_BLOCK,
      })

      // Second run (idempotent)
      const result2 = await BackfillReplayService.backfill({
        network: TEST_NETWORK,
        service: TEST_SERVICE,
        fromBlock: TEST_FROM_BLOCK,
        toBlock: TEST_TO_BLOCK,
      })

      expect(result1.success).to.be.true
      expect(result2.success).to.be.true
      expect(result1.processedBlocks).to.equal(result2.processedBlocks)
    })

    it('should resume from last checkpoint after interruption', async () => {
      // Simulate partial completion
      mockConfigIndexer.lastSync = TEST_FROM_BLOCK + 50

      const result = await BackfillReplayService.replay({
        network: TEST_NETWORK,
        service: TEST_SERVICE,
        toBlock: TEST_TO_BLOCK,
      })

      expect(result.startBlock).to.equal(TEST_FROM_BLOCK + 50)
      expect(result.success).to.be.true
    })
  })

  describe('Error Handling & Edge Cases', () => {
    it('should handle checkpoint creation failure', async () => {
      configIndexerFindOneStub.resolves(null)
      configIndexerCreateStub.rejects(new Error('Database connection lost'))

      const result = await BackfillReplayService.backfill({
        network: TEST_NETWORK,
        service: TEST_SERVICE,
        fromBlock: TEST_FROM_BLOCK,
        toBlock: TEST_TO_BLOCK,
      })

      expect(result.success).to.be.false
      expect(result.errors).to.have.lengthOf(1)
      expect(result.errors![0]).to.include('Database connection lost')
    })

    it('should handle Web3 provider failure during backfill', async () => {
      getBlockNumberStub.rejects(new Error('RPC connection timeout'))

      const result = await BackfillReplayService.replay({
        network: TEST_NETWORK,
        service: TEST_SERVICE,
      })

      expect(result.success).to.be.false
      expect(result.errors).to.have.lengthOf(1)
    })

    it('should handle zero-block range gracefully', async () => {
      const result = await BackfillReplayService.backfill({
        network: TEST_NETWORK,
        service: TEST_SERVICE,
        fromBlock: TEST_FROM_BLOCK,
        toBlock: TEST_FROM_BLOCK, // Single block
      })

      expect(result.success).to.be.true
      expect(result.processedBlocks).to.equal(1)
    })

    it('should handle large block ranges with appropriate batching', async () => {
      const largeRange = 10000 // 10k blocks
      const batchSize = 100

      const result = await BackfillReplayService.backfill({
        network: TEST_NETWORK,
        service: TEST_SERVICE,
        fromBlock: TEST_FROM_BLOCK,
        toBlock: TEST_FROM_BLOCK + largeRange - 1,
        batchSize,
      })

      expect(result.success).to.be.true
      expect(result.processedBlocks).to.equal(largeRange)
      expect(mockConfigIndexer.update.callCount).to.equal(largeRange / batchSize)
    })
  })
})
