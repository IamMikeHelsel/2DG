import * as Colyseus from 'colyseus.js';
import { type InputMessage } from '@toodee/shared';

/**
 * Test Client that simulates a real game client
 */
export class TestClient {
  private client: Colyseus.Client;
  private room: any;
  private connected = false;
  private playerName: string;
  private sequenceNumber = 0;

  constructor(serverUrl: string, playerName?: string) {
    this.client = new Colyseus.Client(serverUrl);
    this.playerName = playerName || `Player${Math.floor(Math.random() * 1000)}`;
  }

  /**
   * Connect to the game room
   */
  async connect(): Promise<void> {
    try {
      console.log(`[${this.playerName}] Connecting to server...`);
      this.room = await this.client.joinOrCreate("toodee", { 
        name: this.playerName 
      });
      
      this.room.onStateChange((state: any) => {
        // Optional: log state changes for debugging
        // console.log(`[${this.playerName}] State updated, players: ${state.players?.size || 0}`);
      });
      
      this.room.onError((code: number, message?: string) => {
        console.error(`[${this.playerName}] Room error ${code}: ${message}`);
      });
      
      this.room.onLeave((code: number) => {
        console.log(`[${this.playerName}] Left room with code ${code}`);
        this.connected = false;
      });
      
      this.connected = true;
      console.log(`[${this.playerName}] Connected successfully`);
      
      // Wait a brief moment for initial state to sync
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`[${this.playerName}] Failed to connect:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from the server
   */
  async disconnect(): Promise<void> {
    if (this.room && this.connected) {
      console.log(`[${this.playerName}] Disconnecting...`);
      await this.room.leave();
      this.connected = false;
      console.log(`[${this.playerName}] Disconnected`);
    }
  }

  /**
   * Send movement input to the server
   */
  sendMovement(input: Partial<InputMessage>): void {
    if (!this.connected || !this.room) {
      throw new Error(`${this.playerName} is not connected`);
    }

    const fullInput: InputMessage = {
      seq: ++this.sequenceNumber,
      up: false,
      down: false,
      left: false,
      right: false,
      timestamp: Date.now(),
      ...input
    };

    this.room.send("input", fullInput);
  }

  /**
   * Send chat message
   */
  sendChat(message: string): void {
    if (!this.connected || !this.room) {
      throw new Error(`${this.playerName} is not connected`);
    }
    this.room.send("chat", message);
  }

  /**
   * Send attack command
   */
  sendAttack(): void {
    if (!this.connected || !this.room) {
      throw new Error(`${this.playerName} is not connected`);
    }
    this.room.send("attack", {});
  }

  /**
   * Get current player state from server
   */
  getPlayerState(): any {
    if (!this.room || !this.room.state || !this.room.state.players) {
      return null;
    }
    return this.room.state.players.get(this.room.sessionId);
  }

  /**
   * Get all players in the room
   */
  getAllPlayers(): Map<string, any> {
    if (!this.room || !this.room.state || !this.room.state.players) {
      return new Map();
    }
    return this.room.state.players;
  }

  /**
   * Wait for a specific condition to be met
   */
  async waitFor(
    condition: (client: TestClient) => boolean,
    timeout = 5000,
    checkInterval = 50
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (condition(this)) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    throw new Error(`[${this.playerName}] Timeout waiting for condition after ${timeout}ms`);
  }

  /**
   * Wait for initial state to be synchronized
   */
  async waitForInitialState(timeout = 3000): Promise<void> {
    return this.waitFor((client) => {
      const state = client.getPlayerState();
      return state !== null && typeof state.x === 'number' && typeof state.y === 'number';
    }, timeout);
  }

  /**
   * Listen for specific room events
   */
  onStateChange(callback: (state: any) => void): void {
    if (this.room) {
      this.room.onStateChange(callback);
    }
  }

  onMessage(type: string, callback: (message: any) => void): void {
    if (this.room) {
      this.room.onMessage(type, callback);
    }
  }

  onError(callback: (code: number, message?: string) => void): void {
    if (this.room) {
      this.room.onError(callback);
    }
  }

  onLeave(callback: (code: number) => void): void {
    if (this.room) {
      this.room.onLeave(callback);
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get player name
   */
  getName(): string {
    return this.playerName;
  }

  /**
   * Get room session ID
   */
  getSessionId(): string | undefined {
    return this.room?.sessionId;
  }
}

/**
 * Create multiple test clients
 */
export function createTestClients(
  serverUrl: string, 
  count: number, 
  namePrefix = 'TestPlayer'
): TestClient[] {
  const clients: TestClient[] = [];
  
  for (let i = 0; i < count; i++) {
    clients.push(new TestClient(serverUrl, `${namePrefix}${i + 1}`));
  }
  
  return clients;
}

/**
 * Connect all clients in parallel
 */
export async function connectAll(clients: TestClient[]): Promise<void> {
  await Promise.all(clients.map(client => client.connect()));
}

/**
 * Disconnect all clients in parallel  
 */
export async function disconnectAll(clients: TestClient[]): Promise<void> {
  await Promise.all(clients.map(client => client.disconnect()));
}

/**
 * Wait for all clients to meet a condition
 */
export async function waitForAll(
  clients: TestClient[],
  condition: (client: TestClient) => boolean,
  timeout = 5000
): Promise<void> {
  await Promise.all(
    clients.map(client => client.waitFor(condition, timeout))
  );
}