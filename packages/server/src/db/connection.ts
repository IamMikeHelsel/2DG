import { createClient } from '@supabase/supabase-js';
import { createClient as createRedisClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Database types
export interface Character {
  id: string;
  user_id: string;
  name: string;
  x: number;
  y: number;
  dir: number;
  hp: number;
  max_hp: number;
  gold: number;
  level: number;
  experience: number;
  founder_tier: string;
  join_timestamp: number;
  bug_reports: number;
  referrals_count: number;
  anniversary_participated: boolean;
  display_title: string;
  chat_color: string;
  created_at: string;
  updated_at: string;
  last_saved_at: string;
}

export interface InventoryItem {
  id: string;
  character_id: string;
  slot_index: number;
  item_id: string;
  quantity: number;
}

export interface CharacterReward {
  id: string;
  character_id: string;
  reward_id: string;
  unlocked_at: string;
}

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Redis client for session management
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = createRedisClient({
  url: redisUrl,
});

// Initialize connections
export async function initializeDatabase() {
  try {
    // Test Supabase connection
    const { error: supabaseError } = await supabase.from('characters').select('count', { count: 'exact', head: true });
    
    if (supabaseError) {
      console.warn('[DB] Supabase connection failed, running without persistence:', supabaseError.message);
      return { supabaseConnected: false, redisConnected: false };
    }
    
    console.log('[DB] Supabase connected successfully');
    
    // Test Redis connection
    let redisConnected = false;
    try {
      await redis.connect();
      await redis.ping();
      redisConnected = true;
      console.log('[DB] Redis connected successfully');
    } catch (redisError) {
      console.warn('[DB] Redis connection failed, running without session cache:', redisError);
    }
    
    return { supabaseConnected: true, redisConnected };
  } catch (error) {
    console.error('[DB] Database initialization failed:', error);
    return { supabaseConnected: false, redisConnected: false };
  }
}

// Graceful shutdown
export async function closeConnections() {
  try {
    if (redis.isOpen) {
      await redis.quit();
      console.log('[DB] Redis connection closed');
    }
  } catch (error) {
    console.error('[DB] Error closing Redis connection:', error);
  }
}