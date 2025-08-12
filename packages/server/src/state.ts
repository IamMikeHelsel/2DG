import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("uint8") dir: number = 0; // 0 up,1 right,2 down,3 left
  // last processed input
  @type("uint32") lastSeq: number = 0;
  @type("uint16") hp: number = 0;
  @type("uint16") maxHp: number = 0;
  @type("uint32") gold: number = 0;
  @type("uint16") pots: number = 0; // small potions
  
  // XP/Level System
  @type("uint8") level: number = 1;
  @type("uint32") totalXp: number = 0;
  @type("uint32") currentXp: number = 0;
  @type("uint32") xpToNext: number = 100;
  
  // Combat Stats (calculated from level + equipment)
  @type("uint16") attack: number = 10;
  @type("uint16") defense: number = 8;
  @type("uint16") magicAttack: number = 8;
  @type("uint16") magicDefense: number = 6;
  @type("uint16") accuracy: number = 85;
  @type("uint16") evasion: number = 5;
  
  // Equipment (item IDs)
  @type("string") weaponId: string = "";
  @type("string") armorId: string = "";
  @type("string") accessoryId: string = "";
  
  // Inventory (simplified for now - item ID to quantity)
  @type({ map: "uint16" }) inventory = new MapSchema<number>();
  
  // Founder rewards system
  @type("string") founderTier: string = "none";
  @type("uint64") joinTimestamp: number = 0;
  @type("uint16") bugReports: number = 0;
  @type("uint16") referralsCount: number = 0;
  @type(["string"]) unlockedRewards = new ArraySchema<string>();
  @type("boolean") anniversaryParticipated: boolean = false;
  @type("string") displayTitle: string = "";
  @type("string") chatColor: string = "#FFFFFF";
  
  // Zone/Instance info
  @type("string") currentZone: string = "town";
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  // serialized minimal map metadata (for now we keep map server-side for collision checks)
  @type("uint16") width: number = 0;
  @type("uint16") height: number = 0;
}

export class Mob extends Schema {
  @type("string") id: string = "";
  @type("string") type: string = "";
  @type("string") name: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("uint16") hp: number = 0;
  @type("uint16") maxHp: number = 0;
  @type("string") aiState: string = "idle";
  @type("string") targetPlayerId: string = "";
  @type("float32") patrolCenterX: number = 0;
  @type("float32") patrolCenterY: number = 0;
  @type("uint8") level: number = 1;
}

export class DroppedItem extends Schema {
  @type("string") id: string = "";
  @type("string") itemId: string = "";
  @type("uint16") quantity: number = 1;
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("uint64") dropTime: number = 0;
  @type("string") droppedBy: string = ""; // player ID who can pick up first (5s exclusive)
}

export class Projectile extends Schema {
  @type("string") id: string = "";
  @type("string") ownerId: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("float32") vx: number = 0;
  @type("float32") vy: number = 0;
  @type("uint16") damage: number = 0;
  @type("string") damageType: string = "physical";
  @type("uint64") startTime: number = 0;
  @type("uint16") maxRange: number = 0;
}

export class WorldState extends GameState {
  @type({ map: Mob }) mobs = new MapSchema<Mob>();
  @type({ map: DroppedItem }) droppedItems = new MapSchema<DroppedItem>();
  @type({ map: Projectile }) projectiles = new MapSchema<Projectile>();
}
