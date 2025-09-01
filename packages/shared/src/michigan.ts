import { MAP, Tile } from './index';

// Returns true if tile (x,y) should be land for a mitten-like Michigan shape.
export function isMichiganLand(x: number, y: number, width = MAP.width, height = MAP.height): boolean {
  const cx = Math.floor(width * 0.45);
  const cy = Math.floor(height * 0.55);
  const rx = Math.max(8, Math.floor(width * 0.28));
  const ry = Math.max(8, Math.floor(height * 0.32));

  const nx = (x - cx) / rx;
  const ny = (y - cy) / ry;

  // Main mitten oval
  let land = (nx * nx + ny * ny) <= 1.0;

  // Carve an inward bay along the right edge of the mitten to suggest the hand shape
  // Bay band where nx is to the right and ny is near the center vertically.
  if (land) {
    const bay = nx > 0.15 && nx < 0.55 && Math.abs(ny) < 0.22;
    if (bay) land = false;
  }

  // Attach a thumb as a separate oval towards the right side
  const tx = Math.floor(width * 0.64);
  const ty = Math.floor(height * 0.58);
  const trx = Math.max(4, Math.floor(width * 0.10));
  const tryy = Math.max(6, Math.floor(height * 0.18));
  const tnx = (x - tx) / trx;
  const tny = (y - ty) / tryy;
  const thumb = (tnx * tnx + tny * tny) <= 1.0;

  // Connect thumb to mitten with a small neck/bridge
  const bridge = x >= Math.floor(width * 0.57) && x <= Math.floor(width * 0.60) && Math.abs(y - ty) <= Math.floor(height * 0.06);

  return land || thumb || bridge;
}

