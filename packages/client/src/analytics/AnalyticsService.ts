import posthog from 'posthog-js';
import { AnalyticsEvent, AnalyticsEventData, ANALYTICS_CONFIG } from '@toodee/shared';

class AnalyticsService {
  private initialized = false;
  private sessionId: string;
  private sessionStartTime: number;
  private playerId?: string;
  private playerName?: string;
  private eventQueue: AnalyticsEventData[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
  }

  initialize(projectApiKey?: string) {
    if (this.initialized || ANALYTICS_CONFIG.PRIVACY_MODE) {
      return;
    }

    // Use environment variable or provided key
    const apiKey = projectApiKey || import.meta.env.VITE_POSTHOG_API_KEY;
    
    if (!apiKey) {
      console.warn('[Analytics] PostHog API key not provided. Analytics disabled.');
      return;
    }

    try {
      posthog.init(apiKey, {
        api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: false, // We'll handle this manually
        capture_pageleave: true,
        session_recording: {
          recordCrossOriginIframes: false,
          maskAllInputs: true,
          maskInputOptions: {
            password: true,
            email: false,
          }
        },
        autocapture: {
          dom_event_allowlist: ['click', 'change', 'submit'],
          url_allowlist: [window.location.origin]
        }
      });

      this.initialized = true;
      console.log('[Analytics] PostHog initialized successfully');

      // Track initial game load
      this.track({
        event: AnalyticsEvent.GAME_LOADED,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userAgent: navigator.userAgent,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      });

      // Set up session management
      this.setupSessionTracking();

    } catch (error) {
      console.error('[Analytics] Failed to initialize PostHog:', error);
    }
  }

  setUser(playerId: string, playerName: string) {
    this.playerId = playerId;
    this.playerName = playerName;
    
    if (this.initialized) {
      posthog.identify(playerId, {
        name: playerName,
        session_id: this.sessionId
      });
    }
  }

  track(eventData: AnalyticsEventData) {
    if (!this.initialized || ANALYTICS_CONFIG.PRIVACY_MODE) {
      return;
    }

    // Add session and player context
    const enrichedEvent = {
      ...eventData,
      sessionId: this.sessionId,
      playerId: this.playerId,
      playerName: this.playerName,
      timestamp: eventData.timestamp || Date.now()
    };

    try {
      // Send to PostHog
      posthog.capture(enrichedEvent.event, enrichedEvent);

      // Also queue for potential server-side backup
      this.eventQueue.push(enrichedEvent);
      this.flushQueueIfNeeded();

    } catch (error) {
      console.error('[Analytics] Failed to track event:', error);
      // Queue for retry
      this.eventQueue.push(enrichedEvent);
    }
  }

  trackPageView(path?: string) {
    if (!this.initialized) return;
    
    posthog.capture('$pageview', {
      $current_url: path || window.location.href,
      sessionId: this.sessionId
    });
  }

  // Convenience methods for common events
  trackSessionStart() {
    this.track({
      event: AnalyticsEvent.SESSION_START,
      timestamp: this.sessionStartTime,
      sessionId: this.sessionId
    });
  }

  trackSessionEnd() {
    const sessionDuration = Date.now() - this.sessionStartTime;
    this.track({
      event: AnalyticsEvent.SESSION_END,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      sessionDuration
    });
  }

  trackCharacterCreated(characterName: string) {
    this.track({
      event: AnalyticsEvent.CHARACTER_CREATED,
      timestamp: Date.now(),
      characterName,
      creationTime: Date.now()
    });
  }

  trackCombatStarted(mobType?: string, mobId?: string) {
    this.track({
      event: AnalyticsEvent.COMBAT_STARTED,
      timestamp: Date.now(),
      mobType,
      mobId
    });
  }

  trackShopTransaction(itemId: string, itemName: string, itemPrice: number, quantity: number = 1, success: boolean = true) {
    this.track({
      event: AnalyticsEvent.SHOP_TRANSACTION,
      timestamp: Date.now(),
      itemId,
      itemName,
      itemPrice,
      quantity,
      transactionSuccess: success
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupSessionTracking() {
    // Track session start
    this.trackSessionStart();

    // Track session end on page unload
    window.addEventListener('beforeunload', () => {
      this.trackSessionEnd();
    });

    // Track session end on visibility change (tab close/switch)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.trackSessionEnd();
      }
    });
  }

  private flushQueueIfNeeded() {
    if (this.eventQueue.length >= ANALYTICS_CONFIG.BATCH_SIZE) {
      this.flushQueue();
    }
  }

  private flushQueue() {
    if (this.eventQueue.length === 0) return;

    // Clear the queue (events already sent to PostHog)
    this.eventQueue = [];
  }

  // Feature flags support
  getFeatureFlag(flagKey: string): boolean | string | undefined {
    if (!this.initialized) return undefined;
    return posthog.getFeatureFlag(flagKey);
  }

  isFeatureEnabled(flagKey: string): boolean {
    if (!this.initialized) return false;
    return posthog.isFeatureEnabled(flagKey);
  }

  // A/B testing support
  getFeatureFlagPayload(flagKey: string): any {
    if (!this.initialized) return null;
    return posthog.getFeatureFlagPayload(flagKey);
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();