import { Scene, GameObjects } from 'phaser';
import { TILE_SIZE } from '../../../shared/constants';

export class Character {
  private scene: Scene;
  private sprite: GameObjects.Sprite;
  private nameText: GameObjects.Text;
  private hpBar: GameObjects.Graphics;
  private hpBarBg: GameObjects.Graphics;
  private lastDirection: string = 'down';
  private isMoving: boolean = false;
  private shadowSprite?: GameObjects.Ellipse;

  public id: string;
  public x: number = 0;
  public y: number = 0;
  public hp: number = 100;
  public maxHp: number = 100;

  constructor(
    scene: Scene,
    id: string,
    x: number,
    y: number,
    name: string,
    spriteKey: string = 'player',
    isLocalPlayer: boolean = false
  ) {
    this.scene = scene;
    this.id = id;
    this.x = x;
    this.y = y;

    // Create shadow
    this.shadowSprite = scene.add.ellipse(
      x * TILE_SIZE,
      y * TILE_SIZE + 4,
      TILE_SIZE * 0.8,
      TILE_SIZE * 0.4,
      0x000000,
      0.3
    );

    // Create sprite
    this.sprite = scene.add.sprite(x * TILE_SIZE, y * TILE_SIZE, spriteKey);
    this.sprite.setOrigin(0.5, 0.7);
    
    // Create name text
    this.nameText = scene.add.text(x * TILE_SIZE, y * TILE_SIZE - 20, name, {
      fontSize: '12px',
      color: isLocalPlayer ? '#ffff00' : '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    });
    this.nameText.setOrigin(0.5, 1);

    // Create HP bar background
    this.hpBarBg = scene.add.graphics();
    this.hpBarBg.fillStyle(0x000000, 0.5);
    this.hpBarBg.fillRect(-16, -25, 32, 4);

    // Create HP bar
    this.hpBar = scene.add.graphics();
    this.updateHpBar();

    // Set depth for layering
    this.shadowSprite.setDepth(1);
    this.sprite.setDepth(2);
    this.hpBarBg.setDepth(3);
    this.hpBar.setDepth(3);
    this.nameText.setDepth(3);

    // Start with idle animation
    this.playAnimation('idle_down');
  }

  setPosition(x: number, y: number, smooth: boolean = true) {
    this.x = x;
    this.y = y;

    const targetX = x * TILE_SIZE;
    const targetY = y * TILE_SIZE;

    if (smooth && this.sprite) {
      // Smooth movement interpolation
      this.scene.tweens.add({
        targets: [this.sprite, this.shadowSprite],
        x: targetX,
        y: { 
          value: targetY,
          ease: 'Linear'
        },
        duration: 100,
        onUpdate: () => {
          this.updateAttachedElements();
          if (this.shadowSprite) {
            this.shadowSprite.y = this.sprite.y + 4;
          }
        }
      });
    } else {
      this.sprite.setPosition(targetX, targetY);
      if (this.shadowSprite) {
        this.shadowSprite.setPosition(targetX, targetY + 4);
      }
      this.updateAttachedElements();
    }
  }

  updateMovement(direction: number | null, isMoving: boolean) {
    const dirMap = ['up', 'right', 'down', 'left'];
    
    if (direction !== null && direction >= 0 && direction < 4) {
      this.lastDirection = dirMap[direction];
    }

    this.isMoving = isMoving;
    
    if (isMoving && direction !== null) {
      this.playAnimation(`walk_${this.lastDirection}`);
    } else {
      this.playAnimation(`idle_${this.lastDirection}`);
    }
  }

  private playAnimation(key: string) {
    const animKey = `${this.sprite.texture.key}_${key}`;
    
    if (this.scene.anims.exists(animKey)) {
      this.sprite.play(animKey, true);
    } else {
      // Fallback to static frame if animation doesn't exist
      const frameMap: { [key: string]: number } = {
        'idle_down': 0,
        'idle_left': 4,
        'idle_right': 8,
        'idle_up': 12,
        'walk_down': 1,
        'walk_left': 5,
        'walk_right': 9,
        'walk_up': 13
      };
      
      const frame = frameMap[key.replace(`${this.sprite.texture.key}_`, '')] ?? 0;
      this.sprite.setFrame(frame);
    }
  }

  updateHp(hp: number, maxHp: number) {
    this.hp = hp;
    this.maxHp = maxHp;
    this.updateHpBar();
  }

  private updateHpBar() {
    this.hpBar.clear();
    
    const hpPercent = Math.max(0, Math.min(1, this.hp / this.maxHp));
    const barWidth = Math.floor(32 * hpPercent);
    
    // Choose color based on HP percentage
    let color = 0x00ff00; // Green
    if (hpPercent < 0.3) {
      color = 0xff0000; // Red
    } else if (hpPercent < 0.6) {
      color = 0xffaa00; // Orange
    }
    
    this.hpBar.fillStyle(color, 1);
    this.hpBar.fillRect(-16, -25, barWidth, 4);
  }

  private updateAttachedElements() {
    const x = this.sprite.x;
    const y = this.sprite.y;

    this.nameText.setPosition(x, y - 20);
    this.hpBarBg.setPosition(x, y);
    this.hpBar.setPosition(x, y);
  }

  showDamage(amount: number) {
    const damageText = this.scene.add.text(
      this.sprite.x,
      this.sprite.y - 30,
      `-${amount}`,
      {
        fontSize: '18px',
        color: '#ff0000',
        stroke: '#000000',
        strokeThickness: 2,
        fontStyle: 'bold'
      }
    );
    damageText.setOrigin(0.5, 0.5);
    damageText.setDepth(10);

    this.scene.tweens.add({
      targets: damageText,
      y: damageText.y - 30,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        damageText.destroy();
      }
    });
  }

  destroy() {
    this.sprite?.destroy();
    this.shadowSprite?.destroy();
    this.nameText?.destroy();
    this.hpBar?.destroy();
    this.hpBarBg?.destroy();
  }
}