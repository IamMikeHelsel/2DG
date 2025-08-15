# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
```bash
# Setup (required before first run - takes ~30 seconds)
corepack enable
corepack prepare pnpm@9.0.0 --activate
pnpm i

# Run both server and client (recommended)
pnpm dev:all

# Run individually
pnpm dev:server  # Server on ws://localhost:2567
pnpm dev:client  # Client on http://localhost:5173
```

### Build & Test
```bash
# Build all packages (~8 seconds)
pnpm -r build

# Run tests
pnpm test          # All tests
pnpm test:unit     # Unit tests only (~1 second)
pnpm test:e2e      # E2E tests only

# Type checking (~3.5 seconds, has 2 known errors)
pnpm -r typecheck

# Load testing
PLAYERS=12 node tools/load-test.js
```

## Architecture Overview

### Multi-Package Monorepo Structure
```
packages/
  client/          # Phaser 3 game client
    src/scenes/    # Game scenes (GameScene, ImprovedGameScene, EnhancedGameScene)
    src/net.ts     # Colyseus WebSocket client
  server/          # Colyseus authoritative server
    src/room.ts    # Core game logic, handles 12+ concurrent players
    src/state.ts   # Shared state schema (@colyseus/schema)
    src/map.ts     # Michigan-shaped map generation
  shared/          # Types and constants shared between client/server
```

### Key Technical Details

1. **Networking Architecture**
   - Server: Authoritative Colyseus server at port 2567
   - Protocol: WebSocket with 20 Hz tick rate (50ms)
   - State sync: 10 Hz patches, client interpolation
   - Room: Single "toodee" room supporting 30+ concurrent users

2. **Performance Characteristics**
   - Target: 12-30 concurrent players
   - Server tick budget: 8ms p95 (currently achieves ~3ms)
   - Network latency target: <120ms p95
   - Client framerate: 60 FPS target

3. **Game Systems**
   - Movement: Server-authoritative with client prediction
   - Combat: Cooldown-based attack system (400ms)
   - Chat: Sanitized broadcast messaging
   - Shop: NPC merchant with proximity checks
   - Rewards: Founder tiers, referrals, bug reports

## Common Development Tasks

### Adding New Features
1. Define types/constants in `packages/shared/src/index.ts`
2. Update server state in `packages/server/src/state.ts`
3. Implement logic in `packages/server/src/room.ts`
4. Update client in appropriate scene file
5. Add tests to `packages/server/tests/`

### Testing Multi-Player Scenarios
```bash
# 1. Start server and client
pnpm dev:all

# 2. Run load test in another terminal
PLAYERS=12 DURATION=60 node tools/load-test.js

# 3. Connect manual testers to http://localhost:5173
```

### Debugging Performance
- Server logs performance stats every 30 seconds
- Check for "Performance warning" in console
- Use load test tool to simulate player counts
- Monitor tick times: should stay under 8ms

## Critical Files

- **Game Logic**: `packages/server/src/room.ts:14-454` - Main game room
- **Network Client**: `packages/client/src/net.ts` - WebSocket handling  
- **Game Scene**: `packages/client/src/scenes/ImprovedGameScene.ts` - Active scene
- **Shared Types**: `packages/shared/src/index.ts` - All shared constants
- **E2E Tests**: `packages/server/tests/e2e/` - Multi-user test scenarios

## Known Issues (Do Not Fix Unless Related)
- TypeScript errors in client (2 errors in AssetLoader.ts, net.ts)
- One failing server test (map.spec.ts) due to import issue
- Lint commands are placeholders (echo statements)
- Phaser texture warnings are expected

## Important Notes
- NEVER cancel builds or long-running commands (use 60+ minute timeouts)
- Always run `pnpm -r build` before committing
- The server is designed to handle 30+ players but optimize for 12
- All game state is server-authoritative
- Client interpolation handles network latency