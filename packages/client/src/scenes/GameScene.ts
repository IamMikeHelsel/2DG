import { Scene } from "phaser";
import { createClient } from "../net";

export class GameScene extends Scene {
  private room: any = null;
  private playerRects = new Map();
  private cursors: any;
  private lastSent = { up: false, down: false, left: false, right: false };
  private seq = 0;

  constructor() {
    super("game");
  }

  async create() {
    // Gray background
    this.cameras.main.setBackgroundColor("#333333");
    
    // Setup keyboard NOW
    this.cursors = this.input.keyboard.createCursorKeys();
    
    // Status text
    const status = this.add.text(10, 10, "Connecting...", { 
      color: "#ffff00", fontSize: "20px" 
    }).setScrollFactor(0);
    
    // Connect
    try {
      const client = createClient();
      this.room = await client.joinOrCreate("toodee", { 
        name: "P" + Math.floor(Math.random() * 999) 
      });
      
      status.setText("Connected! Use ARROW KEYS");
      status.setColor("#00ff00");
      
      // Add players
      this.room.state.players.onAdd = (player: any, id: string) => {
        const isMe = id === this.room.sessionId;
        
        // Create rectangle - GREEN for me, BLUE for others
        const rect = this.add.rectangle(
          player.x * 16, 
          player.y * 16, 
          14, 14, 
          isMe ? 0x00ff00 : 0x0088ff
        );
        
        this.playerRects.set(id, rect);
        
        // Camera follows me
        if (isMe) {
          this.cameras.main.startFollow(rect);
          this.cameras.main.setZoom(3);
        }
        
        // Update position when it changes
        player.onChange = () => {
          const r = this.playerRects.get(id);
          if (r) {
            r.x = player.x * 16;
            r.y = player.y * 16;
          }
        };
      };
      
      // Remove players
      this.room.state.players.onRemove = (player: any, id: string) => {
        const rect = this.playerRects.get(id);
        if (rect) {
          rect.destroy();
          this.playerRects.delete(id);
        }
      };
      
    } catch (e: any) {
      status.setText("FAILED: " + e.message);
      status.setColor("#ff0000");
      console.error(e);
    }
  }
  
  update() {
    // No room? Do nothing
    if (!this.room) return;
    
    // Read keys
    const up = this.cursors.up?.isDown || false;
    const down = this.cursors.down?.isDown || false;
    const left = this.cursors.left?.isDown || false;
    const right = this.cursors.right?.isDown || false;
    
    // Only send if changed
    if (up !== this.lastSent.up || down !== this.lastSent.down || 
        left !== this.lastSent.left || right !== this.lastSent.right) {
      
      this.lastSent = { up, down, left, right };
      
      // Send to server
      this.room.send("input", {
        seq: ++this.seq,
        up, down, left, right,
        timestamp: Date.now()
      });
    }
  }
}