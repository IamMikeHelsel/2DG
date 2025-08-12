export class SimpleSpriteGen {
  static createColoredRect(
    scene: Phaser.Scene,
    x: number,
    y: number,
    size: number,
    color: number,
    name?: string
  ) {
    const container = scene.add.container(x, y);

    // Shadow
    const shadow = scene.add.ellipse(0, 4, size * 0.8, size * 0.4, 0x000000, 0.2);

    // Body
    const body = scene.add.rectangle(0, 0, size, size, color);
    body.setStrokeStyle(2, Phaser.Display.Color.ValueToColor(color).darken(50).color);

    // Name text if provided
    let nameText: Phaser.GameObjects.Text | null = null;
    if (name) {
      nameText = scene.add.text(0, -size * 0.8, name, {
        fontSize: "11px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      });
      nameText.setOrigin(0.5, 0.5);
      container.add(nameText);
    }

    container.add([shadow, body]);

    return { container, body, shadow, nameText };
  }

  static createNPC(
    scene: Phaser.Scene,
    x: number,
    y: number,
    size: number,
    color: number,
    name: string
  ) {
    const container = scene.add.container(x, y);

    // Shadow
    const shadow = scene.add.ellipse(0, 4, size * 0.8, size * 0.4, 0x000000, 0.3);

    // Body (slightly larger for NPCs)
    const body = scene.add.rectangle(0, 0, size * 1.1, size * 1.1, color);
    body.setStrokeStyle(2, 0x000000);

    // Name
    const nameText = scene.add.text(0, -size * 0.8, name, {
      fontSize: "12px",
      color: "#00ff00",
      stroke: "#000000",
      strokeThickness: 2,
      fontStyle: "bold",
    });
    nameText.setOrigin(0.5, 0.5);

    // Interaction hint
    const interactHint = scene.add.text(0, -size * 1.2, "[E]", {
      fontSize: "10px",
      color: "#ffff00",
      stroke: "#000000",
      strokeThickness: 2,
    });
    interactHint.setOrigin(0.5, 0.5);
    interactHint.setVisible(false);

    container.add([shadow, body, nameText, interactHint]);
    container.setDepth(10);

    return { container, body, interactHint };
  }
}
