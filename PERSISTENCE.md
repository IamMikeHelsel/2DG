# 2DGameDemo Persistence System

This document describes the persistence and save system implementation for the 2DGameDemo.

## Overview

The persistence system provides:
- ✅ Account creation and authentication
- ✅ Character creation with names
- ✅ Save character position, stats, and game state
- ✅ Auto-save every 30 seconds
- ✅ Save on logout/disconnect
- ✅ Database integration with graceful fallbacks

## Architecture

### Database Layer
- **Primary Database**: Supabase (PostgreSQL + Auth)
- **Session Cache**: Redis (optional)
- **Fallback**: In-memory + localStorage for offline/development mode

### Key Components

#### Server Components
- `src/db/connection.ts` - Database connection and initialization
- `src/db/persistence.ts` - Character and game state persistence service
- `src/db/auth.ts` - Authentication and session management
- `src/db/schema.sql` - Database schema with tables for accounts, characters, inventory, and rewards

#### Client Components  
- `src/auth.ts` - Client-side authentication utilities
- Integration in `ImprovedGameScene.ts` for seamless auth flow

### Database Schema

```sql
-- Characters table (main player data)
characters {
  id: UUID (primary key)
  user_id: UUID (references auth.users)
  name: VARCHAR(50)
  x, y: FLOAT (position)
  hp, max_hp: INTEGER (health)
  gold: INTEGER (currency)
  founder_tier: VARCHAR(20) (rewards system)
  // ... more fields
}

-- Inventories table (item storage)
inventories {
  character_id: UUID (references characters)
  slot_index: INTEGER
  item_id: VARCHAR(50)
  quantity: INTEGER
}

-- Character rewards (unlocked rewards tracking)
character_rewards {
  character_id: UUID
  reward_id: VARCHAR(50)
  unlocked_at: TIMESTAMP
}
```

## Features Implemented

### ✅ Account System
- Guest authentication for development/demo
- Session token-based auth with JWT
- Automatic account creation on first login
- Graceful fallback when database is unavailable

### ✅ Character Persistence
- Automatic character creation with customizable names
- Position, health, gold, and stats persistence
- Founder rewards system integration
- Inventory tracking (potions, items)

### ✅ Auto-Save System
- Saves every 30 seconds automatically
- Saves on player disconnect/logout  
- Transactional updates to prevent data loss
- Redis caching for improved performance

### ✅ Session Management
- JWT-based session tokens (24 hour expiry)
- Redis session caching (when available)
- Client-side auth token storage
- Automatic re-authentication on token expiry

## Configuration

### Environment Variables

Create `.env` in `packages/server/`:

```bash
# Required for full persistence (optional for development)
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional (Redis caching)
REDIS_URL=redis://localhost:6379

# Security (generate a strong secret for production)
JWT_SECRET=your-jwt-secret-key
```

### Development Setup

1. **Without Database** (Development Mode):
   ```bash
   pnpm dev:all
   ```
   - Uses guest authentication
   - Falls back to localStorage persistence
   - No setup required

2. **With Supabase** (Full Persistence):
   ```bash
   # 1. Create Supabase project
   # 2. Run schema.sql in Supabase SQL Editor  
   # 3. Configure environment variables
   # 4. Start development
   pnpm dev:all
   ```

## Usage Examples

### Client Authentication
```typescript
import { ClientAuth } from './auth';

// Authenticate as guest (creates account automatically)
const auth = await ClientAuth.getOrCreateAuth('PlayerName');

// Connect to game room with auth
const room = await client.joinOrCreate("toodee", {
  sessionToken: auth.sessionToken,
  username: auth.username
});
```

### Server Persistence
```typescript
// Auto-save happens automatically every 30 seconds
// Manual save:
await persistenceService.saveCharacter(player, userId);

// Load character:
const character = await persistenceService.getOrCreateCharacter(userId, name);
```

## API Endpoints

### Authentication
- `POST /auth/guest` - Create guest account
  ```json
  { "username": "PlayerName" }
  ```
  
- `POST /auth/login` - Login (placeholder for full auth)
  ```json
  { "username": "user", "password": "pass" }  
  ```

### Health Check
- `GET /health` - Server and database status
  ```json
  {
    "ok": true,
    "persistence": true,
    "auth": true,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

## Migration from Legacy System

The system maintains backward compatibility:

1. **Existing saves**: Legacy localStorage saves are imported on first login
2. **Character data**: Position, gold, potions transferred automatically  
3. **Names**: Existing character names preserved
4. **Graceful fallback**: Works without database for development

## Testing

Run persistence tests:
```bash
pnpm -F @toodee/server test
```

Test coverage includes:
- Authentication flow (guest accounts)
- Character creation and loading
- Save/load operations with fallbacks
- Session token generation and validation

## Production Deployment

For production deployment:

1. **Database Setup**:
   - Create Supabase project
   - Apply schema.sql
   - Configure RLS policies
   - Set environment variables

2. **Security**:
   - Generate strong JWT_SECRET
   - Use HTTPS for auth endpoints
   - Configure Supabase auth rules

3. **Monitoring**:
   - Monitor database connection health
   - Track save operation success rates
   - Monitor Redis cache hit rates (if used)

## Troubleshooting

### Common Issues

1. **"Supabase connection failed"**
   - Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
   - Verify Supabase project is active
   - System falls back to guest mode automatically

2. **"Redis connection failed"**  
   - Check REDIS_URL configuration
   - Redis is optional - system works without it
   - Only affects session caching performance

3. **"Authentication required"**
   - Ensure client sends sessionToken or username
   - Check JWT_SECRET matches between client/server
   - Verify token hasn't expired (24 hour limit)

### Debug Mode

Enable debug logging:
```bash
DEBUG=* pnpm -F @toodee/server dev
```

This shows detailed logs for:
- Database connections
- Authentication attempts
- Save/load operations
- Auto-save cycles