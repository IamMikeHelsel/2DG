#!/usr/bin/env node

// CLI tool to exercise character movement patterns against a running server.
// Usage examples:
//   node tools/move-test.js --url ws://localhost:2567 --pattern line --dir right --duration 5
//   node tools/move-test.js --pattern square --side 20 --loops 2

import { Client } from 'colyseus.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    url: process.env.SERVER_URL || 'ws://localhost:2567',
    pattern: 'line', // line | square | circle
    dir: 'right',    // for line
    duration: 5,     // seconds for line/circle
    side: 16,        // tiles per side for square
    loops: 1,        // square loops
    tick: 50,        // ms input cadence
    name: `CliTester${Math.floor(Math.random() * 1000)}`,
  };
  for (let i = 0; i < args.length; i += 2) {
    const k = args[i].replace(/^--/, '');
    const v = args[i + 1];
    if (v === undefined) continue;
    if (k in opts) {
      if (['duration', 'side', 'loops', 'tick'].includes(k)) opts[k] = Number(v);
      else opts[k] = v;
    }
    if (k === 'url') opts.url = v;
  }
  return opts;
}

function dirToInput(dir) {
  return {
    up: dir === 'up',
    down: dir === 'down',
    left: dir === 'left',
    right: dir === 'right',
  };
}

async function run() {
  const opts = parseArgs();
  console.log(`Connecting to ${opts.url} as ${opts.name}...`);
  const client = new Client(opts.url);
  const room = await client.joinOrCreate('toodee', { name: opts.name });
  const myId = room.sessionId;
  console.log(`Connected. sessionId=${myId}`);

  let seq = 0;
  let current = { x: 0, y: 0 };
  let start = null;
  let samples = 0;

  // Track my position from server state
  room.state.players.onAdd((p, key) => {
    if (key === myId) {
      current = { x: p.x, y: p.y };
      if (!start) start = { ...current };
      p.onChange = () => {
        current = { x: p.x, y: p.y };
        samples++;
      };
    }
  });

  // Movement patterns emit input booleans each tick
  let patternState = { step: 0, edgeRemaining: opts.side, heading: opts.dir };

  const interval = setInterval(() => {
    seq++;
    let input = { up: false, down: false, left: false, right: false };

    if (opts.pattern === 'line') {
      input = dirToInput(opts.dir);
    } else if (opts.pattern === 'square') {
      const order = ['right', 'down', 'left', 'up'];
      const heading = order[patternState.step % 4];
      input = dirToInput(heading);
      patternState.edgeRemaining -= 1;
      if (patternState.edgeRemaining <= 0) {
        patternState.step += 1;
        patternState.edgeRemaining = opts.side;
      }
      if (patternState.step >= 4 * opts.loops) {
        // stop sending inputs after loops complete
        input = { up: false, down: false, left: false, right: false };
        clearInterval(interval);
        setTimeout(() => finish(room, start, current, samples), 500);
      }
    } else if (opts.pattern === 'circle') {
      // crude circle: switch headings every ~quarter-second
      const t = Date.now() % 1000;
      if (t < 250) input = dirToInput('right');
      else if (t < 500) input = dirToInput('down');
      else if (t < 750) input = dirToInput('left');
      else input = dirToInput('up');
    }

    room.send('input', { seq, ...input, timestamp: Date.now() });
  }, opts.tick);

  if (opts.pattern === 'line' || opts.pattern === 'circle') {
    setTimeout(() => {
      clearInterval(interval);
      setTimeout(() => finish(room, start, current, samples), 500);
    }, opts.duration * 1000);
  }
}

function finish(room, start, current, samples) {
  const dx = (current.x - start.x).toFixed(2);
  const dy = (current.y - start.y).toFixed(2);
  console.log(`\nMovement summary:`);
  console.log(`  Start: (${start.x.toFixed(2)}, ${start.y.toFixed(2)})`);
  console.log(`  End:   (${current.x.toFixed(2)}, ${current.y.toFixed(2)})`);
  console.log(`  Delta: (dx=${dx}, dy=${dy}), samples=${samples}`);
  try { room.leave(); } catch {}
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err?.message || err);
  process.exit(1);
});

