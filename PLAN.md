# Harmony Plugins Backend Update Plan

## Task Breakdown
- [ ] Locate Harmony mainnet contracts config for plugin repos.
- [ ] Update Harmony HIP/Delegation repo proxy addresses.
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
