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
export const SPAWN_DUMMY_PROBABILITY = 0.3;

// Inventory System
export const INVENTORY_SIZE = {
  width: 5,
  height: 8,
  total: 40
};

export enum ItemType {
  Weapon = "weapon",
  Armor = "armor", 
  Consumable = "consumable",
  Material = "material",
  Quest = "quest"
}

export enum ItemRarity {
  Common = "common",
  Uncommon = "uncommon", 
  Rare = "rare",
  Epic = "epic",
  Legendary = "legendary"
}

export enum EquipSlot {
  Weapon = "weapon",
  Armor = "armor",
  Accessory = "accessory"
}

export interface ItemStats {
  damage?: number;
  defense?: number;
  health?: number;
  speed?: number;
}

export interface BaseItem {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  icon: string;
  maxStack: number;
  stats?: ItemStats;
  equipSlot?: EquipSlot;
  value: number; // gold value
}

export interface InventoryItem {
  itemId: string; // references BaseItem.id
  quantity: number;
  durability?: number; // for equipment
}

export interface InventorySlot {
  x: number;
  y: number;
  item: InventoryItem | null;
}

export interface Equipment {
  weapon: InventoryItem | null;
  armor: InventoryItem | null;
  accessory: InventoryItem | null;
}

// Network messages for inventory operations
export interface InventoryMoveMessage {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  quantity?: number; // for splitting stacks
}

export interface EquipItemMessage {
  inventoryX: number;
  inventoryY: number;
  equipSlot: EquipSlot;
}

export interface PickupItemMessage {
  itemInstanceId: string; // server-side item instance
}

export interface UseItemMessage {
  inventoryX: number;
  inventoryY: number;
}

// Item definitions
export const BASE_ITEMS: Record<string, BaseItem> = {
  // Weapons
  "rusty_sword": {
    id: "rusty_sword",
    name: "Rusty Sword",
    description: "An old, weathered sword. Still sharp enough to cut.",
    type: ItemType.Weapon,
    rarity: ItemRarity.Common,
    icon: "⚔️",
    maxStack: 1,
    stats: { damage: 5 },
    equipSlot: EquipSlot.Weapon,
    value: 10
  },
  "iron_sword": {
    id: "iron_sword", 
    name: "Iron Sword",
    description: "A well-crafted iron blade.",
    type: ItemType.Weapon,
    rarity: ItemRarity.Uncommon,
    icon: "🗡️",
    maxStack: 1,
    stats: { damage: 10 },
    equipSlot: EquipSlot.Weapon,
    value: 50
  },
  
  // Armor
  "leather_vest": {
    id: "leather_vest",
    name: "Leather Vest", 
    description: "Simple leather protection.",
    type: ItemType.Armor,
    rarity: ItemRarity.Common,
    icon: "🦺",
    maxStack: 1,
    stats: { defense: 3 },
    equipSlot: EquipSlot.Armor,
    value: 15
  },
  "iron_armor": {
    id: "iron_armor",
    name: "Iron Armor",
    description: "Sturdy metal protection.",
    type: ItemType.Armor,
    rarity: ItemRarity.Uncommon, 
    icon: "🛡️",
    maxStack: 1,
    stats: { defense: 8 },
    equipSlot: EquipSlot.Armor,
    value: 75
  },
  
  // Consumables
  "health_potion": {
    id: "health_potion",
    name: "Health Potion",
    description: "Restores 25 health points.",
    type: ItemType.Consumable,
    rarity: ItemRarity.Common,
    icon: "🧪",
    maxStack: 10,
    stats: { health: 25 },
    value: 5
  },
  "large_health_potion": {
    id: "large_health_potion",
    name: "Large Health Potion", 
    description: "Restores 50 health points.",
    type: ItemType.Consumable,
    rarity: ItemRarity.Uncommon,
    icon: "🫙",
    maxStack: 5,
    stats: { health: 50 },
    value: 15
  },
  
  // Materials  
  "iron_ore": {
    id: "iron_ore",
    name: "Iron Ore",
    description: "Raw iron ready for smelting.",
    type: ItemType.Material,
    rarity: ItemRarity.Common,
    icon: "🪨",
    maxStack: 50,
    value: 2
  },
  "wood": {
    id: "wood",
    name: "Wood",
    description: "Sturdy wood for crafting.",
    type: ItemType.Material,
    rarity: ItemRarity.Common,
    icon: "🪵",
    maxStack: 50,
    value: 1
  },
  
  // Accessories
  "speed_ring": {
    id: "speed_ring", 
    name: "Ring of Speed",
    description: "Increases movement speed.",
    type: ItemType.Weapon, // accessories use weapon type for now
    rarity: ItemRarity.Rare,
    icon: "💍",
    maxStack: 1,
    stats: { speed: 2 },
    equipSlot: EquipSlot.Accessory,
    value: 100
  }
};

// Loot tables for different mob types
export interface LootEntry {
  itemId: string;
  chance: number; // 0-1
  minQuantity: number;
  maxQuantity: number;
}

export const LOOT_TABLES: Record<string, LootEntry[]> = {
  "basic_mob": [
    { itemId: "health_potion", chance: 0.3, minQuantity: 1, maxQuantity: 2 },
    { itemId: "wood", chance: 0.2, minQuantity: 1, maxQuantity: 3 },
    { itemId: "iron_ore", chance: 0.1, minQuantity: 1, maxQuantity: 2 }
  ],
  "elite_mob": [
    { itemId: "iron_sword", chance: 0.1, minQuantity: 1, maxQuantity: 1 },
    { itemId: "iron_armor", chance: 0.08, minQuantity: 1, maxQuantity: 1 },
    { itemId: "large_health_potion", chance: 0.4, minQuantity: 1, maxQuantity: 3 },
    { itemId: "speed_ring", chance: 0.05, minQuantity: 1, maxQuantity: 1 }
  ]
};
