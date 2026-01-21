# EPIC: Aragon-app-backend Strategic Initiatives — Aragon-app-backend

**Repository:** Aragon-app-backend  
**Last Updated:** 2026-01-21  
**Status:** 1 active epic | 2 backlog epics  

---

## EPIC-001: HarmonyVoting Backend E2E (Foundation)

**Epic ID:** EPIC-001  
**Status:** IN_PROGRESS 🟡  
**Priority:** CRITICAL  
**Effort:** 140h  
**Timeline:** 2026-01-21 to 2026-02-28 (6 weeks)  
**Progress:** 37% (2 DONE, 18 TODO)

### Vision

Deliver a robust, production-grade backend indexing service for Aragon's HarmonyVoting protocol on Harmony blockchain. The backend must:
- Safely handle chain reorgs and reorg-induced event duplication
- Provide low-latency event indexing (lag <30s)
- Expose reliable APIs for frontend consumption
- Include comprehensive observability (metrics, logs, alerts)
- Support native token voting and execution

### Strategic Goals

1. **Reliability (CRITICAL):** Zero event duplication, <5 second reorg recovery
2. **Performance (HIGH):** Indexing lag <30s under peak traffic (1000+ events/block)
3. **Observability (HIGH):** Real-time monitoring, alerting, and incident response
4. **Metadata Resilience (HIGH):** IPFS fallback chains, caching, gateway rotation
5. **Operations (MEDIUM):** Runbooks, disaster recovery, team training

### Features in This Epic

| Feature | Status | Effort | Owner | Target |
|---------|--------|--------|-------|--------|
| FEATURE-001: Event Handlers | ✅ DONE | 40h | Backend | 2026-01-22 |
| FEATURE-002: Indexing Resilience | 🟡 IN_PROGRESS | 35h | Backend | 2026-01-27 |
| FEATURE-003: Observability | 📋 PLANNED | 30h | Backend+DevOps | 2026-02-03 |
| FEATURE-004: Metadata Indexing | 📋 PLANNED | 25h | Backend | 2026-02-10 |
| FEATURE-005: Native-Token Support | 📋 PLANNED | 20h | Backend | 2026-02-21 |
| FEATURE-006: E2E Testing & Deploy | 📋 PLANNED | 15h | Backend+QA | 2026-02-28 |

**Total Effort:** 165h

### Cross-Epic Dependencies

- **⬅️ Blocked by:** AragonOSX (Contract deployment target: 2026-01-22)
- **➡️ Blocks:** aragon-app (Frontend API dependency, target: 2026-01-27)
- **Related:** osx-plugin-foundry (Plugin setup contracts)

### Acceptance Criteria (10 total, 0/10 done)

- [ ] **AC-001:** All events (VoteCast, Create, Execute) captured and deduplicated [labels:type:qa] [status:TODO]
- [ ] **AC-002:** Reorg scenarios (1-10 blocks) tested; no duplicates or data loss [labels:type:qa] [status:TODO]
- [ ] **AC-003:** All API endpoints (status, events, proposals, metadata) operational [labels:type:qa] [status:TODO]
- [ ] **AC-004:** Error handling tested: retry logic, circuit breaker, RPC fallover [labels:type:qa] [status:TODO]
- [ ] **AC-005:** Logging and monitoring active: Prometheus metrics, structured logs, Grafana dashboards [labels:type:qa] [status:TODO]
- [ ] **AC-006:** Metadata fallback chain verified: IPFS → on-chain → cache → placeholder [labels:type:qa] [status:TODO]
- [ ] **AC-007:** Database health: connection pooling, indices, query performance acceptable [labels:type:qa] [status:TODO]
- [ ] **AC-008:** Load testing passed: 1000+ events/block, indexing lag <30s [labels:type:qa] [status:TODO]
- [ ] **AC-009:** Runbook and escalation procedures documented; team trained [labels:type:docs] [status:TODO]
- [ ] **AC-010:** Production deployment: smoke tests passed on Harmony mainnet [labels:type:ops] [status:TODO]

### Implementation Timeline

#### **Phase 1: Foundation (2026-01-21 to 2026-01-27)** — 75h

**Goals:** Event handlers complete, resilience framework in place

- Week 1 (Jan 21-26):
  - FEATURE-001: Event handlers ✅ DONE
  - FEATURE-002: Resilience (40% in progress)
  - TASK-001: Reorg testing (in progress)

- Week 2 (Jan 27):
  - FEATURE-002: Complete resilience (circuit breaker, retry logic)
  - Validate reorg scenarios (1-10 blocks)
  - Backend → Frontend handoff (APIs operational)

#### **Phase 2: Integration (2026-01-28 to 2026-02-11)** — 55h

**Goals:** Metadata indexing, observability, native-token support

- Week 3-4 (Jan 28 - Feb 11):
  - FEATURE-003: Observability (Prometheus, Grafana, alerts)
  - FEATURE-004: Metadata indexing (IPFS fallback, caching)
  - TASK-002: Database optimization

#### **Phase 3: Testing & Release (2026-02-12 to 2026-02-28)** — 35h

**Goals:** E2E testing, load testing, production readiness

- Week 5-6 (Feb 12-28):
  - FEATURE-005: Native-token support
  - FEATURE-006: E2E testing and load testing
  - TASK-005: Operational runbook finalization
  - Production deployment and validation

### Risk Matrix

| Risk | Severity | Likelihood | Impact | Mitigation | Owner |
|------|----------|------------|--------|-----------|-------|
| **RPC Instability** | HIGH | HIGH | Indexing stalls, missed events | Fallback RPC + circuit breaker + monitoring | Backend |
| **Reorg Edge Cases** | HIGH | MEDIUM | Data duplication | Exhaustive testing (1-10 blocks), idempotency constraints | Backend |
| **Metadata Timeout** | HIGH | MEDIUM | Frontend blocked on metadata | Timeout + fallback strategy (on-chain, cache) | Backend |
| **IPFS Rate Limiting** | MEDIUM | MEDIUM | Gateway unavailable | Rotation strategy + caching (24h TTL) | Backend |
| **Database Performance** | MEDIUM | MEDIUM | Indexing lag >30s | Batch inserts, indices, query profiling | Backend+DevOps |
| **Native-Token RPC Overhead** | MEDIUM | MEDIUM | Increased costs | Batch calls, caching, async processing | Backend |

### Key Metrics & Monitoring

**SLA Targets:**
- Indexing lag: <30s (p95)
- API uptime: 99.9% (production)
- Event deduplication: 100% (zero duplicates in reorg scenarios)
- Error rate: <0.1% (low enough for circuit breaker threshold)

**Key Metrics:**
- `indexing_lag_seconds` (p50, p95, max)
- `events_indexed_total` (by type)
- `api_request_latency_ms` (by endpoint)
- `database_query_time_ms` (by query type)
- `rpc_request_success_rate` (%)

**Monitoring Tools:**
- Prometheus (metrics collection)
- Grafana (dashboards)
- Winston (structured logging)
- AlertManager (alerting)

### Resource Allocation

**Team:**
- Backend Lead (full-time, 6 weeks)
- Backend Engineer (full-time, 6 weeks)
- DevOps Engineer (part-time, 2 weeks for infrastructure)
- QA Engineer (part-time, 2 weeks for load testing)

**Infrastructure:**
- RPC Node (Harmony testnet + mainnet access)
- MongoDB (staging + production instances)
- Prometheus + Grafana (monitoring stack)
- IPFS Gateway (primary + fallbacks)

### Success Criteria Summary

✅ **Done:** Event handlers foundation  
🟡 **In Progress:** Resilience framework  
📋 **Planned:** Observability, metadata, native-token, E2E  

**Go/No-Go Decision Points:**
- **2026-01-27:** Resilience feature complete, APIs operational (frontend can start integration)
- **2026-02-10:** Metadata indexing complete, observability active
- **2026-02-21:** Native-token support complete
- **2026-02-28:** E2E testing passed, production ready

---

## EPIC-002: Backend Performance Optimization & Scaling (Q2/Q3)

**Epic ID:** EPIC-002  
**Status:** BACKLOG ⬜  
**Priority:** MEDIUM  
**Effort:** 60h  
**Timeline:** 2026-04-01 to 2026-06-30 (Q2/Q3)

### Vision

Optimize backend for high-volume scenarios and prepare for multi-chain expansion.

### Features

- FEATURE-007: Performance optimization (parallel batch inserts, database tuning)
- FEATURE-008: Advanced monitoring (distributed tracing, custom dashboards)
- TASK-006: IPFS gateway management system
- TASK-011: Load testing & capacity planning

### Key Goals

1. Reduce indexing lag to <15s (p95) for 10,000+ events/block
2. Implement distributed tracing for performance debugging
3. Build horizontal scaling strategy
4. Prepare for Ethereum/Polygon expansion

---

## EPIC-003: Multi-Chain Backend Expansion (Q3/Q4)

**Epic ID:** EPIC-003  
**Status:** BACKLOG ⬜  
**Priority:** MEDIUM  
**Effort:** 80h  
**Timeline:** 2026-07-01 to 2026-09-30 (Q3/Q4)

### Vision

Extend backend to support multiple chains (Ethereum, Polygon, zkSync) in addition to Harmony.

### Features

- Multi-chain RPC abstraction layer
- Chain-specific event handlers (Solidity differences)
- Cross-chain proposal and vote consolidation
- Multi-chain API responses

### Key Goals

1. Support 3+ chains with unified API
2. Cross-chain proposal voting (if governance allows)
3. Chain-independent observer pattern

---

## Epic Status Definitions

- **✅ DONE** — Epic complete, all acceptance criteria met, in production
- **🟡 IN_PROGRESS** — Epic actively being developed
- **📋 PLANNED** — Epic scheduled for upcoming period
- **⬜ BACKLOG** — Epic identified but not yet scheduled

---

## Epic Governance & Approvals

**Sign-Off Path for EPIC-001:**
1. Backend Owner (technical) → Approves features and SLAs
2. Frontend Owner (integration) → Validates API contracts
3. DevOps Lead (infrastructure) → Approves scaling, monitoring
4. CTO (strategic) → Final approval for production
5. DAO (governance) → Admin grant approval

**Decision Points:**
- **2026-01-27:** Feature-002 complete, green light for frontend integration
- **2026-02-03:** Observability active, monitoring in place
- **2026-02-21:** All features (1-5) complete, ready for E2E testing
- **2026-02-28:** Production readiness validation, go/no-go decision
