# Sprint #2 Deployment Checklist

Comprehensive checklist for deploying indexing resilience features to staging and production.

## Pre-Deployment (1-2 Days Before)

### Code Review & Testing
- [ ] All PRs reviewed and approved by at least 2 engineers
- [ ] All unit tests passing (`yarn test:unit`)
- [ ] Integration tests passing (`yarn test test/integration/resilienceStack.spec.ts`)
- [ ] Code coverage ≥ 70% for new code
- [ ] No high-severity security vulnerabilities (`yarn audit --level=high`)
- [ ] TypeScript compilation clean (`yarn build`)
- [ ] Linting passes (`yarn lint`)
- [ ] Run pre-deployment validation script: `bash scripts/validate-sprint2.sh`

### Documentation
- [ ] README.md updated with new features
- [ ] API documentation updated (if endpoints changed)
- [ ] Runbooks created:
  - [ ] RESILIENCE_METRICS_ALERTS.md
  - [ ] RESILIENCE_METRICS_INTEGRATION.md
  - [ ] ROLLBACK_PROCEDURES.md
- [ ] Deployment checklist (this file) reviewed by team

### Infrastructure Preparation
- [ ] Staging environment ready and accessible
- [ ] Database backups verified (< 24 hours old)
- [ ] Monitoring dashboards prepared:
  - [ ] Grafana dashboard for resilience metrics
  - [ ] Alert rules configured in Prometheus
- [ ] Log aggregation working (Kibana/CloudWatch/etc.)
- [ ] On-call rotation confirmed for deployment window

### Communication
- [ ] Deployment window scheduled and communicated to team
- [ ] Stakeholders notified (product, support, management)
- [ ] Incident channel ready (#incidents or equivalent)
- [ ] Rollback plan reviewed with team lead

---

## Staging Deployment (1 Day Before Production)

### Deploy to Staging
- [ ] Merge feature branch to staging branch: `git merge feature/sprint2/indexing-resilience`
- [ ] Trigger staging deploy pipeline or run: `./scripts/app-deploy.sh staging`
- [ ] Verify deployment status: `kubectl get pods -n staging -l service=aragon-indexer`
- [ ] Check service health: `curl https://staging-api.aragon.example/health`

### Smoke Testing (Staging)
- [ ] Verify indexing is progressing:
  ```bash
  mongosh staging-db --eval "
    db.configIndexer.find().sort({updatedAt: -1}).limit(5).pretty()
  "
  ```
- [ ] Test API endpoints:
  ```bash
  curl https://staging-api.aragon.example/api/proposals?network=harmony-mainnet
  curl https://staging-api.aragon.example/admin/metrics | grep aragon_indexer
  ```
- [ ] Validate metrics are being recorded:
  ```bash
  curl https://staging-api.aragon.example/admin/metrics | grep -E "reorg|rpc|backfill"
  ```
- [ ] Check logs for errors:
  ```bash
  kubectl logs -n staging -l service=aragon-indexer --tail=500 | grep -i error
  ```

### Functional Testing (Staging)
- [ ] **Reorg Detection**: Trigger test reorg scenario (if testnet available)
- [ ] **RPC Failover**: Disable primary RPC provider, verify failover to backup
- [ ] **Backfill**: Run manual backfill for test range:
  ```bash
  # Via admin API or direct script
  curl -X POST https://staging-api.aragon.example/admin/backfill \
    -H "Content-Type: application/json" \
    -d '{"network":"harmony-testnet","service":"proposals","fromBlock":1000000,"toBlock":1000100}'
  ```
- [ ] **Metrics**: Verify metrics appear in Grafana dashboard
- [ ] **Alerts**: Test alert rules fire correctly (use test thresholds)

### Performance Testing (Staging)
- [ ] Monitor memory usage: `kubectl top pods -n staging -l service=aragon-indexer`
- [ ] Monitor CPU usage: Should not increase significantly vs. baseline
- [ ] Monitor database connections: Should remain within normal range
- [ ] Run load test (if available): `k6 run load-tests/indexer.js`

### Staging Sign-Off
- [ ] QA engineer approves staging deployment
- [ ] Backend lead approves staging deployment
- [ ] No critical issues found in staging
- [ ] Performance metrics within acceptable range

---

## Production Deployment

### Pre-Deployment Final Checks
- [ ] Staging has been stable for ≥ 24 hours
- [ ] All staging tests passed
- [ ] Database backup completed within last 4 hours
- [ ] On-call engineer is available during deployment
- [ ] Rollback procedure reviewed and understood
- [ ] Deployment window confirmed (low-traffic period recommended)

### Deploy to Production
- [ ] Announce deployment start in #incidents channel:
  ```
  🚀 **Deployment: Sprint #2 Indexing Resilience**
  Start time: [timestamp]
  Expected duration: ~15 minutes
  Deploying to: production
  Status: In progress
  ```
- [ ] Merge feature branch to main/production branch
- [ ] Tag release: `git tag v2.5.0-sprint2 && git push --tags`
- [ ] Trigger production deploy pipeline or run: `./scripts/app-deploy.sh production`
- [ ] Monitor deploy progress:
  ```bash
  kubectl rollout status deployment/aragon-indexer -n production
  ```

### Immediate Post-Deployment Validation (First 15 Minutes)
- [ ] Verify all pods are running:
  ```bash
  kubectl get pods -n production -l service=aragon-indexer
  ```
- [ ] Check service health endpoint:
  ```bash
  curl https://api.aragon.example/health
  ```
- [ ] Verify indexing is progressing:
  ```bash
  mongosh production-db --eval "
    db.configIndexer.find().sort({updatedAt: -1}).limit(5).pretty()
  "
  ```
- [ ] Check for errors in logs:
  ```bash
  kubectl logs -n production -l service=aragon-indexer --tail=200 | grep -i error
  ```
- [ ] Verify metrics endpoint responds:
  ```bash
  curl https://api.aragon.example/admin/metrics | head -50
  ```
- [ ] Check Grafana dashboards:
  - [ ] No error rate spike
  - [ ] Throughput within normal range
  - [ ] Memory/CPU usage stable

### Extended Monitoring (First 1 Hour)
- [ ] Monitor reorg detection metrics:
  ```promql
  rate(aragon_indexer_reorg_detected_total[5m])
  ```
- [ ] Monitor RPC health:
  ```promql
  aragon_indexer_rpc_health
  ```
- [ ] Monitor backfill progress (if running):
  ```promql
  aragon_indexer_backfill_progress_blocks
  ```
- [ ] Monitor event processing throughput:
  ```promql
  rate(aragon_indexer_events_processed_total[5m])
  ```
- [ ] Check for alert firing:
  ```bash
  curl http://prometheus:9090/api/v1/alerts | jq '.data.alerts[] | select(.labels.component=="indexer")'
  ```

### Functional Validation (Production)
- [ ] Test API endpoints (non-destructive):
  ```bash
  curl https://api.aragon.example/api/proposals?network=harmony-mainnet
  curl https://api.aragon.example/api/daos?network=harmony-mainnet
  ```
- [ ] Verify recent events are indexed:
  ```bash
  mongosh production-db --eval "
    db.proposal.find().sort({blockNumber: -1}).limit(3).pretty()
  "
  ```
- [ ] Check RPC provider health:
  ```bash
  curl https://api.aragon.example/admin/metrics | grep aragon_indexer_rpc_health
  ```

### Deployment Sign-Off
- [ ] No critical errors in logs (first hour)
- [ ] No alerts firing
- [ ] Indexing throughput normal
- [ ] API response times within SLA
- [ ] Backend lead approves production deployment

### Communication
- [ ] Announce deployment success in #incidents:
  ```
  ✅ **Deployment Complete: Sprint #2 Indexing Resilience**
  Completion time: [timestamp]
  Duration: [actual duration]
  Status: Successful
  
  Monitoring: [Grafana dashboard link]
  Metrics: All nominal
  
  Next: Continue monitoring for 24 hours
  ```
- [ ] Update status page (if applicable)
- [ ] Notify stakeholders of successful deployment

---

## Post-Deployment (24-48 Hours)

### Continuous Monitoring
- [ ] Check metrics daily:
  - [ ] Reorg detection rate
  - [ ] RPC failover frequency
  - [ ] Backfill progress (if running)
  - [ ] Event processing throughput
- [ ] Review logs for anomalies
- [ ] Monitor alert frequency
- [ ] Track performance metrics (memory, CPU, DB load)

### Performance Baseline
- [ ] Document baseline metrics post-deployment:
  - Average indexing throughput: _____ events/sec
  - Average memory usage: _____ MB
  - Average CPU usage: _____ %
  - RPC request duration (p95): _____ sec
  - Database query duration (p95): _____ ms

### User Feedback
- [ ] Check support channels for user-reported issues
- [ ] Monitor API error rates from client perspective
- [ ] Review frontend integration (if applicable)

### Post-Mortem (If Issues Occurred)
- [ ] Document timeline of issues
- [ ] Identify root causes
- [ ] Create action items for prevention
- [ ] Update runbooks with lessons learned

---

## Rollback Triggers

**Initiate rollback immediately if:**
- [ ] Indexing completely halted (no progress for > 10 minutes)
- [ ] Database corruption detected
- [ ] Memory leak causing OOM crashes
- [ ] Error rate > 10% of requests
- [ ] Critical alert firing continuously

**Consider rollback if:**
- [ ] Performance degradation > 50% vs. baseline
- [ ] Elevated error rates (5-10% of requests)
- [ ] RPC provider exhaustion
- [ ] Alert fatigue (multiple alerts firing)

**Rollback Procedure**: See [ROLLBACK_PROCEDURES.md](./ROLLBACK_PROCEDURES.md)

---

## Success Criteria

**Deployment is considered successful if:**
- [ ] All pods running and healthy for 24 hours
- [ ] No P0/P1 incidents related to deployment
- [ ] Indexing throughput within 10% of baseline
- [ ] Memory/CPU usage within 20% of baseline
- [ ] No data integrity issues detected
- [ ] Resilience features (reorg detection, RPC failover) functioning as expected
- [ ] Metrics being recorded and visible in Grafana
- [ ] Alert rules validated (no false positives/negatives)

---

## Post-Deployment Cleanup

### After 1 Week of Stable Operation
- [ ] Remove old backup data (if storage constrained)
- [ ] Archive staging environment logs
- [ ] Update sprint retrospective with deployment notes
- [ ] Document any issues encountered and resolutions
- [ ] Share metrics and performance improvements with team

### Feature Flag Planning (For Future Sprints)
- [ ] Consider adding feature flags for Sprint #3 features
- [ ] Document lessons learned about rollout strategy
- [ ] Propose improvements to deployment process

---

## Contacts

**Deployment Team**:
- Backend Lead: [Name] - [Contact]
- On-Call Engineer: [Name] - [Contact]
- DevOps: [Name] - [Contact]

**Escalation**:
- Engineering Manager: [Name] - [Contact]
- CTO: [Name] - [Contact]

**Incident Channel**: #incidents  
**Documentation**: docs/  
**Monitoring**: [Grafana Dashboard Link]  
**Logs**: [Kibana/CloudWatch Link]

---

**Version**: 1.0  
**Last Updated**: January 25, 2026  
**Sprint**: Sprint #2 - Indexing Resilience & Error Recovery
