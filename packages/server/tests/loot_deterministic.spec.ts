import { describe, it, expect } from 'vitest';
import { rollDrops } from '../src/utils/loot';
import { makeRng } from '../src/utils/rng';

describe('loot determinism', () => {
  it('produces consistent drops for same seed', () => {
    const rngA = makeRng('seed-123');
    const rngB = makeRng('seed-123');
    const dropsA = rollDrops('goblin_loot', rngA);
    const dropsB = rollDrops('goblin_loot', rngB);
    expect(dropsA).toEqual(dropsB);
  });

  it('produces different drops for different seeds', () => {
    const rngA = makeRng('seed-123');
    const rngB = makeRng('seed-456');
    const dropsA = rollDrops('goblin_loot', rngA);
    const dropsB = rollDrops('goblin_loot', rngB);
    // Not guaranteed to differ, but very likely; fallback check size/contents
    expect(JSON.stringify(dropsA) === JSON.stringify(dropsB)).toBe(false);
  });
});

