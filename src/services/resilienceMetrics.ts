import { Counter, Gauge, Histogram } from 'prom-client'
import type { Registry } from 'prom-client'
import { PrometheusStore } from '@modules/prometheusStore'
import logger from '@logger'
import type { NetworksEnum } from '@types'

const llo = logger.logMeta.bind(null, { module: 'ResilienceMetrics' })

/**
 * Centralized metrics service for blockchain indexing resilience features.
 *
 * Tracks:
 * - Reorg detection and rollback operations
 * - RPC failover events and provider health
 * - Backfill/replay progress and errors
 * - Event processing throughput
 */
export class ResilienceMetrics {
  private static instance: ResilienceMetrics | null = null
  private readonly registry: Registry

  // Reorg Metrics
  private readonly reorgDetectedCounter: Counter
  private readonly reorgBlockDepthHistogram: Histogram
  private readonly reorgRollbackCounter: Counter
  private readonly reorgRollbackEventsGauge: Gauge

  // RPC Failover Metrics
  private readonly rpcFailoverCounter: Counter
  private readonly rpcHealthGauge: Gauge
  private readonly rpcRequestDurationHistogram: Histogram
  private readonly rpcErrorCounter: Counter

  // Backfill/Replay Metrics
  private readonly backfillProgressGauge: Gauge
  private readonly backfillBatchDurationHistogram: Histogram
  private readonly backfillErrorCounter: Counter
  private readonly replayProgressGauge: Gauge
  private readonly gapDetectedCounter: Counter

  // General Event Processing Metrics
  private readonly eventsProcessedCounter: Counter
  private readonly processingDurationHistogram: Histogram

  private constructor(serviceName: string) {
    const prometheusStore = PrometheusStore.getInstance(serviceName)
    this.registry = prometheusStore.getRegistry()

    // ========== Reorg Metrics ==========
    this.reorgDetectedCounter = new Counter({
      name: 'aragon_indexer_reorg_detected_total',
      help: 'Total number of blockchain reorgs detected',
      labelNames: ['network', 'service'],
      registers: [this.registry],
    })

    this.reorgBlockDepthHistogram = new Histogram({
      name: 'aragon_indexer_reorg_depth_blocks',
      help: 'Distribution of reorg depths in blocks',
      labelNames: ['network', 'service'],
      buckets: [1, 2, 3, 5, 10, 20, 50, 100],
      registers: [this.registry],
    })

    this.reorgRollbackCounter = new Counter({
      name: 'aragon_indexer_reorg_rollback_total',
      help: 'Total number of reorg rollback operations executed',
      labelNames: ['network', 'service', 'status'],
      registers: [this.registry],
    })

    this.reorgRollbackEventsGauge = new Gauge({
      name: 'aragon_indexer_reorg_rollback_events',
      help: 'Number of events rolled back in last reorg',
      labelNames: ['network', 'service'],
      registers: [this.registry],
    })

    // ========== RPC Failover Metrics ==========
    this.rpcFailoverCounter = new Counter({
      name: 'aragon_indexer_rpc_failover_total',
      help: 'Total number of RPC provider failovers',
      labelNames: ['network', 'from_provider', 'to_provider', 'reason'],
      registers: [this.registry],
    })

    this.rpcHealthGauge = new Gauge({
      name: 'aragon_indexer_rpc_health',
      help: 'RPC provider health status (1=healthy, 0=unhealthy)',
      labelNames: ['network', 'provider'],
      registers: [this.registry],
    })

    this.rpcRequestDurationHistogram = new Histogram({
      name: 'aragon_indexer_rpc_request_duration_seconds',
      help: 'Duration of RPC requests in seconds',
      labelNames: ['network', 'provider', 'method', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry],
    })

    this.rpcErrorCounter = new Counter({
      name: 'aragon_indexer_rpc_error_total',
      help: 'Total number of RPC errors by type',
      labelNames: ['network', 'provider', 'error_type'],
      registers: [this.registry],
    })

    // ========== Backfill/Replay Metrics ==========
    this.backfillProgressGauge = new Gauge({
      name: 'aragon_indexer_backfill_progress_blocks',
      help: 'Current block number being backfilled',
      labelNames: ['network', 'service'],
      registers: [this.registry],
    })

    this.backfillBatchDurationHistogram = new Histogram({
      name: 'aragon_indexer_backfill_batch_duration_seconds',
      help: 'Duration of backfill batch processing in seconds',
      labelNames: ['network', 'service'],
      buckets: [1, 5, 10, 30, 60, 120, 300],
      registers: [this.registry],
    })

    this.backfillErrorCounter = new Counter({
      name: 'aragon_indexer_backfill_error_total',
      help: 'Total number of backfill errors',
      labelNames: ['network', 'service', 'error_type'],
      registers: [this.registry],
    })

    this.replayProgressGauge = new Gauge({
      name: 'aragon_indexer_replay_progress_blocks',
      help: 'Current block number being replayed',
      labelNames: ['network', 'service'],
      registers: [this.registry],
    })

    this.gapDetectedCounter = new Counter({
      name: 'aragon_indexer_gap_detected_total',
      help: 'Total number of gaps detected in indexed data',
      labelNames: ['network', 'service'],
      registers: [this.registry],
    })

    // ========== General Event Processing Metrics ==========
    this.eventsProcessedCounter = new Counter({
      name: 'aragon_indexer_events_processed_total',
      help: 'Total number of events processed by service',
      labelNames: ['network', 'service', 'event_type'],
      registers: [this.registry],
    })

    this.processingDurationHistogram = new Histogram({
      name: 'aragon_indexer_processing_duration_seconds',
      help: 'Duration of event processing operations',
      labelNames: ['network', 'service', 'operation'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    })

    logger.info('ResilienceMetrics initialized', llo({ serviceName }))
  }

  static getInstance(serviceName: string = 'aragon-indexer'): ResilienceMetrics {
    if (!ResilienceMetrics.instance) {
      ResilienceMetrics.instance = new ResilienceMetrics(serviceName)
    }
    return ResilienceMetrics.instance
  }

  private static normalizeNetworkLabel(network: NetworksEnum): string {
    return String(network).split('-')[0]
  }

  static clearInstance(): void {
    const instance = ResilienceMetrics.instance
    ResilienceMetrics.instance = null

    try {
      instance?.registry.clear()
    } catch (error) {
      logger.debug('Failed to clear ResilienceMetrics registry', llo({ error }))
    }
  }

  // ========== Reorg Metric Recorders ==========

  recordReorgDetected(network: NetworksEnum, service: string, depth: number): void {
    const networkLabel = ResilienceMetrics.normalizeNetworkLabel(network)
    this.reorgDetectedCounter.inc({ network: networkLabel, service })
    this.reorgBlockDepthHistogram.observe({ network: networkLabel, service }, depth)
    logger.info('Reorg detected metric recorded', llo({ network: networkLabel, service, depth }))
  }

  recordReorgRollback(
    network: NetworksEnum,
    service: string,
    status: 'success' | 'failure',
    eventsRolledBack: number,
  ): void {
    const networkLabel = ResilienceMetrics.normalizeNetworkLabel(network)
    this.reorgRollbackCounter.inc({ network: networkLabel, service, status })
    if (status === 'success') {
      this.reorgRollbackEventsGauge.set({ network: networkLabel, service }, eventsRolledBack)
    }
    logger.info('Reorg rollback metric recorded', llo({ network: networkLabel, service, status, eventsRolledBack }))
  }

  // ========== RPC Failover Metric Recorders ==========

  recordRpcFailover(network: NetworksEnum, fromProvider: string, toProvider: string, reason: string): void {
    const networkLabel = ResilienceMetrics.normalizeNetworkLabel(network)
    this.rpcFailoverCounter.inc({ network: networkLabel, from_provider: fromProvider, to_provider: toProvider, reason })
    logger.info('RPC failover metric recorded', llo({ network: networkLabel, fromProvider, toProvider, reason }))
  }

  recordRpcHealth(network: NetworksEnum, provider: string, isHealthy: boolean): void {
    const networkLabel = ResilienceMetrics.normalizeNetworkLabel(network)
    this.rpcHealthGauge.set({ network: networkLabel, provider }, isHealthy ? 1 : 0)
    logger.debug('RPC health metric recorded', llo({ network: networkLabel, provider, isHealthy }))
  }

  recordRpcRequest(
    network: NetworksEnum,
    provider: string,
    method: string,
    durationSeconds: number,
    status: 'success' | 'error',
  ): void {
    const networkLabel = ResilienceMetrics.normalizeNetworkLabel(network)
    this.rpcRequestDurationHistogram.observe({ network: networkLabel, provider, method, status }, durationSeconds)
  }

  recordRpcError(network: NetworksEnum, provider: string, errorType: string): void {
    const networkLabel = ResilienceMetrics.normalizeNetworkLabel(network)
    this.rpcErrorCounter.inc({ network: networkLabel, provider, error_type: errorType })
    logger.warn('RPC error metric recorded', llo({ network: networkLabel, provider, errorType }))
  }

  // ========== Backfill/Replay Metric Recorders ==========

  recordBackfillProgress(network: NetworksEnum, service: string, blockNumber: number): void {
    const networkLabel = ResilienceMetrics.normalizeNetworkLabel(network)
    this.backfillProgressGauge.set({ network: networkLabel, service }, blockNumber)
  }

  recordBackfillBatch(network: NetworksEnum, service: string, durationSeconds: number): void {
    const networkLabel = ResilienceMetrics.normalizeNetworkLabel(network)
    this.backfillBatchDurationHistogram.observe({ network: networkLabel, service }, durationSeconds)
  }

  recordBackfillError(network: NetworksEnum, service: string, errorType: string): void {
    const networkLabel = ResilienceMetrics.normalizeNetworkLabel(network)
    this.backfillErrorCounter.inc({ network: networkLabel, service, error_type: errorType })
    logger.error('Backfill error metric recorded', llo({ network: networkLabel, service, errorType }))
  }

  recordReplayProgress(network: NetworksEnum, service: string, blockNumber: number): void {
    const networkLabel = ResilienceMetrics.normalizeNetworkLabel(network)
    this.replayProgressGauge.set({ network: networkLabel, service }, blockNumber)
  }

  recordGapDetected(network: NetworksEnum, service: string): void {
    const networkLabel = ResilienceMetrics.normalizeNetworkLabel(network)
    this.gapDetectedCounter.inc({ network: networkLabel, service })
    logger.warn('Gap detected metric recorded', llo({ network: networkLabel, service }))
  }

  // ========== General Event Processing Metric Recorders ==========

  recordEventProcessed(network: NetworksEnum, service: string, eventType: string, count: number = 1): void {
    const networkLabel = ResilienceMetrics.normalizeNetworkLabel(network)
    this.eventsProcessedCounter.inc({ network: networkLabel, service, event_type: eventType }, count)
  }

  recordProcessingDuration(network: NetworksEnum, service: string, operation: string, durationSeconds: number): void {
    const networkLabel = ResilienceMetrics.normalizeNetworkLabel(network)
    this.processingDurationHistogram.observe({ network: networkLabel, service, operation }, durationSeconds)
  }

  // ========== Utility Methods ==========

  /**
   * Start a timer for measuring operation duration.
   * Returns a function to call when the operation completes.
   */
  startTimer(network: NetworksEnum, service: string, operation: string): () => void {
    const startTime = Date.now()
    return () => {
      const durationSeconds = (Date.now() - startTime) / 1000
      this.recordProcessingDuration(network, service, operation, durationSeconds)
    }
  }

  /**
   * Get current metric values for a specific network/service (useful for testing).
   */
  async getMetrics(): Promise<string> {
    return await this.registry.metrics()
  }

  /**
   * Reset all metrics (useful for testing).
   */
  resetMetrics(): void {
    this.registry.resetMetrics()
    logger.debug('All resilience metrics reset')
  }
}
