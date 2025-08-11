import * as Colyseus from "colyseus.js";

export function createClient() {
  const url = import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";
  return new Colyseus.Client(url);
}
