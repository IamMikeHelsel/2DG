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

// Map feature types and properties
export interface TorchLight {
  type: 'torch' | 'campfire' | 'magical';
  x: number;
  y: number;
  radius: number;
  color: string;
  intensity: number;
  flickering?: boolean;
}

export interface SpawnPoint {
  type: 'player_spawn' | 'mob_spawn' | 'npc_spawn';
  x: number;
  y: number;
  properties?: Record<string, any>;
}

export interface Trigger {
  type: 'zone_transition' | 'quest_trigger' | 'secret_entrance' | 'boss_encounter';
  x: number;
  y: number;
  width: number;
  height: number;
  targetMap?: string;
  questId?: string;
  message?: string;
}

export interface NPCSpawn {
  id: string;
  type: 'merchant' | 'quest_giver' | 'guard' | 'villager' | 'bard';
  x: number;
  y: number;
  name: string;
  dialogue?: string[];
}

// Map zones and special areas
export const SPECIAL_AREAS = {
  TOWN_CENTER: { x: 43, y: 53, radius: 8 },
  BOSS_ARENA: { x: 20, y: 25, radius: 6 },
  SECRET_CAVE: { x: 70, y: 30, radius: 4 },
  DUNGEON_ENTRANCE: { x: 60, y: 70, radius: 3 },
  TREASURE_ISLAND: { x: 80, y: 45, radius: 3 }
};

// Environmental storytelling elements
export const STORY_ELEMENTS = [
  { x: 45, y: 50, type: 'monument', message: 'A monument to the early settlers of this land...' },
  { x: 25, y: 30, type: 'ancient_ruins', message: 'Ancient stones speak of a forgotten civilization...' },
  { x: 65, y: 40, type: 'warning_sign', message: 'DANGER: Beware the creatures beyond these woods!' },
  { x: 55, y: 75, type: 'grave_marker', message: 'Here lies a brave explorer, lost to the depths...' }
];

export enum Tile {
  Water = 0,
  Land = 1,
  Rock = 2,
  Sand = 3,
  Dirt = 4,
  Stone = 5,
  CaveEntrance = 6,
  BossArena = 7,
  TreasureChest = 8,
  SecretWall = 9,
  Torch = 10,
  TownTile = 11,
  Bridge = 12,
  DungeonFloor = 13,
  DungeonWall = 14
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
