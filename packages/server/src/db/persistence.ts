import { supabase, redis, Character, InventoryItem, CharacterReward } from './connection';
import { Player } from '../state';

export class PersistenceService {
  private static instance: PersistenceService;
  private isEnabled: boolean = false;
  private redisEnabled: boolean = false;

  private constructor() {}

  public static getInstance(): PersistenceService {
    if (!PersistenceService.instance) {
      PersistenceService.instance = new PersistenceService();
    }
    return PersistenceService.instance;
  }

  public initialize(supabaseConnected: boolean, redisConnected: boolean) {
    this.isEnabled = supabaseConnected;
    this.redisEnabled = redisConnected;
    console.log(`[Persistence] Service initialized - DB: ${this.isEnabled}, Redis: ${this.redisEnabled}`);
  }

  // Create or get character for user
  async getOrCreateCharacter(userId: string, characterName?: string): Promise<Character | null> {
    if (!this.isEnabled) {
      return this.createDefaultCharacter(userId, characterName || 'Adventurer');
    }

    try {
      // First, try to get existing character
      const { data: existingCharacters, error: fetchError } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('[Persistence] Error fetching character:', fetchError);
        return this.createDefaultCharacter(userId, characterName || 'Adventurer');
      }

      // If character exists, return it
      if (existingCharacters && existingCharacters.length > 0) {
        const character = existingCharacters[0] as Character;
        console.log(`[Persistence] Loaded existing character: ${character.name} for user ${userId}`);
        return character;
      }

      // Create new character if none exists
      const newCharacter = {
        user_id: userId,
        name: characterName || 'Adventurer',
        x: Math.floor(96 * 0.45), // Default spawn position
        y: Math.floor(96 * 0.55),
        dir: 0,
        hp: 100,
        max_hp: 100,
        gold: 20,
        level: 1,
        experience: 0,
        founder_tier: 'none',
        join_timestamp: Date.now(),
        bug_reports: 0,
        referrals_count: 0,
        anniversary_participated: false,
        display_title: '',
        chat_color: '#FFFFFF',
      };

      const { data: createdCharacter, error: createError } = await supabase
        .from('characters')
        .insert([newCharacter])
        .select()
        .single();

      if (createError) {
        console.error('[Persistence] Error creating character:', createError);
        return this.createDefaultCharacter(userId, characterName || 'Adventurer');
      }

      console.log(`[Persistence] Created new character: ${createdCharacter.name} for user ${userId}`);
      return createdCharacter as Character;

    } catch (error) {
      console.error('[Persistence] Database error:', error);
      return this.createDefaultCharacter(userId, characterName || 'Adventurer');
    }
  }

  // Save character state
  async saveCharacter(player: Player, userId: string): Promise<boolean> {
    if (!this.isEnabled) {
      return false; // Gracefully fail when persistence is disabled
    }

    try {
      const characterData = {
        name: player.name,
        x: player.x,
        y: player.y,
        dir: player.dir,
        hp: player.hp,
        max_hp: player.maxHp,
        gold: player.gold,
        founder_tier: player.founderTier,
        join_timestamp: player.joinTimestamp,
        bug_reports: player.bugReports,
        referrals_count: player.referralsCount,
        anniversary_participated: player.anniversaryParticipated,
        display_title: player.displayTitle,
        chat_color: player.chatColor,
        last_saved_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('characters')
        .update(characterData)
        .eq('user_id', userId);

      if (error) {
        console.error('[Persistence] Error saving character:', error);
        return false;
      }

      // Cache in Redis if available
      if (this.redisEnabled) {
        try {
          await redis.setEx(`character:${userId}`, 300, JSON.stringify(characterData)); // 5 min cache
        } catch (redisError) {
          console.warn('[Persistence] Redis cache failed:', redisError);
        }
      }

      return true;
    } catch (error) {
      console.error('[Persistence] Save error:', error);
      return false;
    }
  }

  // Save character inventory (simple implementation for potions)
  async saveInventory(characterId: string, pots: number): Promise<boolean> {
    if (!this.isEnabled || pots <= 0) {
      return false;
    }

    try {
      // For now, just save potions in slot 0
      const inventoryItem = {
        character_id: characterId,
        slot_index: 0,
        item_id: 'pot_small',
        quantity: pots,
      };

      const { error } = await supabase
        .from('inventories')
        .upsert([inventoryItem], { onConflict: 'character_id,slot_index' });

      if (error) {
        console.error('[Persistence] Error saving inventory:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Persistence] Inventory save error:', error);
      return false;
    }
  }

  // Load character inventory
  async loadInventory(characterId: string): Promise<{ pots: number }> {
    if (!this.isEnabled) {
      return { pots: 0 };
    }

    try {
      const { data: inventoryItems, error } = await supabase
        .from('inventories')
        .select('*')
        .eq('character_id', characterId);

      if (error) {
        console.error('[Persistence] Error loading inventory:', error);
        return { pots: 0 };
      }

      const pots = inventoryItems?.find(item => item.item_id === 'pot_small')?.quantity || 0;
      return { pots };
    } catch (error) {
      console.error('[Persistence] Inventory load error:', error);
      return { pots: 0 };
    }
  }

  // Save character rewards
  async saveRewards(characterId: string, rewardIds: string[]): Promise<boolean> {
    if (!this.isEnabled || rewardIds.length === 0) {
      return false;
    }

    try {
      const rewards = rewardIds.map(rewardId => ({
        character_id: characterId,
        reward_id: rewardId,
      }));

      const { error } = await supabase
        .from('character_rewards')
        .upsert(rewards, { onConflict: 'character_id,reward_id' });

      if (error) {
        console.error('[Persistence] Error saving rewards:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Persistence] Rewards save error:', error);
      return false;
    }
  }

  // Create default character when database is not available
  private createDefaultCharacter(userId: string, name: string): Character {
    return {
      id: `temp_${userId}`,
      user_id: userId,
      name: name,
      x: Math.floor(96 * 0.45),
      y: Math.floor(96 * 0.55),
      dir: 0,
      hp: 100,
      max_hp: 100,
      gold: 20,
      level: 1,
      experience: 0,
      founder_tier: 'none',
      join_timestamp: Date.now(),
      bug_reports: 0,
      referrals_count: 0,
      anniversary_participated: false,
      display_title: '',
      chat_color: '#FFFFFF',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_saved_at: new Date().toISOString(),
    };
  }

  // Get cached character from Redis
  async getCachedCharacter(userId: string): Promise<Partial<Character> | null> {
    if (!this.redisEnabled) {
      return null;
    }

    try {
      const cached = await redis.get(`character:${userId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('[Persistence] Redis get failed:', error);
      return null;
    }
  }

  // Check if persistence is enabled
  isReady(): boolean {
    return this.isEnabled;
  }
}

export const persistenceService = PersistenceService.getInstance();