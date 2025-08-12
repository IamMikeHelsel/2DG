import type { LogEvent } from './index.js';

export class StructuredLogger {
  private service: 'server' | 'client';
  private sessionId?: string;
  private userId?: string;

  constructor(service: 'server' | 'client', sessionId?: string, userId?: string) {
    this.service = service;
    this.sessionId = sessionId;
    this.userId = userId;
  }

  setSession(sessionId: string, userId?: string) {
    this.sessionId = sessionId;
    this.userId = userId;
  }

  private createLogEvent(
    level: LogEvent['level'],
    event: string,
    metadata?: Record<string, any>
  ): LogEvent {
    return {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      event,
      userId: this.userId,
      sessionId: this.sessionId,
      metadata: metadata || {}
    };
  }

  info(event: string, metadata?: Record<string, any>) {
    this.log(this.createLogEvent('info', event, metadata));
  }

  warn(event: string, metadata?: Record<string, any>) {
    this.log(this.createLogEvent('warn', event, metadata));
  }

  error(event: string, metadata?: Record<string, any>) {
    this.log(this.createLogEvent('error', event, metadata));
  }

  debug(event: string, metadata?: Record<string, any>) {
    this.log(this.createLogEvent('debug', event, metadata));
  }

  private log(logEvent: LogEvent) {
    // Base implementation - can be extended for specific environments
    if (typeof window !== 'undefined') {
      // Client-side logging
      console.log(JSON.stringify(logEvent));
    } else {
      // Server-side logging 
      console.log(JSON.stringify(logEvent));
    }
  }

  // Performance logging helpers
  logPerformance(event: string, metrics: Record<string, number>) {
    this.info('performance_metric', {
      event,
      metrics,
      timestamp: Date.now()
    });
  }

  logUserAction(action: string, metadata?: Record<string, any>) {
    this.info('user_action', {
      action,
      ...metadata
    });
  }

  logNetworkEvent(event: string, rtt?: number, metadata?: Record<string, any>) {
    this.info('network_event', {
      event,
      rtt,
      ...metadata
    });
  }

  logGameEvent(event: string, gameData?: Record<string, any>) {
    this.info('game_event', {
      event,
      gameData
    });
  }

  logAlert(alertType: string, threshold: number, actual: number, metadata?: Record<string, any>) {
    this.warn('alert_triggered', {
      alertType,
      threshold,
      actual,
      severity: actual > threshold * 1.5 ? 'critical' : 'warning',
      ...metadata
    });
  }
}

export function createLogger(service: 'server' | 'client', sessionId?: string, userId?: string): StructuredLogger {
  return new StructuredLogger(service, sessionId, userId);
}