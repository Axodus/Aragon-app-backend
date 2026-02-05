# [HOTFIX] Harmony ABI Fetch — Unable to retrieve ABI

**Slug:** `HOTFIX-HarmonyABI`  
**Priority:** URGENT  
**Estimated Total:** 6h  
**Status:** DRAFT  
**Created:** 2026-02-05  
**Repositories:** `Aragon-app-backend`

---

## Executive Summary

Users cannot interact with smart contracts on Harmony network via the frontend Action Composer. The error "Unable to retrieve ABI" appears when adding contract addresses, even though the Harmony Explorer API returns ABI data correctly when queried directly with `action=getabi`.

**Root Cause Analysis:**

1. **Backend Issue #1 — `evmExplorerClient.ts`**: The `getsourcecode` action returns ABI but with empty `SourceCode`. The current fallback with `getabi` was added but may not be triggering correctly.

2. **Backend Issue #2 — `contractInfo.ts`**: Line 41 has a guard `!contractDetails[0].SourceCode` that returns `null` when SourceCode is empty — but the `getabi` fallback intentionally returns empty SourceCode. This blocks ABI recovery.

3. **Backend Issue #3 — parseNetspec dependency**: Even when ABI is present, `parseNetspec()` is called with empty SourceCode, which may fail silently.

---

## Affected User Flow

```
User Action → Frontend → Backend API → Explorer API → Response
─────────────────────────────────────────────────────────────
1. User clicks "Add contract address" in Action Composer
2. Frontend calls: GET /v2/contract/harmony-mainnet/0xa787...aDeC
3. Backend calls: ProxyWeb3Provider.fetchContractSourceCode()
4. Explorer returns: { status: "1", result: "[ABI...]" } via getabi
5. Backend returns: null (blocked by SourceCode check)
6. Frontend shows: "Unable to retrieve ABI"
```

---

## Technical Diagnosis

### Test Evidence

```bash
# Direct API call to Harmony Explorer — WORKS
curl -s "https://explorer.harmony.one/api?module=contract&action=getabi&address=0xa7872b2159521c96d53eddd9c123843953c3adec&apikey=one" | jq .
# Returns: { "status": "1", "message": "OK", "result": "[{...ABI...}]" }

# getsourcecode also returns ABI but SourceCode is empty
curl -s "https://explorer.harmony.one/api?module=contract&action=getsourcecode&address=0xa7872b2159521c96d53eddd9c123843953c3adec&apikey=one" | jq .
# Returns: { "status": "1", "result": [{ "SourceCode": "", "ABI": "[{...}]", "ContractName": "" }] }
```

### Code Flow Analysis

```
src/services/aragon-api/routers/v1/contract.ts
  └─ ContractRouter.getDetails()
      └─ src/services/aragon-gateway/contractInfo.ts
          └─ ContractInfo.getContractInfo()
              └─ ContractInfo.fetchVerifiedContractData()
                  └─ ProxyWeb3Provider.fetchContractSourceCode()
                      └─ src/modules/proxyProvider/web3Provider.ts
                          └─ evmExplorerClient.fetchContractSourceCode()
                              └─ [ISSUE] Returns ABI but SourceCode=""
                  └─ [ISSUE] Guard: if (!contractDetails[0].SourceCode) return null
                  └─ parseNetspec(SourceCode, ...) ← requires SourceCode
```

---

## Fix Strategy

### Fix #1: `evmExplorerClient.ts` — Fallback already added ✅

The `getabi` fallback was added but returns:
```typescript
{
  SourceCode: '',
  ContractName: '',
  ABI: abiResponse.result,
  CompilerVersion: '',
}
```

This is correct behavior. No changes needed here.

### Fix #2: `contractInfo.ts` — Remove SourceCode requirement

**Current (broken):**
```typescript
if (!contractDetails?.length || !contractDetails[0].SourceCode) return null
```

**Proposed (fixed):**
```typescript
if (!contractDetails?.length) return null
// SourceCode may be empty when only ABI is available (e.g., getabi fallback)
const hasABI = contractDetails[0].ABI && contractDetails[0].ABI !== '[]'
if (!contractDetails[0].SourceCode && !hasABI) return null
```

### Fix #3: `contractInfo.ts` — Handle ABI-only parsing

When SourceCode is empty but ABI exists, skip NatSpec parsing and use raw ABI directly.

**Current:**
```typescript
const parsed = ContractNetspecHelper.parseNetspec(
  contractDetails[0].SourceCode,
  contractDetails[0].ContractName,
  JSON.parse(contractDetails[0].ABI || '[]'),
  contractDetails[0].CompilerVersion,
)
```

**Proposed:**
```typescript
const abi = JSON.parse(contractDetails[0].ABI || '[]')

// If SourceCode is available, enrich ABI with NatSpec comments
// Otherwise, use raw ABI (no NatSpec enrichment)
const parsed = contractDetails[0].SourceCode
  ? ContractNetspecHelper.parseNetspec(
      contractDetails[0].SourceCode,
      contractDetails[0].ContractName,
      abi,
      contractDetails[0].CompilerVersion,
    )
  : abi

if (!parsed?.length) return null
```

---

## Implementation Plan

### [HOTFIX-HarmonyABI | TASK-001] Fix contractInfo.ts guards
**File:** `src/services/aragon-gateway/contractInfo.ts`  
**Priority:** URGENT  
**Estimate:** 1h

- [ ] Remove strict SourceCode requirement
- [ ] Add ABI-presence check as alternative
- [ ] Handle ABI-only path (skip parseNetspec when no SourceCode)

### [HOTFIX-HarmonyABI | TASK-002] Add unit tests for ABI-only scenario
**File:** `test/unit/services/aragon-gateway/contractInfo.spec.ts`  
**Priority:** HIGH  
**Estimate:** 2h

- [ ] Test: ABI present, SourceCode empty → should return functions
- [ ] Test: ABI empty, SourceCode empty → should return null
- [ ] Test: Harmony network specific mock

### [HOTFIX-HarmonyABI | TASK-003] Integration test with Harmony Explorer
**Priority:** HIGH  
**Estimate:** 1h

- [ ] Manual test with real Harmony contract address
- [ ] Verify Action Composer can load write functions
- [ ] Verify decode works for transactions

### [HOTFIX-HarmonyABI | TASK-004] Validate explorer URL configuration
**File:** `config/common.ts`  
**Priority:** MEDIUM  
**Estimate:** 30m

- [ ] Verify `NODES.HARMONY_MAINNET.BLOCKSCOUT_API_URL` is correct
- [ ] Current: `https://explorer.harmony.one/api/`
- [ ] Confirm trailing slash handling

### [HOTFIX-HarmonyABI | TASK-005] Deploy and smoke test
**Priority:** URGENT  
**Estimate:** 1h

- [ ] Deploy to staging
- [ ] Test with HIPPluginAllowlist contract: `0xa7872b2159521c96d53eddd9c123843953c3adec`
- [ ] Confirm write functions appear in Action Composer
- [ ] Deploy to production

---

## Acceptance Criteria

1. **AC1:** User can add Harmony contract `0xa7872b2159521c96d53eddd9c123843953c3adec` in Action Composer
2. **AC2:** Write functions (`allowDAO`, `disallowDAO`, etc.) are listed
3. **AC3:** No regression on other networks (Ethereum, Polygon, etc.)
4. **AC4:** Unit tests pass for ABI-only scenario

---

## Rollback Plan

If issues arise:
1. Revert `contractInfo.ts` changes
2. Redeploy previous version
3. Document edge cases encountered

---

## Related Issues

- Explorer API difference: Harmony uses BlockScout-compatible API but behaves differently
- Contract verification status: Contracts may be verified for ABI but not source

---

## Notes

- The Harmony Explorer API is Etherscan-compatible but has quirks
- `getsourcecode` returns ABI even when SourceCode is empty
- `getabi` is more reliable for ABI retrieval on Harmony
- NatSpec comments won't be available without SourceCode (acceptable tradeoff)
