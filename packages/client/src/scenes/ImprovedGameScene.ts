import Phaser from "phaser";
import { createClient } from "../net";
import { TILE_SIZE, MAP, ChatMessage, AnalyticsEvent } from "@toodee/shared";
import { SpriteGenerator } from "../utils/SpriteGenerator";
import { analytics } from "../analytics/AnalyticsService";

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
  lastSeq: number;
};

export class ImprovedGameScene extends Phaser.Scene {
  private room?: any;
  private players = new Map<string, Phaser.GameObjects.Container>();
  private playerSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private mobs = new Map<string, { body: Phaser.GameObjects.Container; hp: Phaser.GameObjects.Rectangle }>();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private seq = 0;
  private mapLayer!: Phaser.GameObjects.Graphics;
  private decorLayer!: Phaser.GameObjects.Graphics;
  private cameraTarget?: Phaser.GameObjects.Container;
  private chatLogEl?: HTMLDivElement;
  private chatInputEl?: HTMLInputElement;
  private hpText?: Phaser.GameObjects.Text;
  private goldText?: Phaser.GameObjects.Text;
  private shopEl?: HTMLDivElement;
  private splashImage?: Phaser.GameObjects.Image;
  private toastRoot?: HTMLDivElement;
  private terrainMap: number[][] = [];

  // Client-side prediction variables
  private predictedPosition = { x: 0, y: 0 };
  private inputHistory: Array<{ seq: number; up: boolean; down: boolean; left: boolean; right: boolean; timestamp: number }> = [];
  private serverPosition = { x: 0, y: 0, seq: 0 };
  private speed = 4; // tiles per second (matching server)

  constructor() { 
    super("improved-game"); 
  }

  preload() {
    this.load.image("splash", "/toodeegame_splash.png");
    
    // Generate character sprites
    SpriteGenerator.generateCharacterSpritesheet(this, 'player', 0x3498db, 32);
    SpriteGenerator.generateCharacterSpritesheet(this, 'other_player', 0x9b59b6, 32);
    SpriteGenerator.generateCharacterSpritesheet(this, 'mob', 0xe74c3c, 32);
  }

  async create() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    // Remove WASD since we use chat
    this.keys = {} as any;

    // Create animation sets for sprites
    this.createAnimations();

    // Draw improved map
    this.mapLayer = this.add.graphics({ x: 0, y: 0 });
    this.decorLayer = this.add.graphics({ x: 0, y: 0 });
    this.decorLayer.setDepth(5);
    this.generateAndDrawMap();

    // Show splash
    this.splashImage = this.add.image(this.scale.width / 2, this.scale.height / 2, "splash")
      .setScrollFactor(0).setDepth(1000);

    // Connect to server
    const client = createClient();
    const restore = this.loadSave();
    const name = restore?.name || this.randomName();
    
    try {
      this.room = await client.joinOrCreate("toodee", { name, restore });
      
      // Track successful connection and character creation
      analytics.setUser(this.room.sessionId, name);
      
      if (!restore) {
        // New character created
        analytics.trackCharacterCreated(name);
      }
      
    } catch (err) {
      this.showToast("Cannot connect to server", "error");
      return;
    }

    // Setup player handlers with improved sprites
    this.room.state.players.onAdd = (p: ServerPlayer, key: string) => {
      const isLocal = key === this.room.sessionId;
      
      // Create container for player
      const container = this.add.container(p.x * TILE_SIZE, p.y * TILE_SIZE);
      
      // Add shadow
      const shadow = this.add.ellipse(0, 6, TILE_SIZE * 0.7, TILE_SIZE * 0.35, 0x000000, 0.3);
      
      // Add sprite
      const sprite = this.add.sprite(0, 0, isLocal ? 'player' : 'other_player');
      sprite.play(`${isLocal ? 'player' : 'other_player'}_idle_down`);
      
      // Add name text
      const nameText = this.add.text(0, -TILE_SIZE * 0.8, p.name || "Player", {
        fontSize: '11px',
        color: isLocal ? '#ffff00' : '#ffffff',
        stroke: '#000000',
        strokeThickness: 2
      });
      nameText.setOrigin(0.5, 0.5);
      
      // Add HP bar background
      const hpBarBg = this.add.rectangle(0, -TILE_SIZE * 0.6, TILE_SIZE, 4, 0x000000, 0.5);
      
      // Add HP bar
      const hpBar = this.add.rectangle(0, -TILE_SIZE * 0.6, TILE_SIZE, 4, 0x00ff00);
      
      container.add([shadow, sprite, nameText, hpBarBg, hpBar]);
      container.setDepth(10);
      
      this.players.set(key, container);
      this.playerSprites.set(key, sprite);
      
      if (isLocal) {
        this.cameraTarget = container;
        this.cameras.main.startFollow(container, true, 0.15, 0.15);
        this.cameras.main.setZoom(3);
        this.cameras.main.setBounds(0, 0, MAP.width * TILE_SIZE, MAP.height * TILE_SIZE, true);
        
        // Initialize predicted position
        this.predictedPosition.x = p.x;
        this.predictedPosition.y = p.y;
        this.serverPosition.x = p.x;
        this.serverPosition.y = p.y;
        this.serverPosition.seq = 0;
        
        // UI
        this.hpText = this.add.text(12, 12, "HP", { 
          color: "#ffffff", 
          fontSize: "14px",
          stroke: '#000000',
          strokeThickness: 2
        }).setScrollFactor(0).setDepth(100);
        
        this.goldText = this.add.text(12, 32, "Gold", { 
          color: "#ffd700", 
          fontSize: "14px",
          stroke: '#000000',
          strokeThickness: 2
        }).setScrollFactor(0).setDepth(100);
        
        // Add controls hint
        this.add.text(12, this.scale.height - 40, "Controls: Arrow keys or Right-click to move | SPACE to attack | E for shop | ENTER to chat", {
          color: "#aaaaaa",
          fontSize: "12px",
          stroke: '#000000',
          strokeThickness: 1
        }).setScrollFactor(0).setDepth(100);
      }
    };

    this.room.state.players.onRemove = (_: any, key: string) => {
      this.players.get(key)?.destroy();
      this.players.delete(key);
      this.playerSprites.delete(key);
    };

    this.room.state.players.onChange = (p: ServerPlayer, key: string) => {
      const container = this.players.get(key);
      const sprite = this.playerSprites.get(key);
      if (!container || !sprite) return;
      
      const isLocal = key === this.room.sessionId;
      
      if (isLocal) {
        // Store server position for reconciliation
        this.serverPosition = { x: p.x, y: p.y, seq: p.lastSeq };
        
        // Server reconciliation: check if our prediction was correct
        const threshold = 0.1; // Small tolerance for floating point differences
        if (Math.abs(this.predictedPosition.x - p.x) > threshold || 
            Math.abs(this.predictedPosition.y - p.y) > threshold) {
          
          // Server correction needed - snap to server position
          this.predictedPosition.x = p.x;
          this.predictedPosition.y = p.y;
          
          // Re-apply inputs that happened after the server's last processed input
          this.replayInputs(p.lastSeq);
        }
        
        // Use predicted position for local player
        const targetX = this.predictedPosition.x * TILE_SIZE;
        const targetY = this.predictedPosition.y * TILE_SIZE;
        
        // Smooth movement to predicted position
        this.tweens.add({
          targets: container,
          x: targetX,
          y: targetY,
          duration: 50, // Faster for local player prediction
          ease: 'Linear'
        });
      } else {
        // For other players, use server position with smooth interpolation
        const prevX = container.x;
        const prevY = container.y;
        const targetX = p.x * TILE_SIZE;
        const targetY = p.y * TILE_SIZE;
        const isMoving = Math.abs(targetX - prevX) > 0.1 || Math.abs(targetY - prevY) > 0.1;
        
        // Smooth movement
        this.tweens.add({
          targets: container,
          x: targetX,
          y: targetY,
          duration: 100, // Standard interpolation for other players
          ease: 'Linear'
        });
      }
      
      // Update animation based on direction and movement
      const spriteKey = isLocal ? 'player' : 'other_player';
      const dirs = ['up', 'right', 'down', 'left'];
      
      // Check if player is moving by looking at velocity from input
      let isMoving = false;
      if (isLocal) {
        // For local player, check current input state
        isMoving = this.cursors.up?.isDown || this.cursors.down?.isDown || 
                  this.cursors.left?.isDown || this.cursors.right?.isDown;
      } else {
        // For other players, detect movement from position changes
        const prevX = container.x;
        const prevY = container.y;
        const targetX = p.x * TILE_SIZE;
        const targetY = p.y * TILE_SIZE;
        isMoving = Math.abs(targetX - prevX) > 0.1 || Math.abs(targetY - prevY) > 0.1;
      }
      
      if (isMoving && p.dir >= 0 && p.dir < 4) {
        const animKey = `${spriteKey}_walk_${dirs[p.dir]}`;
        if (sprite.anims.currentAnim?.key !== animKey) {
          sprite.play(animKey);
        }
      } else if (!isMoving && p.dir >= 0 && p.dir < 4) {
        const idleKey = `${spriteKey}_idle_${dirs[p.dir]}`;
        if (sprite.anims.currentAnim?.key !== idleKey) {
          sprite.play(idleKey);
        }
      }
      
      // Update HP bar
      const hpBar = container.getAt(4) as Phaser.GameObjects.Rectangle;
      if (hpBar) {
        const hpPercent = p.hp / p.maxHp;
        hpBar.setScale(hpPercent, 1);
        hpBar.setFillStyle(hpPercent > 0.5 ? 0x00ff00 : hpPercent > 0.25 ? 0xffaa00 : 0xff0000);
      }
      
      if (isLocal) {
        this.hpText?.setText(`HP: ${p.hp}/${p.maxHp}`);
        this.goldText?.setText(`Gold: ${p.gold}`);
        this.saveSave(p);
      }
    };

    // Mob handlers with sprites
    this.room.state.mobs?.onAdd?.((m: any, key: string) => {
      const container = this.add.container(m.x * TILE_SIZE, m.y * TILE_SIZE);
      
      // Shadow
      const shadow = this.add.ellipse(0, 4, TILE_SIZE * 0.6, TILE_SIZE * 0.3, 0x000000, 0.2);
      
      // Mob sprite
      const sprite = this.add.sprite(0, 0, 'mob');
      sprite.play('mob_idle_down');
      sprite.setTint(0xff6666);
      
      // HP bar
      const hpBarBg = this.add.rectangle(0, -TILE_SIZE * 0.6, TILE_SIZE * 0.8, 3, 0x000000, 0.5);
      const hpBar = this.add.rectangle(0, -TILE_SIZE * 0.6, TILE_SIZE * 0.8, 3, 0xff0000);
      
      container.add([shadow, sprite, hpBarBg, hpBar]);
      container.setDepth(9);
      
      this.mobs.set(key, { body: container, hp: hpBar });
    });

    this.room.state.mobs?.onRemove?.((_: any, key: string) => {
      const mob = this.mobs.get(key);
      mob?.body.destroy();
      this.mobs.delete(key);
    });

    this.room.state.mobs?.onChange?.((m: any, key: string) => {
      const mob = this.mobs.get(key);
      if (!mob) return;
      
      // Update position
      this.tweens.add({
        targets: mob.body,
        x: m.x * TILE_SIZE,
        y: m.y * TILE_SIZE,
        duration: 100
      });
      
      // Update HP
      const hpPercent = m.hp / m.maxHp;
      mob.hp.setScale(hpPercent, 1);
    });

    // Setup input and UI
    this.setupInput();
    this.setupChat();
    this.setupToasts();
    
    // Handle shop
    this.room.onMessage("shop:list", (payload: any) => this.showShop(payload));
    this.room.onMessage("shop:result", (payload: any) => this.updateShopResult(payload));
    
    // Handle chat
    this.room.onMessage("chat", (msg: ChatMessage) => this.appendChat(msg));

    // Fade splash
    if (this.splashImage) {
      this.tweens.add({ 
        targets: this.splashImage, 
        alpha: 0, 
        duration: 600, 
        onComplete: () => this.splashImage?.destroy() 
      });
    }
    
    this.showToast("Connected!", "ok");
  }

  private createAnimations() {
    ['player', 'other_player', 'mob'].forEach(key => {
      // Idle animations
      ['down', 'left', 'right', 'up'].forEach((dir, i) => {
        this.anims.create({
          key: `${key}_idle_${dir}`,
          frames: [{ key, frame: i * 4 }],
          frameRate: 1,
          repeat: 0
        });
        
        // Walk animations
        this.anims.create({
          key: `${key}_walk_${dir}`,
          frames: this.anims.generateFrameNumbers(key, { start: i * 4, end: i * 4 + 3 }),
          frameRate: 8,
          repeat: -1
        });
      });
    });
  }

  private generateAndDrawMap() {
    const width = MAP.width;
    const height = MAP.height;
    
    // Initialize terrain map
    this.terrainMap = Array(height).fill(null).map(() => Array(width).fill(0));
    
    // Generate Michigan-like landmass
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    
    // Draw water background
    this.mapLayer.fillStyle(0x2e86ab, 1);
    this.mapLayer.fillRect(0, 0, width * TILE_SIZE, height * TILE_SIZE);
    
    // Create land areas
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Main landmass
        if (distance < 25) {
          this.terrainMap[y][x] = 1; // Land
          
          // Draw grass
          this.mapLayer.fillStyle(0x27ae60, 1);
          this.mapLayer.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          
          // Add grass texture
          this.mapLayer.fillStyle(0x229954, 0.3);
          for (let i = 0; i < 2; i++) {
            const gx = x * TILE_SIZE + Math.random() * TILE_SIZE;
            const gy = y * TILE_SIZE + Math.random() * TILE_SIZE;
            this.mapLayer.fillRect(gx, gy, 2, 3);
          }
        }
        // Beach/shore
        else if (distance < 28) {
          this.terrainMap[y][x] = 2; // Sand
          
          // Draw sand
          this.mapLayer.fillStyle(0xf4d03f, 1);
          this.mapLayer.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
        // Water (already drawn as background)
        else {
          this.terrainMap[y][x] = 0; // Water
          
          // Add wave effects
          if (Math.random() > 0.95) {
            this.mapLayer.lineStyle(1, 0x5dade2, 0.3);
            this.mapLayer.beginPath();
            this.mapLayer.moveTo(x * TILE_SIZE, y * TILE_SIZE + TILE_SIZE/2);
            this.mapLayer.lineTo(x * TILE_SIZE + TILE_SIZE, y * TILE_SIZE + TILE_SIZE/2);
            this.mapLayer.strokePath();
          }
        }
      }
    }
    
    // Add decorations (trees, rocks) only on land
    this.addDecorations();
  }

  private addDecorations() {
    // Add trees only on grass tiles
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(Math.random() * MAP.width);
      const y = Math.floor(Math.random() * MAP.height);
      
      // Only place trees on land (terrain type 1)
      if (this.terrainMap[y][x] === 1) {
        const px = x * TILE_SIZE + TILE_SIZE/2;
        const py = y * TILE_SIZE + TILE_SIZE/2;
        
        // Tree shadow
        this.decorLayer.fillStyle(0x000000, 0.2);
        this.decorLayer.fillEllipse(px, py + 8, 10, 5);
        
        // Tree trunk
        this.decorLayer.fillStyle(0x6b4423, 1);
        this.decorLayer.fillRect(px - 3, py - 5, 6, 12);
        
        // Tree leaves
        this.decorLayer.fillStyle(0x145a32, 1);
        this.decorLayer.fillCircle(px, py - 12, 10);
        this.decorLayer.fillStyle(0x196f3d, 1);
        this.decorLayer.fillCircle(px - 5, py - 10, 7);
        this.decorLayer.fillCircle(px + 5, py - 10, 7);
      }
    }
    
    // Add rocks on sand or grass
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(Math.random() * MAP.width);
      const y = Math.floor(Math.random() * MAP.height);
      
      // Place rocks on land or sand
      if (this.terrainMap[y][x] === 1 || this.terrainMap[y][x] === 2) {
        const px = x * TILE_SIZE + TILE_SIZE/2;
        const py = y * TILE_SIZE + TILE_SIZE/2;
        
        // Rock shadow
        this.decorLayer.fillStyle(0x000000, 0.15);
        this.decorLayer.fillEllipse(px, py + 3, 6, 3);
        
        // Rock
        this.decorLayer.fillStyle(0x7f8c8d, 1);
        this.decorLayer.fillCircle(px, py, 5);
        this.decorLayer.fillStyle(0x95a5a6, 1);
        this.decorLayer.fillCircle(px - 2, py - 2, 3);
      }
    }
  }

  private setupInput() {
    // Track last input state and target position
    let lastInput = { up: false, down: false, left: false, right: false };
    let targetPos: { x: number, y: number } | null = null;
    let myPos = { x: 0, y: 0 };
    
    // Left or right-click to move
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Allow both left and right click for movement
      if (pointer.leftButtonDown() || pointer.rightButtonDown()) {
        // Get world coordinates
        const worldX = this.cameras.main.scrollX + pointer.x / this.cameras.main.zoom;
        const worldY = this.cameras.main.scrollY + pointer.y / this.cameras.main.zoom;
        
        // Convert to tile coordinates
        targetPos = {
          x: Math.floor(worldX / TILE_SIZE),
          y: Math.floor(worldY / TILE_SIZE)
        };
        
        // Visual feedback - create a click indicator
        const indicator = this.add.graphics();
        indicator.lineStyle(2, 0x00ff00, 1);
        indicator.strokeCircle(worldX, worldY, 10);
        indicator.setDepth(50);
        
        this.tweens.add({
          targets: indicator,
          alpha: 0,
          duration: 500,
          onComplete: () => indicator.destroy()
        });
      }
    });
    
    // Movement at 20Hz with client-side prediction
    this.time.addEvent({
      delay: 50, // 20Hz tick rate
      callback: () => {
        // Get current predicted position
        myPos.x = Math.round(this.predictedPosition.x);
        myPos.y = Math.round(this.predictedPosition.y);
        
        let up = this.cursors.up?.isDown;
        let down = this.cursors.down?.isDown;
        let left = this.cursors.left?.isDown;
        let right = this.cursors.right?.isDown;
        
        // Simple pathfinding to target if right-clicked
        if (targetPos && !up && !down && !left && !right) {
          const dx = targetPos.x - myPos.x;
          const dy = targetPos.y - myPos.y;
          
          // Move towards target
          if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
            if (Math.abs(dx) > Math.abs(dy)) {
              right = dx > 0;
              left = dx < 0;
            } else {
              down = dy > 0;
              up = dy < 0;
            }
          } else {
            // Reached target
            targetPos = null;
          }
        }
        
        // Apply client-side prediction
        if (up || down || left || right) {
          this.applyInputPrediction({ up, down, left, right }, 50 / 1000); // dt in seconds
        }
        
        // Send input if changed or if still moving
        if (up !== lastInput.up || down !== lastInput.down || 
            left !== lastInput.left || right !== lastInput.right ||
            up || down || left || right) {
          this.seq++;
          const timestamp = Date.now();
          const inputData = { seq: this.seq, up, down, left, right, timestamp };
          
          // Store input for reconciliation
          this.inputHistory.push(inputData);
          
          // Keep input history manageable (last 1 second)
          const cutoff = timestamp - 1000;
          this.inputHistory = this.inputHistory.filter(input => input.timestamp >= cutoff);
          
          this.room?.send("input", inputData);
          lastInput = { up, down, left, right };
        }
      },
      loop: true
    });

    // Attack
    const space = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    space.on("down", () => {
      // Track combat initiation
      analytics.track({
        event: AnalyticsEvent.COMBAT_STARTED,
        timestamp: Date.now()
      });
      
      this.room?.send("attack");
    });

    // Shop
    const keyE = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    keyE.on("down", () => this.tryOpenShop());

    // Chat
    const enter = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    enter.on("down", () => this.toggleChat());
  }

  private tryOpenShop() {
    // Track shop opened
    analytics.track({
      event: AnalyticsEvent.SHOP_OPENED,
      timestamp: Date.now()
    });
    
    this.room?.send("shop:list");
  }

  private toggleChat() {
    if (!this.chatInputEl) return;
    
    if (this.chatInputEl.style.display === "none") {
      this.chatInputEl.style.display = "block";
      this.chatInputEl.focus();
    } else {
      this.chatInputEl.style.display = "none";
    }
  }

  // Preserve all the chat/shop/toast methods from original
  private setupChat() {
    const root = document.createElement("div");
    Object.assign(root.style, {
      position: "absolute",
      bottom: "20px",
      left: "20px",
      width: "300px",
      height: "150px",
      display: "flex",
      flexDirection: "column",
      pointerEvents: "none",
      zIndex: 10
    });

    const log = document.createElement("div");
    Object.assign(log.style, {
      flex: "1",
      overflowY: "auto",
      background: "rgba(0,0,0,0.5)",
      padding: "8px",
      borderRadius: "4px",
      fontSize: "12px",
      color: "#ffffff",
      marginBottom: "4px"
    });

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Press Enter to chat...";
    Object.assign(input.style, {
      padding: "4px 8px",
      background: "rgba(0,0,0,0.7)",
      border: "1px solid rgba(255,255,255,0.2)",
      borderRadius: "4px",
      color: "#ffffff",
      fontSize: "12px",
      display: "none",
      pointerEvents: "all"
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && input.value.trim()) {
        const message = input.value.trim();
        
        // Track chat message
        analytics.track({
          event: AnalyticsEvent.CHAT_MESSAGE_SENT,
          timestamp: Date.now(),
          messageLength: message.length
        });
        
        this.room?.send("chat", message);
        input.value = "";
        input.style.display = "none";
      } else if (e.key === "Escape") {
        input.style.display = "none";
      }
    });

    root.appendChild(log);
    root.appendChild(input);
    document.body.appendChild(root);
    
    this.chatLogEl = log;
    this.chatInputEl = input;
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
      color: "#ffffff",
      zIndex: 20
    });

    root.innerHTML = `
      <h3 style="margin: 0 0 12px 0; color: #ffd700;">Shop</h3>
      <div id="shop-items"></div>
      <button id="shop-close" style="margin-top: 12px;">Close</button>
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

    root.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.id === "shop-close") {
        root.remove();
        this.shopEl = undefined;
      } else if (target.dataset.itemId) {
        this.room?.send("shop:buy", {
          id: target.dataset.itemId,
          qty: parseInt(target.dataset.qty || "1")
        });
      }
    });

    document.body.appendChild(root);
    this.shopEl = root;
  }

  private updateShopResult(payload: any) {
    if (payload.ok) {
      this.showToast("Purchase successful!", "ok");
      
      // Track successful shop transaction
      analytics.track({
        event: AnalyticsEvent.SHOP_TRANSACTION,
        timestamp: Date.now(),
        transactionSuccess: true,
        playerGold: payload.gold
      });
    } else {
      this.showToast(payload.reason || "Purchase failed", "error");
      
      // Track failed transaction
      analytics.track({
        event: AnalyticsEvent.SHOP_TRANSACTION,
        timestamp: Date.now(),
        transactionSuccess: false
      });
    }
  }

  private setupToasts() {
    this.toastRoot = document.createElement("div");
    Object.assign(this.toastRoot.style, {
      position: "absolute",
      top: "20px",
      right: "20px",
      zIndex: 30
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
      fontSize: "14px"
    });
    toast.textContent = message;
    this.toastRoot?.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  private saveSave(player: any) {
    localStorage.setItem("toodee_save", JSON.stringify({
      name: player.name,
      x: player.x,
      y: player.y
    }));
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
    const a = ["Bold", "Swift", "Calm", "Brave", "Merry"];
    const b = ["Fox", "Owl", "Pine", "Fawn", "Wolf"];
    return `${a[Math.floor(Math.random() * a.length)]}${b[Math.floor(Math.random() * b.length)]}`;
  }

  // Client-side prediction methods
  private applyInputPrediction(input: { up: boolean; down: boolean; left: boolean; right: boolean }, dt: number) {
    const vel = { x: 0, y: 0 };
    if (input.up) vel.y -= 1;
    if (input.down) vel.y += 1;
    if (input.left) vel.x -= 1;
    if (input.right) vel.x += 1;
    
    // normalize diagonal movement
    if (vel.x !== 0 || vel.y !== 0) {
      const mag = Math.hypot(vel.x, vel.y);
      vel.x /= mag;
      vel.y /= mag;
    }
    
    // Calculate new position
    const oldX = this.predictedPosition.x;
    const oldY = this.predictedPosition.y;
    const nx = this.predictedPosition.x + vel.x * this.speed * dt;
    const ny = this.predictedPosition.y + vel.y * this.speed * dt;

    // Client-side collision detection (matching server logic)
    let canMoveX = true;
    let canMoveY = true;
    
    // Check X movement
    if (!this.isWalkableClient(Math.round(nx), Math.round(this.predictedPosition.y))) {
      canMoveX = false;
    }
    
    // Check Y movement  
    if (!this.isWalkableClient(Math.round(this.predictedPosition.x), Math.round(ny))) {
      canMoveY = false;
    }
    
    // Check diagonal movement
    if (!this.isWalkableClient(Math.round(nx), Math.round(ny))) {
      canMoveX = false;
      canMoveY = false;
    }
    
    // Apply movement based on collision results
    if (canMoveX) {
      this.predictedPosition.x = nx;
    }
    if (canMoveY) {
      this.predictedPosition.y = ny;
    }
  }

  private isWalkableClient(x: number, y: number): boolean {
    // Check bounds
    if (x < 0 || y < 0 || x >= MAP.width || y >= MAP.height) return false;
    
    // Check terrain map (client-side version)
    if (this.terrainMap[y] && this.terrainMap[y][x] !== undefined) {
      return this.terrainMap[y][x] === 1; // 1 = land, walkable
    }
    
    // Fallback for areas not in terrain map
    return true;
  }

  private replayInputs(lastProcessedSeq: number) {
    // Re-apply all inputs that happened after the server's last processed input
    const inputsToReplay = this.inputHistory.filter(input => input.seq > lastProcessedSeq);
    
    for (const input of inputsToReplay) {
      this.applyInputPrediction(input, 50 / 1000); // Fixed 50ms timestep
    }
  }
}