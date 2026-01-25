import { expect } from 'chai'
import sinon from 'sinon'
import { NetworksEnum } from '@types'
import { ReorgDetector } from '@helpers/reorgDetector'
import { BackfillReplayService } from '@services/backfillReplay'
import { ResilienceMetrics } from '@services/resilienceMetrics'
import { RpcPool } from '@modules/rpcPool'
import { Web3Helper } from '@helpers/web3'
import { Models } from '@dbModels'

/**
 * Integration tests for the complete resilience stack:
 * - Reorg detection and rollback
 * - RPC failover during operations
 * - Backfill/replay with checkpoints
 * - Metrics recording throughout
 */
describe('Resilience Stack Integration Tests', () => {
  let sandbox: sinon.SinonSandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
    ResilienceMetrics.clearInstance()
  })

  describe('End-to-End: Reorg Detection → Rollback → Backfill', () => {
    it('should detect reorg, rollback events, and resume backfill from reorg point', async () => {
      const network = NetworksEnum.harmonyMainnet
      const service = 'proposals'

      // Mock database models
      const mockProposals = [
        { blockNumber: 100, delete: sandbox.stub().resolves() },
        { blockNumber: 101, delete: sandbox.stub().resolves() },
        { blockNumber: 102, delete: sandbox.stub().resolves() },
      ]
      const mockConfigIndexer = {
        lastSync: 102,
        lastBlockHash: '0xold',
        update: sandbox.stub().resolves(),
      }

      sandbox.stub(Models.Proposal, 'find').resolves(mockProposals as any)
      sandbox.stub(Models.Vote, 'find').resolves([])
      sandbox.stub(Models.Transaction, 'find').resolves([])
      sandbox.stub(Models.Permission, 'find').resolves([])
      sandbox.stub(Models.Setting, 'find').resolves([])
      sandbox.stub(Models.ConfigIndexer, 'findOne').resolves(mockConfigIndexer as any)
      sandbox.stub(Models.ConfigIndexer, 'create').resolves(mockConfigIndexer as any)

      // Mock Web3Helper to simulate reorg scenario
      let blockCallCount = 0
      sandbox.stub(Web3Helper, 'getBlockHash').callsFake(async (blockNumber: number) => {
        if (blockNumber === 100) {
          blockCallCount++
          // First call: old hash (before reorg)
          // Second call: new hash (after reorg detected)
          return blockCallCount === 1 ? '0xold' : '0xnew'
        }
        return `0xhash${blockNumber}`
      })

      sandbox.stub(Web3Helper, 'getBlockNumber').resolves(105)
      sandbox.stub(Web3Helper, 'getBlock').resolves({ number: 100, hash: '0xnew' } as any)

      // Mock processBatch for backfill
      sandbox.stub(BackfillReplayService as any, 'processBatch').resolves()

      // Initialize metrics
      const metrics = ResilienceMetrics.getInstance('test-service')
      sandbox.spy(metrics, 'recordReorgDetected')
      sandbox.spy(metrics, 'recordReorgRollback')
      sandbox.spy(metrics, 'recordBackfillProgress')

      // Step 1: Detect reorg at block 100
      const reorgResult = await ReorgDetector.detectReorg(network, 100)

      expect(reorgResult.isReorg).to.be.true
      expect(reorgResult.reorgBlockNumber).to.equal(100)

      // Step 2: Rollback from block 100
      const eventsRolledBack = await ReorgDetector.rollbackFromBlock(network, 100)

      expect(eventsRolledBack).to.equal(3) // 3 proposals deleted
      expect(mockProposals[0].delete.calledOnce).to.be.true

      // Step 3: Backfill from reorg point to current block
      const backfillResult = await BackfillReplayService.backfill({
        network,
        service,
        fromBlock: 100,
        toBlock: 105,
        batchSize: 10,
      })

      expect(backfillResult.success).to.be.true
      expect(backfillResult.blocksProcessed).to.equal(6) // 100-105 inclusive
      expect(mockConfigIndexer.update.called).to.be.true

      // Verify metrics were recorded
      expect((metrics.recordReorgDetected as sinon.SinonSpy).called).to.be.true
      expect((metrics.recordReorgRollback as sinon.SinonSpy).called).to.be.true
      expect((metrics.recordBackfillProgress as sinon.SinonSpy).called).to.be.true
    })

    it('should handle reorg during backfill and restart from reorg point', async () => {
      const network = NetworksEnum.harmonyMainnet
      const service = 'proposals'

      // Mock ConfigIndexer
      const mockConfigIndexer = {
        lastSync: 90,
        update: sandbox.stub().resolves(),
      }
      sandbox.stub(Models.ConfigIndexer, 'findOne').resolves(mockConfigIndexer as any)
      sandbox.stub(Models.ConfigIndexer, 'create').resolves(mockConfigIndexer as any)

      // Mock reorg detection: reorg at block 95 during backfill
      let reorgDetectCallCount = 0
      sandbox.stub(ReorgDetector, 'detectReorg').callsFake(async () => {
        reorgDetectCallCount++
        if (reorgDetectCallCount === 2) {
          // Reorg detected on second batch
          return { isReorg: true, reorgBlockNumber: 95 }
        }
        return { isReorg: false }
      })

      sandbox.stub(ReorgDetector, 'rollbackFromBlock').resolves(5) // 5 events rolled back
      sandbox.stub(Web3Helper, 'getBlockNumber').resolves(100)
      sandbox.stub(BackfillReplayService as any, 'processBatch').resolves()

      const metrics = ResilienceMetrics.getInstance('test-service')
      sandbox.spy(metrics, 'recordBackfillProgress')

      // Backfill from 90 to 100
      const result = await BackfillReplayService.backfill({
        network,
        service,
        fromBlock: 90,
        toBlock: 100,
        batchSize: 5, // Small batches to trigger multiple iterations
      })

      expect(result.success).to.be.true

      // Verify reorg was detected and handled
      expect((ReorgDetector.detectReorg as sinon.SinonStub).callCount).to.be.greaterThan(1)
      expect((ReorgDetector.rollbackFromBlock as sinon.SinonStub).calledOnce).to.be.true

      // Verify backfill restarted from reorg point
      const processBatchStub = BackfillReplayService['processBatch'] as sinon.SinonStub
      const batchCalls = processBatchStub.getCalls()
      const reorgBatchIndex = batchCalls.findIndex(call => call.args[2] === 95)
      expect(reorgBatchIndex).to.be.greaterThan(-1)
    })
  })

  describe('End-to-End: RPC Failover During Backfill', () => {
    it('should failover to backup provider when primary fails during backfill', async () => {
      const network = NetworksEnum.harmonyMainnet
      const service = 'proposals'

      // Mock ConfigIndexer
      const mockConfigIndexer = {
        lastSync: 100,
        update: sandbox.stub().resolves(),
      }
      sandbox.stub(Models.ConfigIndexer, 'findOne').resolves(mockConfigIndexer as any)

      // Mock RPC pool with failover
      let getBlockNumberCallCount = 0
      sandbox.stub(Web3Helper, 'getBlockNumber').callsFake(async () => {
        getBlockNumberCallCount++
        if (getBlockNumberCallCount === 1) {
          throw new Error('TIMEOUT') // Primary provider fails
        }
        return 105 // Backup provider succeeds
      })

      sandbox.stub(ReorgDetector, 'detectReorg').resolves({ isReorg: false })
      sandbox.stub(BackfillReplayService as any, 'processBatch').resolves()

      const metrics = ResilienceMetrics.getInstance('test-service')
      sandbox.spy(metrics, 'recordRpcError')
      sandbox.spy(metrics, 'recordBackfillProgress')

      // Attempt backfill (should trigger failover)
      const result = await BackfillReplayService.backfill({
        network,
        service,
        fromBlock: 100,
        toBlock: 105,
        batchSize: 10,
      })

      expect(result.success).to.be.true

      // Verify failover occurred (first call failed, second succeeded)
      expect(getBlockNumberCallCount).to.equal(2)
    })

    it('should record RPC errors and continue with healthy provider', async () => {
      const network = NetworksEnum.harmonyMainnet

      // Initialize RPC pool
      sandbox.stub(RpcPool as any, 'getEndpoints').returns([
        { name: 'aragon-provider', provider: {}, isHealthy: true, consecutiveFailures: 0 },
        { name: 'drpc-provider', provider: {}, isHealthy: true, consecutiveFailures: 0 },
      ])

      const metrics = ResilienceMetrics.getInstance('test-service')
      sandbox.spy(metrics, 'recordRpcError')
      sandbox.spy(metrics, 'recordRpcFailover')

      // Mock operation that fails on first provider
      let operationCallCount = 0
      const mockOperation = sandbox.stub().callsFake(async () => {
        operationCallCount++
        if (operationCallCount === 1) {
          throw new Error('NETWORK_ERROR')
        }
        return { blockNumber: 100 }
      })

      // Execute with failover
      const result = await RpcPool.executeWithFailover(network, mockOperation, 'getBlock')

      expect(result).to.deep.equal({ blockNumber: 100 })
      expect(operationCallCount).to.equal(2) // Failed once, succeeded once

      // Verify metrics recorded
      expect((metrics.recordRpcError as sinon.SinonSpy).calledOnce).to.be.true
      expect((metrics.recordRpcFailover as sinon.SinonSpy).calledOnce).to.be.true
    })
  })

  describe('End-to-End: Gap Detection and Filling', () => {
    it('should detect gaps in indexed data and fill them via backfill', async () => {
      const network = NetworksEnum.harmonyMainnet
      const service = 'proposals'

      // Mock database to simulate gaps: blocks 100-105, 110-115 indexed; gap at 106-109
      sandbox.stub(Models.Proposal, 'aggregate').resolves([
        { _id: 100 },
        { _id: 101 },
        { _id: 102 },
        { _id: 103 },
        { _id: 104 },
        { _id: 105 },
        // Gap: 106-109 missing
        { _id: 110 },
        { _id: 111 },
        { _id: 112 },
        { _id: 113 },
        { _id: 114 },
        { _id: 115 },
      ])

      const mockConfigIndexer = {
        lastSync: 115,
        update: sandbox.stub().resolves(),
      }
      sandbox.stub(Models.ConfigIndexer, 'findOne').resolves(mockConfigIndexer as any)
      sandbox.stub(Models.ConfigIndexer, 'create').resolves(mockConfigIndexer as any)

      sandbox.stub(ReorgDetector, 'detectReorg').resolves({ isReorg: false })
      sandbox.stub(Web3Helper, 'getBlockNumber').resolves(115)
      sandbox.stub(BackfillReplayService as any, 'processBatch').resolves()

      const metrics = ResilienceMetrics.getInstance('test-service')
      sandbox.spy(metrics, 'recordGapDetected')
      sandbox.spy(metrics, 'recordBackfillProgress')

      // Detect and fill gaps
      const result = await BackfillReplayService.detectAndFillGaps({
        network,
        service,
        fromBlock: 100,
        toBlock: 115,
        batchSize: 10,
      })

      expect(result.gapsFound).to.equal(1) // One gap: 106-109
      expect(result.gapsFilled).to.equal(1)

      // Verify gap detection metric recorded
      expect((metrics.recordGapDetected as sinon.SinonSpy).calledOnce).to.be.true

      // Verify backfill was called for gap range
      const processBatchStub = BackfillReplayService['processBatch'] as sinon.SinonStub
      const gapFillCall = processBatchStub.getCalls().find(call => call.args[2] === 106)
      expect(gapFillCall).to.exist
    })
  })

  describe('End-to-End: Metrics Throughout Resilience Operations', () => {
    it('should record comprehensive metrics during full resilience flow', async () => {
      const network = NetworksEnum.harmonyMainnet
      const service = 'proposals'

      // Mock all database operations
      const mockConfigIndexer = {
        lastSync: 100,
        update: sandbox.stub().resolves(),
      }
      sandbox.stub(Models.ConfigIndexer, 'findOne').resolves(mockConfigIndexer as any)
      sandbox.stub(Models.ConfigIndexer, 'create').resolves(mockConfigIndexer as any)
      sandbox.stub(Models.Proposal, 'find').resolves([{ delete: sandbox.stub().resolves() }] as any)
      sandbox.stub(Models.Vote, 'find').resolves([])
      sandbox.stub(Models.Transaction, 'find').resolves([])
      sandbox.stub(Models.Permission, 'find').resolves([])
      sandbox.stub(Models.Setting, 'find').resolves([])

      // Simulate reorg scenario
      sandbox.stub(Web3Helper, 'getBlockHash').resolves('0xnewhash')
      sandbox.stub(Web3Helper, 'getBlock').resolves({ number: 100, hash: '0xnewhash' } as any)
      sandbox.stub(Web3Helper, 'getBlockNumber').resolves(105)
      sandbox.stub(ReorgDetector, 'detectReorg').resolves({ isReorg: true, reorgBlockNumber: 100 })
      sandbox.stub(BackfillReplayService as any, 'processBatch').resolves()

      const metrics = ResilienceMetrics.getInstance('test-service')

      // Spy on all metric recording methods
      const spies = {
        reorgDetected: sandbox.spy(metrics, 'recordReorgDetected'),
        reorgRollback: sandbox.spy(metrics, 'recordReorgRollback'),
        backfillProgress: sandbox.spy(metrics, 'recordBackfillProgress'),
        backfillBatch: sandbox.spy(metrics, 'recordBackfillBatch'),
        processingDuration: sandbox.spy(metrics, 'recordProcessingDuration'),
      }

      // Execute full flow: detect reorg → rollback → backfill
      await ReorgDetector.detectReorg(network, 100)
      await ReorgDetector.rollbackFromBlock(network, 100)
      await BackfillReplayService.backfill({
        network,
        service,
        fromBlock: 100,
        toBlock: 105,
        batchSize: 10,
      })

      // Verify all metrics were recorded
      expect(spies.reorgDetected.called).to.be.true
      expect(spies.reorgRollback.called).to.be.true
      expect(spies.backfillProgress.called).to.be.true
      expect(spies.backfillBatch.called).to.be.true

      // Verify metric values are reasonable
      const backfillProgressCall = spies.backfillProgress.lastCall
      expect(backfillProgressCall.args[2]).to.be.greaterThan(0) // Block number > 0

      const reorgRollbackCall = spies.reorgRollback.lastCall
      expect(reorgRollbackCall.args[2]).to.be.oneOf(['success', 'failure']) // Status is valid
    })

    it('should track metrics across multiple services concurrently', async () => {
      const network = NetworksEnum.harmonyMainnet
      const services = ['proposals', 'votes', 'transactions']

      // Mock database for all services
      sandbox.stub(Models.ConfigIndexer, 'findOne').callsFake(async (filter: any) => {
        return {
          service: filter.service,
          lastSync: 100,
          update: sandbox.stub().resolves(),
        } as any
      })
      sandbox.stub(Models.ConfigIndexer, 'create').resolves({} as any)
      sandbox.stub(ReorgDetector, 'detectReorg').resolves({ isReorg: false })
      sandbox.stub(Web3Helper, 'getBlockNumber').resolves(105)
      sandbox.stub(BackfillReplayService as any, 'processBatch').resolves()

      const metrics = ResilienceMetrics.getInstance('test-service')
      sandbox.spy(metrics, 'recordBackfillProgress')

      // Backfill all services concurrently
      await Promise.all(
        services.map(service =>
          BackfillReplayService.backfill({
            network,
            service,
            fromBlock: 100,
            toBlock: 105,
            batchSize: 10,
          }),
        ),
      )

      // Verify metrics recorded for all services
      const progressSpy = metrics.recordBackfillProgress as sinon.SinonSpy
      const recordedServices = progressSpy.getCalls().map(call => call.args[1])

      services.forEach(service => {
        expect(recordedServices).to.include(service)
      })
    })
  })

  describe('Error Recovery and Idempotency', () => {
    it('should safely retry backfill after partial failure', async () => {
      const network = NetworksEnum.harmonyMainnet
      const service = 'proposals'

      const mockConfigIndexer = {
        lastSync: 102, // Partially completed backfill
        update: sandbox.stub().resolves(),
      }
      sandbox.stub(Models.ConfigIndexer, 'findOne').resolves(mockConfigIndexer as any)
      sandbox.stub(ReorgDetector, 'detectReorg').resolves({ isReorg: false })
      sandbox.stub(Web3Helper, 'getBlockNumber').resolves(105)

      let processBatchCallCount = 0
      sandbox.stub(BackfillReplayService as any, 'processBatch').callsFake(async () => {
        processBatchCallCount++
        if (processBatchCallCount === 2) {
          throw new Error('TEMPORARY_ERROR') // Simulate failure mid-backfill
        }
      })

      // First attempt: fails at block 103
      try {
        await BackfillReplayService.backfill({
          network,
          service,
          fromBlock: 100,
          toBlock: 105,
          batchSize: 2,
        })
        expect.fail('Should have thrown error')
      } catch (error) {
        expect(error.message).to.equal('TEMPORARY_ERROR')
      }

      // Checkpoint should be at 102 (last successful batch)
      expect(mockConfigIndexer.lastSync).to.equal(102)

      // Second attempt: resume from checkpoint
      processBatchCallCount = 0
      ;(BackfillReplayService['processBatch'] as sinon.SinonStub).restore()
      sandbox.stub(BackfillReplayService as any, 'processBatch').resolves() // No errors this time

      const result = await BackfillReplayService.replay({
        network,
        service,
        batchSize: 2,
      })

      expect(result.success).to.be.true
      // Should process blocks 103-105 (3 blocks)
      expect(result.blocksProcessed).to.equal(3)
    })

    it('should validate data integrity after backfill', async () => {
      const network = NetworksEnum.harmonyMainnet
      const service = 'proposals'

      // Mock database with complete range
      sandbox.stub(Models.Proposal, 'aggregate').resolves(
        Array.from({ length: 6 }, (_, i) => ({ _id: 100 + i })),
      )

      const mockConfigIndexer = { lastSync: 105 }
      sandbox.stub(Models.ConfigIndexer, 'findOne').resolves(mockConfigIndexer as any)

      // Validate integrity
      const result = await BackfillReplayService.validateIntegrity({
        network,
        service,
        fromBlock: 100,
        toBlock: 105,
      })

      expect(result.isValid).to.be.true
      expect(result.missingBlocks).to.have.lengthOf(0)
    })
  })
})
