import { Scene } from 'phaser';

export interface SpriteConfig {
  key: string;
  path: string;
  frameWidth?: number;
  frameHeight?: number;
}

export interface AnimationConfig {
  key: string;
  spriteKey: string;
  frames: number[] | { start: number; end: number };
  frameRate: number;
  repeat?: number;
}

export class AssetLoader {
  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  loadSprites(sprites: SpriteConfig[]) {
    sprites.forEach(sprite => {
      if (sprite.frameWidth && sprite.frameHeight) {
        this.scene.load.spritesheet(
          sprite.key,
          sprite.path,
          { frameWidth: sprite.frameWidth, frameHeight: sprite.frameHeight }
        );
      } else {
        this.scene.load.image(sprite.key, sprite.path);
      }
    });
  }

  createAnimations(animations: AnimationConfig[]) {
    animations.forEach(anim => {
      let frames;
      if (Array.isArray(anim.frames)) {
        frames = anim.frames.map(frame => ({ key: anim.spriteKey, frame }));
      } else {
        frames = this.scene.anims.generateFrameNumbers(anim.spriteKey, anim.frames);
      }

      this.scene.anims.create({
        key: anim.key,
        frames: frames,
        frameRate: anim.frameRate,
        repeat: anim.repeat ?? -1
      });
    });
  }

  static getCharacterAnimations(spriteKey: string): AnimationConfig[] {
    return [
      {
        key: `${spriteKey}_idle_down`,
        spriteKey,
        frames: [0],
        frameRate: 1,
        repeat: 0
      },
      {
        key: `${spriteKey}_idle_up`,
        spriteKey,
        frames: [12],
        frameRate: 1,
        repeat: 0
      },
      {
        key: `${spriteKey}_idle_left`,
        spriteKey,
        frames: [4],
        frameRate: 1,
        repeat: 0
      },
      {
        key: `${spriteKey}_idle_right`,
        spriteKey,
        frames: [8],
        frameRate: 1,
        repeat: 0
      },
      {
        key: `${spriteKey}_walk_down`,
        spriteKey,
        frames: { start: 0, end: 3 },
        frameRate: 8
      },
      {
        key: `${spriteKey}_walk_left`,
        spriteKey,
        frames: { start: 4, end: 7 },
        frameRate: 8
      },
      {
        key: `${spriteKey}_walk_right`,
        spriteKey,
        frames: { start: 8, end: 11 },
        frameRate: 8
      },
      {
        key: `${spriteKey}_walk_up`,
        spriteKey,
        frames: { start: 12, end: 15 },
        frameRate: 8
      }
    ];
  }
}