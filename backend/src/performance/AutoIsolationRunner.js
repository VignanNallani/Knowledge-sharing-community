// Auto-Isolation Runner - The Scientific Brain
import AnomalyDetector from './AnomalyDetector.js';
import { exec } from 'child_process';
import fs from 'fs/promises';

class AutoIsolationRunner {
  constructor() {
    this.anomalyDetector = new AnomalyDetector();
    this.isolationInProgress = false;
    this.isolationHistory = [];
    
    // Isolation modes for safety
    this.isolationMode = process.env.ISOLATION_MODE || 'shadow'; // shadow, safe, active
    
    // Safety constraints
    this.safetyConstraints = {
      max_experiments_per_hour: 5,
      experiment_timeout_ms: 300000, // 5 minutes max per experiment
      rollback_timeout_ms: 60000,     // 1 minute rollback timeout
      cooldown_between_experiments: 120000, // 2 minutes between experiments
      max_parallel_experiments: 1,
      require_human_approval_for: ['disable_middleware', 'schema_changes']
    };
    
    // Experiment configurations with safety ratings
    this.experiments = [
      { 
        name: 'disable_profiler', 
        action: this.disableProfiler.bind(this), 
        expected_impact: 'high',
        risk_level: 'low',
        reversible: true,
        timeout: 30000
      },
      { 
        name: 'reduce_sampling', 
        action: this.reduceSampling.bind(this), 
        expected_impact: 'medium',
        risk_level: 'low',
        reversible: true,
        timeout: 15000
      },
      { 
        name: 'increase_pool', 
        action: this.increasePoolSize.bind(this), 
        expected_impact: 'medium',
        risk_level: 'low',
        reversible: true,
        timeout: 45000
      },
      { 
        name: 'disable_metrics', 
        action: this.disableMetrics.bind(this), 
        expected_impact: 'medium',
        risk_level: 'medium',
        reversible: true,
        timeout: 20000
      },
      { 
        name: 'disable_middleware', 
        action: this.disableMiddleware.bind(this), 
        expected_impact: 'high',
        risk_level: 'high',
        reversible: true,
        timeout: 60000,
        requires_approval: true
      }
    ];
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.anomalyDetector.on('anomaly', (data) => {
      console.log('🔍 Anomaly detected, starting auto-isolation...');
      this.startIsolation(data);
    });
    
    this.anomalyDetector.on('critical_anomaly', (data) => {
      console.log('🚨 Critical anomaly, immediate isolation...');
      this.startImmediateIsolation(data);
    });
  }

  async startIsolation(anomalyData) {
    if (this.isolationInProgress) {
      console.log('⏳ Isolation already in progress...');
      return;
    }
    
    // Check safety constraints
    if (!this.canRunIsolation()) {
      console.log('🚫 Isolation blocked by safety constraints');
      return;
    }
    
    this.isolationInProgress = true;
    const isolationId = `iso_${Date.now()}`;
    
    console.log(`🧪 Starting isolation ${isolationId} (mode: ${this.isolationMode})`);
    
    try {
      const results = await this.runExperiments(anomalyData);
      const solution = this.analyzeResults(results);
      
      if (solution) {
        if (this.isolationMode === 'shadow') {
          console.log(`👥 Shadow mode: Would apply ${solution.experiment} (+${solution.improvement.toFixed(1)}% improvement)`);
          await this.recordShadowAction(isolationId, solution, results);
        } else if (this.isolationMode === 'safe') {
          console.log(`🛡️ Safe mode: Testing ${solution.experiment} before permanent application`);
          await this.testSolutionSafely(solution, anomalyData);
        } else {
          await this.applySolution(solution);
          await this.recordSuccess(isolationId, solution, results);
        }
      } else {
        await this.recordFailure(isolationId, results);
      }
      
    } catch (error) {
      console.error('❌ Isolation failed:', error);
      await this.recordError(isolationId, error);
    } finally {
      this.isolationInProgress = false;
    }
  }

  canRunIsolation() {
    // Check recent experiment frequency
    const recentExperiments = this.isolationHistory.filter(h => 
      Date.now() - h.timestamp < 3600000 // Last hour
    );
    
    if (recentExperiments.length >= this.safetyConstraints.max_experiments_per_hour) {
      console.log(`🚫 Experiment limit reached (${recentExperiments.length}/${this.safetyConstraints.max_experiments_per_hour})`);
      return false;
    }
    
    // Check cooldown between experiments
    const lastExperiment = this.isolationHistory[this.isolationHistory.length - 1];
    if (lastExperiment && (Date.now() - lastExperiment.timestamp) < this.safetyConstraints.cooldown_between_experiments) {
      console.log(`🚫 In cooldown period`);
      return false;
    }
    
    return true;
  }

  async runExperiments(anomalyData) {
    const results = [];
    const baselineMetrics = await this.captureCurrentMetrics();
    
    // Filter experiments by risk level and mode
    const allowedExperiments = this.filterExperimentsByMode();
    
    for (const experiment of allowedExperiments) {
      console.log(`🧪 Running experiment: ${experiment.name} (risk: ${experiment.risk_level})`);
      
      try {
        const result = await this.runSingleExperimentSafely(experiment, baselineMetrics);
        results.push(result);
        
        // Cooldown between experiments
        await this.wait(this.safetyConstraints.cooldown_between_experiments);
        
      } catch (error) {
        console.error(`❌ ${experiment.name} failed:`, error.message);
        results.push({
          experiment: experiment.name,
          success: false,
          error: error.message,
          risk_level: experiment.risk_level
        });
      }
    }
    
    return results;
  }

  filterExperimentsByMode() {
    switch (this.isolationMode) {
      case 'shadow':
        // Allow all experiments in shadow mode (no actual changes)
        return this.experiments;
      case 'safe':
        // Only allow low and medium risk experiments
        return this.experiments.filter(e => e.risk_level !== 'high');
      case 'active':
        // Allow all experiments but require approval for high-risk ones
        return this.experiments.filter(e => 
          !e.requires_approval || this.hasApproval(e.name)
        );
      default:
        return [];
    }
  }

  hasApproval(experimentName) {
    // Check if experiment has human approval
    return process.env[`APPROVE_${experimentName.toUpperCase()}`] === 'true';
  }

  async runSingleExperimentSafely(experiment, baselineMetrics) {
    const startTime = Date.now();
    const timeout = setTimeout(() => {
      throw new Error(`Experiment ${experiment.name} timed out`);
    }, experiment.timeout || this.safetyConstraints.experiment_timeout_ms);
    
    try {
      if (this.isolationMode === 'shadow') {
        // Shadow mode: simulate without actually applying changes
        return await this.simulateExperiment(experiment, baselineMetrics);
      } else {
        // Apply experiment with timeout protection
        await experiment.action();
        
        // Wait for system to stabilize
        await this.wait(Math.min(10000, experiment.timeout / 3));
        
        // Measure impact
        const newMetrics = await this.captureCurrentMetrics();
        const impact = this.calculateImpact(baselineMetrics, newMetrics);
        
        // Auto-revert if impact is negative or too risky
        if (impact.improvement < -10) { // More than 10% degradation
          console.log(`🔄 Auto-reverting ${experiment.name} due to negative impact`);
          await this.revertExperiment(experiment);
        }
        
        return {
          experiment: experiment.name,
          success: impact.improvement > 5, // At least 5% improvement
          impact,
          baseline: baselineMetrics,
          new_metrics: newMetrics,
          risk_level: experiment.risk_level,
          duration: Date.now() - startTime
        };
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  async simulateExperiment(experiment, baselineMetrics) {
    // Simulate the experiment without actually applying changes
    console.log(`� Simulating ${experiment.name}...`);
    
    // Simulate impact based on expected impact
    const simulatedImprovement = this.getSimulatedImprovement(experiment.expected_impact);
    
    return {
      experiment: experiment.name,
      success: true,
      impact: {
        improvement: simulatedImprovement,
        baseline_latency: baselineMetrics.latency,
        current_latency: baselineMetrics.latency * (1 - simulatedImprovement / 100),
        absolute_change: baselineMetrics.latency * (simulatedImprovement / 100),
        simulated: true
      },
      risk_level: experiment.risk_level,
      mode: 'shadow'
    };
  }

  getSimulatedImprovement(expectedImpact) {
    switch (expectedImpact) {
      case 'high': return 25 + Math.random() * 20; // 25-45% improvement
      case 'medium': return 10 + Math.random() * 10; // 10-20% improvement
      case 'low': return 3 + Math.random() * 7; // 3-10% improvement
      default: return 5;
    }
  }

  async testSolutionSafely(solution, anomalyData) {
    console.log(`🛡️ Testing solution safely: ${solution.experiment}`);
    
    // Apply solution temporarily
    await solution.action();
    
    // Monitor for specified period
    const monitoringPeriod = 120000; // 2 minutes
    const startTime = Date.now();
    
    let stable = true;
    const measurements = [];
    
    while (Date.now() - startTime < monitoringPeriod) {
      const metrics = await this.captureCurrentMetrics();
      measurements.push(metrics);
      
      // Check if metrics are stable
      if (this.isUnstable(measurements)) {
        stable = false;
        break;
      }
      
      await this.wait(10000); // Check every 10 seconds
    }
    
    // Revert after testing
    await this.revertExperiment(this.experiments.find(e => e.name === solution.experiment));
    
    if (stable) {
      console.log(`✅ Solution ${solution.experiment} is stable, can be applied permanently`);
      // In safe mode, we don't auto-apply, just recommend
      await this.recordSafeRecommendation(solution, measurements);
    } else {
      console.log(`❌ Solution ${solution.experiment} is unstable, not recommended`);
      await this.recordUnsafeResult(solution, measurements);
    }
  }

  isUnstable(measurements) {
    if (measurements.length < 5) return false;
    
    // Check for high variance in recent measurements
    const recent = measurements.slice(-5);
    const latencies = recent.map(m => m.latency);
    const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const variance = latencies.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / latencies.length;
    const stddev = Math.sqrt(variance);
    
    // Consider unstable if stddev > 20% of mean
    return (stddev / mean) > 0.2;
  }

  // Experiment actions
  async disableProfiler() {
    console.log('🔬 Disabling request profiler...');
    await this.setEnvVar('ENABLE_PROFILER', 'false');
    await this.restartService();
  }

  async reduceSampling() {
    console.log('🔬 Reducing profiler sampling to 0.1%...');
    await this.setEnvVar('PROFILER_SAMPLE_RATE', '0.001');
    await this.restartService();
  }

  async disableMiddleware() {
    console.log('🔬 Disabling non-essential middleware...');
    // This would modify middleware configuration
    await this.setEnvVar('DISABLE_NON_ESSENTIAL_MIDDLEWARE', 'true');
    await this.restartService();
  }

  async increasePoolSize() {
    console.log('🔬 Increasing DB connection pool to 30...');
    await this.setEnvVar('DB_POOL_SIZE', '30');
    await this.restartService();
  }

  async disableMetrics() {
    console.log('🔬 Disabling HTTP metrics collection...');
    await this.setEnvVar('DISABLE_HTTP_METRICS', 'true');
    await this.restartService();
  }

  // Revert actions
  async revertExperiment(experiment) {
    console.log(`🔄 Reverting ${experiment.name}...`);
    
    switch (experiment.name) {
      case 'disable_profiler':
        await this.setEnvVar('ENABLE_PROFILER', 'false'); // Keep disabled if it helped
        break;
      case 'reduce_sampling':
        await this.setEnvVar('PROFILER_SAMPLE_RATE', '0.01'); // Reset to default
        break;
      case 'disable_middleware':
        await this.setEnvVar('DISABLE_NON_ESSENTIAL_MIDDLEWARE', 'false');
        break;
      case 'increase_pool':
        await this.setEnvVar('DB_POOL_SIZE', '20'); // Reset to default
        break;
      case 'disable_metrics':
        await this.setEnvVar('DISABLE_HTTP_METRICS', 'false');
        break;
    }
    
    await this.restartService();
  }

  // Helper methods
  async captureCurrentMetrics() {
    // This would run a quick load test and capture metrics
    // For now, simulate with HTTP request
    return this.runQuickLoadTest();
  }

  async runQuickLoadTest() {
    const startTime = Date.now();
    
    try {
      const response = await fetch('http://localhost:4000/api/v1/posts');
      const latency = Date.now() - startTime;
      
      return {
        latency,
        success: response.ok,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        latency: 10000, // High latency for error
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  calculateImpact(baseline, current) {
    const improvement = ((baseline.latency - current.latency) / baseline.latency) * 100;
    return {
      improvement,
      baseline_latency: baseline.latency,
      current_latency: current.latency,
      absolute_change: baseline.latency - current.latency
    };
  }

  analyzeResults(results) {
    const successful = results.filter(r => r.success);
    if (successful.length === 0) return null;
    
    // Sort by improvement percentage
    successful.sort((a, b) => b.impact.improvement - a.impact.improvement);
    
    const best = successful[0];
    
    // Only recommend if improvement is significant
    if (best.impact.improvement > 10) {
      return {
        experiment: best.experiment,
        improvement: best.impact.improvement,
        confidence: this.calculateConfidence(best, successful),
        action: this.experiments.find(e => e.name === best.experiment)?.action
      };
    }
    
    return null;
  }

  calculateConfidence(best, allSuccessful) {
    // Simple confidence based on how much better it is than alternatives
    const secondBest = allSuccessful[1];
    if (!secondBest) return 0.9;
    
    const gap = best.impact.improvement - secondBest.impact.improvement;
    return Math.min(0.95, 0.5 + (gap / 50)); // Simple confidence model
  }

  async applySolution(solution) {
    console.log(`🎯 Applying solution: ${solution.experiment} (+${solution.improvement.toFixed(1)}% improvement)`);
    
    await solution.action(); // Apply the fix permanently
    
    // Update configuration
    await this.savePermanentConfig(solution.experiment, solution);
  }

  async savePermanentConfig(experiment, solution) {
    const config = {
      timestamp: Date.now(),
      experiment,
      improvement: solution.improvement,
      confidence: solution.confidence,
      auto_applied: true
    };
    
    await fs.writeFile('./performance-auto-config.json', JSON.stringify(config, null, 2));
  }

  // System operations
  async setEnvVar(key, value) {
    process.env[key] = value;
    console.log(`🔧 Set ${key} = ${value}`);
  }

  async restartService() {
    // In production, this would trigger a graceful restart
    console.log('🔄 Restarting service...');
    await this.wait(2000); // Simulate restart time
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Recording methods
  async recordSuccess(isolationId, solution, results) {
    const record = {
      isolation_id: isolationId,
      timestamp: Date.now(),
      status: 'success',
      solution,
      all_results: results
    };
    
    this.isolationHistory.push(record);
    console.log(`✅ Isolation ${isolationId} completed successfully`);
  }

  async recordFailure(isolationId, results) {
    const record = {
      isolation_id: isolationId,
      timestamp: Date.now(),
      status: 'failed',
      results
    };
    
    this.isolationHistory.push(record);
    console.log(`❌ Isolation ${isolationId} failed - no solution found`);
  }

  async recordError(isolationId, error) {
    const record = {
      isolation_id: isolationId,
      timestamp: Date.now(),
      status: 'error',
      error: error.message
    };
    
    this.isolationHistory.push(record);
    console.log(`💥 Isolation ${isolationId} error:`, error.message);
  }

  // Public API
  getStatus() {
    return {
      isolation_in_progress: this.isolationInProgress,
      anomaly_detector: this.anomalyDetector.getStatus(),
      isolation_history: this.isolationHistory.slice(-10), // Last 10 isolations
      available_experiments: this.experiments.map(e => e.name)
    };
  }
}

export default AutoIsolationRunner;
