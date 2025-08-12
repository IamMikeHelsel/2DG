import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestServerManager } from './server-manager';
import { TestClient, createTestClients, connectAll, disconnectAll, waitForAll } from './test-client';

describe('Multi-User Movement E2E', () => {
  let serverManager: TestServerManager;
  let serverUrl: string;

  beforeAll(async () => {
    serverManager = new TestServerManager();
    const { url } = await serverManager.start();
    serverUrl = url;
  });

  afterAll(async () => {
    await serverManager.stop();
  });

  it('should handle multiple players connecting and moving simultaneously', async () => {
    // Create 3 test clients
    const clients = createTestClients(serverUrl, 3, 'MovementTest');
    
    try {
      // Connect all clients
      await connectAll(clients);
      
      // Verify all clients are connected and have player state
      for (const client of clients) {
        expect(client.isConnected()).toBe(true);
        
        // Wait for initial state to be synchronized
        await client.waitForInitialState();
        
        const playerState = client.getPlayerState();
        expect(playerState).toBeDefined();
        expect(playerState.name).toBe(client.getName());
        expect(typeof playerState.x).toBe('number');
        expect(typeof playerState.y).toBe('number');
      }

      // Record initial positions
      const initialPositions = clients.map(client => {
        const state = client.getPlayerState();
        return { x: state.x, y: state.y };
      });

      // Send different movement inputs to each client
      clients[0].sendMovement({ up: true });    // Move up
      clients[1].sendMovement({ right: true });  // Move right  
      clients[2].sendMovement({ up: true, right: true }); // Move diagonal

      // Wait for movements to be processed (allow time for server tick)
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check that players have moved
      for (let i = 0; i < clients.length; i++) {
        const client = clients[i];
        const currentState = client.getPlayerState();
        const initialPos = initialPositions[i];

        // Player should have moved from initial position
        const hasMoved = currentState.x !== initialPos.x || currentState.y !== initialPos.y;
        expect(hasMoved).toBe(true);
        
        console.log(`${client.getName()}: (${initialPos.x}, ${initialPos.y}) -> (${currentState.x}, ${currentState.y})`);
      }

      // Verify specific movement directions
      const client0State = clients[0].getPlayerState();
      const client1State = clients[1].getPlayerState();
      const client2State = clients[2].getPlayerState();

      // Client 0 moved up (y should decrease)
      expect(client0State.y).toBeLessThan(initialPositions[0].y);
      expect(client0State.dir).toBe(0); // up direction

      // Client 1 moved right (x should increase)
      expect(client1State.x).toBeGreaterThan(initialPositions[1].x);
      expect(client1State.dir).toBe(1); // right direction

      // Client 2 moved diagonally (both x and y should change)
      expect(client2State.x).toBeGreaterThan(initialPositions[2].x);
      expect(client2State.y).toBeLessThan(initialPositions[2].y);
      expect([0, 1]).toContain(client2State.dir); // up or right
      
    } finally {
      await disconnectAll(clients);
    }
  });

  it('should synchronize player positions across all connected clients', async () => {
    const clients = createTestClients(serverUrl, 2, 'SyncTest');
    
    try {
      await connectAll(clients);
      
      // Wait for both clients to see each other
      await waitForAll(clients, (client) => {
        const allPlayers = client.getAllPlayers();
        return allPlayers.size === 2; // Should see self + other player
      });

      // Get initial state from both clients' perspectives
      const client1AllPlayers = clients[0].getAllPlayers();
      const client2AllPlayers = clients[1].getAllPlayers();
      
      expect(client1AllPlayers.size).toBe(2);
      expect(client2AllPlayers.size).toBe(2);

      // Move first client
      const client1SessionId = clients[0].getSessionId();
      clients[0].sendMovement({ down: true });

      // Wait for movement to propagate
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify both clients see the same position for client 1
      const client1PosFromClient1 = clients[0].getAllPlayers().get(client1SessionId!);
      const client1PosFromClient2 = clients[1].getAllPlayers().get(client1SessionId!);

      expect(client1PosFromClient1.x).toBe(client1PosFromClient2.x);
      expect(client1PosFromClient1.y).toBe(client1PosFromClient2.y);
      expect(client1PosFromClient1.dir).toBe(client1PosFromClient2.dir);

      console.log(`Synchronized position: (${client1PosFromClient1.x}, ${client1PosFromClient1.y})`);
      
    } finally {
      await disconnectAll(clients);
    }
  });

  it('should handle players moving into each other (collision)', async () => {
    const clients = createTestClients(serverUrl, 2, 'CollisionTest');
    
    try {
      await connectAll(clients);
      
      // Wait for connection and initial state
      await waitForAll(clients, (client) => client.getPlayerState() !== null);
      
      // Additional wait to ensure state is fully synchronized
      for (const client of clients) {
        await client.waitForInitialState();
      }

      // Get initial positions
      const positions = clients.map(client => {
        const state = client.getPlayerState();
        return { x: state.x, y: state.y };
      });

      // Both clients try to move in same direction multiple times
      for (let i = 0; i < 5; i++) {
        clients[0].sendMovement({ right: true });
        clients[1].sendMovement({ right: true });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Verify players can still move (no deadlock)
      const finalStates = clients.map(client => client.getPlayerState());
      
      for (let i = 0; i < clients.length; i++) {
        const moved = finalStates[i].x !== positions[i].x || finalStates[i].y !== positions[i].y;
        expect(moved).toBe(true);
        console.log(`${clients[i].getName()} moved from (${positions[i].x}, ${positions[i].y}) to (${finalStates[i].x}, ${finalStates[i].y})`);
      }
      
    } finally {
      await disconnectAll(clients);
    }
  });

  it('should handle rapid movement inputs from multiple clients', async () => {
    const clients = createTestClients(serverUrl, 3, 'RapidTest');
    
    try {
      await connectAll(clients);
      await waitForAll(clients, (client) => client.getPlayerState() !== null);
      
      // Ensure all clients have proper initial state
      for (const client of clients) {
        await client.waitForInitialState();
      }

      const initialPositions = clients.map(client => {
        const state = client.getPlayerState();
        return { x: state.x, y: state.y };
      });

      // Send rapid movement inputs
      const movements = [
        { up: true }, { down: false, right: true }, { left: true, up: false },
        { down: true, left: false }, { right: false, up: true }
      ];

      for (const movement of movements) {
        clients.forEach(client => client.sendMovement(movement));
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms between inputs
      }

      // Allow time for all movements to process
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify all clients processed movements without errors
      for (let i = 0; i < clients.length; i++) {
        const currentState = clients[i].getPlayerState();
        const initialPos = initialPositions[i];
        
        // Should have moved from initial position
        const hasMoved = currentState.x !== initialPos.x || currentState.y !== initialPos.y;
        expect(hasMoved).toBe(true);
        
        // Should have valid direction
        expect([0, 1, 2, 3]).toContain(currentState.dir);
        
        console.log(`${clients[i].getName()} rapid movement: (${initialPos.x}, ${initialPos.y}) -> (${currentState.x}, ${currentState.y}), dir: ${currentState.dir}`);
      }
      
    } finally {
      await disconnectAll(clients);
    }
  });

  it('should handle player disconnection during movement', async () => {
    const clients = createTestClients(serverUrl, 3, 'DisconnectTest');
    
    try {
      await connectAll(clients);
      await waitForAll(clients, (client) => client.getAllPlayers().size === 3);

      // Start all players moving
      clients.forEach(client => client.sendMovement({ up: true }));
      await new Promise(resolve => setTimeout(resolve, 100));

      // Disconnect middle client while others are moving
      await clients[1].disconnect();

      // Continue moving with remaining clients
      clients[0].sendMovement({ down: true });
      clients[2].sendMovement({ left: true });
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify remaining clients can still move and see correct player count
      await waitForAll([clients[0], clients[2]], (client) => {
        const allPlayers = client.getAllPlayers();
        return allPlayers.size === 2; // Should now see only 2 players
      });

      const remainingStates = [clients[0].getPlayerState(), clients[2].getPlayerState()];
      remainingStates.forEach((state, i) => {
        expect(state).toBeDefined();
        expect(typeof state.x).toBe('number');
        expect(typeof state.y).toBe('number');
        console.log(`Remaining player ${i}: (${state.x}, ${state.y})`);
      });

    } finally {
      // Clean up remaining clients
      await disconnectAll([clients[0], clients[2]]);
    }
  });
});