const { Client } = require("colyseus.js");

async function testMovement() {
  const client = new Client("ws://localhost:2567");
  
  try {
    console.log("Connecting to server...");
    const room = await client.joinOrCreate("toodee", { name: "TestBot" });
    console.log("Connected! Room ID:", room.id);
    console.log("Session ID:", room.sessionId);
    
    // Listen for state changes
    room.state.players.onAdd = (player, key) => {
      console.log("Player added:", key, "Position:", player.x, player.y);
      
      if (key === room.sessionId) {
        console.log("That's me! Starting position:", player.x, player.y);
      }
    };
    
    room.state.players.onChange = (player, key) => {
      if (key === room.sessionId) {
        console.log("My position updated:", player.x, player.y);
      }
    };
    
    // Send movement input every 50ms
    let seq = 1;
    const sendMovement = () => {
      const input = {
        seq: seq++,
        up: true,  // Move up continuously
        down: false,
        left: false,
        right: false,
        timestamp: Date.now()
      };
      
      console.log("Sending input:", input);
      room.send("input", input);
    };
    
    // Send movement for 3 seconds
    const interval = setInterval(sendMovement, 50);
    
    setTimeout(() => {
      clearInterval(interval);
      console.log("Stopping movement");
      
      // Send stop input
      room.send("input", {
        seq: seq++,
        up: false,
        down: false,
        left: false,
        right: false,
        timestamp: Date.now()
      });
      
      // Wait a bit then disconnect
      setTimeout(() => {
        room.leave();
        console.log("Disconnected");
        process.exit(0);
      }, 1000);
    }, 3000);
    
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testMovement();