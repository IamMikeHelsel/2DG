import express from "express";
import cors from "cors";
import colyseus from "colyseus";
import { createServer } from "http";
import { GameRoom } from "./room";
import { getEnvironmentConfig, validateEnvironment, logEnvironmentInfo } from "./config";
import { getSupabaseClient } from "./database";
import { getRedisClient, closeRedisConnection } from "./cache";

const { Server } = colyseus;

// Load and validate environment configuration
const config = getEnvironmentConfig();
logEnvironmentInfo();

const app = express();

// Configure CORS based on environment
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true
}));

// Health check endpoint with infrastructure status
app.get("/health", async (_req, res) => {
  const health: any = { 
    ok: true, 
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    services: {}
  };
  
  // Check database connectivity
  if (config.ENABLE_DATABASE) {
    try {
      const supabase = getSupabaseClient();
      // Simple query to test connection
      const { error } = await supabase.from('players').select('id').limit(1);
      health.services.database = error ? 'error' : 'healthy';
    } catch (error) {
      health.services.database = 'unavailable';
    }
  } else {
    health.services.database = 'disabled';
  }
  
  // Check cache connectivity
  if (config.ENABLE_CACHE) {
    try {
      const redis = getRedisClient();
      await redis.ping();
      health.services.cache = 'healthy';
    } catch (error) {
      health.services.cache = 'unavailable';
    }
  } else {
    health.services.cache = 'disabled';
  }
  
  // Determine overall health
  const hasErrors = Object.values(health.services).some(status => status === 'error' || status === 'unavailable');
  if (hasErrors) {
    health.ok = false;
    res.status(503);
  }
  
  res.json(health);
});

// Environment info endpoint (for debugging in non-production)
if (config.NODE_ENV !== 'production') {
  app.get("/env", (_req, res) => {
    const safeConfig = { ...config };
    // Remove sensitive data
    delete safeConfig.SUPABASE_ANON_KEY;
    delete safeConfig.SUPABASE_SERVICE_KEY;
    delete safeConfig.SESSION_SECRET;
    if (safeConfig.REDIS_URL) {
      safeConfig.REDIS_URL = safeConfig.REDIS_URL.replace(/\/\/.*@/, '//***:***@');
    }
    res.json(safeConfig);
  });
}

const httpServer = createServer(app);
const gameServer = new Server({
  server: httpServer,
});

gameServer.define("toodee", GameRoom);

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`[Server] Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Close Redis connection
    await closeRedisConnection();
    
    // Close HTTP server
    httpServer.close(() => {
      console.log('[Server] HTTP server closed');
      process.exit(0);
    });
    
    // Force exit after 10 seconds
    setTimeout(() => {
      console.log('[Server] Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
    
  } catch (error) {
    console.error('[Server] Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

httpServer.listen(config.PORT, () => {
  console.log(`[Server] Colyseus listening on port ${config.PORT}`);
  console.log(`[Server] Environment: ${config.NODE_ENV}`);
  console.log(`[Server] Health check: http://localhost:${config.PORT}/health`);
});

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});
