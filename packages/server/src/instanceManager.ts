import { Server } from "colyseus";
import { GameRoom } from "./room";
import { InstanceInfo, PartyInfo, MAX_PLAYERS_PER_ROOM, MAX_ROOMS } from "@toodee/shared";

export class InstanceManager {
  private server: Server;
  private instances: Map<string, InstanceInfo> = new Map();
  private parties: Map<string, PartyInfo> = new Map();
  private playerToInstance: Map<string, string> = new Map();
  private playerToParty: Map<string, string> = new Map();
  private nextInstanceId = 1;

  constructor(server: Server) {
    this.server = server;
    // Create the first instance immediately
    this.createNewInstance();
  }

  /**
   * Get list of all instances with their current status
   */
  getInstances(): InstanceInfo[] {
    this.updateInstanceStats();
    return Array.from(this.instances.values());
  }

  /**
   * Find the best instance for a player/party to join
   */
  findBestInstance(partyId?: string): string | null {
    this.updateInstanceStats();
    
    // If player is in a party, try to use party's preferred instance
    if (partyId) {
      const party = this.parties.get(partyId);
      if (party?.preferredInstanceId) {
        const instance = this.instances.get(party.preferredInstanceId);
        if (instance && instance.playerCount + (party.memberPlayerIds.length || 1) <= MAX_PLAYERS_PER_ROOM) {
          return party.preferredInstanceId;
        }
      }
    }

    // Find instance with available space, preferring fuller instances for better gameplay
    const availableInstances = Array.from(this.instances.values())
      .filter(instance => instance.status === 'active' && instance.playerCount < MAX_PLAYERS_PER_ROOM)
      .sort((a, b) => b.playerCount - a.playerCount); // Sort by player count descending

    if (availableInstances.length > 0) {
      return availableInstances[0].id;
    }

    // No space available, create new instance if possible
    return this.createNewInstance();
  }

  /**
   * Create a new game instance
   */
  private createNewInstance(): string | null {
    if (this.instances.size >= MAX_ROOMS) {
      console.warn(`[InstanceManager] Cannot create new instance: Maximum of ${MAX_ROOMS} instances reached`);
      return null;
    }

    const instanceId = `toodee_${this.nextInstanceId++}`;
    const instanceInfo: InstanceInfo = {
      id: instanceId,
      name: `Instance ${this.nextInstanceId - 1}`,
      playerCount: 0,
      maxPlayers: MAX_PLAYERS_PER_ROOM,
      status: 'starting'
    };

    this.instances.set(instanceId, instanceInfo);

    // Register the room type with Colyseus
    this.server.define(instanceId, GameRoom);
    
    console.log(`[InstanceManager] Created new instance: ${instanceId}`);
    return instanceId;
  }

  /**
   * Update instance statistics by querying actual rooms
   */
  private updateInstanceStats(): void {
    for (const [instanceId, instance] of this.instances) {
      // Access rooms through the private property (this is a workaround)
      const allRooms = (this.server as any).rooms || [];
      const rooms = allRooms.filter((room: any) => room.roomName === instanceId);
      
      if (rooms.length > 0) {
        // Sum players across all rooms of this type (though typically should be 1)
        const totalPlayers = rooms.reduce((sum: number, room: any) => sum + room.clients.length, 0);
        instance.playerCount = totalPlayers;
        instance.status = totalPlayers >= MAX_PLAYERS_PER_ROOM ? 'full' : 'active';
      } else {
        instance.playerCount = 0;
        instance.status = 'active';
      }
    }
  }

  /**
   * Handle player joining an instance
   */
  onPlayerJoin(playerId: string, instanceId: string, partyId?: string): void {
    this.playerToInstance.set(playerId, instanceId);
    
    if (partyId) {
      this.playerToParty.set(playerId, partyId);
      // Update party's preferred instance
      const party = this.parties.get(partyId);
      if (party) {
        party.preferredInstanceId = instanceId;
      }
    }

    // Check if we need to create a new instance for overflow
    this.checkForOverflow();
  }

  /**
   * Handle player leaving an instance
   */
  onPlayerLeave(playerId: string): void {
    this.playerToInstance.delete(playerId);
    
    const partyId = this.playerToParty.get(playerId);
    if (partyId) {
      this.playerToParty.delete(playerId);
      const party = this.parties.get(partyId);
      if (party) {
        party.memberPlayerIds = party.memberPlayerIds.filter(id => id !== playerId);
        
        // If party is empty, remove it
        if (party.memberPlayerIds.length === 0) {
          this.parties.delete(partyId);
        }
      }
    }
  }

  /**
   * Create or join a party
   */
  createOrJoinParty(playerId: string, partyId?: string): string {
    if (!partyId) {
      // Create new party
      partyId = `party_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const party: PartyInfo = {
        id: partyId,
        leaderPlayerId: playerId,
        memberPlayerIds: [playerId],
      };
      this.parties.set(partyId, party);
    } else {
      // Join existing party
      const party = this.parties.get(partyId);
      if (party) {
        if (!party.memberPlayerIds.includes(playerId)) {
          party.memberPlayerIds.push(playerId);
        }
      }
    }
    
    this.playerToParty.set(playerId, partyId);
    return partyId;
  }

  /**
   * Check if we need to create overflow instances
   */
  private checkForOverflow(): void {
    this.updateInstanceStats();
    
    const activeInstances = Array.from(this.instances.values())
      .filter(instance => instance.status === 'active');
    
    // If all instances are getting full, create a new one
    const hasSpace = activeInstances.some(instance => 
      instance.playerCount < MAX_PLAYERS_PER_ROOM * 0.8 // 80% threshold
    );
    
    if (!hasSpace && this.instances.size < MAX_ROOMS) {
      this.createNewInstance();
    }
  }

  /**
   * Get instance information for a specific instance
   */
  getInstanceInfo(instanceId: string): InstanceInfo | null {
    this.updateInstanceStats();
    return this.instances.get(instanceId) || null;
  }

  /**
   * Get party information
   */
  getPartyInfo(partyId: string): PartyInfo | null {
    return this.parties.get(partyId) || null;
  }
}