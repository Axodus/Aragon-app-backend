# FEATURE: Backend Feature Tracking — Aragon-app-backend

**Repository:** Aragon-app-backend  
**Last Updated:** 2026-01-28  
**Status:** 4 active features | 5 backlog items  

---

## Active Features (Sprint 1)

### FEATURE-001: Event Handler Foundation ✅ DONE
[labels:type:feature, area:indexing, area:backend] [status:DONE] [priority:CRITICAL] [estimate:40h] [start:2025-12-18] [end:2026-01-22]

**Description:** VoteCast, ProposalCreated, and ProposalExecuted event ingestion with reorg-safe handling.

**Completion:** 100% (all subtasks done)

**Subtasks:**
- [x] VoteCast event ingestion handler
- [x] ProposalCreated event ingestion handler
- [x] ProposalExecuted event ingestion handler
- [x] Reorg detection and block rollback logic
- [x] Idempotency constraints (blockHash, logIndex, eventType)

**Dependencies:** None  
**Blocking:** FEATURE-002 (Indexing Resilience)

---

### FEATURE-002: Indexing Resilience 🟡 IN_PROGRESS
[labels:type:feature, area:indexing, area:backend] [status:IN_PROGRESS] [priority:CRITICAL] [estimate:35h] [start:2026-01-20] [end:2026-01-27]

**Description:** Retry logic, circuit breakers, and error recovery for RPC failures and reorg scenarios.

**Completion:** 40% (14/35h)

**Subtasks:**
- [x] Retry strategy with exponential backoff (max 5 retries)
- [x] Circuit breaker for RPC outages (threshold: 5 consecutive failures)
- [ ] Handler restart logic and state recovery
- [ ] Comprehensive reorg tests (1-10 block reorg simulation)
- [ ] Database connection pooling and health checks
- [ ] Error logging and monitoring metrics

**Dependencies:** FEATURE-001 (Event Handlers)  
**Blocking:** FEATURE-003 (Observability), aragon-app integration

---

### FEATURE-003: Observability 🟡 PLANNED
[labels:type:feature, area:backend, area:infra] [status:TODO] [priority:HIGH] [estimate:30h] [start:2026-01-27] [end:2026-02-03]

**Description:** Prometheus metrics, structured logging, and Grafana dashboards for production monitoring.

**Completion:** 0%

**Subtasks:**
- [ ] Prometheus metrics export (indexing lag, event count, error rate)
- [ ] Structured logging with Winston (debug, info, warn, error levels)
- [ ] Grafana dashboard setup (indexing status, RPC health, database performance)
- [ ] Alert rules for critical issues (lag >60s, error rate >0.1%, RPC unavailable)
- [ ] Log aggregation to ELK stack or CloudWatch

**Dependencies:** FEATURE-002 (Indexing Resilience)  
**Blocking:** FEATURE-006 (E2E & Deploy)

---

### FEATURE-004: Metadata Indexing 🟡 IN_PROGRESS
[labels:type:feature, area:backend, area:infra] [status:IN_PROGRESS] [priority:HIGH] [estimate:25h] [start:2026-01-28] [end:2026-02-10]

**Description:** IPFS metadata fetching with timeout, fallback chains, and caching strategy.

**Completion:** 20%

**Subtasks:**
- [x] Metadata fetch with 5s timeout (IPFS gateway)
- [ ] Fallback chain: on-chain metadata → local cache → placeholder
- [ ] IPFS gateway rotation (multiple gateway URLs for redundancy)
- [ ] Caching strategy (TTL: 24h for valid, 1h for failures)
- [ ] Error logging and fallback metrics
- [ ] Metadata validation (format, size limits)

**Dependencies:** FEATURE-001 (Event Handlers)  
**Blocking:** aragon-app metadata display

---

## Backlog Features

### FEATURE-005: Native-Token Support ⬜ BACKLOG
[labels:type:feature, area:backend, area:indexing] [status:TODO] [priority:MEDIUM] [estimate:20h] [start:2026-02-02] [end:2026-02-21]

**Description:** Native token execution detection, vote tracking, and API exposure.

**Completion:** 0%

**Subtasks:**
- [ ] Native token execution detection (filtering events)
- [ ] Native token vote tracking in votes table
- [ ] API endpoint for native token execution metadata
- [ ] Voting power provider integration (RPC wallet + staked calculation)
- [ ] Native token edge case testing

**Dependencies:** FEATURE-002, FEATURE-004  
**Blocking:** FEATURE-006 (E2E & Deploy)

---

### FEATURE-006: E2E Testing & Deploy ⬜ BACKLOG
[labels:type:feature, area:backend, area:qa] [status:TODO] [priority:CRITICAL] [estimate:15h] [start:2026-02-10] [end:2026-02-28]

**Description:** Full integration testing, load testing, and production deployment.

**Completion:** 0%

**Subtasks:**
- [ ] Integration tests (proposal lifecycle: create → vote → execute)
- [ ] Load testing (peak traffic simulation: 1000+ events/block)
- [ ] Production runbook and escalation procedures
- [ ] Smoke tests on Harmony mainnet
- [ ] SLA validation (indexing lag <30s, API uptime >99.9%)

**Dependencies:** FEATURE-002, FEATURE-003, FEATURE-004, FEATURE-005  
**Blocking:** Production go-live

---

### FEATURE-007: Performance Optimization ⬜ BACKLOG
[labels:type:feature, area:backend, area:optimization] [status:TODO] [priority:MEDIUM] [estimate:16h]

**Description:** Indexing lag reduction through parallel processing and database optimization.

**Subtasks:**
- [ ] Parallel batch insert for high-volume events
- [ ] Database indices optimization (proposal queries)
- [ ] Query performance profiling and tuning
- [ ] Sharding strategy for very high-volume DAOs

**Dependencies:** FEATURE-002 (Indexing Resilience)

---

### FEATURE-008: Advanced Monitoring ⬜ BACKLOG
[labels:type:feature, area:backend, area:infra] [status:TODO] [priority:MEDIUM] [estimate:12h]

**Description:** Distributed tracing, performance profiling, and advanced analytics.

**Subtasks:**
- [ ] Distributed tracing (OpenTelemetry integration)
- [ ] Performance profiling (CPU, memory, I/O bottleneck analysis)
- [ ] Custom metrics dashboards (per-DAO indexing stats)
- [ ] Historical analytics and trend analysis

**Dependencies:** FEATURE-003 (Observability)

---

### FEATURE-009: Security Hardening ⬜ BACKLOG
[labels:type:feature, area:backend, area:security] [status:TODO] [priority:MEDIUM] [estimate:10h]

**Description:** Input validation, rate limiting, and security auditing.

**Subtasks:**
- [ ] API input validation and sanitization
- [ ] Rate limiting on public endpoints
- [ ] Audit logging for admin operations
- [ ] SQL injection prevention verification

**Dependencies:** FEATURE-002, FEATURE-003

---

## Feature Priority Matrix

| Feature | Impact | Effort | Priority | Notes |
|---------|--------|--------|----------|-------|
| **FEATURE-001** | CRITICAL | 40h | **CRITICAL** | ✅ Done; foundation for all others |
| **FEATURE-002** | CRITICAL | 35h | **CRITICAL** | In progress; required for stability |
| **FEATURE-003** | HIGH | 30h | **HIGH** | Essential for production observability |
| **FEATURE-004** | HIGH | 25h | **HIGH** | Blocks frontend metadata display |
| **FEATURE-005** | MEDIUM | 20h | **MEDIUM** | Post-MVP (Q2/Q3 timeline) |
| **FEATURE-006** | CRITICAL | 15h | **CRITICAL** | Required for go-live |
| **FEATURE-007** | MEDIUM | 16h | **MEDIUM** | Performance tuning (post-MVP) |
| **FEATURE-008** | MEDIUM | 12h | **MEDIUM** | Advanced monitoring (Q2) |
| **FEATURE-009** | MEDIUM | 10h | **MEDIUM** | Security hardening (Q2) |

---

## Release Timeline

| Release | Features | Status | Target Date |
|---------|----------|--------|-------------|
| **v1.0 (MVP)** | FEATURE-001 to 006 | In progress | 2026-02-28 |
| **v1.1 (Optimization)** | FEATURE-007, FEATURE-008 | Backlog | 2026-04-30 |
| **v1.2 (Security)** | FEATURE-009, additional hardening | Backlog | 2026-05-31 |
| **v2.0 (Advanced)** | Sharding, multi-chain, advanced indexing | Backlog | 2026-H2 |

---

## Feature Status Definitions

- **✅ DONE** — Feature complete, tested, deployed to production
- **🟡 IN_PROGRESS** — Feature under active development
- **📋 PLANNED** — Feature planned for upcoming sprint
- **⬜ BACKLOG** — Feature identified but not yet scheduled
