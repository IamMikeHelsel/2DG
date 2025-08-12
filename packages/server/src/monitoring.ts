// Live operations monitoring and logging system
export interface IncidentReport {
  id: string;
  type: 'server_crash' | 'database_error' | 'ddos_attack' | 'economy_exploit' | 'mass_disconnect' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: number;
  reportedBy?: string;
  status: 'open' | 'investigating' | 'mitigating' | 'resolved' | 'closed';
  assignee?: string;
  resolution?: string;
  resolvedAt?: number;
  tags: string[];
}

export interface SystemMetrics {
  timestamp: number;
  playerCount: number;
  roomCount: number;
  avgTickTime: number;
  maxTickTime: number;
  memoryUsage: number;
  cpuUsage?: number;
  networkLatency?: number;
}

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  createdAt: number;
  modifiedAt: number;
  modifiedBy: string;
  rolloutPercentage?: number; // For gradual rollouts
  conditions?: {
    adminOnly?: boolean;
    founderTierRequired?: string;
    playerCountMax?: number;
    playerCountMin?: number;
  };
}

export class LiveOpsMonitor {
  private incidents: IncidentReport[] = [];
  private metrics: SystemMetrics[] = [];
  private featureFlags = new Map<string, FeatureFlag>();
  private alerts: string[] = [];
  private lastHealthCheck = 0;

  constructor() {
    this.initializeDefaultFlags();
  }

  private initializeDefaultFlags() {
    const defaultFlags: FeatureFlag[] = [
      {
        name: 'chat_enabled',
        enabled: true,
        description: 'Enable chat system',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        modifiedBy: 'system'
      },
      {
        name: 'shop_enabled',
        enabled: true,
        description: 'Enable shop/merchant system',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        modifiedBy: 'system'
      },
      {
        name: 'pvp_enabled',
        enabled: true,
        description: 'Enable player vs player combat',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        modifiedBy: 'system'
      },
      {
        name: 'admin_commands_enabled',
        enabled: true,
        description: 'Enable admin command system',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        modifiedBy: 'system'
      },
      {
        name: 'founder_rewards_enabled',
        enabled: true,
        description: 'Enable founder rewards system',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        modifiedBy: 'system'
      }
    ];

    defaultFlags.forEach(flag => {
      this.featureFlags.set(flag.name, flag);
    });
  }

  // Incident Management
  reportIncident(incident: Omit<IncidentReport, 'id' | 'timestamp' | 'status'>): string {
    const id = `incident_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const report: IncidentReport = {
      id,
      timestamp: Date.now(),
      status: 'open',
      ...incident
    };

    this.incidents.push(report);
    this.logAlert(`NEW INCIDENT [${incident.severity.toUpperCase()}]: ${incident.title}`);
    
    // Auto-assign based on severity
    if (incident.severity === 'critical') {
      this.logAlert(`🚨 CRITICAL INCIDENT: ${incident.title} - Immediate attention required!`);
    }

    return id;
  }

  updateIncident(id: string, updates: Partial<IncidentReport>): boolean {
    const incident = this.incidents.find(i => i.id === id);
    if (!incident) return false;

    Object.assign(incident, updates);
    
    if (updates.status === 'resolved') {
      incident.resolvedAt = Date.now();
      this.logAlert(`✅ INCIDENT RESOLVED: ${incident.title}`);
    }

    return true;
  }

  getIncidents(status?: string): IncidentReport[] {
    if (status) {
      return this.incidents.filter(i => i.status === status);
    }
    return [...this.incidents].sort((a, b) => b.timestamp - a.timestamp);
  }

  // Metrics Collection
  recordMetrics(metrics: SystemMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only last 1000 metrics to prevent memory bloat
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Check for performance alerts
    this.checkPerformanceAlerts(metrics);
  }

  private checkPerformanceAlerts(metrics: SystemMetrics): void {
    // High tick time alert
    if (metrics.maxTickTime > 50) {
      this.logAlert(`⚠️ High server tick time: ${metrics.maxTickTime.toFixed(2)}ms`);
    }

    // High player count alert
    if (metrics.playerCount > 70) {
      this.logAlert(`📈 High player count: ${metrics.playerCount} players`);
    }

    // Low player count alert (potential issue)
    if (metrics.playerCount === 0 && this.metrics.length > 10) {
      const recentMetrics = this.metrics.slice(-10);
      const allZero = recentMetrics.every(m => m.playerCount === 0);
      if (allZero) {
        this.logAlert(`📉 No players for extended period - potential connection issues`);
      }
    }
  }

  getMetrics(limit = 100): SystemMetrics[] {
    return this.metrics.slice(-limit);
  }

  // Feature Flag Management
  setFeatureFlag(name: string, enabled: boolean, modifiedBy: string, description?: string): void {
    const existing = this.featureFlags.get(name);
    const flag: FeatureFlag = {
      name,
      enabled,
      description: description || existing?.description || `Feature flag: ${name}`,
      createdAt: existing?.createdAt || Date.now(),
      modifiedAt: Date.now(),
      modifiedBy
    };

    this.featureFlags.set(name, flag);
    this.logAlert(`🏁 Feature flag '${name}' ${enabled ? 'ENABLED' : 'DISABLED'} by ${modifiedBy}`);
  }

  isFeatureEnabled(name: string, context?: { 
    playerId?: string, 
    playerRole?: string, 
    playerCount?: number 
  }): boolean {
    const flag = this.featureFlags.get(name);
    if (!flag) return false;

    if (!flag.enabled) return false;

    // Check conditions if they exist
    if (flag.conditions && context) {
      if (flag.conditions.adminOnly && context.playerRole === 'none') {
        return false;
      }

      if (flag.conditions.playerCountMax && context.playerCount && context.playerCount > flag.conditions.playerCountMax) {
        return false;
      }

      if (flag.conditions.playerCountMin && context.playerCount && context.playerCount < flag.conditions.playerCountMin) {
        return false;
      }
    }

    // Handle rollout percentage
    if (flag.rolloutPercentage && flag.rolloutPercentage < 100) {
      const hash = this.hashString(context?.playerId || '');
      return (hash % 100) < flag.rolloutPercentage;
    }

    return true;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  getFeatureFlags(): FeatureFlag[] {
    return Array.from(this.featureFlags.values());
  }

  // Health Checks
  performHealthCheck(playerCount: number, avgTickTime: number): { 
    status: 'healthy' | 'warning' | 'critical', 
    issues: string[] 
  } {
    this.lastHealthCheck = Date.now();
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check tick performance
    if (avgTickTime > 20) {
      issues.push(`High average tick time: ${avgTickTime.toFixed(2)}ms`);
      status = 'warning';
    }

    if (avgTickTime > 50) {
      issues.push(`Critical tick time: ${avgTickTime.toFixed(2)}ms`);
      status = 'critical';
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    
    if (heapUsedMB > 100) {
      issues.push(`High memory usage: ${heapUsedMB.toFixed(1)}MB`);
      if (status !== 'critical') status = 'warning';
    }

    if (heapUsedMB > 200) {
      issues.push(`Critical memory usage: ${heapUsedMB.toFixed(1)}MB`);
      status = 'critical';
    }

    // Check for open critical incidents
    const criticalIncidents = this.incidents.filter(i => 
      i.severity === 'critical' && 
      (i.status === 'open' || i.status === 'investigating')
    );

    if (criticalIncidents.length > 0) {
      issues.push(`${criticalIncidents.length} critical incident(s) open`);
      status = 'critical';
    }

    return { status, issues };
  }

  // Alert Management
  private logAlert(message: string): void {
    const timestamp = new Date().toISOString();
    const alertMsg = `[${timestamp}] ${message}`;
    
    this.alerts.push(alertMsg);
    console.log(`[LIVE-OPS] ${alertMsg}`);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  getAlerts(limit = 50): string[] {
    return this.alerts.slice(-limit).reverse();
  }

  // Graceful Shutdown
  initiateGracefulShutdown(reason: string, delayMs = 30000): void {
    this.logAlert(`🛑 Graceful shutdown initiated: ${reason} (${delayMs}ms delay)`);
    
    // This would broadcast to all connected clients
    console.log(`[SHUTDOWN] Server shutting down in ${delayMs}ms: ${reason}`);
    
    setTimeout(() => {
      this.logAlert(`🛑 Server shutdown completed: ${reason}`);
      process.exit(0);
    }, delayMs);
  }

  // Generate Status Report
  generateStatusReport(): {
    timestamp: number;
    health: ReturnType<LiveOpsMonitor['performHealthCheck']>;
    incidents: { open: number; critical: number; total: number };
    metrics: { latest: SystemMetrics | null; avg24h: Partial<SystemMetrics> | null };
    featureFlags: { total: number; enabled: number; disabled: number };
    alerts: number;
  } {
    const health = this.performHealthCheck(
      this.metrics[this.metrics.length - 1]?.playerCount || 0,
      this.metrics[this.metrics.length - 1]?.avgTickTime || 0
    );

    const incidents = {
      open: this.incidents.filter(i => i.status === 'open').length,
      critical: this.incidents.filter(i => i.severity === 'critical' && i.status !== 'resolved').length,
      total: this.incidents.length
    };

    const latest = this.metrics[this.metrics.length - 1] || null;
    const last24h = this.metrics.filter(m => Date.now() - m.timestamp < 24 * 60 * 60 * 1000);
    const avg24h = last24h.length > 0 ? {
      playerCount: Math.round(last24h.reduce((sum, m) => sum + m.playerCount, 0) / last24h.length),
      avgTickTime: last24h.reduce((sum, m) => sum + m.avgTickTime, 0) / last24h.length,
      memoryUsage: last24h.reduce((sum, m) => sum + m.memoryUsage, 0) / last24h.length
    } : null;

    const flags = Array.from(this.featureFlags.values());
    const featureFlags = {
      total: flags.length,
      enabled: flags.filter(f => f.enabled).length,
      disabled: flags.filter(f => !f.enabled).length
    };

    return {
      timestamp: Date.now(),
      health,
      incidents,
      metrics: { latest, avg24h },
      featureFlags,
      alerts: this.alerts.length
    };
  }
}