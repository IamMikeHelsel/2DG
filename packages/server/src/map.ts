import { MAP, Tile, SPECIAL_AREAS, type SpawnPoint, type Trigger, type TorchLight } from "@toodee/shared";

export type Grid = Uint8Array & { w?: number; h?: number };

export interface EnhancedMapData {
  grid: Grid;
  spawnPoints: SpawnPoint[];
  triggers: Trigger[];
  lights: TorchLight[];
  secretAreas: { x: number; y: number; radius: number; revealed: boolean }[];
}

export function generateMichiganish(): Grid {
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

  // Add special areas
  addSpecialAreas(grid, w, h);

  // Sprinkle rocks
  for (let i=0;i< w*h*0.03;i++) {
    const x = Math.floor(Math.random()*w);
    const y = Math.floor(Math.random()*h);
    if (grid[y*w + x] === Tile.Land) grid[y*w + x] = Tile.Rock;
  }
  
  // Make a starting clearing around spawn
  const sx = Math.floor(w*0.45), sy = Math.floor(h*0.55);
  for (let y = -3; y <= 3; y++) {
    for (let x = -3; x <= 3; x++) {
      const ix = sx+x, iy = sy+y;
      if (ix>=0&&iy>=0&&ix<w&&iy<h) grid[iy*w+ix] = Tile.Land;
    }
  }
  return grid;
}

function addSpecialAreas(grid: Grid, w: number, h: number) {
  // Town center area
  const town = SPECIAL_AREAS.TOWN_CENTER;
  for (let y = town.y - town.radius; y <= town.y + town.radius; y++) {
    for (let x = town.x - town.radius; x <= town.x + town.radius; x++) {
      const dx = x - town.x;
      const dy = y - town.y;
      if (dx*dx + dy*dy <= town.radius*town.radius && x >= 0 && x < w && y >= 0 && y < h) {
        grid[y*w + x] = Tile.TownTile;
      }
    }
  }

  // Boss arena - elevated circular area
  const boss = SPECIAL_AREAS.BOSS_ARENA;
  for (let y = boss.y - boss.radius; y <= boss.y + boss.radius; y++) {
    for (let x = boss.x - boss.radius; x <= boss.x + boss.radius; x++) {
      const dx = x - boss.x;
      const dy = y - boss.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist <= boss.radius && x >= 0 && x < w && y >= 0 && y < h) {
        if (dist < boss.radius - 1) {
          grid[y*w + x] = Tile.BossArena;
        } else {
          grid[y*w + x] = Tile.Stone; // Arena walls
        }
      }
    }
  }

  // Cave entrance
  const cave = SPECIAL_AREAS.SECRET_CAVE;
  if (cave.x >= 0 && cave.x < w && cave.y >= 0 && cave.y < h) {
    grid[cave.y*w + cave.x] = Tile.CaveEntrance;
    // Surround with stone
    for (let y = cave.y - 1; y <= cave.y + 1; y++) {
      for (let x = cave.x - 1; x <= cave.x + 1; x++) {
        if (x >= 0 && x < w && y >= 0 && y < h && !(x === cave.x && y === cave.y)) {
          grid[y*w + x] = Tile.Stone;
        }
      }
    }
  }

  // Dungeon entrance
  const dungeon = SPECIAL_AREAS.DUNGEON_ENTRANCE;
  if (dungeon.x >= 0 && dungeon.x < w && dungeon.y >= 0 && dungeon.y < h) {
    grid[dungeon.y*w + dungeon.x] = Tile.CaveEntrance;
    // Create a small stone structure
    for (let y = dungeon.y - dungeon.radius; y <= dungeon.y + dungeon.radius; y++) {
      for (let x = dungeon.x - dungeon.radius; x <= dungeon.x + dungeon.radius; x++) {
        if (x >= 0 && x < w && y >= 0 && y < h) {
          const dx = x - dungeon.x;
          const dy = y - dungeon.y;
          if (dx*dx + dy*dy <= dungeon.radius*dungeon.radius) {
            if (Math.abs(dx) + Math.abs(dy) <= 1) {
              grid[y*w + x] = Tile.DungeonFloor;
            } else {
              grid[y*w + x] = Tile.Stone;
            }
          }
        }
      }
    }
  }

  // Treasure island
  const treasure = SPECIAL_AREAS.TREASURE_ISLAND;
  for (let y = treasure.y - treasure.radius; y <= treasure.y + treasure.radius; y++) {
    for (let x = treasure.x - treasure.radius; x <= treasure.x + treasure.radius; x++) {
      const dx = x - treasure.x;
      const dy = y - treasure.y;
      if (dx*dx + dy*dy <= treasure.radius*treasure.radius && x >= 0 && x < w && y >= 0 && y < h) {
        grid[y*w + x] = Tile.Sand;
        // Place treasure chest in center
        if (x === treasure.x && y === treasure.y) {
          grid[y*w + x] = Tile.TreasureChest;
        }
      }
    }
  }

  // Add some bridges between areas
  addBridge(grid, w, h, 45, 55, 65, 40); // Bridge to secret area
  addBridge(grid, w, h, 35, 45, 25, 30); // Bridge to boss arena
}

function addBridge(grid: Grid, w: number, h: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx*dx + dy*dy);
  const steps = Math.floor(distance);
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.floor(x1 + t * dx);
    const y = Math.floor(y1 + t * dy);
    if (x >= 0 && x < w && y >= 0 && y < h) {
      if (grid[y*w + x] === Tile.Water) {
        grid[y*w + x] = Tile.Bridge;
      }
    }
  }
}

export function generateEnhancedMapData(): EnhancedMapData {
  const grid = generateMichiganish();
  
  return {
    grid,
    spawnPoints: [
      { type: 'player_spawn', x: 45, y: 55 },
      { type: 'npc_spawn', x: 47, y: 53, properties: { npcType: 'merchant' } },
      { type: 'npc_spawn', x: 42, y: 56, properties: { npcType: 'guard' } },
      { type: 'mob_spawn', x: 20, y: 25, properties: { mobType: 'boss', bossId: 'earth_elemental' } },
      { type: 'mob_spawn', x: 70, y: 30, properties: { mobType: 'cave_spider' } }
    ],
    triggers: [
      { type: 'zone_transition', x: 70, y: 30, width: 2, height: 2, targetMap: 'secret_cave', message: 'Enter the mysterious cave?' },
      { type: 'zone_transition', x: 60, y: 70, width: 2, height: 2, targetMap: 'dungeon_level1', message: 'Descend into the dungeon?' },
      { type: 'boss_encounter', x: 20, y: 25, width: 8, height: 8, message: 'The ancient guardian stirs...' },
      { type: 'quest_trigger', x: 45, y: 50, width: 1, height: 1, questId: 'monument_discovery', message: 'You discover an ancient monument.' }
    ],
    lights: [
      { type: 'torch', radius: 64, color: '#ffaa44', intensity: 0.8, x: 45, y: 53 },
      { type: 'torch', radius: 48, color: '#ffaa44', intensity: 0.6, x: 42, y: 58 },
      { type: 'magical', radius: 96, color: '#4488ff', intensity: 0.9, flickering: true, x: 20, y: 25 },
      { type: 'campfire', radius: 80, color: '#ff6622', intensity: 0.7, x: 70, y: 30 }
    ],
    secretAreas: [
      { x: 80, y: 45, radius: 3, revealed: false }, // Treasure island
      { x: 15, y: 60, radius: 2, revealed: false }, // Hidden grove
      { x: 85, y: 20, radius: 2, revealed: false }  // Secret cache
    ]
  };
}

export function isWalkable(grid: Grid, x: number, y: number): boolean {
  const w = (grid as any).w as number, h = (grid as any).h as number;
  if (x<0||y<0||x>=w||y>=h) return false;
  const t = grid[y*w + x];
  return t === Tile.Land || t === Tile.TownTile || t === Tile.BossArena || 
         t === Tile.Sand || t === Tile.Bridge || t === Tile.DungeonFloor ||
         t === Tile.CaveEntrance;
}
