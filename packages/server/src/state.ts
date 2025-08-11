import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("uint8") dir: number = 0; // 0 up,1 right,2 down,3 left
  // last processed input
  @type("uint32") lastSeq: number = 0;
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  // serialized minimal map metadata (for now we keep map server-side for collision checks)
  @type("uint16") width: number = 0;
  @type("uint16") height: number = 0;
}
