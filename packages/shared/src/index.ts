export const TILE_SIZE = 32;
export const TICK_RATE = 20; // server ticks per second
export const MAX_PLAYERS_PER_ROOM = 80;

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface InputMessage {
  seq: number;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  timestamp?: number; // for prediction timing
}

export interface PositionSnapshot {
  x: number;
  y: number;
  seq: number;
  timestamp: number;
}

export const MAP = {
  width: 96,
  height: 96
};

export enum Tile {
  Water = 0,
  Land = 1,
  Rock = 2,
  // Dungeon tiles
  CaveWall = 3,
  CaveFloor = 4,
  Crystal = 5,
  Torch = 6,
  // Town tiles  
  TownFloor = 7,
  TownWall = 8
}

// Tiled Map Support
export interface TiledLayer {
  name: string;
  type: 'tilelayer' | 'objectgroup';
  data?: number[];
  objects?: TiledObject[];
  width?: number;
  height?: number;
  opacity: number;
  visible: boolean;
  properties?: { [key: string]: any };
}

export interface TiledObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: { [key: string]: any };
}

export interface TiledTileset {
  firstgid: number;
  name: string;
  tilewidth: number;
  tileheight: number;
  tilecount: number;
  columns: number;
  tiles?: {
    [id: string]: {
      properties?: { [key: string]: any };
    };
  };
}

export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  tilesets: TiledTileset[];
  properties?: { [key: string]: any };
}

// Chat
export interface ChatMessage {
  from: string;
  text: string;
  ts: number; // epoch ms
}

// Shop / NPCs
export interface ShopItem {
  id: string;
  name: string;
  price: number; // gold
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: "pot_small", name: "Small Potion", price: 5 }
];

// Merchant position (tile coords) near spawn
export const NPC_MERCHANT = {
  x: Math.floor(MAP.width * 0.45) + 2,
  y: Math.floor(MAP.height * 0.55)
};

// Founder Rewards System
export enum FounderTier {
  None = "none",
  EarlyBird = "early_bird", 
  BetaTester = "beta_tester",
  BugHunter = "bug_hunter"
}

export interface RewardItem {
  id: string;
  name: string;
  description: string;
  type: "cosmetic" | "title" | "emote" | "pet" | "discount" | "access";
  icon?: string;
}

export const FOUNDER_REWARDS: Record<FounderTier, RewardItem[]> = {
  [FounderTier.None]: [],
  [FounderTier.EarlyBird]: [
    { id: "golden_torch", name: "Golden Torch", description: "A shimmering torch for early supporters", type: "cosmetic", icon: "🔥" },
    { id: "founder_badge", name: "Founder Badge", description: "Founding member recognition", type: "title", icon: "👑" },
    { id: "monument_name", name: "Monument Inscription", description: "Your name on the town monument", type: "title", icon: "🏛️" }
  ],
  [FounderTier.BetaTester]: [
    { id: "pet_companion", name: "Beta Pet", description: "Exclusive companion for beta testers", type: "pet", icon: "🐱" },
    { id: "special_chat_color", name: "Beta Chat Color", description: "Special chat text color", type: "cosmetic", icon: "💬" },
    { id: "early_access", name: "Early Access", description: "First access to new features", type: "access", icon: "🚀" }
  ],
  [FounderTier.BugHunter]: [
    { id: "bug_hunter_title", name: "Bug Hunter", description: "Recognized for finding and reporting bugs", type: "title", icon: "🐛" },
    { id: "bug_hunter_emote", name: "Bug Hunter Emote", description: "Special emote for bug hunters", type: "emote", icon: "🕵️" },
    { id: "premium_month", name: "Premium Month", description: "Free premium month at launch", type: "access", icon: "⭐" }
  ]
};

export interface PlayerRewards {
  founderTier: FounderTier;
  joinTimestamp: number;
  bugReportsSubmitted: number;
  referralsCount: number;
  unlockedRewards: string[]; // reward ids
  anniversaryParticipated: boolean;
}

export const REFERRAL_REWARDS = [
  { referrals: 1, reward: { id: "vendor_discount", name: "Friend Discount", description: "10% discount at merchants", type: "discount" as const, icon: "💰" }},
  { referrals: 3, reward: { id: "referral_emote", name: "Social Emote", description: "Exclusive referral emote", type: "emote" as const, icon: "🤝" }},
  { referrals: 5, reward: { id: "referral_skin", name: "Social Skin", description: "Cosmetic skin for top recruiters", type: "cosmetic" as const, icon: "✨" }}
];

export const ANNIVERSARY_REWARDS: RewardItem[] = [
  { id: "birthday_badge", name: "Anniversary Badge", description: "Commemorative anniversary badge", type: "title", icon: "🎂" },
  { id: "birthday_quest_reward", name: "Birthday Quest Reward", description: "Special quest completion reward", type: "cosmetic", icon: "🎁" },
  { id: "boss_slayer", name: "Anniversary Boss Slayer", description: "Defeated the anniversary boss", type: "title", icon: "⚔️" }
];

// Reward tracking constants
export const EARLY_BIRD_LIMIT = 50;
export const BETA_TEST_PERIOD_DAYS = 14;
export const BUG_HUNTER_REPORTS_REQUIRED = 5;

// Analytics Events
export enum AnalyticsEvent {
  // Core Game Events
  GAME_LOADED = 'game_loaded',
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  
  // Character & Account Events
  CHARACTER_CREATED = 'character_created',
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  
  // Gameplay Events
  COMBAT_STARTED = 'combat_started',
  COMBAT_ENDED = 'combat_ended',
  PLAYER_DIED = 'player_died',
  PLAYER_RESPAWNED = 'player_respawned',
  MOB_KILLED = 'mob_killed',
  BOSS_DEFEATED = 'boss_defeated',
  LEVEL_UP = 'level_up',
  
  // Commerce Events
  SHOP_OPENED = 'shop_opened',
  SHOP_TRANSACTION = 'shop_transaction',
  ITEM_PURCHASED = 'item_purchased',
  
  // Social Events
  PARTY_FORMED = 'party_formed',
  PARTY_JOINED = 'party_joined',
  PARTY_LEFT = 'party_left',
  CHAT_MESSAGE_SENT = 'chat_message_sent',
  
  // Retention & Engagement
  DAILY_LOGIN = 'daily_login',
  TUTORIAL_COMPLETED = 'tutorial_completed',
  FIRST_COMBAT = 'first_combat',
  
  // Founder Rewards
  FOUNDER_TIER_ASSIGNED = 'founder_tier_assigned',
  REWARD_UNLOCKED = 'reward_unlocked',
  BUG_REPORT_SUBMITTED = 'bug_report_submitted',
  REFERRAL_MADE = 'referral_made'
}

export interface BaseAnalyticsEvent {
  event: AnalyticsEvent;
  timestamp: number;
  sessionId?: string;
  playerId?: string;
  playerName?: string;
}

export interface GameLoadedEvent extends BaseAnalyticsEvent {
  event: AnalyticsEvent.GAME_LOADED;
  userAgent: string;
  viewportWidth: number;
  viewportHeight: number;
  connectionAttempts?: number;
}

export interface SessionEvent extends BaseAnalyticsEvent {
  event: AnalyticsEvent.SESSION_START | AnalyticsEvent.SESSION_END;
  sessionDuration?: number; // for session_end
}

export interface CharacterCreatedEvent extends BaseAnalyticsEvent {
  event: AnalyticsEvent.CHARACTER_CREATED;
  characterName: string;
  creationTime: number;
}

export interface CombatEvent extends BaseAnalyticsEvent {
  event: AnalyticsEvent.COMBAT_STARTED | AnalyticsEvent.COMBAT_ENDED | AnalyticsEvent.PLAYER_DIED;
  mobType?: string;
  mobId?: string;
  playerHp?: number;
  playerMaxHp?: number;
  combatDuration?: number; // for combat_ended
  damageDealt?: number;
  damageTaken?: number;
}

export interface ShopEvent extends BaseAnalyticsEvent {
  event: AnalyticsEvent.SHOP_OPENED | AnalyticsEvent.SHOP_TRANSACTION | AnalyticsEvent.ITEM_PURCHASED;
  itemId?: string;
  itemName?: string;
  itemPrice?: number;
  quantity?: number;
  playerGold?: number;
  transactionSuccess?: boolean;
}

export interface SocialEvent extends BaseAnalyticsEvent {
  event: AnalyticsEvent.PARTY_FORMED | AnalyticsEvent.PARTY_JOINED | AnalyticsEvent.PARTY_LEFT | AnalyticsEvent.CHAT_MESSAGE_SENT;
  partyId?: string;
  partySize?: number;
  messageLength?: number; // for chat
}

export interface FounderEvent extends BaseAnalyticsEvent {
  event: AnalyticsEvent.FOUNDER_TIER_ASSIGNED | AnalyticsEvent.REWARD_UNLOCKED | AnalyticsEvent.BUG_REPORT_SUBMITTED;
  founderTier?: FounderTier;
  rewardId?: string;
  rewardType?: string;
  joinOrder?: number;
  bugReportCount?: number;
}

export type AnalyticsEventData = 
  | GameLoadedEvent 
  | SessionEvent 
  | CharacterCreatedEvent 
  | CombatEvent 
  | ShopEvent 
  | SocialEvent 
  | FounderEvent 
  | BaseAnalyticsEvent;

// Analytics Configuration
export const ANALYTICS_CONFIG = {
  BATCH_SIZE: 10,
  FLUSH_INTERVAL: 30000, // 30 seconds
  MAX_QUEUE_SIZE: 100,
  SESSION_TIMEOUT: 1800000, // 30 minutes
  PRIVACY_MODE: false, // Set to true to disable analytics in development
} as const;
