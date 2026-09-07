# Repository Guidelines

## Project Structure & Module Organization

This TypeScript backend indexes Aragon blockchain events and serves APIs. Service implementations live in `src/services/`, with entry points in `runners/`. Shared logic belongs in `src/helpers/`, `src/modules/`, and `src/middlewares/`; persistence and governance code occupy their corresponding `src/` directories. Contract artifacts live in `src/artifacts/`. Configuration is under `config/`, migrations under `src/migrations/`, operational utilities under `scripts/` and `tools/`, and documentation under `docs/`. Tests use `test/unit/`, `test/unit-dep/`, `test/integration/`, and `test/manual/`, with fixtures in `test/mock/`.

## Build, Test, and Development Commands

Use Node.js `22.18.0` (`.nvmrc`) and Yarn `1.22.22` (`package.json`).

- `yarn install`: install dependencies.
- `yarn service:aragon-api`: start the API; `yarn service:aragon-indexer` starts indexing.
- `yarn docker:mongo`: start the MongoDB replica set.
- `yarn docker:services`: build and start the configured backend containers.
- `yarn typecheck`: check TypeScript without emitting files. There is no standalone build script; local services run through `ts-node`.
- `yarn lint` and `yarn format:check`: validate ESLint and Prettier rules.
- `yarn validate`: run type checking and unit tests.

## Coding Style & Naming Conventions

Use two-space indentation, single quotes, no semicolons, trailing commas, and Prettier's 120-character print width. Follow nearby filename conventions, commonly camelCase modules and `*.spec.ts` tests. Use PascalCase for classes/types and camelCase for functions/variables. Prefer configured aliases such as `@helpers/*` and `@services/*`. Use the shared `@logger`; ESLint rejects `console` calls.

## Testing Guidelines

Tests use Mocha, Chai, and Sinon. Mirror source paths under `test/unit/`. Run `yarn test:unit`, or narrow execution with `yarn test:unit --grep 'suite name'`. Unit tests initialize MongoDB Memory Server. `yarn test:unit-dep` requires configured database/network dependencies and clears its database between tests; use an isolated test database.

Generate coverage with `yarn test:unit:coverage`, then run `yarn test:coverage:check`: thresholds are 98% statements, functions, and lines, and 90% branches. Run `yarn test:dotonly` to detect focused tests.

## Commit & Pull Request Guidelines

Recent history mixes imperative subjects and merge commits. Follow the documented Conventional Commit format enforced by commitlint, for example `fix(api): validate proposal filters`. Use `.github/pull_request_template.md`: explain the problem, summarize changes, link the task, and report testing and review results. Discuss major changes in an issue first.

## Configuration & Agent Instructions

Create local `.env` configuration from `.env.sample`; never commit credentials. When using `exec_command`, explicitly emit its returned `exit_code`, `output`, and `session_id` through `text(JSON.stringify(...))`; verify the output before treating execution as successful.
