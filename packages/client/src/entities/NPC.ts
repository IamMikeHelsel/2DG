import { Scene, GameObjects } from "phaser";
import { TILE_SIZE } from "@toodee/shared";

export interface NPCDialogue {
  text: string;
  responses?: {
    text: string;
    action?: () => void;
    nextDialogue?: string;
  }[];
}

export interface NPCConfig {
  id: string;
  name: string;
  x: number;
  y: number;
  spriteKey: string;
  dialogues: { [key: string]: NPCDialogue };
  initialDialogue?: string;
  interactionDistance?: number;
  onInteract?: (npc: NPC) => void;
}

export class NPC {
  private scene: Scene;
  private sprite: GameObjects.Sprite;
  private nameText: GameObjects.Text;
  private interactionIndicator: GameObjects.Text;
  private shadowSprite: GameObjects.Ellipse;
  private currentDialogue: string;
  private isShowingIndicator: boolean = false;

  public id: string;
  public name: string;
  public x: number;
  public y: number;
  public dialogues: { [key: string]: NPCDialogue };
  public interactionDistance: number;
  public onInteract?: (npc: NPC) => void;

  constructor(scene: Scene, config: NPCConfig) {
    this.scene = scene;
    this.id = config.id;
    this.name = config.name;
    this.x = config.x;
    this.y = config.y;
    this.dialogues = config.dialogues;
    this.currentDialogue = config.initialDialogue || "default";
    this.interactionDistance = config.interactionDistance || 2;
    this.onInteract = config.onInteract;

    // Create shadow
    this.shadowSprite = scene.add.ellipse(
      this.x * TILE_SIZE,
      this.y * TILE_SIZE + 4,
      TILE_SIZE * 0.8,
      TILE_SIZE * 0.4,
      0x000000,
      0.3
    );

    // Create sprite
    this.sprite = scene.add.sprite(this.x * TILE_SIZE, this.y * TILE_SIZE, config.spriteKey);
    this.sprite.setOrigin(0.5, 0.7);

    // Create name text
    this.nameText = scene.add.text(this.x * TILE_SIZE, this.y * TILE_SIZE - 20, this.name, {
      fontSize: "12px",
      color: "#00ff00",
      stroke: "#000000",
      strokeThickness: 2,
    });
    this.nameText.setOrigin(0.5, 1);

    // Create interaction indicator (hidden by default)
    this.interactionIndicator = scene.add.text(
      this.x * TILE_SIZE,
      this.y * TILE_SIZE - 35,
      "Press E to interact",
      {
        fontSize: "10px",
        color: "#ffff00",
        stroke: "#000000",
        strokeThickness: 2,
        backgroundColor: "#00000088",
        padding: { x: 4, y: 2 },
      }
    );
    this.interactionIndicator.setOrigin(0.5, 1);
    this.interactionIndicator.setVisible(false);

    // Set depth
    this.shadowSprite.setDepth(1);
    this.sprite.setDepth(2);
    this.nameText.setDepth(3);
    this.interactionIndicator.setDepth(4);

    // Play idle animation if exists
    this.playIdleAnimation();
  }

  private playIdleAnimation() {
    const animKey = `${this.sprite.texture.key}_idle_down`;
    if (this.scene.anims.exists(animKey)) {
      this.sprite.play(animKey, true);
    }
  }

  showInteractionIndicator() {
    if (!this.isShowingIndicator) {
      this.isShowingIndicator = true;
      this.interactionIndicator.setVisible(true);

      // Floating animation
      this.scene.tweens.add({
        targets: this.interactionIndicator,
        y: this.y * TILE_SIZE - 40,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  hideInteractionIndicator() {
    if (this.isShowingIndicator) {
      this.isShowingIndicator = false;
      this.interactionIndicator.setVisible(false);
      this.scene.tweens.killTweensOf(this.interactionIndicator);
      this.interactionIndicator.y = this.y * TILE_SIZE - 35;
    }
  }

  interact() {
    if (this.onInteract) {
      this.onInteract(this);
    }
    return this.getCurrentDialogue();
  }

  getCurrentDialogue(): NPCDialogue | null {
    return this.dialogues[this.currentDialogue] || null;
  }

  setDialogue(dialogueKey: string) {
    if (this.dialogues[dialogueKey]) {
      this.currentDialogue = dialogueKey;
    }
  }

  getDistanceTo(x: number, y: number): number {
    const dx = this.x - x;
    const dy = this.y - y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  isInInteractionRange(x: number, y: number): boolean {
    return this.getDistanceTo(x, y) <= this.interactionDistance;
  }

  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;

    const pixelX = x * TILE_SIZE;
    const pixelY = y * TILE_SIZE;

    this.sprite.setPosition(pixelX, pixelY);
    this.shadowSprite.setPosition(pixelX, pixelY + 4);
    this.nameText.setPosition(pixelX, pixelY - 20);
    this.interactionIndicator.setPosition(pixelX, pixelY - 35);
  }

  faceDirection(direction: "up" | "down" | "left" | "right") {
    const animKey = `${this.sprite.texture.key}_idle_${direction}`;
    if (this.scene.anims.exists(animKey)) {
      this.sprite.play(animKey, true);
    } else {
      // Fallback to frame
      const frameMap = { down: 0, left: 4, right: 8, up: 12 };
      this.sprite.setFrame(frameMap[direction] || 0);
    }
  }

  faceTowards(x: number, y: number) {
    const dx = x - this.x;
    const dy = y - this.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      this.faceDirection(dx > 0 ? "right" : "left");
    } else {
      this.faceDirection(dy > 0 ? "down" : "up");
    }
  }

  destroy() {
    this.sprite?.destroy();
    this.shadowSprite?.destroy();
    this.nameText?.destroy();
    this.interactionIndicator?.destroy();
  }
}
