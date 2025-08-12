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
}

// Zone transition messages
export interface ZoneTransitionMessage {
  targetZone: string;
  targetX: number;
  targetY: number;
}

export interface BossAttackTelegraph {
  bossId: string;
  abilityId: string;
  x: number;
  y: number;
  range: number;
  pattern: string;
  duration: number;
}

export const MAP = {
  width: 96,
  height: 96
};

export enum Tile {
  Water = 0,
  Land = 1,
  Rock = 2,
  DungeonFloor = 3,
  DungeonWall = 4,
  Portal = 5
}

// Zone System
export enum ZoneType {
  Overworld = "overworld",
  Dungeon = "dungeon"
}

export interface Portal {
  x: number;
  y: number;
  targetZone: string;
  targetX: number;
  targetY: number;
}

export interface Zone {
  id: string;
  type: ZoneType;
  name: string;
  width: number;
  height: number;
  spawns: { x: number; y: number }[];
  portals: Portal[];
}

// Zone configurations
export const ZONES: { [key: string]: Zone } = {
  overworld: {
    id: "overworld",
    type: ZoneType.Overworld,
    name: "Michigan Shores",
    width: 96,
    height: 96,
    spawns: [
      { x: Math.floor(96 * 0.45), y: Math.floor(96 * 0.55) }
    ],
    portals: [
      {
        x: Math.floor(96 * 0.45) + 8, 
        y: Math.floor(96 * 0.55) - 5,
        targetZone: "dungeon",
        targetX: 5,
        targetY: 25
      }
    ]
  },
  dungeon: {
    id: "dungeon",
    type: ZoneType.Dungeon,
    name: "Crystal Caverns",
    width: 48,
    height: 32,
    spawns: [
      { x: 5, y: 25 }
    ],
    portals: [
      {
        x: 5,
        y: 25,
        targetZone: "overworld", 
        targetX: Math.floor(96 * 0.45) + 8,
        targetY: Math.floor(96 * 0.55) - 5
      }
    ]
  }
};

// Boss System
export enum BossPhase {
  Phase1 = 1,
  Phase2 = 2, 
  Phase3 = 3
}

export interface BossAbility {
  id: string;
  name: string;
  type: "aoe" | "projectile" | "melee" | "summon";
  damage: number;
  range: number;
  telegraphTime: number; // ms before damage
  cooldown: number; // ms
  pattern?: "circle" | "cone" | "line" | "cross";
}

export interface BossPhaseConfig {
  hpThreshold: number; // percentage (100, 50, 25)
  attackCooldown: number; // ms
  abilities: BossAbility[];
  addSpawns?: { count: number; mobType: string }[];
}

export interface LootDrop {
  itemId: string;
  quantity: number;
  chance: number; // 0-1
}

export interface BossConfig {
  id: string;
  name: string;
  maxHp: number;
  phases: {
    [BossPhase.Phase1]: BossPhaseConfig;
    [BossPhase.Phase2]: BossPhaseConfig;
    [BossPhase.Phase3]: BossPhaseConfig;
  };
  lootTable: LootDrop[];
  founderReward?: string;
}

// Boss Configuration
export const CRYSTAL_CAVERN_BOSS: BossConfig = {
  id: "crystal_guardian",
  name: "Crystal Guardian",
  maxHp: 1000,
  phases: {
    [BossPhase.Phase1]: {
      hpThreshold: 100,
      attackCooldown: 3000,
      abilities: [
        {
          id: "crystal_slam",
          name: "Crystal Slam",
          type: "aoe",
          damage: 25,
          range: 3,
          telegraphTime: 2000,
          cooldown: 4000,
          pattern: "circle"
        }
      ]
    },
    [BossPhase.Phase2]: {
      hpThreshold: 50,
      attackCooldown: 2500,
      abilities: [
        {
          id: "crystal_slam",
          name: "Crystal Slam", 
          type: "aoe",
          damage: 30,
          range: 3,
          telegraphTime: 1500,
          cooldown: 3500,
          pattern: "circle"
        },
        {
          id: "shard_spray",
          name: "Shard Spray",
          type: "projectile",
          damage: 20,
          range: 8,
          telegraphTime: 1000,
          cooldown: 5000,
          pattern: "cone"
        }
      ],
      addSpawns: [{ count: 2, mobType: "crystal_minion" }]
    },
    [BossPhase.Phase3]: {
      hpThreshold: 25,
      attackCooldown: 2000,
      abilities: [
        {
          id: "crystal_slam",
          name: "Crystal Slam",
          type: "aoe", 
          damage: 35,
          range: 4,
          telegraphTime: 1000,
          cooldown: 3000,
          pattern: "circle"
        },
        {
          id: "shard_spray",
          name: "Shard Spray",
          type: "projectile",
          damage: 25,
          range: 8,
          telegraphTime: 800,
          cooldown: 4000,
          pattern: "cone"
        },
        {
          id: "crystal_nova",
          name: "Crystal Nova",
          type: "aoe",
          damage: 50,
          range: 6,
          telegraphTime: 3000,
          cooldown: 8000,
          pattern: "circle"
        }
      ]
    }
  },
  lootTable: [
    { itemId: "crystal_shard", quantity: 5, chance: 1.0 },
    { itemId: "boss_gold", quantity: 100, chance: 1.0 },
    { itemId: "rare_potion", quantity: 3, chance: 0.8 }
  ],
  founderReward: "boss_slayer"
};

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