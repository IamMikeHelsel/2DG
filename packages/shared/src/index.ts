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

export const MAP = {
  width: 96,
  height: 96
};

export enum Tile {
  Water = 0,
  Land = 1,
  Rock = 2
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

// Crafting System
export interface CraftingMaterial {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  materials: { materialId: string; quantity: number }[];
  result: { itemId: string; quantity: number };
  craftingTime: number; // seconds
  icon?: string;
}

export interface PlayerInventory {
  [materialId: string]: number;
}

export interface CraftingRequest {
  recipeId: string;
}

export interface CraftingResponse {
  success: boolean;
  message: string;
  newInventory?: PlayerInventory;
  craftedItem?: { itemId: string; quantity: number };
}

export const CRAFTING_MATERIALS: CraftingMaterial[] = [
  { id: "herbs", name: "Herbs", description: "Common healing herbs", icon: "🌿" },
  { id: "empty_vial", name: "Empty Vial", description: "Glass vial for potions", icon: "🧪" },
  { id: "iron_ore", name: "Iron Ore", description: "Raw iron for smithing", icon: "⛏️" },
  { id: "wood", name: "Wood", description: "Sturdy wood for crafting", icon: "🪵" },
];

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: "health_potion",
    name: "Health Potion",
    description: "Restores 50 HP",
    materials: [
      { materialId: "herbs", quantity: 2 },
      { materialId: "empty_vial", quantity: 1 }
    ],
    result: { itemId: "health_potion", quantity: 1 },
    craftingTime: 3,
    icon: "🧪"
  },
  {
    id: "iron_sword",
    name: "Iron Sword",
    description: "A sturdy iron sword",
    materials: [
      { materialId: "iron_ore", quantity: 3 },
      { materialId: "wood", quantity: 1 }
    ],
    result: { itemId: "iron_sword", quantity: 1 },
    craftingTime: 5,
    icon: "⚔️"
  }
];
