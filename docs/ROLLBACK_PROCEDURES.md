# Rollback Procedures — Sprint #2 Indexing Resilience

Emergency rollback procedures for Sprint #2 backend changes. Use these if issues are detected in production after deployment.

## Table of Contents
- [Pre-Rollback Checklist](#pre-rollback-checklist)
- [Rollback Methods](#rollback-methods)
- [Post-Rollback Validation](#post-rollback-validation)
- [Known Issues & Mitigations](#known-issues--mitigations)

---

## Pre-Rollback Checklist

**Before initiating rollback, verify:**

- [ ] Identify root cause (check logs, metrics, alerts)
- [ ] Determine impact scope (which services/networks affected)
- [ ] Notify team in incident channel (#incidents or equivalent)
- [ ] Take snapshot of current metrics for post-mortem
- [ ] Verify rollback target version is stable
- [ ] Check database state (any partial migrations to revert)

**Severity Assessment:**
- **P0 (Critical)**: Complete indexing halt, data corruption → Immediate rollback
- **P1 (High)**: Elevated error rates, degraded performance → Roll back within 1 hour
- **P2 (Medium)**: Minor issues, metrics anomalies → Investigate first, roll back if unresolved

---

## Rollback Methods

### Method 1: Git Revert (Recommended)

**When to use**: Clean rollback with no database migration conflicts

```bash
# 1. Identify commit to revert (Sprint #2 merge commit)
git log --oneline --grep="Sprint #2"

# 2. Create revert commit
git revert <sprint-2-merge-commit-sha> --no-commit

# 3. Review changes
git status
git diff --cached

# 4. Commit revert
git commit -m "revert: Sprint #2 indexing resilience features

Reason: [Brief description of issue]
Incident: [Incident ticket number]
Reverts: <commit-sha>"

# 5. Push to branch
git push origin feature/sprint2/indexing-resilience-rollback

# 6. Create PR and merge (or direct push if emergency)
gh pr create --title "Rollback: Sprint #2 Indexing Resilience" \
  --body "Emergency rollback due to production issues. See incident: [link]"
```

**Duration**: ~10 minutes (code revert) + ~5 minutes (deploy pipeline)

---

### Method 2: Branch Switch (Faster, Riskier)

**When to use**: P0 incident requiring immediate rollback

```bash
# 1. Switch to pre-Sprint-2 branch
git checkout development

# 2. Force push to trigger deploy (if using CD)
git push --force-with-lease origin development

# 3. Or manually trigger deploy with previous version tag
./scripts/deploy.sh production v2.4.0  # Pre-Sprint-2 version
```

**Duration**: ~5 minutes

**⚠️ Warning**: This may cause deploy conflicts if other changes merged since Sprint #2.

---

### Method 3: Feature Flag Disable (Safest, Requires Preparation)

**When to use**: If feature flags were implemented (recommended for future sprints)

```bash
# Update environment variables to disable new features
kubectl set env deployment/aragon-indexer \
  ENABLE_RPC_POOL=false \
  ENABLE_BACKFILL_REPLAY=false \
  ENABLE_RESILIENCE_METRICS=false

# Or update .env and restart services
```

**Duration**: ~2 minutes (instant rollback without code changes)

**Note**: Sprint #2 does not include feature flags, but this method is recommended for Sprint #3+.

---

## Component-Specific Rollback Steps

### Rollback: RPC Connection Pool

**Issue**: RPC pool causing connection exhaustion or failover loops

**Steps**:
1. Verify issue is RPC-related:
   ```bash
   # Check RPC error metrics
   curl http://localhost:3001/admin/metrics | grep aragon_indexer_rpc_error_total
   
   # Check logs for RPC timeouts
   kubectl logs -l service=aragon-indexer --tail=500 | grep "RPC.*error"
   ```

2. Disable RPC pool (manual code change):
   ```typescript
   // In src/helpers/web3.ts, revert to direct provider usage
   // Comment out rpcPool.executeWithFailover() calls
   // Use ProviderModule.getProvider() directly
   ```

3. Redeploy service

**Duration**: ~15 minutes

---

### Rollback: Backfill/Replay Service

**Issue**: Backfill causing database overload or infinite loops

**Steps**:
1. Stop backfill operations:
   ```bash
   # Identify running backfill processes
   ps aux | grep backfill
   
   # Kill processes if needed
   pkill -f backfill
   ```

2. Verify database integrity:
   ```bash
   mongosh aragon-db --eval "
     db.configIndexer.find({service: 'proposals'}).pretty()
   "
   ```

3. Revert BackfillReplayService:
   ```bash
   # Remove or comment out BackfillReplayService invocations
   # Typically in indexer entrypoints or scheduled jobs
   ```

**Duration**: ~10 minutes

---

### Rollback: Resilience Metrics

**Issue**: Metrics causing memory leaks or performance degradation

**Steps**:
1. Disable metrics recording:
   ```typescript
   // In affected services, comment out ResilienceMetrics calls
   // Example:
   // metrics.recordEventProcessed(...)  → // metrics.recordEventProcessed(...)
   ```

2. Clear Prometheus scrape targets:
   ```yaml
   # In prometheus.yml, comment out aragon-indexer job
   # scrape_configs:
   #   - job_name: 'aragon-indexer'
   #     ...
   ```

3. Restart Prometheus

**Duration**: ~5 minutes

**Note**: Metrics are non-critical; can disable without affecting indexing functionality.

---

## Database Rollback (If Needed)

**Sprint #2 does not include schema-breaking changes**, but if data corruption occurred:

### Rollback MongoDB Data

```bash
# 1. Stop indexer services
kubectl scale deployment/aragon-indexer --replicas=0

# 2. Restore from backup (if available)
mongorestore --uri="mongodb://..." \
  --db=aragon-db \
  --drop \
  /backups/aragon-db-pre-sprint2-$(date +%Y%m%d).gz

# 3. Verify restoration
mongosh aragon-db --eval "
  db.configIndexer.countDocuments()
  db.proposal.countDocuments()
"

# 4. Restart indexer services
kubectl scale deployment/aragon-indexer --replicas=3
```

**Duration**: ~30 minutes (depends on database size)

---

## Post-Rollback Validation

**After rollback is deployed, verify:**

### 1. Service Health

```bash
# Check service status
kubectl get pods -l service=aragon-indexer

# Verify indexing is progressing
mongosh aragon-db --eval "
  db.configIndexer.find().sort({updatedAt: -1}).limit(5).pretty()
"

# Check for errors in logs
kubectl logs -l service=aragon-indexer --tail=100 | grep -i error
```

### 2. Metrics Recovery

```bash
# Verify metrics endpoint responds
curl http://localhost:3001/admin/metrics

# Check for absence of new metrics (should not see aragon_indexer_reorg_*)
curl http://localhost:3001/admin/metrics | grep -c aragon_indexer_reorg
# Should return 0 after rollback
```

### 3. Functional Testing

```bash
# Test proposal indexing
curl http://localhost:3000/api/proposals?network=harmony-mainnet | jq '.data | length'

# Verify recent events are indexed
mongosh aragon-db --eval "
  db.proposal.find().sort({blockNumber: -1}).limit(1).pretty()
"
```

### 4. Alert Silence

```bash
# Silence alerts related to Sprint #2 features
# In Prometheus AlertManager:
amtool silence add alertname=~".*Reorg.*|.*RPC.*|.*Backfill.*" \
  --duration=2h \
  --comment="Sprint #2 rollback - features disabled"
```

---

## Known Issues & Mitigations

### Issue 1: Partial Checkpoint State After Rollback

**Symptom**: ConfigIndexer documents reference blocks processed by new code

**Mitigation**:
```bash
# Reset checkpoints to safe state
mongosh aragon-db --eval "
  db.configIndexer.updateMany(
    { lastSync: { \$gt: <rollback-block-number> } },
    { \$set: { lastSync: <rollback-block-number> } }
  )
"
```

---

### Issue 2: Orphaned Metrics Data

**Symptom**: Old metrics accumulate in MongoDB

**Mitigation**:
```bash
# Clean up Sprint #2 metrics
mongosh aragon-db --eval "
  db.metrics.deleteMany({
    serviceName: { \$regex: /resilience|reorg|rpc/ }
  })
"
```

---

### Issue 3: RPC Provider Configuration Mismatch

**Symptom**: Indexer tries to use RPC pool endpoints that don't exist

**Mitigation**:
```bash
# Verify environment variables
kubectl exec -it <indexer-pod> -- env | grep RPC

# Reset to default provider
kubectl set env deployment/aragon-indexer \
  RPC_PROVIDERS='["https://api.harmony.one"]'
```

---

## Communication Templates

### Incident Announcement

```
🚨 **Incident: Sprint #2 Rollback Initiated**

**Severity**: [P0/P1/P2]
**Component**: Aragon Indexer (Sprint #2 features)
**Status**: Rollback in progress

**Issue Summary**:
[Brief description of the problem]

**Impact**:
- [Service/feature affected]
- [User impact, if any]

**Action Taken**:
Rolling back to pre-Sprint-2 version (v2.4.0)

**ETA**: Rollback complete in ~15 minutes

**Updates**: Will post in #incidents every 10 minutes
```

### Rollback Complete Announcement

```
✅ **Sprint #2 Rollback Complete**

**Resolution**:
Successfully rolled back to v2.4.0. All services nominal.

**Validation**:
- ✅ Indexing progressing normally
- ✅ No error spikes in logs
- ✅ Metrics stable

**Next Steps**:
- Root cause analysis scheduled for [date/time]
- Post-mortem document: [link]

**Status**: Incident resolved
```

---

## Rollback Decision Matrix

| Symptom | Severity | Recommended Action | ETA |
|---------|----------|-------------------|-----|
| Complete indexing halt | P0 | Branch switch rollback | 5 min |
| High error rate (>10% requests) | P1 | Git revert + deploy | 15 min |
| Performance degradation (<50% throughput) | P1 | Component-specific rollback | 15 min |
| Memory leak (slow growth) | P2 | Investigate first, rollback if unresolved | 1 hour |
| Metric anomalies (no functional impact) | P3 | Disable metrics only | 5 min |

---

## Post-Mortem Template

After rollback, conduct post-mortem:

**Incident Timeline**:
- [Timestamp]: Issue first detected
- [Timestamp]: Rollback decision made
- [Timestamp]: Rollback initiated
- [Timestamp]: Rollback complete
- [Timestamp]: Service validated

**Root Cause**:
[Detailed analysis of what went wrong]

**Impact Assessment**:
- Downtime: [duration]
- Affected users: [count or percentage]
- Data integrity: [OK / Issues identified]

**Prevention**:
- [ ] Add integration test for scenario
- [ ] Implement feature flag for safer rollout
- [ ] Add circuit breaker for [component]
- [ ] Improve monitoring/alerting for [metric]

**Action Items**:
- [ ] [Assignee]: [Action with deadline]

---

## References

- Sprint #2 PR: [link]
- Pre-Sprint-2 stable version: v2.4.0
- Incident runbooks: docs/runbooks/
- Monitoring dashboards: [Grafana link]

---

**Last Updated**: January 25, 2026  
**Owner**: Backend Team  
**Approved By**: [Tech Lead]
