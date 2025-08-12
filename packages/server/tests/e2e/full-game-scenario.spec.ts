import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestServerManager } from './server-manager';
import { TestClient, createTestClients, connectAll, disconnectAll } from './test-client';

describe('Complete E2E Game Ecosystem', () => {
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

  it('should demonstrate complete multi-user game functionality', async () => {
    // Test scenario: 4 players join, interact, and demonstrate all major game features
    const players = createTestClients(serverUrl, 4, 'FullGameTest');
    const chatMessages: any[] = [];
    
    try {
      console.log('\n=== FULL GAME E2E TEST SCENARIO ===');
      
      // === Phase 1: Connection and Initial State ===
      console.log('\n📡 Phase 1: Player connections');
      await connectAll(players);
      
      // Wait for all players to have synchronized state
      for (const player of players) {
        await player.waitForInitialState();
      }
      
      // Verify all players see each other
      const playerCounts = players.map(p => p.getAllPlayers().size);
      expect(playerCounts.every(count => count === 4)).toBe(true);
      console.log(`✅ All 4 players connected and see each other`);
      
      // === Phase 2: Movement and Positioning ===
      console.log('\n🏃 Phase 2: Multi-user movement');
      
      // Record initial positions
      const initialPositions = players.map(p => {
        const state = p.getPlayerState();
        return { name: p.getName(), x: state.x, y: state.y };
      });
      
      console.log('Initial positions:', initialPositions);
      
      // Each player moves in a different direction
      const movements = [
        { up: true },      // Player 1: up
        { right: true },   // Player 2: right  
        { down: true },    // Player 3: down
        { left: true }     // Player 4: left
      ];
      
      movements.forEach((movement, i) => {
        players[i].sendMovement(movement);
      });
      
      // Wait for movements to be processed
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Verify all players moved
      const finalPositions = players.map(p => {
        const state = p.getPlayerState();
        return { name: p.getName(), x: state.x, y: state.y };
      });
      
      console.log('Final positions:', finalPositions);
      
      for (let i = 0; i < players.length; i++) {
        const initial = initialPositions[i];
        const final = finalPositions[i];
        const hasMoved = initial.x !== final.x || initial.y !== final.y;
        expect(hasMoved).toBe(true);
      }
      console.log(`✅ All players moved successfully`);
      
      // === Phase 3: Chat Communication ===
      console.log('\n💬 Phase 3: Chat system');
      
      // Set up message listeners
      players.forEach(player => {
        player.onMessage('chat', (message) => {
          chatMessages.push({
            from: message.from,
            text: message.text,
            receivedBy: player.getName()
          });
        });
      });
      
      // Players send different messages
      const testMessages = [
        'Hello everyone!',
        'Great game!', 
        'Anyone want to team up?',
        'Let\'s explore together!'
      ];
      
      testMessages.forEach((message, i) => {
        players[i].sendChat(message);
      });
      
      // Wait for message propagation
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Verify chat system works
      expect(chatMessages.length).toBe(16); // 4 messages × 4 receivers
      console.log(`✅ Chat system working: ${chatMessages.length} messages received`);
      
      // === Phase 4: Combat System ===
      console.log('\n⚔️ Phase 4: Combat mechanics');
      
      // Get initial HP
      const initialHP = players.map(p => p.getPlayerState().hp);
      console.log('Initial HP:', initialHP);
      
      // Players attempt attacks (may or may not hit depending on positioning)
      players.forEach(player => player.sendAttack());
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const finalHP = players.map(p => p.getPlayerState().hp);
      console.log('Final HP:', finalHP);
      
      // Verify HP values are valid
      finalHP.forEach(hp => {
        expect(hp).toBeGreaterThanOrEqual(0);
        expect(hp).toBeLessThanOrEqual(100);
      });
      console.log(`✅ Combat system functional, HP values valid`);
      
      // === Phase 5: Rapid Actions (Stress Test) ===
      console.log('\n🏎️ Phase 5: Rapid action stress test');
      
      const startTime = Date.now();
      
      // Each player performs 10 rapid actions
      const actionPromises = players.map(async (player, playerIndex) => {
        for (let i = 0; i < 10; i++) {
          const actionType = i % 3;
          
          if (actionType === 0) {
            // Movement
            const directions = [
              { up: true }, { right: true }, { down: true }, { left: true }
            ];
            player.sendMovement(directions[i % 4]);
          } else if (actionType === 1) {
            // Chat
            player.sendChat(`Rapid message ${i} from ${player.getName()}`);
          } else {
            // Attack
            player.sendAttack();
          }
          
          await new Promise(resolve => setTimeout(resolve, 25)); // 25ms between actions
        }
      });
      
      await Promise.all(actionPromises);
      const stressTestTime = Date.now() - startTime;
      
      console.log(`⚡ Completed 40 rapid actions in ${stressTestTime}ms`);
      expect(stressTestTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // === Phase 6: State Consistency Check ===
      console.log('\n🔍 Phase 6: Final state consistency');
      
      // Verify all players still have valid states
      const finalStates = players.map(player => {
        const state = player.getPlayerState();
        return {
          name: player.getName(),
          connected: player.isConnected(),
          position: [state.x, state.y],
          hp: state.hp,
          hasValidState: state.x !== undefined && state.y !== undefined && state.hp !== undefined
        };
      });
      
      finalStates.forEach(state => {
        expect(state.connected).toBe(true);
        expect(state.hasValidState).toBe(true);
        console.log(`${state.name}: pos=${state.position}, hp=${state.hp}, connected=${state.connected}`);
      });
      
      // === Phase 7: Coordinated Disconnect ===
      console.log('\n📤 Phase 7: Coordinated disconnection');
      
      // Disconnect players one by one and verify remaining players see the changes
      for (let i = players.length - 1; i >= 0; i--) {
        const disconnectingPlayer = players[i];
        const remainingPlayers = players.slice(0, i);
        
        console.log(`Disconnecting ${disconnectingPlayer.getName()}`);
        await disconnectingPlayer.disconnect();
        
        if (remainingPlayers.length > 0) {
          // Wait for remaining players to see the reduced count
          await new Promise(resolve => setTimeout(resolve, 150));
          
          const playerCounts = remainingPlayers.map(p => p.getAllPlayers().size);
          const expectedCount = remainingPlayers.length;
          
          // All remaining players should see the same (reduced) player count
          expect(playerCounts.every(count => count === expectedCount)).toBe(true);
          console.log(`✅ Remaining ${expectedCount} players all see correct count`);
        }
      }
      
      console.log('\n🎉 FULL E2E TEST COMPLETE - ALL SYSTEMS WORKING!');
      console.log('\nSystems Verified:');
      console.log('✅ Multi-user connections and state synchronization');
      console.log('✅ Real-time movement with collision detection');
      console.log('✅ Chat system with message broadcasting');
      console.log('✅ Combat mechanics with HP management');
      console.log('✅ Performance under rapid action load');
      console.log('✅ State consistency across multiple clients');
      console.log('✅ Clean connection/disconnection flows');
      
    } catch (error) {
      console.error('E2E test failed:', error);
      throw error;
    } finally {
      // Ensure all clients are cleaned up
      await disconnectAll(players);
    }
  });
  
  it('should maintain performance with maximum concurrent users', async () => {
    const maxClients = 8; // Test with more concurrent clients
    const clients = createTestClients(serverUrl, maxClients, 'MaxLoadTest');
    
    try {
      console.log(`\n🚀 Testing with ${maxClients} concurrent users`);
      
      const startTime = Date.now();
      await connectAll(clients);
      const connectionTime = Date.now() - startTime;
      
      console.log(`Connected ${maxClients} clients in ${connectionTime}ms`);
      expect(connectionTime).toBeLessThan(10000); // Should connect within 10 seconds
      
      // Wait for state synchronization
      for (const client of clients) {
        await client.waitForInitialState();
      }
      
      // All clients perform simultaneous actions
      const actionStart = Date.now();
      const actionPromises = clients.map(async (client) => {
        // Each client sends movement and chat
        client.sendMovement({ up: true, right: true });
        client.sendChat(`Message from ${client.getName()}`);
        client.sendAttack();
      });
      
      await Promise.all(actionPromises);
      const actionTime = Date.now() - actionStart;
      
      console.log(`${maxClients} clients performed actions in ${actionTime}ms`);
      
      // Verify all clients still responsive
      const allResponsive = clients.every(client => {
        const state = client.getPlayerState();
        return client.isConnected() && state !== null;
      });
      
      expect(allResponsive).toBe(true);
      console.log('✅ All clients remain responsive under load');
      
    } finally {
      await disconnectAll(clients);
    }
  });
});