import { Scene, GameObjects } from 'phaser';
import { TILE_SIZE, Tile, SPECIAL_AREAS, STORY_ELEMENTS } from '@toodee/shared';

export interface TileType {
  id: number;
  name: string;
  walkable: boolean;
  color: number;
  texture?: string;
  isSpecial?: boolean;
}

export interface LightSource {
  x: number;
  y: number;
  radius: number;
  color: number;
  intensity: number;
  flickering?: boolean;
}

export class WorldManager {
  private scene: Scene;
  private mapLayer: GameObjects.Graphics;
  private decorationLayer: GameObjects.Graphics;
  private lightingLayer: GameObjects.Graphics;
  private width: number;
  private height: number;
  private tileTypes: Map<number, TileType>;
  private lightSources: LightSource[] = [];

  constructor(scene: Scene, width: number, height: number) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    
    // Define enhanced tile types
    this.tileTypes = new Map([
      [Tile.Water, { id: Tile.Water, name: 'water', walkable: false, color: 0x4682b4 }],
      [Tile.Land, { id: Tile.Land, name: 'grass', walkable: true, color: 0x4a7c59 }],
      [Tile.Rock, { id: Tile.Rock, name: 'stone', walkable: false, color: 0x808080 }],
      [Tile.Sand, { id: Tile.Sand, name: 'sand', walkable: true, color: 0xc2b280 }],
      [Tile.Dirt, { id: Tile.Dirt, name: 'dirt', walkable: true, color: 0x8b6f43 }],
      [Tile.Stone, { id: Tile.Stone, name: 'stone', walkable: false, color: 0x696969 }],
      [Tile.CaveEntrance, { id: Tile.CaveEntrance, name: 'cave_entrance', walkable: true, color: 0x2c1810, isSpecial: true }],
      [Tile.BossArena, { id: Tile.BossArena, name: 'boss_arena', walkable: true, color: 0x8b4513, isSpecial: true }],
      [Tile.TreasureChest, { id: Tile.TreasureChest, name: 'treasure_chest', walkable: true, color: 0xffd700, isSpecial: true }],
      [Tile.SecretWall, { id: Tile.SecretWall, name: 'secret_wall', walkable: false, color: 0x654321 }],
      [Tile.Torch, { id: Tile.Torch, name: 'torch', walkable: false, color: 0xffaa44, isSpecial: true }],
      [Tile.TownTile, { id: Tile.TownTile, name: 'town_tile', walkable: true, color: 0x9acd32 }],
      [Tile.Bridge, { id: Tile.Bridge, name: 'bridge', walkable: true, color: 0x8b7355 }],
      [Tile.DungeonFloor, { id: Tile.DungeonFloor, name: 'dungeon_floor', walkable: true, color: 0x555555 }],
      [Tile.DungeonWall, { id: Tile.DungeonWall, name: 'dungeon_wall', walkable: false, color: 0x333333 }]
    ]);

    // Create map layers
    this.mapLayer = scene.add.graphics();
    this.mapLayer.setDepth(0);
    
    this.decorationLayer = scene.add.graphics();
    this.decorationLayer.setDepth(1);
    
    this.lightingLayer = scene.add.graphics();
    this.lightingLayer.setDepth(5);
  }

  renderMap(mapData?: number[][]) {
    this.mapLayer.clear();
    this.decorationLayer.clear();
    this.lightingLayer.clear();

    // If no map data, generate a simple procedural map
    if (!mapData) {
      this.renderProceduralMap();
    } else {
      // Render provided map data
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const tileType = mapData[y]?.[x] ?? 0;
          this.renderTile(x, y, tileType);
        }
      }
    }

    // Add environmental storytelling elements
    this.addEnvironmentalStoryElements();
    
    // Add decorations
    this.addDecorations();
    
    // Set up lighting for special areas
    this.setupAreaLighting();
    
    // Render lighting effects
    this.renderLighting();
  }

  private setupAreaLighting() {
    // Clear existing lights
    this.lightSources = [];
    
    // Add lights for special areas
    this.addLightSource(SPECIAL_AREAS.TOWN_CENTER.x, SPECIAL_AREAS.TOWN_CENTER.y, 80, 0xffaa44, 0.7);
    this.addLightSource(SPECIAL_AREAS.BOSS_ARENA.x, SPECIAL_AREAS.BOSS_ARENA.y, 120, 0x4488ff, 0.9, true);
    this.addLightSource(SPECIAL_AREAS.SECRET_CAVE.x, SPECIAL_AREAS.SECRET_CAVE.y, 60, 0xff6622, 0.6, true);
    this.addLightSource(SPECIAL_AREAS.DUNGEON_ENTRANCE.x, SPECIAL_AREAS.DUNGEON_ENTRANCE.y, 50, 0x888888, 0.5);
    this.addLightSource(SPECIAL_AREAS.TREASURE_ISLAND.x, SPECIAL_AREAS.TREASURE_ISLAND.y, 90, 0xffd700, 0.8, true);
    
    // Add torch lights around town
    this.addLightSource(45, 50, 40, 0xffaa44, 0.6);
    this.addLightSource(48, 56, 40, 0xffaa44, 0.6);
    this.addLightSource(42, 58, 40, 0xffaa44, 0.6);
  }

  private renderProceduralMap() {
    // Create Michigan-like shape (matching server)
    const centerX = Math.floor(this.width / 2);
    const centerY = Math.floor(this.height / 2);
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        // Default to water
        let tileType = 0;
        
        // Create landmass
        const dx = Math.abs(x - centerX);
        const dy = Math.abs(y - centerY);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Main landmass
        if (distance < 30) {
          tileType = 1; // Grass
          
          // Add some variety
          const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1);
          if (noise > 0.5) {
            tileType = 4; // Dirt patches
          }
          
          // Rocky areas
          if (distance < 5 && Math.random() > 0.7) {
            tileType = 2; // Stone
          }
        }
        
        // Beach/shore
        else if (distance < 32) {
          tileType = 3; // Sand
        }
        
        this.renderTile(x, y, tileType);
      }
    }
    
    // Add decorations
    this.addDecorations();
  }

  private renderTile(x: number, y: number, tileType: number) {
    const tile = this.tileTypes.get(tileType) || this.tileTypes.get(0)!;
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    
    // Base tile
    this.mapLayer.fillStyle(tile.color, 1);
    this.mapLayer.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    
    // Add texture details based on tile type
    switch (tile.name) {
      case 'water':
        // Water waves effect
        this.mapLayer.lineStyle(1, 0x5692c4, 0.3);
        this.mapLayer.beginPath();
        this.mapLayer.moveTo(px, py + TILE_SIZE/3);
        this.mapLayer.lineTo(px + TILE_SIZE, py + TILE_SIZE/3);
        this.mapLayer.strokePath();
        break;
        
      case 'grass':
        // Grass texture
        this.mapLayer.fillStyle(0x5a8c69, 0.4);
        for (let i = 0; i < 3; i++) {
          const gx = px + Math.random() * TILE_SIZE;
          const gy = py + Math.random() * TILE_SIZE;
          this.mapLayer.fillRect(gx, gy, 2, 3);
        }
        break;
        
      case 'sand':
        // Sand dots
        this.mapLayer.fillStyle(0xd4c4a0, 0.3);
        for (let i = 0; i < 5; i++) {
          const sx = px + Math.random() * TILE_SIZE;
          const sy = py + Math.random() * TILE_SIZE;
          this.mapLayer.fillCircle(sx, sy, 1);
        }
        break;
        
      case 'stone':
        // Stone cracks
        this.mapLayer.lineStyle(1, 0x606060, 0.5);
        this.mapLayer.beginPath();
        this.mapLayer.moveTo(px + 5, py + 5);
        this.mapLayer.lineTo(px + 15, py + 12);
        this.mapLayer.strokePath();
        break;
        
      case 'dirt':
        // Dirt texture
        this.mapLayer.fillStyle(0x6b5f33, 0.3);
        for (let i = 0; i < 2; i++) {
          const dx = px + Math.random() * TILE_SIZE;
          const dy = py + Math.random() * TILE_SIZE;
          this.mapLayer.fillCircle(dx, dy, 2);
        }
        break;

      case 'cave_entrance':
        // Dark cave opening with stone surround
        this.mapLayer.fillStyle(0x000000, 0.8);
        this.mapLayer.fillCircle(px + TILE_SIZE/2, py + TILE_SIZE/2, TILE_SIZE/3);
        this.mapLayer.fillStyle(0x8b7355, 1);
        this.mapLayer.strokeCircle(px + TILE_SIZE/2, py + TILE_SIZE/2, TILE_SIZE/2.5);
        break;

      case 'boss_arena':
        // Elevated stone platform
        this.mapLayer.fillStyle(0xa0522d, 0.6);
        this.mapLayer.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        // Add mystical glow
        this.mapLayer.lineStyle(2, 0xff6600, 0.3);
        this.mapLayer.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
        break;

      case 'treasure_chest':
        // Golden treasure chest
        this.mapLayer.fillStyle(0xdaa520, 1);
        this.mapLayer.fillRect(px + 8, py + 12, 16, 12);
        this.mapLayer.fillStyle(0xffd700, 1);
        this.mapLayer.fillRect(px + 10, py + 14, 12, 8);
        // Add sparkle effect
        this.mapLayer.fillStyle(0xffffff, 0.8);
        this.mapLayer.fillCircle(px + 8, py + 8, 2);
        this.mapLayer.fillCircle(px + 24, py + 10, 1);
        break;

      case 'town_tile':
        // Paved stone with grass between
        this.mapLayer.fillStyle(0x778899, 0.7);
        this.mapLayer.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        this.mapLayer.fillStyle(0x5a8c69, 0.3);
        this.mapLayer.fillRect(px, py, 4, 4);
        this.mapLayer.fillRect(px + TILE_SIZE - 4, py, 4, 4);
        this.mapLayer.fillRect(px, py + TILE_SIZE - 4, 4, 4);
        this.mapLayer.fillRect(px + TILE_SIZE - 4, py + TILE_SIZE - 4, 4, 4);
        break;

      case 'bridge':
        // Wooden bridge planks
        this.mapLayer.fillStyle(0x8b7355, 1);
        this.mapLayer.fillRect(px, py + 8, TILE_SIZE, 16);
        this.mapLayer.lineStyle(1, 0x654321, 0.8);
        for (let i = 0; i < 4; i++) {
          this.mapLayer.beginPath();
          this.mapLayer.moveTo(px + i * 8, py + 8);
          this.mapLayer.lineTo(px + i * 8, py + 24);
          this.mapLayer.strokePath();
        }
        break;

      case 'dungeon_floor':
        // Dark stone floor with cracks
        this.mapLayer.fillStyle(0x444444, 1);
        this.mapLayer.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        this.mapLayer.lineStyle(1, 0x222222, 0.6);
        this.mapLayer.beginPath();
        this.mapLayer.moveTo(px, py + TILE_SIZE/2);
        this.mapLayer.lineTo(px + TILE_SIZE, py + TILE_SIZE/2);
        this.mapLayer.strokePath();
        break;

      case 'dungeon_wall':
        // Dark stone wall with moss
        this.mapLayer.fillStyle(0x2a2a2a, 1);
        this.mapLayer.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        this.mapLayer.fillStyle(0x1a4a1a, 0.4);
        this.mapLayer.fillRect(px + 2, py + 2, 4, 6);
        this.mapLayer.fillRect(px + 20, py + 15, 6, 8);
        break;
    }
    
    // Tile grid (subtle)
    this.mapLayer.lineStyle(1, 0x000000, 0.05);
    this.mapLayer.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
  }

  private addDecorations() {
    // Add trees, rocks, and other decorative elements
    const numTrees = 20;
    const numRocks = 15;
    
    // Trees
    for (let i = 0; i < numTrees; i++) {
      const x = Math.random() * this.width * TILE_SIZE;
      const y = Math.random() * this.height * TILE_SIZE;
      this.drawTree(x, y);
    }
    
    // Rocks
    for (let i = 0; i < numRocks; i++) {
      const x = Math.random() * this.width * TILE_SIZE;
      const y = Math.random() * this.height * TILE_SIZE;
      this.drawRock(x, y);
    }
  }

  private drawTree(x: number, y: number) {
    // Tree shadow
    this.decorationLayer.fillStyle(0x000000, 0.2);
    this.decorationLayer.fillEllipse(x, y + 5, 12, 6);
    
    // Tree trunk
    this.decorationLayer.fillStyle(0x4a3c28, 1);
    this.decorationLayer.fillRect(x - 3, y - 10, 6, 15);
    
    // Tree leaves (circles for simple trees)
    this.decorationLayer.fillStyle(0x2d5016, 1);
    this.decorationLayer.fillCircle(x, y - 20, 12);
    this.decorationLayer.fillStyle(0x3a6324, 1);
    this.decorationLayer.fillCircle(x - 5, y - 18, 8);
    this.decorationLayer.fillCircle(x + 5, y - 18, 8);
  }

  private drawRock(x: number, y: number) {
    // Rock shadow
    this.decorationLayer.fillStyle(0x000000, 0.15);
    this.decorationLayer.fillEllipse(x, y + 3, 8, 4);
    
    // Rock body
    this.decorationLayer.fillStyle(0x696969, 1);
    this.decorationLayer.fillCircle(x, y, 6);
    this.decorationLayer.fillStyle(0x808080, 1);
    this.decorationLayer.fillCircle(x - 2, y - 2, 4);
  }

  addLightSource(x: number, y: number, radius: number, color: number, intensity: number, flickering: boolean = false) {
    this.lightSources.push({ x, y, radius, color, intensity, flickering });
  }

  renderLighting() {
    this.lightingLayer.clear();
    
    // Create ambient darkness
    this.lightingLayer.fillStyle(0x000000, 0.3);
    this.lightingLayer.fillRect(0, 0, this.width * TILE_SIZE, this.height * TILE_SIZE);
    
    // Render light sources
    this.lightSources.forEach(light => {
      const intensity = light.flickering ? 
        light.intensity * (0.8 + 0.2 * Math.sin(Date.now() * 0.01)) : 
        light.intensity;
      
      // Create radial gradient for light
      this.lightingLayer.fillStyle(light.color, intensity * 0.1);
      this.lightingLayer.fillCircle(light.x * TILE_SIZE, light.y * TILE_SIZE, light.radius);
      
      // Inner bright core
      this.lightingLayer.fillStyle(light.color, intensity * 0.3);
      this.lightingLayer.fillCircle(light.x * TILE_SIZE, light.y * TILE_SIZE, light.radius * 0.5);
      
      // Very bright center
      this.lightingLayer.fillStyle(0xffffff, intensity * 0.6);
      this.lightingLayer.fillCircle(light.x * TILE_SIZE, light.y * TILE_SIZE, light.radius * 0.2);
    });
  }

  addEnvironmentalStoryElements() {
    STORY_ELEMENTS.forEach(element => {
      const px = element.x * TILE_SIZE;
      const py = element.y * TILE_SIZE;
      
      switch (element.type) {
        case 'monument':
          // Stone monument
          this.decorationLayer.fillStyle(0x808080, 1);
          this.decorationLayer.fillRect(px + 12, py + 8, 8, 20);
          this.decorationLayer.fillRect(px + 8, py + 8, 16, 4);
          // Add inscription plaque
          this.decorationLayer.fillStyle(0x654321, 1);
          this.decorationLayer.fillRect(px + 10, py + 16, 12, 6);
          break;
          
        case 'ancient_ruins':
          // Broken stone structures
          this.decorationLayer.fillStyle(0x696969, 0.8);
          this.decorationLayer.fillRect(px + 4, py + 12, 6, 12);
          this.decorationLayer.fillRect(px + 16, py + 8, 8, 16);
          this.decorationLayer.fillRect(px + 12, py + 20, 12, 4);
          // Add moss
          this.decorationLayer.fillStyle(0x2d5016, 0.6);
          this.decorationLayer.fillRect(px + 6, py + 14, 2, 8);
          break;
          
        case 'warning_sign':
          // Wooden warning sign
          this.decorationLayer.fillStyle(0x8b4513, 1);
          this.decorationLayer.fillRect(px + 14, py + 24, 4, 8);
          this.decorationLayer.fillRect(px + 8, py + 12, 16, 8);
          // Add warning symbol
          this.decorationLayer.fillStyle(0xff0000, 1);
          this.decorationLayer.fillRect(px + 15, py + 14, 2, 4);
          break;
          
        case 'grave_marker':
          // Stone grave marker
          this.decorationLayer.fillStyle(0x555555, 1);
          this.decorationLayer.fillRect(px + 12, py + 8, 8, 16);
          this.decorationLayer.fillRect(px + 8, py + 6, 16, 4);
          // Add flowers
          this.decorationLayer.fillStyle(0xff69b4, 0.8);
          this.decorationLayer.fillCircle(px + 8, py + 20, 2);
          this.decorationLayer.fillCircle(px + 24, py + 22, 2);
          break;
      }
    });
  }

  isWalkable(x: number, y: number, mapData?: number[][]): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    
    if (!mapData) {
      // Simple check based on distance from center for procedural map
      const centerX = Math.floor(this.width / 2);
      const centerY = Math.floor(this.height / 2);
      const dx = Math.abs(x - centerX);
      const dy = Math.abs(y - centerY);
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < 30;
    }
    
    const tileType = mapData[y]?.[x] ?? 0;
    const tile = this.tileTypes.get(tileType);
    return tile?.walkable ?? false;
  }

  // Check if a tile is a special interactive area
  isSpecialTile(x: number, y: number, mapData?: number[][]): { type: string; message?: string } | null {
    if (!mapData || x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    
    const tileType = mapData[y]?.[x];
    const tile = this.tileTypes.get(tileType);
    
    if (tile?.isSpecial) {
      switch (tile.name) {
        case 'cave_entrance':
          return { type: 'cave_entrance', message: 'A dark cave entrance beckons...' };
        case 'treasure_chest':
          return { type: 'treasure_chest', message: 'A gleaming treasure chest!' };
        case 'boss_arena':
          return { type: 'boss_arena', message: 'Ancient power emanates from this place...' };
        default:
          return { type: tile.name };
      }
    }
    
    // Check for story elements
    const storyElement = STORY_ELEMENTS.find(element => 
      Math.abs(element.x - x) <= 1 && Math.abs(element.y - y) <= 1
    );
    
    if (storyElement) {
      return { type: 'story_element', message: storyElement.message };
    }
    
    return null;
  }

  addGridOverlay(visible: boolean = false) {
    if (!visible) return;
    
    const gridOverlay = this.scene.add.graphics();
    gridOverlay.setDepth(1000);
    gridOverlay.lineStyle(1, 0xffffff, 0.1);
    
    for (let x = 0; x <= this.width; x++) {
      gridOverlay.moveTo(x * TILE_SIZE, 0);
      gridOverlay.lineTo(x * TILE_SIZE, this.height * TILE_SIZE);
    }
    
    for (let y = 0; y <= this.height; y++) {
      gridOverlay.moveTo(0, y * TILE_SIZE);
      gridOverlay.lineTo(this.width * TILE_SIZE, y * TILE_SIZE);
    }
    
    gridOverlay.strokePath();
  }
}