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

- [x] Handlers cobrem ProposalCreated/VoteCast [labels:type:task, area:backend, area:indexing] [status:DONE] [priority:high] [estimate:6h] [start:2025-12-18] [end:2025-12-19]
- [x] Indexação histórica habilitada (HarmonyVoting) [labels:type:task, area:indexing] [status:DONE] [priority:high] [estimate:4h] [start:2025-12-19] [end:2025-12-20]
- [ ] Reorg-safe handling (confirmações, idempotência, retries) [labels:type:task, area:indexing] [status:TODO] [priority:high] [estimate:12h] [start:2026-01-20] [end:2026-01-22]
- [ ] Estratégia de catch-up (backfill + checkpointing) [labels:type:task, area:indexing, area:infra] [status:TODO] [priority:high] [estimate:10h] [start:2026-01-22] [end:2026-01-23]
- [ ] Validar cenários de indexação (fresh, mid, reorg) [labels:type:qa, area:indexing] [status:TODO] [priority:high] [estimate:12h] [start:2026-01-23] [end:2026-01-25]

## Milestone: Observabilidade & UI Consistência

- [ ] Logs/métricas estruturadas p/ gaps por evento [labels:type:task, area:backend, area:indexing] [status:TODO] [priority:medium] [estimate:6h] [start:2026-01-20] [end:2026-01-21]
- [ ] Propostas visíveis na UI após criação (SLA pós-finalidade) [labels:type:qa, area:indexing, area:frontend] [status:TODO] [priority:high] [estimate:4h] [start:2026-01-27] [end:2026-01-27]
- [ ] Estado "plugin removido" não exibe dados antigos [labels:type:task, area:backend, area:indexing] [status:TODO] [priority:high] [estimate:8h] [start:2026-01-29] [end:2026-01-29]

## Milestone: Metadata Redundancy

- [ ] Fallback order (on-chain → cache → placeholder) [labels:type:task, area:backend] [status:TODO] [priority:medium] [estimate:3h] [start:2026-01-20] [end:2026-01-20]
- [ ] Validação + TTL (evitar dados malformados) [labels:type:task, area:backend] [status:TODO] [priority:medium] [estimate:6h] [start:2026-01-21] [end:2026-01-22]
- [ ] Integrity checks (formato, tamanho) [labels:type:task, area:backend, area:security] [status:TODO] [priority:medium] [estimate:4h] [start:2026-01-23] [end:2026-01-23]

## Milestone: Native-Token Support

- [ ] Power provider via RPC (wallet + staked) [labels:type:feature, area:backend, area:indexing] [status:TODO] [priority:high] [estimate:12h] [start:2026-01-28] [end:2026-01-30]
- [ ] Marcar execuções com native token nos eventos [labels:type:task, area:indexing] [status:TODO] [priority:medium] [estimate:4h] [start:2026-02-02] [end:2026-02-02]

## Milestone: Testes & Operação

- [ ] Unit tests p/ handlers críticos [labels:type:test, area:backend] [status:TODO] [priority:medium] [estimate:6h] [start:2026-01-28] [end:2026-01-29]
- [ ] Runbook: start block, reindex, rollback [labels:type:docs, area:ops] [status:TODO] [priority:low] [estimate:4h] [start:2026-02-05] [end:2026-02-05]
