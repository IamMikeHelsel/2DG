#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple function to create a minimal OGG file with silence
function createSilentOggFile(filePath, durationMs = 1000) {
  // This is a minimal OGG Vorbis header for a short silent file
  // In a real implementation, you'd use proper audio libraries
  const oggHeader = Buffer.from([
    0x4F, 0x67, 0x67, 0x53, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x02, 0x30
  ]);
  
  // Create directory if it doesn't exist
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write a minimal file (placeholder)
  fs.writeFileSync(filePath, oggHeader);
  console.log(`Created placeholder audio file: ${filePath}`);
}

// Audio files to create based on shared constants
const audioFiles = [
  // Music
  'music/town_theme.ogg',
  'music/dungeon_ambient.ogg', 
  'music/boss_battle.ogg',
  
  // Ambient
  'ambient/wind.ogg',
  'ambient/torches.ogg',
  'ambient/water.ogg',
  
  // Combat SFX
  'sfx/sword_swing.ogg',
  'sfx/hit.ogg',
  'sfx/death.ogg',
  
  // UI sounds
  'ui/click.ogg',
  'ui/hover.ogg',
  'ui/notification.ogg',
  
  // Footsteps
  'sfx/footstep_grass.ogg',
  'sfx/footstep_stone.ogg',
  'sfx/footstep_water.ogg',
  
  // Spells/abilities
  'sfx/magic_cast.ogg',
  'sfx/heal.ogg',
  'sfx/spell_impact.ogg'
];

const audioDir = path.join(__dirname, '../../public/audio');

console.log('Creating placeholder audio files...');
audioFiles.forEach(file => {
  const filePath = path.join(audioDir, file);
  createSilentOggFile(filePath);
});

console.log('Placeholder audio files created successfully!');
console.log('Note: These are minimal placeholder files. Replace with actual audio assets for production.');