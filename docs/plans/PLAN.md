#  #PLAN-003 - Backend Architecture & Indexing — HarmonyVoting

**Repository:** Aragon-app-backend (Indexing Service)  
**End Date Goal:** 2026-02-28  
**Priority:** HIGH  
**Estimative Hours:** 165h  
**Status:** in progress

---

## Executive Summary

Aragon-app-backend is the event indexing service for Harmony HarmonyVoting DAOs. The service captures blockchain events from Harmony RPC, deduplicates events across reorgs, stores data in MongoDB, exposes APIs for the frontend, and provides observability.

### Key Metrics

- **Total Planned Work:** 165h
- **Completion:** 37% (2 DONE, 18 TODO)
- **Active Features:** 6 (Event Handlers, Resilience, Observability, Metadata, Native-Token, E2E)
- **Open Bugs:** 0
- **Timeline:** 2026-01-21 → 2026-02-28

### Timeline Coordination

| Phase | Date | Dependency |
|-------|------|------------|
| Contracts deployed (AragonOSX) | 2026-01-22 | ← |
| Backend indexing ready | 2026-01-27 | Blocks frontend |
| Frontend integration | 2026-02-04 | → |
| Production go-live | 2026-02-28 | → |

### Success Criteria

- Backend APIs 99.9% uptime
- Indexing lag <30s
- All reorg scenarios handled safely

---

## Subtasks (Linked)

### FEATURE-001: Event Handler Foundation
[labels:type:feature, area:backend, area:indexing] [status:DONE] [priority:CRITICAL] [estimate:40h] [start:2026-01-15] [end:2026-01-22]

- [x] VoteCast event ingestion (→ votes table) [labels:type:task, area:backend] [status:DONE] [priority:CRITICAL] [estimate:8h] [start:2026-01-15] [end:2026-01-17]
- [x] ProposalCreated event ingestion (→ proposals table) [labels:type:task, area:backend] [status:DONE] [priority:CRITICAL] [estimate:8h] [start:2026-01-17] [end:2026-01-18]
- [x] ProposalExecuted event ingestion (→ executions table) [labels:type:task, area:backend] [status:DONE] [priority:CRITICAL] [estimate:8h] [start:2026-01-18] [end:2026-01-19]
- [x] Reorg detection and block rollback [labels:type:task, area:backend, area:indexing] [status:DONE] [priority:CRITICAL] [estimate:8h] [start:2026-01-19] [end:2026-01-20]
- [x] Unique constraints on (blockHash, logIndex, eventType) for idempotency [labels:type:task, area:backend] [status:DONE] [priority:HIGH] [estimate:8h] [start:2026-01-20] [end:2026-01-22]

### FEATURE-002: Indexing Resilience
[labels:type:feature, area:backend, area:indexing] [status:IN_PROGRESS] [priority:CRITICAL] [estimate:35h] [start:2026-01-22] [end:2026-01-27]

- [x] Retry strategy for failed events (exponential backoff, max 5 retries) [labels:type:task, area:backend] [status:DONE] [priority:HIGH] [estimate:7h] [start:2026-01-22] [end:2026-01-23]
- [x] Circuit breaker for RPC outages (threshold: 5 consecutive failures) [labels:type:task, area:backend, area:infra] [status:DONE] [priority:HIGH] [estimate:7h] [start:2026-01-23] [end:2026-01-24]
- [ ] Error recovery and handler restart logic [labels:type:task, area:backend] [status:TODO] [priority:HIGH] [estimate:7h] [start:2026-01-24] [end:2026-01-25]
- [ ] Comprehensive reorg tests (simulating 1-10 block reorgs) [labels:type:test, area:backend] [status:TODO] [priority:CRITICAL] [estimate:7h] [start:2026-01-25] [end:2026-01-26]
- [ ] Database connection pooling and health checks [labels:type:task, area:backend, area:infra] [status:TODO] [priority:HIGH] [estimate:7h] [start:2026-01-26] [end:2026-01-27]

### FEATURE-003: Observability
[labels:type:feature, area:backend, area:infra] [status:TODO] [priority:HIGH] [estimate:30h] [start:2026-01-28] [end:2026-02-03]

- [ ] Prometheus metrics (indexing lag, event count, error rate) [labels:type:task, area:backend, area:infra] [status:TODO] [priority:HIGH] [estimate:8h] [start:2026-01-28] [end:2026-01-29]
- [ ] Structured logging with winston (debug, info, warn, error levels) [labels:type:task, area:backend] [status:TODO] [priority:HIGH] [estimate:6h] [start:2026-01-29] [end:2026-01-30]
- [ ] Grafana dashboards (indexing status, RPC health, database performance) [labels:type:task, area:infra] [status:TODO] [priority:MEDIUM] [estimate:8h] [start:2026-01-30] [end:2026-01-31]
- [ ] Alert rules (indexing lag >60s, error rate >0.1%, RPC unavailable) [labels:type:task, area:infra] [status:TODO] [priority:HIGH] [estimate:8h] [start:2026-02-01] [end:2026-02-03]

### FEATURE-004: Metadata Indexing
[labels:type:feature, area:backend] [status:IN_PROGRESS] [priority:HIGH] [estimate:25h] [start:2026-02-04] [end:2026-02-10]

- [x] Metadata fetch with 5s timeout (IPFS gateway) [labels:type:task, area:backend] [status:DONE] [priority:HIGH] [estimate:5h] [start:2026-02-04] [end:2026-02-04]
- [ ] Fallback chain: on-chain metadata → local cache → placeholder [labels:type:task, area:backend] [status:TODO] [priority:HIGH] [estimate:6h] [start:2026-02-05] [end:2026-02-06]
- [ ] IPFS gateway rotation (multiple gateway URLs) [labels:type:task, area:backend, area:infra] [status:TODO] [priority:MEDIUM] [estimate:5h] [start:2026-02-06] [end:2026-02-07]
- [ ] Caching strategy (TTL: 24h for valid metadata, 1h for failures) [labels:type:task, area:backend] [status:TODO] [priority:HIGH] [estimate:6h] [start:2026-02-08] [end:2026-02-10]
- [ ] Metadata validation and integrity checks [labels:type:task, area:backend, area:security] [status:TODO] [priority:HIGH] [estimate:3h] [start:2026-02-10] [end:2026-02-10]

### FEATURE-005: Native-Token Support
[labels:type:feature, area:backend] [status:TODO] [priority:MEDIUM] [estimate:20h] [start:2026-02-11] [end:2026-02-21]

- [ ] Native token execution detection and marking [labels:type:task, area:backend] [status:TODO] [priority:MEDIUM] [estimate:8h] [start:2026-02-11] [end:2026-02-14]
- [ ] Native token vote tracking [labels:type:task, area:backend] [status:TODO] [priority:MEDIUM] [estimate:6h] [start:2026-02-15] [end:2026-02-18]
- [ ] API exposure of native token execution metadata [labels:type:task, area:backend] [status:TODO] [priority:MEDIUM] [estimate:6h] [start:2026-02-19] [end:2026-02-21]

### FEATURE-006: E2E Testing & Deploy
[labels:type:feature, area:qa, area:testing] [status:TODO] [priority:CRITICAL] [estimate:15h] [start:2026-02-22] [end:2026-02-28]

- [ ] Integration tests: proposal lifecycle (create → vote → execute) [labels:type:test, area:backend] [status:TODO] [priority:HIGH] [estimate:5h] [start:2026-02-22] [end:2026-02-23]
- [ ] Load testing: peak traffic simulation (1000+ events/block) [labels:type:test, area:backend, area:infra] [status:TODO] [priority:HIGH] [estimate:4h] [start:2026-02-24] [end:2026-02-25]
- [ ] Production runbook and escalation procedures [labels:type:docs, area:ops] [status:TODO] [priority:MEDIUM] [estimate:3h] [start:2026-02-26] [end:2026-02-27]
- [ ] Deployment and smoke tests on Harmony mainnet [labels:type:qa, area:ops] [status:TODO] [priority:CRITICAL] [estimate:3h] [start:2026-02-27] [end:2026-02-28]

### TASK-001: Acceptance Criteria Validation
[labels:type:qa, area:backend] [status:TODO] [priority:HIGH] [estimate:12h] [start:2026-02-28] [end:2026-02-28]

- [ ] Event Handling: All events captured and deduplicated [labels:type:qa] [status:TODO] [priority:CRITICAL] [estimate:2h]
- [ ] Reorg Recovery: Tested with 1-10 block reorgs; no duplicates [labels:type:qa] [status:TODO] [priority:CRITICAL] [estimate:2h]
- [ ] API Endpoints: Status, events, proposals, metadata endpoints operational [labels:type:qa] [status:TODO] [priority:CRITICAL] [estimate:2h]
- [ ] Error Handling: Retry logic + circuit breaker tested [labels:type:qa] [status:TODO] [priority:HIGH] [estimate:2h]
- [ ] Database Health: Connection pooling, indices, query performance [labels:type:qa] [status:TODO] [priority:HIGH] [estimate:2h]
- [ ] Production Deployment: Smoke tests passed on Harmony mainnet [labels:type:ops] [status:TODO] [priority:CRITICAL] [estimate:2h]

---

## Milestones

- **Milestone 1:** Event Handler Foundation — 2026-01-15 → 2026-01-22 — ✅ DONE
- **Milestone 2:** Indexing Resilience — 2026-01-22 → 2026-01-27 — 🔄 40%
- **Milestone 3:** Observability — 2026-01-28 → 2026-02-03 — 🔄 20%
- **Milestone 4:** Metadata Indexing — 2026-02-04 → 2026-02-10 — 🔄 30%
- **Milestone 5:** Native-Token Support — 2026-02-11 → 2026-02-21 — ⬜ 0%
- **Milestone 6:** E2E Testing & Deploy — 2026-02-22 → 2026-02-28 — ⬜ 0%
- **Production Go-Live:** 2026-02-28

---

## Notes

### Risks & Mitigations

| Risk | Severity | Likelihood | Mitigation | Owner |
|------|----------|------------|-----------|-------|
| RPC Node Instability | HIGH | HIGH | Fallback RPC endpoints + circuit breaker | Backend |
| Reorg Handling Edge Case | HIGH | MEDIUM | Exhaustive reorg tests + idempotency constraints | Backend |
| Metadata Gateway Timeout | HIGH | MEDIUM | Timeout + fallback strategy | Backend |
| IPFS Rate Limiting | MEDIUM | MEDIUM | Gateway rotation + caching | Backend |
| Database Performance | MEDIUM | MEDIUM | Batch inserts + indices + query profiling | Backend+DevOps |

### Cross-Repo Dependencies

- **Blocks:** ← AragonOSX (Contracts) deployed (target 2026-01-22)
- **Blocks:** → aragon-app (Frontend) waits for backend APIs (target 2026-01-27)

### Cross-Repo Plans

- [AragonOSX PLAN](../../../AragonOSX/docs/plans/PLAN.md) — Contracts and master coordination
- [aragon-app PLAN](../../../aragon-app/docs/plans/PLAN.md) — Frontend UI/UX

---

**Version:** 2.0  
**Last Updated:** 2026-01-21  
**Template:** [PLAN.md](https://gist.github.com/mzfshark/2ab8856d6c0efc0dfa9d1f98d2a23fdf)
