# API Documentation

This document describes the client-server communication API for the Toodee Birthday Demo.

## Table of Contents

- [Connection](#connection)
- [Room Events](#room-events)
- [Player Actions](#player-actions)
- [Game State](#game-state)
- [Error Handling](#error-handling)

## Connection

### Server Endpoint

- **Development**: `ws://localhost:2567`
- **Production**: `wss://toodeegame.fly.dev`

### Connection Flow

1. Client connects to WebSocket endpoint
2. Client joins or creates room "toodee" 
3. Server responds with initial game state
4. Bidirectional communication begins

```typescript
import * as Colyseus from "colyseus.js";

const client = new Colyseus.Client("ws://localhost:2567");
const room = await client.joinOrCreate("toodee", { 
  name: "PlayerName",
  restore: null // or saved state
});
```

## Room Events

### Client → Server

#### Join Room
```typescript
// Automatically handled by Colyseus
room = await client.joinOrCreate("toodee", {
  name: string,      // Player display name
  restore?: object   // Optional saved state
});
```

#### Player Input
```typescript
room.send("input", {
  direction: "up" | "down" | "left" | "right" | "none",
  timestamp: number  // Client timestamp
});
```

#### Player Chat (Future)
```typescript
room.send("chat", {
  message: string,
  timestamp: number
});
```

### Server → Client

#### State Updates
```typescript
room.onStateChange((state: GameState) => {
  // Handle full state update
  console.log("Players:", state.players);
  console.log("Map:", state.map);
});
```

#### Player Added
```typescript
room.state.players.onAdd((player: PlayerState, key: string) => {
  console.log("Player joined:", player.name, key);
});
```

#### Player Removed
```typescript
room.state.players.onRemove((player: PlayerState, key: string) => {
  console.log("Player left:", player.name, key);
});
```

#### Player Updated
```typescript
room.state.players.onChange((player: PlayerState, key: string) => {
  console.log("Player updated:", player.name, player.x, player.y);
});
```

#### Error Messages
```typescript
room.onError((code: number, message?: string) => {
  console.error("Room error:", code, message);
});
```

## Player Actions

### Movement System

Players can move in four directions using input messages:

```typescript
// Send movement input
room.send("input", {
  direction: "up",     // Move north
  timestamp: Date.now()
});

room.send("input", {
  direction: "down",   // Move south  
  timestamp: Date.now()
});

room.send("input", {
  direction: "left",   // Move west
  timestamp: Date.now()
});

room.send("input", {
  direction: "right",  // Move east
  timestamp: Date.now()
});

room.send("input", {
  direction: "none",   // Stop moving
  timestamp: Date.now()
});
```

### Movement Validation

- Server validates all movement requests
- Collision detection prevents invalid moves
- Position updates are authoritative from server
- Client prediction can be implemented for responsiveness

## Game State

### State Schema

```typescript
interface GameState {
  players: Map<string, PlayerState>;
  map: MapState;
  tick: number;
}

interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: "up" | "down" | "left" | "right" | "none";
  isMoving: boolean;
  joinedAt: number;
}

interface MapState {
  width: number;
  height: number;
  tiles: number[][];  // 2D array of tile types
}
```

### State Synchronization

- Server sends state updates at 20 Hz (50ms intervals)
- Only changed data is transmitted (delta compression)
- Client receives authoritative position updates
- Client can interpolate between updates for smooth movement

## Error Handling

### Connection Errors

```typescript
room.onError((code: number, message?: string) => {
  switch(code) {
    case 4000:
      console.error("Room not found");
      break;
    case 4001:
      console.error("Room is full");
      break;
    case 4002:
      console.error("Invalid credentials");
      break;
    default:
      console.error("Unknown error:", message);
  }
});
```

### Reconnection Strategy

```typescript
async function connectWithRetry(maxRetries = 3, retryDelay = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const room = await client.joinOrCreate("toodee", { name, restore });
      return room;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }
}
```

### Rate Limiting

- Input messages limited to reasonable frequency
- Connection attempts rate limited
- Chat messages rate limited (when implemented)

## Future Enhancements

### Planned Features

- Player authentication and persistence
- Chat system with moderation
- Player statistics and achievements
- Map editor and custom maps
- Real-time voice chat integration
- Mobile client support

### API Versioning

- Current API version: v1
- Breaking changes will increment major version
- Backward compatibility maintained where possible
- Version negotiation during connection

---

For implementation examples, see:
- Client code: `packages/client/src/net.ts`
- Server code: `packages/server/src/room.ts`
- State definitions: `packages/server/src/state.ts`