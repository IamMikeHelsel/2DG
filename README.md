# Toodee Birthday Demo (Phaser + Colyseus + TypeScript)

This is a minimal, production-friendly scaffold for a web-playable 2D MMO demo.

- Client: Phaser 3 + Vite + TypeScript
- Server: Node + Colyseus (authoritative) + TypeScript
- Shared: constants/types usable by both
- Content: tiny placeholder Michigan-inspired map
- Testing: Comprehensive E2E test ecosystem for multi-user gameplay
- CI: GitHub Actions for client (Pages) & server (Fly.io)
- Deploy: Fly.io for server, GitHub Pages for client

## Quick Start

```bash
# Requires: Node 18+, pnpm 9+, Flyctl (for deploys)
pnpm i

# Run server (Colyseus)
pnpm -F @toodee/server dev

# In another terminal: run client (Phaser)
pnpm -F @toodee/client dev
# Open http://localhost:5173

# Run both concurrently
pnpm dev:all
```

## Testing

The project includes comprehensive testing for both individual components and complete multi-user scenarios:

```bash
# Run all tests (unit + E2E)
pnpm test

# Run only unit tests (fast)
pnpm test:unit

# Run only E2E tests (comprehensive multi-user scenarios)
pnpm test:e2e
```

See [E2E_TESTING.md](./E2E_TESTING.md) for detailed information about the end-to-end test ecosystem that validates multi-user gameplay scenarios.

## Env

- Client expects `VITE_SERVER_URL` (e.g., `wss://toodeegame.fly.dev` in prod; `ws://localhost:2567` local).

## Deploy (Server – Fly.io)

```
fly launch --no-deploy
# edit fly.toml app name to "toodeegame" or your choice

# set secrets in GitHub:
#   FLY_API_TOKEN
#   VITE_SERVER_URL  (used by client build)
```

## Repo layout

```
packages/
  client/    # Phaser + Vite
  server/    # Colyseus authoritative server
  shared/    # shared constants/types
content/
  maps/      # demo map (Michigan-ish)
.github/workflows/
  client.yml
  server.yml
fly.toml         # sample (edit app name)
Dockerfile       # server container
pnpm-workspace.yaml
package.json
tsconfig.base.json
```

---

### Notes
- The map renderer uses simple colored tiles (no external images) at 32×32. Swap to Tiled/atlas later.
- Networking: 20 Hz server tick; client sends directional inputs; server is authoritative.
