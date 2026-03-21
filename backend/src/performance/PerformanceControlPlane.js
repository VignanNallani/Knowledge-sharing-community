// Central Performance Control Plane
// Organization-wide performance governance and intelligence

import EventEmitter from 'events';
import fs from 'fs/promises';
import path from 'path';

class PerformanceControlPlane extends EventEmitter {
  constructor() {
    super();
    
    this.baselineRegistry = new Map(); // service -> baseline data
    this.contractRegistry = new Map();   // service -> contract
    this.telemetryIngestor = new TelemetryIngestor();
    this.anomalyDetector = new CrossServiceAnomalyDetector();
    this.governanceEngine = new GovernanceEngine();
    
    // Initialize
    this.loadContracts();
    this.startIngestion();
    this.startGovernance();
  }

  // Load all service contracts
  async loadContracts() {
    const contractsDir = './performance-contracts';
    
    try {
      const files = await fs.readdir(contractsDir);
      const yamlFiles = files.filter(f => f.endsWith('.yaml'));
      
      for (const file of yamlFiles) {
        const contractPath = path.join(contractsDir, file);
        const contract = await this.loadContract(contractPath);
        this.contractRegistry.set(contract.service, contract);
        
        console.log(`📋 Loaded contract: ${contract.service} v${contract.version}`);
      }
      
      console.log(`✅ Loaded ${this.contractRegistry.size} performance contracts`);
      
    } catch (error) {
      console.error('❌ Failed to load contracts:', error.message);
    }
  }

  async loadContract(contractPath) {
    // In production, this would parse YAML
    // For now, return mock contract
    const serviceName = path.basename(contractPath, '.yaml');
    
    return {
      service: serviceName,
      version: '1.0.0',
      latency_budget: {
        p50: 40,
        p95: 120,
        p99: 250
      },
      error_budget: {
        max_rate: 0.001
      },
      resource_budgets: {
        db_query_time: 250,
        middleware_overhead: 10
      }
    };
  }

  // Start telemetry ingestion from all services
  startIngestion() {
    this.telemetryIngestor.on('telemetry', (data) => {
      this.processTelemetry(data);
    });
    
    this.telemetryIngestor.start();
    console.log('📡 Started telemetry ingestion');
  }

  // Process incoming telemetry data
  processTelemetry(data) {
    const { service, metrics } = data;
    
    // Update baseline registry
    this.updateBaseline(service, metrics);
    
    // Check for anomalies
    const anomalies = this.anomalyDetector.detect(service, metrics);
    
    if (anomalies.length > 0) {
      this.handleAnomalies(service, anomalies);
    }
    
    // Emit for downstream processing
    this.emit('telemetry_processed', { service, metrics, anomalies });
  }

  // Update baseline data for service
  updateBaseline(service, metrics) {
    if (!this.baselineRegistry.has(service)) {
      this.baselineRegistry.set(service, {
        service,
        baseline: metrics,
        history: [],
        lastUpdated: Date.now()
      });
    }
    
    const serviceData = this.baselineRegistry.get(service);
    serviceData.history.push({
      timestamp: Date.now(),
      metrics
    });
    
    // Keep only last 24 hours of history
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    serviceData.history = serviceData.history.filter(h => h.timestamp > cutoff);
    
    serviceData.lastUpdated = Date.now();
  }

  // Handle detected anomalies
  handleAnomalies(service, anomalies) {
    console.log(`🚨 Anomalies detected in ${service}:`, anomalies);
    
    // Check for cross-service patterns
    const crossServicePatterns = this.detectCrossServicePatterns(service, anomalies);
    
    if (crossServicePatterns.length > 0) {
      console.log(`🔗 Cross-service patterns detected:`, crossServicePatterns);
      this.emit('cross_service_anomaly', {
        primaryService: service,
        anomalies,
        patterns: crossServicePatterns
      });
    }
    
    // Trigger governance actions
    this.governanceEngine.evaluate(service, anomalies);
  }

  // Detect patterns across multiple services
  detectCrossServicePatterns(primaryService, anomalies) {
    const patterns = [];
    const now = Date.now();
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    
    // Check for similar anomalies in other services
    for (const [service, data] of this.baselineRegistry.entries()) {
      if (service === primaryService) continue;
      
      const recentHistory = data.history.filter(h => now - h.timestamp < timeWindow);
      
      for (const record of recentHistory) {
        const similarAnomalies = this.findSimilarAnomalies(anomalies, record.metrics);
        
        if (similarAnomalies.length > 0) {
          patterns.push({
            type: 'concurrent_anomaly',
            services: [primaryService, service],
            anomalies: similarAnomalies,
            timeframe: timeWindow
          });
        }
      }
    }
    
    return patterns;
  }

  findSimilarAnomalies(anomalies1, metrics2) {
    // Simplified similarity detection
    // In production, this would use more sophisticated algorithms
    return anomalies1.filter(anomaly => {
      return this.isAnomalyInMetrics(anomaly, metrics2);
    });
  }

  isAnomalyInMetrics(anomaly, metrics) {
    switch (anomaly.type) {
      case 'latency_spike':
        return metrics.duration > anomaly.baseline * 1.5;
      case 'error_rate_spike':
        return metrics.error_rate > anomaly.baseline * 2;
      default:
        return false;
    }
  }

  // Start governance engine
  startGovernance() {
    this.governanceEngine.on('action_required', (action) => {
      this.executeGovernanceAction(action);
    });
    
    this.governanceEngine.start();
    console.log('⚖️ Started governance engine');
  }

  executeGovernanceAction(action) {
    console.log(`⚖️ Executing governance action: ${action.type} for ${action.service}`);
    
    switch (action.type) {
      case 'block_merge':
        this.blockMerge(action);
        break;
      case 'escalate':
        this.escalate(action);
        break;
      case 'auto_heal':
        this.triggerAutoHealing(action);
        break;
      case 'require_review':
        this.requireReview(action);
        break;
    }
  }

  blockMerge(action) {
    // In production, this would block the PR/merge
    console.log(`🚫 Blocking merge for ${action.service}: ${action.reason}`);
    
    // Emit for CI integration
    this.emit('merge_blocked', {
      service: action.service,
      reason: action.reason,
      evidence: action.evidence,
      timestamp: Date.now()
    });
  }

  escalate(action) {
    console.log(`🚨 Escalating ${action.service}: ${action.reason}`);
    
    // Emit for alerting/paging
    this.emit('escalation', {
      service: action.service,
      severity: action.severity,
      reason: action.reason,
      evidence: action.evidence,
      timestamp: Date.now()
    });
  }

  triggerAutoHealing(action) {
    console.log(`🔧 Triggering auto-healing for ${action.service}: ${action.reason}`);
    
    // Emit for auto-healing system
    this.emit('auto_heal', {
      service: action.service,
      action: action.recommendedAction,
      evidence: action.evidence,
      timestamp: Date.now()
    });
  }

  requireReview(action) {
    console.log(`📋 Requiring review for ${action.service}: ${action.reason}`);
    
    // Emit for review process
    this.emit('review_required', {
      service: action.service,
      reviewers: action.reviewers,
      reason: action.reason,
      evidence: action.evidence,
      deadline: action.deadline,
      timestamp: Date.now()
    });
  }

  // Get organizational performance overview
  getOrgOverview() {
    const services = Array.from(this.contractRegistry.keys());
    const overview = {
      total_services: services.length,
      services_with_contracts: this.contractRegistry.size,
      services_with_baselines: this.baselineRegistry.size,
      recent_anomalies: this.getRecentAnomalies(),
      compliance_status: this.getComplianceStatus(),
      performance_trends: this.getPerformanceTrends()
    };
    
    return overview;
  }

  getRecentAnomalies() {
    // Return anomalies from last 24 hours
    const anomalies = [];
    const now = Date.now();
    const cutoff = now - (24 * 60 * 60 * 1000);
    
    // This would aggregate from telemetry storage
    return anomalies;
  }

  getComplianceStatus() {
    const compliance = {
      compliant: 0,
      non_compliant: 0,
      pending_review: 0
    };
    
    // Check each service against its contract
    for (const [service, contract] of this.contractRegistry.entries()) {
      const baseline = this.baselineRegistry.get(service);
      
      if (!baseline) {
        compliance.pending_review++;
        continue;
      }
      
      const isCompliant = this.checkServiceCompliance(service, contract, baseline);
      
      if (isCompliant) {
        compliance.compliant++;
      } else {
        compliance.non_compliant++;
      }
    }
    
    return compliance;
  }

  checkServiceCompliance(service, contract, baseline) {
    // Simplified compliance check
    const latestMetrics = baseline.history[baseline.history.length - 1]?.metrics;
    
    if (!latestMetrics) return false;
    
    // Check latency compliance
    if (latestMetrics.duration > contract.latency_budget.p95) {
      return false;
    }
    
    // Check error rate compliance
    if (latestMetrics.error_rate > contract.error_budget.max_rate) {
      return false;
    }
    
    return true;
  }

  getPerformanceTrends() {
    const trends = {};
    
    for (const [service, data] of this.baselineRegistry.entries()) {
      if (data.history.length < 2) continue;
      
      const recent = data.history.slice(-24); // Last 24 data points
      const older = data.history.slice(-48, -24); // Previous 24 data points
      
      if (older.length === 0) continue;
      
      const recentAvg = recent.reduce((sum, h) => sum + h.metrics.duration, 0) / recent.length;
      const olderAvg = older.reduce((sum, h) => sum + h.metrics.duration, 0) / older.length;
      
      trends[service] = {
        trend: recentAvg > olderAvg ? 'degrading' : 'improving',
        change_percent: ((recentAvg - olderAvg) / olderAvg) * 100,
        recent_avg: recentAvg,
        older_avg: olderAvg
      };
    }
    
    return trends;
  }

  // Public API
  getServiceContract(service) {
    return this.contractRegistry.get(service);
  }

  getServiceBaseline(service) {
    return this.baselineRegistry.get(service);
  }

  getAllContracts() {
    return Array.from(this.contractRegistry.values());
  }
}

// Supporting classes

class TelemetryIngestor extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
  }

  start() {
    this.isRunning = true;
    console.log('📡 Telemetry ingestor started');
    
    // Simulate receiving telemetry from services
    this.simulateIngestion();
  }

  simulateIngestion() {
    if (!this.isRunning) return;
    
    // Simulate receiving telemetry every 5 seconds
    setTimeout(() => {
      const services = ['payments-api', 'user-service', 'orders-api'];
      const randomService = services[Math.floor(Math.random() * services.length)];
      
      const telemetry = {
        service: randomService,
        metrics: {
          duration: 50 + Math.random() * 200,
          error_rate: Math.random() * 0.01,
          timestamp: Date.now()
        }
      };
      
      this.emit('telemetry', telemetry);
      
      // Continue simulation
      this.simulateIngestion();
    }, 5000);
  }

  stop() {
    this.isRunning = false;
  }
}

class CrossServiceAnomalyDetector {
  detect(service, metrics) {
    const anomalies = [];
    
    // Simple anomaly detection
    if (metrics.duration > 150) {
      anomalies.push({
        type: 'latency_spike',
        severity: metrics.duration > 300 ? 'high' : 'medium',
        baseline: 100,
        current: metrics.duration
      });
    }
    
    if (metrics.error_rate > 0.005) {
      anomalies.push({
        type: 'error_rate_spike',
        severity: metrics.error_rate > 0.01 ? 'high' : 'medium',
        baseline: 0.001,
        current: metrics.error_rate
      });
    }
    
    return anomalies;
  }
}

class GovernanceEngine extends EventEmitter {
  constructor() {
    super();
    this.rules = this.initializeRules();
  }

  initializeRules() {
    return [
      {
        name: 'block_merge_on_regression',
        condition: (service, anomalies) => {
          return anomalies.some(a => a.type === 'latency_spike' && a.severity === 'high');
        },
        action: 'block_merge',
        severity: 'high'
      },
      
      {
        name: 'escalate_repeated_violations',
        condition: (service, anomalies) => {
          // This would check historical violations
          return anomalies.some(a => a.type === 'error_rate_spike');
        },
        action: 'escalate',
        severity: 'medium'
      },
      
      {
        name: 'auto_heal_simple_issues',
        condition: (service, anomalies) => {
          return anomalies.length === 1 && anomalies[0].severity === 'medium';
        },
        action: 'auto_heal',
        severity: 'low'
      }
    ];
  }

  start() {
    console.log('⚖️ Governance engine started with rules:', this.rules.length);
  }

  evaluate(service, anomalies) {
    for (const rule of this.rules) {
      if (rule.condition(service, anomalies)) {
        this.emit('action_required', {
          type: rule.action,
          service,
          anomalies,
          rule: rule.name,
          severity: rule.severity,
          evidence: anomalies
        });
        
        // Only apply the first matching rule
        break;
      }
    }
  }
}

export default new PerformanceControlPlane();
