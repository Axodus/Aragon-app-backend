import logger from '@logger'

const llo = logger.logMeta.bind(null, { service: 'metrics:HarmonyIndexing' })

interface IndexingMetrics {
  proposalsIndexed: number
  votesIndexed: number
  indexingErrors: number
  lastProcessedBlock: number
  indexingLag: number // blocks behind current block
  averageProcessingTime: number // milliseconds
}

/**
 * Metrics tracker for HarmonyVoting indexing
 */
export class HarmonyIndexingMetrics {
  private static readonly metrics = new Map<string, IndexingMetrics>()

  /**
   * Initialize metrics for a network
   */
  static initMetrics(network: string): void {
    if (!this.metrics.has(network)) {
      this.metrics.set(network, {
        proposalsIndexed: 0,
        votesIndexed: 0,
        indexingErrors: 0,
        lastProcessedBlock: 0,
        indexingLag: 0,
        averageProcessingTime: 0,
      })
    }
  }

  /**
   * Record a proposal indexed
   */
  static recordProposalIndexed(network: string, blockNumber: number, processingTime: number): void {
    this.initMetrics(network)
    const metrics = this.metrics.get(network)!

    metrics.proposalsIndexed += 1
    metrics.lastProcessedBlock = Math.max(metrics.lastProcessedBlock, blockNumber)
    metrics.averageProcessingTime =
      (metrics.averageProcessingTime * (metrics.proposalsIndexed - 1) + processingTime) / metrics.proposalsIndexed

    logger.verbose(
      'HarmonyIndexing - Proposal indexed',
      llo({
        network,
        blockNumber,
        processingTime,
        totalProposals: metrics.proposalsIndexed,
      }),
    )
  }

  /**
   * Record a vote indexed
   */
  static recordVoteIndexed(network: string, blockNumber: number, processingTime: number): void {
    this.initMetrics(network)
    const metrics = this.metrics.get(network)!

    metrics.votesIndexed += 1
    metrics.lastProcessedBlock = Math.max(metrics.lastProcessedBlock, blockNumber)
    metrics.averageProcessingTime =
      (metrics.averageProcessingTime * (metrics.votesIndexed - 1) + processingTime) / metrics.votesIndexed

    logger.verbose(
      'HarmonyIndexing - Vote indexed',
      llo({
        network,
        blockNumber,
        processingTime,
        totalVotes: metrics.votesIndexed,
      }),
    )
  }

  /**
   * Record an indexing error
   */
  static recordError(network: string, error: any, context?: any): void {
    this.initMetrics(network)
    const metrics = this.metrics.get(network)!

    metrics.indexingErrors += 1

    logger.error(
      'HarmonyIndexing - Indexing error',
      llo({
        network,
        error,
        context,
        totalErrors: metrics.indexingErrors,
      }),
    )
  }

  /**
   * Update indexing lag (blocks behind)
   */
  static updateIndexingLag(network: string, currentBlock: number, lastIndexedBlock: number): void {
    this.initMetrics(network)
    const metrics = this.metrics.get(network)!

    metrics.indexingLag = Math.max(0, currentBlock - lastIndexedBlock)

    // Log warning if lag is high
    if (metrics.indexingLag > 1000) {
      logger.warn(
        'HarmonyIndexing - High indexing lag detected',
        llo({
          network,
          currentBlock,
          lastIndexedBlock,
          lag: metrics.indexingLag,
        }),
      )
    }
  }

  /**
   * Get current metrics for a network
   */
  static getMetrics(network: string): IndexingMetrics | null {
    return this.metrics.get(network) || null
  }

  /**
   * Log current metrics summary
   */
  static logSummary(network: string): void {
    const metrics = this.getMetrics(network)
    if (!metrics) {
      logger.info('HarmonyIndexing - No metrics available', llo({ network }))
      return
    }

    logger.info(
      'HarmonyIndexing - Metrics Summary',
      llo({
        network,
        proposalsIndexed: metrics.proposalsIndexed,
        votesIndexed: metrics.votesIndexed,
        indexingErrors: metrics.indexingErrors,
        lastProcessedBlock: metrics.lastProcessedBlock,
        indexingLag: metrics.indexingLag,
        averageProcessingTimeMs: Math.round(metrics.averageProcessingTime * 100) / 100,
      }),
    )
  }

  /**
   * Reset metrics for a network
   */
  static resetMetrics(network: string): void {
    this.metrics.delete(network)
    logger.info('HarmonyIndexing - Metrics reset', llo({ network }))
  }

  /**
   * Get metrics for all networks
   */
  static getAllMetrics(): Record<string, IndexingMetrics> {
    const allMetrics: Record<string, IndexingMetrics> = {}
    this.metrics.forEach((metrics, network) => {
      allMetrics[network] = { ...metrics }
    })
    return allMetrics
  }
}

export default HarmonyIndexingMetrics
