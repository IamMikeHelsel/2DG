/**
 * Level of Detail (LOD) system for optimizing rendering based on distance
 * Reduces detail for distant entities and culls off-screen objects
 */

export interface LODEntity {
  object: Phaser.GameObjects.GameObject;
  position: { x: number; y: number };
  lodLevel: number;
  isVisible: boolean;
  lastUpdate: number;
}

export enum LODLevel {
  High = 0,     // Full detail - close entities
  Medium = 1,   // Reduced detail - medium distance
  Low = 2,      // Minimal detail - far entities
  Culled = 3    // Not rendered - very far or off-screen
}

export class LODManager {
  private entities: Map<string, LODEntity> = new Map();
  private camera: Phaser.Cameras.Scene2D.Camera;
  private lastUpdate = 0;
  private updateInterval = 100; // Update LOD every 100ms
  
  // Distance thresholds in pixels
  private readonly thresholds = {
    high: 200,    // 0-200px: high detail
    medium: 500,  // 200-500px: medium detail
    low: 800,     // 500-800px: low detail
    cull: 1200    // 800+px: culled
  };

  // Viewport culling margins
  private readonly cullMargin = 100; // Extra margin around viewport

  constructor(camera: Phaser.Cameras.Scene2D.Camera) {
    this.camera = camera;
  }

  /**
   * Register an entity for LOD management
   */
  addEntity(id: string, object: Phaser.GameObjects.GameObject, position: { x: number; y: number }): void {
    this.entities.set(id, {
      object,
      position,
      lodLevel: LODLevel.High,
      isVisible: true,
      lastUpdate: 0
    });
  }

  /**
   * Remove entity from LOD management
   */
  removeEntity(id: string): void {
    this.entities.delete(id);
  }

  /**
   * Update entity position
   */
  updateEntityPosition(id: string, position: { x: number; y: number }): void {
    const entity = this.entities.get(id);
    if (entity) {
      entity.position = position;
    }
  }

  /**
   * Update LOD for all entities
   */
  update(): void {
    const now = performance.now();
    if (now - this.lastUpdate < this.updateInterval) return;

    const cameraCenter = {
      x: this.camera.scrollX + this.camera.width / 2,
      y: this.camera.scrollY + this.camera.height / 2
    };

    const viewport = {
      left: this.camera.scrollX - this.cullMargin,
      right: this.camera.scrollX + this.camera.width + this.cullMargin,
      top: this.camera.scrollY - this.cullMargin,
      bottom: this.camera.scrollY + this.camera.height + this.cullMargin
    };

    this.entities.forEach((entity, id) => {
      this.updateEntityLOD(entity, cameraCenter, viewport);
    });

    this.lastUpdate = now;
  }

  private updateEntityLOD(entity: LODEntity, cameraCenter: { x: number; y: number }, viewport: any): void {
    const pos = entity.position;
    
    // Check viewport culling first
    const inViewport = pos.x >= viewport.left && pos.x <= viewport.right &&
                      pos.y >= viewport.top && pos.y <= viewport.bottom;

    if (!inViewport) {
      this.setEntityLOD(entity, LODLevel.Culled);
      return;
    }

    // Calculate distance from camera center
    const distance = Math.hypot(pos.x - cameraCenter.x, pos.y - cameraCenter.y);

    // Determine LOD level based on distance
    let newLOD: LODLevel;
    if (distance <= this.thresholds.high) {
      newLOD = LODLevel.High;
    } else if (distance <= this.thresholds.medium) {
      newLOD = LODLevel.Medium;
    } else if (distance <= this.thresholds.low) {
      newLOD = LODLevel.Low;
    } else {
      newLOD = LODLevel.Culled;
    }

    // Update LOD if changed
    if (newLOD !== entity.lodLevel) {
      this.setEntityLOD(entity, newLOD);
    }
  }

  private setEntityLOD(entity: LODEntity, lodLevel: LODLevel): void {
    entity.lodLevel = lodLevel;
    entity.lastUpdate = performance.now();

    const obj = entity.object;

    switch (lodLevel) {
      case LODLevel.High:
        obj.setVisible(true);
        obj.setActive(true);
        this.setHighDetail(obj);
        entity.isVisible = true;
        break;

      case LODLevel.Medium:
        obj.setVisible(true);
        obj.setActive(true);
        this.setMediumDetail(obj);
        entity.isVisible = true;
        break;

      case LODLevel.Low:
        obj.setVisible(true);
        obj.setActive(true);
        this.setLowDetail(obj);
        entity.isVisible = true;
        break;

      case LODLevel.Culled:
        obj.setVisible(false);
        obj.setActive(false);
        entity.isVisible = false;
        break;
    }
  }

  private setHighDetail(obj: Phaser.GameObjects.GameObject): void {
    // Full detail - all child objects visible, animations playing
    if (obj instanceof Phaser.GameObjects.Container) {
      obj.list.forEach(child => {
        child.setVisible(true);
        if (child instanceof Phaser.GameObjects.Sprite && child.anims) {
          child.anims.resume();
        }
      });
    }
    obj.setAlpha(1);
  }

  private setMediumDetail(obj: Phaser.GameObjects.GameObject): void {
    // Medium detail - some optimizations
    if (obj instanceof Phaser.GameObjects.Container) {
      obj.list.forEach(child => {
        // Hide decorative elements but keep main sprite
        if (child instanceof Phaser.GameObjects.Ellipse || // shadows
            (child instanceof Phaser.GameObjects.Rectangle && child.height < 10)) { // hp bars
          child.setVisible(false);
        } else {
          child.setVisible(true);
          if (child instanceof Phaser.GameObjects.Sprite && child.anims) {
            child.anims.resume();
          }
        }
      });
    }
    obj.setAlpha(0.9);
  }

  private setLowDetail(obj: Phaser.GameObjects.GameObject): void {
    // Low detail - minimal rendering
    if (obj instanceof Phaser.GameObjects.Container) {
      obj.list.forEach(child => {
        // Only show main sprite
        if (child instanceof Phaser.GameObjects.Sprite) {
          child.setVisible(true);
          // Pause animations to save CPU
          if (child.anims) {
            child.anims.pause();
          }
        } else {
          child.setVisible(false);
        }
      });
    }
    obj.setAlpha(0.7);
  }

  /**
   * Get LOD statistics
   */
  getStats(): {
    total: number;
    high: number;
    medium: number;
    low: number;
    culled: number;
    visible: number;
  } {
    const stats = {
      total: this.entities.size,
      high: 0,
      medium: 0,
      low: 0,
      culled: 0,
      visible: 0
    };

    this.entities.forEach(entity => {
      switch (entity.lodLevel) {
        case LODLevel.High: stats.high++; break;
        case LODLevel.Medium: stats.medium++; break;
        case LODLevel.Low: stats.low++; break;
        case LODLevel.Culled: stats.culled++; break;
      }
      if (entity.isVisible) stats.visible++;
    });

    return stats;
  }

  /**
   * Configure LOD thresholds
   */
  setThresholds(thresholds: Partial<typeof this.thresholds>): void {
    Object.assign(this.thresholds, thresholds);
  }

  /**
   * Force update all entities
   */
  forceUpdate(): void {
    this.lastUpdate = 0;
    this.update();
  }

  destroy(): void {
    this.entities.clear();
  }
}