import metrics from './metrics-collector.js';
import { logger } from '../config/logger.js';
import { totalmem } from 'os';

class AlertingSystem {
  constructor() {
    this.thresholds = {
      errorRate: 0.01, // 1%
      p95Latency: 800, // 800ms
      memoryUsage: 0.8, // 80% of available memory
      cpuUsage: 0.8, // 80% CPU
      dbConnections: 0.9 // 90% of pool
    };
    
    this.alertHistory = new Map();
    this.cooldownPeriod = 300000; // 5 minutes
  }

  checkErrorRate(route, errorRate) {
    if (errorRate > this.thresholds.errorRate) {
      this.triggerAlert('HIGH_ERROR_RATE', {
        route,
        current: errorRate,
        threshold: this.thresholds.errorRate,
        severity: 'critical'
      });
    }
  }

  checkLatency(p95Latency, route) {
    if (p95Latency > this.thresholds.p95Latency) {
      this.triggerAlert('HIGH_LATENCY', {
        route,
        current: p95Latency,
        threshold: this.thresholds.p95Latency,
        severity: 'warning'
      });
    }
  }

  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const totalMemory = totalmem();
    const usagePercent = memUsage.heapUsed / totalMemory;

    if (usagePercent > this.thresholds.memoryUsage) {
      this.triggerAlert('HIGH_MEMORY', {
        current: (usagePercent * 100).toFixed(2) + '%',
        threshold: (this.thresholds.memoryUsage * 100) + '%',
        severity: 'warning'
      });
    }
  }

  checkSecurityIncidents(incidentType, count) {
    if (count > 0) {
      this.triggerAlert('SECURITY_INCIDENT', {
        type: incidentType,
        count,
        severity: 'critical'
      });
    }
  }

  triggerAlert(alertType, data) {
    const alertKey = `${alertType}_${data.route || 'global'}`;
    const now = Date.now();
    const lastAlert = this.alertHistory.get(alertKey);

    // Respect cooldown period
    if (lastAlert && (now - lastAlert) < this.cooldownPeriod) {
      return;
    }

    this.alertHistory.set(alertKey, now);

    const alert = {
      timestamp: new Date().toISOString(),
      type: alertType,
      severity: data.severity,
      data,
      id: this.generateAlertId()
    };

    // Log alert
    logger.warn('ALERT TRIGGERED', alert);

    // In production, you would:
    // - Send to Slack/Teams
    // - Send email/SMS
    // - Create PagerDuty incident
    // - Push to monitoring dashboard
    
    console.error(`🚨 [${alert.severity.toUpperCase()}] ${alertType}:`, alert.data);
  }

  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Health check for alerting system
  getHealth() {
    return {
      status: 'healthy',
      activeAlerts: this.alertHistory.size,
      thresholds: this.thresholds,
      lastCheck: new Date().toISOString()
    };
  }
}

export default new AlertingSystem();
