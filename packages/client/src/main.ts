import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: 800,
  height: 600,
  pixelArt: true,
  backgroundColor: "#222222",
  scene: [GameScene]
};

const game = new Phaser.Game(config);