# Resilience Metrics Integration Guide

Quick guide for integrating the ResilienceMetrics service into existing backend services.

## Table of Contents
- [Quick Start](#quick-start)
- [Integration Examples](#integration-examples)
- [Best Practices](#best-practices)

---

## Quick Start

### 1. Import the Service

```typescript
import { ResilienceMetrics } from '@services/resilienceMetrics'
```

### 2. Get Instance

```typescript
const metrics = ResilienceMetrics.getInstance('my-service-name')
```

### 3. Record Metrics

```typescript
// Record an event
metrics.recordEventProcessed(NetworksEnum.harmonyMainnet, 'proposals', 'ProposalCreated', 1)

// Time an operation
const endTimer = metrics.startTimer(NetworksEnum.harmonyMainnet, 'proposals', 'indexBlock')
try {
  // ... your code ...
  endTimer() // Automatically records duration
} catch (error) {
  endTimer() // Still record duration even on error
  throw error
}
```

---

## Integration Examples

### Example 1: ReorgDetector Integration

Update `src/helpers/reorgDetector.ts`:

```typescript
import { ResilienceMetrics } from '@services/resilienceMetrics'

class ReorgDetector {
  private static metrics = ResilienceMetrics.getInstance('aragon-indexer')

  static async detectReorg(network: NetworksEnum, currentBlock: number): Promise<ReorgCheckResult> {
    // ... existing detection logic ...
    
    if (isReorg) {
      const depth = currentBlock - reorgBlockNumber
      
      // Record reorg detection
      this.metrics.recordReorgDetected(network, 'reorg-detector', depth)
      
      return {
        isReorg: true,
        reorgBlockNumber,
      }
    }
    
    return { isReorg: false }
  }

  static async rollbackFromBlock(network: NetworksEnum, fromBlock: number): Promise<number> {
    const endTimer = this.metrics.startTimer(network, 'reorg-detector', 'rollback')
    
    try {
      // ... existing rollback logic ...
      const eventsRolledBack = deletedProposals + deletedVotes + deletedTxs + deletedPermissions + deletedSettings
      
      // Record successful rollback
      this.metrics.recordReorgRollback(network, 'reorg-detector', 'success', eventsRolledBack)
      
      endTimer()
      return eventsRolledBack
    } catch (error) {
      // Record failed rollback
      this.metrics.recordReorgRollback(network, 'reorg-detector', 'failure', 0)
      
      endTimer()
      throw error
    }
  }
}
```

---

### Example 2: RpcPool Integration

Update `src/modules/rpcPool.ts`:

```typescript
import { ResilienceMetrics } from '@services/resilienceMetrics'

export class RpcPool {
  private static metrics = ResilienceMetrics.getInstance('aragon-indexer')

  static async executeWithFailover<T>(
    network: NetworksEnum,
    operation: (provider: JsonRpcProvider) => Promise<T>,
    operationName: string,
  ): Promise<T> {
    const endpoints = this.getEndpoints(network)
    let lastError: Error | null = null
    let fromProvider: string = ''

    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i]
      const startTime = Date.now()
      
      try {
        const result = await operation(endpoint.provider)
        
        // Record successful request
        const duration = (Date.now() - startTime) / 1000
        this.metrics.recordRpcRequest(network, endpoint.name, operationName, duration, 'success')
        
        // Record failover if not using first provider
        if (i > 0) {
          this.metrics.recordRpcFailover(network, fromProvider, endpoint.name, 'primary_failed')
        }
        
        return result
      } catch (error) {
        const duration = (Date.now() - startTime) / 1000
        this.metrics.recordRpcRequest(network, endpoint.name, operationName, duration, 'error')
        this.metrics.recordRpcError(network, endpoint.name, error.code || 'UNKNOWN')
        
        fromProvider = endpoint.name
        lastError = error
        
        // Mark as unhealthy
        endpoint.isHealthy = false
        endpoint.consecutiveFailures++
      }
    }
    
    throw lastError
  }

  private static async checkEndpointHealth(network: NetworksEnum, endpoint: RpcEndpoint): Promise<boolean> {
    try {
      await endpoint.provider.getBlockNumber()
      
      endpoint.isHealthy = true
      endpoint.consecutiveFailures = 0
      
      // Record healthy status
      this.metrics.recordRpcHealth(network, endpoint.name, true)
      
      return true
    } catch (error) {
      endpoint.isHealthy = false
      endpoint.consecutiveFailures++
      
      // Record unhealthy status
      this.metrics.recordRpcHealth(network, endpoint.name, false)
      
      return false
    }
  }
}
```

---

### Example 3: BackfillReplayService Integration

Update `src/services/backfillReplay.ts`:

```typescript
import { ResilienceMetrics } from '@services/resilienceMetrics'

export class BackfillReplayService {
  private static metrics = ResilienceMetrics.getInstance('aragon-indexer')

  static async backfill(config: BackfillConfig): Promise<BackfillResult> {
    const endTimer = this.metrics.startTimer(config.network, config.service, 'backfill')
    
    try {
      let currentBatch = config.fromBlock
      const toBlock = config.toBlock ?? (await Web3Helper.getBlockNumber('latest', config.network))
      
      while (currentBatch <= toBlock) {
        const batchStart = Date.now()
        const batchEnd = Math.min(currentBatch + config.batchSize - 1, toBlock)
        
        // Check for reorg
        const reorgCheck = await ReorgDetector.detectReorg(config.network, currentBatch)
        if (reorgCheck.isReorg) {
          await ReorgDetector.rollbackFromBlock(config.network, reorgCheck.reorgBlockNumber!)
          currentBatch = reorgCheck.reorgBlockNumber!
          continue
        }
        
        // Process batch
        await this.processBatch(config.network, config.service, currentBatch, batchEnd)
        
        // Record batch processing time
        const batchDuration = (Date.now() - batchStart) / 1000
        this.metrics.recordBackfillBatch(config.network, config.service, batchDuration)
        
        // Update progress
        this.metrics.recordBackfillProgress(config.network, config.service, batchEnd)
        
        // Update checkpoint
        const configIndexer = await this.getOrCreateCheckpoint(config.network, config.service)
        await configIndexer.update({ lastSync: batchEnd })
        
        currentBatch = batchEnd + 1
      }
      
      endTimer()
      return { success: true, blocksProcessed: toBlock - config.fromBlock + 1 }
    } catch (error) {
      this.metrics.recordBackfillError(config.network, config.service, error.code || 'UNKNOWN')
      endTimer()
      throw error
    }
  }

  static async detectAndFillGaps(config: GapDetectionConfig): Promise<GapFillResult> {
    // ... gap detection logic ...
    
    if (gaps.length > 0) {
      gaps.forEach(() => {
        this.metrics.recordGapDetected(config.network, config.service)
      })
      
      // Fill each gap
      for (const gap of gaps) {
        await this.backfill({
          network: config.network,
          service: config.service,
          fromBlock: gap.start,
          toBlock: gap.end,
          batchSize: config.batchSize,
        })
      }
    }
    
    return { gapsFound: gaps.length, gapsFilled: gaps.length }
  }
}
```

---

### Example 4: Event Indexing Service

Generic pattern for any event indexing service:

```typescript
import { ResilienceMetrics } from '@services/resilienceMetrics'

class ProposalIndexer {
  private metrics = ResilienceMetrics.getInstance('aragon-indexer')

  async indexProposalCreatedEvent(
    network: NetworksEnum,
    event: LogDescription,
    blockNumber: number,
  ): Promise<void> {
    const endTimer = this.metrics.startTimer(network, 'proposals', 'indexEvent')
    
    try {
      // ... indexing logic ...
      
      // Save to database
      await Models.Proposal.create({...})
      
      // Record successful processing
      this.metrics.recordEventProcessed(network, 'proposals', 'ProposalCreated', 1)
      
      endTimer()
    } catch (error) {
      logger.error('Failed to index ProposalCreated event', { error, blockNumber })
      endTimer()
      throw error
    }
  }

  async indexBlockRange(network: NetworksEnum, fromBlock: number, toBlock: number): Promise<void> {
    const endTimer = this.metrics.startTimer(network, 'proposals', 'indexBlockRange')
    
    try {
      const logs = await Web3Helper.getLogs({
        network,
        fromBlock,
        toBlock,
        topics: [/* proposal topics */],
      })
      
      for (const log of logs) {
        await this.indexProposalCreatedEvent(network, log, log.blockNumber)
      }
      
      endTimer()
    } catch (error) {
      logger.error('Failed to index block range', { error, fromBlock, toBlock })
      endTimer()
      throw error
    }
  }
}
```

---

## Best Practices

### 1. Metric Recording Patterns

**Always record duration:**
```typescript
const endTimer = metrics.startTimer(network, service, operation)
try {
  // ... operation ...
  endTimer() // Success
} catch (error) {
  endTimer() // Still record on error
  throw error
}
```

**Record both success and errors:**
```typescript
try {
  const result = await operation()
  metrics.recordEventProcessed(network, service, 'EventName', 1)
} catch (error) {
  metrics.recordBackfillError(network, service, error.code)
  throw error
}
```

**Use descriptive labels:**
```typescript
// ✅ Good: Specific, actionable
metrics.recordRpcError(network, 'aragon-provider', 'TIMEOUT')

// ❌ Bad: Generic, not useful
metrics.recordRpcError(network, 'provider', 'ERROR')
```

---

### 2. Label Cardinality Management

**Keep label values bounded:**
```typescript
// ✅ Good: Bounded set of values
metrics.recordEventProcessed(network, 'proposals', 'ProposalCreated', count)

// ❌ Bad: Unbounded values (user IDs, timestamps, etc.)
metrics.recordEventProcessed(network, userId, timestamp, count) // DON'T DO THIS
```

**Use aggregation instead of high-cardinality labels:**
```typescript
// ✅ Good: Aggregate by type
metrics.recordBackfillError(network, service, 'RPC_ERROR')

// ❌ Bad: Include specific error message
metrics.recordBackfillError(network, service, error.message) // DON'T DO THIS
```

---

### 3. Performance Considerations

**Metric recording is fast, but not free:**
```typescript
// ✅ Good: Record aggregate metrics
metrics.recordEventProcessed(network, service, 'ProposalCreated', batchSize)

// ❌ Bad: Record individual metrics in tight loops
for (const event of events) {
  metrics.recordEventProcessed(network, service, 'ProposalCreated', 1) // Avoid if possible
}
```

**Use timers for operations > 10ms:**
```typescript
// ✅ Good: Meaningful duration tracking
const endTimer = metrics.startTimer(network, service, 'indexBlockRange')
await indexBlockRange(from, to)
endTimer()

// ❌ Unnecessary: Micro-operations
const endTimer = metrics.startTimer(network, service, 'parseEvent') // Too granular
const parsed = JSON.parse(data)
endTimer()
```

---

### 4. Testing with Metrics

**Stub metrics in tests:**
```typescript
import { ResilienceMetrics } from '@services/resilienceMetrics'
import sinon from 'sinon'

describe('MyService', () => {
  let metricsStub: sinon.SinonStubbedInstance<ResilienceMetrics>

  beforeEach(() => {
    metricsStub = {
      recordEventProcessed: sinon.stub(),
      recordBackfillError: sinon.stub(),
      startTimer: sinon.stub().returns(() => {}),
    } as any

    // Inject or mock getInstance
    sinon.stub(ResilienceMetrics, 'getInstance').returns(metricsStub as any)
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should record metrics on success', async () => {
    await myService.process()
    
    expect(metricsStub.recordEventProcessed.calledOnce).to.be.true
  })
})
```

---

### 5. Monitoring Integration

**Use metric output to verify integration:**
```bash
# Check metrics endpoint
curl http://localhost:3001/admin/metrics | grep aragon_indexer
```

**Expected output:**
```prometheus
# HELP aragon_indexer_reorg_detected_total Total number of blockchain reorgs detected
# TYPE aragon_indexer_reorg_detected_total counter
aragon_indexer_reorg_detected_total{network="harmony-mainnet",service="proposals"} 5

# HELP aragon_indexer_backfill_progress_blocks Current block number being backfilled
# TYPE aragon_indexer_backfill_progress_blocks gauge
aragon_indexer_backfill_progress_blocks{network="harmony-mainnet",service="proposals"} 1234567
```

---

## Migration Checklist

When integrating metrics into an existing service:

- [ ] Import `ResilienceMetrics` service
- [ ] Get singleton instance at module/class level
- [ ] Identify key operations to instrument (indexing, backfill, RPC calls)
- [ ] Add `startTimer()` calls at operation entry points
- [ ] Call `endTimer()` in both success and error paths
- [ ] Record event counts with `recordEventProcessed()`
- [ ] Record errors with appropriate error type methods
- [ ] Update tests to stub/mock metrics calls
- [ ] Verify metrics appear in `/admin/metrics` endpoint
- [ ] Create Grafana dashboard queries
- [ ] Configure alert rules in Prometheus

---

## Troubleshooting

**Metrics not appearing:**
- Verify PrometheusStore is initialized for your service
- Check that service name matches across instances
- Ensure metrics endpoint is accessible: `curl http://localhost:3001/admin/metrics`

**High memory usage:**
- Check for high-cardinality labels (user IDs, timestamps, etc.)
- Reduce label value diversity
- Use aggregation queries instead of storing individual metrics

**Missing metrics after restart:**
- Metrics are ephemeral by default (reset on restart)
- Use Prometheus server for persistence
- Configure recording rules for long-term trends

---

## Next Steps

- Review [RESILIENCE_METRICS_ALERTS.md](./RESILIENCE_METRICS_ALERTS.md) for alert rules and dashboards
- Set up Prometheus scraping of `/admin/metrics` endpoint
- Configure Grafana dashboards using provided queries
- Test alert rules in staging environment

