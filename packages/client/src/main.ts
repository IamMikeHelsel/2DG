import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";
import { ImprovedGameScene } from "./scenes/ImprovedGameScene";
import { EnhancedGameScene } from "./scenes/EnhancedGameScene";

// Use enhanced scene with full features including inventory
const useEnhanced = true;
const useImproved = false;

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
  scene: useEnhanced ? [EnhancedGameScene] : (useImproved ? [ImprovedGameScene] : [GameScene])
};

new Phaser.Game(config);
