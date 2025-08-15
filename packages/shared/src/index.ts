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

// Monster System
export enum MonsterType {
  RedSlime = "red_slime",
  BlueSlime = "blue_slime",
  GreenSlime = "green_slime",
  Goblin = "goblin",
  Wolf = "wolf"
}

export interface MonsterConfig {
  type: MonsterType;
  name: string;
  hp: number;
  damage: number;
  speed: number;
  attackRange: number;
  detectionRange: number;
  goldReward: number;
  expReward: number;
  color: string;
}

export const MONSTER_CONFIGS: Record<MonsterType, MonsterConfig> = {
  [MonsterType.RedSlime]: {
    type: MonsterType.RedSlime,
    name: "Red Slime",
    hp: 30,
    damage: 5,
    speed: 1.5,
    attackRange: 1.5,
    detectionRange: 5,
    goldReward: 5,
    expReward: 10,
    color: "#FF4444"
  },
  [MonsterType.BlueSlime]: {
    type: MonsterType.BlueSlime,
    name: "Blue Slime",
    hp: 40,
    damage: 7,
    speed: 1.2,
    attackRange: 1.5,
    detectionRange: 6,
    goldReward: 8,
    expReward: 15,
    color: "#4444FF"
  },
  [MonsterType.GreenSlime]: {
    type: MonsterType.GreenSlime,
    name: "Green Slime",
    hp: 25,
    damage: 4,
    speed: 2,
    attackRange: 1.5,
    detectionRange: 4,
    goldReward: 3,
    expReward: 8,
    color: "#44FF44"
  },
  [MonsterType.Goblin]: {
    type: MonsterType.Goblin,
    name: "Goblin",
    hp: 50,
    damage: 10,
    speed: 2.5,
    attackRange: 2,
    detectionRange: 7,
    goldReward: 15,
    expReward: 25,
    color: "#8B4513"
  },
  [MonsterType.Wolf]: {
    type: MonsterType.Wolf,
    name: "Wolf",
    hp: 60,
    damage: 12,
    speed: 3,
    attackRange: 2,
    detectionRange: 8,
    goldReward: 20,
    expReward: 30,
    color: "#666666"
  }
};

export const MAX_MONSTERS = 30;
export const MONSTER_SPAWN_INTERVAL = 5000; // ms
export const MONSTER_SPAWN_ZONES = [
  { x: 10, y: 10, radius: 10 },  // Northwest spawn zone
  { x: 86, y: 10, radius: 10 },  // Northeast spawn zone
  { x: 10, y: 86, radius: 10 },  // Southwest spawn zone
  { x: 86, y: 86, radius: 10 }   // Southeast spawn zone
];
