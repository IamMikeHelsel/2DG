import Phaser from "phaser";
import { createClient } from "../net";
import { TILE_SIZE, MAP, ChatMessage, NPC_MERCHANT, SHOP_ITEMS } from "@toodee/shared";
import { Character } from "../entities/Character";
import { NPC } from "../entities/NPC";
import { DialogueUI } from "../ui/DialogueUI";
import { MovementSystem } from "../systems/MovementSystem";
import { WorldManager } from "../world/WorldManager";
import { AssetLoader } from "../assets/AssetLoader";
import { SpriteGenerator } from "../utils/SpriteGenerator";
import { NPC_CONFIGS } from "../data/npcs";

type ServerPlayer = {
  id: string;
  name: string;
  x: number;
  y: number;
  dir: number;
  hp: number;
  maxHp: number;
  gold: number;
  pots: number;
};

type ServerMob = {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
};

export class EnhancedGameScene extends Phaser.Scene {
  // Networking
  private room?: any;
  private seq = 0;

  // Systems
  private movementSystem!: MovementSystem;
  private worldManager!: WorldManager;
  private assetLoader!: AssetLoader;
  private dialogueUI!: DialogueUI;

  // Entities
  private characters = new Map<string, Character>();
  private npcs = new Map<string, NPC>();
  private mobs = new Map<
    string,
    { sprite: Phaser.GameObjects.Sprite; hpBar: Phaser.GameObjects.Graphics }
  >();
  private localPlayer?: Character;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  // UI Elements
  private hpText?: Phaser.GameObjects.Text;
  private goldText?: Phaser.GameObjects.Text;
  private potsText?: Phaser.GameObjects.Text;
  private chatLogEl?: HTMLDivElement;
  private chatInputEl?: HTMLInputElement;
  private shopEl?: HTMLDivElement;
  private splashImage?: Phaser.GameObjects.Image;
  private toastRoot?: HTMLDivElement;

  constructor() {
    super("enhanced-game");
  }

  preload() {
    // Load splash
    this.load.image("splash", "/toodeegame_splash.png");

    // Initialize asset loader
    this.assetLoader = new AssetLoader(this);

    // Generate procedural sprites
    SpriteGenerator.generateCharacterSpritesheet(this, "player", 0x3498db);
    SpriteGenerator.generateCharacterSpritesheet(this, "other_player", 0x9b59b6);
    SpriteGenerator.generateNPCSpritesheet(this, "npc_merchant", 0x27ae60, 0xf39c12);
    SpriteGenerator.generateNPCSpritesheet(this, "npc_guard", 0x7f8c8d, 0x34495e);
    SpriteGenerator.generateNPCSpritesheet(this, "npc_villager", 0xe67e22);
    SpriteGenerator.generateNPCSpritesheet(this, "npc_questgiver", 0x8e44ad, 0xf1c40f);
    SpriteGenerator.generateNPCSpritesheet(this, "npc_bard", 0x16a085, 0xe74c3c);
    SpriteGenerator.generateCharacterSpritesheet(this, "mob_slime", 0xe74c3c);
  }

  async create() {
    // Initialize systems
    this.movementSystem = new MovementSystem(this);
    this.worldManager = new WorldManager(this, MAP.width, MAP.height);
    this.dialogueUI = new DialogueUI(this);

    // Create animations
    this.createAnimations();

    // Setup input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,E,SPACE,ENTER,R,B,F") as any;

    // Render world
    this.worldManager.renderMap();

    // Show splash
    this.splashImage = this.add
      .image(this.scale.width / 2, this.scale.height / 2, "splash")
      .setScrollFactor(0)
      .setDepth(2000);

    // Create NPCs
    this.createNPCs();

    // Setup UI
    this.setupUI();
    this.setupChat();
    this.setupToasts();

    // Connect to server
    await this.connectToServer();

    // Setup game loop
    this.setupInputHandling();
  }

  private createAnimations() {
    // Create animations for all sprite types
    const spriteKeys = ["player", "other_player", "mob_slime"];
    const npcKeys = ["npc_merchant", "npc_guard", "npc_villager", "npc_questgiver", "npc_bard"];

    [...spriteKeys, ...npcKeys].forEach(key => {
      const animations = AssetLoader.getCharacterAnimations(key);
      this.assetLoader.createAnimations(animations);
    });
  }

  private createNPCs() {
    NPC_CONFIGS.forEach(config => {
      const npc = new NPC(this, {
        ...config,
        onInteract: npc => this.handleNPCInteraction(npc),
      });
      this.npcs.set(config.id, npc);
    });
  }

  private handleNPCInteraction(npc: NPC) {
    // Special handling for merchant
    if (npc.id === "merchant") {
      this.room?.send("shop:list");
      return;
    }

    // Show dialogue for other NPCs
    const dialogue = npc.getCurrentDialogue();
    if (dialogue) {
      this.dialogueUI.show(npc.name, dialogue, () => {
        // Dialogue closed
      });
    }
  }

  private async connectToServer() {
    const client = createClient();
    const restore = this.loadSave();
    const name = restore?.name || this.randomName();

    try {
      this.room = await client.joinOrCreate("toodee", { name, restore });
      this.setupNetworkHandlers();
      this.hideSplash();
      this.showToast("Connected to server!", "ok");
    } catch (err) {
      this.showToast("Cannot connect to server. Check server status.", "error");
      console.error("Connection error:", err);
    }
  }

  private setupNetworkHandlers() {
    // Player handlers
    this.room.state.players.onAdd = (p: ServerPlayer, key: string) => {
      const isLocal = key === this.room.sessionId;
      const character = new Character(
        this,
        key,
        p.x,
        p.y,
        p.name || "Player",
        isLocal ? "player" : "other_player",
        isLocal
      );

      this.characters.set(key, character);

      if (isLocal) {
        this.localPlayer = character;
        this.cameras.main.startFollow(character["sprite"], true, 0.15, 0.15);
        this.cameras.main.setZoom(3);
        this.cameras.main.setBounds(0, 0, MAP.width * TILE_SIZE, MAP.height * TILE_SIZE, true);
        this.updatePlayerStats(p);
      }
    };

    this.room.state.players.onRemove = (_: any, key: string) => {
      const character = this.characters.get(key);
      if (character) {
        character.destroy();
        this.characters.delete(key);
      }
    };

    this.room.state.players.onChange = (p: ServerPlayer, key: string) => {
      const character = this.characters.get(key);
      if (character) {
        character.setPosition(p.x, p.y);
        character.updateMovement(p.dir, false); // Will be determined by position changes
        character.updateHp(p.hp, p.maxHp);

        if (key === this.room.sessionId) {
          this.updatePlayerStats(p);
          this.saveSave(p);
        }
      }
    };

    // Mob handlers
    this.room.state.mobs?.onAdd?.((m: ServerMob, key: string) => {
      const sprite = this.add.sprite(m.x * TILE_SIZE, m.y * TILE_SIZE, "mob_slime");
      sprite.play("mob_slime_idle_down");

      const hpBar = this.add.graphics();
      this.updateMobHpBar(hpBar, m.x * TILE_SIZE, m.y * TILE_SIZE, m.hp, m.maxHp);

      this.mobs.set(key, { sprite, hpBar });
    });

    this.room.state.mobs?.onRemove?.((_: any, key: string) => {
      const mob = this.mobs.get(key);
      if (mob) {
        mob.sprite.destroy();
        mob.hpBar.destroy();
        this.mobs.delete(key);
      }
    });

    this.room.state.mobs?.onChange?.((m: ServerMob, key: string) => {
      const mob = this.mobs.get(key);
      if (mob) {
        mob.sprite.setPosition(m.x * TILE_SIZE, m.y * TILE_SIZE);
        this.updateMobHpBar(mob.hpBar, m.x * TILE_SIZE, m.y * TILE_SIZE, m.hp, m.maxHp);
      }
    });

    // Chat handler
    this.room.onMessage("chat", (msg: ChatMessage) => {
      this.appendChat(msg);
    });

    // Shop handlers
    this.room.onMessage("shop:list", (payload: any) => this.showShop(payload));
    this.room.onMessage("shop:result", (payload: any) => this.updateShopResult(payload));
  }

  private setupInputHandling() {
    // Movement input at 20Hz
    this.time.addEvent({
      delay: 50,
      callback: () => this.sendMovementInput(),
      loop: true,
    });

    // Attack
    this.input.keyboard?.on("keydown-SPACE", () => {
      this.room?.send("attack");
    });

    // Interact
    this.input.keyboard?.on("keydown-E", () => {
      this.tryInteract();
    });

    // Chat
    this.input.keyboard?.on("keydown-ENTER", () => {
      this.toggleChat();
    });
  }

  private sendMovementInput() {
    if (!this.room) return;

    const input = this.movementSystem.captureInput(this.cursors, this.keys);

    if (this.movementSystem.hasInputChanged(input)) {
      this.seq++;
      this.room.send("input", {
        seq: this.seq,
        ...input,
      });
      this.movementSystem.updateLastInput(input);

      // Update local player animation immediately
      if (this.localPlayer) {
        const dir = this.movementSystem.getDirection(input);
        const isMoving = this.movementSystem.isMoving(input);
        this.localPlayer.updateMovement(dir, isMoving);
      }
    }
  }

  private tryInteract() {
    if (!this.localPlayer || this.dialogueUI.isOpen()) return;

    // Check for nearby NPCs
    const playerX = this.localPlayer.x;
    const playerY = this.localPlayer.y;

    for (const npc of this.npcs.values()) {
      if (npc.isInInteractionRange(playerX, playerY)) {
        npc.faceTowards(playerX, playerY);
        npc.interact();
        return;
      }
    }
  }

  update(time: number, delta: number) {
    // Update NPC interaction indicators
    if (this.localPlayer) {
      const playerX = this.localPlayer.x;
      const playerY = this.localPlayer.y;

      for (const npc of this.npcs.values()) {
        if (npc.isInInteractionRange(playerX, playerY)) {
          npc.showInteractionIndicator();
        } else {
          npc.hideInteractionIndicator();
        }
      }
    }
  }

  private updateMobHpBar(
    hpBar: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    hp: number,
    maxHp: number
  ) {
    hpBar.clear();

    // Background
    hpBar.fillStyle(0x000000, 0.5);
    hpBar.fillRect(x - 16, y - TILE_SIZE * 0.6 - 2, 32, 4);

    // HP
    const hpPercent = Math.max(0, Math.min(1, hp / maxHp));
    const barWidth = Math.floor(32 * hpPercent);
    hpBar.fillStyle(0x6be06b, 1);
    hpBar.fillRect(x - 16, y - TILE_SIZE * 0.6 - 2, barWidth, 4);
  }

  private updatePlayerStats(p: ServerPlayer) {
    this.hpText?.setText(`HP: ${p.hp}/${p.maxHp}`);
    this.goldText?.setText(`Gold: ${p.gold}`);
    this.potsText?.setText(`Potions: ${p.pots}`);
  }

  private setupUI() {
    // Stats UI
    this.hpText = this.add
      .text(12, 12, "HP: 0/0", {
        fontSize: "14px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.goldText = this.add
      .text(12, 32, "Gold: 0", {
        fontSize: "14px",
        color: "#ffd700",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.potsText = this.add
      .text(12, 52, "Potions: 0", {
        fontSize: "14px",
        color: "#ff69b4",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setScrollFactor(0)
      .setDepth(100);

    // Controls hint
    this.add
      .text(
        12,
        this.scale.height - 60,
        "Controls: WASD/Arrows - Move | SPACE - Attack | E - Interact | ENTER - Chat",
        {
          fontSize: "11px",
          color: "#aaaaaa",
          stroke: "#000000",
          strokeThickness: 1,
        }
      )
      .setScrollFactor(0)
      .setDepth(100);
  }

  private hideSplash() {
    if (this.splashImage) {
      this.tweens.add({
        targets: this.splashImage,
        alpha: 0,
        duration: 600,
        onComplete: () => this.splashImage?.destroy(),
      });
    }
  }

  // Preserve existing chat/shop/toast methods from original GameScene
  private setupChat() {
    const chatRoot = document.createElement("div");
    Object.assign(chatRoot.style, {
      position: "absolute",
      bottom: "20px",
      left: "20px",
      width: "300px",
      height: "150px",
      display: "flex",
      flexDirection: "column",
      pointerEvents: "none",
      zIndex: 10,
    });

    const chatLog = document.createElement("div");
    Object.assign(chatLog.style, {
      flex: "1",
      overflowY: "auto",
      background: "rgba(0,0,0,0.5)",
      padding: "8px",
      borderRadius: "4px",
      fontSize: "12px",
      color: "#e6f3ff",
      marginBottom: "4px",
    });

    const chatInput = document.createElement("input");
    chatInput.type = "text";
    chatInput.placeholder = "Press Enter to chat...";
    Object.assign(chatInput.style, {
      padding: "4px 8px",
      background: "rgba(0,0,0,0.7)",
      border: "1px solid rgba(255,255,255,0.2)",
      borderRadius: "4px",
      color: "#e6f3ff",
      fontSize: "12px",
      display: "none",
      pointerEvents: "all",
    });

    chatInput.addEventListener("keydown", e => {
      if (e.key === "Enter" && chatInput.value.trim()) {
        this.room?.send("chat", chatInput.value.trim());
        chatInput.value = "";
        chatInput.style.display = "none";
        chatInput.blur();
      } else if (e.key === "Escape") {
        chatInput.style.display = "none";
        chatInput.blur();
      }
    });

    chatRoot.appendChild(chatLog);
    chatRoot.appendChild(chatInput);
    document.body.appendChild(chatRoot);

    this.chatLogEl = chatLog;
    this.chatInputEl = chatInput;
  }

  private toggleChat() {
    if (!this.chatInputEl) return;

    if (this.chatInputEl.style.display === "none") {
      this.chatInputEl.style.display = "block";
      this.chatInputEl.focus();
    } else {
      this.chatInputEl.style.display = "none";
      this.chatInputEl.blur();
    }
  }

  private appendChat(msg: ChatMessage) {
    if (!this.chatLogEl) return;

    const line = document.createElement("div");
    const time = new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    line.textContent = `[${time}] ${msg.from}: ${msg.text}`;
    this.chatLogEl.appendChild(line);

    while (this.chatLogEl.childElementCount > 50) {
      this.chatLogEl.firstElementChild?.remove();
    }

    this.chatLogEl.scrollTop = this.chatLogEl.scrollHeight;
  }

  private showShop(payload: any) {
    if (this.shopEl) return;

    const root = document.createElement("div");
    Object.assign(root.style, {
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: "300px",
      background: "rgba(0,0,0,0.9)",
      border: "2px solid #ffd700",
      borderRadius: "8px",
      padding: "16px",
      color: "#e6f3ff",
      zIndex: 20,
    });

    root.innerHTML = `
      <h3 style="margin: 0 0 12px 0; color: #ffd700;">Merchant Shop</h3>
      <div id="shop-items"></div>
      <button id="shop-close" style="margin-top: 12px; padding: 4px 8px;">Close</button>
    `;

    const itemsContainer = root.querySelector("#shop-items") as HTMLDivElement;
    payload.items?.forEach((item: any) => {
      const itemEl = document.createElement("div");
      itemEl.style.marginBottom = "8px";
      itemEl.innerHTML = `
        <div>${item.name} - ${item.price} gold</div>
        <button data-item-id="${item.id}" data-qty="1">Buy 1</button>
        <button data-item-id="${item.id}" data-qty="5">Buy 5</button>
      `;
      itemsContainer.appendChild(itemEl);
    });

    root.addEventListener("click", e => {
      const target = e.target as HTMLElement;
      if (target.id === "shop-close") {
        root.remove();
        this.shopEl = undefined;
      } else if (target.dataset.itemId) {
        this.room?.send("shop:buy", {
          id: target.dataset.itemId,
          qty: parseInt(target.dataset.qty || "1"),
        });
      }
    });

    document.body.appendChild(root);
    this.shopEl = root;
  }

  private updateShopResult(payload: any) {
    if (payload.ok) {
      this.showToast("Purchase successful!", "ok");
    } else {
      this.showToast(payload.reason || "Purchase failed", "error");
    }
  }

  private setupToasts() {
    this.toastRoot = document.createElement("div");
    Object.assign(this.toastRoot.style, {
      position: "absolute",
      top: "20px",
      right: "20px",
      zIndex: 30,
    });
    document.body.appendChild(this.toastRoot);
  }

  private showToast(message: string, type: "ok" | "error") {
    const toast = document.createElement("div");
    Object.assign(toast.style, {
      padding: "8px 16px",
      marginBottom: "8px",
      background: type === "ok" ? "rgba(0,128,0,0.8)" : "rgba(128,0,0,0.8)",
      color: "#ffffff",
      borderRadius: "4px",
      fontSize: "14px",
      animation: "fadeIn 0.3s",
    });
    toast.textContent = message;

    this.toastRoot?.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "fadeOut 0.3s";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  private saveSave(player: ServerPlayer) {
    localStorage.setItem(
      "toodee_save",
      JSON.stringify({
        name: player.name,
        x: player.x,
        y: player.y,
      })
    );
  }

  private loadSave() {
    try {
      const save = localStorage.getItem("toodee_save");
      return save ? JSON.parse(save) : null;
    } catch {
      return null;
    }
  }

  private randomName() {
    const adjectives = ["Bold", "Swift", "Calm", "Brave", "Merry"];
    const nouns = ["Fox", "Owl", "Pine", "Fawn", "Wolf"];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}`;
  }
}
