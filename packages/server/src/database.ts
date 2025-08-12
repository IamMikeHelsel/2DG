import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          name: string;
          founder_tier: string;
          join_timestamp: number;
          join_order: number | null;
          bug_reports_submitted: number;
          referrals_count: number;
          unlocked_rewards: string[];
          anniversary_participated: boolean;
          last_seen: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          founder_tier?: string;
          join_timestamp?: number;
          join_order?: number | null;
          bug_reports_submitted?: number;
          referrals_count?: number;
          unlocked_rewards?: string[];
          anniversary_participated?: boolean;
          last_seen?: number;
        };
        Update: {
          id?: string;
          name?: string;
          founder_tier?: string;
          join_timestamp?: number;
          join_order?: number | null;
          bug_reports_submitted?: number;
          referrals_count?: number;
          unlocked_rewards?: string[];
          anniversary_participated?: boolean;
          last_seen?: number;
        };
      };
      game_sessions: {
        Row: {
          id: string;
          player_id: string;
          session_start: string;
          session_end: string | null;
          duration_ms: number | null;
          x_position: number | null;
          y_position: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          session_start?: string;
          session_end?: string | null;
          duration_ms?: number | null;
          x_position?: number | null;
          y_position?: number | null;
        };
        Update: {
          session_end?: string | null;
          duration_ms?: number | null;
          x_position?: number | null;
          y_position?: number | null;
        };
      };
      bug_reports: {
        Row: {
          id: string;
          player_id: string;
          description: string;
          reproduction_steps: string | null;
          status: 'open' | 'in_progress' | 'resolved' | 'rejected';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          description: string;
          reproduction_steps?: string | null;
          status?: 'open' | 'in_progress' | 'resolved' | 'rejected';
        };
        Update: {
          description?: string;
          reproduction_steps?: string | null;
          status?: 'open' | 'in_progress' | 'resolved' | 'rejected';
        };
      };
    };
  };
}

let supabase: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('[Database] Supabase credentials not configured, running without database');
      throw new Error('Supabase credentials not configured');
    }
    
    supabase = createClient<Database>(supabaseUrl, supabaseKey);
    console.log('[Database] Supabase client initialized');
  }
  
  return supabase;
}

export async function createPlayer(playerData: Database['public']['Tables']['players']['Insert']) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('players')
      .insert(playerData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('[Database] Failed to create player:', error);
    return null;
  }
}

export async function updatePlayer(id: string, updates: Database['public']['Tables']['players']['Update']) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('[Database] Failed to update player:', error);
    return null;
  }
}

export async function getPlayer(id: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('players')
      .select()
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('[Database] Failed to get player:', error);
    return null;
  }
}

export async function createGameSession(sessionData: Database['public']['Tables']['game_sessions']['Insert']) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('game_sessions')
      .insert(sessionData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('[Database] Failed to create game session:', error);
    return null;
  }
}

export async function endGameSession(sessionId: string, endData: Database['public']['Tables']['game_sessions']['Update']) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('game_sessions')
      .update(endData)
      .eq('id', sessionId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('[Database] Failed to end game session:', error);
    return null;
  }
}

export async function createBugReport(reportData: Database['public']['Tables']['bug_reports']['Insert']) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('bug_reports')
      .insert(reportData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('[Database] Failed to create bug report:', error);
    return null;
  }
}