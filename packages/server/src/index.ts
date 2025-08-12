import express from "express";
import cors from "cors";
import colyseus from "colyseus";
import { createServer } from "http";
import { GameRoom } from "./room";

const { Server } = colyseus;

const port = Number(process.env.PORT || 2567);

const app = express();
app.use(cors());
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const gameServer = new Server({
  server: httpServer,
});

gameServer.define("toodee", GameRoom);

httpServer.listen(port, () => {
  console.log(`[toodee] Colyseus listening on :${port}`);
});
