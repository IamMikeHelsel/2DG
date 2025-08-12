# Infrastructure Deployment Guide

This guide covers the complete production infrastructure setup for the Toodee Birthday Demo 2D MMO.

## 🏗️ Infrastructure Overview

### Components
- **Server**: Node.js + Colyseus on Fly.io
- **Client**: Vite + Phaser 3 on GitHub Pages
- **Database**: Supabase (PostgreSQL)
- **Cache**: Upstash Redis
- **CDN**: GitHub Pages / Cloudflare (optional)
- **Monitoring**: Built-in health checks + optional Sentry

### Environments
- **Development**: Local development with optional services
- **Staging**: `toodeegame-staging.fly.dev` (scaled to zero when not in use)
- **Production**: `toodeegame.fly.dev` (always running)

## 🚀 Initial Setup

### 1. Prerequisites
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Install Node.js 20+
# Install pnpm
npm install -g pnpm
```

### 2. Fly.io Setup
```bash
# Login to Fly.io
flyctl auth login

# Create production app (if not exists)
flyctl apps create toodeegame --org personal

# Create staging app (if not exists)  
flyctl apps create toodeegame-staging --org personal
```

### 3. Database Setup (Supabase)

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the following SQL in the Supabase SQL editor:

```sql
-- Create players table
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  founder_tier TEXT DEFAULT 'none',
  join_timestamp BIGINT DEFAULT EXTRACT(epoch FROM NOW()) * 1000,
  join_order INTEGER,
  bug_reports_submitted INTEGER DEFAULT 0,
  referrals_count INTEGER DEFAULT 0,
  unlocked_rewards TEXT[] DEFAULT '{}',
  anniversary_participated BOOLEAN DEFAULT FALSE,
  last_seen BIGINT DEFAULT EXTRACT(epoch FROM NOW()) * 1000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game sessions table
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT REFERENCES players(id),
  session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_end TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  x_position REAL,
  y_position REAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bug reports table
CREATE TABLE bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT REFERENCES players(id),
  description TEXT NOT NULL,
  reproduction_steps TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_players_join_order ON players(join_order);
CREATE INDEX idx_players_founder_tier ON players(founder_tier);
CREATE INDEX idx_game_sessions_player_id ON game_sessions(player_id);
CREATE INDEX idx_game_sessions_start ON game_sessions(session_start);
CREATE INDEX idx_bug_reports_player_id ON bug_reports(player_id);
CREATE INDEX idx_bug_reports_status ON bug_reports(status);

-- Enable RLS (Row Level Security)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Add policies (adjust as needed for your security requirements)
CREATE POLICY "Players can read their own data" ON players FOR SELECT USING (true);
CREATE POLICY "Game can create and update players" ON players FOR ALL USING (true);
CREATE POLICY "Game can manage sessions" ON game_sessions FOR ALL USING (true);
CREATE POLICY "Game can manage bug reports" ON bug_reports FOR ALL USING (true);
```

3. Get your project URL and keys from Supabase dashboard settings

### 4. Redis Setup (Upstash)

1. Create account at [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Copy the Redis URL from the dashboard

### 5. Environment Variables Setup

#### GitHub Secrets (Required)
Set these in your GitHub repository settings under Secrets and Variables > Actions:

```
FLY_API_TOKEN=your-fly-api-token-here
VITE_SERVER_URL=wss://toodeegame.fly.dev
VITE_SERVER_URL_STAGING=wss://toodeegame-staging.fly.dev
```

#### Fly.io Secrets (Production)
```bash
# Set production secrets
flyctl secrets set \
  SUPABASE_URL="https://your-project.supabase.co" \
  SUPABASE_ANON_KEY="your-anon-key" \
  SUPABASE_SERVICE_KEY="your-service-key" \
  REDIS_URL="your-redis-url" \
  SESSION_SECRET="your-random-session-secret" \
  --app toodeegame

# Optional: Set up monitoring
flyctl secrets set SENTRY_DSN="your-sentry-dsn" --app toodeegame
```

#### Fly.io Secrets (Staging)
```bash
# Set staging secrets (can use same DB with different prefixes)
flyctl secrets set \
  SUPABASE_URL="https://your-project.supabase.co" \
  SUPABASE_ANON_KEY="your-anon-key" \
  SUPABASE_SERVICE_KEY="your-service-key" \
  REDIS_URL="your-redis-url" \
  SESSION_SECRET="staging-session-secret" \
  --app toodeegame-staging
```

## 📦 Deployment

### Automatic Deployment (Recommended)

Deployments are triggered automatically when code is pushed to the `main` branch:

- **Client**: Deployed to GitHub Pages
- **Server**: Deployed to Fly.io production

### Manual Deployment

#### Deploy Server
```bash
# Production
flyctl deploy --app toodeegame

# Staging  
flyctl deploy --config fly.staging.toml --app toodeegame-staging
```

#### Deploy Client via GitHub Actions
Go to Actions > Run workflow > Select environment

### Zero-Downtime Deployments

Production deployments use rolling strategy:
- `max_unavailable = 0.5` ensures at least 50% capacity during deployment
- Health checks prevent traffic routing to unhealthy instances
- Automatic rollback on failed health checks

## 🔄 Rollback Procedures

### Automatic Rollback
Use the GitHub Actions rollback workflow:

1. Go to Actions > "rollback-deployment" 
2. Click "Run workflow"
3. Select target (server/client/both) and environment
4. Optionally specify version (defaults to previous)

### Manual Server Rollback
```bash
# List recent releases
flyctl releases list --app toodeegame

# Rollback to previous release
flyctl deploy --image registry.fly.io/toodeegame:deployment-01HXX --app toodeegame
```

### Manual Client Rollback
Re-run a previous successful GitHub Actions workflow or deploy from a specific commit.

## 📊 Monitoring & Health Checks

### Health Check Endpoints
- **Production**: `https://toodeegame.fly.dev/health`
- **Staging**: `https://toodeegame-staging.fly.dev/health`

### Health Check Response
```json
{
  "ok": true,
  "timestamp": "2024-08-12T14:30:00.000Z",
  "environment": "production",
  "services": {
    "database": "healthy",
    "cache": "healthy"
  }
}
```

### Monitoring Commands
```bash
# View logs
flyctl logs --app toodeegame

# View metrics
flyctl dashboard metrics --app toodeegame

# SSH into container
flyctl ssh console --app toodeegame

# Scale app
flyctl scale count 2 --app toodeegame
flyctl scale vm shared-cpu-1x --memory 1024 --app toodeegame
```

## 🛡️ Security Configuration

### Environment Variables
- All sensitive data stored as Fly.io secrets
- Environment-specific configuration
- Rate limiting in production
- CORS configured per environment

### Database Security
- Row Level Security (RLS) enabled
- Connection pooling via Supabase
- Encrypted connections

### Network Security
- HTTPS enforced on Fly.io
- WebSocket over WSS in production
- Private networking between services

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database status in health endpoint
curl https://toodeegame.fly.dev/health

# Check logs for database errors
flyctl logs --app toodeegame | grep -i database
```

#### Redis Connection Issues  
```bash
# Check cache status in health endpoint
curl https://toodeegame.fly.dev/health

# Test Redis connectivity
flyctl ssh console --app toodeegame
# Then in container: redis-cli ping
```

#### Deployment Failures
```bash
# Check deployment status
flyctl status --app toodeegame

# View detailed logs
flyctl logs --app toodeegame

# Force redeploy
flyctl deploy --force --app toodeegame
```

### Performance Issues
```bash
# Monitor resource usage
flyctl dashboard metrics --app toodeegame

# Scale up if needed
flyctl scale vm shared-cpu-2x --memory 1024 --app toodeegame

# Add more regions
flyctl regions add lax ewr --app toodeegame
```

## 💰 Cost Estimation

### Fly.io (Monthly)
- **Production**: $5-10/month (1 instance, 512MB RAM)
- **Staging**: $0-5/month (scales to zero, minimal usage)

### Supabase
- **Free tier**: 2 databases, 500MB storage, 2GB bandwidth
- **Pro tier**: $25/month for higher limits

### Upstash Redis
- **Free tier**: 10K commands/day
- **Pay-per-request**: ~$0.20 per 100K requests

### GitHub Pages
- **Free**: Unlimited for public repositories

### Total Estimated Cost
- **Development**: $0/month (free tiers)
- **Small Production**: $5-15/month
- **Scaling Production**: $25-50/month

## 📚 Additional Resources

- [Fly.io Documentation](https://fly.io/docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [Upstash Documentation](https://docs.upstash.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## 🆘 Support Contacts

For infrastructure issues:
1. Check health endpoints first
2. Review logs via `flyctl logs`
3. Consult this documentation
4. Check GitHub Actions workflow logs
5. Contact infrastructure team if needed