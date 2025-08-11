import { describe, it, expect } from 'vitest';
import { generateMichiganish, isWalkable } from '../src/map';

describe('server map generation', () => {
  it('generates a walkable spawn area', () => {
    const grid = generateMichiganish();
    // Spawn center in generator uses ~45%,55%; sampling there should be walkable
    const w = (grid as any).w as number;
    const h = (grid as any).h as number;
    const sx = Math.floor(w * 0.45);
    const sy = Math.floor(h * 0.55);
    expect(isWalkable(grid, sx, sy)).toBe(true);
  });
});

