#!/usr/bin/env node

// Demo script to showcase founder rewards system functionality
// This can be run independently to see the reward logic in action

// Copy constants to avoid import issues in demo
const FounderTier = {
  None: "none",
  EarlyBird: "early_bird", 
  BetaTester: "beta_tester",
  BugHunter: "bug_hunter"
};

const EARLY_BIRD_LIMIT = 50;
const BUG_HUNTER_REPORTS_REQUIRED = 5;

// Simulate reward definitions
const FOUNDER_REWARDS = {
  [FounderTier.None]: [],
  [FounderTier.EarlyBird]: [
    { id: "golden_torch", name: "Golden Torch", description: "A shimmering torch for early supporters", type: "cosmetic", icon: "🔥" },
    { id: "founder_badge", name: "Founder Badge", description: "Founding member recognition", type: "title", icon: "👑" },
  ],
  [FounderTier.BetaTester]: [
    { id: "pet_companion", name: "Beta Pet", description: "Exclusive companion for beta testers", type: "pet", icon: "🐱" },
    { id: "special_chat_color", name: "Beta Chat Color", description: "Special chat text color", type: "cosmetic", icon: "💬" },
  ],
  [FounderTier.BugHunter]: [
    { id: "bug_hunter_title", name: "Bug Hunter", description: "Recognized for finding and reporting bugs", type: "title", icon: "🐛" },
    { id: "bug_hunter_emote", name: "Bug Hunter Emote", description: "Special emote for bug hunters", type: "emote", icon: "🕵️" },
  ]
};

// Simple player class for demo
class DemoPlayer {
  constructor() {
    this.name = "";
    this.founderTier = FounderTier.None;
    this.joinTimestamp = 0;
    this.bugReports = 0;
    this.referralsCount = 0;
    this.unlockedRewards = [];
    this.displayTitle = "";
    this.chatColor = "#FFFFFF";
  }
}

function determineFounderTier(joinOrder, joinTimestamp) {
  // Early Bird: First 50 players
  if (joinOrder <= EARLY_BIRD_LIMIT) {
    return FounderTier.EarlyBird;
  }
  
  // Beta Tester: Within first 2 weeks (simulated)
  const daysSinceLaunch = (Date.now() - joinTimestamp) / (1000 * 60 * 60 * 24);
  if (daysSinceLaunch <= 14) {
    return FounderTier.BetaTester;
  }
  
  return FounderTier.None;
}

function grantFounderRewards(player, tier) {
  const rewards = FOUNDER_REWARDS[tier];
  for (const reward of rewards) {
    player.unlockedRewards.push(reward.id);
    
    // Apply specific reward effects
    if (reward.type === "title") {
      if (reward.id === "founder_badge") {
        player.displayTitle = "👑 Founder";
      } else if (reward.id === "bug_hunter_title") {
        player.displayTitle = "🐛 Bug Hunter";
      }
    } else if (reward.type === "cosmetic" && reward.id === "special_chat_color") {
      player.chatColor = "#FFD700"; // Gold color for beta testers
    }
  }
}

function demonstrateRewardSystem() {
  console.log("🎮 FOUNDER REWARDS SYSTEM DEMONSTRATION\n");
  
  // Demo 1: Early Bird Player
  console.log("📅 Demo 1: Early Bird Player (Join #25)");
  const earlyPlayer = new DemoPlayer();
  earlyPlayer.name = "EarlySupporter";
  earlyPlayer.joinTimestamp = Date.now();
  
  const earlyTier = determineFounderTier(25, earlyPlayer.joinTimestamp);
  earlyPlayer.founderTier = earlyTier;
  grantFounderRewards(earlyPlayer, earlyTier);
  
  console.log(`Player: ${earlyPlayer.name}`);
  console.log(`Founder Tier: ${earlyPlayer.founderTier}`);
  console.log(`Display Title: ${earlyPlayer.displayTitle}`);
  console.log(`Rewards Unlocked: ${earlyPlayer.unlockedRewards.join(', ')}`);
  console.log(`Chat Color: ${earlyPlayer.chatColor}\n`);
  
  // Demo 2: Beta Tester Player
  console.log("🧪 Demo 2: Beta Tester Player (Join #75, recent)");
  const betaPlayer = new DemoPlayer();
  betaPlayer.name = "BetaTester";
  betaPlayer.joinTimestamp = Date.now();
  
  const betaTier = determineFounderTier(75, betaPlayer.joinTimestamp);
  betaPlayer.founderTier = betaTier;
  grantFounderRewards(betaPlayer, betaTier);
  
  console.log(`Player: ${betaPlayer.name}`);
  console.log(`Founder Tier: ${betaPlayer.founderTier}`);
  console.log(`Display Title: ${betaPlayer.displayTitle}`);
  console.log(`Rewards Unlocked: ${betaPlayer.unlockedRewards.join(', ')}`);
  console.log(`Chat Color: ${betaPlayer.chatColor}\n`);
  
  // Demo 3: Bug Hunter Progress
  console.log("🐛 Demo 3: Bug Hunter Progress (Regular player earning tier)");
  const bugHunter = new DemoPlayer();
  bugHunter.name = "DiligentTester";
  bugHunter.founderTier = FounderTier.None;
  bugHunter.bugReports = 0;
  
  console.log(`Player: ${bugHunter.name} - Starting bug reports: ${bugHunter.bugReports}`);
  
  // Simulate bug report submissions
  for (let i = 1; i <= 6; i++) {
    bugHunter.bugReports++;
    console.log(`Bug report #${i} submitted. Total: ${bugHunter.bugReports}`);
    
    if (bugHunter.bugReports >= BUG_HUNTER_REPORTS_REQUIRED && bugHunter.founderTier === FounderTier.None) {
      bugHunter.founderTier = FounderTier.BugHunter;
      grantFounderRewards(bugHunter, FounderTier.BugHunter);
      console.log(`🎉 Bug Hunter tier unlocked! Title: ${bugHunter.displayTitle}`);
    }
  }
  console.log(`Final rewards: ${bugHunter.unlockedRewards.join(', ')}\n`);
  
  // Demo 4: Referral System
  console.log("👥 Demo 4: Referral System Progress");
  const socialPlayer = new DemoPlayer();
  socialPlayer.name = "NetworkBuilder";
  socialPlayer.referralsCount = 0;
  
  const referralRewards = [
    { referrals: 1, reward: "vendor_discount", name: "Friend Discount" },
    { referrals: 3, reward: "referral_emote", name: "Social Emote" },
    { referrals: 5, reward: "referral_skin", name: "Social Skin" }
  ];
  
  console.log(`Player: ${socialPlayer.name} - Starting referrals: ${socialPlayer.referralsCount}`);
  
  for (let i = 1; i <= 6; i++) {
    socialPlayer.referralsCount++;
    console.log(`Referral #${i} added. Total: ${socialPlayer.referralsCount}`);
    
    const rewardMatch = referralRewards.find(r => r.referrals === socialPlayer.referralsCount);
    if (rewardMatch) {
      socialPlayer.unlockedRewards.push(rewardMatch.reward);
      console.log(`🎁 Reward unlocked: ${rewardMatch.name}`);
    }
  }
  console.log(`Final referral rewards: ${socialPlayer.unlockedRewards.filter(r => r.includes('referral') || r.includes('vendor')).join(', ')}\n`);
  
  console.log("✅ Founder Rewards System demonstration complete!");
  console.log("\n📋 SUMMARY OF IMPLEMENTED FEATURES:");
  console.log("• Automatic founder tier assignment based on join order and timing");
  console.log("• Early Bird tier for first 50 players with exclusive rewards");
  console.log("• Beta Tester tier for players joining within 2-week window");
  console.log("• Bug Hunter tier earned through community contributions");
  console.log("• Referral system with progressive rewards");
  console.log("• Visual recognition through titles and chat colors");
  console.log("• Anniversary event reward system (ready for events)");
  console.log("• Complete tracking and persistence of all reward states");
}

// Run the demonstration
demonstrateRewardSystem();