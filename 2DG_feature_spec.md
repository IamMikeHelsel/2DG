# 2DG Feature Specification

## Executive Summary
2DG is a multiplayer 2D top-down action RPG game built with TypeScript, Phaser 3 (client), and Colyseus (server). The game supports 12-30 concurrent players in a shared world with real-time combat, progression systems, and social features.

## Core Architecture

### Technology Stack
- **Client**: Phaser 3 game engine, TypeScript, Vite build system
- **Server**: Colyseus authoritative game server, Node.js, TypeScript
- **Networking**: WebSocket protocol with state synchronization at 20Hz
- **Monorepo**: pnpm workspace with three packages (client, server, shared)

### Performance Requirements
- Support 12-30 concurrent players per room
- Server tick rate: 20Hz (50ms intervals)
- Client framerate: 60 FPS target
- Network latency tolerance: <120ms p95
- Server tick budget: <8ms p95

## Game Features

### 1. Player System
- **Movement**: 
  - Server-authoritative with client-side prediction
  - 4-directional movement (arrow keys)
  - Speed: 4 tiles per second
  - Collision detection with terrain and other entities
  
- **Character Representation**:
  - Animated sprite with idle and walking animations
  - 4 directions (up, down, left, right)
  - Player name displayed above character
  - HP bar visualization
  
- **Stats**:
  - HP/MaxHP
  - Level (1-100)
  - Experience points
  - Gold currency
  - Attack power
  - Defense
  - Speed modifier

### 2. Combat System
- **Melee Combat**:
  - Click to attack
  - 400ms cooldown between attacks
  - Damage calculation: `baseDamage * (1 + attackPower/10) - target.defense`
  - Range: 1.5 tiles
  
- **Ranged Combat**:
  - Projectile system
  - Projectiles travel at 8 tiles/second
  - Collision detection with targets

### 3. Monster/Mob System
- **Mob Types**:
  - RedSlime, BlueSlime, GreenSlime
  - Goblin, Wolf
  - Each with unique stats and behaviors
  
- **AI Behavior States**:
  - Idle: Standing still
  - Patrol: Random movement within zone
  - Chasing: Following players within aggro range
  - Attacking: Dealing damage when in range
  - Fleeing: Running away at low HP
  
- **Spawning**:
  - Zone-based spawn points
  - Respawn timer: 30 seconds
  - Max mobs per zone: 10

### 4. World System
- **Map**:
  - Michigan-shaped island design
  - Tile-based terrain (16x16 or 32x32 pixels per tile)
  - Multiple terrain types: grass, water, dirt, stone, sand
  - Walkable vs non-walkable tiles
  
- **Zones**:
  - Starting Area
  - Forest Zone  
  - Desert Zone
  - Mountain Zone
  - Boss Arena
  - Each zone has different mob types and difficulty

### 5. Progression System
- **Experience & Leveling**:
  - XP gained from defeating mobs
  - Level up increases stats
  - XP required per level: `level * 100`
  
- **Loot System**:
  - Mobs drop items on death
  - Loot tables with rarity tiers
  - Common (70%), Rare (25%), Epic (5%)
  - Items: weapons, armor, consumables, crafting materials

### 6. Inventory & Equipment
- **Inventory**:
  - 20 slot grid system
  - Stack-able items (consumables, materials)
  - Drag and drop interface
  
- **Equipment Slots**:
  - Weapon
  - Armor
  - Accessory
  - Equipment provides stat bonuses

### 7. Crafting System
- **Recipes**:
  - Combine materials to create items
  - Recipe discovery through gameplay
  - Crafting success rates
  
- **Materials**:
  - Gathered from mob drops
  - Found in world locations
  - Purchased from shops

### 8. Shop/Merchant System
- **NPC Merchants**:
  - Located in safe zones
  - Buy/sell interface
  - Dynamic pricing based on player level
  - Special items refresh daily

### 9. Social Features
- **Chat System**:
  - Global chat channel
  - Proximity-based local chat
  - Chat commands (/help, /who, /whisper)
  - Profanity filter
  
- **Player Interactions**:
  - See other players in real-time
  - Trade system between players
  - Party/group system (up to 4 players)

### 10. Founder Rewards System
- **Tiers**:
  - First 10 players: Legendary Founder
  - Players 11-50: Epic Founder  
  - Players 51-200: Rare Founder
  - Players 201-1000: Common Founder
  
- **Benefits**:
  - Unique titles displayed above name
  - Bonus starting gold
  - Exclusive cosmetic items
  - XP boost percentage

## User Interface

### HUD Elements
- **Health/Mana bars** (top-left)
- **Mini-map** (top-right)
- **Hotbar** (bottom-center) - 10 slots for items/skills
- **Chat window** (bottom-left)
- **XP bar** (bottom)
- **Gold/currency display** (top-left)

### Menus
- **Main Menu**: Play, Settings, Credits
- **Settings**: Audio, Graphics, Controls
- **Inventory**: Grid-based item management
- **Character Stats**: View detailed stats and equipment
- **Shop Interface**: Buy/sell with NPCs

## Technical Implementation

### Client-Server Communication
```typescript
// Message Types
- "input": Player movement/action input
- "attack": Combat action
- "chat": Chat messages  
- "shop_buy": Purchase from merchant
- "shop_sell": Sell to merchant
- "craft": Crafting request
- "trade": Player trade actions
```

### State Synchronization
```typescript
// Synchronized State
GameState {
  players: Map<string, Player>
  mobs: Map<string, Mob>
  droppedItems: Map<string, DroppedItem>
  projectiles: Map<string, Projectile>
}

// Player State
Player {
  id: string
  name: string
  x: number
  y: number
  hp: number
  maxHp: number
  level: number
  xp: number
  gold: number
  equipment: Equipment
  inventory: Item[]
  founderTier?: FounderTier
}
```

### Client Prediction & Reconciliation
- Client predicts movement locally
- Server validates and broadcasts authoritative state
- Client reconciles predictions with server state
- Input buffer maintains last 60 inputs for replay

## Deployment

### Development
```bash
pnpm install
pnpm dev:server  # Runs on ws://localhost:2567
pnpm dev:client  # Runs on http://localhost:5173
```

### Production
- Docker containerization
- Fly.io deployment configuration
- Auto-scaling based on player count
- SSL/TLS for secure WebSocket connections
- CDN for static assets

## Testing Requirements

### Load Testing
- Support 12 concurrent players minimum
- Target 30 concurrent players
- Maintain <8ms server tick time at full capacity

### End-to-End Tests
- Multi-player movement synchronization
- Combat interactions between players
- Shop transactions
- Zone transitions
- Full gameplay scenarios

## Success Metrics
- 12+ concurrent players without lag
- <120ms average latency
- 60 FPS client performance
- <1% disconnect rate
- Server uptime >99.9%

## Known Technical Debt
- Three different scene implementations (GameScene, ImprovedGameScene, EnhancedGameScene) need consolidation
- TypeScript compilation has 2 known errors in client
- Sprite generation system needs optimization
- Missing some message handlers (ping, bug_report)

## Future Enhancements
- Boss battles with unique mechanics
- Guild/clan system
- Leaderboards and achievements
- Seasonal events
- Mobile touch controls
- Voice chat integration
- Procedural dungeon generation
- PvP arena mode