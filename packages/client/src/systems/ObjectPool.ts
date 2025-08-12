/**
 * Generic object pool for reducing garbage collection pressure
 * by reusing objects instead of creating new ones
 */
export class ObjectPool<T> {
  private available: T[] = [];
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  private maxSize: number;

  constructor(createFn: () => T, resetFn?: (obj: T) => void, maxSize: number = 100) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  get(): T {
    if (this.available.length > 0) {
      return this.available.pop()!;
    }
    return this.createFn();
  }

  release(obj: T): void {
    if (this.available.length < this.maxSize) {
      if (this.resetFn) {
        this.resetFn(obj);
      }
      this.available.push(obj);
    }
  }

  preAllocate(count: number): void {
    for (let i = 0; i < count; i++) {
      this.available.push(this.createFn());
    }
  }

  getPoolSize(): number {
    return this.available.length;
  }
}

/**
 * Pool for Phaser game objects like sprites, containers, etc.
 */
export class PhaserObjectPool<T extends Phaser.GameObjects.GameObject> {
  private available: T[] = [];
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  private maxSize: number;

  constructor(createFn: () => T, resetFn?: (obj: T) => void, maxSize: number = 50) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  get(): T {
    if (this.available.length > 0) {
      const obj = this.available.pop()!;
      obj.setActive(true);
      obj.setVisible(true);
      return obj;
    }
    return this.createFn();
  }

  release(obj: T): void {
    if (this.available.length < this.maxSize) {
      obj.setActive(false);
      obj.setVisible(false);
      if (this.resetFn) {
        this.resetFn(obj);
      }
      this.available.push(obj);
    } else {
      obj.destroy();
    }
  }

  preAllocate(count: number): void {
    for (let i = 0; i < count; i++) {
      const obj = this.createFn();
      obj.setActive(false);
      obj.setVisible(false);
      this.available.push(obj);
    }
  }

  getPoolSize(): number {
    return this.available.length;
  }

  destroy(): void {
    this.available.forEach(obj => obj.destroy());
    this.available.length = 0;
  }
}