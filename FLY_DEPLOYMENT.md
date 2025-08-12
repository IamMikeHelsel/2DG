# Fly.io Deployment Guide for Toodeegame

## Prerequisites

- Fly.io account (sign up at https://fly.io)
- Fly CLI installed (already done)
- GitHub repository configured

## 1. Initial Setup

### Authenticate with Fly.io

```bash
export PATH="/Users/mike/.fly/bin:$PATH"  # Add to your ~/.zshrc
flyctl auth login
```

### Create the Fly.io App

```bash
# This creates the app on Fly.io (only needed once)
flyctl apps create toodeegame --org personal
```

## 2. Environment Variables & Secrets

### Set required secrets for your app:

```bash
# Database (Supabase)
flyctl secrets set SUPABASE_URL="your-supabase-url-here"
flyctl secrets set SUPABASE_ANON_KEY="your-supabase-anon-key-here"
flyctl secrets set SUPABASE_SERVICE_KEY="your-supabase-service-key-here"

# Redis (Upstash) - if using
flyctl secrets set REDIS_URL="your-redis-url-here"

# Optional: Sentry for error tracking
flyctl secrets set SENTRY_DSN="your-sentry-dsn-here"

# Optional: Session secret
flyctl secrets set SESSION_SECRET="your-random-session-secret-here"
```

### View current secrets:

```bash
flyctl secrets list
```

## 3. Deployment

### Manual Deploy

```bash
# Deploy from local directory
flyctl deploy

# Deploy with specific build args
flyctl deploy --build-arg NODE_ENV=production
```

### Monitor Deployment

```bash
# Watch logs
flyctl logs

# Check app status
flyctl status

# SSH into the container (for debugging)
flyctl ssh console
```

## 4. GitHub Actions Setup

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Fly.io
on:
  push:
    branches: [main]
    paths:
      - "packages/server/**"
      - "packages/shared/**"
      - "Dockerfile"
      - "fly.toml"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### Get your Fly API token:

```bash
flyctl auth token
```

Then add it to GitHub Secrets as `FLY_API_TOKEN`

## 5. Scaling & Management

### Scale the app:

```bash
# Scale to 2 instances
flyctl scale count 2

# Scale memory/CPU
flyctl scale vm shared-cpu-1x --memory 1024

# View current scale
flyctl scale show
```

### Regions:

```bash
# Add regions for better latency
flyctl regions add lax  # Los Angeles
flyctl regions add ewr  # New Jersey

# View current regions
flyctl regions list
```

## 6. Custom Domain (Optional)

```bash
# Add custom domain
flyctl certs create yourgame.com

# View DNS instructions
flyctl certs show yourgame.com
```

## 7. Monitoring

### View metrics:

```bash
flyctl dashboard metrics
```

### Open dashboard:

```bash
flyctl dashboard
```

## 8. Useful Commands

```bash
# Restart app
flyctl restart

# View recent deployments
flyctl releases

# Rollback to previous version
flyctl deploy --image registry.fly.io/toodeegame:deployment-XXXXX

# Suspend app (stop billing)
flyctl scale count 0

# Resume app
flyctl scale count 1

# Destroy app (careful!)
flyctl apps destroy toodeegame
```

## 9. Client Configuration

Update your client to connect to Fly.io server:

In `packages/client/.env`:

```
VITE_SERVER_URL=wss://toodeegame.fly.dev
```

Or for local development:

```
VITE_SERVER_URL=ws://localhost:2567
```

## 10. Troubleshooting

### Common Issues:

1. **Port mismatch**: Ensure server listens on PORT env var or 2567
2. **WebSocket issues**: Check that handlers include "http" not just "tls"
3. **Memory issues**: Scale up if getting OOM errors
4. **Cold starts**: Set min_machines_running = 1 to avoid

### Debug commands:

```bash
# Check recent logs
flyctl logs --tail 100

# Check machine status
flyctl machine list

# SSH and check processes
flyctl ssh console
ps aux
netstat -tulpn
```

## Cost Estimation

Free tier includes:

- 3 shared-cpu-1x VMs (1 vCPU, 256MB RAM)
- 3GB persistent storage
- 160GB outbound data transfer

For the game (estimated monthly):

- 1 VM with 512MB RAM: ~$5
- Additional regions: ~$5 per region
- Total: $5-15/month for small-scale

## Next Steps

1. Set up Supabase database
2. Configure Redis for session management
3. Set up Sentry for error tracking
4. Configure GitHub Actions for auto-deploy
5. Add monitoring and alerts
