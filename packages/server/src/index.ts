import express from "express";
import cors from "cors";
import colyseus from "colyseus";
import { createServer } from "http";
import { GameRoom } from "./room";
import { createServerMonitoring } from "./monitoring";

const { Server } = colyseus;

const port = Number(process.env.PORT || 2567);

// Initialize monitoring
const monitoring = createServerMonitoring({
  sentryDsn: process.env.SENTRY_DSN,
  posthogApiKey: process.env.POSTHOG_API_KEY,
  logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info'
});

const app = express();
app.use(cors());

// Health endpoint
app.get("/health", (_req, res) => {
  try {
    const health = monitoring.getHealthStatus();
    res.json(health);
  } catch (error) {
    monitoring.recordError(error as Error, { endpoint: '/health' });
    res.status(500).json({ status: 'error', message: 'Health check failed' });
  }
});

// Metrics endpoint
app.get("/metrics", (_req, res) => {
  try {
    const metrics = monitoring.getMetrics();
    res.json(metrics);
  } catch (error) {
    monitoring.recordError(error as Error, { endpoint: '/metrics' });
    res.status(500).json({ status: 'error', message: 'Metrics fetch failed' });
  }
});

// Request monitoring middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    monitoring.trackUserEvent('server', 'api_request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration
    });
  });
  
  next();
});

const httpServer = createServer(app);
const gameServer = new Server({
  server: httpServer,
});

// Pass monitoring to GameRoom
gameServer.define("toodee", GameRoom, { monitoring });

// Error handling
process.on('uncaughtException', (error) => {
  monitoring.recordError(error, { type: 'uncaughtException' });
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  monitoring.recordError(new Error(`Unhandled Rejection: ${reason}`), { 
    type: 'unhandledRejection',
    promise: promise.toString()
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await monitoring.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await monitoring.shutdown();
  process.exit(0);
});

httpServer.listen(port, () => {
  console.log(`[toodee] Colyseus listening on :${port}`);
  monitoring.trackUserEvent('server', 'server_started', { port });
});
