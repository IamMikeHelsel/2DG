import express from "express";
import cors from "cors";
import colyseus from "colyseus";
import { createServer } from "http";
import { GameRoom } from "./room";
import { InstanceManager } from "./instanceManager";
import { JoinInstanceOptions } from "@toodee/shared";

const { Server } = colyseus;

const port = Number(process.env.PORT || 2567);

const app = express();
app.use(cors());
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const gameServer = new Server({
  server: httpServer,
});

// Initialize instance manager
const instanceManager = new InstanceManager(gameServer);

// API endpoints for instance management
app.get("/api/instances", (_req, res) => {
  res.json(instanceManager.getInstances());
});

app.post("/api/join-instance", (req, res) => {
  const { partyId } = req.body;
  const bestInstance = instanceManager.findBestInstance(partyId);
  
  if (bestInstance) {
    res.json({ instanceId: bestInstance });
  } else {
    res.status(503).json({ error: "No available instances" });
  }
});

// Legacy room type for backward compatibility (redirects to instance)
gameServer.define("toodee", GameRoom);

httpServer.listen(port, () => {
  console.log(`[toodee] Colyseus listening on :${port}`);
});
