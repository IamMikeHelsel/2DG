import Phaser from "phaser";
import { createClient } from "../net";
import { TILE_SIZE, MAP, ChatMessage, NPC_MERCHANT, SHOP_ITEMS, FounderTier, FOUNDER_REWARDS } from "@toodee/shared";

type ServerPlayer = { id: string; x: number; y: number; dir: number; founderTier?: string; displayTitle?: string; chatColor?: string; unlockedRewards?: string[]; };

export class GameScene extends Phaser.Scene {
  private room?: any;
  private players = new Map<string, Phaser.GameObjects.Rectangle>();
  private mobs = new Map<string, { body: Phaser.GameObjects.Rectangle; hp: Phaser.GameObjects.Rectangle }>();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private seq = 0;
  private mapLayer!: Phaser.GameObjects.Graphics;
  private cameraTarget?: Phaser.GameObjects.Rectangle;
  private chatLogEl?: HTMLDivElement;
  private chatInputEl?: HTMLInputElement;
  private hpText?: Phaser.GameObjects.Text;
  private goldText?: Phaser.GameObjects.Text;
  private titleText?: Phaser.GameObjects.Text;
  private shopEl?: HTMLDivElement;
  private rewardsEl?: HTMLDivElement;
  private splashImage?: Phaser.GameObjects.Image;
  private toastRoot?: HTMLDivElement;

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
    try {
      this.room = await client.joinOrCreate("toodee", { name, restore });
    } catch (err) {
      this.showToast("Cannot connect to server. Check server and VITE_SERVER_URL.", "error");
      return; // keep splash visible so restart is obvious
    }

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
        this.titleText = this.add.text(12, 44, "", { color: "#FFD700", fontFamily: "monospace", fontSize: "11px" }).setScrollFactor(0);
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
        
        // Update founder title display
        if (this.titleText && p.displayTitle) {
          this.titleText.setText(p.displayTitle);
        }
      }
    };

    // mobs
    this.room.state.mobs?.onAdd?.((m: any, key: string) => {
      const body = this.add.rectangle(m.x * TILE_SIZE, m.y * TILE_SIZE, TILE_SIZE, TILE_SIZE, 0xd46a6a).setOrigin(0.5);
      body.setStrokeStyle(2, 0x2a0f0f);
      const hp = this.add.rectangle(m.x * TILE_SIZE, m.y * TILE_SIZE - TILE_SIZE * 0.6, TILE_SIZE, 4, 0x6be06b).setOrigin(0.5, 0.5);
      this.mobs.set(key, { body, hp });
    });
    this.room.state.mobs?.onRemove?.((_: any, key: string) => {
      const m = this.mobs.get(key);
      m?.body.destroy();
      m?.hp.destroy();
      this.mobs.delete(key);
    });
    this.room.state.mobs?.onChange?.((m: any, key: string) => {
      const obj = this.mobs.get(key);
      if (!obj) return;
      obj.body.x = Math.round(m.x * TILE_SIZE);
      obj.body.y = Math.round(m.y * TILE_SIZE);
      obj.hp.x = obj.body.x;
      obj.hp.y = obj.body.y - TILE_SIZE * 0.6;
      const frac = Math.max(0, Math.min(1, (m.hp ?? 0) / (m.maxHp || 1)));
      obj.hp.width = TILE_SIZE * frac;
      obj.hp.fillColor = frac > 0.5 ? 0x6be06b : frac > 0.25 ? 0xe0c36b : 0xe06b6b;
    });

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
    
    // rewards system
    const keyR = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    keyR.on("down", () => this.toggleRewards());
    const keyB = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.B);
    keyB.on("down", () => this.promptBugReport());
    const keyF = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    keyF.on("down", () => this.promptReferral());
    this.room.onMessage("bug_report:result", (payload: any) => this.handleBugReportResult(payload));
    this.room.onMessage("referral:result", (payload: any) => this.handleReferralResult(payload));
    this.room.onMessage("anniversary:reward", (payload: any) => this.handleAnniversaryReward(payload));

    // Fade out splash and show connected toast
    if (this.splashImage) {
      this.tweens.add({ targets: this.splashImage, duration: 600, alpha: 0, onComplete: () => this.splashImage?.destroy() });
    }
    this.showToast("Connected to server", "ok");
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
    row.textContent = `${item.name} — ${item.buyPrice}g (You: ${pots})`;
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

  private showToast(text: string, kind: "ok" | "error" = "ok") {
    if (!this.toastRoot) {
      const root = document.createElement("div");
      Object.assign(root.style, {
        position: "absolute",
        top: "12px",
        right: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        zIndex: 15 as any,
        pointerEvents: "none"
      });
      document.body.appendChild(root);
      this.toastRoot = root;
    }
    const el = document.createElement("div");
    const bg = kind === "ok" ? "rgba(28, 68, 44, 0.9)" : "rgba(84, 28, 28, 0.9)";
    const border = kind === "ok" ? "#4aa96c" : "#d46a6a";
    Object.assign(el.style, {
      background: bg,
      border: `1px solid ${border}`,
      color: "#eaf3ef",
      padding: "8px 10px",
      borderRadius: "6px",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      fontSize: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
      opacity: "0",
      transform: "translateY(-6px)",
      transition: "opacity 180ms ease, transform 180ms ease"
    } as any);
    el.textContent = text;
    this.toastRoot!.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(-6px)";
      setTimeout(() => el.remove(), 220);
    }, 2000);
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
    
    // Apply special chat colors for founder rewards
    const player = this.room?.state.players.get(this.room.sessionId);
    if (player && player.chatColor && player.chatColor !== "#FFFFFF") {
      line.style.color = player.chatColor;
    }
    
    this.chatLogEl.appendChild(line);
    // trim
    while (this.chatLogEl.childElementCount > 50) {
      this.chatLogEl.firstElementChild?.remove();
    }
    this.chatLogEl.scrollTop = this.chatLogEl.scrollHeight;
  }

  private toggleRewards() {
    if (this.rewardsEl) {
      this.rewardsEl.remove();
      this.rewardsEl = undefined;
      return;
    }
    
    const me = this.room?.state.players.get(this.room.sessionId);
    if (!me) return;
    
    const root = document.createElement("div");
    Object.assign(root.style, {
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: "400px",
      maxHeight: "500px",
      background: "rgba(6,12,18,0.95)",
      border: "2px solid rgba(140,160,180,0.5)",
      borderRadius: "12px",
      color: "#e6f3ff",
      padding: "16px",
      zIndex: 20 as any,
      overflowY: "auto"
    });
    
    const title = document.createElement("div");
    title.textContent = "🏆 Founder Rewards";
    title.style.fontWeight = "bold";
    title.style.fontSize = "16px";
    title.style.marginBottom = "12px";
    title.style.textAlign = "center";
    root.appendChild(title);
    
    const tierName = me.founderTier || "none";
    const tierEl = document.createElement("div");
    let tierDisplay = "None";
    if (tierName === FounderTier.EarlyBird) tierDisplay = "👑 Early Bird";
    else if (tierName === FounderTier.BetaTester) tierDisplay = "🚀 Beta Tester";
    else if (tierName === FounderTier.BugHunter) tierDisplay = "🐛 Bug Hunter";
    
    tierEl.innerHTML = `<strong>Founder Tier:</strong> ${tierDisplay}`;
    tierEl.style.marginBottom = "12px";
    root.appendChild(tierEl);
    
    // Show unlocked rewards
    if (me.unlockedRewards && me.unlockedRewards.length > 0) {
      const rewardsTitle = document.createElement("div");
      rewardsTitle.textContent = "🎁 Unlocked Rewards:";
      rewardsTitle.style.fontWeight = "bold";
      rewardsTitle.style.marginBottom = "8px";
      root.appendChild(rewardsTitle);
      
      me.unlockedRewards.forEach((rewardId: string) => {
        // Find reward in all tiers
        let reward;
        for (const tier of Object.values(FounderTier)) {
          reward = FOUNDER_REWARDS[tier].find(r => r.id === rewardId);
          if (reward) break;
        }
        
        if (reward) {
          const rewardEl = document.createElement("div");
          rewardEl.innerHTML = `${reward.icon || "⭐"} <strong>${reward.name}</strong><br><span style="font-size: 11px; opacity: 0.8;">${reward.description}</span>`;
          rewardEl.style.marginBottom = "8px";
          rewardEl.style.padding = "6px";
          rewardEl.style.background = "rgba(20, 40, 60, 0.3)";
          rewardEl.style.borderRadius = "6px";
          root.appendChild(rewardEl);
        }
      });
    }
    
    // Add controls hint
    const controls = document.createElement("div");
    controls.innerHTML = `<br><strong>Controls:</strong><br>
    B - Submit bug report<br>
    F - Add referral<br>
    R - Toggle this panel<br>
    E - Open shop`;
    controls.style.fontSize = "11px";
    controls.style.opacity = "0.7";
    controls.style.marginTop = "12px";
    root.appendChild(controls);
    
    const close = document.createElement("button");
    close.textContent = "Close";
    Object.assign(close.style, {
      position: "absolute",
      top: "12px",
      right: "12px",
      padding: "4px 8px",
      background: "#17324c",
      color: "#e6f3ff",
      border: "1px solid #406080",
      borderRadius: "4px",
      cursor: "pointer"
    });
    close.onclick = () => {
      root.remove();
      this.rewardsEl = undefined;
    };
    root.appendChild(close);
    
    document.body.appendChild(root);
    this.rewardsEl = root;
  }
  
  private handleBugReportResult(payload: any) {
    if (payload.ok) {
      this.showToast(`Bug report submitted! (${payload.reportsCount}/5)`, "ok");
      if (payload.message) {
        this.showToast(payload.message, "ok");
      }
    } else {
      this.showToast(payload.reason, "error");
    }
  }
  
  private handleReferralResult(payload: any) {
    if (payload.ok) {
      const msg = `Referral added! Count: ${payload.referralsCount}`;
      this.showToast(msg, "ok");
      if (payload.rewardUnlocked) {
        this.showToast(`New reward: ${payload.rewardUnlocked.name}!`, "ok");
      }
    } else {
      this.showToast(payload.reason, "error");
    }
  }
  
  private handleAnniversaryReward(payload: any) {
    if (payload.reward) {
      this.showToast(`${payload.message}`, "ok");
    }
  }

  private promptBugReport() {
    const description = prompt("Describe the bug you found (minimum 10 characters):");
    if (description && description.length >= 10) {
      this.room?.send("bug_report", { description });
    } else if (description) {
      this.showToast("Bug report must be at least 10 characters", "error");
    }
  }

  private promptReferral() {
    // Simulate adding a referral - in a real system this would be more sophisticated
    const referredId = prompt("Enter referred player ID (demo purposes):");
    if (referredId) {
      // For demo, we'll use the current time as a fake player ID
      const fakePlayerId = `player_${Date.now()}`;
      this.room?.send("referral", { referredPlayerId: fakePlayerId });
    }
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
