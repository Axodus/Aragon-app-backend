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
- [x] Event handlers are idempotent (reprocessing same event produces same result)
- [ ] Reorg-safe handling with confirmations and retries
- [x] Backfill strategy from deployment block with checkpointing
- [x] Creator inference via tx.from when event doesn't include creator
- [x] bytes32 metadata handled correctly (stored as string for now, with future registry support)
- [x] Historical indexing enabled for all HarmonyVoting events
- [x] Monitoring/metrics for indexing gaps and failures
- [ ] Graceful handling of RPC failures with fallback RPCs

## Ops: Forced Reindex (Production)
- [ ] Document a safe reindex playbook (no volume removal)
- [ ] Reset MongoDB checkpoints for Harmony (`ConfigIndexer`) to force historical sync from `NODES_HARMONY_*_FROM_BLOCK`
- [ ] Reset `Plugin.isHistoricalSynced=false` for Harmony to re-run one-time historical plugin sync
- [ ] Run a full reindex + validate DAO/proposal/vote counts in Mongo

## Task Breakdown (Expanded)
- [x] Add HarmonyVoting event configs (ProposalCreated, VoteCast)
- [x] Implement handlers with placeholder metadata
- [x] Enable historical indexing
- [x] Add idempotency checks (event hash or unique key)
- [ ] Add reorg detection and recovery
- [x] Implement backfill job with start block configuration
- [x] Add metrics for indexing lag and success rates
- [ ] Test with fresh sync and mid-history backfill
- [ ] Validate proposals appear in UI after indexing

## Legacy DAO Sandbox (DAO 0x76B83B6148ccA891D768cE3129585F25d0104783)

### Objectives
- Reproduce the historical Harmony environment locally (API + indexer + Next.js UI) tied to the legacy DAO contracts so we can craft/execute migration actions.
- Preserve the current production contract data by committing explicit backups before any rollback.

### Tasks
- [ ] Backup current Harmony contract metadata
	- [ ] Copy `config/contracts/harmonyMainnet.json` to `bkp-harmonyMainnet-<timestamp>.json` (include DAOFactory, PSP, repo proxies, allowlists).
	- [ ] Snapshot any `.env` / `dao.yml` values that reference the latest Harmony deployments.
- [ ] Roll back contract references to the legacy deployment
	- [ ] Replace DAOFactory, PluginSetupProcessor, repo proxy, allowlist, and vault addresses with the versions active for DAO `0x76B8…`.
	- [ ] Document old ↔ new address mapping in the plan or a temporary README snippet for auditability.
- [ ] Run backend services against the legacy config
	- [ ] Start Mongo replica + `yarn service:aragon-indexer` using the rollback config and `FROM_BLOCK` aligned with the DAOFactory block for `0x76B8…`.
	- [ ] Launch `yarn service:aragon-api` (dev mode) and confirm Harmony endpoints return data for the legacy DAO.
	- [ ] Export CLI recipes to craft multisig proposals (create → approve → execute) that withdraw funds from the old DAO treasury.
- [ ] Sync the local Next.js frontend with the legacy backend (depends on [../aragon-app/PLAN.md](../aragon-app/PLAN.md))
	- [ ] Point `.env.local` to the local API/indexer stack and disable any cached CDN responses.
	- [ ] Validate DAO detail, treasury balances, and proposal history render for DAO `0x76B8…` using the rolled-back data.

## Related Plans
- [../AragonOSX/PLAN.md](../AragonOSX/PLAN.md) - E2E reliability epic
- [../aragon-app/PLAN.md](../aragon-app/PLAN.md) - UI/UX updates
