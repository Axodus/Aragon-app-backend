# Copilot Instructions — Aragon App Backend (Node/TS)

Goal: index blockchain events from Aragon OSx and expose API(s) the app consumes. Multiple services, one repo.

## Big Picture
- Services (entrypoints in `runners/`): `aragon-api`, `aragon-admin-api`, `aragon-indexer`, `aragon-rates`, plus others.
- Stack: TypeScript + Koa 3 + Ethers v6 + MongoDB + RabbitMQ + Typegoose + Winston + Prometheus client.
- Data flow: EVM events → indexer → MongoDB → API(s) → consumed by the front-end app.

## Planning & Issue Tracking Workflow

**CRITICAL: After completing planning and BEFORE starting implementation:**

1. **Generate Plan Document**: Create `PLAN.md` at repository root containing:
   - [ ] Clear task breakdown with checkboxes
   - [ ] Implementation steps and guidelines
   - [ ] Dependencies and integration points
   - [ ] Expected outcomes and acceptance criteria

2. **Sync with GitHub Project**: Using GitHub CLI (`gh` - already authenticated as mzfshark):
   ```bash
   # Create issue from PLAN.md
   gh issue create --title "[Plan] <descriptive-title>" --body-file PLAN.md --project "https://github.com/users/mzfshark/projects/5"
   ```

3. **Update Plan Progress**: As tasks complete, update checkboxes in `PLAN.md` and sync with issue:
   ```bash
   # Update the issue body with current PLAN.md
   gh issue edit <issue-number> --body-file PLAN.md
   ```

**IMPORTANT**: Never run `git commit` or `git push` automatically. Always ask the user before any git operations.

**Never start implementation without a documented plan in `PLAN.md` and corresponding GitHub issue.**

## Tool Restrictions

**FORBIDDEN: Do NOT use `codacy_get_pattern` tool** — This tool is incompatible with WSL environments and will fail. Use alternative Codacy tools for code quality analysis.

## Language Standards

**MANDATORY: All public-facing content MUST be in English:**

- **Code comments**: All comments in source code must be written in English
- **Logs and console output**: All log messages, debug output, and error messages must be in English
- **GitHub Issues**: All issue titles, descriptions, and comments must be in English
- **Commit messages**: All git commit messages must be in English following conventional commits format
- **Documentation**: All README files, inline docs, and API documentation must be in English
- **Variable/function names**: Use English for all identifiers in code

**Examples:**
```bash
# ✅ CORRECT
git commit -m "feat: add .country domain support to DAO resolver service"

# ❌ INCORRECT
git commit -m "adiciona suporte a domínios .country no serviço de resolução de DAO"
```

**Note**: This standard ensures international collaboration and maintainability. Internal planning documents (like `PLAN.md` for local work) may use Portuguese if needed, but all published content must be English.

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
