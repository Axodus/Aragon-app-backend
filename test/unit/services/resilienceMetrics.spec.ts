import { expect } from 'chai'
import sinon from 'sinon'
import { Registry } from 'prom-client'
import { ResilienceMetrics } from '@services/resilienceMetrics'
import { PrometheusStore } from '@modules/prometheusStore'
import { NetworksEnum } from '@types'

describe('ResilienceMetrics', () => {
  let metrics: ResilienceMetrics
  let mockRegistry: Registry
  let prometheusStoreStub: sinon.SinonStubbedInstance<PrometheusStore>

  beforeEach(() => {
    // Clear singleton instance
    ResilienceMetrics.clearInstance()

    // Create mock registry
    mockRegistry = new Registry()

    // Stub PrometheusStore
    prometheusStoreStub = {
      getRegistry: sinon.stub().returns(mockRegistry),
      start: sinon.stub().resolves(),
      stop: sinon.stub().resolves(),
    } as any

    sinon.stub(PrometheusStore, 'getInstance').returns(prometheusStoreStub as any)

    // Create metrics instance
    metrics = ResilienceMetrics.getInstance('test-service')
  })

  afterEach(() => {
    sinon.restore()
    ResilienceMetrics.clearInstance()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = ResilienceMetrics.getInstance('test-service')
      const instance2 = ResilienceMetrics.getInstance('test-service')

      expect(instance1).to.equal(instance2)
    })

    it('should clear instance when requested', () => {
      const instance1 = ResilienceMetrics.getInstance('test-service')
      ResilienceMetrics.clearInstance()
      const instance2 = ResilienceMetrics.getInstance('test-service')

      expect(instance1).to.not.equal(instance2)
    })
  })

  describe('Reorg Metrics', () => {
    it('should record reorg detected with depth', async () => {
      metrics.recordReorgDetected(NetworksEnum.harmonyMainnet, 'proposals', 5)

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('aragon_indexer_reorg_detected_total')
      expect(metricsOutput).to.include('network="harmony"')
      expect(metricsOutput).to.include('service="proposals"')
    })

    it('should record reorg depth distribution', async () => {
      // Record multiple reorgs with different depths
      metrics.recordReorgDetected(NetworksEnum.harmonyMainnet, 'proposals', 1)
      metrics.recordReorgDetected(NetworksEnum.harmonyMainnet, 'proposals', 5)
      metrics.recordReorgDetected(NetworksEnum.harmonyMainnet, 'proposals', 10)

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('aragon_indexer_reorg_depth_blocks')
      expect(metricsOutput).to.include('aragon_indexer_reorg_detected_total{network="harmony",service="proposals"} 3')
    })

    it('should record successful reorg rollback', async () => {
      metrics.recordReorgRollback(NetworksEnum.harmonyMainnet, 'proposals', 'success', 42)

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('aragon_indexer_reorg_rollback_total')
      expect(metricsOutput).to.include('status="success"')
      expect(metricsOutput).to.include('aragon_indexer_reorg_rollback_events')
      expect(metricsOutput).to.include(' 42')
    })

    it('should record failed reorg rollback', async () => {
      metrics.recordReorgRollback(NetworksEnum.harmonyMainnet, 'proposals', 'failure', 0)

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('aragon_indexer_reorg_rollback_total')
      expect(metricsOutput).to.include('status="failure"')
    })

    it('should track events rolled back per service', async () => {
      metrics.recordReorgRollback(NetworksEnum.harmonyMainnet, 'proposals', 'success', 100)
      metrics.recordReorgRollback(NetworksEnum.harmonyMainnet, 'votes', 'success', 50)

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('service="proposals"')
      expect(metricsOutput).to.include('service="votes"')
    })
  })

  describe('RPC Failover Metrics', () => {
    it('should record RPC failover event', async () => {
      metrics.recordRpcFailover(
        NetworksEnum.harmonyMainnet,
        'aragon-provider',
        'drpc-provider',
        'timeout'
      )

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('aragon_indexer_rpc_failover_total')
      expect(metricsOutput).to.include('from_provider="aragon-provider"')
      expect(metricsOutput).to.include('to_provider="drpc-provider"')
      expect(metricsOutput).to.include('reason="timeout"')
    })

    it('should record RPC health status', async () => {
      metrics.recordRpcHealth(NetworksEnum.harmonyMainnet, 'aragon-provider', true)
      metrics.recordRpcHealth(NetworksEnum.harmonyMainnet, 'drpc-provider', false)

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('aragon_indexer_rpc_health')
      expect(metricsOutput).to.include('provider="aragon-provider"')
      expect(metricsOutput).to.include('provider="drpc-provider"')
    })

    it('should record RPC request duration', async () => {
      metrics.recordRpcRequest(NetworksEnum.harmonyMainnet, 'aragon-provider', 'getBlockNumber', 0.5, 'success')

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('aragon_indexer_rpc_request_duration_seconds')
      expect(metricsOutput).to.include('method="getBlockNumber"')
      expect(metricsOutput).to.include('status="success"')
    })

    it('should record RPC errors by type', async () => {
      metrics.recordRpcError(NetworksEnum.harmonyMainnet, 'aragon-provider', 'TIMEOUT')
      metrics.recordRpcError(NetworksEnum.harmonyMainnet, 'aragon-provider', 'NETWORK_ERROR')

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('aragon_indexer_rpc_error_total')
      expect(metricsOutput).to.include('error_type="TIMEOUT"')
      expect(metricsOutput).to.include('error_type="NETWORK_ERROR"')
    })

    it('should track health across multiple providers', async () => {
      metrics.recordRpcHealth(NetworksEnum.harmonyMainnet, 'aragon-provider', true)
      metrics.recordRpcHealth(NetworksEnum.harmonyMainnet, 'drpc-provider', true)
      metrics.recordRpcHealth(NetworksEnum.harmonyMainnet, 'alchemy-provider', false)

      const metricsOutput = await metrics.getMetrics()

      const healthyCount = (metricsOutput.match(/aragon_indexer_rpc_health.*} 1/g) || []).length
      const unhealthyCount = (metricsOutput.match(/aragon_indexer_rpc_health.*} 0/g) || []).length

      expect(healthyCount).to.equal(2)
      expect(unhealthyCount).to.equal(1)
    })
  })

  describe('Backfill/Replay Metrics', () => {
    it('should record backfill progress', async () => {
      metrics.recordBackfillProgress(NetworksEnum.harmonyMainnet, 'proposals', 1000)

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('aragon_indexer_backfill_progress_blocks')
      expect(metricsOutput).to.include(' 1000')
    })

    it('should record backfill batch duration', async () => {
      metrics.recordBackfillBatch(NetworksEnum.harmonyMainnet, 'proposals', 5.2)

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('aragon_indexer_backfill_batch_duration_seconds')
    })

    it('should record backfill errors by type', async () => {
      metrics.recordBackfillError(NetworksEnum.harmonyMainnet, 'proposals', 'RPC_ERROR')
      metrics.recordBackfillError(NetworksEnum.harmonyMainnet, 'proposals', 'DB_ERROR')

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('aragon_indexer_backfill_error_total')
      expect(metricsOutput).to.include('error_type="RPC_ERROR"')
      expect(metricsOutput).to.include('error_type="DB_ERROR"')
    })

    it('should record replay progress', async () => {
      metrics.recordReplayProgress(NetworksEnum.harmonyMainnet, 'proposals', 2000)

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('aragon_indexer_replay_progress_blocks')
      expect(metricsOutput).to.include(' 2000')
    })

    it('should record gap detection', async () => {
      metrics.recordGapDetected(NetworksEnum.harmonyMainnet, 'proposals')
      metrics.recordGapDetected(NetworksEnum.harmonyMainnet, 'proposals')

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('aragon_indexer_gap_detected_total')
      expect(metricsOutput).to.include(' 2')
    })

    it('should track backfill progress across services', async () => {
      metrics.recordBackfillProgress(NetworksEnum.harmonyMainnet, 'proposals', 1000)
      metrics.recordBackfillProgress(NetworksEnum.harmonyMainnet, 'votes', 800)

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('service="proposals"')
      expect(metricsOutput).to.include('service="votes"')
    })
  })

  describe('General Event Processing Metrics', () => {
    it('should record events processed', async () => {
      metrics.recordEventProcessed(NetworksEnum.harmonyMainnet, 'proposals', 'ProposalCreated', 5)

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('aragon_indexer_events_processed_total')
      expect(metricsOutput).to.include('event_type="ProposalCreated"')
      expect(metricsOutput).to.include(' 5')
    })

    it('should record processing duration', async () => {
      metrics.recordProcessingDuration(NetworksEnum.harmonyMainnet, 'proposals', 'indexBlock', 1.5)

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('aragon_indexer_processing_duration_seconds')
      expect(metricsOutput).to.include('operation="indexBlock"')
    })

    it('should support timer utility', async () => {
      const endTimer = metrics.startTimer(NetworksEnum.harmonyMainnet, 'proposals', 'testOperation')

      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100))

      endTimer()

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('aragon_indexer_processing_duration_seconds')
      expect(metricsOutput).to.include('operation="testOperation"')
    })

    it('should accumulate event counts', async () => {
      metrics.recordEventProcessed(NetworksEnum.harmonyMainnet, 'proposals', 'ProposalCreated', 5)
      metrics.recordEventProcessed(NetworksEnum.harmonyMainnet, 'proposals', 'ProposalCreated', 3)
      metrics.recordEventProcessed(NetworksEnum.harmonyMainnet, 'proposals', 'ProposalCreated', 2)

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('aragon_indexer_events_processed_total')
      expect(metricsOutput).to.include(' 10')
    })
  })

  describe('Multi-Network Support', () => {
    it('should track metrics across different networks', async () => {
      metrics.recordReorgDetected(NetworksEnum.harmonyMainnet, 'proposals', 3)
      metrics.recordReorgDetected(NetworksEnum.ethereumMainnet, 'proposals', 5)
      metrics.recordReorgDetected(NetworksEnum.polygonMainnet, 'proposals', 2)

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('network="harmony"')
      expect(metricsOutput).to.include('network="ethereum"')
      expect(metricsOutput).to.include('network="polygon"')
    })

    it('should isolate RPC health per network', async () => {
      metrics.recordRpcHealth(NetworksEnum.harmonyMainnet, 'provider-1', true)
      metrics.recordRpcHealth(NetworksEnum.ethereumMainnet, 'provider-1', false)

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('network="harmony",provider="provider-1"} 1')
      expect(metricsOutput).to.include('network="ethereum",provider="provider-1"} 0')
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero-depth reorgs', async () => {
      metrics.recordReorgDetected(NetworksEnum.harmonyMainnet, 'proposals', 0)

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('aragon_indexer_reorg_detected_total')
    })

    it('should handle very large block numbers', async () => {
      const largeBlockNumber = 99999999
      metrics.recordBackfillProgress(NetworksEnum.harmonyMainnet, 'proposals', largeBlockNumber)

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include(` ${largeBlockNumber}`)
    })

    it('should handle special characters in labels', async () => {
      metrics.recordRpcError(NetworksEnum.harmonyMainnet, 'provider-with-dashes', 'ERROR_WITH_UNDERSCORES')

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('provider="provider-with-dashes"')
      expect(metricsOutput).to.include('error_type="ERROR_WITH_UNDERSCORES"')
    })

    it('should reset all metrics when requested', async () => {
      metrics.recordReorgDetected(NetworksEnum.harmonyMainnet, 'proposals', 5)
      metrics.recordBackfillProgress(NetworksEnum.harmonyMainnet, 'proposals', 1000)

      metrics.resetMetrics()

      const metricsOutput = await metrics.getMetrics()

      // After reset, counters/gauges should be absent or zero
      expect(metricsOutput).to.not.include('aragon_indexer_reorg_detected_total{network="harmony",service="proposals"} 1')
      expect(metricsOutput).to.not.include('aragon_indexer_backfill_progress_blocks{network="harmony",service="proposals"} 1000')
    })
  })

  describe('High-Volume Scenarios', () => {
    it('should handle rapid metric updates', async () => {
      // Simulate high-frequency event processing
      for (let i = 0; i < 1000; i++) {
        metrics.recordEventProcessed(NetworksEnum.harmonyMainnet, 'proposals', 'ProposalCreated', 1)
      }

      const metricsOutput = await metrics.getMetrics()

      expect(metricsOutput).to.include('aragon_indexer_events_processed_total')
      expect(metricsOutput).to.include(' 1000')
    })

    it('should handle multiple services updating concurrently', async () => {
      const services = ['proposals', 'votes', 'transactions', 'permissions', 'settings']

      services.forEach(service => {
        metrics.recordBackfillProgress(NetworksEnum.harmonyMainnet, service, 1000)
      })

      const metricsOutput = await metrics.getMetrics()

      services.forEach(service => {
        expect(metricsOutput).to.include(`service="${service}"`)
      })
    })
  })

  describe('Integration with PrometheusStore', () => {
    it('should use PrometheusStore registry', () => {
      expect(prometheusStoreStub.getRegistry.calledOnce).to.be.true
    })

    it('should register metrics with correct service name', () => {
      const serviceCall = PrometheusStore.getInstance as sinon.SinonStub
      expect(serviceCall.calledWith('test-service')).to.be.true
    })
  })
})
