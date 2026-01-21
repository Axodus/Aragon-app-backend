# BUG: Issue Tracking & Resolution — Aragon-app-backend

**Repository:** Aragon-app-backend (Axodus/Aragon-app-backend)  
**Last Updated:** 2026-01-21  
**Status:** 3 bugs (1 FIXED, 1 VERIFIED, 1 UNDER_REVIEW)

---

## Critical Issues (Production Impact)

---

## BUG-001: Reorg Duplicate VoteCast Events (FIXED ✅)

**Area:** indexing, backend  
**Priority:** HIGH  
**Status:** FIXED → VERIFIED  
**Reported:** 2026-01-20  
**Affected:** Event handler, reorg detection
**Fixed:** 2026-01-22  
**Verified:** 2026-01-23

### Description

Chain reorg > 5 blocks causes duplicate VoteCast events in database, inflating vote counts.

**Severity:** High  
**Impact:** Vote counts become inaccurate; proposal results unreliable.

### Steps to Reproduce

1. Deploy indexer on testnet with live reorg monitoring
2. Simulate reorg: restart node with shorter canonical chain (>5 blocks)
3. Check database for duplicate VoteCast events
4. Expected: Events deduplicated after reorg recovery
5. Actual: Both original and reorg'd events present (duplicates)

### Root Cause Analysis

**Root Cause:** Idempotency key not checked during reorg recovery; handler inserted events twice  
**Fix Applied:** Added unique constraint on (blockHash, logIndex, eventType) + upsert pattern  
**Impact:** All reorg scenarios now produce idempotent results

### Fix Implementation

**Commit:** `abc12345def` (2026-01-22)  
**Changes:**
- Added unique constraint on `(blockHash, logIndex, eventType)` in event table
- Implemented upsert pattern in event handler (insert or update on conflict)
- Added reorg recovery validation

**Verification Steps:**
- [x] Testnet reorg simulation with 5-10 block reorg (verified no duplicates) [labels:type:qa] [status:DONE] [priority:HIGH] [estimate:4h]
- [x] Database constraint validated (all events unique) [labels:type:qa] [status:DONE] [priority:HIGH] [estimate:2h]
- [x] Event duplication counts before/after (0 duplicates post-fix) [labels:type:qa] [status:DONE] [priority:HIGH] [estimate:2h]

**SLA:** HIGH (4-8h) — ✅ RESOLVED in 4h

---

## BUG-002: Metadata Fetch Timeout on Slow IPFS

**Area:** backend, infra  
**Priority:** MEDIUM  
**Status:** UNDER_REVIEW  
**Reported:** 2026-01-22  
**Affected:** Metadata fetcher, indexing

### Description

Proposal metadata fetches hang indefinitely on slow or unreachable IPFS gateway, blocking metadata handler.

**Severity:** Medium  
**Impact:** Metadata handler stalls; proposals lack metadata in UI/API (fallback expected).

### Steps to Reproduce

1. Create proposal with metadata CID
2. Point IPFS gateway to slow/unreachable peer
3. Trigger metadata fetch via indexer
4. Observe: Request hangs or times out after 30s
5. Expected: Fallback to on-chain/placeholder within 5s
6. Actual: Fetch request blocks indefinitely (no timeout)

### Root Cause

**Hypotheses (under investigation):**
- No request timeout on metadata fetch (node.js fetch defaults to 30s+)
- No fallback chain implemented (on-chain source, cache, placeholder)
- No circuit breaker for persistent gateway failures

**Related Code:**
- `src/services/metadata-fetcher.ts` — IPFS fetch
- `src/handlers/metadata-handler.ts` — handler logic

### Solution (Proposed)

**Fetch with Timeout + Fallback:**
1. Fetch from IPFS with 5s timeout
2. If timeout, try on-chain metadata hash
3. If unavailable, use cached result or placeholder
4. Log failure for monitoring

**Implementation:**
- [ ] Add 5s timeout to IPFS metadata fetch [labels:type:fix] [status:TODO] [priority:MEDIUM] [estimate:2h]
- [ ] Implement fallback chain (on-chain → cache → placeholder) [labels:type:feature] [status:TODO] [priority:MEDIUM] [estimate:6h]
- [ ] Add circuit breaker for persistent failures [labels:type:feature] [status:TODO] [priority:LOW] [estimate:4h]
- [ ] Monitor IPFS gateway health + metrics [labels:type:monitoring] [status:TODO] [priority:MEDIUM] [estimate:3h]
- [ ] Test with simulated IPFS unavailability [labels:type:qa] [status:TODO] [priority:MEDIUM] [estimate:2h]

**SLA:** MEDIUM (8-24h) — ETA: 2026-01-25

---

## BUG-003: Indexing Lag on High-Volume Blocks

**Area:** indexing, infra  
**Priority:** LOW  
**Status:** INVESTIGATING  
**Reported:** 2026-01-18  
**Affected:** Event handler performance

### Description

Proposals take 2-3 blocks to appear in UI during peak traffic (>100 proposals/block).

**Severity:** Low  
**Impact:** Minor UX issue; proposals visible within 24-36s instead of 12s.

### Steps to Reproduce

1. Generate high-volume proposal traffic (>100 proposals/block)
2. Monitor proposal indexing lag in logs
3. Observe: 2-3 block delay before UI visibility
4. Expected: Visible within 1 block (~12s)
5. Actual: Visible after 24-36s (2-3 blocks)

### Root Cause

**Hypotheses (under investigation):**
- Sequential event processing (no parallelization)
- No batch insert optimization for high-volume events
- Database query performance degradation on large proposal sets
- Missing database indices on proposal queries

**Related Code:**
- `src/handlers/event-handler.ts` — event processing
- `src/services/proposal-service.ts` — proposal storage
- Database schema: `proposals` table indexes

### Investigation Progress

- [ ] Profile event handler processing time [labels:type:investigation] [status:TODO] [priority:LOW] [estimate:2h]
- [ ] Check database query execution plans [labels:type:investigation] [status:TODO] [priority:LOW] [estimate:2h]
- [ ] Measure batch insert performance impact [labels:type:investigation] [status:TODO] [priority:LOW] [estimate:3h]

### Solution (Proposed)

- [ ] Implement parallel batch insert for events [labels:type:optimization] [status:TODO] [priority:LOW] [estimate:8h]
- [ ] Add database indices for proposal queries [labels:type:optimization] [status:TODO] [priority:LOW] [estimate:3h]
- [ ] Monitor indexing latency metrics (p50, p95) [labels:type:monitoring] [status:TODO] [priority:LOW] [estimate:2h]

**SLA:** LOW (not critical) — Target SLA 12s per proposal

---

## Known Issues (Low Priority, Backlog)

### KI-001: IPFS Gateway Rate Limiting

**Status:** Known Limitation  
**Severity:** Medium  
**Workaround:** Use multiple IPFS gateways; implement gateway rotation

IPFS gateway rate limits kick in after 1000+ requests/hour. Mitigation: distribute requests across multiple gateways.

**Planned Fix:** Gateway rotation strategy (Q2)

---

### KI-002: Permission Schema Legacy Compatibility

**Status:** Known Limitation  
**Severity:** Low  
**Workaround:** Manual migration of legacy DAOs; backward compatibility layer in development

Old DAOs with legacy permission structures may have install failures. Re-install with new schema required.

**Planned Fix:** Legacy schema support layer (Q2)

---

## Bug Lifecycle & Definitions

| Stage | Definition | SLA |
|-------|-----------|-----|
| **BACKLOG** | Bug identified but not prioritized | — |
| **TODO** | Bug prioritized and scheduled | — |
| **INVESTIGATING** | Root cause being analyzed | HIGH: 4-8h, MEDIUM: 8-24h |
| **IN_PROGRESS** | Fix in active development | HIGH: 4h per checkpoint |
| **UNDER_REVIEW** | Fix ready for code review | HIGH: 2-4h |
| **TESTING** | Fix undergoing QA validation | HIGH: 4-8h |
| **FIXED** | Fix deployed to staging | MEDIUM: 8-24h (total) |
| **VERIFIED** | Fix verified on production | — |

---

## Bug Reporting Process

1. **Discover**: Identify unexpected behavior
2. **Reproduce**: Document steps to reproduce with logs
3. **Report**: Create issue with error context
4. **Investigate**: Assign owner and investigate root cause
5. **Fix**: Develop and test fix on testnet
6. **Deploy**: Deploy to staging → production
7. **Verify**: Confirm fix resolves issue

---

## Bug Fixing Workflow

**For Bugs with Investigation Status:**

1. **Investigation Phase:**
   - Set status to `INVESTIGATING`
   - Document hypotheses and tests planned
   - Gather error logs + metrics
   - Update status daily with findings

2. **Fix Development:**
   - Create feature branch: `fix/BUG-NNN-short-title`
   - Implement minimal fix (avoid scope creep)
   - Add test case for regression
   - Add error logging for future debugging

3. **Verification:**
   - Test on staging environment with testnet data
   - Validate original reproduction steps
   - Check for regressions in related handlers

4. **Deployment:**
   - Merge to develop
   - Deploy to production (with monitoring)
   - Monitor error logs + metrics for 24h

5. **Post-Deployment:**
   - Verify in production environment
   - Update status to `VERIFIED`
   - Close issue with deployment notes
