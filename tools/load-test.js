#!/usr/bin/env node

/**
 * Simple load testing tool for Toodee server
 * Tests multiple concurrent connections to validate 30-40 CCU target
 */

import { Client } from 'colyseus.js';
import { performance } from 'perf_hooks';

const SERVER_URL = process.env.SERVER_URL || 'ws://localhost:2567';
const TARGET_PLAYERS = parseInt(process.env.PLAYERS || '30');
const TEST_DURATION = parseInt(process.env.DURATION || '60'); // seconds

console.log(`🚀 Starting load test: ${TARGET_PLAYERS} players for ${TEST_DURATION}s`);
console.log(`📡 Server: ${SERVER_URL}`);

class BotPlayer {
  constructor(id) {
    this.id = id;
    this.client = new Client(SERVER_URL);
    this.room = null;
    this.connected = false;
    this.seq = 0;
    this.lastMove = 0;
    this.latencies = [];
  }

  async connect() {
    try {
      const name = `Bot${this.id}`;
      this.room = await this.client.joinOrCreate('toodee', { name });
      this.connected = true;
      
      // Track connection latency
      this.room.onMessage('*', (type, message) => {
        if (type === 'pong' && message.timestamp) {
          const latency = Date.now() - message.timestamp;
          this.latencies.push(latency);
        }
      });
      
      console.log(`✅ Bot ${this.id} connected`);
      this.startBehavior();
    } catch (error) {
      console.error(`❌ Bot ${this.id} failed to connect:`, error.message);
    }
  }

  startBehavior() {
    // Send random movement every 100ms
    this.moveInterval = setInterval(() => {
      if (!this.connected || !this.room) return;
      
      this.seq++;
      const up = Math.random() < 0.1;
      const down = Math.random() < 0.1;
      const left = Math.random() < 0.1;
      const right = Math.random() < 0.1;
      
      this.room.send('input', { seq: this.seq, up, down, left, right });
    }, 50 + Math.random() * 100); // 50-150ms intervals

    // Occasionally send chat messages
    this.chatInterval = setInterval(() => {
      if (!this.connected || !this.room) return;
      if (Math.random() < 0.05) { // 5% chance every interval
        this.room.send('chat', `Bot ${this.id} says hi! ${Date.now()}`);
      }
    }, 5000 + Math.random() * 10000);

    // Occasionally attack
    this.attackInterval = setInterval(() => {
      if (!this.connected || !this.room) return;
      if (Math.random() < 0.1) { // 10% chance
        this.room.send('attack');
      }
    }, 1000 + Math.random() * 2000);

    // Send periodic pings to measure latency
    this.pingInterval = setInterval(() => {
      if (!this.connected || !this.room) return;
      this.room.send('ping', { timestamp: Date.now() });
    }, 2000);
  }

  disconnect() {
    if (this.moveInterval) clearInterval(this.moveInterval);
    if (this.chatInterval) clearInterval(this.chatInterval);
    if (this.attackInterval) clearInterval(this.attackInterval);
    if (this.pingInterval) clearInterval(this.pingInterval);
    
    if (this.room) {
      this.room.leave();
    }
    this.connected = false;
    console.log(`🔌 Bot ${this.id} disconnected`);
  }

  getStats() {
    return {
      id: this.id,
      connected: this.connected,
      latencyCount: this.latencies.length,
      avgLatency: this.latencies.length > 0 ? 
        this.latencies.reduce((sum, lat) => sum + lat, 0) / this.latencies.length : 0,
      maxLatency: this.latencies.length > 0 ? Math.max(...this.latencies) : 0
    };
  }
}

async function runLoadTest() {
  const bots = [];
  const startTime = performance.now();

  // Create and connect bots
  console.log(`\n🤖 Creating ${TARGET_PLAYERS} bots...`);
  for (let i = 0; i < TARGET_PLAYERS; i++) {
    const bot = new BotPlayer(i + 1);
    bots.push(bot);
    
    // Stagger connections to avoid overwhelming server
    setTimeout(() => bot.connect(), i * 100);
  }

  // Wait for connections to establish
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log(`\n📊 Running test for ${TEST_DURATION} seconds...`);
  
  // Periodic stats reporting
  const statsInterval = setInterval(() => {
    const connected = bots.filter(bot => bot.connected).length;
    const disconnected = bots.length - connected;
    
    console.log(`📈 Status: ${connected}/${TARGET_PLAYERS} connected, ${disconnected} disconnected`);
    
    // Sample latency stats from connected bots
    const latencyStats = bots
      .filter(bot => bot.connected && bot.latencies.length > 0)
      .map(bot => bot.getStats());
    
    if (latencyStats.length > 0) {
      const avgLatencies = latencyStats.map(s => s.avgLatency);
      const overallAvg = avgLatencies.reduce((sum, lat) => sum + lat, 0) / avgLatencies.length;
      const maxLatency = Math.max(...latencyStats.map(s => s.maxLatency));
      
      console.log(`🏓 Latency: avg ${overallAvg.toFixed(1)}ms, max ${maxLatency.toFixed(1)}ms`);
    }
  }, 10000);

  // Run test for specified duration
  await new Promise(resolve => setTimeout(resolve, TEST_DURATION * 1000));

  // Cleanup
  clearInterval(statsInterval);
  
  console.log(`\n🏁 Test completed. Disconnecting bots...`);
  bots.forEach(bot => bot.disconnect());

  // Final stats
  const endTime = performance.now();
  const testDuration = (endTime - startTime) / 1000;
  const finalConnected = bots.filter(bot => bot.connected).length;
  
  console.log(`\n📋 Final Results:`);
  console.log(`⏱️  Test duration: ${testDuration.toFixed(1)}s`);
  console.log(`👥 Peak concurrent: ${TARGET_PLAYERS} planned, ${finalConnected} maintained`);
  
  // Latency summary
  const allLatencies = bots.flatMap(bot => bot.latencies);
  if (allLatencies.length > 0) {
    allLatencies.sort((a, b) => a - b);
    const p50 = allLatencies[Math.floor(allLatencies.length * 0.5)];
    const p95 = allLatencies[Math.floor(allLatencies.length * 0.95)];
    const p99 = allLatencies[Math.floor(allLatencies.length * 0.99)];
    
    console.log(`📊 Latency summary (${allLatencies.length} samples):`);
    console.log(`   p50: ${p50}ms, p95: ${p95}ms, p99: ${p99}ms`);
    
    if (p95 > 120) {
      console.log(`⚠️  p95 latency ${p95}ms exceeds 120ms target`);
    } else {
      console.log(`✅ p95 latency ${p95}ms meets <120ms target`);
    }
  }

  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Interrupted, shutting down...');
  process.exit(0);
});

runLoadTest().catch(console.error);