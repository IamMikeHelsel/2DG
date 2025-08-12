import { Scene, GameObjects } from "phaser";
import { NPCDialogue } from "../entities/NPC";

export class DialogueUI {
  private scene: Scene;
  private container: GameObjects.Container;
  private background: GameObjects.Rectangle;
  private npcNameText: GameObjects.Text;
  private dialogueText: GameObjects.Text;
  private responseButtons: GameObjects.Container[] = [];
  private isShowing: boolean = false;
  private onClose?: () => void;

  constructor(scene: Scene) {
    this.scene = scene;

    // Create container
    this.container = scene.add.container(
      scene.cameras.main.width / 2,
      scene.cameras.main.height - 150
    );
    this.container.setDepth(100);
    this.container.setVisible(false);

    // Create background
    this.background = scene.add.rectangle(0, 0, 600, 200, 0x000000, 0.9);
    this.background.setStrokeStyle(2, 0xffffff);
    this.container.add(this.background);

    // Create NPC name text
    this.npcNameText = scene.add.text(-280, -80, "", {
      fontSize: "18px",
      color: "#00ff00",
      fontStyle: "bold",
    });
    this.container.add(this.npcNameText);

    // Create dialogue text
    this.dialogueText = scene.add.text(-280, -50, "", {
      fontSize: "14px",
      color: "#ffffff",
      wordWrap: { width: 560 },
    });
    this.container.add(this.dialogueText);

    // Setup ESC key to close
    this.scene.input.keyboard?.on("keydown-ESC", () => {
      if (this.isShowing) {
        this.hide();
      }
    });
  }

  show(npcName: string, dialogue: NPCDialogue, onClose?: () => void) {
    this.isShowing = true;
    this.onClose = onClose;

    // Clear previous response buttons
    this.clearResponseButtons();

    // Set NPC name and dialogue text
    this.npcNameText.setText(npcName);
    this.dialogueText.setText(dialogue.text);

    // Create response buttons if there are responses
    if (dialogue.responses && dialogue.responses.length > 0) {
      dialogue.responses.forEach((response, index) => {
        this.createResponseButton(response.text, index, () => {
          if (response.action) {
            response.action();
          }
          if (response.nextDialogue) {
            // Handle next dialogue transition
            this.hide();
          } else {
            this.hide();
          }
        });
      });
    } else {
      // Create a default "Close" button
      this.createResponseButton("Close", 0, () => this.hide());
    }

    // Show container with animation
    this.container.setVisible(true);
    this.container.setAlpha(0);
    this.container.setY(this.scene.cameras.main.height);

    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      y: this.scene.cameras.main.height - 150,
      duration: 200,
      ease: "Power2",
    });
  }

  hide() {
    if (!this.isShowing) return;

    this.isShowing = false;

    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      y: this.scene.cameras.main.height,
      duration: 200,
      ease: "Power2",
      onComplete: () => {
        this.container.setVisible(false);
        this.clearResponseButtons();
        if (this.onClose) {
          this.onClose();
          this.onClose = undefined;
        }
      },
    });
  }

  private createResponseButton(text: string, index: number, onClick: () => void) {
    const buttonY = 20 + index * 35;
    const buttonContainer = this.scene.add.container(-280, buttonY);

    // Button background
    const buttonBg = this.scene.add.rectangle(0, 0, 560, 30, 0x333333, 0.8);
    buttonBg.setOrigin(0, 0.5);
    buttonBg.setStrokeStyle(1, 0x666666);
    buttonBg.setInteractive({ useHandCursor: true });

    // Button text
    const buttonText = this.scene.add.text(10, 0, `> ${text}`, {
      fontSize: "14px",
      color: "#ffffff",
    });
    buttonText.setOrigin(0, 0.5);

    // Add hover effect
    buttonBg.on("pointerover", () => {
      buttonBg.setFillStyle(0x555555, 0.9);
      buttonText.setColor("#ffff00");
    });

    buttonBg.on("pointerout", () => {
      buttonBg.setFillStyle(0x333333, 0.8);
      buttonText.setColor("#ffffff");
    });

    buttonBg.on("pointerdown", onClick);

    buttonContainer.add([buttonBg, buttonText]);
    this.container.add(buttonContainer);
    this.responseButtons.push(buttonContainer);
  }

  private clearResponseButtons() {
    this.responseButtons.forEach(button => button.destroy());
    this.responseButtons = [];
  }

  updatePosition() {
    // Update position if screen size changes
    this.container.setPosition(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height - 150
    );
  }

  isOpen(): boolean {
    return this.isShowing;
  }

  destroy() {
    this.container?.destroy();
  }
}
