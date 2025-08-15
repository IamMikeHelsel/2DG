# Toodee Birthday Demo (Phaser + Colyseus + TypeScript)

This is a minimal, production-friendly scaffold for a web-playable 2D MMO demo, **ready for 12-player testing**.

- Client: Phaser 3 + Vite + TypeScript
- Server: Node + Colyseus (authoritative) + TypeScript
- Shared: constants/types usable by both
- Content: tiny placeholder Michigan-inspired map
- Testing: Comprehensive E2E test ecosystem for multi-user gameplay
- Load Testing: Built-in tool for simulating up to 30+ concurrent players
- CI: GitHub Actions for client (Pages) & server (Fly.io)
- Deploy: Fly.io for server, GitHub Pages for client

## Quick Start for 12-Player Testing

### Prerequisites
- Node.js 18+ installed
- pnpm 9+ (`npm install -g pnpm@9`)
- 12 testers with modern web browsers
- Stable internet connection

### Setup Instructions

```bash
# 1. Install dependencies (takes ~30 seconds)
pnpm i

# 2. Start both server and client together
pnpm dev:all

# Server runs at: ws://localhost:2567
# Client runs at: http://localhost:5173
```

### For Remote Testing (Recommended for 12 players)

1. **Host Machine Setup:**
   ```bash
   # Start the server and client
   pnpm dev:all
   ```

2. **Share Your IP Address:**
   - Find your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
   - Share with testers: `http://YOUR_IP:5173`
   - Example: `http://192.168.1.100:5173`

3. **Firewall Configuration:**
   - Allow ports 5173 (client) and 2567 (WebSocket server)
   - Windows: May prompt to allow Node.js through firewall
   - Mac: System Preferences → Security & Privacy → Firewall

## Testing

### Automated Testing

The project includes comprehensive testing for both individual components and complete multi-user scenarios:

```bash
# Run all tests (unit + E2E)
pnpm test

# Run only unit tests (fast)
pnpm test:unit

# Run only E2E tests (comprehensive multi-user scenarios)
pnpm test:e2e
```

See [E2E_TESTING.md](./E2E_TESTING.md) for detailed information about the end-to-end test ecosystem.

### Load Testing for 12+ Players

**Test the server's capacity before your session:**

```bash
# Test with 12 bot players for 60 seconds
cd tools && npm install && cd ..
node tools/load-test.js

# Test with custom player count and duration
PLAYERS=12 DURATION=120 node tools/load-test.js

# Test against remote server
SERVER_URL=ws://192.168.1.100:2567 PLAYERS=12 node tools/load-test.js
```

**Expected Performance:**
- ✅ 12 players: <50ms average latency, <100ms p95
- ✅ Server tick time: <8ms with 12 players
- ✅ Smooth gameplay with all players moving simultaneously

## Testing Checklist for 12 Players

### Before Testing
- [ ] Run `pnpm i` to install dependencies
- [ ] Run `pnpm -r build` to verify builds work
- [ ] Run load test with 12 bots: `PLAYERS=12 node tools/load-test.js`
- [ ] Verify server performance metrics are green
- [ ] Share connection URL with all testers

### During Testing
1. **Connection Phase (5 min)**
   - All 12 players connect via browser
   - Each player enters a unique name
   - Verify all players appear on screen

2. **Movement Testing (10 min)**
   - All players move simultaneously using arrow keys
   - Test collision detection near walls
   - Test player-to-player interactions

3. **Feature Testing (15 min)**
   - Chat system: Everyone sends messages
   - Combat: Players attack training dummies
   - Shopping: Visit merchant (if implemented)

4. **Stress Testing (10 min)**
   - All players move rapidly in random directions
   - Spam chat messages
   - Rapid connect/disconnect cycles

### What to Monitor
- Server console for performance warnings
- Client browser console for connection errors
- Visual lag or stuttering
- Chat message delivery delays

## Environment Variables

- Client: `VITE_SERVER_URL` (default: `ws://localhost:2567`)
- Server: `PORT` (default: 2567), `NODE_ENV`

For remote testing:
```bash
# Start client with custom server URL
VITE_SERVER_URL=ws://192.168.1.100:2567 pnpm -F @toodee/client dev
```

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

## Troubleshooting 12-Player Sessions

### Common Issues

1. **"Can't connect to server"**
   - Ensure firewall allows ports 5173 and 2567
   - Check server is running (look for "Colyseus listening on ws://localhost:2567")
   - Try using IP address instead of localhost

2. **"Players disconnecting randomly"**
   - Check server console for memory/CPU warnings
   - Ensure stable internet for all players
   - Run load test first to verify capacity

3. **"Lag with 12 players"**
   - Normal latency: <100ms for local network
   - Check server performance logs (printed every 30s)
   - Reduce other network usage during testing

4. **"Can't see other players"**
   - Refresh browser (F5)
   - Check browser console for WebSocket errors
   - Ensure all players using same server URL

### Performance Expectations

- **12 Players**: Smooth gameplay, <100ms latency
- **20 Players**: Playable, occasional lag spikes
- **30+ Players**: Stress test territory, expect issues

### Quick Commands Reference

```bash
# Start everything
pnpm dev:all

# Just the server
pnpm dev:server

# Just the client  
pnpm dev:client

# Run load test
PLAYERS=12 node tools/load-test.js

# Build for production
pnpm -r build
```

### Notes
- The map renderer uses simple colored tiles (no external images) at 32×32
- Networking: 20 Hz server tick rate (50ms); clients interpolate
- Server is authoritative for all game state
- WebSocket protocol for real-time communication
