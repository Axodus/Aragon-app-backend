# Backend Indexing & Backfill Plan

## Goal
Ensure reliable, idempotent indexing of HarmonyVoting events with historical backfill support and reorg safety.

## Current Status
- [x] Event handlers added for ProposalCreated/VoteCast
- [x] Historical indexing enabled
- [x] Placeholder metadata implementation
- [ ] Idempotency checks
- [ ] Reorg detection and recovery
- [ ] Backfill job implementation
- [ ] Monitoring and metrics

## Task Breakdown

### 1. Idempotency & Data Integrity
- [ ] Add unique constraint or hash-based deduplication for events
- [ ] Implement idempotent handlers (reprocessing produces same result)
- [ ] Add validation for event data completeness
- [ ] Handle edge cases (missing creator, invalid metadata)

### 2. Reorg Safety
- [ ] Add confirmation threshold before persisting events
- [ ] Implement reorg detection (monitor block hashes)
- [ ] Add rollback mechanism for reorged blocks
- [ ] Test reorg scenarios on testnet

### 3. Backfill Strategy
- [ ] Implement configurable start block per plugin
- [ ] Add checkpointing for resumable backfills
- [ ] Batch processing for historical events
- [ ] Progress tracking and reporting
- [ ] Handle rate limiting and RPC failures gracefully

### 4. Monitoring & Observability
- [ ] Add metrics for indexing lag (blocks behind)
- [ ] Track event processing success/failure rates
- [ ] Alert on prolonged indexing failures
- [ ] Dashboard for indexing health

### 5. Creator Inference Optimization
- [ ] Current: Use tx.from as creator (requires extra RPC call)
- [ ] Future: Request creator field in contract events
- [ ] Cache transaction data to reduce RPC calls
- [ ] Document creator inference strategy

## Implementation Steps

1. **Add idempotency keys** (configIndexer.ts, proposalHandler.ts)
   ```typescript
   // Use combination of pluginId + proposalId + event type as unique key
   const eventKey = `${pluginId}-${proposalId}-${eventType}`;
   ```

2. **Implement backfill job** (new file: src/services/aragon-indexer/backfillJobs.ts)
   ```typescript
   interface BackfillConfig {
     pluginAddress: string;
     startBlock: number;
     endBlock: number;
     batchSize: number;
   }
   ```

3. **Add reorg monitoring** (modify crawler logic)
   ```typescript
   // Store block hash with each indexed event
   // On new block, verify parent hash matches stored hash
   ```

## Testing Strategy
- [ ] Unit tests for handler idempotency
- [ ] Integration test: fresh sync from deployment block
- [ ] Integration test: mid-history backfill
- [ ] Chaos test: simulate RPC failures and recoveries
- [ ] Load test: index large number of events

## Acceptance Criteria
- Events are never duplicated in database
- Backfill from deployment block produces same final state as realtime indexing
- Reorg detection triggers rollback within 1 block
- Indexing lag stays under 10 blocks during normal operations
- Failed RPC calls are retried with exponential backoff
- All proposals created on-chain appear in UI within 30 seconds

## Dependencies
- HarmonyVoting contract addresses (already configured)
- Archive RPC node for historical queries
- MongoDB indexes optimized for event queries

## Related
- Parent Epic: [AragonOSX PLAN.md](../../AragonOSX/PLAN.md)
- Contract Events: [osx-plugin-foundry PLAN.md](../../osx-plugin-foundry/PLAN.md)
- UI Display: [aragon-app PLAN.md](../../aragon-app/PLAN.md)
