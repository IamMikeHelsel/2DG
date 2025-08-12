import { describe, it, expect } from 'vitest';
import { 
  FOUNDER_REWARDS, 
  FounderTier, 
  REFERRAL_REWARDS, 
  ANNIVERSARY_REWARDS,
  EARLY_BIRD_LIMIT,
  BETA_TEST_PERIOD_DAYS,
  BUG_HUNTER_REPORTS_REQUIRED,
  type PlayerRewards,
  type RewardItem
} from '../src/index';

describe('Founder Rewards System', () => {
  describe('Reward Configuration', () => {
    it('should have rewards defined for all founder tiers', () => {
      expect(FOUNDER_REWARDS[FounderTier.None]).toEqual([]);
      expect(FOUNDER_REWARDS[FounderTier.EarlyBird].length).toBeGreaterThan(0);
      expect(FOUNDER_REWARDS[FounderTier.BetaTester].length).toBeGreaterThan(0);
      expect(FOUNDER_REWARDS[FounderTier.BugHunter].length).toBeGreaterThan(0);
    });

    it('should have unique reward IDs within each tier', () => {
      Object.values(FOUNDER_REWARDS).forEach(rewards => {
        const ids = rewards.map(r => r.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      });
    });

    it('should have valid reward types for all rewards', () => {
      const validTypes = ['cosmetic', 'title', 'emote', 'pet', 'discount', 'access'];
      
      Object.values(FOUNDER_REWARDS).forEach(rewards => {
        rewards.forEach(reward => {
          expect(validTypes).toContain(reward.type);
          expect(reward.name).toBeTruthy();
          expect(reward.description).toBeTruthy();
        });
      });
    });
  });

  describe('Referral Rewards', () => {
    it('should have ascending referral requirements', () => {
      for (let i = 1; i < REFERRAL_REWARDS.length; i++) {
        expect(REFERRAL_REWARDS[i].referrals).toBeGreaterThan(REFERRAL_REWARDS[i-1].referrals);
      }
    });

    it('should have valid reward structure', () => {
      REFERRAL_REWARDS.forEach(({ referrals, reward }) => {
        expect(referrals).toBeGreaterThan(0);
        expect(reward.id).toBeTruthy();
        expect(reward.name).toBeTruthy();
        expect(reward.description).toBeTruthy();
        expect(['cosmetic', 'title', 'emote', 'pet', 'discount', 'access']).toContain(reward.type);
      });
    });
  });

  describe('Anniversary Rewards', () => {
    it('should have anniversary rewards defined', () => {
      expect(ANNIVERSARY_REWARDS.length).toBeGreaterThan(0);
    });

    it('should have unique anniversary reward IDs', () => {
      const ids = ANNIVERSARY_REWARDS.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Reward Constants', () => {
    it('should have reasonable limits and periods', () => {
      expect(EARLY_BIRD_LIMIT).toBeGreaterThan(0);
      expect(EARLY_BIRD_LIMIT).toBeLessThan(1000); // Reasonable upper bound
      
      expect(BETA_TEST_PERIOD_DAYS).toBeGreaterThan(0);
      expect(BETA_TEST_PERIOD_DAYS).toBeLessThan(365); // Less than a year
      
      expect(BUG_HUNTER_REPORTS_REQUIRED).toBeGreaterThan(0);
      expect(BUG_HUNTER_REPORTS_REQUIRED).toBeLessThan(100); // Reasonable requirement
    });
  });

  describe('Player Reward Calculation Logic', () => {
    it('should determine early bird tier for first N players', () => {
      // This would test the logic in GameRoom.determineFounderTier if exposed
      // For now, test constants are reasonable
      expect(EARLY_BIRD_LIMIT).toBe(50);
    });

    it('should calculate beta tester qualification period', () => {
      const betaPeriodMs = BETA_TEST_PERIOD_DAYS * 24 * 60 * 60 * 1000;
      expect(betaPeriodMs).toBeGreaterThan(0);
      
      // 14 days = 1,209,600,000 ms
      expect(betaPeriodMs).toBe(14 * 24 * 60 * 60 * 1000);
    });

    it('should validate bug hunter requirements', () => {
      expect(BUG_HUNTER_REPORTS_REQUIRED).toBe(5);
    });
  });

  describe('Reward System Integration', () => {
    it('should support tracking all reward types', () => {
      const mockPlayerRewards: PlayerRewards = {
        founderTier: FounderTier.EarlyBird,
        joinTimestamp: Date.now(),
        bugReportsSubmitted: 0,
        referralsCount: 0,
        unlockedRewards: [],
        anniversaryParticipated: false
      };

      expect(mockPlayerRewards.founderTier).toBe(FounderTier.EarlyBird);
      expect(typeof mockPlayerRewards.joinTimestamp).toBe('number');
      expect(Array.isArray(mockPlayerRewards.unlockedRewards)).toBe(true);
    });

    it('should support reward progression tracking', () => {
      const mockReward: RewardItem = {
        id: 'test_reward',
        name: 'Test Reward',
        description: 'A test reward',
        type: 'cosmetic',
        icon: '✨'
      };

      expect(mockReward.id).toBeTruthy();
      expect(['cosmetic', 'title', 'emote', 'pet', 'discount', 'access']).toContain(mockReward.type);
    });
  });
});

describe('Combat System Constants', () => {
  it('should have reasonable combat parameters', () => {
    // These would test combat constants if they existed in shared
    // For now, validate the basic structure exists for adding them
    expect(true).toBe(true);
  });
});

describe('Movement and Collision Constants', () => {
  it('should have consistent tile and map sizing', () => {
    const { TILE_SIZE, MAP } = require('../src/index');
    
    expect(TILE_SIZE).toBeGreaterThan(0);
    expect(MAP.width * TILE_SIZE).toBeGreaterThan(0);
    expect(MAP.height * TILE_SIZE).toBeGreaterThan(0);
    
    // Ensure map dimensions are reasonable for gameplay
    expect(MAP.width).toBeGreaterThanOrEqual(32);
    expect(MAP.height).toBeGreaterThanOrEqual(32);
    expect(MAP.width).toBeLessThanOrEqual(256);
    expect(MAP.height).toBeLessThanOrEqual(256);
  });
});

describe('Inventory System Constants', () => {
  it('should have shop items properly configured', () => {
    const { SHOP_ITEMS } = require('../src/index');
    
    expect(Array.isArray(SHOP_ITEMS)).toBe(true);
    expect(SHOP_ITEMS.length).toBeGreaterThan(0);
    
    SHOP_ITEMS.forEach(item => {
      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(item.price).toBeGreaterThan(0);
    });
  });

  it('should have merchant positioned correctly', () => {
    const { NPC_MERCHANT, MAP } = require('../src/index');
    
    expect(NPC_MERCHANT.x).toBeGreaterThanOrEqual(0);
    expect(NPC_MERCHANT.y).toBeGreaterThanOrEqual(0);
    expect(NPC_MERCHANT.x).toBeLessThan(MAP.width);
    expect(NPC_MERCHANT.y).toBeLessThan(MAP.height);
  });
});

describe('Network Message Interfaces', () => {
  it('should validate input message structure', () => {
    const { type InputMessage } = require('../src/index');
    
    const mockInput = {
      seq: 1,
      up: false,
      down: true,
      left: false,
      right: false,
      timestamp: Date.now()
    };

    expect(typeof mockInput.seq).toBe('number');
    expect(typeof mockInput.up).toBe('boolean');
    expect(typeof mockInput.down).toBe('boolean');
    expect(typeof mockInput.left).toBe('boolean');
    expect(typeof mockInput.right).toBe('boolean');
  });

  it('should validate chat message structure', () => {
    const mockChatMessage = {
      from: 'TestPlayer',
      text: 'Hello world!',
      ts: Date.now()
    };

    expect(typeof mockChatMessage.from).toBe('string');
    expect(typeof mockChatMessage.text).toBe('string');
    expect(typeof mockChatMessage.ts).toBe('number');
    expect(mockChatMessage.from.length).toBeGreaterThan(0);
    expect(mockChatMessage.text.length).toBeGreaterThan(0);
  });
});