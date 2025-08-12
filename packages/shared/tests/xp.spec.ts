import { describe, it, expect } from 'vitest';
import { calculateXPRequired, calculateLevel, calculateStatsForLevel, BASE_XP_REQUIRED, XP_CURVE_FACTOR, HP_PER_LEVEL, DAMAGE_PER_LEVEL } from '../src/index.js';

describe('XP and Leveling System', () => {
  describe('calculateXPRequired', () => {
    it('should return 0 XP for level 1', () => {
      expect(calculateXPRequired(1)).toBe(0);
    });

    it('should return base XP for level 2', () => {
      expect(calculateXPRequired(2)).toBe(BASE_XP_REQUIRED);
    });

    it('should follow exponential curve', () => {
      expect(calculateXPRequired(3)).toBe(Math.floor(BASE_XP_REQUIRED * XP_CURVE_FACTOR));
      expect(calculateXPRequired(4)).toBe(Math.floor(BASE_XP_REQUIRED * Math.pow(XP_CURVE_FACTOR, 2)));
    });
  });

  describe('calculateLevel', () => {
    it('should return level 1 for 0 XP', () => {
      expect(calculateLevel(0)).toBe(1);
    });

    it('should return level 1 for XP below level 2 threshold', () => {
      expect(calculateLevel(99)).toBe(1);
    });

    it('should return level 2 for XP at level 2 threshold', () => {
      expect(calculateLevel(100)).toBe(2);
    });

    it('should return level 3 for XP at level 3 threshold', () => {
      const level2XP = calculateXPRequired(2);
      const level3XP = calculateXPRequired(3);
      expect(calculateLevel(level2XP + level3XP)).toBe(3);
    });

    it('should cap at max level 10', () => {
      expect(calculateLevel(999999)).toBe(10);
    });
  });

  describe('calculateStatsForLevel', () => {
    it('should return base stats for level 1', () => {
      const stats = calculateStatsForLevel(1);
      expect(stats.hp).toBe(100);
      expect(stats.damage).toBe(20);
    });

    it('should increase stats correctly per level', () => {
      const level5Stats = calculateStatsForLevel(5);
      expect(level5Stats.hp).toBe(100 + (5 - 1) * HP_PER_LEVEL);
      expect(level5Stats.damage).toBe(20 + (5 - 1) * DAMAGE_PER_LEVEL);
    });

    it('should handle max level correctly', () => {
      const maxLevelStats = calculateStatsForLevel(10);
      expect(maxLevelStats.hp).toBe(100 + 9 * HP_PER_LEVEL);
      expect(maxLevelStats.damage).toBe(20 + 9 * DAMAGE_PER_LEVEL);
    });
  });

  describe('XP curve progression', () => {
    it('should have expected XP requirements for levels 1-10', () => {
      const expectedXP = [0, 100, 150, 225, 337, 506, 759, 1139, 1708, 2562];
      
      for (let level = 1; level <= 10; level++) {
        expect(calculateXPRequired(level)).toBe(expectedXP[level - 1]);
      }
    });

    it('should require exponentially increasing total XP', () => {
      let totalXP = 0;
      const totalXPRequirements = [0];
      
      for (let level = 2; level <= 10; level++) {
        totalXP += calculateXPRequired(level);
        totalXPRequirements.push(totalXP);
      }
      
      // Verify that each level requires more total XP than the previous
      for (let i = 1; i < totalXPRequirements.length; i++) {
        expect(totalXPRequirements[i]).toBeGreaterThan(totalXPRequirements[i - 1]);
      }
    });
  });
});