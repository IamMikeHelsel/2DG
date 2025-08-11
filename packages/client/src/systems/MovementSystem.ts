import { Scene } from 'phaser';

export interface MovementInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export class MovementSystem {
  private scene: Scene;
  private lastInput: MovementInput = { up: false, down: false, left: false, right: false };
  private inputBuffer: MovementInput[] = [];
  private diagonalFactor = 0.707; // Normalize diagonal movement
  
  constructor(scene: Scene) {
    this.scene = scene;
  }

  captureInput(cursors: Phaser.Types.Input.Keyboard.CursorKeys, wasd: any): MovementInput {
    const input: MovementInput = {
      up: cursors.up?.isDown || wasd.W?.isDown || false,
      down: cursors.down?.isDown || wasd.S?.isDown || false,
      left: cursors.left?.isDown || wasd.A?.isDown || false,
      right: cursors.right?.isDown || wasd.D?.isDown || false
    };

    // Cancel opposing directions
    if (input.up && input.down) {
      input.up = false;
      input.down = false;
    }
    if (input.left && input.right) {
      input.left = false;
      input.right = false;
    }

    return input;
  }

  hasInputChanged(input: MovementInput): boolean {
    return (
      input.up !== this.lastInput.up ||
      input.down !== this.lastInput.down ||
      input.left !== this.lastInput.left ||
      input.right !== this.lastInput.right
    );
  }

  updateLastInput(input: MovementInput) {
    this.lastInput = { ...input };
  }

  getDirection(input: MovementInput): number | null {
    // Convert input to direction number (0=up, 1=right, 2=down, 3=left)
    if (input.up && !input.left && !input.right) return 0;
    if (input.right && !input.up && !input.down) return 1;
    if (input.down && !input.left && !input.right) return 2;
    if (input.left && !input.up && !input.down) return 3;
    
    // Diagonal directions - prioritize most recent
    if (input.up && input.right) return this.lastInput.right ? 0 : 1;
    if (input.right && input.down) return this.lastInput.down ? 1 : 2;
    if (input.down && input.left) return this.lastInput.left ? 2 : 3;
    if (input.left && input.up) return this.lastInput.up ? 3 : 0;
    
    return null;
  }

  isMoving(input: MovementInput): boolean {
    return input.up || input.down || input.left || input.right;
  }

  smoothPosition(
    current: { x: number; y: number },
    target: { x: number; y: number },
    deltaTime: number,
    lerpFactor: number = 0.15
  ): { x: number; y: number } {
    const t = Math.min(1, lerpFactor * deltaTime * 60); // Normalize to 60fps
    return {
      x: current.x + (target.x - current.x) * t,
      y: current.y + (target.y - current.y) * t
    };
  }

  predictPosition(
    current: { x: number; y: number },
    input: MovementInput,
    speed: number,
    deltaTime: number
  ): { x: number; y: number } {
    let dx = 0;
    let dy = 0;

    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      dx *= this.diagonalFactor;
      dy *= this.diagonalFactor;
    }

    return {
      x: current.x + dx * speed * deltaTime,
      y: current.y + dy * speed * deltaTime
    };
  }

  addInputToBuffer(input: MovementInput) {
    this.inputBuffer.push({ ...input });
    // Keep buffer size reasonable
    if (this.inputBuffer.length > 30) {
      this.inputBuffer.shift();
    }
  }

  clearInputBuffer() {
    this.inputBuffer = [];
  }

  getBufferedInput(steps: number = 1): MovementInput | null {
    if (this.inputBuffer.length < steps) return null;
    return this.inputBuffer[this.inputBuffer.length - steps];
  }
}