# Repository Guidelines

## Project Structure & Module Organization
- Monorepo managed by `pnpm` workspaces.
- `packages/client/`: Phaser 3 + Vite + TypeScript (strict ESM). Entry: `src/main.ts`.
- `packages/server/`: Node + Colyseus authoritative server. Entry: `src/index.ts`; core: `room.ts`, `state.ts`, `map.ts`.
- `packages/shared/`: shared types/constants in `src/index.ts` used by client and server.
- Place new unit tests under `packages/<name>/tests/`.

## Build, Test, and Development Commands
- Setup: `pnpm i`
- Run server (dev): `pnpm -F @toodee/server dev` (Colyseus on `ws://localhost:2567`).
- Run client (dev): `VITE_SERVER_URL=ws://localhost:2567 pnpm -F @toodee/client dev` then open `http://localhost:5173`.
- Build all packages: `pnpm -r build`
- Type-check all: `pnpm -r typecheck`
- Lint (placeholder): `pnpm -r lint`

## Coding Style & Naming Conventions
- Language: TypeScript (strict, ESM). Indentation: 2 spaces.
- Filenames: lower-case (e.g., `room.ts`, `net.ts`).
- Naming: `camelCase` variables/functions; `PascalCase` classes; `SCREAMING_SNAKE_CASE` constants.
- Shared code must live in `@toodee/shared`; do not import app-specific code across packages.

## Testing Guidelines
- No formal test suite yet; rely on `pnpm -r typecheck` and local smoke tests.
- If adding tests, use Vitest. Location: `packages/<name>/tests/*.test.ts`.
- Prefer small, fast unit tests; add coverage when introducing critical logic.
- Example: `pnpm -F @toodee/server test` (set up a `test` script when you add Vitest).

## Commit & Pull Request Guidelines
- Commits: concise, imperative (e.g., "Add room state sync"); one logical change per commit.
- PRs must include a clear summary, linked issues, client screenshots/GIFs for UI changes, and server protocol notes when applicable.
- Pre-submit: run `pnpm -r typecheck` and `pnpm -r build`; update docs when behavior or env vars change.

## Security & Configuration
- Do not commit secrets. Required envs: `VITE_SERVER_URL` (client), `FLY_API_TOKEN` (server deploys).
- Keep network schema changes backward-compatible when possible; coordinate updates across `client`, `server`, and `shared`.
