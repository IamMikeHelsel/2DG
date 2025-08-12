/**
 * Client-side performance monitoring system
 * Tracks FPS, memory usage, network RTT, and rendering stats
 */
export class PerformanceMonitor {
  private fpsHistory: number[] = [];
  private frameTimestamps: number[] = [];
  private memoryHistory: number[] = [];
  private rttHistory: number[] = [];
  private lastMemoryCheck = 0;
  private lastRttPing = 0;
  private isMonitoring = false;
  
  // Performance targets
  private readonly TARGET_FPS = 60;
  private readonly TARGET_RTT = 120; // ms
  private readonly TARGET_MEMORY = 200 * 1024 * 1024; // 200MB
  
  // Stats
  private renderCalls = 0;
  private textureSwaps = 0;
  private drawCalls = 0;

  constructor() {
    this.bindToWindow();
  }

  start(): void {
    this.isMonitoring = true;
    this.trackFPS();
    this.trackMemory();
  }

  stop(): void {
    this.isMonitoring = false;
  }

  private bindToWindow(): void {
    // Expose to window for debugging
    (window as any).perfMonitor = this;
  }

  private trackFPS(): void {
    if (!this.isMonitoring) return;

    const now = performance.now();
    this.frameTimestamps.push(now);

    // Keep only last 120 frames (2 seconds at 60fps)
    if (this.frameTimestamps.length > 120) {
      this.frameTimestamps.shift();
    }

    // Calculate FPS from last second of frames
    const oneSecondAgo = now - 1000;
    const recentFrames = this.frameTimestamps.filter(t => t > oneSecondAgo);
    const fps = recentFrames.length;
    
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 300) { // 5 minutes of data
      this.fpsHistory.shift();
    }

    requestAnimationFrame(() => this.trackFPS());
  }

  private trackMemory(): void {
    if (!this.isMonitoring) return;

    const now = Date.now();
    if (now - this.lastMemoryCheck > 5000) { // Every 5 seconds
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.memoryHistory.push(memory.usedJSHeapSize);
        if (this.memoryHistory.length > 720) { // 1 hour of data
          this.memoryHistory.shift();
        }
      }
      this.lastMemoryCheck = now;
    }

    setTimeout(() => this.trackMemory(), 5000);
  }

  recordRTT(rtt: number): void {
    this.rttHistory.push(rtt);
    if (this.rttHistory.length > 100) {
      this.rttHistory.shift();
    }
  }

  recordRenderCall(): void {
    this.renderCalls++;
  }

  recordTextureSwap(): void {
    this.textureSwaps++;
  }

  recordDrawCall(): void {
    this.drawCalls++;
  }

  getCurrentFPS(): number {
    return this.fpsHistory[this.fpsHistory.length - 1] || 0;
  }

  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    return this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
  }

  getFPSP95(): number {
    if (this.fpsHistory.length === 0) return 0;
    const sorted = [...this.fpsHistory].sort((a, b) => b - a);
    const p95Index = Math.floor(sorted.length * 0.05); // 5th percentile (worst)
    return sorted[p95Index] || 0;
  }

  getCurrentMemoryMB(): number {
    if (this.memoryHistory.length === 0) return 0;
    return this.memoryHistory[this.memoryHistory.length - 1] / (1024 * 1024);
  }

  getRTTP95(): number {
    if (this.rttHistory.length === 0) return 0;
    const sorted = [...this.rttHistory].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    return sorted[p95Index] || 0;
  }

  getPerformanceReport(): {
    fps: { current: number; average: number; p95: number; target: number };
    memory: { currentMB: number; targetMB: number };
    network: { rttP95: number; targetRTT: number };
    rendering: { renderCalls: number; textureSwaps: number; drawCalls: number };
    status: 'good' | 'warning' | 'critical';
  } {
    const fps = {
      current: this.getCurrentFPS(),
      average: this.getAverageFPS(),
      p95: this.getFPSP95(),
      target: this.TARGET_FPS
    };

    const memory = {
      currentMB: this.getCurrentMemoryMB(),
      targetMB: this.TARGET_MEMORY / (1024 * 1024)
    };

    const network = {
      rttP95: this.getRTTP95(),
      targetRTT: this.TARGET_RTT
    };

    const rendering = {
      renderCalls: this.renderCalls,
      textureSwaps: this.textureSwaps,
      drawCalls: this.drawCalls
    };

    // Determine status
    let status: 'good' | 'warning' | 'critical' = 'good';
    
    if (fps.p95 < 30 || memory.currentMB > memory.targetMB * 1.2 || network.rttP95 > this.TARGET_RTT * 1.5) {
      status = 'critical';
    } else if (fps.average < 45 || memory.currentMB > memory.targetMB || network.rttP95 > this.TARGET_RTT) {
      status = 'warning';
    }

    return { fps, memory, network, rendering, status };
  }

  logPerformanceReport(): void {
    const report = this.getPerformanceReport();
    console.log('[Performance Report]', {
      FPS: `${report.fps.current} current, ${report.fps.average.toFixed(1)} avg, ${report.fps.p95.toFixed(1)} p95 (target: ${report.fps.target})`,
      Memory: `${report.memory.currentMB.toFixed(1)}MB current (target: ${report.memory.targetMB}MB)`,
      Network: `${report.network.rttP95.toFixed(1)}ms RTT p95 (target: ${report.network.targetRTT}ms)`,
      Rendering: `${report.rendering.renderCalls} render calls, ${report.rendering.textureSwaps} texture swaps, ${report.rendering.drawCalls} draw calls`,
      Status: report.status
    });

    // Reset render stats
    this.renderCalls = 0;
    this.textureSwaps = 0;
    this.drawCalls = 0;
  }

  // Method to ping server and measure RTT
  async measureRTT(room: any): Promise<number> {
    const start = performance.now();
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(-1), 5000); // 5s timeout
      
      room.send('ping', { timestamp: start });
      room.onMessage('pong', (data: { timestamp: number }) => {
        clearTimeout(timeout);
        const rtt = performance.now() - data.timestamp;
        this.recordRTT(rtt);
        resolve(rtt);
      });
    });
  }
}

// Global instance
export const perfMonitor = new PerformanceMonitor();