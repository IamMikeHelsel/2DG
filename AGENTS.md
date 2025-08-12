# Repository Guidelines

## Project Structure & Modules

- Monorepo managed by `pnpm` workspaces.
- `packages/client/`: Phaser 3 + Vite + TypeScript (entry: `src/main.ts`).
- `packages/server/`: Node + Colyseus authoritative server (entry: `src/index.ts`; core files: `room.ts`, `state.ts`, `map.ts`).
- `packages/shared/`: shared types/constants (`src/index.ts`) consumed by client and server.

## Build, Test, and Development Commands

- Setup: `pnpm i`
- Run server (dev): `pnpm -F @toodee/server dev` (Colyseus on `ws://localhost:2567` by default)
- Run client (dev): `pnpm -F @toodee/client dev` then open `http://localhost:5173`
- Env for client: set `VITE_SERVER_URL` (e.g., `ws://localhost:2567` locally)
- Build all packages: `pnpm -r build`
- Type-check all: `pnpm -r typecheck`
- Lint (placeholder): `pnpm -r lint` (no linter configured yet)

## Coding Style & Naming Conventions

- Language: TypeScript (strict, ESM). Indentation: 2 spaces.
- Filenames: lower-case (`room.ts`, `net.ts`); prefer simple, descriptive names.
- Naming: `camelCase` for variables/functions; `PascalCase` for classes; `SCREAMING_SNAKE_CASE` for constants.
- Shared code lives in `@toodee/shared`; do not import app-specific code across packages.

## Testing Guidelines

- No formal test suite yet; rely on `pnpm -r typecheck` and local smoke tests.
- If adding tests, place under `packages/<name>/tests/` and prefer Vitest (client/server) for fast unit tests.
- Ensure `pnpm -r build` and type-checks pass before PRs; include coverage if you introduce critical logic.

## Commit & Pull Request Guidelines

- Commits: concise, imperative (e.g., "Add room state sync"); one logical change per commit.
- PRs must include: clear summary, linked issues, client screenshots/GIFs for UI changes, server protocol notes when applicable, and local run steps.
- Pre-submit checklist: run `pnpm -r typecheck` and `pnpm -r build`; update docs when behavior or env vars change.

## Security & Configuration

- Do not commit secrets. CI uses `VITE_SERVER_URL` (client) and `FLY_API_TOKEN` (server deploys).
- Keep network schema changes backward-compatible when possible; coordinate updates across `client`, `server`, and `shared`.
