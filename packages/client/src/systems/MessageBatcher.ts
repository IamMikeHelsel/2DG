/**
 * Network message batching system to reduce network overhead
 * Batches multiple messages together and sends them at intervals
 */
export class MessageBatcher {
  private pendingMessages: Array<{ type: string; data: any; timestamp: number }> = [];
  private batchInterval: number;
  private maxBatchSize: number;
  private lastSend = 0;
  private room: any;
  private batchTimer?: NodeJS.Timeout;

  constructor(room: any, batchInterval = 16, maxBatchSize = 10) { // ~60fps batching
    this.room = room;
    this.batchInterval = batchInterval;
    this.maxBatchSize = maxBatchSize;
    this.startBatching();
  }

  private startBatching(): void {
    this.batchTimer = setInterval(() => {
      this.flush();
    }, this.batchInterval);
  }

  addMessage(type: string, data: any): void {
    this.pendingMessages.push({
      type,
      data,
      timestamp: performance.now()
    });

    // Force flush if batch is full
    if (this.pendingMessages.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  flush(): void {
    if (this.pendingMessages.length === 0) return;

    const now = performance.now();
    
    // Send batched messages
    if (this.pendingMessages.length === 1) {
      // Single message - send directly for lower latency
      const msg = this.pendingMessages[0];
      this.room.send(msg.type, msg.data);
    } else {
      // Multiple messages - send as batch
      this.room.send('batch', {
        messages: this.pendingMessages.map(msg => ({
          type: msg.type,
          data: msg.data,
          age: now - msg.timestamp
        }))
      });
    }

    this.pendingMessages.length = 0;
    this.lastSend = now;
  }

  // Send immediately without batching (for critical messages)
  sendImmediate(type: string, data: any): void {
    this.room.send(type, data);
  }

  destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    this.flush(); // Send any pending messages
  }

  getStats(): { pendingCount: number; lastSend: number } {
    return {
      pendingCount: this.pendingMessages.length,
      lastSend: this.lastSend
    };
  }
}