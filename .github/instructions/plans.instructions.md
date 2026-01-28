---
description: Agent instructions for generating plan documents with proper hierarchy
applyTo: '**'
---

# Plan Generation Instructions — Aragon-app-backend

This guide instructs the agent on how to generate plan documents following the canonical hierarchy.

## Directory Structure

All plan documents MUST be saved under `./docs/plans/`.

```
docs/plans/
├── PLAN_*.md                  # Parent issue documents (PAI)
├── EPIC_*.md                  # Parent issue documents (PAI)
├── SPRINT_*.md               # Sprint execution units
├── TASK_*.md                 # Task work units
├── BUG_*.md                  # Bug fixes
├── FEATURE_*.md              # Feature implementations
├── HOTFIX_*.md               # Urgent fixes
└── [ARCHIVE]/                # Closed/completed plans
```

## Issue Hierarchy

```
Level 1: PAI (Parent Issues) — No numeric suffix
├── [PLAN] Title     ← Full project/release roadmap
└── [EPIC] Title     ← Cross-functional feature set

Level 2: SPRINT — Under PAI
└── [<PLAN_SLUG> | SPRINT-XXX] Title    ← Execution unit with grouped tasks

Level 3: Work Units — Under SPRINT
├── [<PLAN_SLUG> | SPRINT-XXX | TASK-NNN] Title
├── [<PLAN_SLUG> | SPRINT-XXX | BUG-NNN] Title
├── [<PLAN_SLUG> | SPRINT-XXX | FEATURE-NNN] Title
└── [<PLAN_SLUG> | SPRINT-XXX | HOTFIX-NNN] Title
```

## CRITICAL: Slug Generation

The agent MUST auto-generate `<PLAN_SLUG>` from the parent (PLAN/EPIC) title:

1. Remove special characters (except hyphens)
2. Remove stop words (the, a, an, of, for, to, with, and, or)
3. Convert to PascalCase
4. Truncate to max 20 characters
5. Prefix with document type (`PLAN-` or `EPIC-`)

**Examples:**
| Title | Generated Slug |
|-------|----------------|
| `HarmonyVoting Production Rollout` | `PLAN-HarmonyVoting` |
| `Production-Ready Indexing System` | `EPIC-IndexingSystem` |
| `Q1 2026 Infrastructure Upgrade` | `PLAN-Q1InfraUpgrade` |

## Title Format Rules

### Level 1: Parent Issues (PAI)

**NO numeric suffix.** Title format:
```
[PLAN] <Title>
[EPIC] <Title>
```

### Level 2: SPRINT

Uses parent slug + sprint number:
```
[<PLAN_SLUG> | SPRINT-XXX] <Sprint Title>
```

### Level 3: Work Units

Uses parent slug + sprint + type + number:
```
[<PLAN_SLUG> | SPRINT-XXX | <TYPE>-NNN] <Task Title>
```

Where `<TYPE>` is one of: `TASK`, `BUG`, `FEATURE`, `HOTFIX`

## Content Requirements

### PAI (PLAN/EPIC) — Level 1

The body MUST contain:
- Full detailed scope and objectives
- Executive summary
- Hierarchy overview diagram
- All SPRINTs listed with their tasks
- Milestones and timeline
- Risks and mitigations

### SPRINT — Level 2

The body MUST contain:
- Link to parent PAI
- Sprint goals
- Execution instructions for tasks
- Grouped tasks with status tracking
- Acceptance criteria

### Work Units (TASK/BUG/FEATURE/HOTFIX) — Level 3

The body MUST contain:
- Link to parent SPRINT
- Brief technical summary (2-4 paragraphs max)
- Acceptance criteria
- Implementation notes

## Linking Rules

The agent MUST use BOTH methods to link children to parents:

### 1. GitHub Task List (in parent issue body)

```markdown
- [ ] #<!-- issue --> [PLAN-HarmonyVoting | SPRINT-001 | TASK-001] Configure Prometheus
```

### 2. Parent Reference (in child issue body)

```markdown
**Parent:** [PLAN-HarmonyVoting | SPRINT-001](#<!-- issue -->)
```

## Key Tags (Dedupe)

Every checklist item MUST include `[key:<ULID>]` for canonical identity:

```markdown
- [ ] Task title [key:<ULID>] [labels:type:task, area:<area>] [status:TODO] [priority:MEDIUM] [estimate:4h]
```

## Language Requirements

**ALL content MUST be in English:**
- Issue titles, bodies, comments, labels, milestones

---

**Version:** 2.0  
**Last Updated:** 2026-01-28
