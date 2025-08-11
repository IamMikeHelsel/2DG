import { Room, Client } from "colyseus";
import { GameState, Player } from "./state";
import { TICK_RATE, TILE_SIZE, MAP } from "@toodee/shared";
import { generateMichiganish, isWalkable, Grid } from "./map";

type Input = { seq: number; up: boolean; down: boolean; left: boolean; right: boolean };

export class GameRoom extends Room<GameState> {
  private inputs = new Map<string, Input>();
  private grid: Grid;
  private speed = 4; // tiles per second (server units are tiles)

  onCreate(options: any) {
    this.setPatchRate(1000 / 10); // send state ~10/s; interpolate on client
    this.setState(new GameState());
    this.state.width = MAP.width;
    this.state.height = MAP.height;

    this.grid = generateMichiganish();

    this.onMessage("input", (client, data: Input) => {
      this.inputs.set(client.sessionId, data);
    });

    this.setSimulationInterval((dtMS) => this.update(dtMS / 1000), 1000 / TICK_RATE);
  }

  onJoin(client: Client, options: any) {
    const p = new Player();
    p.id = client.sessionId;
    p.name = options?.name || "Adventurer";
    // spawn near center
    p.x = Math.floor(MAP.width * 0.45);
    p.y = Math.floor(MAP.height * 0.55);
    this.state.players.set(client.sessionId, p);
  }

  onLeave(client: Client, consented: boolean) {
    this.state.players.delete(client.sessionId);
    this.inputs.delete(client.sessionId);
  }

  update(dt: number) {
    // per-player movement
    this.state.players.forEach((p, id) => {
      const inp = this.inputs.get(id);
      if (!inp) return;
      const vel = { x: 0, y: 0 };
      if (inp.up) vel.y -= 1;
      if (inp.down) vel.y += 1;
      if (inp.left) vel.x -= 1;
      if (inp.right) vel.x += 1;
      // normalize
      if (vel.x !== 0 || vel.y !== 0) {
        const mag = Math.hypot(vel.x, vel.y);
        vel.x /= mag;
        vel.y /= mag;
      }
      const nx = p.x + vel.x * this.speed * dt;
      const ny = p.y + vel.y * this.speed * dt;

      // collision in tile space (snap to tiles)
      const tx = Math.round(nx);
      const ty = Math.round(ny);
      if (isWalkable(this.grid, tx, ty)) {
        p.x = nx;
        p.y = ny;
      }
      // direction
      if (vel.y < 0) p.dir = 0;
      else if (vel.x > 0) p.dir = 1;
      else if (vel.y > 0) p.dir = 2;
      else if (vel.x < 0) p.dir = 3;

      p.lastSeq = inp.seq >>> 0;
    });
  }
}
