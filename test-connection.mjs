import { Client } from 'colyseus.js';

console.log('Testing server connection...');

const client = new Client('ws://localhost:2567');

try {
  const room = await client.joinOrCreate('toodee', { name: 'TestBot' });
  console.log('✅ Connected!');
  console.log('Room ID:', room.id);
  console.log('Session ID:', room.sessionId);
  
  // Listen for state
  let myPlayer = null;
  
  room.state.players.onAdd = (player, key) => {
    console.log(`Player added: ${key}`);
    console.log(`  Position: (${player.x}, ${player.y})`);
    console.log(`  HP: ${player.hp}/${player.maxHp}`);
    console.log(`  Level: ${player.level}`);
    
    if (key === room.sessionId) {
      console.log('  ^ This is me!');
      myPlayer = player;
      
      // Send some movement after 1 second
      setTimeout(() => {
        console.log('\nSending movement input...');
        room.send('input', {
          seq: 1,
          up: true,
          down: false,
          left: false,
          right: false
        });
      }, 1000);
      
      // Track position changes
      player.onChange = () => {
        console.log(`My position updated: (${player.x}, ${player.y})`);
      };
    }
  };
  
  // Wait 3 seconds then disconnect
  setTimeout(() => {
    console.log('\nDisconnecting...');
    room.leave();
    process.exit(0);
  }, 3000);
  
} catch (error) {
  console.error('❌ Connection failed:', error.message);
  process.exit(1);
}