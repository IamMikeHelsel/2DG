import { VolumeSettings } from "@toodee/shared";
import { AudioManager } from "../systems/audio/AudioManager";

export class VolumeControlUI {
  private container: HTMLDivElement;
  private isVisible = false;
  private audioManager: AudioManager;

  constructor(audioManager: AudioManager) {
    this.audioManager = audioManager;
    this.container = this.createUI();
    document.body.appendChild(this.container);
  }

  private createUI(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'volume-control-ui';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 250px;
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid #555;
      border-radius: 8px;
      padding: 15px;
      color: white;
      font-family: monospace;
      font-size: 12px;
      z-index: 1000;
      display: none;
      backdrop-filter: blur(5px);
    `;

    const title = document.createElement('h3');
    title.textContent = 'Audio Settings';
    title.style.cssText = `
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #fff;
      text-align: center;
    `;
    container.appendChild(title);

    // Create volume sliders for each type
    const volumeTypes: Array<{ key: keyof VolumeSettings; label: string }> = [
      { key: 'master', label: 'Master' },
      { key: 'music', label: 'Music' },
      { key: 'sfx', label: 'SFX' },
      { key: 'ambient', label: 'Ambient' },
      { key: 'ui', label: 'UI' }
    ];

    volumeTypes.forEach(({ key, label }) => {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        align-items: center;
        margin-bottom: 10px;
        justify-content: space-between;
      `;

      const labelEl = document.createElement('label');
      labelEl.textContent = label;
      labelEl.style.cssText = `
        width: 60px;
        color: #ccc;
      `;

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '100';
      slider.value = String(Math.round(this.audioManager.getVolume(key) * 100));
      slider.style.cssText = `
        flex: 1;
        margin: 0 10px;
        accent-color: #4CAF50;
      `;

      const valueEl = document.createElement('span');
      valueEl.textContent = slider.value + '%';
      valueEl.style.cssText = `
        width: 30px;
        text-align: right;
        color: #aaa;
        font-size: 11px;
      `;

      slider.addEventListener('input', (e) => {
        const value = Number((e.target as HTMLInputElement).value) / 100;
        this.audioManager.setVolume(key, value);
        valueEl.textContent = Math.round(value * 100) + '%';
        
        // Play test sound for UI feedback
        if (key === 'ui') {
          this.audioManager.playUISound('click');
        }
      });

      row.appendChild(labelEl);
      row.appendChild(slider);
      row.appendChild(valueEl);
      container.appendChild(row);
    });

    // Test buttons
    const testSection = document.createElement('div');
    testSection.style.cssText = `
      margin-top: 15px;
      padding-top: 10px;
      border-top: 1px solid #444;
    `;

    const testLabel = document.createElement('div');
    testLabel.textContent = 'Test Sounds:';
    testLabel.style.cssText = `
      margin-bottom: 8px;
      color: #ccc;
      font-size: 11px;
    `;
    testSection.appendChild(testLabel);

    const buttonRow = document.createElement('div');
    buttonRow.style.cssText = `
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
    `;

    const testButtons = [
      { label: 'SFX', action: () => this.audioManager.playSFX('sword_swing') },
      { label: 'UI', action: () => this.audioManager.playUISound('notification') },
      { label: 'Music', action: () => this.audioManager.playMusic('town_theme', false) }
    ];

    testButtons.forEach(({ label, action }) => {
      const button = document.createElement('button');
      button.textContent = label;
      button.style.cssText = `
        padding: 4px 8px;
        background: #555;
        border: 1px solid #777;
        color: white;
        border-radius: 3px;
        cursor: pointer;
        font-size: 10px;
      `;
      button.addEventListener('click', action);
      button.addEventListener('mouseenter', () => {
        button.style.background = '#666';
        this.audioManager.playUISound('hover');
      });
      button.addEventListener('mouseleave', () => {
        button.style.background = '#555';
      });
      buttonRow.appendChild(button);
    });

    testSection.appendChild(buttonRow);
    container.appendChild(testSection);

    // Close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 5px;
      right: 8px;
      background: transparent;
      border: none;
      color: #aaa;
      font-size: 16px;
      cursor: pointer;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    closeButton.addEventListener('click', () => this.hide());
    container.appendChild(closeButton);

    return container;
  }

  show() {
    this.isVisible = true;
    this.container.style.display = 'block';
    this.audioManager.playUISound('click');
  }

  hide() {
    this.isVisible = false;
    this.container.style.display = 'none';
    this.audioManager.playUISound('click');
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  destroy() {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}