import { describe, it, expect, beforeEach } from 'vitest';
import { AdminSystem } from '../src/admin';
import { GameRoom } from '../src/room';
import { WorldState, Player } from '../src/state';
import { AdminRole } from '@toodee/shared';

// Mock GameRoom for testing
class MockGameRoom {
  state = new WorldState();
  clients: any[] = [];

  constructor() {
    // Add a test player
    const player = new Player();
    player.id = 'test-player-1';
    player.name = 'TestPlayer';
    player.adminRole = AdminRole.None;
    this.state.players.set('test-player-1', player);

    // Add an admin player
    const admin = new Player();
    admin.id = 'admin-1';
    admin.name = 'AdminPlayer';
    admin.adminRole = AdminRole.Admin;
    this.state.players.set('admin-1', admin);

    // Add a super admin player
    const superAdmin = new Player();
    superAdmin.id = 'super-admin-1';
    superAdmin.name = 'SuperAdmin';
    superAdmin.adminRole = AdminRole.SuperAdmin;
    this.state.players.set('super-admin-1', superAdmin);
  }

  broadcast(type: string, data: any) {
    // Mock broadcast
  }
}

describe('AdminSystem', () => {
  let adminSystem: AdminSystem;
  let mockRoom: MockGameRoom;

  beforeEach(() => {
    mockRoom = new MockGameRoom();
    adminSystem = new AdminSystem(mockRoom as any);
  });

  describe('isAdmin', () => {
    it('should return false for regular players', () => {
      expect(adminSystem.isAdmin('test-player-1')).toBe(false);
    });

    it('should return true for admin players', () => {
      expect(adminSystem.isAdmin('admin-1')).toBe(true);
    });

    it('should return true for super admin players', () => {
      expect(adminSystem.isAdmin('super-admin-1')).toBe(true);
    });

    it('should return false for non-existent players', () => {
      expect(adminSystem.isAdmin('non-existent')).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should deny permissions to regular players', () => {
      expect(adminSystem.hasPermission('test-player-1', AdminRole.Moderator)).toBe(false);
    });

    it('should grant admin permissions to admins', () => {
      expect(adminSystem.hasPermission('admin-1', AdminRole.Admin)).toBe(true);
    });

    it('should deny super admin permissions to regular admins', () => {
      expect(adminSystem.hasPermission('admin-1', AdminRole.SuperAdmin)).toBe(false);
    });

    it('should grant all permissions to super admins', () => {
      expect(adminSystem.hasPermission('super-admin-1', AdminRole.Moderator)).toBe(true);
      expect(adminSystem.hasPermission('super-admin-1', AdminRole.Admin)).toBe(true);
      expect(adminSystem.hasPermission('super-admin-1', AdminRole.SuperAdmin)).toBe(true);
    });
  });

  describe('parseCommand', () => {
    it('should parse valid commands', () => {
      const command = adminSystem.parseCommand('/kick player reason');
      expect(command).toEqual({
        type: 'kick',
        args: ['player', 'reason'],
        adminId: '',
        timestamp: expect.any(Number)
      });
    });

    it('should handle commands without arguments', () => {
      const command = adminSystem.parseCommand('/shutdown');
      expect(command).toEqual({
        type: 'shutdown',
        args: [],
        adminId: '',
        timestamp: expect.any(Number)
      });
    });

    it('should return null for non-commands', () => {
      expect(adminSystem.parseCommand('hello world')).toBe(null);
    });

    it('should handle empty commands', () => {
      expect(adminSystem.parseCommand('/')).toEqual({
        type: '',
        args: [],
        adminId: '',
        timestamp: expect.any(Number)
      });
    });
  });

  describe('executeCommand', () => {
    it('should deny commands from non-admin players', async () => {
      const result = await adminSystem.executeCommand('test-player-1', {
        type: 'kick',
        args: ['someone'],
        adminId: 'test-player-1',
        timestamp: Date.now()
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Access denied');
    });

    it('should execute valid commands from admin players', async () => {
      const result = await adminSystem.executeCommand('admin-1', {
        type: 'broadcast',
        args: ['Hello', 'world'],
        adminId: 'admin-1',
        timestamp: Date.now()
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Broadcast sent');
    });

    it('should handle unknown commands', async () => {
      const result = await adminSystem.executeCommand('admin-1', {
        type: 'unknown',
        args: [],
        adminId: 'admin-1',
        timestamp: Date.now()
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown command');
    });
  });

  describe('spawn command', () => {
    it('should spawn gold for players', async () => {
      const player = mockRoom.state.players.get('test-player-1')!;
      const initialGold = player.gold;

      const result = await adminSystem.executeCommand('admin-1', {
        type: 'spawn',
        args: ['gold', '100', 'TestPlayer'],
        adminId: 'admin-1',
        timestamp: Date.now()
      });

      expect(result.success).toBe(true);
      expect(player.gold).toBe(initialGold + 100);
    });

    it('should spawn potions for players', async () => {
      const player = mockRoom.state.players.get('test-player-1')!;
      const initialPots = player.pots;

      const result = await adminSystem.executeCommand('admin-1', {
        type: 'spawn',
        args: ['potion', '5', 'TestPlayer'],
        adminId: 'admin-1',
        timestamp: Date.now()
      });

      expect(result.success).toBe(true);
      expect(player.pots).toBe(initialPots + 5);
    });

    it('should handle unknown items', async () => {
      const result = await adminSystem.executeCommand('admin-1', {
        type: 'spawn',
        args: ['unknown-item', '1', 'TestPlayer'],
        adminId: 'admin-1',
        timestamp: Date.now()
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown item');
    });
  });

  describe('teleport command', () => {
    it('should teleport players to valid coordinates', async () => {
      const player = mockRoom.state.players.get('test-player-1')!;

      const result = await adminSystem.executeCommand('admin-1', {
        type: 'teleport',
        args: ['TestPlayer', '50', '60'],
        adminId: 'admin-1',
        timestamp: Date.now()
      });

      expect(result.success).toBe(true);
      expect(player.x).toBe(50);
      expect(player.y).toBe(60);
    });

    it('should reject out-of-bounds coordinates', async () => {
      const result = await adminSystem.executeCommand('admin-1', {
        type: 'teleport',
        args: ['TestPlayer', '200', '200'],
        adminId: 'admin-1',
        timestamp: Date.now()
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('out of bounds');
    });

    it('should handle invalid coordinates', async () => {
      const result = await adminSystem.executeCommand('admin-1', {
        type: 'teleport',
        args: ['TestPlayer', 'invalid', 'coords'],
        adminId: 'admin-1',
        timestamp: Date.now()
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid coordinates');
    });
  });

  describe('ban system', () => {
    it('should ban players', async () => {
      const result = await adminSystem.executeCommand('admin-1', {
        type: 'ban',
        args: ['TestPlayer', '1h', 'test ban'],
        adminId: 'admin-1',
        timestamp: Date.now()
      });

      expect(result.success).toBe(true);
      expect(adminSystem.isBanned('test-player-1')).toBe(true);
    });

    it('should prevent non-admins from banning', async () => {
      // First make test player a moderator
      const testPlayer = mockRoom.state.players.get('test-player-1')!;
      testPlayer.adminRole = AdminRole.Moderator;

      const result = await adminSystem.executeCommand('test-player-1', {
        type: 'ban',
        args: ['AdminPlayer', '1h', 'test ban'],
        adminId: 'test-player-1',
        timestamp: Date.now()
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Insufficient permissions');
    });

    it('should unban players', async () => {
      // First ban the player
      await adminSystem.executeCommand('admin-1', {
        type: 'ban',
        args: ['TestPlayer', '1h', 'test ban'],
        adminId: 'admin-1',
        timestamp: Date.now()
      });

      expect(adminSystem.isBanned('test-player-1')).toBe(true);

      // Then unban
      const result = await adminSystem.executeCommand('admin-1', {
        type: 'unban',
        args: ['TestPlayer'],
        adminId: 'admin-1',
        timestamp: Date.now()
      });

      expect(result.success).toBe(true);
      expect(adminSystem.isBanned('test-player-1')).toBe(false);
    });
  });

  describe('admin actions logging', () => {
    it('should log admin actions', async () => {
      await adminSystem.executeCommand('admin-1', {
        type: 'broadcast',
        args: ['test', 'message'],
        adminId: 'admin-1',
        timestamp: Date.now()
      });

      const actions = adminSystem.getAdminActions();
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].type).toBe('broadcast');
      expect(actions[0].adminId).toBe('admin-1');
    });

    it('should limit the number of stored actions', () => {
      // This test would need more setup to properly test the 1000 action limit
      expect(adminSystem.getAdminActions(10).length).toBeLessThanOrEqual(10);
    });
  });
});