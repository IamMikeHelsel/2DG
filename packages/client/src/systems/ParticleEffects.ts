import Phaser from "phaser";

export interface ParticleConfig {
  x: number;
  y: number;
  count: number;
  lifespan: number;
  speed: { min: number; max: number };
  scale: { start: number; end: number };
  alpha: { start: number; end: number };
  color: number;
  blendMode?: Phaser.BlendModes;
}

export class ParticleEffects {
  private scene: Phaser.Scene;
  private particleManagers: Map<string, Phaser.GameObjects.Particles.ParticleEmitter> = new Map();
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createParticleTextures();
  }
  
  private createParticleTextures(): void {
    // Create simple particle textures
    this.createCircleTexture('particle_spark', 4, 0xffffff);
    this.createCircleTexture('particle_dust', 2, 0xcccccc);
    this.createCircleTexture('particle_magic', 6, 0x00ffff);
    this.createCircleTexture('particle_ember', 3, 0xff6600);
  }
  
  private createCircleTexture(key: string, radius: number, color: number): void {
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(color, 1);
    graphics.fillCircle(radius, radius, radius);
    graphics.generateTexture(key, radius * 2, radius * 2);
    graphics.destroy();
  }
  
  createTorchParticles(id: string, x: number, y: number): void {
    const emitter = this.scene.add.particles(x, y, 'particle_ember', {
      speed: { min: 10, max: 30 },
      scale: { start: 0.8, end: 0.1 },
      alpha: { start: 0.8, end: 0.1 },
      lifespan: 1000,
      frequency: 150,
      quantity: 1,
      gravityY: -20,
      emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 8) },
      blendMode: Phaser.BlendModes.ADD
    });
    
    emitter.setDepth(950);
    this.particleManagers.set(id, emitter);
  }
  
  createCrystalParticles(id: string, x: number, y: number, color: number = 0x00ffff): void {
    // Update particle color
    this.createCircleTexture('particle_crystal_' + id, 3, color);
    
    const emitter = this.scene.add.particles(x, y, 'particle_crystal_' + id, {
      speed: { min: 5, max: 15 },
      scale: { start: 0.6, end: 0.1 },
      alpha: { start: 0.6, end: 0.1 },
      lifespan: 2000,
      frequency: 300,
      quantity: 1,
      gravityY: -10,
      emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 12) },
      blendMode: Phaser.BlendModes.ADD
    });
    
    emitter.setDepth(950);
    this.particleManagers.set(id, emitter);
  }
  
  createAmbientDust(id: string, bounds: Phaser.Geom.Rectangle): void {
    const emitter = this.scene.add.particles(bounds.centerX, bounds.centerY, 'particle_dust', {
      speed: { min: 1, max: 5 },
      scale: { start: 0.3, end: 0.1 },
      alpha: { start: 0.2, end: 0.05 },
      lifespan: 5000,
      frequency: 500,
      quantity: 1,
      emitZone: { type: 'random', source: bounds },
      blendMode: Phaser.BlendModes.NORMAL
    });
    
    emitter.setDepth(5); // Behind most objects
    this.particleManagers.set(id, emitter);
  }
  
  createMagicSparkles(id: string, x: number, y: number): void {
    const emitter = this.scene.add.particles(x, y, 'particle_magic', {
      speed: { min: 20, max: 40 },
      scale: { start: 0.5, end: 0.1 },
      alpha: { start: 0.8, end: 0.1 },
      lifespan: 800,
      frequency: 100,
      quantity: 2,
      emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 5) },
      blendMode: Phaser.BlendModes.ADD
    });
    
    emitter.setDepth(950);
    this.particleManagers.set(id, emitter);
  }
  
  updateParticlePosition(id: string, x: number, y: number): void {
    const emitter = this.particleManagers.get(id);
    if (emitter) {
      emitter.setPosition(x, y);
    }
  }
  
  removeParticles(id: string): void {
    const emitter = this.particleManagers.get(id);
    if (emitter) {
      emitter.destroy();
      this.particleManagers.delete(id);
    }
  }
  
  pauseParticles(id: string): void {
    const emitter = this.particleManagers.get(id);
    if (emitter) {
      emitter.pause();
    }
  }
  
  resumeParticles(id: string): void {
    const emitter = this.particleManagers.get(id);
    if (emitter) {
      emitter.resume();
    }
  }
  
  destroy(): void {
    this.particleManagers.forEach(emitter => emitter.destroy());
    this.particleManagers.clear();
  }
}