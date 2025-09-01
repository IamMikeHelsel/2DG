// Simple deterministic PRNG (mulberry32) with helpers for IDs.
export interface Rng {
  next: () => number; // [0,1)
  int: (min: number, max: number) => number; // inclusive min, exclusive max
  uuid: (prefix?: string) => string;
}

function mulberry32(a: number) {
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string | number): number {
  if (typeof seed === 'number') return seed >>> 0;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function makeRng(seed: string | number): Rng {
  const base = mulberry32(hashSeed(seed));
  const next = () => base();
  const int = (min: number, max: number) => Math.floor(next() * (max - min)) + min;
  const uuid = (prefix = '') => {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 8; i++) {
      id += alphabet[int(0, alphabet.length)];
    }
    return `${prefix}${id}`;
  };
  return { next, int, uuid };
}

export type Now = () => number;
export const makeNow = (): Now => () => Date.now();
