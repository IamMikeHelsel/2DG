# Toodee Birthday Demo - 2D MMO (Phaser + Colyseus + TypeScript)

**ALWAYS follow these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Working Effectively

### Bootstrap, Build, and Test the Repository

**CRITICAL: NEVER CANCEL BUILDS OR LONG-RUNNING COMMANDS. All timeouts should be 60+ minutes.**

1. **Setup Environment:**

   ```bash
   # Enable pnpm (required - takes ~1.5 seconds)
   corepack enable
   corepack prepare pnpm@9.0.0 --activate

   # Install dependencies - takes ~34 seconds. NEVER CANCEL.
   pnpm i
   ```

2. **Build Commands:**

   ```bash
   # Build all packages - takes ~8 seconds. NEVER CANCEL. Set timeout to 60+ minutes.
   pnpm -r build

   # Build individual packages (faster for iterative development):
   pnpm -F @toodee/shared build    # ~1.5 seconds
   pnpm -F @toodee/server build    # ~2 seconds
   pnpm -F @toodee/client build    # ~6 seconds

   # Type check all packages - takes ~3.5 seconds (may have known errors)
   pnpm -r typecheck
   ```

3. **Test Commands:**

   ```bash
   # Run all tests - takes ~1.4 seconds. Some tests may fail due to workspace dependencies.
   pnpm -r test

   # Run individual package tests (recommended):
   pnpm -F @toodee/shared test     # ~1 second - PASSES
   pnpm -F @toodee/server test     # ~1.1 seconds - may have 1 failing test (map.spec.ts) due to @toodee/shared import issue
   ```

4. **Lint Commands:**
   ```bash
   # Currently placeholders only - takes <1 second
   pnpm -r lint
   ```

### Run the Application

**Application successfully loads and runs. Client-server connection works.**

1. **Start Both Server and Client (Recommended):**

   ```bash
   # Start both concurrently - ready in ~15 seconds
   pnpm dev:all

   # Server starts on ws://localhost:2567 (Colyseus)
   # Client starts on http://localhost:5173 (Vite)
   ```

2. **Start Server Only:**

   ```bash
   # Server development mode - ready in ~5 seconds
   pnpm -F @toodee/server dev
   # Listens on port 2567, WebSocket endpoint available
   ```

3. **Start Client Only:**
   ```bash
   # Client development mode - ready in ~200ms
   VITE_SERVER_URL=ws://localhost:2567 pnpm -F @toodee/client dev
   # Opens on http://localhost:5173
   ```

## Validation

**ALWAYS manually validate any new code by running complete scenarios.**

### Manual Testing Scenarios

1. **Complete Development Workflow:**
   - Run `pnpm dev:all`
   - Navigate to `http://localhost:5173/`
   - Verify Phaser 3 game loads (blue/teal background with darker game area)
   - Test player movement with arrow keys (up/down/left/right)
   - Check browser console for connection success to `ws://localhost:2567`

2. **Build Validation:**
   - Always run `pnpm -r build` after making changes
   - Verify all packages build without errors
   - Test that built client still loads and connects to server

3. **TypeScript Validation:**
   - Run `pnpm -r typecheck` before committing
   - **Known Issues:** Client has 2 TypeScript errors (AssetLoader.ts and net.ts) - these are existing issues, do not fix unless directly related to your changes

### CI/CD Pipeline Requirements

- Always run `pnpm -r typecheck` before committing (despite known errors)
- Always run `pnpm -r build` before committing
- GitHub Actions will deploy client to Pages and server to Fly.io on main branch

## Architecture & Key Locations

### Repository Structure

```
packages/
  client/           # Phaser 3 + Vite + TypeScript game client
    src/main.ts     # Entry point - Phaser game configuration
    src/scenes/     # Game scenes (GameScene.ts, ImprovedGameScene.ts, EnhancedGameScene.ts)
    src/net.ts      # Network client code (Colyseus client)
  server/           # Node + Colyseus authoritative server
    src/index.ts    # Entry point - Express + Colyseus server setup
    src/room.ts     # Game room logic and player management
    src/state.ts    # Game state schema (Colyseus @Schema)
    src/map.ts      # Map generation and tile management
  shared/           # Shared types/constants between client and server
    src/index.ts    # Shared constants, enums, interfaces
content/            # Game assets and maps
.github/workflows/  # CI/CD - client.yml (Pages), server.yml (Fly.io)
```

### Important Files When Making Changes

- **Always check `packages/shared/src/index.ts`** when modifying game constants, types, or networking interfaces
- **Always check `packages/server/src/room.ts`** when modifying game logic or player interactions
- **Always check `packages/client/src/scenes/GameScene.ts` or `ImprovedGameScene.ts`** when modifying client-side game behavior
- **Check `packages/server/src/state.ts`** when modifying player or game state data structures

### Networking Architecture

- **Server Authority:** Server at `localhost:2567` is authoritative for all game state
- **Client Connection:** Client connects via WebSocket to Colyseus room "toodee"
- **Tick Rate:** Server runs at 20 Hz (50ms tick rate)
- **Input Handling:** Client sends input messages, server processes and updates authoritative state

## Common Tasks

### Adding New Game Features

1. **Shared Types/Constants:**
   - Add interfaces, enums, or constants to `packages/shared/src/index.ts`
   - Build shared package: `pnpm -F @toodee/shared build`

2. **Server Logic:**
   - Update `packages/server/src/state.ts` for new state properties
   - Update `packages/server/src/room.ts` for new game logic
   - Build server: `pnpm -F @toodee/server build`

3. **Client Logic:**
   - Update appropriate scene file in `packages/client/src/scenes/`
   - Update `packages/client/src/net.ts` for new network messages
   - Build client: `pnpm -F @toodee/client build`

4. **Testing:**
   - Add tests to `packages/server/tests/` or `packages/shared/tests/`
   - Run targeted tests: `pnpm -F @toodee/server test`

### Working with Docker/Fly.io

- **Dockerfile.simple:** Used for Fly.io deployment (builds ~5-10 minutes)
- **docker-compose.yml:** Local Docker development (rarely used)
- **fly.toml:** Fly.io configuration for server deployment

### Known Working Commands Output

```bash
# Repository root ls -la output:
.dockerignore  .git  .github  .gitignore  AGENTS.md  Dockerfile
docker-compose.yml  fly.toml  package.json  packages  pnpm-lock.yaml
pnpm-workspace.yaml  tsconfig.base.json  README.md  FLY_DEPLOYMENT.md
FOUNDER_REWARDS.md  2DGAME_design_doc_birthday_demo_3_5_week_vertical_slice.md

# Package.json scripts:
"build": "pnpm -r build"
"dev:all": "concurrently -k -n server,client -c cyan,magenta \"pnpm -F @toodee/server dev\" \"VITE_SERVER_URL=ws://localhost:2567 pnpm -F @toodee/client dev\""
"typecheck": "pnpm -r typecheck"
"test": "pnpm -r test"
```

## Environment Variables

- **Client:** `VITE_SERVER_URL` (default: `ws://localhost:2567` for local, `wss://toodeegame.fly.dev` for production)
- **Server:** `PORT` (default: 2567), `NODE_ENV`

## Deployment

- **Client:** Deployed to GitHub Pages via `.github/workflows/client.yml`
- **Server:** Deployed to Fly.io via `.github/workflows/server.yml`
- **Secrets:** `FLY_API_TOKEN` (server deploy), `VITE_SERVER_URL` (client build)

## Timing Expectations

- **pnpm i:** 30-40 seconds
- **pnpm -r build:** 8 seconds
- **pnpm dev:all startup:** 15 seconds
- **Individual package builds:** 1-6 seconds each
- **Tests:** 1-2 seconds each package
- **Docker builds:** 5-10 minutes (NEVER CANCEL)

## Known Issues (Do Not Fix Unless Related to Your Changes)

1. **TypeScript Errors:** Client has 2 known TypeScript errors in AssetLoader.ts and net.ts
2. **Test Failures:** Server tests may have 1 failing test (map.spec.ts) due to workspace import issue
3. **Phaser Warnings:** Console shows texture frame warnings - these are expected for the current sprite system
4. **Lint Placeholders:** Lint commands are currently placeholder echo statements

Always run complete validation scenarios after making changes to ensure the game still loads, connects, and functions properly.
