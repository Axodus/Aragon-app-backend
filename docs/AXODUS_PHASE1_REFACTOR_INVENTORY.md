# Axodus Phase 1 Refactor Inventory

## Harmony-Coupled Backend Modules

These modules should move behind Harmony adapters or remain as Harmony plugin-specific code:

- `src/governance/harmonyDelegationGovernance.ts`: Harmony staking and validator delegation membership logic.
- `src/governance/index.ts`: governance factory currently imports Harmony directly and branches on Harmony plugin interface types.
- `src/jobs/harmonyBackfillJob.ts`: HarmonyVoting event backfill and validator config backfill.
- `src/metrics/harmonyIndexingMetrics.ts`: Harmony-specific metrics naming and lag tracking.
- `src/utils/harmonyAddressUtils.ts`: Harmony bech32/hex conversion.
- `src/helpers/validationSchema.ts`: Harmony address validation helper.
- `src/helpers/reorgDetection.ts`: Harmony aliases and finality assumptions.
- `config/common.ts`: Harmony RPC and explorer defaults.
- `config/contracts/harmonyMainnet.json`: Harmony deployment records.
- `config/tokens.ts`: Harmony native token assumption and token list entries.

## Harmony-Coupled Contract Modules

These belong in a Harmony voting plugin package, not governance core:

- `packages/contracts/src/harmony/HarmonyVotingBase.sol`
- `packages/contracts/src/harmony/HarmonyDelegationVotingPlugin.sol`
- `packages/contracts/src/harmony/HarmonyHIPVotingPlugin.sol`
- `packages/contracts/src/harmony/HarmonyValidatorOptInRegistry.sol`
- `packages/contracts/src/harmony/IHarmonyInterfaces.sol`
- `packages/contracts/src/setup/HarmonyDelegationVotingSetup.sol`
- `packages/contracts/src/setup/HarmonyHIPVotingSetup.sol`
- `packages/contracts/scripts/redeployHarmony.ts`
- `packages/contracts/scripts/grantAllowlistPermission.ts`
- Harmony deployment helpers and pending transaction metadata.

## Harmony-Coupled Frontend Modules

These should stay as plugin UI modules or use chain registry metadata:

- `src/plugins/harmonyVotingPlugin/**`
- Harmony-specific plugin transaction helpers.
- Any network filtering or routing that assumes Harmony is a primary governance chain.

## Extraction Targets

- Chain registry: chain IDs, roles, finality, RPCs, deployed contracts, LayerZero peers, OFT endpoints, and capabilities.
- Chain adapters: address normalization, staking snapshots, ERC20Votes snapshots, wrapped voting assets, and snapshot attestations.
- Governance core: federation records, proposal lifecycle, aggregate normalization, execution receipt normalization, and constitutional guard hooks.
- Plugin architecture: Axodus plugins use OSx plugin repositories and setup processors; Harmony remains a plugin family.
- SDK contracts/interfaces: shared types for backend, frontend, scripts, and future agents.

## Phase 1 Rule

Do not delete Harmony functionality. Move it behind adapters and plugin boundaries while introducing Axodus chain-agnostic abstractions in parallel.
