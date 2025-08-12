import Phaser from "phaser";
import { InstanceInfo } from "@toodee/shared";
import { getAvailableInstances, connectToInstance } from "../net";

export class InstanceSelectionScene extends Phaser.Scene {
  private instances: InstanceInfo[] = [];
  private selectedInstanceIndex = 0;
  private instanceElements: Phaser.GameObjects.Container[] = [];
  private loadingText?: Phaser.GameObjects.Text;
  private instructionText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "InstanceSelection" });
  }

  async create() {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0f0f13);

    // Title
    this.add.text(width / 2, height * 0.15, "Select Game Instance", {
      fontSize: "48px",
      color: "#ffffff",
      fontFamily: "Arial, sans-serif"
    }).setOrigin(0.5);

    // Loading text
    this.loadingText = this.add.text(width / 2, height / 2, "Loading instances...", {
      fontSize: "24px",
      color: "#cccccc",
      fontFamily: "Arial, sans-serif"
    }).setOrigin(0.5);

    // Instructions
    this.instructionText = this.add.text(width / 2, height * 0.85, "Use UP/DOWN arrows to navigate, ENTER to join, or SPACE for auto-select", {
      fontSize: "18px",
      color: "#888888",
      fontFamily: "Arial, sans-serif"
    }).setOrigin(0.5);

    // Load instances
    await this.loadInstances();

    // Setup input
    this.setupInput();
  }

  private async loadInstances() {
    try {
      this.instances = await getAvailableInstances();
      this.createInstanceList();
    } catch (error) {
      console.error("Failed to load instances:", error);
      this.loadingText?.setText("Failed to load instances. Press SPACE to retry.");
    }
  }

  private createInstanceList() {
    const { width, height } = this.scale;

    // Clear loading text
    this.loadingText?.destroy();

    // Clear existing instance elements
    this.instanceElements.forEach(element => element.destroy());
    this.instanceElements = [];

    const startY = height * 0.35;
    const itemHeight = 80;

    this.instances.forEach((instance, index) => {
      const y = startY + index * itemHeight;
      
      // Container for instance info
      const container = this.add.container(width / 2, y);

      // Background box
      const isSelected = index === this.selectedInstanceIndex;
      const bgColor = isSelected ? 0x4444aa : 0x333333;
      const bgAlpha = isSelected ? 0.8 : 0.5;
      
      const background = this.add.rectangle(0, 0, width * 0.6, itemHeight - 10, bgColor, bgAlpha);
      container.add(background);

      // Instance name
      const nameText = this.add.text(-width * 0.25, -15, instance.name, {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "Arial, sans-serif"
      });
      container.add(nameText);

      // Player count and status
      const statusColor = instance.status === 'full' ? "#ff6666" : 
                         instance.status === 'active' ? "#66ff66" : "#ffff66";
      
      const statusText = this.add.text(-width * 0.25, 10, 
        `Players: ${instance.playerCount}/${instance.maxPlayers} - ${instance.status.toUpperCase()}`, {
        fontSize: "16px",
        color: statusColor,
        fontFamily: "Arial, sans-serif"
      });
      container.add(statusText);

      // Instance ID
      const idText = this.add.text(width * 0.15, -5, instance.id, {
        fontSize: "14px",
        color: "#aaaaaa",
        fontFamily: "Arial, sans-serif"
      }).setOrigin(1, 0.5);
      container.add(idText);

      this.instanceElements.push(container);
    });

    this.updateSelection();
  }

  private setupInput() {
    const cursors = this.input.keyboard?.createCursorKeys();
    const spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    const enterKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    cursors?.up.on('down', () => {
      if (this.instances.length > 0) {
        this.selectedInstanceIndex = Math.max(0, this.selectedInstanceIndex - 1);
        this.updateSelection();
      }
    });

    cursors?.down.on('down', () => {
      if (this.instances.length > 0) {
        this.selectedInstanceIndex = Math.min(this.instances.length - 1, this.selectedInstanceIndex + 1);
        this.updateSelection();
      }
    });

    enterKey?.on('down', () => {
      if (this.instances.length > 0) {
        this.joinSelectedInstance();
      }
    });

    spaceKey?.on('down', () => {
      if (this.instances.length === 0) {
        // Retry loading instances
        this.loadInstances();
      } else {
        // Auto-select best instance (least full active instance)
        this.autoSelectBestInstance();
      }
    });
  }

  private updateSelection() {
    this.instanceElements.forEach((container, index) => {
      const background = container.list[0] as Phaser.GameObjects.Rectangle;
      const isSelected = index === this.selectedInstanceIndex;
      
      background.fillColor = isSelected ? 0x4444aa : 0x333333;
      background.fillAlpha = isSelected ? 0.8 : 0.5;
    });
  }

  private async joinSelectedInstance() {
    if (this.instances.length === 0) return;

    const selectedInstance = this.instances[this.selectedInstanceIndex];
    
    if (selectedInstance.status === 'full') {
      // Show warning but still allow joining (might be outdated info)
      this.showMessage("Instance appears full, but attempting to join...", "#ffaa00");
    }

    await this.connectToInstance(selectedInstance.id);
  }

  private async autoSelectBestInstance() {
    if (this.instances.length === 0) return;

    // Find best instance (active, least full)
    const activeInstances = this.instances.filter(instance => instance.status === 'active');
    
    if (activeInstances.length === 0) {
      this.showMessage("No active instances available", "#ff6666");
      return;
    }

    // Sort by player count (ascending) to get least full instance
    activeInstances.sort((a, b) => a.playerCount - b.playerCount);
    const bestInstance = activeInstances[0];

    await this.connectToInstance(bestInstance.id);
  }

  private async connectToInstance(instanceId: string) {
    this.showMessage(`Connecting to ${instanceId}...`, "#66ff66");

    try {
      // This will be used by the game scene
      (window as any).selectedInstanceId = instanceId;
      
      // Switch to the game scene
      this.scene.start("ImprovedGame");
    } catch (error) {
      console.error("Failed to connect to instance:", error);
      this.showMessage("Failed to connect. Please try again.", "#ff6666");
    }
  }

  private showMessage(text: string, color: string) {
    const { width, height } = this.scale;
    
    // Remove existing message
    const existingMessage = this.children.getByName("message") as Phaser.GameObjects.Text;
    existingMessage?.destroy();

    // Show new message
    const message = this.add.text(width / 2, height * 0.9, text, {
      fontSize: "20px",
      color: color,
      fontFamily: "Arial, sans-serif"
    }).setOrigin(0.5).setName("message");

    // Auto-remove after 3 seconds
    this.time.delayedCall(3000, () => {
      message.destroy();
    });
  }
}