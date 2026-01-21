# HOTFIX: Emergency Response & Escalation — Aragon-app-backend

**Repository:** Aragon-app-backend  
**Last Updated:** 2026-01-21  
**Status:** Procedures documented, team trained  

---

## Emergency Response Framework

### 5-Step Response Protocol

When a critical issue is identified in production:

#### **STEP 1: Alert & Triage** (0-5 minutes)
- Alert fires → on-call engineer notified (Slack, PagerDuty)
- Triage severity (CRITICAL, HIGH, MEDIUM, LOW)
- Open incident Slack channel (#incident-backend-XXX)
- Assign incident commander

#### **STEP 2: Investigation** (5-30 minutes)
- Incident commander gathers information:
  - Error logs and metrics from Grafana
  - Affected DAOs and user impact
  - RPC/database health check
  - IPFS gateway status
- Update incident status in Slack every 10 minutes

#### **STEP 3: Mitigation** (5-60 minutes)
- If reorg lag issue: increase confirmation count temporarily
- If RPC failure: activate fallback RPC endpoint
- If metadata timeout: disable metadata fetch, serve stale cache
- If database connection issue: restart connection pool, failover to replica
- Document mitigation steps taken

#### **STEP 4: Fix & Deploy** (30-120 minutes)
- Fix prepared and tested in staging (if applicable)
- Deploy to production with monitoring enabled
- Verify fix resolves issue with metrics/logs
- Post-deployment validation (5-10 minutes)

#### **STEP 5: Communication & Post-Mortem** (60+ minutes)
- Notify stakeholders (Frontend lead, DevOps, CTO) of resolution
- Post incident report in #incident-postmortem Slack channel
- Schedule post-mortem meeting (within 24 hours)
- Update runbook with lessons learned

---

## SLA by Severity

| Severity | Definition | Ack Time | Resolution Time | Examples |
|----------|-----------|----------|-----------------|----------|
| **CRITICAL** | Total service outage; all APIs down; data loss risk | **5 min** | **4 hours** | Backend crashed, database corruption, RPC totally unavailable |
| **HIGH** | Service degraded; 50%+ requests failing; users blocked | **10 min** | **6 hours** | Indexing lag >5 minutes, metadata fetches timing out |
| **MEDIUM** | Partial functionality broken; workaround exists | **30 min** | **12 hours** | Specific DAO affected, edge case bug, minor performance degradation |
| **LOW** | Cosmetic issue, no user impact, can wait for next release | **1 hour** | **No SLA** | Debug log spam, unused endpoint timing out |

---

## Escalation Contacts

| Role | Name | On-Call | Slack | Phone | Email |
|------|------|---------|-------|-------|-------|
| **Incident Commander** | Backend Lead | Yes | @backend-lead | +1-XXX-XXX-XXXX | backend-lead@aragon.org |
| **Backend Engineer** | Backend Eng #1 | Rotating weekly | @backend-eng-1 | — | backend-eng-1@aragon.org |
| **DevOps Lead** | DevOps Lead | Yes | @devops-lead | +1-XXX-XXX-XXXX | devops-lead@aragon.org |
| **Frontend Lead** (for API issues) | Frontend Lead | No | @frontend-lead | — | frontend-lead@aragon.org |
| **CTO** (for critical escalation) | CTO | On-call 24/7 | @cto | +1-XXX-XXX-XXXX | cto@aragon.org |

**On-Call Rotation:** Weekly, Sunday 6 PM → Sunday 6 PM (UTC)

---

## Common Hotfix Scenarios

### Scenario 1: Backend API Crashes (CRITICAL)

**Indicators:**
- 502/503 errors on all /api/status, /api/proposals endpoints
- No events indexed for >5 minutes
- Grafana shows 0 requests

**Response:**
1. Check container logs: `kubectl logs -f deployment/aragon-backend-api -n production`
2. Check system resources (CPU, memory, disk) on Grafana
3. **If it's memory leak:** Restart container: `kubectl rollout restart deployment/aragon-backend-api -n production`
4. **If it's database connection:** Check MongoDB replica set health; fail over if needed
5. Monitor recovery (should be online in <2 minutes)

**Mitigation:**
- Memory limit alerts trigger at 80% usage
- Database connection pool health monitored continuously

**Post-Fix:**
- Identify root cause in logs (OOM killer, exception, etc.)
- Add targeted fix or increase container memory
- Update runbook with this scenario

---

### Scenario 2: Indexing Lag Spike (HIGH)

**Indicators:**
- `indexing_lag_seconds` metric jumps from 20s to >120s
- Event handler processing queue grows unbounded
- Database CPU spikes to 80%+

**Response:**
1. Check RPC node health: run `curl https://api.harmony.one/health`
2. Check database query performance: slow query logs
3. **If RPC is slow:** Switch to fallback RPC endpoint (update config, restart indexer)
4. **If database is slow:** Increase query timeout, check for locking
5. Monitor lag recovery (should normalize in <5 minutes)

**Mitigation:**
- RPC health checks every 30s
- Database query timeout monitoring

**Post-Fix:**
- Profile database queries causing slowdown
- Add additional database indices or sharding
- Consider RPC provider upgrade

---

### Scenario 3: Metadata Fetch Timeout (HIGH)

**Indicators:**
- `metadata_fetch_timeout_total` metric spikes
- Frontend shows missing proposal metadata
- Error logs show "IPFS gateway timeout after 5s"

**Response:**
1. Check IPFS gateway health: `curl https://gateway.pinata.cloud/api/v0/version`
2. Check gateway rotation status (how many gateways are active)
3. **If primary gateway is down:** It should auto-failover to secondary
4. **If all gateways down:** Enable fallback to on-chain metadata or cached data
5. Monitor timeout rate recovery

**Mitigation:**
- Gateway health checks every 5 minutes
- Automatic gateway removal when 3+ consecutive failures
- Local caching (24h TTL) reduces gateway dependency

**Post-Fix:**
- Add additional gateway providers
- Increase timeout threshold if needed
- Document gateway SLA expectations

---

### Scenario 4: Reorg Causes Data Duplication (CRITICAL)

**Indicators:**
- `votes_total` metric shows sudden jump (e.g., 1000 → 2000)
- Duplicate database entries detected: `SELECT logIndex, COUNT(*) FROM events GROUP BY logIndex HAVING COUNT(*) > 1`
- Frontend vote counts don't match backend

**Response:**
1. Check reorg detection logs: `grep "REORG" /var/log/backend/indexing.log`
2. Verify reorg recovery completed: check if block height is canonical
3. **If duplicates found:** Run cleanup script: `node scripts/cleanup-duplicates.js`
4. Validate vote counts match after cleanup
5. Monitor for future duplicates

**Prevention:**
- Idempotency constraints on event table
- Reorg test suite validates no duplicates post-reorg

**Post-Fix:**
- Investigate why duplicates occurred (should be impossible with constraints)
- Verify idempotency logic in event handler
- Add monitoring for duplicate detection

---

### Scenario 5: Database Connection Pool Exhaustion (HIGH)

**Indicators:**
- "ENOMEM: out of memory" or connection timeout errors
- `db_connection_pool_exhausted_total` metric spikes
- API requests queue up waiting for connection

**Response:**
1. Check connection pool status: `db.serverStatus().connections`
2. List active queries: `db.currentOp({"secs_running": {$gt: 30}})`
3. **Kill hanging queries:** `db.killOp(opid)`
4. **Restart connection pool:** depends on framework (Mongoose, etc.)
5. Monitor pool utilization recovery

**Prevention:**
- Connection pool size configured for peak load
- Query timeout set to 30s max

**Post-Fix:**
- Identify queries causing connection exhaustion
- Optimize slow queries or add indices
- Consider increasing pool size

---

### Scenario 6: Rate Limit / DDoS (MEDIUM)

**Indicators:**
- Spike in 429 (Too Many Requests) responses
- Request rate exceeds expected by >5x
- Specific IP or API endpoint targeted

**Response:**
1. Check request logs for source IP: `tail -f /var/log/nginx/access.log | grep "429"`
2. Block IP at CDN/WAF level if legitimate attack
3. **If backend rate limit too strict:** Adjust rate limit thresholds
4. Monitor request rate recovery

**Prevention:**
- Per-IP rate limits (e.g., 100 req/min)
- Per-endpoint rate limits (e.g., 1000 req/min for /api/proposals)

**Post-Fix:**
- Analyze traffic pattern (bot vs legitimate user)
- Update rate limiting rules if needed
- Consider CAPTCHA for high-volume endpoints

---

## Rollback Procedures

### Database Rollback

**Scenario:** Data corruption from buggy event handler

```bash
# 1. Stop indexer
kubectl set env deployment/aragon-backend-indexer INDEXING_ENABLED=false

# 2. Restore from backup (point-in-time recovery)
mongorestore --host prod-mongo-replica:27017 \
  --archive=/backups/mongodb-2026-01-20T10:30:00Z.bak \
  --oplogReplay

# 3. Verify data integrity
mongo prod-mongo:27017/admin
> db.events.countDocuments()  # Should match pre-incident count

# 4. Restart indexer (will resume from checkpoint)
kubectl set env deployment/aragon-backend-indexer INDEXING_ENABLED=true
```

### Code Rollback

**Scenario:** Buggy code deployed causes regression

```bash
# 1. Identify bad release
git log --oneline | head -5

# 2. Revert to previous stable release
git revert <commit-hash>
git push origin main

# 3. Trigger deployment
kubectl rollout restart deployment/aragon-backend-api

# 4. Verify rollback successful
curl https://api.harmony.aragon.org/api/status
```

### RPC Endpoint Failover

**Scenario:** Primary RPC endpoint unresponsive

```bash
# 1. Update environment variable
kubectl set env deployment/aragon-backend-indexer \
  RPC_URL=https://api-backup.harmony.one

# 2. Restart indexer with new RPC
kubectl rollout restart deployment/aragon-backend-indexer

# 3. Monitor RPC health
watch -n 2 'curl -s https://api-backup.harmony.one/health | jq'
```

---

## Post-Mortem Template

**Incident:** [HOTFIX-YYYY-MM-DD-XXX]  
**Date:** [Date of incident]  
**Duration:** [Start time] to [End time] (X hours X minutes)  
**Severity:** [CRITICAL/HIGH/MEDIUM/LOW]

### Timeline

| Time | Event |
|------|-------|
| 14:23 | Alert fired: indexing lag >60s |
| 14:28 | Incident commander identified RPC timeout |
| 14:35 | Switched to fallback RPC endpoint |
| 14:40 | Indexing lag recovered to <30s |
| 15:00 | Investigation complete, root cause documented |

### Root Cause

[Description of what went wrong and why]

### Impact

- Users affected: [number of DAOs/users]
- Data loss: [yes/no, if any then describe]
- SLA violation: [yes/no]

### Actions Taken

1. [Immediate action to stop issue]
2. [Verification action]
3. [Communication action]

### Follow-Up Items (To Prevent Recurrence)

- [ ] [Action item 1] — Owner: [name], Due: [date]
- [ ] [Action item 2] — Owner: [name], Due: [date]

### Lessons Learned

1. [What we learned]
2. [What we'll do differently next time]

---

## Emergency Contacts Card (Print & Post)

```
🚨 BACKEND EMERGENCY CONTACTS 🚨

INCIDENT COMMANDER (On-Call)
Backend Lead | Slack: @backend-lead | Phone: +1-XXX-XXX-XXXX

BACKUP ENGINEERS
Backend Eng #1 | Slack: @backend-eng-1
DevOps Lead | Slack: @devops-lead | Phone: +1-XXX-XXX-XXXX

ESCALATION
CTO (24/7) | Slack: @cto | Phone: +1-XXX-XXX-XXXX

INCIDENT CHANNELS
Slack: #incident-backend-active (create during incident)
Slack: #incident-postmortem (post-mortem discussion)

RESPONSE TIMES (SLA)
CRITICAL: Ack 5min → Resolve 4h
HIGH: Ack 10min → Resolve 6h
MEDIUM: Ack 30min → Resolve 12h

RUNBOOKS
https://internal.aragon.org/docs/runbooks/backend-hotfixes
```

---

## Hotfix Status Definitions

- **Active (🔴)** — Incident in progress, team responding
- **Monitoring (🟡)** — Fix deployed, monitoring for stability
- **Resolved (🟢)** — Issue resolved, SLA met, post-mortem scheduled
- **Post-Mortem (📋)** — Post-mortem analysis in progress, follow-up actions tracked
