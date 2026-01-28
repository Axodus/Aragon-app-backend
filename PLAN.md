# Sprint #2 Plan — Indexing Resilience & Error Recovery

## Goals
- Harden indexer against chain reorgs and downtime.
- Implement connection pooling with RPC failover.
- Add reliable backfill/replay and observability metrics.

## Non-Goals
- No schema-breaking changes to API responses.
- No new indexer data models beyond resilience needs.

## Task Breakdown (Checklist)
- [x] TASK-001: Reorg Tests & Simulation. (Issue #57)
- [x] TASK-002: Connection Pooling & RPC Failover. (Issue #58)
- [x] TASK-003: Backfill & Replay Logic. (Issue #59)
- [x] TASK-004: Observability Metrics & Alerts. (Issue #60)
- [x] TASK-005: Tests, Docs & Migration Scripts. (Issue #61)

## Implementation Steps & Guidelines
1. Build deterministic reorg simulation tests and validate rollback.
2. Implement RPC pool with health checks and automatic failover.
3. Add idempotent backfill and replay logic for gaps.
4. Export metrics and include alert examples.
5. Add tests, update docs, and provide migration/rollback scripts.

## Dependencies & Integration Points
- Ethers v6 provider strategy
- MongoDB models + migration scripts
- Prometheus metrics
- RabbitMQ queues (if used for backfill/replay)

## Acceptance Criteria
- Reorg tests validate rollback behavior reliably.
- RPC pooling fails over automatically under outages.
- Backfill/replay are idempotent and safe after downtime.
- Metrics exported for reorgs, retries, and throughput.
- Tests pass locally and docs are updated.

## Rollout / Validation
- Run reorg test suite in CI and locally.
- Validate pooling under simulated RPC failure.
- Confirm migration/rollback scripts on staging.

## References
- PR #56: Sprint #2 - Indexing Resilience & Error Recovery
- PLAN_SPRINT_2.md: docs/plans/PLAN_SPRINT_2.md
- Admin grant closeout (AragonOSX): tx `0xec054a414b37e912909ed3b571be9d7fd11a320fcdb3004ae39bc4acf346fc47` — runbook in AragonOSX/docs/RUNBOOK_HARMONY_ADMIN_GRANT.md

---

# Plan: BUG-002 Metadata Timeout & Fallback (Backend)

## Goals
- Enforce a hard timeout for metadata fetches.
- Provide safe fallback data when metadata is unavailable.
- Preserve API responsiveness under gateway timeouts.

## Non-Goals
- No schema changes to metadata payloads.
- No new external dependencies.

## Task Breakdown (Checklist)
- [x] BUG-002-BE-001: Add a 5s timeout to metadata fetch (with abort/cancel).
- [x] BUG-002-BE-002: Return a minimal fallback payload when timeout hits.
- [x] BUG-002-BE-003: Add telemetry/log for timeout occurrences.
- [x] BUG-002-BE-004: Add unit test(s) for timeout behavior.

## Implementation Steps & Guidelines
1. Locate metadata fetch in `src/handlers/metadata.handler.ts` and wrap with timeout.
2. Use an abortable request pattern (do not leak in-flight requests).
3. On timeout, return a fallback response with a clear flag or null metadata.
4. Log a structured warning with timeout duration and gateway URL.
5. Add tests to cover timeout + fallback.

## Dependencies & Integration Points
- Frontend fallback UI (aragon-app) should read the fallback output without breaking.

## Acceptance Criteria
- Requests exceeding 5s return a fallback response.
- Metadata timeout does not break proposal card rendering.
- Tests pass locally.
