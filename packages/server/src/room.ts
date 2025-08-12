
import colyseus from "colyseus";
import { WorldState, Player, Mob, InventoryItem, InventorySlot, DroppedItem } from "./state.js";
import { 
  TICK_RATE, 
  MAP, 
  type ChatMessage, 
  NPC_MERCHANT, 
  SHOP_ITEMS, 
  FounderTier,
  FOUNDER_REWARDS,
  EARLY_BIRD_LIMIT,
  BETA_TEST_PERIOD_DAYS,
  BUG_HUNTER_REPORTS_REQUIRED,
  REFERRAL_REWARDS,
  ANNIVERSARY_REWARDS,
  SPAWN_DUMMY_PROBABILITY,
  INVENTORY_SIZE,
  BASE_ITEMS,
  LOOT_TABLES,
  type InventoryMoveMessage,
  type EquipItemMessage,
  type PickupItemMessage,
  type UseItemMessage,
  ItemType,
  EquipSlot
} from "@toodee/shared";
import { generateMichiganish, isWalkable, type Grid } from "./map.js";

const { Room } = colyseus;
type Client = colyseus.Client;


type Input = { seq: number; up: boolean; down: boolean; left: boolean; right: boolean };

export class GameRoom extends Room<WorldState> {
  private inputs = new Map<string, Input>();
  private grid!: Grid;
  private speed = 4; // tiles per second (server units are tiles)
  private lastAttack = new Map<string, number>();
  private attackCooldown = 400; // ms
  
  // Founder system properties
  private joinCounter = 0;
  private founderTracker = new Map<string, any>();
  
  // Inventory system
  private itemInstanceCounter = 0;

  // Performance monitoring
  private tickTimes: number[] = [];
  private lastPerformanceLog = 0;
  private maxTickTime = 0;


  onCreate(options: any) {
    this.setPatchRate(1000 / 10); // send state ~10/s; interpolate on client
    this.setState(new WorldState());
    this.state.width = MAP.width;
    this.state.height = MAP.height;

    this.grid = generateMichiganish();

    this.onMessage("input", (client, data: Input) => {
      this.inputs.set(client.sessionId, data);
    });
    this.onMessage("chat", (client, text: string) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      const clean = sanitizeChat(text);
      if (!clean) return;
      const msg: ChatMessage = { from: p.name || "Adventurer", text: clean, ts: Date.now() };
      this.broadcast("chat", msg);
    });
    this.onMessage("attack", (client) => this.handleAttack(client.sessionId));
    this.onMessage("shop:list", (client) => this.handleShopList(client.sessionId));
    this.onMessage("shop:buy", (client, data: { id: string; qty?: number }) => this.handleShopBuy(client.sessionId, data));
    this.onMessage("bug_report", (client, data: { description: string }) => this.handleBugReport(client.sessionId, data));
    this.onMessage("referral", (client, data: { referredPlayerId: string }) => this.handleReferral(client.sessionId, data));
    
    // Inventory system messages
    this.onMessage("inventory:move", (client, data: InventoryMoveMessage) => this.handleInventoryMove(client.sessionId, data));
    this.onMessage("inventory:equip", (client, data: EquipItemMessage) => this.handleEquipItem(client.sessionId, data));
    this.onMessage("inventory:pickup", (client, data: PickupItemMessage) => this.handlePickupItem(client.sessionId, data));
    this.onMessage("inventory:use", (client, data: UseItemMessage) => this.handleUseItem(client.sessionId, data));

    this.setSimulationInterval((dtMS) => this.update(dtMS / 1000), 1000 / TICK_RATE);
  }

  onJoin(client: Client, options: any) {
    const p = new Player();
    p.id = client.sessionId;
    p.name = options?.name || "Adventurer";
    p.maxHp = 100;
    p.hp = p.maxHp;
    p.gold = 20;
    p.pots = 0;
    
    // Initialize inventory system
    this.initializePlayerInventory(p);
    
    // Initialize founder rewards tracking
    p.joinTimestamp = Date.now();
    p.bugReports = 0;
    p.referralsCount = 0;
    p.anniversaryParticipated = false;
    p.displayTitle = "";
    p.chatColor = "#FFFFFF";
    
    // Determine founder tier
    this.joinCounter++;
    const founderTier = this.determineFounderTier(this.joinCounter, p.joinTimestamp);
    p.founderTier = founderTier;
    this.founderTracker.set(client.sessionId, { joinOrder: this.joinCounter, tier: founderTier });
    
    // Grant initial founder rewards
    this.grantFounderRewards(p, founderTier);
    
    // spawn near center (or restore from client-provided snapshot for demo persistence)
    const rx = options?.restore?.x, ry = options?.restore?.y;
    if (typeof rx === "number" && typeof ry === "number") {
      const tx = clamp(Math.round(rx), 0, MAP.width - 1);
      const ty = clamp(Math.round(ry), 0, MAP.height - 1);
      p.x = tx;
      p.y = ty;
    } else {
      p.x = Math.floor(MAP.width * 0.45);
      p.y = Math.floor(MAP.height * 0.55);
    }
    if (typeof options?.restore?.gold === "number") p.gold = Math.max(0, Math.min(999999, Math.floor(options.restore.gold)));
    if (typeof options?.restore?.pots === "number") p.pots = Math.max(0, Math.min(999, Math.floor(options.restore.pots)));
    this.state.players.set(client.sessionId, p);
  }

  onLeave(client: Client, consented: boolean) {
    this.state.players.delete(client.sessionId);
    this.inputs.delete(client.sessionId);
  }

  update(dt: number) {
    const tickStart = performance.now();
    
    // per-player movement
    this.state.players.forEach((p, id) => {
      const inp = this.inputs.get(id);
      if (!inp) return;
      
      const vel = { x: 0, y: 0 };
      if (inp.up) vel.y -= 1;
      if (inp.down) vel.y += 1;
      if (inp.left) vel.x -= 1;
      if (inp.right) vel.x += 1;
      
      // normalize diagonal movement
      if (vel.x !== 0 || vel.y !== 0) {
        const mag = Math.hypot(vel.x, vel.y);
        vel.x /= mag;
        vel.y /= mag;
      }
      
      const oldX = p.x;
      const oldY = p.y;
      
      // Calculate new position
      const nx = p.x + vel.x * this.speed * dt;
      const ny = p.y + vel.y * this.speed * dt;

      // Enhanced collision detection
      const tx = Math.round(nx);
      const ty = Math.round(ny);
      
      // Check if new position is walkable
      let canMoveX = true;
      let canMoveY = true;
      
      // Check X movement
      if (!isWalkable(this.grid, Math.round(nx), Math.round(p.y))) {
        canMoveX = false;
      }
      
      // Check Y movement  
      if (!isWalkable(this.grid, Math.round(p.x), Math.round(ny))) {
        canMoveY = false;
      }
      
      // Check diagonal movement
      if (!isWalkable(this.grid, Math.round(nx), Math.round(ny))) {
        canMoveX = false;
        canMoveY = false;
      }
      
      // Apply movement based on collision results
      if (canMoveX) {
        p.x = nx;
      }
      if (canMoveY) {
        p.y = ny;
      }
      
      // Only update direction if actually moving or trying to move
      if (vel.x !== 0 || vel.y !== 0) {
        if (vel.y < 0) p.dir = 0; // up
        else if (vel.x > 0) p.dir = 1; // right
        else if (vel.y > 0) p.dir = 2; // down
        else if (vel.x < 0) p.dir = 3; // left
      }

      p.lastSeq = inp.seq >>> 0;
    });
    
    // Cleanup dropped items periodically (every 60 ticks = ~3 seconds)
    if (Date.now() % 60000 < 50) { // Check approximately every minute
      this.cleanupDroppedItems();
    }
    
    // Performance monitoring
    const tickEnd = performance.now();
    const tickTime = tickEnd - tickStart;
    this.tickTimes.push(tickTime);
    this.maxTickTime = Math.max(this.maxTickTime, tickTime);
    
    // Keep only last 100 measurements
    if (this.tickTimes.length > 100) {
      this.tickTimes.shift();
    }
    
    // Log performance every 30 seconds
    const now = Date.now();
    if (now - this.lastPerformanceLog > 30000) {
      this.logPerformanceStats();
      this.lastPerformanceLog = now;
    }
  }

  private handleAttack(playerId: string) {
    const now = Date.now();
    const last = this.lastAttack.get(playerId) || 0;
    if (now - last < this.attackCooldown) return;
    this.lastAttack.set(playerId, now);

    const attacker = this.state.players.get(playerId);
    if (!attacker) return;

    // Hit check: 1-tile arc in front, mobs first then players
    const front = neighbor(attacker.x, attacker.y, attacker.dir);
    // Attack mobs
    let hitSomething = false;
    this.state.mobs.forEach((m, key) => {
      const mx = Math.round(m.x), my = Math.round(m.y);
      if (mx === front.x && my === front.y && m.hp > 0 && !hitSomething) {
        m.hp = Math.max(0, m.hp - 30);
        hitSomething = true;
        if (m.hp === 0) {
          // reward attacker
          attacker.hp = Math.min(attacker.maxHp, attacker.hp + 10);
          attacker.gold = Math.min(999999, attacker.gold + 10);
          
          // Drop loot
          this.dropLoot(key, m.x, m.y);
          
          const id = key;
          setTimeout(() => this.respawnMob(id), 2000);
        }
      }
    });
    if (hitSomething) return;

    // Then players
    this.state.players.forEach((target, id) => {
      if (id === playerId) return;
      const tx = Math.round(target.x);
      const ty = Math.round(target.y);
      if (tx === front.x && ty === front.y && target.hp > 0) {
        target.hp = Math.max(0, target.hp - 25);
        if (target.hp === 0) {
          // respawn at town center after short delay
          const rid = id;
          setTimeout(() => {
            const t = this.state.players.get(rid);
            if (!t) return;
            t.x = Math.floor(MAP.width * 0.45);
            t.y = Math.floor(MAP.height * 0.55);
            t.hp = t.maxHp;
          }, 1500);
        }
      }
    });
  }

  private spawnMob(pos: { x: number; y: number }) {
    const m = new Mob();
    m.id = `mob_${Math.random().toString(36).slice(2, 8)}`;
    m.x = pos.x;
    m.y = pos.y;
    m.maxHp = 60;
    m.hp = m.maxHp;
    this.state.mobs.set(m.id, m);
  }

  private respawnMob(id: string) {
    const m = this.state.mobs.get(id);
    if (!m) return;
    // simple respawn at original spot
    m.hp = m.maxHp;
  }

  private isNearMerchant(p: Player) {
    const dx = Math.abs(Math.round(p.x) - NPC_MERCHANT.x);
    const dy = Math.abs(Math.round(p.y) - NPC_MERCHANT.y);
    return Math.max(dx, dy) <= 2;
  }

  private handleShopList(playerId: string) {
    const p = this.state.players.get(playerId);
    if (!p) return;
    const payload = { items: SHOP_ITEMS, gold: p.gold, pots: p.pots, npc: NPC_MERCHANT };
    this.clients.find(c => c.sessionId === playerId)?.send("shop:list", payload);
  }

  private handleShopBuy(playerId: string, data: { id: string; qty?: number }) {
    const p = this.state.players.get(playerId);
    if (!p) return;
    if (!this.isNearMerchant(p)) {
      this.clients.find(c => c.sessionId === playerId)?.send("shop:result", { ok: false, reason: "Too far from merchant" });
      return;
    }
    const item = SHOP_ITEMS.find(i => i.id === data?.id);
    const qty = Math.max(1, Math.min(99, Number(data?.qty ?? 1) | 0));
    if (!item) {
      this.clients.find(c => c.sessionId === playerId)?.send("shop:result", { ok: false, reason: "Unknown item" });
      return;
    }
    const cost = item.price * qty;
    if (p.gold < cost) {
      this.clients.find(c => c.sessionId === playerId)?.send("shop:result", { ok: false, reason: "Not enough gold", gold: p.gold, pots: p.pots });
      return;
    }
    p.gold -= cost;
    if (item.id === "pot_small") p.pots = Math.min(999, p.pots + qty);
    this.clients.find(c => c.sessionId === playerId)?.send("shop:result", { ok: true, gold: p.gold, pots: p.pots });
    
    // Spawn a training dummy near town when someone buys potions
    if (Math.random() < SPAWN_DUMMY_PROBABILITY) { // 30% chance
      this.spawnMob({ x: Math.floor(MAP.width * 0.45) + 4, y: Math.floor(MAP.height * 0.55) });
    }
  }

  private logPerformanceStats() {
    if (this.tickTimes.length === 0) return;
    
    const sorted = [...this.tickTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95 = sorted[p95Index];
    const avg = sorted.reduce((sum, time) => sum + time, 0) / sorted.length;
    const playerCount = this.state.players.size;
    
    console.log(`[Performance] Room ${this.roomId}: ${playerCount} players, avg tick: ${avg.toFixed(2)}ms, p95 tick: ${p95.toFixed(2)}ms, max: ${this.maxTickTime.toFixed(2)}ms`);
    
    // Reset max for next period
    this.maxTickTime = 0;
    
    // Alert if p95 exceeds target
    if (p95 > 8) {
      console.warn(`⚠️  Performance warning: p95 tick time ${p95.toFixed(2)}ms exceeds 8ms target with ${playerCount} players`);
    }
  }

  private determineFounderTier(joinOrder: number, joinTimestamp: number): FounderTier {
    // Early Bird: First 50 players
    if (joinOrder <= EARLY_BIRD_LIMIT) {
      return FounderTier.EarlyBird;
    }
    
    // Beta Tester: Within first 2 weeks (simulated with current demo)
    const daysSinceLaunch = (Date.now() - joinTimestamp) / (1000 * 60 * 60 * 24);
    if (daysSinceLaunch <= BETA_TEST_PERIOD_DAYS) {
      return FounderTier.BetaTester;
    }
    
    return FounderTier.None;
  }

  private grantFounderRewards(player: Player, tier: FounderTier) {
    const rewards = FOUNDER_REWARDS[tier];
    for (const reward of rewards) {
      player.unlockedRewards.push(reward.id);
      
      // Apply specific reward effects
      switch (reward.type) {
        case "title":
          if (reward.id === "founder_badge") {
            player.displayTitle = "👑 Founder";
          } else if (reward.id === "bug_hunter_title") {
            player.displayTitle = "🐛 Bug Hunter";
          }
          break;
        case "cosmetic":
          if (reward.id === "special_chat_color") {
            player.chatColor = "#FFD700"; // Gold color for beta testers
          }
          break;
      }
    }
  }

  private handleBugReport(playerId: string, data: { description: string }) {
    const p = this.state.players.get(playerId);
    if (!p) return;
    
    // Basic validation
    if (!data.description || data.description.length < 10) {
      this.clients.find(c => c.sessionId === playerId)?.send("bug_report:result", { 
        ok: false, 
        reason: "Bug report must be at least 10 characters" 
      });
      return;
    }
    
    p.bugReports++;
    
    // Check if player qualifies for Bug Hunter tier
    if (p.bugReports >= BUG_HUNTER_REPORTS_REQUIRED && p.founderTier === FounderTier.None) {
      p.founderTier = FounderTier.BugHunter;
      this.grantFounderRewards(p, FounderTier.BugHunter);
    }
    
    this.clients.find(c => c.sessionId === playerId)?.send("bug_report:result", { 
      ok: true, 
      reportsCount: p.bugReports,
      message: p.bugReports >= BUG_HUNTER_REPORTS_REQUIRED ? "Bug Hunter tier unlocked!" : undefined
    });
  }

  private handleReferral(playerId: string, data: { referredPlayerId: string }) {
    const p = this.state.players.get(playerId);
    if (!p) return;
    
    // Basic validation - in a real system this would verify the referred player exists and is new
    if (!data.referredPlayerId) {
      this.clients.find(c => c.sessionId === playerId)?.send("referral:result", {
        ok: false,
        reason: "Invalid referral data"
      });
      return;
    }
    
    p.referralsCount++;
    
    // Check for referral rewards
    const referralReward = REFERRAL_REWARDS.find(r => r.referrals === p.referralsCount);
    if (referralReward) {
      p.unlockedRewards.push(referralReward.reward.id);
      
      this.clients.find(c => c.sessionId === playerId)?.send("referral:result", {
        ok: true,
        referralsCount: p.referralsCount,
        rewardUnlocked: referralReward.reward
      });
    } else {
      this.clients.find(c => c.sessionId === playerId)?.send("referral:result", {
        ok: true,
        referralsCount: p.referralsCount
      });
    }
  }

  private grantAnniversaryReward(playerId: string, rewardType: "login" | "quest" | "boss") {
    const p = this.state.players.get(playerId);
    if (!p) return;
    
    let reward;
    switch (rewardType) {
      case "login":
        reward = ANNIVERSARY_REWARDS.find(r => r.id === "birthday_badge");
        break;
      case "quest":
        reward = ANNIVERSARY_REWARDS.find(r => r.id === "birthday_quest_reward");
        break;
      case "boss":
        reward = ANNIVERSARY_REWARDS.find(r => r.id === "boss_slayer");
        break;
    }
    
    if (reward && !p.unlockedRewards.includes(reward.id)) {
      p.unlockedRewards.push(reward.id);
      p.anniversaryParticipated = true;
      
      this.clients.find(c => c.sessionId === playerId)?.send("anniversary:reward", {
        reward: reward,
        message: `Anniversary reward unlocked: ${reward.name}!`
      });
    }
  }

  // Inventory System Methods
  
  private initializePlayerInventory(player: Player) {
    // Initialize empty inventory grid
    for (let y = 0; y < INVENTORY_SIZE.height; y++) {
      for (let x = 0; x < INVENTORY_SIZE.width; x++) {
        const slot = new InventorySlot();
        slot.x = x;
        slot.y = y;
        slot.item = undefined;
        player.inventory.push(slot);
      }
    }
    
    // Give starting items
    this.addItemToInventory(player, "rusty_sword", 1);
    this.addItemToInventory(player, "health_potion", 3);
    this.addItemToInventory(player, "wood", 5);
  }

  private generateItemId(): string {
    return `item_${Date.now()}_${++this.itemInstanceCounter}`;
  }

  private addItemToInventory(player: Player, itemId: string, quantity: number): boolean {
    const baseItem = BASE_ITEMS[itemId];
    if (!baseItem) return false;

    // Try to stack with existing items first
    if (baseItem.maxStack > 1) {
      for (const slot of player.inventory) {
        if (slot.item && slot.item.itemId === itemId) {
          const canStack = Math.min(quantity, baseItem.maxStack - slot.item.quantity);
          if (canStack > 0) {
            slot.item.quantity += canStack;
            quantity -= canStack;
            if (quantity <= 0) return true;
          }
        }
      }
    }

    // Find empty slots for remaining quantity
    while (quantity > 0) {
      const emptySlot = player.inventory.find(slot => !slot.item);
      if (!emptySlot) return false; // Inventory full

      const item = new InventoryItem();
      item.itemId = itemId;
      item.quantity = Math.min(quantity, baseItem.maxStack);
      item.durability = 100;
      
      emptySlot.item = item;
      quantity -= item.quantity;
    }

    return true;
  }

  private getInventorySlot(player: Player, x: number, y: number): InventorySlot | null {
    return player.inventory.find(slot => slot.x === x && slot.y === y) || null;
  }

  private handleInventoryMove(playerId: string, data: InventoryMoveMessage) {
    const player = this.state.players.get(playerId);
    if (!player) return;

    const fromSlot = this.getInventorySlot(player, data.fromX, data.fromY);
    const toSlot = this.getInventorySlot(player, data.toX, data.toY);
    
    if (!fromSlot || !toSlot || !fromSlot.item) return;

    const fromItem = fromSlot.item;
    const toItem = toSlot.item;

    // Handle different move scenarios
    if (!toItem) {
      // Simple move to empty slot
      toSlot.item = fromItem;
      fromSlot.item = undefined;
    } else if (toItem.itemId === fromItem.itemId) {
      // Stack items of same type
      const baseItem = BASE_ITEMS[fromItem.itemId];
      if (baseItem && baseItem.maxStack > 1) {
        const canStack = Math.min(fromItem.quantity, baseItem.maxStack - toItem.quantity);
        toItem.quantity += canStack;
        fromItem.quantity -= canStack;
        
        if (fromItem.quantity <= 0) {
          fromSlot.item = undefined;
        }
      }
    } else {
      // Swap items
      toSlot.item = fromItem;
      fromSlot.item = toItem;
    }
  }

  private handleEquipItem(playerId: string, data: EquipItemMessage) {
    const player = this.state.players.get(playerId);
    if (!player) return;

    const slot = this.getInventorySlot(player, data.inventoryX, data.inventoryY);
    if (!slot || !slot.item) return;

    const baseItem = BASE_ITEMS[slot.item.itemId];
    if (!baseItem || baseItem.equipSlot !== data.equipSlot) return;

    // Get current equipped item
    let currentEquipped: InventoryItem | undefined;
    if (data.equipSlot === EquipSlot.Weapon) {
      currentEquipped = player.equipment.weapon;
      player.equipment.weapon = slot.item;
    } else if (data.equipSlot === EquipSlot.Armor) {
      currentEquipped = player.equipment.armor;
      player.equipment.armor = slot.item;
    } else if (data.equipSlot === EquipSlot.Accessory) {
      currentEquipped = player.equipment.accessory;
      player.equipment.accessory = slot.item;
    }

    // Put old equipped item back in inventory
    if (currentEquipped) {
      slot.item = currentEquipped;
    } else {
      slot.item = undefined;
    }

    // Update player stats based on equipment
    this.updatePlayerStats(player);
  }

  private handlePickupItem(playerId: string, data: PickupItemMessage) {
    const player = this.state.players.get(playerId);
    const droppedItem = this.state.droppedItems.get(data.itemInstanceId);
    
    if (!player || !droppedItem) return;

    // Check if player is close enough to pick up
    const distance = Math.sqrt(
      Math.pow(player.x - droppedItem.x, 2) + 
      Math.pow(player.y - droppedItem.y, 2)
    );
    
    if (distance > 2) return; // Must be within 2 tiles

    // Try to add to inventory
    if (this.addItemToInventory(player, droppedItem.itemId, droppedItem.quantity)) {
      this.state.droppedItems.delete(data.itemInstanceId);
    }
  }

  private handleUseItem(playerId: string, data: UseItemMessage) {
    const player = this.state.players.get(playerId);
    if (!player) return;

    const slot = this.getInventorySlot(player, data.inventoryX, data.inventoryY);
    if (!slot || !slot.item) return;

    const baseItem = BASE_ITEMS[slot.item.itemId];
    if (!baseItem || baseItem.type !== ItemType.Consumable) return;

    // Apply item effects
    if (baseItem.stats?.health) {
      player.hp = Math.min(player.maxHp, player.hp + baseItem.stats.health);
    }

    // Consume item
    slot.item.quantity--;
    if (slot.item.quantity <= 0) {
      slot.item = undefined;
    }
  }

  private updatePlayerStats(player: Player) {
    // Reset to base stats
    let totalDamage = 0;
    let totalDefense = 0;
    let totalSpeed = 0;

    // Add equipment bonuses
    [player.equipment.weapon, player.equipment.armor, player.equipment.accessory].forEach(item => {
      if (item) {
        const baseItem = BASE_ITEMS[item.itemId];
        if (baseItem?.stats) {
          totalDamage += baseItem.stats.damage || 0;
          totalDefense += baseItem.stats.defense || 0;
          totalSpeed += baseItem.stats.speed || 0;
        }
      }
    });

    // Apply stats (stored in player for future use)
    // For now we don't have damage/defense/speed fields in Player schema
    // This would need to be added when implementing combat system
  }

  private dropLoot(mobId: string, mobX: number, mobY: number) {
    // Determine loot table based on mob type (for now use basic_mob)
    const lootTable = LOOT_TABLES.basic_mob;
    
    lootTable.forEach(lootEntry => {
      if (Math.random() < lootEntry.chance) {
        const quantity = Math.floor(Math.random() * (lootEntry.maxQuantity - lootEntry.minQuantity + 1)) + lootEntry.minQuantity;
        
        const droppedItem = new DroppedItem();
        droppedItem.id = this.generateItemId();
        droppedItem.itemId = lootEntry.itemId;
        droppedItem.x = mobX + (Math.random() * 2 - 1); // Random position near mob
        droppedItem.y = mobY + (Math.random() * 2 - 1);
        droppedItem.quantity = quantity;
        droppedItem.spawnTime = Date.now();
        
        this.state.droppedItems.set(droppedItem.id, droppedItem);
      }
    });
  }

  // Cleanup dropped items after 5 minutes
  private cleanupDroppedItems() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    this.state.droppedItems.forEach((item, id) => {
      if (now - item.spawnTime > maxAge) {
        this.state.droppedItems.delete(id);
      }
    });
  }
}

function neighbor(x: number, y: number, dir: number) {
  const tx = Math.round(x);
  const ty = Math.round(y);
  if (dir === 0) return { x: tx, y: ty - 1 };
  if (dir === 1) return { x: tx + 1, y: ty };
  if (dir === 2) return { x: tx, y: ty + 1 };
  return { x: tx - 1, y: ty };
}

function sanitizeChat(s: string): string | null {
  if (typeof s !== "string") return null;
  s = s.replace(/\s+/g, " ").trim();
  if (!s) return null;
  if (s.length > 140) s = s.slice(0, 140);
  return s;
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }
