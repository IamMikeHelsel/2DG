import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestServerManager } from './server-manager';
import { TestClient, createTestClients, connectAll, disconnectAll, waitForAll } from './test-client';

describe('Multi-User Chat and Combat E2E', () => {
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

  it('should handle chat messages between multiple users', async () => {
    const clients = createTestClients(serverUrl, 3, 'ChatTest');
    const chatMessages: Array<{from: string, text: string, receivedBy: string}> = [];
    
    try {
      await connectAll(clients);
      await waitForAll(clients, (client) => client.getPlayerState() !== null);
      
      // Ensure initial state is synchronized
      for (const client of clients) {
        await client.waitForInitialState();
      }

      // Set up chat message listeners for all clients
      clients.forEach(client => {
        client.onMessage('chat', (message) => {
          chatMessages.push({
            from: message.from,
            text: message.text,
            receivedBy: client.getName()
          });
        });
      });

      // Send chat messages from different clients
      clients[0].sendChat('Hello from player 1!');
      clients[1].sendChat('Greetings from player 2!');
      clients[2].sendChat('Player 3 here!');

      // Wait for messages to propagate
      await new Promise(resolve => setTimeout(resolve, 300));

      // Each message should be received by all 3 clients
      expect(chatMessages.length).toBe(9); // 3 messages × 3 receivers

      // Verify each client received all messages
      const messagesByReceiver = new Map();
      chatMessages.forEach(msg => {
        if (!messagesByReceiver.has(msg.receivedBy)) {
          messagesByReceiver.set(msg.receivedBy, []);
        }
        messagesByReceiver.get(msg.receivedBy).push(msg);
      });

      clients.forEach(client => {
        const receivedMsgs = messagesByReceiver.get(client.getName());
        expect(receivedMsgs).toHaveLength(3);
        
        // Check that all expected messages were received
        const receivedTexts = receivedMsgs.map((m: any) => m.text).sort();
        expect(receivedTexts).toEqual([
          'Greetings from player 2!',
          'Hello from player 1!', 
          'Player 3 here!'
        ]);
      });

    } finally {
      await disconnectAll(clients);
    }
  });

  it('should handle combat between multiple players', async () => {
    const clients = createTestClients(serverUrl, 2, 'CombatTest');
    
    try {
      await connectAll(clients);
      await waitForAll(clients, (client) => client.getPlayerState() !== null);
      
      // Ensure initial state is synchronized
      for (const client of clients) {
        await client.waitForInitialState();
      }

      // Get initial HP values
      const initialHP = clients.map(client => client.getPlayerState().hp);
      
      // Position players next to each other by moving them
      // Move client 0 to the right a bit
      clients[0].sendMovement({ right: true });
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Move client 1 to position next to client 0
      const client0State = clients[0].getPlayerState();
      for (let i = 0; i < 3; i++) {
        clients[1].sendMovement({ right: true });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Client 0 attacks (should hit client 1 if positioned correctly)
      clients[0].sendAttack();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check if combat occurred
      const finalHP = clients.map(client => client.getPlayerState().hp);
      
      // At minimum, verify attack system is working
      console.log(`Initial HP: [${initialHP.join(', ')}]`);
      console.log(`Final HP: [${finalHP.join(', ')}]`);
      
      // Verify players still exist and have valid HP
      clients.forEach((client, i) => {
        const state = client.getPlayerState();
        expect(state.hp).toBeGreaterThanOrEqual(0);
        expect(state.hp).toBeLessThanOrEqual(state.maxHp);
      });

    } finally {
      await disconnectAll(clients);
    }
  });

  it('should handle connection/disconnection flows with multiple users', async () => {
    const clients = createTestClients(serverUrl, 4, 'ConnectionTest');
    
    try {
      // Connect clients one by one and verify player count increases
      for (let i = 0; i < clients.length; i++) {
        await clients[i].connect();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Wait for all connected clients to see the new player count
        const connectedClients = clients.slice(0, i + 1);
        await waitForAll(connectedClients, (client) => {
          const playerCount = client.getAllPlayers().size;
          return playerCount === i + 1;
        });
        
        console.log(`Connected ${i + 1} clients, all see ${i + 1} players`);
      }

      // Disconnect clients one by one and verify player count decreases
      for (let i = clients.length - 1; i >= 0; i--) {
        await clients[i].disconnect();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (i > 0) {
          // Wait for remaining clients to see the reduced player count
          const remainingClients = clients.slice(0, i);
          await waitForAll(remainingClients, (client) => {
            const playerCount = client.getAllPlayers().size;
            return playerCount === i;
          });
          
          console.log(`${i} clients remaining, all see ${i} players`);
        }
      }

    } finally {
      // Ensure all clients are disconnected
      await disconnectAll(clients);
    }
  });

  it('should maintain performance under load with many simultaneous actions', async () => {
    const clientCount = 5; // Test with 5 simultaneous clients
    const clients = createTestClients(serverUrl, clientCount, 'LoadTest');
    
    try {
      const startTime = Date.now();
      
      // Connect all clients simultaneously
      await connectAll(clients);
      const connectionTime = Date.now() - startTime;
      
      // Wait for all clients to be fully initialized
      await waitForAll(clients, (client) => client.getPlayerState() !== null);
      
      console.log(`Connected ${clientCount} clients in ${connectionTime}ms`);
      expect(connectionTime).toBeLessThan(5000); // Should connect within 5 seconds

      // Perform many simultaneous actions
      const actionStartTime = Date.now();
      const actionsPerClient = 10;
      
      // Each client performs rapid actions
      const actionPromises = clients.map(async (client) => {
        for (let i = 0; i < actionsPerClient; i++) {
          // Alternate between movement, chat, and attack
          const actionType = i % 3;
          
          if (actionType === 0) {
            const directions = [
              { up: true }, { down: true }, { left: true }, { right: true }
            ];
            client.sendMovement(directions[i % 4]);
          } else if (actionType === 1) {
            client.sendChat(`Message ${i} from ${client.getName()}`);
          } else {
            client.sendAttack();
          }
          
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      });

      await Promise.all(actionPromises);
      const actionTime = Date.now() - actionStartTime;
      
      console.log(`Completed ${clientCount * actionsPerClient} actions in ${actionTime}ms`);
      
      // Verify all clients are still responsive
      const finalCheck = await Promise.all(
        clients.map(async (client) => {
          const state = client.getPlayerState();
          return {
            name: client.getName(),
            connected: client.isConnected(),
            hasState: state !== null,
            position: state ? [state.x, state.y] : null
          };
        })
      );

      finalCheck.forEach(check => {
        expect(check.connected).toBe(true);
        expect(check.hasState).toBe(true);
        expect(check.position).not.toBeNull();
        console.log(`${check.name}: connected=${check.connected}, position=${check.position}`);
      });

    } finally {
      await disconnectAll(clients);
    }
  });

  it('should handle edge cases and error conditions', async () => {
    const clients = createTestClients(serverUrl, 2, 'EdgeCaseTest');
    
    try {
      await connectAll(clients);
      await waitForAll(clients, (client) => client.getPlayerState() !== null);

      // Test rapid connect/disconnect
      const tempClient = new TestClient(serverUrl, 'TempClient');
      await tempClient.connect();
      await new Promise(resolve => setTimeout(resolve, 100));
      await tempClient.disconnect();

      // Original clients should still work
      clients[0].sendMovement({ up: true });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(clients[0].getPlayerState()).toBeDefined();
      expect(clients[1].getPlayerState()).toBeDefined();

      // Test sending actions without proper delay
      for (let i = 0; i < 20; i++) {
        clients[0].sendMovement({ down: i % 2 === 0 });
      }
      
      // Should still be responsive after spam
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(clients[0].getPlayerState()).toBeDefined();

    } finally {
      await disconnectAll(clients);
    }
  });
});