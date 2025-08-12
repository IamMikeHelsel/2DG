import * as Sentry from '@sentry/node';
import { PostHog } from 'posthog-node';
import pino from 'pino';
import { 
  StructuredLogger, 
  createLogger, 
  type PerformanceMetrics, 
  type AlertThresholds, 
  type MetricsCollection,
  DEFAULT_ALERT_THRESHOLDS 
} from '@toodee/shared';

export class ServerMonitoring {
  private logger: StructuredLogger;
  private pinoLogger: pino.Logger;
  private posthog?: PostHog;
  private metrics: MetricsCollection;
  private alertThresholds: AlertThresholds;
  private alertCooldowns: Map<string, number> = new Map();
  private alertCooldownDuration = 5 * 60 * 1000; // 5 minutes

  constructor(config?: {
    sentryDsn?: string;
    posthogApiKey?: string;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    alertThresholds?: Partial<AlertThresholds>;
  }) {
    this.logger = createLogger('server');
    this.alertThresholds = { ...DEFAULT_ALERT_THRESHOLDS, ...config?.alertThresholds };
    
    // Initialize Pino logger with structured format
    this.pinoLogger = pino({
      level: config?.logLevel || 'info',
      transport: process.env.NODE_ENV !== 'production' ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname'
        }
      } : undefined
    });

    // Initialize Sentry for error tracking
    if (config?.sentryDsn) {
      Sentry.init({
        dsn: config.sentryDsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      });
      this.logger.info('sentry_initialized');
    }

    // Initialize PostHog for analytics
    if (config?.posthogApiKey) {
      this.posthog = new PostHog(config.posthogApiKey, {
        host: 'https://us.posthog.com',
        flushAt: 20,
        flushInterval: 10000
      });
      this.logger.info('posthog_initialized');
    }

    // Initialize metrics collection
    this.metrics = {
      tickTimes: [],
      rttMeasurements: [],
      errorCount: 0,
      totalRequests: 0,
      memorySnapshots: [],
      fpsHistory: [],
      connectedUsers: 0,
      timestamp: Date.now()
    };

    this.logger.info('server_monitoring_initialized', {
      alertThresholds: this.alertThresholds
    });
  }

  // Performance monitoring
  recordTickTime(tickTime: number, playerCount: number) {
    this.metrics.tickTimes.push(tickTime);
    this.metrics.connectedUsers = playerCount;
    
    // Keep only last 1000 measurements
    if (this.metrics.tickTimes.length > 1000) {
      this.metrics.tickTimes.shift();
    }

    // Check for performance alerts
    if (this.metrics.tickTimes.length >= 100) {
      const sorted = [...this.metrics.tickTimes].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      const p95 = sorted[p95Index];
      
      if (p95 > this.alertThresholds.serverTickTimeP95) {
        this.triggerAlert('server_tick_time_p95', this.alertThresholds.serverTickTimeP95, p95, {
          playerCount,
          avgTickTime: this.metrics.tickTimes.reduce((a, b) => a + b, 0) / this.metrics.tickTimes.length
        });
      }
    }

    this.logger.logPerformance('server_tick', {
      tickTime,
      playerCount,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024
    });
  }

  recordNetworkRTT(rtt: number, sessionId?: string) {
    this.metrics.rttMeasurements.push(rtt);
    
    // Keep only last 500 measurements
    if (this.metrics.rttMeasurements.length > 500) {
      this.metrics.rttMeasurements.shift();
    }

    // Check RTT alerts
    if (this.metrics.rttMeasurements.length >= 50) {
      const sorted = [...this.metrics.rttMeasurements].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      const p95 = sorted[p95Index];
      
      if (p95 > this.alertThresholds.networkRTTP95) {
        this.triggerAlert('network_rtt_p95', this.alertThresholds.networkRTTP95, p95, { sessionId });
      }
    }

    this.logger.logNetworkEvent('rtt_measurement', rtt, { sessionId });
  }

  recordError(error: Error, context?: Record<string, any>) {
    this.metrics.errorCount++;
    this.metrics.totalRequests++; // Assuming error implies a request

    // Calculate error rate
    const errorRate = this.metrics.errorCount / this.metrics.totalRequests;
    if (errorRate > this.alertThresholds.errorRate && this.metrics.totalRequests > 100) {
      this.triggerAlert('error_rate', this.alertThresholds.errorRate, errorRate, {
        errorCount: this.metrics.errorCount,
        totalRequests: this.metrics.totalRequests
      });
    }

    // Log to structured logger
    this.logger.error('application_error', {
      message: error.message,
      stack: error.stack,
      ...context
    });

    // Send to Sentry
    Sentry.captureException(error, {
      tags: { service: 'server' },
      extra: context
    });
  }

  recordMemoryUsage() {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
    
    this.metrics.memorySnapshots.push(heapUsedMB);
    
    // Keep only last 100 snapshots
    if (this.metrics.memorySnapshots.length > 100) {
      this.metrics.memorySnapshots.shift();
    }

    // Check memory usage alerts
    const memoryUsageRatio = heapUsedMB / heapTotalMB;
    if (memoryUsageRatio > this.alertThresholds.memoryUsage) {
      this.triggerAlert('memory_usage', this.alertThresholds.memoryUsage, memoryUsageRatio, {
        heapUsedMB,
        heapTotalMB
      });
    }

    this.logger.logPerformance('memory_usage', {
      heapUsedMB,
      heapTotalMB,
      rss: memoryUsage.rss / 1024 / 1024,
      external: memoryUsage.external / 1024 / 1024
    });

    return { heapUsedMB, heapTotalMB, memoryUsageRatio };
  }

  // Analytics
  trackUserEvent(userId: string, event: string, properties?: Record<string, any>) {
    if (this.posthog) {
      this.posthog.capture({
        distinctId: userId,
        event,
        properties: {
          service: 'server',
          timestamp: Date.now(),
          ...properties
        }
      });
    }

    this.logger.logUserAction(event, { userId, ...properties });
  }

  trackGameEvent(event: string, gameData?: Record<string, any>, userId?: string) {
    if (this.posthog && userId) {
      this.posthog.capture({
        distinctId: userId,
        event: `game_${event}`,
        properties: {
          service: 'server',
          ...gameData
        }
      });
    }

    this.logger.logGameEvent(event, gameData);
  }

  // Alerting
  private triggerAlert(alertType: string, threshold: number, actual: number, metadata?: Record<string, any>) {
    const now = Date.now();
    const lastAlert = this.alertCooldowns.get(alertType) || 0;
    
    // Respect cooldown to avoid spam
    if (now - lastAlert < this.alertCooldownDuration) {
      return;
    }

    this.alertCooldowns.set(alertType, now);
    this.logger.logAlert(alertType, threshold, actual, metadata);

    // In a real implementation, this would send to Slack, email, etc.
    this.pinoLogger.warn({
      alert: alertType,
      threshold,
      actual,
      severity: actual > threshold * 1.5 ? 'critical' : 'warning',
      metadata
    }, `🚨 Alert: ${alertType} exceeded threshold`);
  }

  // Health check data
  getHealthStatus() {
    const memoryUsage = process.memoryUsage();
    const now = Date.now();
    
    return {
      status: 'healthy',
      timestamp: now,
      uptime: process.uptime(),
      memory: {
        heapUsed: memoryUsage.heapUsed / 1024 / 1024,
        heapTotal: memoryUsage.heapTotal / 1024 / 1024,
        rss: memoryUsage.rss / 1024 / 1024
      },
      metrics: {
        connectedUsers: this.metrics.connectedUsers,
        totalRequests: this.metrics.totalRequests,
        errorCount: this.metrics.errorCount,
        errorRate: this.metrics.totalRequests > 0 ? this.metrics.errorCount / this.metrics.totalRequests : 0
      },
      performance: this.getPerformanceStats()
    };
  }

  getMetrics(): PerformanceMetrics {
    const memoryUsage = process.memoryUsage();
    const tickStats = this.getTickStats();
    const rttStats = this.getRTTStats();
    
    return {
      serverTickTime: tickStats.p95,
      networkRTT: rttStats.p95,
      memoryUsage: memoryUsage.heapUsed / 1024 / 1024,
      playerCount: this.metrics.connectedUsers,
      timestamp: Date.now()
    };
  }

  private getPerformanceStats() {
    return {
      tick: this.getTickStats(),
      rtt: this.getRTTStats(),
      memory: {
        current: this.metrics.memorySnapshots[this.metrics.memorySnapshots.length - 1] || 0,
        average: this.metrics.memorySnapshots.length > 0 
          ? this.metrics.memorySnapshots.reduce((a, b) => a + b, 0) / this.metrics.memorySnapshots.length 
          : 0
      }
    };
  }

  private getTickStats() {
    if (this.metrics.tickTimes.length === 0) {
      return { avg: 0, p95: 0, max: 0, count: 0 };
    }

    const sorted = [...this.metrics.tickTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    
    return {
      avg: this.metrics.tickTimes.reduce((a, b) => a + b, 0) / this.metrics.tickTimes.length,
      p95: sorted[p95Index] || 0,
      max: Math.max(...this.metrics.tickTimes),
      count: this.metrics.tickTimes.length
    };
  }

  private getRTTStats() {
    if (this.metrics.rttMeasurements.length === 0) {
      return { avg: 0, p95: 0, max: 0, count: 0 };
    }

    const sorted = [...this.metrics.rttMeasurements].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    
    return {
      avg: this.metrics.rttMeasurements.reduce((a, b) => a + b, 0) / this.metrics.rttMeasurements.length,
      p95: sorted[p95Index] || 0,
      max: Math.max(...this.metrics.rttMeasurements),
      count: this.metrics.rttMeasurements.length
    };
  }

  // Cleanup
  async shutdown() {
    if (this.posthog) {
      await this.posthog.shutdown();
    }
    this.logger.info('server_monitoring_shutdown');
  }
}

export function createServerMonitoring(config?: Parameters<typeof ServerMonitoring.prototype.constructor>[0]) {
  return new ServerMonitoring(config);
}