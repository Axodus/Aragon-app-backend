# Axodus Governance Architecture

## Mission

Axodus Governance evolves from a Harmony-focused governance application into a federated multichain governance operating system. Harmony remains a supported adapter, not the governance core. The core system owns DAO federation, constitutional authority, chain registration, proposal orchestration, treasury execution coordination, plugin interoperability, and future autonomous agent hooks.

## Governance Model

Axodus uses a hub-and-spoke model with three chain roles:

- Execution chain: canonical governance state, proposal execution, treasury execution, DAO registration, constitutional authority, plugin registry references, federation membership, and cross-chain message finalization.
- Voting chains: participation surfaces where members hold governance assets, vote, delegate, or prove voting power. Voting chains submit signed, bridged, or oracle-attested vote totals to the execution chain.
- Spoke chains: operational chains that host products, treasuries, DeFi integrations, compute infrastructure, marketplace systems, and remote execution targets.

Each DAO is represented by a canonical DAO record on the execution chain and optional remote DAO surfaces on voting and spoke chains. Remote state is not authoritative unless reconciled through the Axodus multichain governance plugin and registry-defined bridge policies.

## DAO Federation

A federation is a governed set of DAOs with shared constitutional constraints and optional shared economic execution rights.

Federation records include:

- federation ID and canonical DAO address;
- member DAO addresses and chain IDs;
- constitutional policy set;
- enabled governance plugins;
- treasury routing policy;
- remote execution permissions;
- agent execution permissions;
- emergency pause and veto authorities.

Federated DAOs keep autonomy. Federation membership grants interoperability and shared execution pathways, but local DAO plugins and permissions remain explicit.

## Chain Registry

The Axodus chain registry is the ecosystem source of truth for chain support and deployments. It must exist both as versioned off-chain metadata for apps/indexers and, where needed, as on-chain registry state for canonical execution.

Registry entries include:

- chain ID, slug, name, environment, chain family, and finality profile;
- supported role: execution, voting, spoke, or any combination;
- RPC endpoints and failover policy;
- explorer metadata;
- native asset metadata;
- deployed Aragon OSx framework addresses;
- Axodus plugin repositories and setup processor addresses;
- LayerZero endpoint, peer mappings, and message library policy;
- OFT endpoints and token bridge policy;
- governance adapters;
- treasury capabilities;
- remote execution capabilities;
- permission and constitutional capability flags.

The registry must be append-only at the metadata layer and upgrade-controlled at the on-chain layer. A chain can be supported for indexing before it is trusted for execution.

## Plugin Architecture

Axodus must preserve Aragon OSx compatibility. Custom Axodus behavior belongs in plugins and setup processors, not in deep OSx core forks.

Plugin categories:

- Governance plugins: token voting, multisig, lock-to-vote, Harmony delegation voting, multichain governance.
- Coordination plugins: proposal synchronization, vote aggregation, execution routing.
- Treasury plugins: spend policies, remote treasury execution, streaming, budget limits.
- Federation plugins: DAO registration, member DAO admission, federation permissions.
- Constitutional plugins and conditions: proposal validation, execution restrictions, policy gates.
- Agent plugins: bounded autonomous proposal creation, simulation, monitoring, and execution recommendations.

Plugin repositories must be versioned independently. Setup processors install plugin instances, request permissions, and expose upgrade paths. Harmony-specific voting remains a plugin adapter family.

## Multichain Governance Plugin

The Axodus multichain governance plugin runs on the execution chain and provides the first canonical cross-chain coordination point.

Responsibilities:

- create canonical proposals;
- emit proposal synchronization messages for voting chains;
- accept vote aggregates from trusted relayers, LayerZero receivers, or chain adapters;
- track per-chain vote totals and finalization state;
- finalize canonical proposal totals;
- route remote execution requests;
- track remote execution receipts;
- expose reconciliation state to the backend and frontend.

The plugin should not assume one transport. LayerZero is the first bridge implementation, while adapter interfaces allow future messaging providers.

## LayerZero Integration Model

LayerZero endpoints are registered per chain. Each remote peer is declared in the chain registry with:

- local endpoint address;
- remote endpoint ID;
- trusted peer address;
- message type permissions;
- gas and fee policy;
- retry policy;
- message library configuration;
- confirmation policy.

Message types:

- ProposalSynced;
- VoteAggregateSubmitted;
- VoteFinalized;
- RemoteExecutionRequested;
- RemoteExecutionReceipt;
- ChainStateReconciled.

LayerZero messages should carry compact payloads and reference proposal metadata by hash or URI. Full proposal metadata remains in canonical storage and indexers.

## OFT Strategy

OFT solves token transport, not voting power semantics. Governance power must be explicit per chain and per plugin.

Supported strategies:

- ERC20Votes delegation and checkpoints for EVM voting chains;
- wrapped voting assets with canonical supply accounting;
- Merkle snapshot roots generated by chain-aware indexers;
- native staking snapshots via adapters and oracle attestations;
- hybrid aggregation where ERC20Votes, staking, and remote assets contribute through normalized voting units.

Harmony native staking requires a dedicated adapter/oracle path. Validator/delegation data should be read by a Harmony adapter and normalized into voting snapshots, then attested to the execution chain.

## Constitutional Enforcement

The architecture reserves hooks for constitutional governance without forcing the full policy engine now.

Enforcement points:

- proposal creation validation;
- proposal metadata schema validation;
- action simulation and target allowlists;
- treasury spend limits;
- federation membership requirements;
- remote execution gating;
- emergency pause, veto, and timelock policy;
- AI-agent permission boundaries.

These hooks should become OSx permission conditions and Axodus plugins where possible.

## Backend Architecture

The backend becomes a MultiChain Governance Indexer.

Target structure:

```txt
backend/
  chains/
    registry/
    adapters/
    rpc/
    deployment/
    metadata/
    permissions/
  indexers/
  aggregators/
  governance/
  execution/
  bridge/
  telemetry/
```

Responsibilities:

- chain-aware indexing;
- reorg-safe cursor management;
- RPC failover;
- normalized chain events;
- proposal aggregation;
- LayerZero message tracking;
- remote execution receipt tracking;
- vote aggregation;
- treasury state synchronization;
- governance state reconciliation;
- adapter isolation for Harmony validator and native staking data.

The backend must not centralize business authority. It indexes, normalizes, aggregates, and submits attestations only where a DAO-granted permission allows it.

## Frontend Architecture

The frontend becomes the DAO Operating Dashboard.

Primary UX surfaces:

- DAO-first onboarding;
- federation overview;
- chain-aware governance;
- proposal lifecycle;
- vote aggregation status;
- treasury visualization;
- multichain execution status;
- plugin management;
- partner DAO management;
- permission and constitutional policy visibility;
- remote execution tracking.

The frontend reads from the chain registry and backend aggregation APIs. It must not encode single-chain assumptions or hold governance business logic that belongs in contracts, indexers, or SDK modules.

## Governance SDK

The SDK provides shared interfaces for:

- chain registry lookup;
- DAO federation records;
- proposal lifecycle state;
- voting power adapters;
- plugin metadata;
- execution receipts;
- bridge messages;
- treasury capabilities;
- constitutional checks.

The SDK must be chain-agnostic and typed around chain IDs, plugin IDs, DAO IDs, and capability descriptors.

## Repository Responsibilities

Recommended repository split:

- governance-core: canonical interfaces, SDK contracts, federation abstractions, execution manager interfaces.
- governance-plugins: shared plugin interfaces, setup processor utilities, reusable conditions.
- multichain-governance-plugin: proposal sync, vote aggregation, LayerZero messaging, remote execution tracking.
- protocol-factory: DAO/federation deployment orchestration.
- governance-sdk: TypeScript SDK for apps, backend, scripts, agents.
- governance-backend: multichain indexer, aggregators, telemetry, receipts.
- governance-frontend: DAO Operating Dashboard.
- chain-registry: metadata, deployment records, chain capabilities.
- governance-conditions: constitutional and permission conditions.
- governance-docs: architecture, runbooks, audit notes, integration specs.

Current repos can host Phase 1 scaffolding, but production ownership should move toward this split.

## Deployment Model

Deployment happens in stages:

1. Publish chain registry metadata for supported execution, voting, and spoke chains.
2. Deploy OSx framework contracts where needed or reference existing deployments.
3. Deploy Axodus plugin repositories and setup processors.
4. Register LayerZero peers and OFT endpoints.
5. Install multichain governance plugin on execution-chain DAOs.
6. Register voting-chain adapters and authorized aggregate submitters.
7. Enable backend indexers per chain.
8. Expose DAO Operating Dashboard views from registry and indexer state.
9. Add constitutional conditions and treasury execution limits.

## Phase Plan

Phase 0 is this architecture and decision record.

Phase 1 isolates Harmony-specific logic, defines shared interfaces, creates chain abstractions, introduces plugin abstraction points, and defines SDK-facing types.

Phase 2 builds a minimal PoC:

- one execution chain;
- one voting chain;
- LayerZero adapter path;
- proposal sync event;
- vote aggregation submission;
- canonical finalization;
- remote execution request and receipt tracking.

## Non-Negotiables

- Preserve Aragon OSx compatibility.
- Preserve upgradeability and plugin setup processor patterns.
- Keep Harmony-specific logic behind adapters and plugins.
- Keep governance state independent of any single RPC or indexer.
- Keep DAO autonomy explicit.
- Optimize for scalability, modularity, governance integrity, interoperability, operational autonomy, DAO federation, and future AI orchestration.
