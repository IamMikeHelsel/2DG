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
  @type("string") currentZone: string = "overworld";
  
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
  @type("string") currentZone: string = "overworld";
}

export class Mob extends Schema {
  @type("string") id: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("uint16") hp: number = 0;
  @type("uint16") maxHp: number = 0;
  @type("string") zone: string = "overworld";
  @type("string") mobType: string = "basic";
}

export class Boss extends Schema {
  @type("string") id: string = "";
  @type("string") configId: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("uint16") hp: number = 0;
  @type("uint16") maxHp: number = 0;
  @type("string") zone: string = "";
  @type("uint8") currentPhase: number = 1;
  @type("uint64") lastAttackTime: number = 0;
  @type("boolean") defeated: boolean = false;
}

export class AttackTelegraph extends Schema {
  @type("string") id: string = "";
  @type("string") bossId: string = "";
  @type("string") abilityId: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("float32") range: number = 0;
  @type("string") pattern: string = "";
  @type("uint64") startTime: number = 0;
  @type("uint16") duration: number = 0;
}

export class WorldState extends GameState {
  @type({ map: Mob }) mobs = new MapSchema<Mob>();
  @type({ map: Boss }) bosses = new MapSchema<Boss>();
  @type({ map: AttackTelegraph }) telegraphs = new MapSchema<AttackTelegraph>();
}
