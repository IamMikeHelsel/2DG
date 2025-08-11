import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";
import { EnhancedGameScene } from "./scenes/EnhancedGameScene";

// Use enhanced scene if available, fallback to original
const useEnhanced = false; // Toggle this to switch between scenes

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
  scene: useEnhanced ? [EnhancedGameScene] : [GameScene]
};

new Phaser.Game(config);
