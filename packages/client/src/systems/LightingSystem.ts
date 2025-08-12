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
  private ambientColor: number = 0x191970; // Dark blue ambient
  private ambientAlpha: number = 0.7;
  
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
    
    // Create radial gradient for light
    const gradient = this.createRadialGradient(light.x, light.y, radius, light.color, intensity);
    
    // Draw the light circle
    this.lightLayer.fillStyle(light.color, intensity);
    this.lightLayer.fillCircle(light.x, light.y, radius);
    
    // Add soft edge by drawing multiple circles with decreasing alpha
    for (let i = 0; i < 3; i++) {
      const edgeRadius = radius + (i + 1) * 5;
      const edgeAlpha = intensity * (0.3 - i * 0.1);
      if (edgeAlpha > 0) {
        this.lightLayer.fillStyle(light.color, edgeAlpha);
        this.lightLayer.fillCircle(light.x, light.y, edgeRadius);
      }
    }
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
      radius: 80,
      color: 0xff6600,
      intensity: 0.6,
      flickerAmount: 8,
      flickerSpeed: 2
    };
  }
  
  createCrystalLight(id: string, x: number, y: number, color: number = 0x00ffff): LightSource {
    return {
      id,
      x,
      y,
      radius: 60,
      color,
      intensity: 0.4,
      flickerAmount: 2,
      flickerSpeed: 0.5
    };
  }
  
  createPlayerLight(id: string, x: number, y: number): LightSource {
    return {
      id,
      x,
      y,
      radius: 100,
      color: 0xffffff,
      intensity: 0.3
    };
  }
}