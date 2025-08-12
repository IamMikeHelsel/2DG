import { Scene } from 'phaser';

export class SpriteGenerator {
  static generateCharacterSpritesheet(
    scene: Scene,
    key: string,
    color: number,
    size: number = 32
  ): void {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // 4x4 grid: 4 directions x 4 frames each
    canvas.width = size * 4;
    canvas.height = size * 4;

    // Convert hex color to RGB
    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;
    const colorStr = `rgb(${r}, ${g}, ${b})`;
    const darkColorStr = `rgb(${Math.floor(r * 0.7)}, ${Math.floor(g * 0.7)}, ${Math.floor(b * 0.7)})`;

    // Generate frames for each direction
    const directions = ['down', 'left', 'right', 'up'];
    
    directions.forEach((dir, dirIndex) => {
      for (let frame = 0; frame < 4; frame++) {
        const x = frame * size;
        const y = dirIndex * size;

        // Clear frame area
        ctx.clearRect(x, y, size, size);

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x + size/2, y + size - 4, size/3, size/6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw body
        ctx.fillStyle = colorStr;
        ctx.fillRect(x + size/3, y + size/2, size/3, size/3);

        // Draw head
        const headSize = size/4;
        ctx.beginPath();
        ctx.arc(x + size/2, y + size/3, headSize, 0, Math.PI * 2);
        ctx.fill();

        // Draw face based on direction
        ctx.fillStyle = '#000000';
        const eyeSize = 2;
        const eyeY = y + size/3 - 2;
        
        switch(dir) {
          case 'down':
            // Eyes
            ctx.fillRect(x + size/2 - 4, eyeY, eyeSize, eyeSize);
            ctx.fillRect(x + size/2 + 2, eyeY, eyeSize, eyeSize);
            break;
          case 'up':
            // Back of head (no eyes)
            break;
          case 'left':
            // One eye visible
            ctx.fillRect(x + size/2 - 4, eyeY, eyeSize, eyeSize);
            break;
          case 'right':
            // One eye visible
            ctx.fillRect(x + size/2 + 2, eyeY, eyeSize, eyeSize);
            break;
        }

        // Draw limbs with walking animation
        ctx.strokeStyle = darkColorStr;
        ctx.lineWidth = 3;
        
        if (frame === 0) {
          // Standing
          // Arms
          ctx.beginPath();
          ctx.moveTo(x + size/3, y + size/2 + 2);
          ctx.lineTo(x + size/4, y + size/2 + 8);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x + 2*size/3, y + size/2 + 2);
          ctx.lineTo(x + 3*size/4, y + size/2 + 8);
          ctx.stroke();

          // Legs
          ctx.beginPath();
          ctx.moveTo(x + size/2 - 3, y + 2*size/3);
          ctx.lineTo(x + size/2 - 3, y + size - 6);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x + size/2 + 3, y + 2*size/3);
          ctx.lineTo(x + size/2 + 3, y + size - 6);
          ctx.stroke();
        } else {
          // Walking animation
          const walkOffset = (frame - 1) * 2;
          
          // Arms (swinging)
          ctx.beginPath();
          ctx.moveTo(x + size/3, y + size/2 + 2);
          ctx.lineTo(x + size/4 - walkOffset, y + size/2 + 8);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x + 2*size/3, y + size/2 + 2);
          ctx.lineTo(x + 3*size/4 + walkOffset, y + size/2 + 8);
          ctx.stroke();

          // Legs (walking)
          const legOffset = frame % 2 === 0 ? 2 : -2;
          
          ctx.beginPath();
          ctx.moveTo(x + size/2 - 3, y + 2*size/3);
          ctx.lineTo(x + size/2 - 3 + legOffset, y + size - 6);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x + size/2 + 3, y + 2*size/3);
          ctx.lineTo(x + size/2 + 3 - legOffset, y + size - 6);
          ctx.stroke();
        }
      }
    });

    // Create texture from canvas
    scene.textures.addCanvas(key, canvas);
    
    // Add frame data for proper animation support
    scene.textures.get(key).add('__BASE', 0, 0, 0, canvas.width, canvas.height);
    
    // Add individual frame data
    for (let i = 0; i < 16; i++) {
      const frameX = (i % 4) * size;
      const frameY = Math.floor(i / 4) * size;
      scene.textures.get(key).add(i, 0, frameX, frameY, size, size);
    }
  }

  static generateNPCSpritesheet(
    scene: Scene,
    key: string,
    color: number,
    hatColor?: number,
    size: number = 32
  ): void {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = size * 4;
    canvas.height = size * 4;

    // Convert hex color to RGB
    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;
    const colorStr = `rgb(${r}, ${g}, ${b})`;

    // Generate frames (simpler for NPCs - just standing poses)
    const directions = ['down', 'left', 'right', 'up'];
    
    directions.forEach((dir, dirIndex) => {
      for (let frame = 0; frame < 4; frame++) {
        const x = frame * size;
        const y = dirIndex * size;

        // Clear frame area
        ctx.clearRect(x, y, size, size);

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x + size/2, y + size - 4, size/3, size/6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw body (larger for NPCs)
        ctx.fillStyle = colorStr;
        ctx.fillRect(x + size/3 - 2, y + size/2 - 2, size/3 + 4, size/3 + 4);

        // Draw head
        const headSize = size/4 + 1;
        ctx.fillStyle = colorStr;
        ctx.beginPath();
        ctx.arc(x + size/2, y + size/3, headSize, 0, Math.PI * 2);
        ctx.fill();

        // Draw hat if specified
        if (hatColor !== undefined) {
          const hr = (hatColor >> 16) & 255;
          const hg = (hatColor >> 8) & 255;
          const hb = hatColor & 255;
          ctx.fillStyle = `rgb(${hr}, ${hg}, ${hb})`;
          
          // Hat shape
          ctx.fillRect(x + size/3, y + size/4 - 4, size/3, 4);
          ctx.fillRect(x + size/3 + 2, y + size/4 - 8, size/3 - 4, 4);
        }

        // Draw face
        ctx.fillStyle = '#000000';
        const eyeSize = 2;
        const eyeY = y + size/3 - 2;
        
        switch(dir) {
          case 'down':
            ctx.fillRect(x + size/2 - 4, eyeY, eyeSize, eyeSize);
            ctx.fillRect(x + size/2 + 2, eyeY, eyeSize, eyeSize);
            // Smile
            ctx.beginPath();
            ctx.arc(x + size/2, y + size/3 + 2, 3, 0, Math.PI);
            ctx.stroke();
            break;
          case 'up':
            break;
          case 'left':
            ctx.fillRect(x + size/2 - 4, eyeY, eyeSize, eyeSize);
            break;
          case 'right':
            ctx.fillRect(x + size/2 + 2, eyeY, eyeSize, eyeSize);
            break;
        }

        // Simple arms and legs
        ctx.strokeStyle = colorStr;
        ctx.lineWidth = 3;
        
        // Arms
        ctx.beginPath();
        ctx.moveTo(x + size/3 - 2, y + size/2);
        ctx.lineTo(x + size/4, y + size/2 + 6);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x + 2*size/3 + 2, y + size/2);
        ctx.lineTo(x + 3*size/4, y + size/2 + 6);
        ctx.stroke();

        // Legs
        ctx.beginPath();
        ctx.moveTo(x + size/2 - 3, y + 2*size/3 + 2);
        ctx.lineTo(x + size/2 - 3, y + size - 6);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x + size/2 + 3, y + 2*size/3 + 2);
        ctx.lineTo(x + size/2 + 3, y + size - 6);
        ctx.stroke();
      }
    });

    scene.textures.addCanvas(key, canvas);
  }

  static generateTileset(scene: Scene, key: string, tileSize: number = 32): void {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Create a small tileset with basic tiles
    canvas.width = tileSize * 4;
    canvas.height = tileSize * 2;

    // Tile 0: Grass
    ctx.fillStyle = '#4a7c59';
    ctx.fillRect(0, 0, tileSize, tileSize);
    
    // Add grass texture
    ctx.fillStyle = '#5a8c69';
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * tileSize;
      const y = Math.random() * tileSize;
      ctx.fillRect(x, y, 2, 3);
    }

    // Tile 1: Dirt
    ctx.fillStyle = '#8b6f43';
    ctx.fillRect(tileSize, 0, tileSize, tileSize);
    
    // Add dirt texture
    ctx.fillStyle = '#7b5f33';
    for (let i = 0; i < 10; i++) {
      const x = tileSize + Math.random() * tileSize;
      const y = Math.random() * tileSize;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tile 2: Stone
    ctx.fillStyle = '#808080';
    ctx.fillRect(tileSize * 2, 0, tileSize, tileSize);
    
    // Add stone texture
    ctx.strokeStyle = '#606060';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tileSize * 2 + 5, 5);
    ctx.lineTo(tileSize * 2 + 15, 8);
    ctx.lineTo(tileSize * 2 + 20, 15);
    ctx.moveTo(tileSize * 2 + 10, 20);
    ctx.lineTo(tileSize * 2 + 25, 25);
    ctx.stroke();

    // Tile 3: Water
    ctx.fillStyle = '#4682b4';
    ctx.fillRect(tileSize * 3, 0, tileSize, tileSize);
    
    // Add water waves
    ctx.strokeStyle = '#5692c4';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(tileSize * 3, 10 + i * 8);
      ctx.quadraticCurveTo(
        tileSize * 3 + tileSize/2, 
        8 + i * 8,
        tileSize * 4,
        10 + i * 8
      );
      ctx.stroke();
    }

    // Tile 4: Wood floor
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(0, tileSize, tileSize, tileSize);
    
    // Add wood grain
    ctx.strokeStyle = '#6b3503';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, tileSize + i * 8);
      ctx.lineTo(tileSize, tileSize + i * 8);
      ctx.stroke();
    }

    // Tile 5: Brick wall
    ctx.fillStyle = '#a0522d';
    ctx.fillRect(tileSize, tileSize, tileSize, tileSize);
    
    // Add brick pattern
    ctx.strokeStyle = '#803020';
    ctx.lineWidth = 1;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 2; col++) {
        const offset = row % 2 === 0 ? 0 : tileSize/4;
        ctx.strokeRect(
          tileSize + col * tileSize/2 + offset,
          tileSize + row * tileSize/4,
          tileSize/2,
          tileSize/4
        );
      }
    }

    scene.textures.addCanvas(key, canvas);
  }
}