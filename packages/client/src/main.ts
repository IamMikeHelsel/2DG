import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";
import { ImprovedGameScene } from "./scenes/ImprovedGameScene";
import { InstanceSelectionScene } from "./scenes/InstanceSelectionScene";

// Use improved scene with character sprites and better terrain
const useImproved = true;

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
  scene: [InstanceSelectionScene, useImproved ? ImprovedGameScene : GameScene]
};

new Phaser.Game(config);
