import Phaser from "phaser";
import { createClient } from "../net";
import { TILE_SIZE, MAP, ChatMessage, NPC_MERCHANT, SHOP_ITEMS } from "@toodee/shared";

type ServerPlayer = { id: string; x: number; y: number; dir: number; };

export class GameScene extends Phaser.Scene {
  private room?: any;
  private players = new Map<string, Phaser.GameObjects.Rectangle>();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private seq = 0;
  private mapLayer!: Phaser.GameObjects.Graphics;
  private cameraTarget?: Phaser.GameObjects.Rectangle;
  private chatLogEl?: HTMLDivElement;
  private chatInputEl?: HTMLInputElement;
  private hpText?: Phaser.GameObjects.Text;
  private goldText?: Phaser.GameObjects.Text;
  private shopEl?: HTMLDivElement;
  private splashImage?: Phaser.GameObjects.Image;

  constructor() { super("game"); }

  preload() {
    // Asset lives in client/public so it’s served at root
    this.load.image("__splash__", "/toodeegame_splash.png");
  }

  async create() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys("W,A,S,D") as any;

    // Draw map backdrop (simple ellipse + thumb to echo server)
    this.mapLayer = this.add.graphics({ x: 0, y: 0 });
    this.drawMap();

    // Show splash immediately
    this.splashImage = this.add.image(this.scale.width / 2, this.scale.height / 2, "__splash__").setScrollFactor(0).setDepth(1000);
    this.splashImage.setOrigin(0.5);
    const client = createClient();
    const restore = loadSave();
    const name = restore?.name || randomName();
    this.room = await client.joinOrCreate("toodee", { name, restore });

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
        this.hpText = this.add.text(12, 12, "HP", { color: "#e6f3ff", fontFamily: "monospace", fontSize: "12px" }).setScrollFactor(0);
        this.goldText = this.add.text(12, 28, "Gold", { color: "#ffd66b", fontFamily: "monospace", fontSize: "12px" }).setScrollFactor(0);
      }
    };
    this.room.state.players.onRemove = (_: any, key: string) => {
      this.players.get(key)?.destroy();
      this.players.delete(key);
    };
    this.room.state.players.onChange = (p: any, key: string) => {
      const r = this.players.get(key);
      if (!r) return;
      // Simple snap (can smooth later)
      r.x = Math.round(p.x * TILE_SIZE);
      r.y = Math.round(p.y * TILE_SIZE);
      if (key === this.room.sessionId) {
        const hp = p.hp ?? 0;
        const maxHp = p.maxHp ?? 0;
        this.hpText?.setText(`HP ${hp}/${maxHp}`);
        if (this.goldText && typeof p.gold === "number") this.goldText.setText(`Gold ${p.gold}`);
      }
    };

    // send input at ~20 Hz
    this.time.addEvent({ delay: 50, loop: true, callback: this.sendInput, callbackScope: this });
    this.scale.on("resize", () => this.drawMap());

    // chat UI
    this.initChatUI();
    this.room.onMessage("chat", (msg: ChatMessage) => this.appendChat(msg));

    // attack input
    const space = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    space.on("down", () => this.room?.send("attack"));

    // shop interaction
    const keyE = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    keyE.on("down", () => this.tryOpenShop());
    this.room.onMessage("shop:list", (payload: any) => this.showShop(payload));
    this.room.onMessage("shop:result", (payload: any) => this.updateShopResult(payload));

    // Fade out splash
    if (this.splashImage) {
      this.tweens.add({ targets: this.splashImage, duration: 600, alpha: 0, onComplete: () => this.splashImage?.destroy() });
    }
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

  update(time: number, delta: number): void {
    // periodically save a tiny snapshot for demo persistence
    if (!this.room) return;
    // throttle by time
    const t = Math.floor(time / 2000);
    if ((this as any)._lastSaveTick === t) return;
    (this as any)._lastSaveTick = t;
    const me = this.room.state.players.get(this.room.sessionId) as any;
    if (!me) return;
    const snap = {
      name: this.room?.options?.name || loadSave()?.name || "",
      x: Math.round(me.x ?? 0),
      y: Math.round(me.y ?? 0),
      gold: me.gold ?? 0,
      pots: me.pots ?? 0
    };
    localStorage.setItem("toodee_save", JSON.stringify(snap));
  }

  private tryOpenShop() {
    if (!this.room) return;
    // Only open if near merchant; server will also validate
    this.room.send("shop:list");
  }

  private showShop(payload: any) {
    const { items, gold, pots, npc } = payload || {};
    // rough proximity hint on client to avoid spamming when far
    const me = this.room?.state.players.get(this.room.sessionId);
    if (me) {
      const dx = Math.abs(Math.round(me.x) - NPC_MERCHANT.x);
      const dy = Math.abs(Math.round(me.y) - NPC_MERCHANT.y);
      if (Math.max(dx, dy) > 2) return; // too far; ignore open
    }
    if (this.shopEl) this.shopEl.remove();
    const root = document.createElement("div");
    Object.assign(root.style, {
      position: "absolute",
      right: "12px",
      bottom: "12px",
      width: "260px",
      background: "rgba(6,12,18,0.88)",
      border: "1px solid rgba(140,160,180,0.35)",
      borderRadius: "8px",
      color: "#e6f3ff",
      padding: "10px",
      zIndex: 12 as any
    });
    const title = document.createElement("div");
    title.textContent = "Merchant";
    title.style.fontWeight = "bold";
    title.style.marginBottom = "6px";
    root.appendChild(title);
    const goldEl = document.createElement("div");
    goldEl.textContent = `Gold: ${gold}`;
    goldEl.style.color = "#ffd66b";
    goldEl.style.marginBottom = "6px";
    root.appendChild(goldEl);
    const item = SHOP_ITEMS[0];
    const row = document.createElement("div");
    row.textContent = `${item.name} — ${item.price}g (You: ${pots})`;
    row.style.marginBottom = "8px";
    root.appendChild(row);
    const buy1 = document.createElement("button");
    buy1.textContent = "Buy 1";
    const buy5 = document.createElement("button");
    buy5.textContent = "Buy 5";
    [buy1, buy5].forEach(b => {
      Object.assign(b.style, { marginRight: "6px", padding: "4px 8px", background: "#17324c", color: "#e6f3ff", border: "1px solid #406080", borderRadius: "4px", cursor: "pointer" });
      root.appendChild(b);
    });
    const close = document.createElement("button");
    close.textContent = "Close";
    Object.assign(close.style, { float: "right", padding: "4px 8px" });
    root.appendChild(close);
    buy1.onclick = () => this.room?.send("shop:buy", { id: item.id, qty: 1 });
    buy5.onclick = () => this.room?.send("shop:buy", { id: item.id, qty: 5 });
    close.onclick = () => root.remove();
    document.body.appendChild(root);
    this.shopEl = root;
  }

  private updateShopResult(payload: any) {
    if (!payload) return;
    if (!payload.ok && payload.reason) {
      this.appendChat({ from: "Merchant", text: payload.reason, ts: Date.now() });
    }
    if (typeof payload.gold === "number" && this.goldText) {
      this.goldText.setText(`Gold ${payload.gold}`);
    }
    // Update shop display if open
    if (this.shopEl) {
      // re-request to refresh counts
      this.room?.send("shop:list");
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

  private initChatUI() {
    const container = document.createElement("div");
    Object.assign(container.style, {
      position: "absolute",
      left: "12px",
      bottom: "12px",
      width: "min(480px, 40vw)",
      color: "#dfe7ef",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      fontSize: "12px",
      lineHeight: "1.3",
      pointerEvents: "auto",
      zIndex: 10 as any
    });

    const log = document.createElement("div");
    Object.assign(log.style, {
      background: "rgba(3,10,18,0.55)",
      border: "1px solid rgba(100,140,180,0.25)",
      borderRadius: "6px 6px 0 0",
      padding: "6px 8px",
      maxHeight: "160px",
      overflowY: "auto"
    });

    const input = document.createElement("input");
    Object.assign(input.style, {
      width: "100%",
      background: "rgba(8,18,28,0.75)",
      border: "1px solid rgba(100,140,180,0.35)",
      borderTop: "0",
      color: "#e6f3ff",
      padding: "6px 8px",
      outline: "none",
      borderRadius: "0 0 6px 6px"
    });
    input.placeholder = "Press Enter to chat…";
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const text = input.value.trim();
        if (text) {
          this.room?.send("chat", text);
          input.value = "";
        }
        e.preventDefault();
      } else if (e.key === "Escape") {
        input.blur();
      }
    });

    // Toggle focus with Enter when game is focused
    this.input.keyboard!.on("keydown-ENTER", () => {
      if (document.activeElement === input) return;
      input.focus();
    });

    container.appendChild(log);
    container.appendChild(input);
    document.body.appendChild(container);
    this.chatLogEl = log;
    this.chatInputEl = input;
  }

  private appendChat(msg: ChatMessage) {
    if (!this.chatLogEl) return;
    const line = document.createElement("div");
    const time = new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    line.textContent = `[${time}] ${msg.from}: ${msg.text}`;
    this.chatLogEl.appendChild(line);
    // trim
    while (this.chatLogEl.childElementCount > 50) {
      this.chatLogEl.firstElementChild?.remove();
    }
    this.chatLogEl.scrollTop = this.chatLogEl.scrollHeight;
  }
}

function randomName() {
  const a = ["Bold", "Swift", "Calm", "Brave", "Merry", "Quiet", "Wry", "Keen"]; 
  const b = ["Fox", "Owl", "Pine", "Fawn", "Peak", "Finch", "Wolf", "Reed"]; 
  return `${a[Math.floor(Math.random()*a.length)]}${b[Math.floor(Math.random()*b.length)]}`;
}

function loadSave(): any | null {
  try {
    const raw = localStorage.getItem("toodee_save");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
