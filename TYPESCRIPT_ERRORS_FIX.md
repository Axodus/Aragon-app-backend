# TypeScript Errors Remediation Plan

**Repository:** Aragon-app-backend  
**End Date Goal:** 2026-02-08 (Sprint #3 planning)  
**Priority:** HIGH (blocks CI/CD, impacts developer experience)  
**Estimative Hours:** 12-16 hours (distributed across 4 phases)  
**Status:** DRAFT - Awaiting approval

---

## Executive Summary

**Current State:**
- 17 TypeScript compilation errors blocking full build validation
- Errors span across 8 files: library code, scripts, helpers, jobs, and data models
- **1 CRITICAL error**: Duplicate property definitions in `proposal.ts` (logIndex, transactionIndex, eventType)
- Sprint #2 backend code is clean (0 errors); pre-existing code needs remediation

**Impact:**
- ❌ Cannot run `npx tsc --noEmit` without errors
- ❌ CI/CD pipelines may fail on strict type checking
- ❌ Developer experience degraded by error noise
- ⚠️ Type safety not enforced (especially problematic for new contributions)

**Recommended Approach:**
1. **Phase 1 (P0)**: Fix CRITICAL duplicate identifiers in `proposal.ts` (2-3 hours)
2. **Phase 2 (P1)**: Fix scripts with type mismatches (4-5 hours)
3. **Phase 3 (P2)**: Fix helper and job TypeScript violations (3-4 hours)
4. **Phase 4 (External)**: Coordinate with ethers.js maintainers for Buffer typing issue

**Success Criteria:**
- ✅ `npx tsc --noEmit` returns 0 errors
- ✅ All tests pass (unit + integration)
- ✅ No type assertions removed (maintain safety)
- ✅ Code review approved by 2+ engineers

---

## Detailed Error Analysis

### PHASE 1: CRITICAL (Duplicate Identifiers)

#### ❌ src/models/schema/proposal.ts (3 errors)

**Error Details:**
```
Line 265: Duplicate identifier 'logIndex'
Line 268: Duplicate identifier 'transactionIndex'
Line 271: Duplicate identifier 'eventType'
```

**Root Cause Analysis:**
- Properties defined twice in Mongoose schema class
- Likely copy-paste error during schema refactoring
- Causes TypeScript to reject schema as invalid

**Fix Strategy:**
- Review schema definition to identify which definition is correct
- Verify against database migration history
- Check if one set is deprecated/should be removed
- Update corresponding interfaces if needed
- Run schema validation tests

**Effort:** 2-3 hours  
**Risk:** HIGH - Schema changes can affect data persistence  
**Rollback:** Git revert + MongoDB schema inspection

**Sub-tasks:**
- [ ] Read full Proposal schema (lines 250-350) to understand structure
- [ ] Check git history for duplicate property introduction
- [ ] Verify MongoDB collections for actual field usage
- [ ] Determine which definition to keep (or if both needed with different names)
- [ ] Update TypeScript interfaces to match
- [ ] Run unit tests for Proposal model
- [ ] Document decision in SCHEMA_CHANGES.md

---

### PHASE 2: HIGH-PRIORITY (Scripts & Type Mismatches)

#### ❌ scripts/backfillHarmony.ts (1 error)

**Error Details:**
```
Line 121: Type 'string | number | undefined' not assignable to 'number | undefined'
  endBlock: args.to
```

**Root Cause:**
- CLI argument parser returns string for numeric input
- BackfillConfig expects number type
- Missing type conversion

**Fix Strategy:**
```typescript
// Before:
endBlock: args.to  // string from CLI args

// After:
endBlock: args.to ? parseInt(args.to, 10) : undefined  // Convert to number
```

**Effort:** 0.5 hours  
**Risk:** LOW  
**Rollback:** Git revert

**Sub-tasks:**
- [ ] Review backfillHarmony.ts args parsing (lines 100-130)
- [ ] Add parseInt() conversion for numeric arguments
- [ ] Test with sample args: `yarn backfill:harmony --from 100 --to 200`
- [ ] Verify backfill works end-to-end

---

#### ❌ scripts/reindexDaoRegistry.ts (3 errors)

**Error Details:**
```
Line 185: args.network is string, expects NetworksEnum
Line 190: Cannot assign string to NetworksEnum
Line 197: logService string literal not assignable to LogServicePattern
```

**Root Cause:**
- CLI args are strings, but functions expect enums
- Missing enum lookup/conversion
- Service name doesn't match LogServicePattern template

**Fix Strategy:**
```typescript
// Before:
network: args.network  // string from CLI

// After:
const network = Object.values(NetworksEnum).find(n => n === args.network)
if (!network) throw new Error(`Invalid network: ${args.network}`)
const logService = `${ConfigIndexerHelper.builders.indexer(network)}-dao-replay` as const
```

**Effort:** 1.5 hours  
**Risk:** MEDIUM - Enum mismatch can cause runtime errors  
**Rollback:** Git revert

**Sub-tasks:**
- [ ] Review CLI argument parsing for network parameter (lines 160-180)
- [ ] Add validation: check args.network against NetworksEnum values
- [ ] Verify service name matches LogServicePattern format (`indexer-${network}`)
- [ ] Test with sample args: `yarn reindex:dao --network harmonyMainnet`
- [ ] Check database for DAO registry changes

---

#### ❌ scripts/approve-plugin-access.ts (1 error)

**Error Details:**
```
Line 38: Assertions require explicit type annotation
  validateArgs(args)
  
Line 20: Function needs explicit type annotation
  const validateArgs = (args: ArgsMap): asserts args is ArgsMap & Record<RequiredArg, string>
```

**Root Cause:**
- TypeScript 4.7+ requires explicit return type for assertion functions
- Function signature missing explicit return type

**Fix Strategy:**
```typescript
// Before:
const validateArgs = (args: ArgsMap): asserts args is ArgsMap & Record<RequiredArg, string> => {
  // ...
}

// After:
const validateArgs = (args: ArgsMap): asserts args is ArgsMap & Record<RequiredArg, string> & { 
  field1: string; 
  field2: string; 
  // ... all required fields
} => {
  // ...
}
```

**Effort:** 0.5 hours  
**Risk:** LOW  
**Rollback:** Git revert

**Sub-tasks:**
- [ ] Review approval script logic (lines 15-45)
- [ ] Add explicit type annotation to validateArgs function
- [ ] Test approval flow: `yarn plugin:approve --args`
- [ ] Verify no runtime type errors

---

### PHASE 3: MEDIUM-PRIORITY (Helpers & Jobs)

#### ❌ src/helpers/reorgDetection.ts (2 errors)

**Error Details:**
```
Line 31: Type 'string' not assignable to NetworksEnum
  Web3Helper.getBlock(blockNumber, network)
  
Line 51: Type 'string | null' not assignable to 'string | undefined'
  actualHash: currentHash
```

**Root Cause:**
- Function receives string but expects NetworksEnum
- ethers.js returns null; interface expects undefined (type mismatch)

**Fix Strategy:**
```typescript
// Error 1: Add type guard/conversion
const networkEnum = Object.values(NetworksEnum).find(n => n === network)
if (!networkEnum) throw new Error(`Invalid network: ${network}`)
const currentBlock = await Web3Helper.getBlock(blockNumber, networkEnum)

// Error 2: Handle null → undefined conversion
actualHash: currentHash ?? undefined  // Convert null to undefined
```

**Effort:** 1 hour  
**Risk:** MEDIUM - Reorg detection is critical path  
**Rollback:** Git revert + RPC cache invalidation

**Sub-tasks:**
- [ ] Review reorgDetection.ts function signatures (lines 20-60)
- [ ] Add NetworksEnum validation before calling Web3Helper
- [ ] Convert null values to undefined in return objects
- [ ] Run reorg detection tests to verify behavior unchanged
- [ ] Test with real reorg scenario on testnet

---

#### ❌ src/jobs/harmonyBackfillJob.ts (6 errors)

**Error Details:**
```
Line 89, 136: Type 'string' not assignable to NetworksEnum
  network: string
  
Line 95, 142: LogServicePattern mismatch
  logService: 'harmony-backfill-proposals' (should be `indexer-${network}`)
  
Line 108, 155: Type 'readonly [...]' not assignable to 'any[]'
  abi: HarmonyVotingPlugin.abi
```

**Root Cause:**
- Job handler receives string network, needs enum
- Hard-coded service names don't match LogServicePattern template format
- ABI is readonly array from artifact import; interface expects mutable array

**Fix Strategy:**
```typescript
// Error 1 & 2: Fix network and service naming
const networkEnum = NetworksEnum.harmonyMainnet  // Use enum constant
const logService = `indexer-${networkEnum}` as const  // Use template format

// Error 3: Convert readonly array to mutable
abi: [...HarmonyVotingPlugin.abi] as any[]  // Spread to mutable array
```

**Effort:** 2 hours  
**Risk:** MEDIUM - Backfill job is core indexing feature  
**Rollback:** Git revert + checkpoint reset

**Sub-tasks:**
- [ ] Review harmonyBackfillJob.ts structure (lines 80-160)
- [ ] Replace hard-coded network strings with NetworksEnum values
- [ ] Update service names to match `indexer-${network}` pattern
- [ ] Convert ABI imports to mutable arrays (spread operator)
- [ ] Run backfill job unit tests
- [ ] Test backfill with Harmony testnet

---

### PHASE 4: EXTERNAL (Third-Party Library)

#### ❌ node_modules/ethers/src.ts/providers/provider-ipcsocket.ts (1 error)

**Error Details:**
```
Line 60: Type 'Buffer<ArrayBufferLike>' not assignable to 'Buffer<ArrayBuffer>'
  response = remaining
```

**Root Cause:**
- ethers.js v6 has Buffer type incompatibility with TypeScript 5.x
- SharedArrayBuffer vs ArrayBuffer type mismatch
- External library issue, not project code

**Fix Strategy (Options):**

**Option A (Preferred):** Downgrade ethers.js to compatible version
```json
// package.json
"ethers": "^5.7.2"  // LTS version with better TS support
```

**Option B:** Update TypeScript compiler options
```json
// tsconfig.json
"skipLibCheck": true  // Skip type checking in node_modules
```

**Option C:** Wait for ethers.js v7 release with better TS support

**Effort:** 1-2 hours (including testing)  
**Risk:** HIGH - Version changes can cause API breaking changes  
**Rollback:** `yarn install` with original package-lock.json version

**Recommendation:** Option B (skipLibCheck) as interim solution; plan v6 → v7 migration for next sprint

**Sub-tasks:**
- [ ] Verify ethers.js version compatibility matrix (TS 5.x requirements)
- [ ] Check if downgrade to ethers v5 breaks any Sprint #2 code
- [ ] Evaluate Option B: Enable skipLibCheck in tsconfig.json
- [ ] Test all services with ethers version change
- [ ] Plan ethers.js v7 upgrade for future sprint

---

## Implementation Timeline

```
PHASE 1 (Days 1-2): Critical Duplicate Identifiers
├─ Mon: Analyze proposal.ts schema (2-3 hours)
├─ Tue: Fix duplicates + test (1-2 hours)
└─ Tue PM: Code review + merge

PHASE 2 (Days 3-4): Script Type Fixes
├─ Wed: Fix backfillHarmony, reindexDaoRegistry, approve-plugin-access (3 hours)
├─ Wed PM: Integration testing (1 hour)
└─ Thu: Code review + merge

PHASE 3 (Days 5-6): Helper & Job Type Fixes
├─ Thu PM: Fix reorgDetection, harmonyBackfillJob (2-3 hours)
├─ Fri: Integration testing with Harmony testnet (2 hours)
└─ Fri PM: Code review + merge

PHASE 4 (Days 7+): External Library Issue
├─ Option B: Enable skipLibCheck (0.5 hours)
├─ Option A: Evaluate ethers.js downgrade (2 hours analysis)
└─ Decision point: Document choice in TECHNICAL_DEBT.md
```

---

## Risk Assessment

| Phase | Risk Level | Mitigation | Rollback Time |
|-------|-----------|-----------|--------------|
| 1: Duplicates | HIGH | Schema validation tests before merge | 5 min (git revert) |
| 2: Scripts | MEDIUM | CLI arg parsing unit tests | 5 min |
| 3: Helper/Job | HIGH | Testnet integration tests | 10 min (if bad) |
| 4: External | HIGH | Version compatibility testing | 15 min (package update) |

**Overall Risk:** HIGH - requires careful testing, especially phases 1 & 3

---

## Success Criteria

- [ ] `npx tsc --noEmit` returns 0 errors across entire codebase
- [ ] All unit tests pass: `yarn test:unit`
- [ ] All integration tests pass: `yarn test:unit-dep`
- [ ] CI/CD pipeline succeeds without warnings
- [ ] Code review approved by 2+ engineers
- [ ] No type assertions added (e.g., `as any`)
- [ ] Documentation updated: TECHNICAL_DEBT.md includes decisions

---

## Dependencies & Blockers

**Blocking Sprint #2 Deployment?** NO
- Sprint #2 code is clean (0 TypeScript errors)
- Pre-existing errors do not affect new features
- Recommendation: Deploy Sprint #2 separately; schedule error fixes for Sprint #3

**Dependencies:**
- Phase 1 (Duplicates) must complete before Phase 3 (Job fixes)
- Phase 4 (External) can proceed in parallel with others

**Known Issues:**
- Proposal.ts schema migration may require database schema inspection
- harmonyBackfillJob.ts changes require Harmony testnet validation
- ethers.js version change requires comprehensive integration testing

---

## Acceptance Criteria

✅ **Definition of Done:**
1. All TypeScript errors resolved (tsc returns 0)
2. Unit test coverage maintained >70%
3. Integration tests on Harmony testnet pass
4. Code review approved and merged
5. No regressions in existing functionality
6. Documentation updated with decisions made
7. Team notified of changes via PR description

---

## Rollback Plan

**If Phase 1 fails:** Revert proposal.ts to previous version, investigate schema migration history
**If Phase 2 fails:** Revert script changes, verify CLI argument parsing tests
**If Phase 3 fails:** Revert helper/job changes, run full Harmony testnet validation
**If Phase 4 fails:** Revert ethers.js version, re-enable skipLibCheck as fallback

**Estimated Rollback Time:** 5-15 minutes per phase (git revert + yarn install)

---

## Related Documents

- [Sprint #2 Completion](./PLAN.md) - Backend resilience implementation (completed)
- [Deployment Checklist](./docs/DEPLOYMENT_CHECKLIST.md) - Production readiness
- [Rollback Procedures](./docs/ROLLBACK_PROCEDURES.md) - Emergency recovery

---

## Approval & Sign-Off

**Status:** DRAFT - Awaiting user approval

**Required Approvals:**
- [ ] User: Approve plan approach (Phase priorities, timeline)
- [ ] Backend Lead: Risk assessment & testing strategy
- [ ] Devops: CI/CD impact analysis
- [ ] Tech Lead: Architecture implications

**Next Steps:**
1. User reviews plan and provides feedback
2. Create GitHub issue from approved plan
3. Add to Sprint #3 backlog with time estimates
4. Begin Phase 1 implementation upon approval

