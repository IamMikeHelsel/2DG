import { PostHog } from 'posthog-node';
import { AnalyticsEvent, AnalyticsEventData, ANALYTICS_CONFIG } from '@toodee/shared';

class ServerAnalyticsService {
  private client?: PostHog;
  private initialized = false;
  private eventQueue: AnalyticsEventData[] = [];

  initialize(projectApiKey?: string) {
    if (this.initialized || ANALYTICS_CONFIG.PRIVACY_MODE) {
      return;
    }

    const apiKey = projectApiKey || process.env.POSTHOG_API_KEY;
    
    if (!apiKey) {
      console.warn('[Analytics] PostHog API key not provided. Server analytics disabled.');
      return;
    }

    try {
      this.client = new PostHog(apiKey, {
        host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
        flushAt: ANALYTICS_CONFIG.BATCH_SIZE,
        flushInterval: ANALYTICS_CONFIG.FLUSH_INTERVAL,
      });

      this.initialized = true;
      console.log('[Analytics] PostHog server client initialized successfully');

      // Set up graceful shutdown
      this.setupShutdownHandlers();

    } catch (error) {
      console.error('[Analytics] Failed to initialize PostHog server client:', error);
    }
  }

  track(eventData: AnalyticsEventData) {
    if (!this.initialized || ANALYTICS_CONFIG.PRIVACY_MODE || !this.client) {
      return;
    }

    try {
      // Server-side events should include server context
      const enrichedEvent = {
        ...eventData,
        timestamp: eventData.timestamp || Date.now(),
        server_tracked: true,
        environment: process.env.NODE_ENV || 'development'
      };

      this.client.capture({
        distinctId: eventData.playerId || eventData.sessionId || 'anonymous',
        event: enrichedEvent.event,
        properties: enrichedEvent
      });

    } catch (error) {
      console.error('[Analytics] Failed to track server event:', error);
      // Queue for retry
      this.eventQueue.push(eventData);
    }
  }

  // Player lifecycle events
  trackPlayerJoined(playerId: string, playerName: string, sessionId: string, founderTier?: string) {
    this.track({
      event: AnalyticsEvent.PLAYER_JOINED,
      timestamp: Date.now(),
      playerId,
      playerName,
      sessionId
    });

    // Also set user properties
    if (this.client) {
      this.client.identify({
        distinctId: playerId,
        properties: {
          name: playerName,
          founder_tier: founderTier,
          last_seen: new Date().toISOString()
        }
      });
    }
  }

  trackPlayerLeft(playerId: string, sessionId: string, sessionDuration?: number) {
    this.track({
      event: AnalyticsEvent.PLAYER_LEFT,
      timestamp: Date.now(),
      playerId,
      sessionId,
      sessionDuration
    });
  }

  // Combat events (authoritative server-side tracking)
  trackCombatStarted(playerId: string, mobId: string, mobType: string) {
    this.track({
      event: AnalyticsEvent.COMBAT_STARTED,
      timestamp: Date.now(),
      playerId,
      mobId,
      mobType
    });
  }

  trackCombatEnded(playerId: string, mobId: string, mobType: string, duration: number, damageDealt: number, damageTaken: number, playerWon: boolean) {
    this.track({
      event: AnalyticsEvent.COMBAT_ENDED,
      timestamp: Date.now(),
      playerId,
      mobId,
      mobType,
      combatDuration: duration,
      damageDealt,
      damageTaken
    });

    if (playerWon) {
      this.track({
        event: AnalyticsEvent.MOB_KILLED,
        timestamp: Date.now(),
        playerId,
        mobType,
        mobId
      });
    }
  }

  trackPlayerDeath(playerId: string, mobId?: string, mobType?: string, playerHp: number = 0) {
    this.track({
      event: AnalyticsEvent.PLAYER_DIED,
      timestamp: Date.now(),
      playerId,
      mobId,
      mobType,
      playerHp
    });
  }

  trackPlayerRespawned(playerId: string) {
    this.track({
      event: AnalyticsEvent.PLAYER_RESPAWNED,
      timestamp: Date.now(),
      playerId
    });
  }

  // Shop transactions (authoritative)
  trackShopTransaction(playerId: string, itemId: string, itemName: string, itemPrice: number, quantity: number, playerGold: number, success: boolean) {
    this.track({
      event: AnalyticsEvent.SHOP_TRANSACTION,
      timestamp: Date.now(),
      playerId,
      itemId,
      itemName,
      itemPrice,
      quantity,
      playerGold,
      transactionSuccess: success
    });

    if (success) {
      this.track({
        event: AnalyticsEvent.ITEM_PURCHASED,
        timestamp: Date.now(),
        playerId,
        itemId,
        itemName,
        itemPrice,
        quantity
      });
    }
  }

  // Social events
  trackChatMessage(playerId: string, messageLength: number) {
    this.track({
      event: AnalyticsEvent.CHAT_MESSAGE_SENT,
      timestamp: Date.now(),
      playerId,
      messageLength
    });
  }

  // Founder events
  trackFounderTierAssigned(playerId: string, founderTier: string, joinOrder: number) {
    this.track({
      event: AnalyticsEvent.FOUNDER_TIER_ASSIGNED,
      timestamp: Date.now(),
      playerId,
      founderTier,
      joinOrder
    });
  }

  trackBugReportSubmitted(playerId: string, bugReportCount: number) {
    this.track({
      event: AnalyticsEvent.BUG_REPORT_SUBMITTED,
      timestamp: Date.now(),
      playerId,
      bugReportCount
    });
  }

  trackRewardUnlocked(playerId: string, rewardId: string, rewardType: string) {
    this.track({
      event: AnalyticsEvent.REWARD_UNLOCKED,
      timestamp: Date.now(),
      playerId,
      rewardId,
      rewardType
    });
  }

  trackReferralMade(playerId: string, referredPlayerId: string) {
    this.track({
      event: AnalyticsEvent.REFERRAL_MADE,
      timestamp: Date.now(),
      playerId,
      referredPlayerId: referredPlayerId
    });
  }

  // Boss events
  trackBossDefeated(playerId: string, bossType: string, bossId: string, damage: number) {
    this.track({
      event: AnalyticsEvent.BOSS_DEFEATED,
      timestamp: Date.now(),
      playerId,
      mobType: bossType,
      mobId: bossId,
      damageDealt: damage
    });
  }

  // Set user properties (for cohort analysis)
  setUserProperties(playerId: string, properties: Record<string, any>) {
    if (!this.client || !this.initialized) return;

    this.client.identify({
      distinctId: playerId,
      properties: {
        ...properties,
        last_activity: new Date().toISOString()
      }
    });
  }

  // Feature flags for server-side experiments
  async getFeatureFlag(playerId: string, flagKey: string): Promise<boolean | string | undefined> {
    if (!this.client || !this.initialized) return undefined;

    try {
      return await this.client.getFeatureFlag(flagKey, playerId);
    } catch (error) {
      console.error('[Analytics] Failed to get feature flag:', error);
      return undefined;
    }
  }

  async isFeatureEnabled(playerId: string, flagKey: string): Promise<boolean> {
    if (!this.client || !this.initialized) return false;

    try {
      return await this.client.isFeatureEnabled(flagKey, playerId);
    } catch (error) {
      console.error('[Analytics] Failed to check feature flag:', error);
      return false;
    }
  }

  private setupShutdownHandlers() {
    const gracefulShutdown = () => {
      console.log('[Analytics] Shutting down analytics service...');
      if (this.client) {
        this.client.shutdown();
      }
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    process.on('beforeExit', gracefulShutdown);
  }

  // Manual flush for immediate delivery
  flush() {
    if (this.client && this.initialized) {
      this.client.flush();
    }
  }
}

// Export singleton instance
export const serverAnalytics = new ServerAnalyticsService();