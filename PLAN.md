# PLAN: Backend Architecture & Indexing — Aragon-app-backend

**Repository:** Aragon-app-backend (Indexing Service)  
**Owner:** Backend Lead  
**Timeline:** 2026-01-21 to 2026-02-28 (6 weeks)  
**Status:** 37% complete (2 DONE, 18 TODO) | 140h planned  

---

## Executive Summary

Aragon-app-backend is the event indexing service for Harmony HarmonyVoting DAOs. The service:
- Captures blockchain events from Harmony RPC
- Deduplicates events across reorgs (chain reorganizations)
- Stores events and derived data (proposals, votes) in MongoDB
- Exposes APIs for the frontend application
- Provides observability (metrics, logs, alerts)

**Timeline Coordination:**
- Contracts deployed (AragonOSX): **2026-01-22**
- Backend indexing ready: **2026-01-27** (blocking frontend)
- Frontend integration: **2026-02-04**
- Production go-live: **2026-02-28**

**Success Criteria:** Backend APIs 99.9% uptime, indexing lag <30s, all reorg scenarios handled safely.

---

## Milestones & Progress

| # | Milestone | Focus | Effort | Status | Owner | End Date |
|---|-----------|-------|--------|--------|-------|----------|
| **1** | **Event Handlers** | VoteCast, Proposal, Execute event ingestion; reorg detection | 40h | ✅ **100%** | Backend | 2026-01-22 |
| **2** | **Indexing Resilience** | Retry logic, circuit breakers, error recovery, reorg validation | 35h | 🟡 **40%** (14/35h) | Backend | 2026-01-27 |
| **3** | **Observability** | Prometheus metrics, structured logging, Grafana dashboards, alerting | 30h | 🟡 **20%** (6/30h) | Backend+DevOps | 2026-02-03 |
| **4** | **Metadata Indexing** | IPFS fallback chain, caching, metadata handlers, gateway rotation | 25h | 🟡 **30%** (7.5/25h) | Backend | 2026-02-10 |
| **5** | **Native-Token Support** | Native token execution indexing, marking, API exposure | 20h | ⬜ **0%** | Backend | 2026-02-21 |
| **6** | **E2E Testing & Deploy** | Integration testing, load test, runbook, production readiness | 15h | ⬜ **0%** | Backend+QA | 2026-02-28 |

**Total:** 165h planned | **Progress:** 2 DONE + 18 TODO | **Est. Remaining:** 128h (79%)

---

## Feature Timeline (SPRINT)

### **FEATURE-001: Event Handler Foundation** ✅ DONE [2026-01-22]
[labels:type:feature] [status:DONE] [priority:CRITICAL] [estimate:40h]

- VoteCast event ingestion (→ votes table)
- ProposalCreated event ingestion (→ proposals table)
- ProposalExecuted event ingestion (→ executions table)
- Reorg detection and block rollback
- Unique constraints on (blockHash, logIndex, eventType) for idempotency

### **FEATURE-002: Indexing Resilience** 🟡 IN_PROGRESS [2026-01-27]
[labels:type:feature] [status:IN_PROGRESS] [priority:CRITICAL] [estimate:35h]

- Retry strategy for failed events (exponential backoff, max 5 retries)
- Circuit breaker for RPC outages (threshold: 5 consecutive failures)
- Error recovery and handler restart logic
- Comprehensive reorg tests (simulating 1-10 block reorgs)
- Database connection pooling and health checks

### **FEATURE-003: Observability** 🟡 PLANNED [2026-02-03]
[labels:type:feature] [status:TODO] [priority:HIGH] [estimate:30h]

- Prometheus metrics (indexing lag, event count, error rate)
- Structured logging with winston (debug, info, warn, error levels)
- Grafana dashboards (indexing status, RPC health, database performance)
- Alert rules (indexing lag >60s, error rate >0.1%, RPC unavailable)

### **FEATURE-004: Metadata Indexing** 🟡 PLANNED [2026-02-10]
[labels:type:feature] [status:TODO] [priority:HIGH] [estimate:25h]

- Metadata fetch with 5s timeout (IPFS gateway)
- Fallback chain: on-chain metadata → local cache → placeholder
- IPFS gateway rotation (multiple gateway URLs)
- Caching strategy (TTL: 24h for valid metadata, 1h for failures)

### **FEATURE-005: Native-Token Support** ⬜ BACKLOG [2026-02-21]
[labels:type:feature] [status:TODO] [priority:MEDIUM] [estimate:20h]

- Native token execution detection and marking
- Native token vote tracking
- API exposure of native token execution metadata

### **FEATURE-006: E2E Testing & Deploy** ⬜ BACKLOG [2026-02-28]
[labels:type:feature] [status:TODO] [priority:CRITICAL] [estimate:15h]

- Integration tests: proposal lifecycle (create → vote → execute)
- Load testing: peak traffic simulation (1000+ events/block)
- Production runbook and escalation procedures
- Deployment and smoke tests on Harmony mainnet

---

## Risks & Mitigations

| Risk | Severity | Likelihood | Mitigation | Owner |
|------|----------|------------|-----------|-------|
| **RPC Node Instability** — Indexing stalls if primary RPC fails | HIGH | HIGH | Fallback RPC endpoints + health checks + circuit breaker | Backend |
| **Reorg Handling Edge Case** — Duplicates if reorg detection fails | HIGH | MEDIUM | Exhaustive reorg tests (1-10 blocks); idempotency constraints | Backend |
| **Metadata Gateway Timeout** — Missing metadata blocks frontend | HIGH | MEDIUM | Timeout + fallback strategy (on-chain cache → placeholder) | Backend |
| **IPFS Rate Limiting** — Gateway hits rate limit at peak traffic | MEDIUM | MEDIUM | Gateway rotation strategy (multiple IPs); caching (24h TTL) | Backend |
| **Database Performance Degradation** — Indexing lag under load | MEDIUM | MEDIUM | Batch insert optimization; database indices; query profiling | Backend+DevOps |
| **Native-Token RPC Calls** — Extra RPC calls increase costs & latency | MEDIUM | MEDIUM | Batch RPC calls; caching; async processing | Backend |

---

## Cross-Repository Dependencies

**Blocks:** 
- ← **AragonOSX (Contracts)** deployed (target 2026-01-22)
- → **aragon-app (Frontend)** waits for backend APIs (target 2026-01-27)

**Handoff Timeline:**
1. **Contracts → Backend:** AragonOSX deploys (1/22) → Backend has contract ABIs + addresses → Backend starts event indexing (1/23)
2. **Backend → Frontend:** Backend APIs operational (1/27) → Frontend can call metadata + proposal endpoints (1/28+)
3. **Frontend → Go-Live:** Frontend integration complete (2/04) → Whole system ready for production (2/28)

---

## Acceptance Criteria (Go/No-Go Checklist)

- [ ] **Event Handling:** All events (VoteCast, Create, Execute) captured and deduplicated [labels:type:qa] [status:DONE] [priority:CRITICAL]
- [ ] **Reorg Recovery:** Tested with simulated 1-10 block reorgs; no duplicates [labels:type:qa] [status:TODO] [priority:CRITICAL]
- [ ] **API Endpoints:** Status, events, proposals, metadata endpoints operational [labels:type:qa] [status:TODO] [priority:CRITICAL]
- [ ] **Error Handling:** Retry logic + circuit breaker tested; handles RPC outages [labels:type:qa] [status:TODO] [priority:HIGH]
- [ ] **Logging & Monitoring:** Structured logs + Prometheus metrics active [labels:type:qa] [status:TODO] [priority:HIGH]
- [ ] **Metadata Fallback:** IPFS timeout + fallback chain verified [labels:type:qa] [status:TODO] [priority:HIGH]
- [ ] **Database Health:** Connection pooling, indices, query performance acceptable [labels:type:qa] [status:TODO] [priority:HIGH]
- [ ] **Load Testing:** Peak traffic simulation (1000+ events/block) passed [labels:type:qa] [status:TODO] [priority:MEDIUM]
- [ ] **Runbook & Escalation:** Documented; team trained [labels:type:docs] [status:TODO] [priority:MEDIUM]
- [ ] **Production Deployment:** Smoke tests passed on Harmony mainnet [labels:type:ops] [status:TODO] [priority:CRITICAL]

---

## Execution Checklist

- [ ] Milestone 1 (Event Handlers): Complete & validated ✅ [2026-01-22]
- [ ] Milestone 2 (Resilience): In progress; 40% complete 🟡 [target 2026-01-27]
- [ ] Milestone 3 (Observability): Planned 📋 [target 2026-02-03]
- [ ] Milestone 4 (Metadata): Planned 📋 [target 2026-02-10]
- [ ] Milestone 5 (Native-Token): Backlog 📋 [target 2026-02-21]
- [ ] Milestone 6 (E2E & Deploy): Backlog 📋 [target 2026-02-28]
- [ ] Backend → Frontend integration handoff [target 2026-01-27]
- [ ] Production smoke tests & validation [target 2026-02-28]
- [ ] Admin grant approval (DAO vote) [target 2026-02-17+]

**Sign-Off Path:** Backend Owner → Frontend Owner → DevOps → CTO → Deployment
