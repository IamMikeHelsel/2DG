/**
 * Texture Atlas system for batching sprites and reducing texture swaps
 * Combines multiple textures into a single atlas for better performance
 */
export class TextureAtlas {
  private scene: Phaser.Scene;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private atlasSize: number;
  private regions: Map<string, { x: number; y: number; width: number; height: number }> = new Map();
  private currentX = 0;
  private currentY = 0;
  private currentRowHeight = 0;
  private padding = 1; // Padding between textures to prevent bleeding

  constructor(scene: Phaser.Scene, atlasSize = 1024) {
    this.scene = scene;
    this.atlasSize = atlasSize;
    this.canvas = document.createElement('canvas');
    this.canvas.width = atlasSize;
    this.canvas.height = atlasSize;
    this.ctx = this.canvas.getContext('2d')!;
    
    // Clear to transparent
    this.ctx.clearRect(0, 0, atlasSize, atlasSize);
  }

  /**
   * Add a texture to the atlas
   */
  addTexture(key: string, imageData: ImageData | HTMLImageElement | HTMLCanvasElement): boolean {
    const width = 'width' in imageData ? imageData.width : imageData.naturalWidth;
    const height = 'height' in imageData ? imageData.height : imageData.naturalHeight;

    // Check if texture fits in current row
    if (this.currentX + width > this.atlasSize) {
      // Move to next row
      this.currentY += this.currentRowHeight + this.padding;
      this.currentX = 0;
      this.currentRowHeight = 0;
    }

    // Check if texture fits in atlas at all
    if (this.currentY + height > this.atlasSize) {
      console.warn(`[TextureAtlas] Texture ${key} too large for atlas`);
      return false;
    }

    // Draw texture to atlas
    if (imageData instanceof ImageData) {
      this.ctx.putImageData(imageData, this.currentX, this.currentY);
    } else {
      this.ctx.drawImage(imageData, this.currentX, this.currentY);
    }

    // Store region info
    this.regions.set(key, {
      x: this.currentX,
      y: this.currentY,
      width,
      height
    });

    // Update position
    this.currentX += width + this.padding;
    this.currentRowHeight = Math.max(this.currentRowHeight, height);

    return true;
  }

  /**
   * Finalize the atlas and create Phaser texture
   */
  finalize(atlasKey: string): void {
    // Create Phaser texture from canvas
    this.scene.textures.addCanvas(atlasKey, this.canvas);
    
    // Add frames for each region
    this.regions.forEach((region, key) => {
      this.scene.textures.addFrame(atlasKey, key, region.x, region.y, region.width, region.height);
    });
  }

  /**
   * Get region info for a texture
   */
  getRegion(key: string): { x: number; y: number; width: number; height: number } | undefined {
    return this.regions.get(key);
  }

  /**
   * Get atlas utilization percentage
   */
  getUtilization(): number {
    let usedArea = 0;
    this.regions.forEach(region => {
      usedArea += region.width * region.height;
    });
    return (usedArea / (this.atlasSize * this.atlasSize)) * 100;
  }

  /**
   * Get debug info
   */
  getDebugInfo(): {
    regions: number;
    utilization: number;
    size: number;
    remainingSpace: { x: number; y: number };
  } {
    return {
      regions: this.regions.size,
      utilization: this.getUtilization(),
      size: this.atlasSize,
      remainingSpace: { x: this.currentX, y: this.currentY }
    };
  }
}

/**
 * Atlas manager for creating and managing multiple atlases
 */
export class AtlasManager {
  private scene: Phaser.Scene;
  private atlases: Map<string, TextureAtlas> = new Map();
  private defaultAtlasSize: number;

  constructor(scene: Phaser.Scene, defaultAtlasSize = 1024) {
    this.scene = scene;
    this.defaultAtlasSize = defaultAtlasSize;
  }

  createAtlas(name: string, size?: number): TextureAtlas {
    const atlas = new TextureAtlas(this.scene, size || this.defaultAtlasSize);
    this.atlases.set(name, atlas);
    return atlas;
  }

  getAtlas(name: string): TextureAtlas | undefined {
    return this.atlases.get(name);
  }

  finalizeAll(): void {
    this.atlases.forEach((atlas, name) => {
      atlas.finalize(name);
    });
  }

  getStats(): Array<{ name: string; utilization: number; regions: number }> {
    const stats: Array<{ name: string; utilization: number; regions: number }> = [];
    this.atlases.forEach((atlas, name) => {
      const debug = atlas.getDebugInfo();
      stats.push({
        name,
        utilization: debug.utilization,
        regions: debug.regions
      });
    });
    return stats;
  }
}