---
description: Guidelines for organizing and creating plans in the Aragon-app-backend repository
applyTo: '**'
---

# Plan Organization Guidelines — Aragon-app-backend

This guide establishes the structure, hierarchy, and naming conventions for all plan documents in the Aragon-app-backend repository.

## Directory Structure

All plan documents MUST be saved under `./docs/plans/`.

```
docs/plans/
├── PLAN.md                    # (Optional) High-level quarterly/release plan
├── PLAN_SPRINT_*.md          # Sprint-specific plans
├── SPRINT_*.md               # Sprint overviews
├── EPIC_*.md                 # Epics that span multiple sprints
├── FEATURE_*.md              # Individual features (smaller scope)
├── TASK_*.md                 # Standalone tasks
├── BUG_*.md                  # Bug fixes and patches
├── HOTFIX_*.md               # Emergency/urgent fixes
└── [ARCHIVE]/                # Closed/completed plans (optional)
```

## Hierarchy

The following hierarchy MUST be respected when organizing plans:

```
Level 1: PLAN or EPIC
  ├─ Level 2: SPRINT (optional; groups work within a sprint)
  │   ├─ Level 3: TASK
  │   ├─ Level 3: BUG
  │   ├─ Level 3: FEATURE
  │   └─ Level 3: HOTFIX
  └─ (Or directly Level 2: TASK/BUG/FEATURE/HOTFIX if not sprint-scoped)
```

**Examples:**
- `PLAN-001` (Level 1) → `SPRINT-001` (Level 2) → `TASK-001`, `FEATURE-001` (Level 3)
- `EPIC-001` (Level 1) → no sprint → `FEATURE-001`, `FEATURE-002` (Level 2)
- `HOTFIX-001` (Level 1) → standalone (no sprint/levels)

## Title Breadcrumb Format

Titles MUST follow a breadcrumb format that reflects the hierarchy. The breadcrumb clearly shows the document's position in the tree.

### Format

```
# [Parent Type] | [Intermediate Type] | [Current Type]-NNN - <Title>
```

### Examples

**Example 1: Task under a Sprint under a Plan**
```markdown
# PLAN-001 | SPRINT-001 | TASK-001 - Implement event indexing pipeline
```

**Example 2: Multiple features under an Epic**
```markdown
# EPIC-001 | FEATURE-001 - Add RabbitMQ persistence
# EPIC-001 | FEATURE-002 - Add MongoDB schema versioning
# EPIC-001 | FEATURE-003 - Add Prometheus metrics
```

**Example 3: Sprint with multiple items**
```markdown
# PLAN-001 | SPRINT-001 - Backend Infrastructure Phase
# PLAN-001 | SPRINT-001 | TASK-001 - Set up Docker Compose
# PLAN-001 | SPRINT-001 | TASK-002 - Configure database migrations
# PLAN-001 | SPRINT-001 | FEATURE-001 - Event handler framework
```

**Example 4: Hotfix (standalone)**
```markdown
# HOTFIX-001 - Fix critical indexing lag
```

**Example 5: Bug under a Sprint under a Plan**
```markdown
# PLAN-001 | SPRINT-001 | BUG-001 - Fix memory leak in queue processor
```

## Document Structure

Each plan document MUST follow this structure:

```markdown
# [Breadcrumb] - <Title>

**Repository:** Aragon-app-backend(<OWNER>/<REPO>)  
**End Date Goal:** <date>  
**Priority:** [ LOW | MEDIUM | HIGH | URGENT ]  
**Estimative Hours:** <hours>  
**Status:** [ Backlog | TODO | In Progress | In Review | Done ]

---

## Executive Summary

Brief 1-2 sentence description of scope, objectives, and expected outcomes.

---

## Subtasks (Linked)

[Checklist with [key:<ULID>] and metadata tags]

---

## Milestones

[Timeline and key deliverables]
```

## Canonical Identity & Dedupe

Every actionable checklist item MUST include a canonical key tag to prevent duplicate GitHub issues:

```markdown
- [ ] <Task title> [key:<ULID>] [labels:type:task, area:<area>] [status:TODO] [priority:MEDIUM] [estimate:4h] [start:YYYY-MM-DD] [end:YYYY-MM-DD]
```

**Generating ULIDs:**
- Use `gitissuer rekey --repo axodus/Aragon-app-backend --dry-run` to preview key injection.
- Use `gitissuer rekey --repo axodus/Aragon-app-backend --confirm` to inject missing keys.

## GitHub Issue Title Format

When syncing to GitHub via `gitissuer`, issue titles are generated as breadcrumbs **without** the `-NNN` suffix:

```
[PLAN / SPRINT / TASK] - Implement event indexing pipeline
```

The `-NNN` numbering remains in Markdown to keep the document structured and searchable.

## Naming Conventions

- **File names:** `<TYPE>_<CONTEXT>.md`
  - Examples: `PLAN.md`, `SPRINT_1.md`, `FEATURE_indexing.md`, `BUG_lag.md`
- **Heading IDs:** `<TYPE>-NNN`
  - Examples: `PLAN-001`, `SPRINT-001`, `TASK-001`, `FEATURE-001`
- **Keys:** ULID (26 chars, time-sortable)
  - Examples: `01KFRBTZSPJTN6GNH4YKG3DMJP`

## Workflow: Create → Sync → Update

1. **Draft locally** in `./docs/plans/` following the structure above.
2. **Inject keys** (if not already present):
   ```bash
   gitissuer rekey --repo axodus/Aragon-app-backend --dry-run   # Preview
   gitissuer rekey --repo axodus/Aragon-app-backend --confirm   # Apply
   ```
3. **Prepare engine input:**
   ```bash
   gitissuer prepare --repo axodus/Aragon-app-backend
   ```
4. **Dry-run sync to GitHub:**
   ```bash
   gitissuer sync --repo axodus/Aragon-app-backend --dry-run
   ```
5. **Confirm sync to GitHub** (after approval):
   ```bash
   gitissuer sync --repo axodus/Aragon-app-backend --confirm
   ```

## Example: Complete Sprint Plan

```markdown
# PLAN-001 | SPRINT-001 - Indexing Resilience Phase [key:01KFRBTZSPJTN6GNH4YKG3DMJP]

**Repository:** Aragon-app-backend(Axodus/Aragon-app-backend)  
**End Date Goal:** 2026-02-07  
**Priority:** HIGH  
**Estimative Hours:** 80  
**Status:** In Progress

---

## Executive Summary

Build a resilient event indexing pipeline that handles blockchain reorgs, ensures data consistency, and provides real-time data to frontend consumers. This sprint covers reorg-safe handlers, database migrations, and monitoring infrastructure.

---

## Subtasks (Linked)

### PLAN-001 | SPRINT-001 | TASK-001: Set up monitoring [key:01KFRBTZSQ29H26YN4D4T1T1X7]

- [x] Configure Prometheus metrics [labels:type:task, area:infra] [status:DONE] [priority:HIGH] [estimate:6h] [start:2026-01-20] [end:2026-01-21]
- [ ] Deploy Grafana dashboards [labels:type:task, area:infra] [status:TODO] [priority:HIGH] [estimate:4h] [start:2026-01-21] [end:2026-01-22]

### PLAN-001 | SPRINT-001 | FEATURE-001: Reorg-safe handlers [key:01KFRBTZSQ29H26YN4D4T1T1X8]

- [ ] Implement confirmation logic [labels:type:feature, area:indexing] [status:TODO] [priority:HIGH] [estimate:12h] [start:2026-01-21] [end:2026-01-23]
- [ ] Add idempotency keys [labels:type:feature, area:indexing] [status:TODO] [priority:HIGH] [estimate:8h] [start:2026-01-23] [end:2026-01-25]
- [ ] Add retry mechanism [labels:type:feature, area:indexing] [status:TODO] [priority:MEDIUM] [estimate:6h] [start:2026-01-25] [end:2026-01-26]

### PLAN-001 | SPRINT-001 | BUG-001: Fix indexing lag [key:01KFRBTZSQ29H26YN4D4T1T1X9]

- [ ] Optimize batch processing [labels:type:bug, area:indexing] [status:TODO] [priority:HIGH] [estimate:10h] [start:2026-01-21] [end:2026-01-23]

---

## Milestones

- **Milestone 1: Monitoring Ready** — 2026-01-22 (TASK-001 + infrastructure)
- **Milestone 2: Reorg Handlers** — 2026-01-26 (confirmation + idempotency)
- **Milestone 3: Performance** — 2026-01-27 (BUG-001 resolved)
- **Sprint Complete** — 2026-02-07
```

## Tips & Best Practices

1. **Keep breadcrumbs readable:** Use `|` as a separator, not `:` or `→`, for consistency.
2. **Nest checklists logically:** Level 2 and Level 3 items should live under their parent headings.
3. **Use metadata tags:** Always include `[labels:...]`, `[status:...]`, `[priority:...]`, `[estimate:...]` for better tracking.
4. **Link across documents:** If a FEATURE-001 depends on TASK-001 in another sprint, reference it explicitly (e.g., "Depends on PLAN-001 | SPRINT-001 | TASK-001").
5. **Archive completed plans:** Move closed plans to `./docs/plans/[ARCHIVE]/` after sync and completion.
6. **Review before sync:** Always run `gitissuer sync --dry-run` and review the output before confirming.

---

**Version:** 1.0  
**Last Updated:** 2026-01-25  
**Maintainer:** Morpheus (Global Planning Agent)
