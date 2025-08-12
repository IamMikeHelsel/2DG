import { LightingSystem } from "./LightingSystem";
import { ParticleEffects } from "./ParticleEffects";
import { PerformanceMonitor } from "./PerformanceMonitor";

export interface QualitySettings {
  lighting: 'low' | 'medium' | 'high';
  particles: 'low' | 'medium' | 'high';
  shadows: boolean;
  postProcessing: boolean;
}

export class QualityManager {
  private scene: Phaser.Scene;
  private lightingSystem?: LightingSystem;
  private particleEffects?: ParticleEffects;
  private performanceMonitor?: PerformanceMonitor;
  private settingsUI?: HTMLDivElement;
  
  private currentSettings: QualitySettings = {
    lighting: 'high',
    particles: 'high',
    shadows: true,
    postProcessing: false
  };
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.loadSettings();
    this.createSettingsUI();
  }
  
  setSystems(lighting: LightingSystem, particles: ParticleEffects, performance: PerformanceMonitor): void {
    this.lightingSystem = lighting;
    this.particleEffects = particles;
    this.performanceMonitor = performance;
    this.applySettings();
  }
  
  private createSettingsUI(): void {
    const container = document.createElement('div');
    Object.assign(container.style, {
      position: 'absolute',
      top: '20px',
      left: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      display: 'none',
      zIndex: '100'
    });
    
    container.innerHTML = `
      <div style="margin-bottom: 10px;">
        <strong>Graphics Settings</strong>
      </div>
      <div style="margin-bottom: 5px;">
        Lighting Quality:
        <select id="lighting-quality">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div style="margin-bottom: 5px;">
        Particle Quality:
        <select id="particle-quality">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div style="margin-bottom: 5px;">
        <label>
          <input type="checkbox" id="shadows-toggle"> Enable Shadows
        </label>
      </div>
      <div style="margin-bottom: 10px;">
        <label>
          <input type="checkbox" id="fps-toggle"> Show FPS
        </label>
      </div>
      <div style="margin-bottom: 5px;">
        <button id="auto-optimize">Auto Optimize</button>
        <button id="reset-settings">Reset</button>
      </div>
    `;
    
    // Add event listeners
    this.setupEventListeners(container);
    
    document.body.appendChild(container);
    this.settingsUI = container;
    
    // Add keyboard shortcut to toggle settings
    this.scene.input.keyboard?.on('keydown-G', () => this.toggleSettingsUI());
  }
  
  private setupEventListeners(container: HTMLDivElement): void {
    const lightingSelect = container.querySelector('#lighting-quality') as HTMLSelectElement;
    const particleSelect = container.querySelector('#particle-quality') as HTMLSelectElement;
    const shadowsCheck = container.querySelector('#shadows-toggle') as HTMLInputElement;
    const fpsCheck = container.querySelector('#fps-toggle') as HTMLInputElement;
    const autoBtn = container.querySelector('#auto-optimize') as HTMLButtonElement;
    const resetBtn = container.querySelector('#reset-settings') as HTMLButtonElement;
    
    // Set initial values
    lightingSelect.value = this.currentSettings.lighting;
    particleSelect.value = this.currentSettings.particles;
    shadowsCheck.checked = this.currentSettings.shadows;
    
    // Event listeners
    lightingSelect.addEventListener('change', () => {
      this.currentSettings.lighting = lightingSelect.value as any;
      this.applySettings();
      this.saveSettings();
    });
    
    particleSelect.addEventListener('change', () => {
      this.currentSettings.particles = particleSelect.value as any;
      this.applySettings();
      this.saveSettings();
    });
    
    shadowsCheck.addEventListener('change', () => {
      this.currentSettings.shadows = shadowsCheck.checked;
      this.applySettings();
      this.saveSettings();
    });
    
    fpsCheck.addEventListener('change', () => {
      this.performanceMonitor?.setFPSDisplayVisible(fpsCheck.checked);
    });
    
    autoBtn.addEventListener('click', () => this.autoOptimize());
    resetBtn.addEventListener('click', () => this.resetToDefaults());
  }
  
  private applySettings(): void {
    if (this.lightingSystem) {
      this.lightingSystem.setQualityLevel(this.currentSettings.lighting);
      
      // Adjust ambient lighting based on shadows setting
      if (this.currentSettings.shadows) {
        this.lightingSystem.setAmbientLight(0x000033, 0.8);
      } else {
        this.lightingSystem.setAmbientLight(0x000033, 0.4);
      }
    }
    
    // Note: Particle quality adjustments would be implemented in ParticleEffects class
    // For now, we'll just store the setting
  }
  
  autoOptimize(): void {
    if (!this.performanceMonitor) return;
    
    const recommendation = this.performanceMonitor.getQualityRecommendation();
    
    this.currentSettings.lighting = recommendation;
    this.currentSettings.particles = recommendation;
    this.currentSettings.shadows = recommendation !== 'low';
    
    this.applySettings();
    this.saveSettings();
    this.updateSettingsUI();
    
    // Show notification
    this.showNotification(`Auto-optimized to ${recommendation} quality`);
  }
  
  private resetToDefaults(): void {
    this.currentSettings = {
      lighting: 'high',
      particles: 'high',
      shadows: true,
      postProcessing: false
    };
    
    this.applySettings();
    this.saveSettings();
    this.updateSettingsUI();
    this.showNotification('Settings reset to defaults');
  }
  
  private updateSettingsUI(): void {
    if (!this.settingsUI) return;
    
    const lightingSelect = this.settingsUI.querySelector('#lighting-quality') as HTMLSelectElement;
    const particleSelect = this.settingsUI.querySelector('#particle-quality') as HTMLSelectElement;
    const shadowsCheck = this.settingsUI.querySelector('#shadows-toggle') as HTMLInputElement;
    
    lightingSelect.value = this.currentSettings.lighting;
    particleSelect.value = this.currentSettings.particles;
    shadowsCheck.checked = this.currentSettings.shadows;
  }
  
  private showNotification(message: string): void {
    // Create temporary notification
    const notification = document.createElement('div');
    Object.assign(notification.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '10px 20px',
      borderRadius: '5px',
      zIndex: '200'
    });
    notification.textContent = message;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
  }
  
  toggleSettingsUI(): void {
    if (this.settingsUI) {
      this.settingsUI.style.display = 
        this.settingsUI.style.display === 'none' ? 'block' : 'none';
    }
  }
  
  private saveSettings(): void {
    localStorage.setItem('toodee_graphics_settings', JSON.stringify(this.currentSettings));
  }
  
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('toodee_graphics_settings');
      if (saved) {
        this.currentSettings = { ...this.currentSettings, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load graphics settings:', e);
    }
  }
  
  getCurrentSettings(): QualitySettings {
    return { ...this.currentSettings };
  }
  
  destroy(): void {
    this.settingsUI?.remove();
  }
}