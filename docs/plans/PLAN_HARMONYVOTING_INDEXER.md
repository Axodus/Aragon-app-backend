# [PLAN] HarmonyVoting Indexer & Backend Fixes

**Repository:** Aragon-app-backend (Axodus/Aragon-app-backend)  
**Slug:** `PLAN-HarmonyVotingBE`  
**Related:** [PLAN-HarmonyVoting (Contracts)](../../../osx-plugin-foundry/docs/plans/PLAN_HARMONYVOTING_FIXES.md)  
**End Date Goal:** 2026-02-15  
**Priority:** HIGH  
**Estimative Hours:** 24h  
**Status:** IN_PROGRESS

---

## Executive Summary

This plan addresses backend/indexer issues affecting HarmonyVoting plugins. The main problems are: proposals not being indexed, validator/delegator data not persisted, and missing API endpoints for HarmonyVoting-specific queries.

### Problem Summary (Backend Scope)

| Issue | Symptom | Root Cause Hypothesis |
|-------|---------|----------------------|
| Proposals not indexed | Created on-chain but not in DB | Missing event handlers for HarmonyVoting |
| Validator data missing | Not shown in frontend | Not persisted during install indexing |
| Delegators not listed | Empty list in UI | No aggregation logic for delegation events |
| Token counts absent | Zero/null displayed | Power calculation not implemented |

---

## Hierarchy Overview

```
[PLAN] HarmonyVoting Indexer & Backend Fixes (this document)
├── [PLAN-HarmonyVotingBE | SPRINT-001] Diagnosis & Schema Audit
│   ├── TASK-001: Audit proposal model for HarmonyVoting support
│   ├── TASK-002: Check indexer event handlers
│   └── TASK-003: Review API endpoints for proposal queries
└── [PLAN-HarmonyVotingBE | SPRINT-002] Implementation & Backfill
    ├── BUG-001: Add HarmonyVoting proposal indexing
    ├── BUG-002: Index validator configuration events
    ├── TASK-001: Add delegation tracking
    ├── TASK-002: Fix TypeScript errors in scripts
    ├── TASK-003: Run backfill for historical data
    └── TASK-004: Validation tests
```

---

## Sprints (Linked)

### [PLAN-HarmonyVotingBE | SPRINT-001] Diagnosis & Schema Audit

- [ ] [PLAN-HarmonyVotingBE | SPRINT-001 | TASK-001] Audit proposal model for HarmonyVoting support [key:01JK8BE00001] [status:TODO] [priority:HIGH] [estimate:3h]
- [ ] [PLAN-HarmonyVotingBE | SPRINT-001 | TASK-002] Check indexer event handlers [key:01JK8BE00002] [status:TODO] [priority:HIGH] [estimate:3h]
- [ ] [PLAN-HarmonyVotingBE | SPRINT-001 | TASK-003] Review API endpoints for proposal queries [key:01JK8BE00003] [status:TODO] [priority:HIGH] [estimate:2h]

### [PLAN-HarmonyVotingBE | SPRINT-002] Implementation & Backfill

- [ ] [PLAN-HarmonyVotingBE | SPRINT-002 | BUG-001] Add HarmonyVoting proposal indexing [key:01JK8BE00004] [status:TODO] [priority:URGENT] [estimate:6h]
- [ ] [PLAN-HarmonyVotingBE | SPRINT-002 | BUG-002] Index validator configuration events [key:01JK8BE00005] [status:TODO] [priority:HIGH] [estimate:4h]
- [ ] [PLAN-HarmonyVotingBE | SPRINT-002 | TASK-001] Add delegation tracking [key:01JK8BE00006] [status:TODO] [priority:MEDIUM] [estimate:4h]
- [ ] [PLAN-HarmonyVotingBE | SPRINT-002 | TASK-002] Fix TypeScript errors in scripts [key:01JK8BE00007] [status:TODO] [priority:HIGH] [estimate:2h]
- [ ] [PLAN-HarmonyVotingBE | SPRINT-002 | TASK-003] Run backfill for historical data [key:01JK8BE00008] [status:TODO] [priority:HIGH] [estimate:2h]
- [ ] [PLAN-HarmonyVotingBE | SPRINT-002 | TASK-004] Validation tests [key:01JK8BE00009] [status:TODO] [priority:HIGH] [estimate:2h]

---

## Key Files to Investigate/Modify

```typescript
// Models
src/models/schema/proposal.ts
src/models/schema/plugin.ts
src/models/schema/dao.ts

// Indexer / Jobs
src/jobs/harmonyBackfillJob.ts
src/services/indexer/*

// Scripts
scripts/backfillHarmony.ts
scripts/reindexDaoRegistry.ts

// API
src/controllers/proposalController.ts
src/services/proposalService.ts

// Config
config/contracts/*.ts
```

---

## TypeScript Errors to Fix First

Reference: `TYPESCRIPT_ERRORS_FIX.md`

| File | Error | Fix |
|------|-------|-----|
| `src/models/schema/proposal.ts` | Duplicate identifiers | Remove duplicates |
| `scripts/backfillHarmony.ts` | parseInt for args | Add type conversion |
| `scripts/reindexDaoRegistry.ts` | Enum mismatch | Use NetworksEnum |
| `src/jobs/harmonyBackfillJob.ts` | Type assertions | Add proper typing |

---

## Dependencies

| Dependency | Repo | Status |
|------------|------|--------|
| Setup contracts emit events | osx-plugin-foundry | Required |
| Subgraph provides raw events | AragonOSX | Alternative source |

---

## Progress & Next Steps

- **Status summary:** Iniciado — escopo definido e arquivos-chave identificados; auditoria em andamento.
- **Completed:** Plano criado; lista de arquivos e scripts prioritários mapeada; comandos e integração com Harmony documentados.
- **Next actions:**
  - Concluir `TASK-001` (Audit proposal model for HarmonyVoting support).
  - Revisar e implementar handlers de indexação (target: `BUG-001`).
  - Corrigir erros de TypeScript listados e garantir `npx tsc --noEmit` passa antes dos testes.
  - Implementar backfill em ambiente de teste e validar cobertura histórica.
- **Owners (provisório):** @backend-team — substituir por responsáveis reais.
- **Milestones:**
  - M1 — Diagnosis complete (target: 2026-02-07)
  - M2 — Implementation & Backfill (target: 2026-02-12)
- **Notes:** Priorizar correções de tipagem e cobertura de unidade antes do backfill em produção.


## Harmony API Integration

**Reference:** [HARMONY_API_REFERENCE.md](../../../osx-plugin-foundry/docs/plans/HARMONY_API_REFERENCE.md)

Use the Harmony Node API (https://api.hmny.io/) to fetch validator/delegator data:

| Feature | API Method | Usage |
|---------|------------|-------|
| Get validator info | `hmyv2_getValidatorInformation` | Populate validator details |
| List delegators | `hmyv2_getDelegationsByValidator` | Build delegator list |
| Get user balance | `hmyv2_getBalance` | Calculate voting power |
| Get delegations | `hmyv2_getDelegationsByDelegator` | User's staking info |

### Example Integration

```typescript
// src/services/harmonyApi.ts
import axios from 'axios';

const HARMONY_RPC = 'https://api.harmony.one';

export async function getDelegationsByValidator(validatorAddress: string) {
  const response = await axios.post(HARMONY_RPC, {
    jsonrpc: '2.0',
    method: 'hmyv2_getDelegationsByValidator',
    params: [validatorAddress],
    id: 1,
  });
  return response.data.result;
}

export async function getValidatorInfo(validatorAddress: string) {
  const response = await axios.post(HARMONY_RPC, {
    jsonrpc: '2.0',
    method: 'hmyv2_getValidatorInformation',
    params: [validatorAddress],
    id: 1,
  });
  return response.data.result;
}
```

---

## Commands Reference

```bash
# Install dependencies
pnpm install

# Type check (fix errors first!)
npx tsc --noEmit

# Run API service
pnpm run service:aragon-api

# Run indexer
pnpm run service:aragon-indexer

# Run backfill script
npx ts-node scripts/backfillHarmony.ts --network harmony --from-block <block>

# Run reindex
npx ts-node scripts/reindexDaoRegistry.ts --network harmony

# Tests
pnpm test:unit
```

---

## Definition of Done

- [ ] TypeScript errors fixed (`npx tsc --noEmit` passes)
- [ ] HarmonyVoting proposals indexed
- [ ] Validator data persisted
- [ ] Delegation events tracked
- [ ] Backfill script runs successfully
- [ ] API returns HarmonyVoting proposals
- [ ] Unit tests pass
