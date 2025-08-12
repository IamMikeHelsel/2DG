# Toodee Birthday Demo (Phaser + Colyseus + TypeScript)

This is a minimal, production-friendly scaffold for a web-playable 2D MMO demo.

- **Client**: Phaser 3 + Vite + TypeScript
- **Server**: Node + Colyseus (authoritative) + TypeScript
- **Shared**: constants/types usable by both
- **Content**: tiny placeholder Michigan-inspired map
- **CI**: GitHub Actions for client (Pages) & server (Fly.io)
- **Deploy**: Fly.io for server, GitHub Pages for client

## Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm 9+ (automatically enabled via corepack)
- Git

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd 2DGameDemo
   pnpm i
   ```

2. **Environment setup:**
   ```bash
   # Copy environment templates
   cp .env.example .env
   cp packages/client/.env.example packages/client/.env
   cp packages/server/.env.example packages/server/.env
   ```

3. **Development (Option A - Both services):**
   ```bash
   # Start both server and client with hot reloading
   pnpm dev:all
   ```
   - Server: http://localhost:2567
   - Client: http://localhost:5173

4. **Development (Option B - Individual services):**
   ```bash
   # Terminal 1: Start server (Colyseus)
   pnpm dev:server
   
   # Terminal 2: Start client (Phaser)  
   pnpm dev:client
   ```

5. **Development (Option C - Docker):**
   ```bash
   # Start with Docker (includes hot reloading)
   docker-compose -f docker-compose.dev.yml up
   ```

### Development Commands

```bash
# Build all packages
pnpm build

# Run tests
pnpm test

# Lint and format code
pnpm lint           # Check and auto-fix linting issues
pnpm format         # Format all files with Prettier
pnpm format:check   # Check formatting without changes

# Type checking
pnpm typecheck

# Individual package commands
pnpm -F @toodee/server dev    # Server only
pnpm -F @toodee/client dev    # Client only  
pnpm -F @toodee/shared build  # Shared package only
```

## Development Environment

### VS Code Setup

1. Install recommended extensions (auto-prompted when opening the workspace)
2. Open the workspace file: `.vscode/toodee-birthday-demo.code-workspace`
3. Format on save and ESLint auto-fix are pre-configured

### Code Quality

- **ESLint**: Configured for TypeScript with Prettier integration
- **Prettier**: Consistent code formatting
- **Git Hooks**: Pre-commit linting and formatting, pre-push testing
- **TypeScript**: Strict type checking across all packages

## Environment Variables

### Client (.env)
```bash
VITE_SERVER_URL=ws://localhost:2567  # WebSocket server URL
VITE_DEBUG=true                      # Enable debug mode
```

### Server (.env)  
```bash
NODE_ENV=development    # Environment mode
PORT=2567              # Server port
TICK_RATE=20           # Game tick rate (Hz)
MAX_PLAYERS=100        # Maximum concurrent players
DEBUG=true             # Enable debug logging
LOG_LEVEL=debug        # Logging level
```

## Architecture

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
.vscode/           # VS Code workspace configuration
```

### Networking Architecture

- **Server Authority**: Server at `localhost:2567` is authoritative for all game state
- **Client Connection**: Client connects via WebSocket to Colyseus room "toodee"
- **Tick Rate**: Server runs at 20 Hz (50ms tick rate)
- **Input Handling**: Client sends input messages, server processes and updates authoritative state

## Deployment

### Production Deploy (Server – Fly.io)

```bash
fly launch --no-deploy
# Edit fly.toml app name to "toodeegame" or your choice

# Set secrets in GitHub:
#   FLY_API_TOKEN
#   VITE_SERVER_URL  (used by client build)
```

### Client Deploy (GitHub Pages)

Client automatically deploys to GitHub Pages on push to main branch.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines and workflow.

## Troubleshooting

### Common Issues

1. **Build failures**: Ensure all dependencies are installed with `pnpm i`
2. **TypeScript errors**: Run `pnpm typecheck` to see all type issues
3. **Connection issues**: Verify server is running on port 2567
4. **Port conflicts**: Change ports in environment files if needed

### Getting Help

- Check the [GitHub Issues](../../issues) for known problems
- Review the [API documentation](docs/API.md) for implementation details
- Join our Discord community for real-time support

---

### Notes

- The map renderer uses simple colored tiles (no external images) at 32×32. Swap to Tiled/atlas later.
- Networking: 20 Hz server tick; client sends directional inputs; server is authoritative.
