import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { createServer } from "http";
import { GameRoom } from "./room";
import { initializeDatabase, closeConnections } from "./db/connection";
import { persistenceService } from "./db/persistence";
import { authService } from "./db/auth";

const port = Number(process.env.PORT || 2567);

const app = express();
app.use(cors());
app.use(express.json());

// Health endpoint with database status
app.get("/health", (_req, res) => {
  res.json({ 
    ok: true, 
    persistence: persistenceService.isReady(),
    auth: authService.isReady(),
    timestamp: new Date().toISOString()
  });
});

// Simple auth endpoints for demo
app.post("/auth/login", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = await authService.authenticateUser({ username, email, password });
    
    if (user) {
      const sessionToken = authService.generateSessionToken(user);
      res.json({ success: true, user, sessionToken });
    } else {
      res.status(401).json({ success: false, error: "Authentication failed" });
    }
  } catch (error) {
    console.error("[API] Login error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.post("/auth/guest", async (req, res) => {
  try {
    const { username } = req.body;
    const user = await authService.authenticateUser({ username: username || "Guest" });
    
    if (user) {
      const sessionToken = authService.generateSessionToken(user);
      res.json({ success: true, user, sessionToken });
    } else {
      res.status(500).json({ success: false, error: "Failed to create guest account" });
    }
  } catch (error) {
    console.error("[API] Guest login error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

const httpServer = createServer(app);
const gameServer = new Server({
  server: httpServer,
});

gameServer.define("toodee", GameRoom);

// Initialize database and start server
async function startServer() {
  console.log("[Server] Initializing database connections...");
  
  const { supabaseConnected, redisConnected } = await initializeDatabase();
  
  // Initialize services
  persistenceService.initialize(supabaseConnected, redisConnected);
  authService.initialize(supabaseConnected);
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log("[Server] Graceful shutdown initiated...");
    await closeConnections();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    console.log("[Server] Graceful shutdown initiated...");
    await closeConnections();
    process.exit(0);
  });
  
  httpServer.listen(port, () => {
    console.log(`[toodee] Colyseus listening on :${port}`);
    console.log(`[toodee] Persistence: ${supabaseConnected ? 'enabled' : 'disabled'}`);
    console.log(`[toodee] Redis cache: ${redisConnected ? 'enabled' : 'disabled'}`);
  });
}

startServer().catch((error) => {
  console.error("[Server] Failed to start:", error);
  process.exit(1);
});
