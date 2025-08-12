import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";
import { ImprovedGameScene } from "./scenes/ImprovedGameScene";
import { EnhancedGameScene } from "./scenes/EnhancedGameScene";

// Use enhanced scene with NPCs and shop system
const useEnhanced = true;
const useImproved = false;

let sceneToUse;
if (useEnhanced) {
  sceneToUse = [EnhancedGameScene];
} else if (useImproved) {
  sceneToUse = [ImprovedGameScene];
} else {
  sceneToUse = [GameScene];
}

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
  scene: sceneToUse
};

new Phaser.Game(config);
