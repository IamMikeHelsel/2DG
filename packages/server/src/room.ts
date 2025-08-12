import { Room, Client } from "colyseus";
import { WorldState, Player, Mob, DroppedItem, Projectile } from "./state";
import { TICK_RATE, MAP, ChatMessage, NPC_MERCHANT, SHOP_ITEMS, FounderTier, FOUNDER_REWARDS, EARLY_BIRD_LIMIT, BETA_TEST_PERIOD_DAYS, BUG_HUNTER_REPORTS_REQUIRED, REFERRAL_REWARDS, ANNIVERSARY_REWARDS, calculateLevelFromXp, getBaseStatsForLevel, DEFAULT_ITEMS, MOB_TEMPLATES, LOOT_TABLES, MobType, AIState, DamageType } from "@toodee/shared";
import { generateMichiganish, isWalkable, Grid } from "./map";

type Input = { seq: number; up: boolean; down: boolean; left: boolean; right: boolean };

export class GameRoom extends Room<WorldState> {
  private inputs = new Map<string, Input>();
  private grid!: Grid;
  private speed = 4; // tiles per second (server units are tiles)
  private lastAttack = new Map<string, number>();
  private attackCooldown = 400; // ms
  private founderTracker = new Map<string, { joinOrder: number; tier: FounderTier }>();
  private joinCounter = 0;

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

    this.setSimulationInterval((dtMS) => this.update(dtMS / 1000), 1000 / TICK_RATE);
  }

  onJoin(client: Client, options: any) {
    const p = new Player();
    p.id = client.sessionId;
    p.name = options?.name || "Adventurer";
    
    // Initialize progression system
    p.level = 1;
    p.totalXp = 0;
    p.currentXp = 0;
    p.xpToNext = 100;
    
    // Calculate base stats for level 1
    const baseStats = getBaseStatsForLevel(1);
    p.attack = baseStats.attack;
    p.defense = baseStats.defense;
    p.magicAttack = baseStats.magicAttack;
    p.magicDefense = baseStats.magicDefense;
    p.accuracy = baseStats.accuracy;
    p.evasion = baseStats.evasion;
    
    p.maxHp = 50 + (p.level - 1) * 10; // Base HP scaling
    p.hp = p.maxHp;
    p.gold = 50;
    p.pots = 2;
    
    // Initialize equipment and inventory
    p.weaponId = "";
    p.armorId = "";
    p.accessoryId = "";
    p.inventory.set("health_potion", 3);
    p.inventory.set("wooden_sword", 1);
    
    // Initialize zone
    p.currentZone = "town";
    
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
    
    // Restore progression if provided
    if (options?.restore) {
      if (typeof options.restore.gold === "number") p.gold = Math.max(0, Math.min(999999, Math.floor(options.restore.gold)));
      if (typeof options.restore.pots === "number") p.pots = Math.max(0, Math.min(999, Math.floor(options.restore.pots)));
      if (typeof options.restore.totalXp === "number") {
        this.setPlayerXp(p, options.restore.totalXp);
      }
    }
    
    this.state.players.set(client.sessionId, p);
    
    // Spawn some basic mobs for testing
    this.initializeMobs();
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

  private handleAttack(playerId: string) {
    const now = Date.now();
    const last = this.lastAttack.get(playerId) || 0;
    if (now - last < this.attackCooldown) return;
    this.lastAttack.set(playerId, now);

    const attacker = this.state.players.get(playerId);
    if (!attacker || attacker.hp <= 0) return;

    // Hit check: 1-tile arc in front, mobs first then players
    const front = neighbor(attacker.x, attacker.y, attacker.dir);
    
    // Attack mobs first
    let hitSomething = false;
    this.state.mobs.forEach((mob, key) => {
      const mx = Math.round(mob.x), my = Math.round(mob.y);
      if (mx === front.x && my === front.y && mob.hp > 0 && !hitSomething) {
        // Calculate damage based on attacker stats and mob defense
        const template = MOB_TEMPLATES[mob.type as MobType];
        if (!template) return;
        
        const levelMultiplier = 1 + (mob.level - 1) * 0.2;
        const mobDefense = Math.floor(template.baseStats.defense * levelMultiplier);
        
        // Simple damage calculation: attack - defense, minimum 1
        const rawDamage = attacker.attack - mobDefense;
        const finalDamage = Math.max(1, Math.floor(rawDamage * (0.8 + Math.random() * 0.4))); // 20% variance
        
        mob.hp = Math.max(0, mob.hp - finalDamage);
        hitSomething = true;
        
        // Broadcast damage
        this.broadcast("damage", {
          targetId: mob.id,
          damage: finalDamage,
          targetType: "mob"
        });
        
        if (mob.hp === 0) {
          // Grant XP and potentially loot
          this.grantXp(attacker, template.xpReward);
          this.dropLoot(mob.x, mob.y, template.lootTableId, attacker.id);
          
          // Broadcast mob death
          this.broadcast("mob_death", {
            mobId: mob.id,
            killerName: attacker.name
          });
          
          const mobId = key;
          setTimeout(() => this.respawnMob(mobId), 15000); // 15 second respawn
        } else {
          // Set mob target to attacker for AI
          mob.targetPlayerId = attacker.id;
          mob.aiState = AIState.Chasing;
        }
      }
    });
    
    if (hitSomething) return;

    // Then attack other players (PvP)
    this.state.players.forEach((target, id) => {
      if (id === playerId || target.hp <= 0) return;
      const tx = Math.round(target.x);
      const ty = Math.round(target.y);
      if (tx === front.x && ty === front.y) {
        // Calculate PvP damage (reduced compared to PvE)
        const rawDamage = attacker.attack - target.defense;
        const finalDamage = Math.max(5, Math.floor(rawDamage * 0.3 * (0.8 + Math.random() * 0.4))); // Much lower for PvP
        
        target.hp = Math.max(0, target.hp - finalDamage);
        
        // Broadcast PvP damage
        this.broadcast("damage", {
          targetId: target.id,
          damage: finalDamage,
          targetType: "player",
          attackerName: attacker.name
        });
        
        if (target.hp === 0) {
          // Player death - respawn at town center after delay
          const targetId = id;
          setTimeout(() => {
            const t = this.state.players.get(targetId);
            if (!t) return;
            t.x = Math.floor(MAP.width * 0.45);
            t.y = Math.floor(MAP.height * 0.55);
            t.hp = t.maxHp;
            t.currentZone = "town"; // Force back to town
          }, 3000);
        }
      }
    });
  }

  private spawnMob(pos: { x: number; y: number }) {
    // Legacy method - now use spawnMobOfType with default slime
    this.spawnMobOfType(pos.x, pos.y, MobType.Slime);
  }

  private respawnMob(id: string) {
    const mob = this.state.mobs.get(id);
    if (!mob) return;
    
    // Respawn with full health at original patrol center
    mob.hp = mob.maxHp;
    mob.x = mob.patrolCenterX;
    mob.y = mob.patrolCenterY;
    mob.aiState = AIState.Patrol;
    mob.targetPlayerId = "";
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
    // Spawn a training dummy near town
    this.spawnMob({ x: Math.floor(MAP.width * 0.45) + 4, y: Math.floor(MAP.height * 0.55) });
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

  // XP/Level System Methods
  private setPlayerXp(player: Player, totalXp: number) {
    player.totalXp = totalXp;
    const levelInfo = calculateLevelFromXp(totalXp);
    
    if (levelInfo.level > player.level) {
      // Level up!
      player.level = levelInfo.level;
      this.recalculatePlayerStats(player);
      
      // Broadcast level up message
      this.broadcast("level_up", {
        playerId: player.id,
        playerName: player.name,
        newLevel: player.level
      });
    }
    
    player.currentXp = levelInfo.currentXp;
    player.xpToNext = levelInfo.xpToNext;
  }
  
  private grantXp(player: Player, xpAmount: number) {
    this.setPlayerXp(player, player.totalXp + xpAmount);
  }
  
  private recalculatePlayerStats(player: Player) {
    const baseStats = getBaseStatsForLevel(player.level);
    
    // Apply base stats
    player.attack = baseStats.attack;
    player.defense = baseStats.defense;
    player.magicAttack = baseStats.magicAttack;
    player.magicDefense = baseStats.magicDefense;
    player.accuracy = baseStats.accuracy;
    player.evasion = baseStats.evasion;
    
    // Update HP (but keep current HP ratio)
    const oldMaxHp = player.maxHp;
    const hpRatio = player.hp / oldMaxHp;
    player.maxHp = 50 + (player.level - 1) * 10;
    
    // TODO: Apply equipment bonuses here when equipment system is fully implemented
    
    // Restore HP if leveling up
    if (player.maxHp > oldMaxHp) {
      player.hp = Math.max(player.hp, player.hp + (player.maxHp - oldMaxHp));
    }
  }
  
  private initializeMobs() {
    // Only spawn mobs if we don't have any
    if (this.state.mobs.size > 0) return;
    
    // Spawn some basic mobs around the map
    const mobSpawns = [
      { x: MAP.width * 0.3, y: MAP.height * 0.3, type: MobType.Slime },
      { x: MAP.width * 0.7, y: MAP.height * 0.3, type: MobType.Slime },
      { x: MAP.width * 0.3, y: MAP.height * 0.7, type: MobType.Goblin },
      { x: MAP.width * 0.7, y: MAP.height * 0.7, type: MobType.Wolf },
    ];
    
    mobSpawns.forEach(spawn => {
      this.spawnMobOfType(spawn.x, spawn.y, spawn.type);
    });
  }
  
  private spawnMobOfType(x: number, y: number, mobType: MobType, level: number = 1) {
    const template = MOB_TEMPLATES[mobType];
    if (!template) return;
    
    const mob = new Mob();
    mob.id = `${mobType}_${Math.random().toString(36).slice(2, 8)}`;
    mob.type = mobType;
    mob.name = template.name;
    mob.x = x;
    mob.y = y;
    mob.level = level;
    
    // Scale stats with level
    const levelMultiplier = 1 + (level - 1) * 0.2;
    mob.maxHp = Math.floor(template.baseHp * levelMultiplier);
    mob.hp = mob.maxHp;
    
    mob.aiState = AIState.Patrol;
    mob.targetPlayerId = "";
    mob.patrolCenterX = x;
    mob.patrolCenterY = y;
    
    this.state.mobs.set(mob.id, mob);
  }
  
  private dropLoot(x: number, y: number, lootTableId: string, killerPlayerId: string) {
    const lootTable = LOOT_TABLES[lootTableId];
    if (!lootTable) return;
    
    // Process each loot entry
    lootTable.entries.forEach(entry => {
      if (Math.random() <= entry.dropChance) {
        const drop = new DroppedItem();
        drop.id = `drop_${Math.random().toString(36).slice(2, 8)}`;
        drop.itemId = entry.itemId;
        drop.quantity = entry.quantity;
        drop.x = x + (Math.random() - 0.5) * 2; // Small random spread
        drop.y = y + (Math.random() - 0.5) * 2;
        drop.dropTime = Date.now();
        drop.droppedBy = killerPlayerId;
        
        this.state.droppedItems.set(drop.id, drop);
        
        // Auto-cleanup after 5 minutes
        setTimeout(() => {
          this.state.droppedItems.delete(drop.id);
        }, 300000);
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
