# Copilot Instructions — Aragon App Backend (Node/TS)

Goal: index blockchain events from Aragon OSx and expose API(s) the app consumes. Multiple services, one repo.

## Big Picture
- Services (entrypoints in `runners/`): `aragon-api`, `aragon-admin-api`, `aragon-indexer`, `aragon-rates`, plus others.
- Stack: TypeScript + Koa 3 + Ethers v6 + MongoDB + RabbitMQ + Typegoose + Winston + Prometheus client.
- Data flow: EVM events → indexer → MongoDB → API(s) → consumed by the front-end app.

## Key Paths
- Entrypoints: `runners/*.ts` (start a specific service).
- Configuration: `config/*.ts` (env, tokens, contracts, common). Use `.env` (see `.env.sample`).
- Source code: `src/**` (models, services, controllers). Tests: `test/**` (custom runner).
- Docker compose: `docker-compose*.yml` for local deps/services; `scripts/*.sh` helpers.

## Install, Run, Test
- Package manager: `yarn`.
- Install: `yarn install`
- Run locally (examples):
  - API: `yarn service:aragon-api`
  - Indexer: `yarn service:aragon-indexer`
  - Rates: `yarn service:aragon-rates`
  - Admin API: `yarn service:aragon-admin-api`
- With Docker:
  - Deps (Mongo/Rabbit): `yarn docker:unit-dep-dependencies`
  - All services: `yarn docker:services`
  - Specific service: `docker-compose up --build -d service-aragon-api`
- Tests/quality:
  - Lint: `yarn lint` / `yarn lint:fix`
  - Format: `yarn format:check` / `yarn format:fix`
  - Unit tests: `yarn test:unit`
  - Coverage: `yarn test:unit:coverage && yarn test:unit:coverage:report`

## Conventions & Tooling
- Module resolution: `tsconfig-paths` at runtime and `tsc-alias` post-build. Keep import aliases consistent with `tsconfig.json`.
- Validation: `class-validator`/`joi` at API boundaries; validate request payloads and config.
- Persistence: Mongo via Mongoose/Typegoose models; keep schema changes behind `mig:*` scripts.
- Messaging: RabbitMQ for async jobs (rates/indexing queues). Use `wait:*` scripts to ensure services are up.
- Observability: `prom-client` metrics; structured logs via `winston`.

## Migrations & Deploy
- DB Migrations: `yarn mig:create`, `yarn mig:run`, `yarn mig:status`.
- Envs: place `.env` at repo root; sensitive secrets only via env vars (no commits).
- Deploy helpers: `scripts/app-deploy.sh <env>` and `pm2.config.js`.

## Cross-Repo Integration
- Contract addresses/networks must match OSx deployments (contracts repo). Keep `config/contracts/` in sync.
- Frontend consumes endpoints from `aragon-api`/`aragon-admin-api`; coordinate payloads and pagination semantics with app modules.

## Example Tasks (Do It This Way)
- Add an endpoint: define schema/DTO, implement controller in `src/**`, wire route in the service runner, add validation, return typed responses.
- Add an indexer job: define queue/topic, write a worker that reads on-chain events (Ethers v6), persist via Typegoose, emit metrics and logs.
- Add a migration: use `mig:create`, implement idempotent changes, verify with `mig:status` on a test DB.
