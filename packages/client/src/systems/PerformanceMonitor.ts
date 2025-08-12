export class PerformanceMonitor {
  private scene: Phaser.Scene;
  private frameCount = 0;
  private fpsSum = 0;
  private avgFPS = 60;
  private lastUpdateTime = 0;
  private fpsText?: Phaser.GameObjects.Text;
  private showFPS = false;
  
  // Performance thresholds
  private readonly FPS_TARGET_HIGH = 50;
  private readonly FPS_TARGET_MEDIUM = 35;
  private readonly FPS_TARGET_LOW = 25;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupFPSDisplay();
  }
  
  private setupFPSDisplay(): void {
    this.fpsText = this.scene.add.text(this.scene.scale.width - 120, 12, "FPS: --", {
      fontSize: '12px',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 1
    }).setScrollFactor(0).setDepth(1000).setVisible(this.showFPS);
  }
  
  update(): void {
    const currentTime = this.scene.time.now;
    const deltaTime = currentTime - this.lastUpdateTime;
    
    if (deltaTime > 0) {
      const fps = 1000 / deltaTime;
      this.fpsSum += fps;
      this.frameCount++;
      
      // Update average every 30 frames
      if (this.frameCount >= 30) {
        this.avgFPS = this.fpsSum / this.frameCount;
        this.frameCount = 0;
        this.fpsSum = 0;
        
        // Update FPS display
        if (this.fpsText && this.showFPS) {
          this.fpsText.setText(`FPS: ${Math.round(this.avgFPS)}`);
          
          // Color code based on performance
          if (this.avgFPS >= this.FPS_TARGET_HIGH) {
            this.fpsText.setColor('#00ff00'); // Green
          } else if (this.avgFPS >= this.FPS_TARGET_MEDIUM) {
            this.fpsText.setColor('#ffff00'); // Yellow
          } else {
            this.fpsText.setColor('#ff0000'); // Red
          }
        }
      }
    }
    
    this.lastUpdateTime = currentTime;
  }
  
  getAverageFPS(): number {
    return this.avgFPS;
  }
  
  getQualityRecommendation(): 'low' | 'medium' | 'high' {
    if (this.avgFPS >= this.FPS_TARGET_HIGH) {
      return 'high';
    } else if (this.avgFPS >= this.FPS_TARGET_MEDIUM) {
      return 'medium';
    } else {
      return 'low';
    }
  }
  
  toggleFPSDisplay(): void {
    this.showFPS = !this.showFPS;
    if (this.fpsText) {
      this.fpsText.setVisible(this.showFPS);
    }
  }
  
  setFPSDisplayVisible(visible: boolean): void {
    this.showFPS = visible;
    if (this.fpsText) {
      this.fpsText.setVisible(visible);
    }
  }
  
  isPerformanceGood(): boolean {
    return this.avgFPS >= this.FPS_TARGET_MEDIUM;
  }
  
  destroy(): void {
    this.fpsText?.destroy();
  }
}