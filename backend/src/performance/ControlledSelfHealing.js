// Controlled Self-Healing - Immune Response System
import AutoIsolationRunner from './AutoIsolationRunner.js';
import fs from 'fs/promises';

class ControlledSelfHealing {
  constructor() {
    this.autoIsolation = new AutoIsolationRunner();
    this.healingHistory = [];
    this.guardrails = this.initializeGuardrails();
    
    this.setupEventHandlers();
    this.loadHealingHistory();
  }

  initializeGuardrails() {
    return {
      // Allowed automatic actions
      allowed_actions: [
        'disable_profiler',
        'reduce_sampling', 
        'increase_pool_size',
        'disable_nonessential_middleware',
        'adjust_admission_control',
        'enable_circuit_breaker'
      ],
      
      // Disallowed automatic actions (require human approval)
      disallowed_actions: [
        'schema_changes',
        'cache_invalidation',
        'feature_flags',
        'database_migrations',
        'security_policy_changes'
      ],
      
      // Safety limits (increased friction)
      max_pool_size: 50,
      min_sample_rate: 0.001, // 0.1%
      max_admission_control_reduction: 0.5, // Can't reduce below 50%
      
      // Friction settings to prevent oscillation
      healing_cooldown_ms: 600000,     // 10 minutes between healings (increased from 5)
      max_healings_per_hour: 2,         // Reduced from 3
      max_healings_per_day: 10,         // Daily limit
      escalation_threshold: 3,          // Escalate after 3 failed healings
      observation_period_ms: 300000,    // 5 minutes observation before confirming healing
      
      // Healing must be slower than detection
      healing_delay_multiplier: 3,       // Healing takes 3x longer than detection
      minimum_anomaly_duration: 60000,  // Anomaly must persist 1 minute before healing
      
      // Performance budgets for accountability
      performance_budgets: {
        max_latency_budget: 100,        // ms
        max_db_time: 250,               // ms
        max_middleware_overhead: 10,    // ms
        max_connection_wait: 50         // ms
      }
    };
  }

  setupEventHandlers() {
    this.autoIsolation.anomalyDetector.on('anomaly', async (data) => {
      await this.considerHealing(data, 'automatic');
    });
    
    this.autoIsolation.anomalyDetector.on('critical_anomaly', async (data) => {
      await this.considerHealing(data, 'immediate');
    });
  }

  async considerHealing(anomalyData, priority = 'automatic') {
    console.log(`🛡️ Considering healing response (priority: ${priority})...`);
    
    // Check guardrails
    if (!this.canHeal(priority)) {
      console.log('⚠️ Healing blocked by guardrails');
      return;
    }
    
    // Analyze anomaly type and recommend healing
    const healingAction = this.analyzeHealingNeeds(anomalyData);
    
    if (healingAction) {
      await this.executeHealing(healingAction, anomalyData);
    } else {
      console.log('❓ No safe healing action identified');
      await this.escalateToHuman(anomalyData);
    }
  }

  canHeal(priority) {
    // Check cooldown period
    const lastHealing = this.healingHistory[this.healingHistory.length - 1];
    if (lastHealing) {
      const timeSinceLastHealing = Date.now() - lastHealing.timestamp;
      if (timeSinceLastHealing < this.guardrails.healing_cooldown_ms) {
        console.log(`⏳ In healing cooldown (${timeSinceLastHealing}ms < ${this.guardrails.healing_cooldown_ms}ms)`);
        return false;
      }
    }
    
    // Check healing frequency
    const recentHealings = this.healingHistory.filter(h => 
      Date.now() - h.timestamp < 3600000 // Last hour
    );
    
    if (recentHealings.length >= this.guardrails.max_healings_per_hour) {
      console.log(`🚫 Healing limit reached (${recentHealings.length}/${this.guardrails.max_healings_per_hour})`);
      return false;
    }
    
    // Critical issues bypass some limits
    return priority === 'immediate';
  }

  analyzeHealingNeeds(anomalyData) {
    const anomalies = anomalyData.anomalies;
    const healingActions = [];
    
    for (const anomaly of anomalies) {
      const action = this.getHealingAction(anomaly);
      if (action && this.isAllowedAction(action.type)) {
        healingActions.push(action);
      }
    }
    
    // Select the safest effective action
    return this.selectBestHealingAction(healingActions);
  }

  getHealingAction(anomaly) {
    switch (anomaly.type) {
      case 'latency_spike':
        return this.analyzeLatencySpike(anomaly);
        
      case 'error_rate_spike':
        return this.analyzeErrorSpike(anomaly);
        
      case 'throughput_drop':
        return this.analyzeThroughputDrop(anomaly);
        
      case 'memory_spike':
        return this.analyzeMemorySpike(anomaly);
        
      case 'cpu_spike':
        return this.analyzeCpuSpike(anomaly);
        
      default:
        return null;
    }
  }

  analyzeLatencySpike(anomaly) {
    const severity = anomaly.severity;
    const increase = anomaly.current / anomaly.baseline;
    
    if (increase > 3) {
      // Severe latency spike - likely profiler or blocking middleware
      return {
        type: 'disable_profiler',
        priority: 'high',
        confidence: 0.9,
        reason: 'Severe latency spike suggests blocking operation',
        rollback_plan: 'reenable_profiler'
      };
    } else if (increase > 1.5) {
      // Moderate spike - try sampling reduction
      return {
        type: 'reduce_sampling',
        priority: 'medium',
        confidence: 0.7,
        reason: 'Moderate latency spike, reduce observability overhead',
        rollback_plan: 'restore_sampling_rate'
      };
    }
    
    return null;
  }

  analyzeErrorSpike(anomaly) {
    const errorRate = anomaly.current;
    
    if (errorRate > 0.1) { // >10% error rate
      return {
        type: 'enable_circuit_breaker',
        priority: 'high',
        confidence: 0.8,
        reason: 'High error rate - enable circuit breaker',
        rollback_plan: 'disable_circuit_breaker'
      };
    }
    
    return null;
  }

  analyzeThroughputDrop(anomaly) {
    const drop = 1 - (anomaly.current / anomaly.baseline);
    
    if (drop > 0.5) { // >50% drop
      return {
        type: 'disable_nonessential_middleware',
        priority: 'high',
        confidence: 0.8,
        reason: 'Severe throughput drop - disable nonessential middleware',
        rollback_plan: 'restore_middleware'
      };
    }
    
    return null;
  }

  analyzeMemorySpike(anomaly) {
    return {
      type: 'increase_pool_size',
      priority: 'medium',
      confidence: 0.6,
      reason: 'Memory spike - increase connection pool',
      rollback_plan: 'restore_pool_size'
    };
  }

  analyzeCpuSpike(anomaly) {
    return {
      type: 'reduce_sampling',
      priority: 'medium',
      confidence: 0.7,
      reason: 'CPU spike - reduce observability overhead',
      rollback_plan: 'restore_sampling_rate'
    };
  }

  isAllowedAction(actionType) {
    return this.guardrails.allowed_actions.includes(actionType);
  }

  selectBestHealingAction(actions) {
    if (actions.length === 0) return null;
    
    // Sort by priority and confidence
    actions.sort((a, b) => {
      const priorityScore = { high: 3, medium: 2, low: 1 }[a.priority] || 0;
      const bPriorityScore = { high: 3, medium: 2, low: 1 }[b.priority] || 0;
      
      if (priorityScore !== bPriorityScore) {
        return bPriorityScore - priorityScore;
      }
      
      return b.confidence - a.confidence;
    });
    
    return actions[0];
  }

  // Helper methods
  async performHealingAction(action) {
    switch (action.type) {
      case 'disable_profiler':
        await this.setEnvVar('ENABLE_PROFILER', 'false');
        await this.gracefulRestart();
        break;
        
      case 'reduce_sampling':
        await this.setEnvVar('PROFILER_SAMPLE_RATE', '0.001');
        await this.gracefulRestart();
        break;
        
      case 'increase_pool_size':
        const newPoolSize = Math.min(this.guardrails.max_pool_size, 30);
        await this.setEnvVar('DB_POOL_SIZE', newPoolSize.toString());
        await this.gracefulRestart();
        break;
        
      case 'disable_nonessential_middleware':
        await this.setEnvVar('DISABLE_NON_ESSENTIAL_MIDDLEWARE', 'true');
        await this.gracefulRestart();
        break;
        
      case 'enable_circuit_breaker':
        await this.setEnvVar('ENABLE_CIRCUIT_BREAKER', 'true');
        break;
    }
    
    await this.gracefulRestart();
  }

  async rollbackHealing(action) {
    console.log(` Rolling back healing: ${action.type}`);
    
    switch (action.rollback_plan) {
      case 'reenable_profiler':
        await this.setEnvVar('ENABLE_PROFILER', 'false'); // Keep disabled
        break;
      case 'restore_sampling_rate':
        await this.setEnvVar('PROFILER_SAMPLE_RATE', '0.01');
        break;
      case 'restore_pool_size':
        await this.setEnvVar('DB_POOL_SIZE', '20');
        break;
      case 'restore_middleware':
        await this.setEnvVar('DISABLE_NON_ESSENTIAL_MIDDLEWARE', 'false');
        break;
      case 'disable_circuit_breaker':
        await this.setEnvVar('ENABLE_CIRCUIT_BREAKER', 'false');
        break;
    }
    
    await this.gracefulRestart();
  }

  async escalateToHuman(anomalyData) {
    console.log(' Escalating to human operator...');
    
    const escalation = {
      timestamp: Date.now(),
      anomaly: anomalyData,
      reason: 'No safe automatic healing available',
      severity: this.getOverallSeverity(anomalyData.anomalies),
      requires_human_intervention: true
    };
    
    await fs.writeFile('./escalation.json', JSON.stringify(escalation, null, 2));
    
    // In production, this would send alert, page, ticket, etc.
  }

  async setEnvVar(key, value) {
    process.env[key] = value;
    console.log(` Set ${key} = ${value}`);
  }

  async gracefulRestart() {
    console.log(' Initiating graceful restart...');
    // In production, this would trigger graceful restart
    await this.wait(3000);
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async captureMetrics() {
    // Placeholder for metrics capture
    return {
      latency: 45,
      error_rate: 0.01,
      throughput: 8,
      memory_mb: 120,
      cpu_percent: 25,
      timestamp: Date.now()
    };
  }

  detectAnomalies(metrics) {
    // Simplified anomaly detection
    return [];
  }

  calculateImprovement(originalAnomaly, newMetrics) {
    // Simplified improvement calculation
    return 15; // placeholder
  }

  getOverallSeverity(anomalies) {
    const severities = anomalies.map(a => a.severity);
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    return 'low';
  }

  async recordHealingError(error) {
    const healing = {
      timestamp: Date.now(),
      status: 'error',
      error: error.message
    };
    
    this.healingHistory.push(healing);
    await this.saveHealingHistory();
  }

  async saveHealingHistory() {
    await fs.writeFile('./healing-history.json', JSON.stringify(this.healingHistory, null, 2));
  }

  async loadHealingHistory() {
    try {
      const data = await fs.readFile('./healing-history.json', 'utf8');
      this.healingHistory = JSON.parse(data);
    } catch (error) {
      this.healingHistory = [];
    }
  }

  // Public API
  getStatus() {
    return {
      guardrails: this.guardrails,
      healing_history: this.healingHistory.slice(-20), // Last 20 healings
      auto_isolation: this.autoIsolation.getStatus(),
      last_healing: this.healingHistory[this.healingHistory.length - 1]
    };
  }
}

export default ControlledSelfHealing;
