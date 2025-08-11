import { Scene, GameObjects } from 'phaser';
import { TILE_SIZE } from '@toodee/shared';

export interface TileType {
  id: number;
  name: string;
  walkable: boolean;
  color: number;
  texture?: string;
}

export class WorldManager {
  private scene: Scene;
  private mapLayer: GameObjects.Graphics;
  private decorationLayer: GameObjects.Graphics;
  private width: number;
  private height: number;
  private tileTypes: Map<number, TileType>;

  constructor(scene: Scene, width: number, height: number) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    
    // Define tile types
    this.tileTypes = new Map([
      [0, { id: 0, name: 'water', walkable: false, color: 0x4682b4 }],
      [1, { id: 1, name: 'grass', walkable: true, color: 0x4a7c59 }],
      [2, { id: 2, name: 'stone', walkable: false, color: 0x808080 }],
      [3, { id: 3, name: 'sand', walkable: true, color: 0xc2b280 }],
      [4, { id: 4, name: 'dirt', walkable: true, color: 0x8b6f43 }],
    ]);

    // Create map layers
    this.mapLayer = scene.add.graphics();
    this.mapLayer.setDepth(0);
    
    this.decorationLayer = scene.add.graphics();
    this.decorationLayer.setDepth(1);
  }

  renderMap(mapData?: number[][]) {
    this.mapLayer.clear();
    this.decorationLayer.clear();

    // If no map data, generate a simple procedural map
    if (!mapData) {
      this.renderProceduralMap();
      return;
    }

    // Render provided map data
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tileType = mapData[y]?.[x] ?? 0;
        this.renderTile(x, y, tileType);
      }
    }
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
    
    // Add texture details
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

  isWalkable(x: number, y: number, mapData?: number[][]): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    
    if (!mapData) {
      // Simple check based on distance from center
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