import Phaser from "phaser";
import { createClient } from "../net";
import { TILE_SIZE, MAP } from "@toodee/shared";

type ServerPlayer = { id: string; x: number; y: number; dir: number; };

export class GameScene extends Phaser.Scene {
  private room?: any;
  private players = new Map<string, Phaser.GameObjects.Rectangle>();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private seq = 0;
  private mapLayer!: Phaser.GameObjects.Graphics;
  private cameraTarget?: Phaser.GameObjects.Rectangle;

  constructor() { super("game"); }

  async create() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys("W,A,S,D") as any;

    // Draw map backdrop (simple ellipse + thumb to echo server)
    this.mapLayer = this.add.graphics({ x: 0, y: 0 });
    this.drawMap();

    const client = createClient();
    this.room = await client.joinOrCreate("toodee", { name: "Hero" });

    // listen to state changes
    this.room.state.players.onAdd = (p: ServerPlayer, key: string) => {
      const r = this.add.rectangle(p.x * TILE_SIZE, p.y * TILE_SIZE, TILE_SIZE, TILE_SIZE, 0x8ad7ff).setOrigin(0.5);
      r.setStrokeStyle(2, 0x001b2e);
      this.players.set(key, r);
      if (!this.cameraTarget && key === this.room.sessionId) {
        this.cameraTarget = r;
        this.cameras.main.startFollow(r, true, 0.15, 0.15);
        this.cameras.main.setZoom(3);
        const w = MAP.width * TILE_SIZE;
        const h = MAP.height * TILE_SIZE;
        this.cameras.main.setBounds(0, 0, w, h, true);
      }
    };
    this.room.state.players.onRemove = (_: any, key: string) => {
      this.players.get(key)?.destroy();
      this.players.delete(key);
    };
    this.room.state.players.onChange = (p: ServerPlayer, key: string) => {
      const r = this.players.get(key);
      if (!r) return;
      // Simple snap (can smooth later)
      r.x = Math.round(p.x * TILE_SIZE);
      r.y = Math.round(p.y * TILE_SIZE);
    };

    // send input at ~20 Hz
    this.time.addEvent({ delay: 50, loop: true, callback: this.sendInput, callbackScope: this });
    this.scale.on("resize", () => this.drawMap());
  }

  private drawMap() {
    const g = this.mapLayer;
    g.clear();
    const w = MAP.width, h = MAP.height;
    const colorWater = 0x10334a, colorLand = 0x2e4031, colorRock = 0x474b49;

    // World bg
    g.fillStyle(0x0b0b12, 1);
    g.fillRect(-5000, -5000, 10000, 10000);

    // Elliptical "mitten" + thumb (visual, not collision)
    const cx = Math.floor(w * 0.45), cy = Math.floor(h * 0.55);
    const rx = Math.floor(w * 0.28), ry = Math.floor(h * 0.32);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        let land = (nx * nx + ny * ny) <= 1.0;
        if (x > Math.floor(w * 0.60) && x < Math.floor(w * 0.70) && y > Math.floor(h * 0.45) && y < Math.floor(h * 0.70)) {
          land = true; // thumb
        }
        const color = land ? colorLand : colorWater;
        g.fillStyle(color, 1);
        g.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    // sprinkle rocks visually
    g.lineStyle(0, 0, 0);
    for (let i = 0; i < (w * h * 0.03); i++) {
      const x = Math.floor(Math.random() * w);
      const y = Math.floor(Math.random() * h);
      g.fillStyle(colorRock, 1);
      g.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  private sendInput() {
    if (!this.room) return;
    const up = this.cursors.up.isDown || this.keys["W"].isDown;
    const down = this.cursors.down.isDown || this.keys["S"].isDown;
    const left = this.cursors.left.isDown || this.keys["A"].isDown;
    const right = this.cursors.right.isDown || this.keys["D"].isDown;

    this.seq = (this.seq + 1) >>> 0;
    this.room.send("input", { seq: this.seq, up, down, left, right });
  }
}
