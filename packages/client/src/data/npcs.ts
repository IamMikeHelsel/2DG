import { NPCConfig } from "../entities/NPC";
import { NPC_MERCHANT } from "@toodee/shared";

export const NPC_CONFIGS: NPCConfig[] = [
  {
    id: "merchant",
    name: "Merchant Martha",
    x: NPC_MERCHANT.x,
    y: NPC_MERCHANT.y,
    spriteKey: "npc_merchant",
    interactionDistance: 2,
    dialogues: {
      default: {
        text: "Welcome, traveler! I have the finest potions in all the land. Would you like to see my wares?",
        responses: [
          {
            text: "Show me your potions",
            action: () => {
              // This will be handled by the shop system
              console.log("Opening shop...");
            },
          },
          {
            text: "Tell me about this place",
            nextDialogue: "about_town",
          },
          {
            text: "Goodbye",
            action: () => {
              console.log("Closing dialogue");
            },
          },
        ],
      },
      about_town: {
        text: "This is Toodee's birthday celebration grounds! We're having a grand festival. The whole realm has gathered to celebrate. You should explore and meet everyone!",
        responses: [
          {
            text: "How long has the festival been going?",
            nextDialogue: "festival_info",
          },
          {
            text: "Back to shopping",
            nextDialogue: "default",
          },
        ],
      },
      festival_info: {
        text: "The festival has been running for three days now! There are games, competitions, and special rewards for participants. Have you tried the monster hunting challenge yet?",
        responses: [
          {
            text: "Sounds interesting!",
            nextDialogue: "default",
          },
        ],
      },
    },
  },
  {
    id: "guard",
    name: "Guard Gordon",
    x: NPC_MERCHANT.x - 5,
    y: NPC_MERCHANT.y - 3,
    spriteKey: "npc_guard",
    interactionDistance: 2,
    dialogues: {
      default: {
        text: "Halt! State your business in Toodee's realm!",
        responses: [
          {
            text: "I'm here for the birthday celebration",
            nextDialogue: "welcome",
          },
          {
            text: "Just passing through",
            nextDialogue: "suspicious",
          },
          {
            text: "I'm looking for adventure",
            nextDialogue: "adventure",
          },
        ],
      },
      welcome: {
        text: "Ah, another well-wisher! Welcome to the festivities. Toodee will be pleased. The main celebration is in the town square. Enjoy yourself, but cause no trouble!",
        responses: [
          {
            text: "Thank you, I'll be on my best behavior",
          },
        ],
      },
      suspicious: {
        text: "Hmm... 'Just passing through' during the biggest celebration of the year? Suspicious... but you may enter. I'll be keeping an eye on you.",
        responses: [
          {
            text: "Fair enough",
          },
        ],
      },
      adventure: {
        text: "Adventure, eh? You've come to the right place! There are monsters lurking outside the town walls. Clear them out and you'll be rewarded handsomely!",
        responses: [
          {
            text: "I'll take care of them!",
            action: () => {
              console.log("Quest accepted!");
            },
          },
          {
            text: "Maybe later",
          },
        ],
      },
    },
  },
  {
    id: "villager1",
    name: "Farmer Fred",
    x: NPC_MERCHANT.x + 4,
    y: NPC_MERCHANT.y + 2,
    spriteKey: "npc_villager",
    interactionDistance: 2,
    dialogues: {
      default: {
        text: "Beautiful day for a celebration, isn't it? I brought my finest crops as a gift for Toodee!",
        responses: [
          {
            text: "What kind of crops?",
            nextDialogue: "crops",
          },
          {
            text: "Where is Toodee?",
            nextDialogue: "toodee_location",
          },
          {
            text: "Have a nice day!",
          },
        ],
      },
      crops: {
        text: "Golden wheat, magic beans, and the largest pumpkin you've ever seen! Took me all season to grow them. Toodee loves pumpkin pie!",
        responses: [
          {
            text: "Impressive!",
          },
        ],
      },
      toodee_location: {
        text: "Toodee should be arriving at the main stage soon for the ceremony. You can't miss it - just follow the music and decorations!",
        responses: [
          {
            text: "Thanks for the tip!",
          },
        ],
      },
    },
  },
  {
    id: "questgiver",
    name: "Quest Master Quinn",
    x: NPC_MERCHANT.x - 3,
    y: NPC_MERCHANT.y + 4,
    spriteKey: "npc_questgiver",
    interactionDistance: 2,
    dialogues: {
      default: {
        text: "Greetings, brave one! I have several challenges that need completing. Are you up for a quest?",
        responses: [
          {
            text: "What quests do you have?",
            nextDialogue: "quest_list",
          },
          {
            text: "What's in it for me?",
            nextDialogue: "rewards",
          },
          {
            text: "Not right now",
          },
        ],
      },
      quest_list: {
        text: "Let's see... We need someone to: Clear the monster infestation, deliver party invitations to distant villages, and find Toodee's lost birthday crown. Which interests you?",
        responses: [
          {
            text: "Tell me about the monsters",
            nextDialogue: "monster_quest",
          },
          {
            text: "The delivery quest sounds good",
            nextDialogue: "delivery_quest",
          },
          {
            text: "A lost crown? Tell me more!",
            nextDialogue: "crown_quest",
          },
        ],
      },
      monster_quest: {
        text: "Red slimes have been appearing around town. Defeat 10 of them and I'll reward you with gold and potions!",
        responses: [
          {
            text: "I'll do it!",
            action: () => {
              console.log("Monster quest started!");
            },
          },
          {
            text: "Let me think about it",
          },
        ],
      },
      delivery_quest: {
        text: "We need someone fast to deliver invitations to the neighboring villages. Time is of the essence!",
        responses: [
          {
            text: "I'm fast! Give me the invitations",
            action: () => {
              console.log("Delivery quest started!");
            },
          },
          {
            text: "How far are these villages?",
          },
        ],
      },
      crown_quest: {
        text: "Toodee's special birthday crown went missing yesterday! It's said to be hidden somewhere in the ancient ruins to the north. This is our most important quest!",
        responses: [
          {
            text: "I'll find it!",
            action: () => {
              console.log("Crown quest started!");
            },
          },
          {
            text: "Sounds dangerous...",
          },
        ],
      },
      rewards: {
        text: "Completing quests earns you gold, rare items, and special titles! Plus, Toodee personally thanks the most helpful adventurers at the ceremony!",
        responses: [
          {
            text: "Now I'm interested!",
            nextDialogue: "quest_list",
          },
          {
            text: "Good to know",
          },
        ],
      },
    },
  },
  {
    id: "bard",
    name: "Bard Melody",
    x: NPC_MERCHANT.x + 6,
    y: NPC_MERCHANT.y - 2,
    spriteKey: "npc_bard",
    interactionDistance: 3,
    dialogues: {
      default: {
        text: "🎵 Welcome, welcome, one and all! To Toodee's birthday carnival! 🎵 Would you like to hear a song?",
        responses: [
          {
            text: "Play a cheerful tune!",
            action: () => {
              console.log("Playing music...");
            },
            nextDialogue: "played_song",
          },
          {
            text: "Tell me a story instead",
            nextDialogue: "story",
          },
          {
            text: "Maybe later",
          },
        ],
      },
      played_song: {
        text: "🎵 That was 'The Ballad of Toodee the Brave'! It tells of Toodee's legendary adventures. Did you enjoy it?",
        responses: [
          {
            text: "It was wonderful!",
            nextDialogue: "thanks",
          },
          {
            text: "Play another one!",
            action: () => {
              console.log("Playing another song...");
            },
          },
        ],
      },
      story: {
        text: "Long ago, Toodee saved our realm from the Shadow Dragon. With nothing but courage and wit, Toodee sealed the dragon away. That's why we celebrate - to honor our hero!",
        responses: [
          {
            text: "What an amazing tale!",
            nextDialogue: "thanks",
          },
          {
            text: "Is the dragon still sealed?",
            nextDialogue: "dragon_info",
          },
        ],
      },
      dragon_info: {
        text: "The seal holds strong... for now. But old magic requires renewal. That's why these celebrations are so important - joy and unity strengthen the ancient barriers!",
        responses: [
          {
            text: "I'll do my part to keep spirits high!",
          },
        ],
      },
      thanks: {
        text: "You're too kind! Music and stories are meant to be shared. Come back anytime for more entertainment!",
        responses: [
          {
            text: "I will!",
          },
        ],
      },
    },
  },
];
