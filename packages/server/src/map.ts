import { MAP, Tile } from "@toodee/shared";

export type Grid = Uint8Array & { w?: number; h?: number };

export function generateMichiganish(): Grid {
  const w = MAP.width,
    h = MAP.height;
  const grid = new Uint8Array(w * h) as Grid;
  (grid as any).w = w;
  (grid as any).h = h;

  // Fill with water
  grid.fill(Tile.Water);

  // Very rough "mitten-like" landmass using ellipses + a thumb
  const cx = Math.floor(w * 0.45),
    cy = Math.floor(h * 0.55);
  const rx = Math.floor(w * 0.28),
    ry = Math.floor(h * 0.32);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx * nx + ny * ny <= 1.0) {
        grid[y * w + x] = Tile.Land;
      }
    }
  }
  // Thumb
  for (let y = Math.floor(h * 0.45); y < Math.floor(h * 0.7); y++) {
    for (let x = Math.floor(w * 0.6); x < Math.floor(w * 0.7); x++) {
      grid[y * w + x] = Tile.Land;
    }
  }

  // Sprinkle rocks
  for (let i = 0; i < w * h * 0.03; i++) {
    const x = Math.floor(Math.random() * w);
    const y = Math.floor(Math.random() * h);
    if (grid[y * w + x] === Tile.Land) grid[y * w + x] = Tile.Rock;
  }
  // Make a starting clearing around spawn
  const sx = Math.floor(w * 0.45),
    sy = Math.floor(h * 0.55);
  for (let y = -3; y <= 3; y++) {
    for (let x = -3; x <= 3; x++) {
      const ix = sx + x,
        iy = sy + y;
      if (ix >= 0 && iy >= 0 && ix < w && iy < h) grid[iy * w + ix] = Tile.Land;
    }
  }
  return grid;
}

export function isWalkable(grid: Grid, x: number, y: number): boolean {
  const w = (grid as any).w as number,
    h = (grid as any).h as number;
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  const t = grid[y * w + x];
  return t === Tile.Land;
}
