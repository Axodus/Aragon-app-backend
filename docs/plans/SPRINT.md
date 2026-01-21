# Sprint 1: Backend Indexing & API Production Release

**Repository:** Aragon-app-backend (Axodus/Aragon-app-backend)  
**Branch:** develop  
**Sprint Goal:** Deliver production-ready backend indexer with reorg safety, metadata fallbacks, and native-token power computation.

**Sprint Start:** 2026-01-21  
**Sprint End:** 2026-02-28  
**Current Date:** 2026-01-21  
**Status:** Active (Week 1 of 6)

---

## Summary

| Status | Count | Hours |
|--------|-------|-------|
| ✅ DONE | 2 | ~10% complete |
| 🔄 TODO | 18 | ~130h remaining |
| **Total** | **20** | **~140h** |

---

## FEATURE-001: Indexing Resilience [area:backend, area:indexing] [priority:HIGH]

**Status:** 25% complete (2/8 subtasks done, 34h remaining)  
**Completion %:** 25%  
**Remaining Effort:** 34h

- [x] Handlers cover ProposalCreated/VoteCast [labels:type:task, area:backend, area:indexing] [status:DONE] [priority:high] [estimate:6h] [start:2025-12-18] [end:2025-12-19]
- [x] Historical indexing enabled (HarmonyVoting) [labels:type:task, area:indexing, area:backend] [status:DONE] [priority:high] [estimate:4h] [start:2025-12-19] [end:2025-12-20]
- [ ] Reorg-safe idempotency (unique constraints + upsert) [labels:type:task, area:indexing] [status:TODO] [priority:high] [estimate:8h] [start:2026-01-20] [end:2026-01-22]
- [ ] Confirmations + block monitoring [labels:type:task, area:indexing] [status:TODO] [priority:high] [estimate:4h] [start:2026-01-20] [end:2026-01-21]
- [ ] Catch-up strategy (backfill + checkpointing) [labels:type:task, area:indexing, area:infra] [status:TODO] [priority:high] [estimate:10h] [start:2026-01-22] [end:2026-01-24]
- [ ] Reorg simulation testing [labels:type:qa, area:indexing] [status:TODO] [priority:high] [estimate:8h] [start:2026-01-25] [end:2026-01-26]
- [ ] Integration validation (fresh sync, mid-history, reorg) [labels:type:qa, area:indexing] [status:TODO] [priority:high] [estimate:12h] [start:2026-01-27] [end:2026-01-29]
- [ ] Monitor reorg edge cases (>10 blocks) [labels:type:qa, area:indexing] [status:TODO] [priority:medium] [estimate:6h] [start:2026-02-01] [end:2026-02-02]

---

## FEATURE-002: Metadata Fallback API [area:backend] [priority:HIGH]

**Status:** 0% complete (0/5 subtasks done, 13h remaining)  
**Completion %:** 0%  
**Remaining Effort:** 13h

- [ ] Define fallback order (on-chain → cache → placeholder) [labels:type:task, area:backend] [status:TODO] [priority:high] [estimate:2h] [start:2026-01-20] [end:2026-01-20]
- [ ] Implement metadata validation + TTL [labels:type:feature, area:backend, area:security] [status:TODO] [priority:high] [estimate:4h] [start:2026-01-21] [end:2026-01-22]
- [ ] Add integrity checks (format, size limits) [labels:type:task, area:backend, area:security] [status:TODO] [priority:high] [estimate:3h] [start:2026-01-23] [end:2026-01-23]
- [ ] Implement cache layer + refresh strategy [labels:type:feature, area:backend] [status:TODO] [priority:medium] [estimate:3h] [start:2026-01-24] [end:2026-01-25]
- [ ] Test with simulated IPFS timeout [labels:type:qa, area:backend] [status:TODO] [priority:high] [estimate:2h] [start:2026-01-26] [end:2026-01-26]

---

## FEATURE-003: Observability & UI Consistency [area:backend, area:indexing] [priority:MEDIUM]

**Status:** 0% complete (0/4 subtasks done, 18h remaining)  
**Completion %:** 0%  
**Remaining Effort:** 18h

- [ ] Structured logs for event gaps + timing [labels:type:task, area:backend, area:indexing] [status:TODO] [priority:medium] [estimate:4h] [start:2026-01-20] [end:2026-01-21]
- [ ] Metrics collection (events/sec, latency, errors) [labels:type:feature, area:backend] [status:TODO] [priority:medium] [estimate:6h] [start:2026-01-22] [end:2026-01-24]
- [ ] Proposals visible in UI within SLA (post-finality) [labels:type:qa, area:indexing, area:frontend] [status:TODO] [priority:high] [estimate:4h] [start:2026-01-27] [end:2026-01-28]
- [ ] Plugin removed state handling (avoid stale data) [labels:type:feature, area:backend, area:indexing] [status:TODO] [priority:high] [estimate:4h] [start:2026-01-29] [end:2026-01-30]

---

## FEATURE-004: Native-Token Support [area:backend, area:indexing] [priority:HIGH]

**Status:** 0% complete (0/4 subtasks done, 24h remaining)  
**Completion %:** 0%  
**Remaining Effort:** 24h

- [ ] RPC-based power provider (wallet + staked balance) [labels:type:feature, area:backend, area:indexing] [status:TODO] [priority:high] [estimate:12h] [start:2026-01-28] [end:2026-01-30]
- [ ] Native-token execution marking in events [labels:type:task, area:indexing, area:backend] [status:TODO] [priority:high] [estimate:4h] [start:2026-02-02] [end:2026-02-02]
- [ ] Cache power computation results [labels:type:optimization, area:backend] [status:TODO] [priority:medium] [estimate:4h] [start:2026-02-03] [end:2026-02-03]
- [ ] Integration + performance testing [labels:type:qa, area:backend] [status:TODO] [priority:high] [estimate:4h] [start:2026-02-04] [end:2026-02-04]

---

## TASK-001: Testing & Quality Assurance [area:backend, area:testing] [priority:HIGH]

**Status:** 0% complete (0/2 subtasks done, 20h remaining)  
**Completion %:** 0%  
**Remaining Effort:** 20h

- [ ] Unit tests for all event handlers [labels:type:test, area:backend, area:testing] [status:TODO] [priority:high] [estimate:12h] [start:2026-01-28] [end:2026-02-02]
- [ ] Integration tests with Harmony testnet [labels:type:test, area:backend, area:testing] [status:TODO] [priority:high] [estimate:8h] [start:2026-02-03] [end:2026-02-05]

---

## TASK-002: Operations & Documentation [area:docs, area:ops] [priority:MEDIUM]

**Status:** 0% complete (0/2 subtasks done, 6h remaining)  
**Completion %:** 0%  
**Remaining Effort:** 6h

- [ ] Operator runbook (sync start block, reindex, rollback) [labels:type:docs, area:ops] [status:TODO] [priority:medium] [estimate:3h] [start:2026-02-20] [end:2026-02-21]
- [ ] API documentation for metadata fallback endpoint [labels:type:docs, area:docs] [status:TODO] [priority:medium] [estimate:3h] [start:2026-02-22] [end:2026-02-23]

---

## Sprint Risks & Mitigations

| Risk | Severity | Mitigation | Owner |
|------|----------|-----------|-------|
| RPC unavailable/non-archive | High | Multiple RPC endpoints + fallback | Backend |
| Reorg edge cases (>10 blocks) | Medium | Extensive reorg testing | Backend |
| IPFS gateway timeout | Medium | 5s timeout + cache fallback | Backend |
| Native-token RPC calls slow | Low | Cache power results | Backend |
| Schedule slippage | Medium | Daily standups + backlog | PM |

---

## Cross-Repository Dependencies

| Dependency | Repository | Target | Owner | ETA |
|-----------|-----------|--------|-------|-----|
| Event schemas | AragonOSX/subgraph | Complete | Contracts | ✅ Ready |
| RPC access | External/Harmony | Stable | Infra | ✅ Ready |
| Frontend API usage | aragon-app | Ready | Frontend | 2026-01-28 |

---

## Weekly Status Update Template

**Week 1 (2026-01-21 to 2026-01-27):**
- FEATURE-001 (Indexing): 25% → TARGET 50%
- FEATURE-002 (Metadata): 0% → TARGET 20%
- FEATURE-003 (Observability): 0% → TARGET 10%
- FEATURE-004 (Native-Token): 0% → TARGET 0% (starts week 2)
- Blockers: RPC endpoint stability testing
- Next week focus: Reorg-safe testing, metadata fallback implementation
- [ ] Mark native-token executions in indexed events [labels:type:task, area:indexing, area:backend] [status:TODO] [priority:medium] [estimate:4h] [start:2026-02-02] [end:2026-02-02]

---

## TASK-001: Testing [area:backend, area:testing] [priority:MEDIUM]

**Description:** Add unit tests for critical event handlers.

- [ ] Unit tests for critical handlers [labels:type:test, area:backend] [status:TODO] [priority:medium] [estimate:6h] [start:2026-01-28] [end:2026-01-29]

---

## TASK-002: Operational Documentation [area:ops, area:docs] [priority:LOW]

**Description:** Produce runbook for sync, reindex, and rollback procedures.

- [ ] Runbook: sync start block, reindex, rollback [labels:type:docs, area:ops] [status:TODO] [priority:low] [estimate:4h] [start:2026-02-05] [end:2026-02-05]

---

## Sprint Status

- **Total items:** 12
- **Completed:** 2
- **In progress:** 0
- **Not started:** 10
- **Completion:** 17%
