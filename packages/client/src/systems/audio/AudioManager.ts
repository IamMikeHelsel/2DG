import { AudioType, AudioConfig, VolumeSettings, DEFAULT_VOLUME_SETTINGS } from "@toodee/shared";

export interface SpatialAudioOptions {
  x: number;
  y: number;
  maxDistance?: number;
  rolloffFactor?: number;
}

export class AudioManager {
  private scene: Phaser.Scene;
  private volumeSettings: VolumeSettings;
  private musicTracks = new Map<string, Phaser.Sound.BaseSound>();
  private currentMusic?: string;
  private ambientSounds = new Map<string, Phaser.Sound.BaseSound>();
  private audioContext?: AudioContext;
  private spatialNodes = new Map<string, { panner: PannerNode; gain: GainNode }>();
  private masterGain?: GainNode;
  private fadeTimers = new Map<string, Phaser.Time.TimerEvent>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.volumeSettings = this.loadVolumeSettings();
    this.initializeWebAudio();
  }

  private initializeWebAudio() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.volumeSettings.master;
    } catch (error) {
      console.warn("Web Audio API not supported, falling back to Phaser audio:", error);
    }
  }

  private loadVolumeSettings(): VolumeSettings {
    try {
      const saved = localStorage.getItem("toodee_volume_settings");
      return saved ? { ...DEFAULT_VOLUME_SETTINGS, ...JSON.parse(saved) } : DEFAULT_VOLUME_SETTINGS;
    } catch {
      return DEFAULT_VOLUME_SETTINGS;
    }
  }

  private saveVolumeSettings() {
    localStorage.setItem("toodee_volume_settings", JSON.stringify(this.volumeSettings));
  }

  setVolume(type: keyof VolumeSettings, volume: number) {
    this.volumeSettings[type] = Math.max(0, Math.min(1, volume));
    this.saveVolumeSettings();
    
    if (type === "master" && this.masterGain) {
      this.masterGain.gain.value = this.volumeSettings.master;
    }

    // Update existing sounds
    this.updateAllVolumes();
  }

  getVolume(type: keyof VolumeSettings): number {
    return this.volumeSettings[type];
  }

  private updateAllVolumes() {
    // Update music
    this.musicTracks.forEach((sound, key) => {
      if (sound.isPlaying) {
        const config = this.getAudioConfig(key);
        if (config) {
          this.updateSoundVolume(sound, config);
        }
      }
    });

    // Update ambient sounds
    this.ambientSounds.forEach((sound, key) => {
      if (sound.isPlaying) {
        const config = this.getAudioConfig(key);
        if (config) {
          this.updateSoundVolume(sound, config);
        }
      }
    });
  }

  private getAudioConfig(key: string): AudioConfig | undefined {
    // Import AUDIO_ASSETS when needed
    const { AUDIO_ASSETS } = require("@toodee/shared");
    return AUDIO_ASSETS.find((asset: AudioConfig) => asset.key === key);
  }

  private updateSoundVolume(sound: Phaser.Sound.BaseSound, config: AudioConfig) {
    const baseVolume = config.volume || 1;
    const typeVolume = this.volumeSettings[config.type as keyof VolumeSettings] || 1;
    const masterVolume = this.volumeSettings.master;
    
    sound.setVolume(baseVolume * typeVolume * masterVolume);
  }

  playMusic(key: string, fadeIn = true) {
    if (this.currentMusic === key) return;

    // Stop current music with fade out
    if (this.currentMusic) {
      this.stopMusic(true);
    }

    const sound = this.scene.sound.add(key, { loop: true });
    const config = this.getAudioConfig(key);
    
    if (config) {
      if (fadeIn) {
        sound.setVolume(0);
        this.updateSoundVolume(sound, config);
        const targetVolume = sound.volume;
        sound.setVolume(0);
        sound.play();
        
        // Fade in
        this.scene.tweens.add({
          targets: sound,
          volume: targetVolume,
          duration: 2000,
          ease: "Power2"
        });
      } else {
        this.updateSoundVolume(sound, config);
        sound.play();
      }
    }

    this.musicTracks.set(key, sound);
    this.currentMusic = key;
  }

  stopMusic(fadeOut = true) {
    if (!this.currentMusic) return;

    const sound = this.musicTracks.get(this.currentMusic);
    if (sound && sound.isPlaying) {
      if (fadeOut) {
        this.scene.tweens.add({
          targets: sound,
          volume: 0,
          duration: 1500,
          ease: "Power2",
          onComplete: () => {
            sound.stop();
            this.musicTracks.delete(this.currentMusic!);
          }
        });
      } else {
        sound.stop();
        this.musicTracks.delete(this.currentMusic);
      }
    }

    this.currentMusic = undefined;
  }

  playSFX(key: string, spatial?: SpatialAudioOptions) {
    const sound = this.scene.sound.add(key);
    const config = this.getAudioConfig(key);
    
    if (config) {
      this.updateSoundVolume(sound, config);
      
      if (spatial && this.audioContext && config.spatial) {
        this.applySpatialAudio(sound, spatial);
      }
      
      sound.play();
    }

    return sound;
  }

  playAmbient(key: string, spatial?: SpatialAudioOptions) {
    if (this.ambientSounds.has(key)) {
      return; // Already playing
    }

    const sound = this.scene.sound.add(key, { loop: true });
    const config = this.getAudioConfig(key);
    
    if (config) {
      this.updateSoundVolume(sound, config);
      
      if (spatial && this.audioContext && config.spatial) {
        this.applySpatialAudio(sound, spatial);
      }
      
      sound.play();
      this.ambientSounds.set(key, sound);
    }

    return sound;
  }

  stopAmbient(key: string, fadeOut = true) {
    const sound = this.ambientSounds.get(key);
    if (sound && sound.isPlaying) {
      if (fadeOut) {
        this.scene.tweens.add({
          targets: sound,
          volume: 0,
          duration: 1000,
          ease: "Power2",
          onComplete: () => {
            sound.stop();
            this.ambientSounds.delete(key);
          }
        });
      } else {
        sound.stop();
        this.ambientSounds.delete(key);
      }
    }
  }

  private applySpatialAudio(sound: Phaser.Sound.BaseSound, options: SpatialAudioOptions) {
    if (!this.audioContext || !this.masterGain) return;

    try {
      // Create spatial audio nodes
      const panner = this.audioContext.createPanner();
      const gain = this.audioContext.createGain();
      
      // Configure panner
      panner.panningModel = "HRTF";
      panner.distanceModel = "inverse";
      panner.refDistance = 1;
      panner.maxDistance = options.maxDistance || 1000;
      panner.rolloffFactor = options.rolloffFactor || 1;
      
      // Set position
      panner.positionX.value = options.x;
      panner.positionY.value = 0; // 2D game, keep Y at 0
      panner.positionZ.value = options.y;
      
      // Connect audio graph
      gain.connect(panner);
      panner.connect(this.masterGain);
      
      // Store for later updates
      this.spatialNodes.set(sound.key, { panner, gain });
      
    } catch (error) {
      console.warn("Failed to apply spatial audio:", error);
    }
  }

  updateSpatialListener(x: number, y: number, direction = 0) {
    if (!this.audioContext?.listener) return;

    try {
      this.audioContext.listener.positionX.value = x;
      this.audioContext.listener.positionY.value = 0;
      this.audioContext.listener.positionZ.value = y;
      
      // Set orientation based on player direction
      const forwardX = Math.cos(direction);
      const forwardZ = Math.sin(direction);
      
      this.audioContext.listener.forwardX.value = forwardX;
      this.audioContext.listener.forwardY.value = 0;
      this.audioContext.listener.forwardZ.value = forwardZ;
      
      this.audioContext.listener.upX.value = 0;
      this.audioContext.listener.upY.value = 1;
      this.audioContext.listener.upZ.value = 0;
    } catch (error) {
      console.warn("Failed to update spatial listener:", error);
    }
  }

  updateSpatialSound(key: string, x: number, y: number) {
    const nodes = this.spatialNodes.get(key);
    if (nodes) {
      nodes.panner.positionX.value = x;
      nodes.panner.positionZ.value = y;
    }
  }

  playFootstep(terrainType: string) {
    const footstepKey = `footstep_${terrainType}`;
    this.playSFX(footstepKey);
  }

  playUISound(action: "click" | "hover" | "notification") {
    this.playSFX(action);
  }

  destroy() {
    // Stop all sounds
    this.musicTracks.forEach(sound => sound.stop());
    this.ambientSounds.forEach(sound => sound.stop());
    
    // Clear maps
    this.musicTracks.clear();
    this.ambientSounds.clear();
    this.spatialNodes.clear();
    
    // Clear timers
    this.fadeTimers.forEach(timer => timer.destroy());
    this.fadeTimers.clear();
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
    }
  }
}