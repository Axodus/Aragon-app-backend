# Harmony Plugins Backend Update Plan

## Task Breakdown
- [x] Locate Harmony mainnet contracts config for plugin repos.
- [x] Update Harmony HIP/Delegation repo proxy addresses.
- [ ] Confirm handlers/indexer use updated config.
- [ ] Summarize changes for UI testing.

## Implementation Steps
1. Update the Harmony mainnet contracts JSON to the new repo proxy addresses.
2. Keep existing deployment metadata intact unless new data is provided.
3. Ensure no other network config changes are introduced.

## Dependencies & Integration Points
- Contracts config: `config/contracts/harmonyMainnet.json`.
- Handlers and indexer read this file for repo address matching.

## Expected Outcomes & Acceptance Criteria
- Harmony mainnet repo proxies match the latest deployment.
- Backend continues to resolve plugin interface types for Harmony.
- No unrelated contract addresses are modified.

## E2E Indexing & Backfill (New Requirements)
- [ ] Event handlers are idempotent (reprocessing same event produces same result)
- [ ] Reorg-safe handling with confirmations and retries
- [ ] Backfill strategy from deployment block with checkpointing
- [ ] Creator inference via tx.from when event doesn't include creator
- [ ] bytes32 metadata handled correctly (stored as string for now, with future registry support)
- [ ] Historical indexing enabled for all HarmonyVoting events
- [ ] Monitoring/metrics for indexing gaps and failures
- [ ] Graceful handling of RPC failures with fallback RPCs

## Task Breakdown (Expanded)
- [x] Add HarmonyVoting event configs (ProposalCreated, VoteCast)
- [x] Implement handlers with placeholder metadata
- [x] Enable historical indexing
- [ ] Add idempotency checks (event hash or unique key)
- [ ] Add reorg detection and recovery
- [ ] Implement backfill job with start block configuration
- [ ] Add metrics for indexing lag and success rates
- [ ] Test with fresh sync and mid-history backfill
- [ ] Validate proposals appear in UI after indexing

## Related Plans
- [../AragonOSX/PLAN.md](../AragonOSX/PLAN.md) - E2E reliability epic
- [../aragon-app/PLAN.md](../aragon-app/PLAN.md) - UI/UX updates
