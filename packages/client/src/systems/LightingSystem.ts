import Phaser from "phaser";

export interface LightSource {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: number;
  intensity: number;
  flickerAmount?: number;
  flickerSpeed?: number;
}

export class LightingSystem {
  private scene: Phaser.Scene;
  private lightLayer: Phaser.GameObjects.Graphics;
  private darknessOverlay: Phaser.GameObjects.Graphics;
  private lightSources: Map<string, LightSource> = new Map();
  private ambientColor: number = 0x000033; // Darker blue ambient for better contrast
  private ambientAlpha: number = 0.8; // Increased darkness for better lighting effect
  private qualityLevel: 'low' | 'medium' | 'high' = 'high';
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    
    // Create darkness overlay first
    this.darknessOverlay = scene.add.graphics();
    this.darknessOverlay.setDepth(900); // Above most game objects but below UI
    
    // Create light layer with blend mode
    this.lightLayer = scene.add.graphics();
    this.lightLayer.setDepth(901); // Above darkness overlay
    this.lightLayer.setBlendMode(Phaser.BlendModes.SCREEN);
  }
  
  addLight(light: LightSource): void {
    this.lightSources.set(light.id, light);
  }
  
  removeLight(id: string): void {
    this.lightSources.delete(id);
  }
  
  updateLight(id: string, updates: Partial<LightSource>): void {
    const light = this.lightSources.get(id);
    if (light) {
      Object.assign(light, updates);
    }
  }
  
  setAmbientLight(color: number, alpha: number): void {
    this.ambientColor = color;
    this.ambientAlpha = alpha;
  }
  
  setQualityLevel(level: 'low' | 'medium' | 'high'): void {
    this.qualityLevel = level;
  }
  
  update(): void {
    this.renderLighting();
  }
  
  private renderLighting(): void {
    // Clear previous frame
    this.darknessOverlay.clear();
    this.lightLayer.clear();
    
    // Get camera bounds for optimization
    const camera = this.scene.cameras.main;
    const bounds = {
      x: camera.scrollX - 100,
      y: camera.scrollY - 100,
      width: camera.width + 200,
      height: camera.height + 200
    };
    
    // Fill darkness overlay
    this.darknessOverlay.fillStyle(this.ambientColor, this.ambientAlpha);
    this.darknessOverlay.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    
    // Render each light source
    this.lightSources.forEach(light => {
      // Skip lights outside camera view for performance
      if (this.isLightInBounds(light, bounds)) {
        this.renderLight(light);
      }
    });
  }
  
  private isLightInBounds(light: LightSource, bounds: any): boolean {
    return light.x + light.radius >= bounds.x &&
           light.x - light.radius <= bounds.x + bounds.width &&
           light.y + light.radius >= bounds.y &&
           light.y - light.radius <= bounds.y + bounds.height;
  }
  
  private renderLight(light: LightSource): void {
    let radius = light.radius;
    let intensity = light.intensity;
    
    // Apply flickering effect
    if (light.flickerAmount && light.flickerSpeed) {
      const time = this.scene.time.now * light.flickerSpeed * 0.001;
      const flicker = Math.sin(time) * light.flickerAmount;
      radius += flicker;
      intensity += flicker * 0.1;
      intensity = Math.max(0, Math.min(1, intensity));
    }
    
    // Main light circle
    this.lightLayer.fillStyle(light.color, intensity);
    this.lightLayer.fillCircle(light.x, light.y, radius);
    
    // Add soft edges based on quality level
    const edgeSteps = this.qualityLevel === 'high' ? 5 : this.qualityLevel === 'medium' ? 3 : 2;
    for (let i = 0; i < edgeSteps; i++) {
      const edgeRadius = radius + (i + 1) * 8;
      const edgeAlpha = intensity * (0.4 - i * 0.08);
      if (edgeAlpha > 0) {
        this.lightLayer.fillStyle(light.color, edgeAlpha);
        this.lightLayer.fillCircle(light.x, light.y, edgeRadius);
      }
    }
    
    // Add inner bright core for better visibility
    const coreAlpha = Math.min(1, intensity * 1.5);
    this.lightLayer.fillStyle(0xffffff, coreAlpha * 0.3);
    this.lightLayer.fillCircle(light.x, light.y, radius * 0.3);
  }
  
  private createRadialGradient(x: number, y: number, radius: number, color: number, intensity: number): any {
    // Note: Phaser doesn't have easy radial gradients, so we'll use multiple circles
    // This is a placeholder for potential future enhancement
    return null;
  }
  
  destroy(): void {
    this.lightLayer.destroy();
    this.darknessOverlay.destroy();
    this.lightSources.clear();
  }
  
  // Convenience methods for common light types
  createTorchLight(id: string, x: number, y: number): LightSource {
    return {
      id,
      x,
      y,
      radius: 120, // Increased radius for better visibility
      color: 0xff6600,
      intensity: 0.8, // Increased intensity
      flickerAmount: 10,
      flickerSpeed: 3
    };
  }
  
  createCrystalLight(id: string, x: number, y: number, color: number = 0x00ffff): LightSource {
    return {
      id,
      x,
      y,
      radius: 80, // Increased radius
      color,
      intensity: 0.6, // Increased intensity
      flickerAmount: 3,
      flickerSpeed: 1
    };
  }
  
  createPlayerLight(id: string, x: number, y: number): LightSource {
    return {
      id,
      x,
      y,
      radius: 140, // Increased radius for better gameplay visibility
      color: 0xffffff,
      intensity: 0.5 // Increased intensity
    };
  }
}