import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

// Inventory item schema
export class InventoryItem extends Schema {
  @type("string") itemId: string = "";
  @type("uint16") quantity: number = 0;
  @type("uint16") durability: number = 100; // optional for equipment
}

// Equipment schema  
export class Equipment extends Schema {
  @type(InventoryItem) weapon?: InventoryItem;
  @type(InventoryItem) armor?: InventoryItem;
  @type(InventoryItem) accessory?: InventoryItem;
}

// Inventory slot schema
export class InventorySlot extends Schema {
  @type("uint8") x: number = 0;
  @type("uint8") y: number = 0;
  @type(InventoryItem) item?: InventoryItem;
}

// Dropped item schema (for world items)
export class DroppedItem extends Schema {
  @type("string") id: string = "";
  @type("string") itemId: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("uint16") quantity: number = 1;
  @type("uint64") spawnTime: number = 0;
}

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
  @type("uint16") pots: number = 0; // small potions - legacy field
  
  // Inventory system
  @type([InventorySlot]) inventory = new ArraySchema<InventorySlot>();
  @type(Equipment) equipment = new Equipment();
  
  // Founder rewards system
  @type("string") founderTier: string = "none";
  @type("uint64") joinTimestamp: number = 0;
  @type("uint16") bugReports: number = 0;
  @type("uint16") referralsCount: number = 0;
  @type(["string"]) unlockedRewards = new ArraySchema<string>();
  @type("boolean") anniversaryParticipated: boolean = false;
  @type("string") displayTitle: string = "";
  @type("string") chatColor: string = "#FFFFFF";
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  // serialized minimal map metadata (for now we keep map server-side for collision checks)
  @type("uint16") width: number = 0;
  @type("uint16") height: number = 0;
}

export class Mob extends Schema {
  @type("string") id: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("uint16") hp: number = 0;
  @type("uint16") maxHp: number = 0;
}

export class WorldState extends GameState {
  @type({ map: Mob }) mobs = new MapSchema<Mob>();
  @type({ map: DroppedItem }) droppedItems = new MapSchema<DroppedItem>();
}
