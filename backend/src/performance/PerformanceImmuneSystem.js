// Performance Immune System - Main Orchestrator
import BaselineEngine from './BaselineEngine.js';
import RegressionSentinel from './RegressionSentinel.js';
import AnomalyDetector from './AnomalyDetector.js';
import AutoIsolationRunner from './AutoIsolationRunner.js';
import ControlledSelfHealing from './ControlledSelfHealing.js';

class PerformanceImmuneSystem {
  constructor() {
    this.baselineEngine = new BaselineEngine();
    this.regressionSentinel = new RegressionSentinel();
    this.anomalyDetector = new AnomalyDetector();
    this.autoIsolation = new AutoIsolationRunner();
    this.selfHealing = new ControlledSelfHealing();
    
    this.isRunning = false;
    this.mode = process.env.PERFORMANCE_MODE || 'monitoring'; // monitoring, testing, healing
    
    console.log('🛡️ Performance Immune System initialized');
    console.log(`📊 Mode: ${this.mode}`);
  }

  // Start the immune system
  async start() {
    if (this.isRunning) {
      console.log('⚠️ Performance Immune System already running');
      return;
    }
    
    this.isRunning = true;
    console.log('🚀 Starting Performance Immune System...');
    
    try {
      // Initialize baseline if needed
      await this.initializeBaseline();
      
      // Start continuous monitoring
      this.startContinuousMonitoring();
      
      // Setup request interception
      this.setupRequestInterception();
      
      console.log('✅ Performance Immune System active');
      console.log('📡 System will automatically detect, isolate, and heal performance issues');
      
    } catch (error) {
      console.error('❌ Failed to start Performance Immune System:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async initializeBaseline() {
    const baseline = await this.baselineEngine.loadBaseline();
    if (!baseline) {
      console.log('📊 No baseline found, capturing initial baseline...');
      await this.baselineEngine.captureBaseline();
    } else {
      console.log('✅ Baseline loaded successfully');
    }
  }

  startContinuousMonitoring() {
    // Setup periodic monitoring
    setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds
    
    // Setup anomaly detection integration
    this.anomalyDetector.on('anomaly', (data) => {
      console.log('🚨 Anomaly detected - Auto-isolation initiated');
    });
    
    this.anomalyDetector.on('critical_anomaly', (data) => {
      console.log('🚨 Critical anomaly - Immediate healing triggered');
    });
  }

  setupRequestInterception() {
    // This would integrate with the actual request handling
    // For now, simulate with periodic requests
    this.simulateRequestMonitoring();
  }

  simulateRequestMonitoring() {
    setInterval(async () => {
      if (Math.random() < 0.1) { // 10% chance of simulated request
        const latency = await this.measureRequestLatency();
        const statusCode = latency < 1000 ? 200 : 500;
        
        this.anomalyDetector.recordRequest(latency, statusCode);
      }
    }, 5000); // Every 5 seconds
  }

  async measureRequestLatency() {
    const startTime = Date.now();
    
    try {
      const response = await fetch('http://localhost:4000/api/v1/posts');
      return Date.now() - startTime;
    } catch (error) {
      return 2000; // Simulate high latency on error
    }
  }

  performHealthCheck() {
    const status = this.getSystemStatus();
    
    console.log('💓 Health Check:', {
      mode: this.mode,
      anomalies_last_hour: status.anomaly_detector.anomaly_count,
      last_healing: status.self_healing.last_healing ? 
        new Date(status.self_healing.last_healing.timestamp).toLocaleTimeString() : 'none',
      system_health: this.calculateSystemHealth(status)
    });
    
    // Auto-healing considerations
    if (this.mode === 'healing') {
      this.considerAutoHealing(status);
    }
  }

  considerAutoHealing(status) {
    // This delegates to the self-healing system
    // The self-healing system already listens to anomaly events
    // This is just additional logic for complex scenarios
    if (status.anomaly_detector.anomaly_count > 5) { // Multiple anomalies
      console.log('🚨 Multiple anomalies detected - considering system-wide healing');
    }
  }

  calculateSystemHealth(status) {
    let healthScore = 100;
    
    // Deduct points for anomalies
    healthScore -= status.anomaly_detector.anomaly_count * 10;
    
    // Deduct points for recent failed healings
    const recentHealings = status.self_healing.healing_history
      .filter(h => Date.now() - h.timestamp < 3600000) // Last hour
      .filter(h => h.status === 'failed');
    
    healthScore -= recentHealings.length * 20;
    
    return Math.max(0, healthScore);
  }

  // Public API methods
  async runPerformanceTest() {
    console.log('🧪 Running manual performance test...');
    return await this.regressionSentinel.validatePR();
  }

  async captureNewBaseline() {
    console.log('📊 Capturing new performance baseline...');
    return await this.baselineEngine.captureBaseline();
  }

  async enableHealingMode() {
    this.mode = 'healing';
    console.log('🛡️ Healing mode enabled - Auto-corrections active');
  }

  async enableMonitoringOnlyMode() {
    this.mode = 'monitoring';
    console.log('📊 Monitoring-only mode enabled - No auto-corrections');
  }

  getSystemStatus() {
    return {
      is_running: this.isRunning,
      mode: this.mode,
      baseline: this.baselineEngine.currentBaseline,
      anomaly_detector: this.anomalyDetector.getStatus(),
      auto_isolation: this.autoIsolation.getStatus(),
      self_healing: this.selfHealing.getStatus(),
      regression_sentinel: {
        last_check: 'not_run', // Would be populated by actual PR checks
        status: 'ready'
      }
    };
  }

  async generateReport() {
    const status = this.getSystemStatus();
    
    const report = {
      timestamp: new Date().toISOString(),
      system: 'Performance Immune System',
      version: '1.0.0',
      status,
      summary: {
        overall_health: this.calculateSystemHealth(status),
        active_protections: this.getActiveProtections(),
        recent_activity: this.getRecentActivity(status)
      },
      recommendations: this.generateRecommendations(status)
    };
    
    await this.saveReport(report);
    return report;
  }

  getActiveProtections() {
    const protections = [];
    
    if (this.anomalyDetector.samples.length > 0) {
      protections.push('Anomaly Detection');
    }
    
    if (this.autoIsolation.isolationInProgress) {
      protections.push('Auto-Isolation');
    }
    
    if (this.selfHealing.healingHistory.length > 0) {
      protections.push('Self-Healing');
    }
    
    return protections;
  }

  getRecentActivity(status) {
    const activities = [];
    
    if (status.anomaly_detector.last_anomaly) {
      activities.push({
        type: 'anomaly',
        time: new Date(status.anomaly_detector.last_anomaly.timestamp).toLocaleTimeString(),
        details: `${status.anomaly_detector.anomaly_count} anomalies detected`
      });
    }
    
    if (status.self_healing.last_healing) {
      activities.push({
        type: 'healing',
        time: new Date(status.self_healing.last_healing.timestamp).toLocaleTimeString(),
        details: `${status.self_healing.last_healing.action} applied`
      });
    }
    
    return activities;
  }

  generateRecommendations(status) {
    const recommendations = [];
    
    if (status.anomaly_detector.anomaly_count > 3) {
      recommendations.push({
        priority: 'high',
        action: 'Consider enabling healing mode',
        reason: 'Multiple anomalies detected'
      });
    }
    
    if (!status.baseline) {
      recommendations.push({
        priority: 'medium',
        action: 'Capture performance baseline',
        reason: 'No baseline established'
      });
    }
    
    if (status.self_healing.healing_history.filter(h => h.status === 'failed').length > 2) {
      recommendations.push({
        priority: 'high',
        action: 'Manual investigation required',
        reason: 'Multiple failed healing attempts'
      });
    }
    
    return recommendations;
  }

  async saveReport(report) {
    const filename = `performance-report-${Date.now()}.json`;
    await fs.writeFile(filename, JSON.stringify(report, null, 2));
    console.log(`📋 Report saved: ${filename}`);
  }

  // Graceful shutdown
  async stop() {
    console.log('🛑 Stopping Performance Immune System...');
    this.isRunning = false;
    
    // Generate final report
    const report = await this.generateReport();
    console.log('📋 Final report generated');
    
    console.log('✅ Performance Immune System stopped');
  }
}

// CLI interface for manual control
async function main() {
  const command = process.argv[2];
  const immuneSystem = new PerformanceImmuneSystem();
  
  switch (command) {
    case 'start':
      await immuneSystem.start();
      break;
      
    case 'status':
      const status = immuneSystem.getSystemStatus();
      console.log(JSON.stringify(status, null, 2));
      break;
      
    case 'test':
      await immuneSystem.runPerformanceTest();
      break;
      
    case 'baseline':
      await immuneSystem.captureNewBaseline();
      break;
      
    case 'healing':
      await immuneSystem.enableHealingMode();
      break;
      
    case 'monitoring':
      await immuneSystem.enableMonitoringOnlyMode();
      break;
      
    case 'report':
      const report = await immuneSystem.generateReport();
      console.log(JSON.stringify(report, null, 2));
      break;
      
    case 'stop':
      await immuneSystem.stop();
      break;
      
    default:
      console.log(`
🛡️ Performance Immune System Commands:

start           - Start the immune system
status          - Show current system status  
test            - Run performance regression test
baseline        - Capture new performance baseline
healing         - Enable auto-healing mode
monitoring      - Enable monitoring-only mode
report          - Generate detailed system report
stop            - Graceful shutdown

Examples:
node PerformanceImmuneSystem.js start
node PerformanceImmuneSystem.js status
node PerformanceImmuneSystem.js healing
      `);
  }
}

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default PerformanceImmuneSystem;
