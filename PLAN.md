# Plan: Repository Work Plan

This plan is the source of truth for work tracking.

Rules:
- Every checkbox line MUST include tags for labels, status, priority, estimate, start/end dates.
- Subtasks are indented by 2 spaces under their parent.
- Prefer short, action-oriented titles and include a brief description.

## Context: HarmonyVoting Backend Indexing & Reliability

Goal
- Provide reliable indexing and backend APIs for HarmonyVoting:
  - Historical + live event ingestion with reorg safety
  - Backfill and checkpointing strategy
  - Metadata redundancy and validation
  - Native-token voting power provider and execution markers

Related Plans
- ../AragonOSX/PLAN.md — E2E reliability epic
- ../aragon-app/PLAN.md — Frontend UI/UX

## Milestone: Indexing Foundations

- [x] Handlers cover ProposalCreated/VoteCast [labels:type:task, area:backend, area:indexing] [status:DONE] [priority:high] [estimate:6h] [start:2025-12-18] [end:2025-12-19]
- [x] Historical indexing enabled (HarmonyVoting) [labels:type:task, area:indexing, area:backend] [status:DONE] [priority:high] [estimate:4h] [start:2025-12-19] [end:2025-12-20]
- [ ] Reorg-safe handling (confirmations, idempotency, retries) [labels:type:task, area:indexing] [status:TODO] [priority:high] [estimate:12h] [start:2026-01-20] [end:2026-01-22]
- [ ] Catch-up strategy (backfill + checkpointing) [labels:type:task, area:indexing, area:infra] [status:TODO] [priority:high] [estimate:10h] [start:2026-01-22] [end:2026-01-23]
- [ ] Validate indexing scenarios (fresh, mid-history, reorg) [labels:type:qa, area:indexing] [status:TODO] [priority:high] [estimate:12h] [start:2026-01-23] [end:2026-01-25]

## Milestone: Observability & UI Consistency

- [ ] Structured logs/metrics for gaps per event type [labels:type:task, area:backend, area:indexing] [status:TODO] [priority:medium] [estimate:6h] [start:2026-01-20] [end:2026-01-21]
- [ ] Proposals visible on UI shortly after creation (post-finality SLA) [labels:type:qa, area:indexing, area:frontend] [status:TODO] [priority:high] [estimate:4h] [start:2026-01-27] [end:2026-01-27]
- [ ] “Plugin removed” state avoids stale data exposure [labels:type:task, area:backend, area:indexing] [status:TODO] [priority:high] [estimate:8h] [start:2026-01-29] [end:2026-01-29]

## Milestone: Metadata Redundancy

- [ ] Fallback order (on-chain → cache → placeholder) [labels:type:task, area:backend] [status:TODO] [priority:medium] [estimate:3h] [start:2026-01-20] [end:2026-01-20]
- [ ] Validation + TTL (prevent malformed data) [labels:type:task, area:backend] [status:TODO] [priority:medium] [estimate:6h] [start:2026-01-21] [end:2026-01-22]
- [ ] Integrity checks (format, size limits) [labels:type:task, area:backend, area:security] [status:TODO] [priority:medium] [estimate:4h] [start:2026-01-23] [end:2026-01-23]

## Milestone: Native-Token Support

- [ ] Power provider via RPC (wallet + staked) [labels:type:feature, area:backend, area:indexing] [status:TODO] [priority:high] [estimate:12h] [start:2026-01-28] [end:2026-01-30]
- [ ] Mark native-token executions in indexed events [labels:type:task, area:indexing, area:backend] [status:TODO] [priority:medium] [estimate:4h] [start:2026-02-02] [end:2026-02-02]

## Milestone: Tests & Operations

- [ ] Unit tests for critical handlers [labels:type:test, area:backend] [status:TODO] [priority:medium] [estimate:6h] [start:2026-01-28] [end:2026-01-29]
- [ ] Runbook: sync start block, reindex, rollback [labels:type:docs, area:ops] [status:TODO] [priority:low] [estimate:4h] [start:2026-02-05] [end:2026-02-05]

## Milestone: ProjectV2 Schema & Sync

- [ ] Verify .gitissue/metadata.config.json at repo root [labels:type:chore, area:planning] [status:TODO] [priority:low] [estimate:0.5h] [start:2026-01-19] [end:2026-01-19]
- [ ] Capture org project schema to tmp/<org>-project-schema.json [labels:type:task, area:planning] [status:TODO] [priority:low] [estimate:0.5h] [start:2026-01-19] [end:2026-01-19]
- [ ] Generate .gitissue/metadata.generated.json from PLAN.md [labels:type:task, area:planning] [status:TODO] [priority:low] [estimate:0.5h] [start:2026-01-19] [end:2026-01-19]
- [ ] Prepare gh issue create/edit commands for project sync (request approval before running) [labels:type:docs, area:planning] [status:TODO] [priority:low] [estimate:0.5h] [start:2026-01-19] [end:2026-01-19]
- [ ] Document workaround for PARENT_ISSUE field limitation in GitHub ProjectV2 (manual UI linking or UI automation) [labels:type:docs, area:planning] [status:TODO] [priority:low] [estimate:0.5h] [start:2026-01-19] [end:2026-01-19]
