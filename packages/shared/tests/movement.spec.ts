import { describe, it, expect } from 'vitest';
import { computeNextPosition } from '../src';

const walkable = (_x: number, _y: number) => true;

describe('computeNextPosition', () => {
  it('moves up with correct direction', () => {
    const res = computeNextPosition({ x: 10, y: 10 }, { up: true, down: false, left: false, right: false }, 4, 0.05, walkable, 2);
    expect(res.y).toBeLessThan(10);
    expect(res.dir).toBe(0);
  });

  it('normalizes diagonal movement', () => {
    const a = computeNextPosition({ x: 0, y: 0 }, { up: true, right: false, down: false, left: false }, 4, 0.05, walkable, 2);
    const b = computeNextPosition({ x: 0, y: 0 }, { up: true, right: true, down: false, left: false }, 4, 0.05, walkable, 2);
    const upDist = Math.hypot(a.x, a.y);
    const diagDist = Math.hypot(b.x, b.y);
    expect(diagDist).toBeCloseTo(upDist, 3);
  });

  it('blocks movement when diagonal tile is not walkable', () => {
    const noDiag = (x: number, y: number) => (x === 1 && y === -1 ? false : true);
    // Use a larger dt so rounding reaches the blocked diagonal cell (1,-1)
    const res = computeNextPosition({ x: 0, y: 0 }, { up: true, right: true, down: false, left: false }, 4, 0.5, noDiag, 2);
    // Both movements canceled by diagonal block
    expect(res.x).toBe(0);
    expect(res.y).toBe(0);
  });
});
