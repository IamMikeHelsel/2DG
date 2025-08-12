import { describe, it, expect, beforeEach } from 'vitest';
import { PersistenceService } from '../src/db/persistence';
import { AuthService } from '../src/db/auth';
import { Player } from '../src/state';

describe('Persistence System', () => {
  let persistenceService: PersistenceService;
  let authService: AuthService;

  beforeEach(() => {
    persistenceService = PersistenceService.getInstance();
    authService = AuthService.getInstance();
    
    // Initialize services in test mode (without real database)
    persistenceService.initialize(false, false);
    authService.initialize(false);
  });

  describe('AuthService', () => {
    it('should create guest user when database is disabled', async () => {
      const user = await authService.authenticateUser({ username: 'TestPlayer' });
      
      expect(user).toBeTruthy();
      expect(user?.username).toBe('TestPlayer');
      expect(user?.id).toMatch(/^guest_TestPlayer_/);
    });

    it('should extract user from options', () => {
      const options = { username: 'Player1' };
      const user = authService.extractUserFromOptions(options);
      
      expect(user).toBeTruthy();
      expect(user?.username).toBe('Player1');
      expect(user?.id).toMatch(/^guest_Player1_/);
    });

    it('should generate and verify session tokens', () => {
      const user = { id: 'test123', username: 'TestUser' };
      const token = authService.generateSessionToken(user);
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      
      const verified = authService.verifySessionToken(token);
      expect(verified).toBeTruthy();
      expect(verified?.id).toBe('test123');
      expect(verified?.username).toBe('TestUser');
    });
  });

  describe('PersistenceService', () => {
    it('should create default character when database is disabled', async () => {
      const character = await persistenceService.getOrCreateCharacter('user123', 'TestHero');
      
      expect(character).toBeTruthy();
      expect(character?.name).toBe('TestHero');
      expect(character?.user_id).toBe('user123');
      expect(character?.gold).toBe(20);
      expect(character?.hp).toBe(100);
    });

    it('should handle save gracefully when persistence is disabled', async () => {
      const player = new Player();
      player.name = 'TestPlayer';
      player.gold = 100;
      player.x = 50;
      player.y = 50;
      
      const result = await persistenceService.saveCharacter(player, 'user123');
      expect(result).toBe(false); // Should return false when persistence is disabled
    });

    it('should return empty inventory when persistence is disabled', async () => {
      const inventory = await persistenceService.loadInventory('char123');
      expect(inventory).toEqual({ pots: 0 });
    });
  });

  describe('Integration', () => {
    it('should handle complete auth and character flow', async () => {
      // Authenticate user
      const user = await authService.authenticateUser({ username: 'IntegrationTest' });
      expect(user).toBeTruthy();
      
      // Get or create character
      const character = await persistenceService.getOrCreateCharacter(user!.id, 'Hero');
      expect(character).toBeTruthy();
      expect(character?.name).toBe('Hero');
      expect(character?.user_id).toBe(user!.id);
      
      // Try to save (will fail gracefully)
      const player = new Player();
      player.name = character!.name;
      player.gold = character!.gold;
      
      const saved = await persistenceService.saveCharacter(player, user!.id);
      expect(saved).toBe(false); // Persistence disabled in test
    });
  });
});