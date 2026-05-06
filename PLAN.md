## Sprint #2 Plan — Indexing Resilience & Error Recovery (Completed 2026-02-10)

- [x] TASK-001: Reorg Tests & Simulation. (Issue #57) ✅
- [x] TASK-002: Connection Pooling & RPC Failover. (Issue #58) ✅
- [x] TASK-003: Backfill & Replay Logic. (Issue #59) ✅
- [x] TASK-004: Observability Metrics & Alerts. (Issue #60) ✅
- [x] TASK-005: Tests, Docs & Migration Scripts. (Issue #61) ✅

---

## Phase 3 — HIP Voting Integration (Completed 2026-02-10)

- [x] Refined plugin controller to support localized allowlist labeling ✅
- [x] Verified API compatibility with new Harmony plugin variants ✅
- [x] Cleaned up legacy allowlist annotations to prevent global UI leakage ✅

---

# Plan: BUG-002 Metadata Timeout & Fallback (Backend) (Completed 2026-02-10)

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
