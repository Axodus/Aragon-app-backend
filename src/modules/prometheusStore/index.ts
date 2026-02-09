import { Registry, collectDefaultMetrics } from 'prom-client'
import { Models } from '@dbModels'
import logger from '@logger'

const llo = logger.logMeta.bind(null, { module: 'PrometheusStore' })

export class PrometheusStore {
  private static readonly instances = new Map<string, PrometheusStore>()
  private readonly registry: Registry
  private readonly serviceName: string
  private storeIntervalId?: ReturnType<typeof globalThis.setInterval>
  private cleanupIntervalId?: ReturnType<typeof globalThis.setInterval>
  private warnedMissingMetricsModel = false
  private readonly STORE_INTERVAL_MS = 30000
  private readonly CLEANUP_INTERVAL_MS = 300000

  private constructor(serviceName: string) {
    this.serviceName = serviceName
    this.registry = new Registry()

    collectDefaultMetrics({
      register: this.registry,
      labels: { service: serviceName },
    })

    logger.info('PrometheusStore initialized', llo({ serviceName }))
  }

  static getInstance(serviceName: string): PrometheusStore {
    if (!PrometheusStore.instances.has(serviceName)) {
      PrometheusStore.instances.set(serviceName, new PrometheusStore(serviceName))
    }
    return PrometheusStore.instances.get(serviceName)!
  }

  static clearInstances(): void {
    PrometheusStore.instances.clear()
  }

  async start() {
    logger.info('Starting metrics collection', llo({ serviceName: this.serviceName }))

    if (this.storeIntervalId || this.cleanupIntervalId) {
      await this.stop()
    }

    await this.collectAndStore()

    this.storeIntervalId = globalThis.setInterval(async () => {
      await this.collectAndStore()
    }, this.STORE_INTERVAL_MS)

    this.cleanupIntervalId = globalThis.setInterval(async () => {
      await this.cleanupOldMetrics()
    }, this.CLEANUP_INTERVAL_MS)
  }

  async stop() {
    if (this.storeIntervalId) {
      globalThis.clearInterval(this.storeIntervalId)
      this.storeIntervalId = undefined
    }

    if (this.cleanupIntervalId) {
      globalThis.clearInterval(this.cleanupIntervalId)
      this.cleanupIntervalId = undefined
    }

    logger.info('Stopped metrics collection', llo({ serviceName: this.serviceName }))
  }

  private async collectAndStore() {
    try {
      const metricsModel = (Models as any)?.Metrics
      const hasFindByServiceName = typeof metricsModel?.findByServiceName === 'function'
      const hasCreate = typeof metricsModel?.create === 'function'

      if (!hasFindByServiceName || !hasCreate) {
        if (!this.warnedMissingMetricsModel) {
          this.warnedMissingMetricsModel = true
          logger.warn('Metrics model is not available; skipping persistence',
            llo({ serviceName: this.serviceName, hasFindByServiceName, hasCreate }),
          )
        }
        return
      }

      const metricsData = await this.registry.metrics()

      const existingMetric = await metricsModel.findByServiceName(this.serviceName)

      if (existingMetric) {
        await existingMetric.update({ metricsData })
      } else {
        await metricsModel.create({
          serviceName: this.serviceName,
          metricsData,
        })
      }

      logger.debug('Metrics stored', llo({ serviceName: this.serviceName }))
    } catch (error) {
      logger.error('Error storing metrics', llo({ serviceName: this.serviceName, error }))
    }
  }

  private async cleanupOldMetrics() {
    try {
      const metricsModel = (Models as any)?.Metrics
      const hasDeleteMany = typeof metricsModel?.deleteMany === 'function'

      if (!hasDeleteMany) {
        return
      }

      const fiveMinutesAgo = new Date(Date.now() - this.CLEANUP_INTERVAL_MS)

      const result = await metricsModel.deleteMany({
        updatedAt: { $lt: fiveMinutesAgo },
      })

      if (result.deletedCount > 0) {
        logger.info('Cleaned up old metrics', llo({ deletedCount: result.deletedCount }))
      }
    } catch (error) {
      logger.error('Error cleaning up old metrics', llo({ error }))
    }
  }

  static async aggregateAllMetrics(): Promise<string> {
    try {
      const metricsModel = (Models as any)?.Metrics
      const hasFindAllMetrics = typeof metricsModel?.findAllMetrics === 'function'

      if (!hasFindAllMetrics) {
        return ''
      }

      const allMetrics = await metricsModel.findAllMetrics()

      const aggregatedMetrics = allMetrics.map(metric => metric.metricsData).join('\n')

      return aggregatedMetrics
    } catch (error) {
      logger.error('Error aggregating metrics', llo({ error }))
      return ''
    }
  }

  getRegistry(): Registry {
    return this.registry
  }
}
