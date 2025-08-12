import express from "express";
import cors from "cors";
import colyseus from "colyseus";
import { createServer } from "http";
import { GameRoom } from "./room.js";
import authRoutes from "./routes/auth.js";
import { 
  generalRateLimit, 
  securityHeaders, 
  sanitizeInput, 
  validateRequestSize,
  secureErrorHandler 
} from "./middleware/security.js";

const { Server } = colyseus;

const port = Number(process.env.PORT || 2567);
const isDevelopment = process.env.NODE_ENV === 'development';

const app = express();

// Security middleware - must be first
app.use(securityHeaders);
app.use(validateRequestSize);

// CORS configuration with better security
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    // In development, allow localhost
    if (isDevelopment && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Default: deny
    callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

// Rate limiting
app.use(generalRateLimit);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Input sanitization
app.use(sanitizeInput);

// Health check endpoint (no auth required)
app.get("/health", (_req, res) => res.json({ 
  ok: true, 
  timestamp: new Date().toISOString(),
  version: process.env.npm_package_version || '1.0.0'
}));

// Authentication routes
app.use('/api/auth', authRoutes);

// Basic API info endpoint
app.get('/api', (_req, res) => {
  res.json({
    name: 'Toodee Game Server API',
    version: process.env.npm_package_version || '1.0.0',
    endpoints: {
      auth: '/api/auth',
      health: '/health',
      game: 'ws://localhost:2567 (WebSocket)'
    }
  });
});

// Error handling middleware - must be last
app.use(secureErrorHandler);

// Create HTTP server and Colyseus game server
const httpServer = createServer(app);
const gameServer = new Server({
  server: httpServer,
});

// Define game room
gameServer.define("toodee", GameRoom);

// Start server
httpServer.listen(port, () => {
  console.log(`[toodee] Server listening on :${port}`);
  console.log(`[toodee] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[toodee] Colyseus endpoint: ws://localhost:${port}`);
  console.log(`[toodee] API endpoint: http://localhost:${port}/api`);
  console.log(`[toodee] Health check: http://localhost:${port}/health`);
});
