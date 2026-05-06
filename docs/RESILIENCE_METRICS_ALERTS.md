# Resilience Metrics & Alerting Guide

This document provides comprehensive guidance on monitoring blockchain indexing resilience using Prometheus metrics and alert rules.

## Table of Contents

- [Metrics Overview](#metrics-overview)
- [Alert Rules](#alert-rules)
- [Grafana Dashboards](#grafana-dashboards)
- [Troubleshooting Guide](#troubleshooting-guide)

---

## Metrics Overview

### Reorg Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `aragon_indexer_reorg_detected_total` | Counter | `network`, `service` | Total number of blockchain reorgs detected |
| `aragon_indexer_reorg_depth_blocks` | Histogram | `network`, `service` | Distribution of reorg depths in blocks |
| `aragon_indexer_reorg_rollback_total` | Counter | `network`, `service`, `status` | Total number of rollback operations |
| `aragon_indexer_reorg_rollback_events` | Gauge | `network`, `service` | Number of events rolled back in last reorg |

### RPC Failover Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `aragon_indexer_rpc_failover_total` | Counter | `network`, `from_provider`, `to_provider`, `reason` | Total RPC provider failovers |
| `aragon_indexer_rpc_health` | Gauge | `network`, `provider` | Provider health status (1=healthy, 0=unhealthy) |
| `aragon_indexer_rpc_request_duration_seconds` | Histogram | `network`, `provider`, `method`, `status` | RPC request duration |
| `aragon_indexer_rpc_error_total` | Counter | `network`, `provider`, `error_type` | Total RPC errors by type |

### Backfill/Replay Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `aragon_indexer_backfill_progress_blocks` | Gauge | `network`, `service` | Current block number being backfilled |
| `aragon_indexer_backfill_batch_duration_seconds` | Histogram | `network`, `service` | Backfill batch processing duration |
| `aragon_indexer_backfill_error_total` | Counter | `network`, `service`, `error_type` | Total backfill errors |
| `aragon_indexer_replay_progress_blocks` | Gauge | `network`, `service` | Current block number being replayed |
| `aragon_indexer_gap_detected_total` | Counter | `network`, `service` | Total gaps detected in indexed data |

### General Event Processing Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `aragon_indexer_events_processed_total` | Counter | `network`, `service`, `event_type` | Total events processed |
| `aragon_indexer_processing_duration_seconds` | Histogram | `network`, `service`, `operation` | Event processing duration |

---

## Alert Rules

### Critical Alerts (Page On-Call)

#### Frequent Deep Reorgs

```yaml
groups:
  - name: blockchain_reorgs
    rules:
      - alert: FrequentDeepReorgs
        expr: |
          sum(rate(aragon_indexer_reorg_detected_total[5m])) by (network) > 0.1
          and
          histogram_quantile(0.9, rate(aragon_indexer_reorg_depth_blocks_bucket[5m])) > 5
        for: 10m
        labels:
          severity: critical
          component: indexer
        annotations:
          summary: "Frequent deep reorgs detected on {{ $labels.network }}"
          description: "Network {{ $labels.network }} is experiencing frequent reorgs with depth > 5 blocks. This may indicate chain instability or consensus issues."
          runbook_url: "https://docs.example.com/runbooks/reorg-handling"
```

#### All RPC Providers Down

```yaml
      - alert: AllRPCProvidersDown
        expr: |
          sum(aragon_indexer_rpc_health{network="harmony"}) by (network) == 0
        for: 2m
        labels:
          severity: critical
          component: rpc
        annotations:
          summary: "All RPC providers are unhealthy for {{ $labels.network }}"
          description: "All configured RPC providers for {{ $labels.network }} are reporting unhealthy status. Indexing is likely halted."
          runbook_url: "https://docs.example.com/runbooks/rpc-outage"
```

#### Backfill Stalled

```yaml
      - alert: BackfillStalled
        expr: |
          changes(aragon_indexer_backfill_progress_blocks[10m]) == 0
          and
          aragon_indexer_backfill_progress_blocks > 0
        for: 15m
        labels:
          severity: critical
          component: backfill
        annotations:
          summary: "Backfill progress stalled for {{ $labels.service }} on {{ $labels.network }}"
          description: "Backfill for {{ $labels.service }} on {{ $labels.network }} has not progressed in 15 minutes. Check for RPC errors or application deadlock."
          runbook_url: "https://docs.example.com/runbooks/backfill-stalled"
```

### High-Priority Alerts (Investigate Soon)

#### High RPC Failover Rate

```yaml
      - alert: HighRPCFailoverRate
        expr: |
          rate(aragon_indexer_rpc_failover_total[5m]) > 0.5
        for: 10m
        labels:
          severity: warning
          component: rpc
        annotations:
          summary: "High RPC failover rate on {{ $labels.network }}"
          description: "RPC failover rate exceeds 0.5/sec on {{ $labels.network }}. Primary providers may be unstable."
          runbook_url: "https://docs.example.com/runbooks/rpc-failover"
```

#### Rollback Failures

```yaml
      - alert: ReorgRollbackFailures
        expr: |
          rate(aragon_indexer_reorg_rollback_total{status="failure"}[10m]) > 0
        for: 5m
        labels:
          severity: warning
          component: indexer
        annotations:
          summary: "Reorg rollback failures on {{ $labels.network }}"
          description: "Service {{ $labels.service }} on {{ $labels.network }} is experiencing rollback failures. Data consistency may be affected."
          runbook_url: "https://docs.example.com/runbooks/rollback-failure"
```

#### Gap Detected

```yaml
      - alert: IndexingGapDetected
        expr: |
          increase(aragon_indexer_gap_detected_total[1h]) > 0
        labels:
          severity: warning
          component: indexer
        annotations:
          summary: "Indexing gap detected for {{ $labels.service }} on {{ $labels.network }}"
          description: "Gap detected in indexed data for {{ $labels.service }} on {{ $labels.network }}. Automatic backfill should resolve this."
          runbook_url: "https://docs.example.com/runbooks/indexing-gap"
```

### Informational Alerts (Monitor)

#### Slow RPC Response

```yaml
      - alert: SlowRPCResponse
        expr: |
          histogram_quantile(0.95, rate(aragon_indexer_rpc_request_duration_seconds_bucket[5m])) > 5
        for: 15m
        labels:
          severity: info
          component: rpc
        annotations:
          summary: "Slow RPC response times on {{ $labels.network }}"
          description: "95th percentile RPC request duration exceeds 5 seconds for {{ $labels.provider }} on {{ $labels.network }}."
          runbook_url: "https://docs.example.com/runbooks/slow-rpc"
```

#### Backfill Error Rate

```yaml
      - alert: BackfillErrorRate
        expr: |
          rate(aragon_indexer_backfill_error_total[10m]) > 0.1
        for: 10m
        labels:
          severity: info
          component: backfill
        annotations:
          summary: "Elevated backfill error rate for {{ $labels.service }}"
          description: "Backfill error rate exceeds 0.1/sec for {{ $labels.service }} on {{ $labels.network }}. Check logs for details."
          runbook_url: "https://docs.example.com/runbooks/backfill-errors"
```

---

## Grafana Dashboards

### Resilience Overview Dashboard

**Panels:**

1. **Reorg Activity (Time Series)**
   - Query: `sum(rate(aragon_indexer_reorg_detected_total[5m])) by (network)`
   - Visualization: Line chart
   - Description: Reorg frequency per network

2. **Reorg Depth Distribution (Heatmap)**
   - Query: `rate(aragon_indexer_reorg_depth_blocks_bucket[5m])`
   - Visualization: Heatmap
   - Description: Distribution of reorg depths over time

3. **RPC Provider Health (Stat)**
   - Query: `sum(aragon_indexer_rpc_health) by (network, provider)`
   - Visualization: Stat (Green=1, Red=0)
   - Description: Current health status of all providers

4. **RPC Failover Events (Time Series)**
   - Query: `sum(rate(aragon_indexer_rpc_failover_total[5m])) by (network, reason)`
   - Visualization: Stacked area
   - Description: Failover events grouped by reason

5. **Backfill Progress (Gauge)**
   - Query: `aragon_indexer_backfill_progress_blocks`
   - Visualization: Gauge
   - Description: Current backfill block number per service

6. **Event Processing Throughput (Time Series)**
   - Query: `sum(rate(aragon_indexer_events_processed_total[1m])) by (service, event_type)`
   - Visualization: Line chart
   - Description: Events processed per second

### RPC Performance Dashboard

**Panels:**

1. **Request Duration (Heatmap)**
   - Query: `rate(aragon_indexer_rpc_request_duration_seconds_bucket[5m])`
   - Visualization: Heatmap
   - Description: Distribution of RPC request durations

2. **Error Rate by Provider (Time Series)**
   - Query: `sum(rate(aragon_indexer_rpc_error_total[5m])) by (provider, error_type)`
   - Visualization: Stacked bar
   - Description: RPC error rates grouped by provider

3. **Failover Reasons (Pie Chart)**
   - Query: `sum(increase(aragon_indexer_rpc_failover_total[24h])) by (reason)`
   - Visualization: Pie chart
   - Description: Distribution of failover reasons in last 24h

---

## Troubleshooting Guide

### Scenario: High Reorg Rate

**Symptoms:**
- `FrequentDeepReorgs` alert firing
- Frequent rollback operations in logs

**Investigation Steps:**

1. Check chain health:
   ```bash
   # Verify if reorgs are network-wide or isolated
   curl https://harmony-explorer.io/api/stats
   ```

2. Query reorg metrics:
   ```promql
   # Reorg frequency per service
   sum(rate(aragon_indexer_reorg_detected_total[1h])) by (service)
   
   # Reorg depth distribution
   histogram_quantile(0.95, rate(aragon_indexer_reorg_depth_blocks_bucket[1h]))
   ```

3. Check rollback success rate:
   ```promql
   # Rollback failures
   sum(rate(aragon_indexer_reorg_rollback_total{status="failure"}[1h]))
   ```

**Mitigation:**
- If network-wide: wait for chain to stabilize
- If isolated: verify block confirmations in indexer config
- If rollback failures: check database constraints and error logs

---

### Scenario: RPC Provider Outage

**Symptoms:**
- `AllRPCProvidersDown` or `HighRPCFailoverRate` alerts
- Increased RPC error metrics

**Investigation Steps:**

1. Check provider health:
   ```promql
   # Current health status
   aragon_indexer_rpc_health
   
   # Recent failovers
   increase(aragon_indexer_rpc_failover_total[10m])
   ```

2. Analyze error types:
   ```promql
   # Error distribution
   sum(rate(aragon_indexer_rpc_error_total[5m])) by (error_type)
   ```

3. Verify external provider status:
   ```bash
   # Test connectivity
   curl -X POST https://api.harmony.one \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   ```

**Mitigation:**
- Add backup providers to config
- Increase health check intervals temporarily
- Enable rate limiting if hitting API limits

---

### Scenario: Backfill Stalled

**Symptoms:**
- `BackfillStalled` alert firing
- `aragon_indexer_backfill_progress_blocks` gauge not increasing

**Investigation Steps:**

1. Check backfill progress:
   ```promql
   # Progress over time
   aragon_indexer_backfill_progress_blocks
   
   # Error rate
   rate(aragon_indexer_backfill_error_total[10m])
   ```

2. Review logs:
   ```bash
   # Search for backfill errors
   kubectl logs -l service=aragon-indexer --tail=1000 | grep "backfill.*error"
   ```

3. Check database connection:
   ```bash
   # Verify MongoDB connectivity
   mongosh --eval "db.adminCommand('ping')"
   ```

**Mitigation:**
- Restart backfill from checkpoint: `BackfillReplayService.replay({...})`
- Reduce batch size if encountering memory issues
- Increase RPC timeout settings

---

### Scenario: Indexing Gap

**Symptoms:**
- `IndexingGapDetected` alert firing
- `aragon_indexer_gap_detected_total` counter increasing

**Investigation Steps:**

1. Identify gap range:
   ```typescript
   // Use BackfillReplayService to detect gaps
   await BackfillReplayService.detectAndFillGaps({
     network: NetworksEnum.HARMONY,
     service: 'proposals',
     fromBlock: 1000000,
     toBlock: 2000000,
   })
   ```

2. Check for reorg during gap period:
   ```promql
   # Reorg activity during gap
   aragon_indexer_reorg_detected_total{network="harmony"}
   ```

3. Verify data integrity:
   ```typescript
   await BackfillReplayService.validateIntegrity({
     network: NetworksEnum.HARMONY,
     service: 'proposals',
     fromBlock: gapStart,
     toBlock: gapEnd,
   })
   ```

**Mitigation:**
- Automatic backfill will fill gaps
- Manual fill: `BackfillReplayService.backfill({...})`
- Verify checkpoint consistency after fill

---

## Prometheus Configuration

### Scrape Config Example

```yaml
scrape_configs:
  - job_name: 'aragon-indexer'
    scrape_interval: 15s
    scrape_timeout: 10s
    metrics_path: '/admin/metrics'
    static_configs:
      - targets:
          - 'indexer-01.prod:3001'
          - 'indexer-02.prod:3001'
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
```

### Recording Rules (Precomputed Queries)

```yaml
groups:
  - name: aragon_indexer_recordings
    interval: 30s
    rules:
      # Precompute 5m reorg rate per network
      - record: aragon:reorg_rate_5m:network
        expr: |
          sum(rate(aragon_indexer_reorg_detected_total[5m])) by (network)
      
      # Precompute RPC health percentage
      - record: aragon:rpc_health_pct:network
        expr: |
          100 * sum(aragon_indexer_rpc_health) by (network)
          / count(aragon_indexer_rpc_health) by (network)
      
      # Precompute event throughput
      - record: aragon:events_per_sec:service
        expr: |
          sum(rate(aragon_indexer_events_processed_total[1m])) by (service)
```

---

## Usage Examples

### Instrumenting a New Service

```typescript
import { ResilienceMetrics } from '@services/resilienceMetrics'

const metrics = ResilienceMetrics.getInstance('my-indexer-service')

// Start operation timer
const endTimer = metrics.startTimer(NetworksEnum.HARMONY, 'my-service', 'indexBlock')

try {
  // ... index block logic ...
  
  // Record successful processing
  metrics.recordEventProcessed(NetworksEnum.HARMONY, 'my-service', 'EventName', eventCount)
  
  endTimer() // Record duration
} catch (error) {
  // Record error
  metrics.recordBackfillError(NetworksEnum.HARMONY, 'my-service', error.code)
  
  endTimer() // Still record duration
  throw error
}
```

### Querying Metrics Programmatically

```typescript
// Get current metrics for testing/debugging
const metricsOutput = await metrics.getMetrics()
console.log(metricsOutput)

// Reset metrics (useful in tests)
metrics.resetMetrics()
```

---

## Best Practices

1. **Label Cardinality**: Keep label values bounded (avoid user IDs, timestamps, etc.)
2. **Metric Naming**: Follow Prometheus conventions (`namespace_subsystem_name_unit`)
3. **Alert Tuning**: Start conservative, adjust thresholds based on real traffic
4. **Recording Rules**: Precompute expensive queries for dashboard performance
5. **Retention**: Configure Prometheus retention based on storage capacity
6. **Aggregation**: Use recording rules for long-term trend analysis

---

## References

- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Grafana Dashboard Design](https://grafana.com/docs/grafana/latest/dashboards/)
- [Alert Rule Syntax](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
