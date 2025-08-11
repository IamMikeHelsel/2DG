import * as Colyseus from "colyseus.js";

export function createClient() {
  const url = import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";
  return new Colyseus.Client(url);
}

export async function connectWithRetry(maxRetries = 3, retryDelay = 2000): Promise<any> {
  const client = createClient();
  const restore = loadSave();
  const name = restore?.name || randomName();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Connection] Attempt ${attempt}/${maxRetries} to connect to server...`);
      const room = await client.joinOrCreate("toodee", { name, restore });
      console.log(`[Connection] Successfully connected on attempt ${attempt}`);
      return room;
    } catch (error) {
      console.warn(`[Connection] Attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) {
        throw new Error(`Failed to connect after ${maxRetries} attempts`);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
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
