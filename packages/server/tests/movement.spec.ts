import { describe, it, expect } from 'vitest';
import { GameRoom } from '../src/room';
import { MAP } from '@toodee/shared';

// Mock Colyseus types
const mockClient = {
  sessionId: 'test-player-1',
  send: () => {},
  leave: () => {}
} as any;

describe('Movement System', () => {
  it('should handle basic player movement', () => {
    const room = new GameRoom();
    room.onCreate({});
    
    // Add a player
    room.onJoin(mockClient, { name: 'TestPlayer' });
    
    const player = room.state.players.get('test-player-1');
    expect(player).toBeDefined();
    expect(player?.name).toBe('TestPlayer');
  });

  it('should validate spawn position is in town center', () => {
    const room = new GameRoom();
    room.onCreate({});
    
    room.onJoin(mockClient, { name: 'TestPlayer' });
    
    const player = room.state.players.get('test-player-1');
    expect(player).toBeDefined();
    
    // Check that spawn is near town center
    const expectedX = Math.floor(MAP.width * 0.45);
    const expectedY = Math.floor(MAP.height * 0.55);
    
    expect(player?.x).toBe(expectedX);
    expect(player?.y).toBe(expectedY);
  });

  it('should process movement input with sequence numbers', () => {
    const room = new GameRoom();
    room.onCreate({});
    
    room.onJoin(mockClient, { name: 'TestPlayer' });
    
    const player = room.state.players.get('test-player-1');
    expect(player).toBeDefined();
    
    const initialX = player?.x;
    const initialY = player?.y;
    
    // Send movement input by directly setting it (since we're testing the logic, not the message system)
    const input = { seq: 1, up: true, down: false, left: false, right: false };
    (room as any).inputs.set('test-player-1', input);
    
    // Simulate one tick
    room.update(1/20); // 20Hz = 50ms = 0.05s
    
    // Player should have moved up (y should decrease)
    expect(player?.lastSeq).toBe(1);
    expect(player?.y).toBeLessThan(initialY!);
    expect(player?.dir).toBe(0); // up direction
  });

  it('should handle diagonal movement correctly', () => {
    const room = new GameRoom();
    room.onCreate({});
    
    room.onJoin(mockClient, { name: 'TestPlayer' });
    
    const player = room.state.players.get('test-player-1');
    const initialX = player?.x;
    const initialY = player?.y;
    
    // Send diagonal movement input (directly set for testing)
    const input = { seq: 1, up: true, down: false, left: false, right: true };
    (room as any).inputs.set('test-player-1', input);
    
    // Simulate one tick
    room.update(1/20);
    
    // Player should have moved up and right
    expect(player?.x).toBeGreaterThan(initialX!);
    expect(player?.y).toBeLessThan(initialY!);
    
    // Direction should be based on the last non-zero component
    expect([0, 1]).toContain(player?.dir); // up or right
  });
});