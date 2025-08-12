import { MAP, Tile, TiledMap } from "@toodee/shared";
import * as fs from 'fs';
import * as path from 'path';

export type Grid = Uint8Array & { w?: number; h?: number };

let cachedMap: TiledMap | null = null;
let cachedGrid: Grid | null = null;

export function loadMichiganMap(): TiledMap {
  if (cachedMap) return cachedMap;
  
  // In production, this would load from a proper asset path
  // For now, we'll use the same generation logic but structure it as a Tiled map
  const tiledMap: TiledMap = {
    width: MAP.width,
    height: MAP.height,
    tilewidth: 32,
    tileheight: 32,
    layers: [],
    tilesets: [{
      firstgid: 1,
      name: "terrain",
      tilewidth: 32,
      tileheight: 32,
      tilecount: 9,
      columns: 3,
      tiles: {
        "0": { properties: { solid: false, type: "water" } },
        "1": { properties: { solid: false, type: "land" } },
        "2": { properties: { solid: true, type: "rock" } },
        "3": { properties: { solid: true, type: "cave_wall" } },
        "4": { properties: { solid: false, type: "cave_floor" } },
        "5": { properties: { solid: true, type: "crystal" } },
        "6": { properties: { solid: false, type: "torch" } },
        "7": { properties: { solid: false, type: "town_floor" } },
        "8": { properties: { solid: true, type: "town_wall" } }
      }
    }]
  };
  
  cachedMap = tiledMap;
  return tiledMap;
}

export function generateMichiganish(): Grid {
  if (cachedGrid) return cachedGrid;
  
  const w = MAP.width, h = MAP.height;
  const grid = new Uint8Array(w * h) as Grid;
  (grid as any).w = w;
  (grid as any).h = h;

  // Fill with water
  grid.fill(Tile.Water);

  // Very rough "mitten-like" landmass using ellipses + a thumb
  const cx = Math.floor(w * 0.45), cy = Math.floor(h * 0.55);
  const rx = Math.floor(w * 0.28), ry = Math.floor(h * 0.32);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx*nx + ny*ny <= 1.0) {
        grid[y*w + x] = Tile.Land;
      }
    }
  }
  // Thumb
  for (let y = Math.floor(h*0.45); y < Math.floor(h*0.70); y++) {
    for (let x = Math.floor(w*0.60); x < Math.floor(w*0.70); x++) {
      grid[y*w + x] = Tile.Land;
    }
  }

  // Sprinkle rocks
  for (let i=0;i< w*h*0.03;i++) {
    const x = Math.floor(Math.random()*w);
    const y = Math.floor(Math.random()*h);
    if (grid[y*w + x] === Tile.Land) grid[y*w + x] = Tile.Rock;
  }
  
  // Add some cave areas in northern region
  for (let y = 0; y < h * 0.4; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y*w + x] === Tile.Land && Math.random() < 0.1) {
        grid[y*w + x] = Tile.CaveFloor;
      }
    }
  }
  
  // Make a starting clearing around spawn (town area)
  const sx = Math.floor(w*0.45), sy = Math.floor(h*0.55);
  for (let y = -4; y <= 4; y++) {
    for (let x = -4; x <= 4; x++) {
      const ix = sx+x, iy = sy+y;
      if (ix>=0&&iy>=0&&ix<w&&iy<h) grid[iy*w+ix] = Tile.TownFloor;
    }
  }
  
  cachedGrid = grid;
  return grid;
}

export function isWalkable(grid: Grid, x: number, y: number): boolean {
  const w = (grid as any).w as number, h = (grid as any).h as number;
  if (x<0||y<0||x>=w||y>=h) return false;
  const t = grid[y*w + x];
  return t === Tile.Land || t === Tile.CaveFloor || t === Tile.TownFloor;
}
