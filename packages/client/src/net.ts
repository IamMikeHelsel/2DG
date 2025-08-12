import * as Colyseus from "colyseus.js";
import { InstanceInfo, JoinInstanceOptions } from "@toodee/shared";

export function createClient() {
  const url = import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";
  return new Colyseus.Client(url);
}

/**
 * Fetch available instances from server
 */
export async function getAvailableInstances(): Promise<InstanceInfo[]> {
  const serverUrl = import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";
  const httpUrl = serverUrl.replace(/^ws/, "http");
  
  try {
    const response = await fetch(`${httpUrl}/api/instances`);
    if (!response.ok) {
      throw new Error(`Failed to fetch instances: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.warn("[Connection] Failed to fetch instances, falling back to default", error);
    return [
      {
        id: "toodee",
        name: "Main Instance",
        playerCount: 0,
        maxPlayers: 40,
        status: 'active' as const
      }
    ];
  }
}

/**
 * Find best instance for joining
 */
export async function findBestInstance(partyId?: string): Promise<string> {
  const serverUrl = import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";
  const httpUrl = serverUrl.replace(/^ws/, "http");
  
  try {
    const response = await fetch(`${httpUrl}/api/join-instance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partyId })
    });
    
    if (response.ok) {
      const { instanceId } = await response.json();
      return instanceId;
    }
  } catch (error) {
    console.warn("[Connection] Failed to get best instance, using default", error);
  }
  
  return "toodee";
}

export async function connectWithRetry(maxRetries = 3, retryDelay = 2000, instanceId?: string): Promise<any> {
  const client = createClient();
  const restore = loadSave();
  const name = restore?.name || randomName();
  
  // If no instance specified, find the best one
  const targetInstance = instanceId || await findBestInstance();
  
  const options: JoinInstanceOptions = { name, restore };
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Connection] Attempt ${attempt}/${maxRetries} to connect to instance "${targetInstance}"...`);
      const room = await client.joinOrCreate(targetInstance, options);
      console.log(`[Connection] Successfully connected to instance "${targetInstance}" on attempt ${attempt}`);
      return room;
    } catch (error) {
      console.warn(`[Connection] Attempt ${attempt} failed for instance "${targetInstance}":`, error);
      
      if (attempt === maxRetries) {
        // Last attempt - try falling back to default room
        if (targetInstance !== "toodee") {
          console.log("[Connection] Falling back to default room...");
          try {
            const room = await client.joinOrCreate("toodee", options);
            console.log("[Connection] Successfully connected to fallback room");
            return room;
          } catch (fallbackError) {
            console.error("[Connection] Fallback connection also failed:", fallbackError);
          }
        }
        throw new Error(`Failed to connect after ${maxRetries} attempts`);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }
}

/**
 * Connect to a specific instance
 */
export async function connectToInstance(instanceId: string): Promise<any> {
  return connectWithRetry(3, 2000, instanceId);
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
}
