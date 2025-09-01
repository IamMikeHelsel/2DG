import Phaser from "phaser";
import { ImprovedGameScene } from "./scenes/ImprovedGameScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: "app",
  width: window.innerWidth,
  height: window.innerHeight,
  pixelArt: true,
  backgroundColor: "#0f0f13",
  physics: { default: "arcade" },
  scale: {
    mode: Phaser.Scale.RESIZE
  },
  scene: [ImprovedGameScene]
};

new Phaser.Game(config);
