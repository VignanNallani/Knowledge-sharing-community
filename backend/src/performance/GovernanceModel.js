// Governance & Escalation Model
// Organization-wide performance governance enforcement

import EventEmitter from 'events';

class GovernanceModel extends EventEmitter {
  constructor() {
    super();
    
    this.escalationTiers = {
      tier_0: {
        name: 'Local Auto-Healing',
        capabilities: ['disable_profiler', 'reduce_sampling', 'increase_pool'],
        max_response_time: 300000, // 5 minutes
        auto_approve: true
      },
      
      tier_1: {
        name: 'Service Owner Notification',
        capabilities: ['service_restart', 'config_adjustment'],
        max_response_time: 1800000, // 30 minutes
        auto_approve: false,
        escalation_threshold: 3 // 3 failures in 24h
      },
      
      tier_2: {
        name: 'Performance Review Required',
        capabilities: ['deployment_approval', 'budget_adjustment'],
        max_response_time: 7200000, // 2 hours
        auto_approve: false,
        escalation_threshold: 2 // 2 tier_1 escalations in week
      },
      
      tier_3: {
        name: 'Release Freeze',
        capabilities: ['org_level_policy_change', 'executive_escalation'],
        max_response_time: 86400000, // 24 hours
        auto_approve: false,
        escalation_threshold: 1 // Any tier_2 escalation
      }
    };
    
    this.serviceHistory = new Map(); // service -> violation history
    this.escalationQueue = [];
    this.activeEscalations = new Map(); // service -> escalation
    
    this.startGovernance();
  }

  startGovernance() {
    console.log('⚖️ Governance model started with 4 escalation tiers');
  }

  // Handle performance violation
  async handleViolation(service, violation) {
    console.log(`⚠️ Performance violation in ${service}:`, violation);
    
    // Record violation
    this.recordViolation(service, violation);
    
    // Determine escalation tier
    const tier = this.determineEscalationTier(service, violation);
    
    // Check if escalation is needed
    if (this.shouldEscalate(service, tier, violation)) {
      await this.escalate(service, tier, violation);
    } else {
      // Handle at current level
      await this.handleAtCurrentLevel(service, tier, violation);
    }
  }

  recordViolation(service, violation) {
    if (!this.serviceHistory.has(service)) {
      this.serviceHistory.set(service, []);
    }
    
    const history = this.serviceHistory.get(service);
    history.push({
      timestamp: Date.now(),
      violation,
      tier: null, // Will be set by escalation logic
      resolved: false,
      resolution: null
    });
    
    // Keep only last 30 days of history
    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
    this.serviceHistory.set(service, history.filter(h => h.timestamp > cutoff));
  }

  determineEscalationTier(service, violation) {
    const history = this.serviceHistory.get(service) || [];
    
    // Count recent violations
    const recentViolations = history.filter(h => 
      Date.now() - h.timestamp < (24 * 60 * 60 * 1000) // Last 24 hours
    );
    
    // Check for repeated violations
    const repeatedViolations = recentViolations.filter(h => 
      h.violation.type === violation.type
    );
    
    // Determine tier based on severity and frequency
    if (violation.severity === 'critical') {
      return 'tier_2'; // Critical issues go straight to performance review
    }
    
    if (repeatedViolations.length >= 3) {
      return 'tier_1'; // Repeated issues go to service owner
    }
    
    if (this.hasRecentEscalation(service, 'tier_1')) {
      return 'tier_2'; // Escalate if recent tier_1
    }
    
    return 'tier_0'; // Default to local auto-healing
  }

  shouldEscalate(service, tier, violation) {
    const history = this.serviceHistory.get(service) || [];
    
    // Count escalations at this tier in the last period
    const tierEscalations = history.filter(h => 
      h.tier === tier && 
      Date.now() - h.timestamp < this.getTierPeriod(tier)
    );
    
    return tierEscalations.length >= this.escalationTiers[tier].escalation_threshold;
  }

  getTierPeriod(tier) {
    switch (tier) {
      case 'tier_0': return 6 * 60 * 60 * 1000; // 6 hours
      case 'tier_1': return 24 * 60 * 60 * 1000; // 24 hours
      case 'tier_2': return 7 * 24 * 60 * 60 * 1000; // 1 week
      case 'tier_3': return 30 * 24 * 60 * 60 * 1000; // 30 days
      default: return 24 * 60 * 60 * 1000;
    }
  }

  hasRecentEscalation(service, tier) {
    const escalation = this.activeEscalations.get(service);
    return escalation && escalation.tier === tier && 
           Date.now() - escalation.timestamp < this.getTierPeriod(tier);
  }

  async escalate(service, tier, violation) {
    console.log(`🚨 Escalating ${service} to ${this.escalationTiers[tier].name}`);
    
    const escalation = {
      service,
      tier,
      violation,
      timestamp: Date.now(),
      status: 'active',
      assigned_to: null,
      deadline: Date.now() + this.escalationTiers[tier].max_response_time
    };
    
    this.activeEscalations.set(service, escalation);
    this.escalationQueue.push(escalation);
    
    // Update violation history
    const history = this.serviceHistory.get(service) || [];
    const latestViolation = history[history.length - 1];
    if (latestViolation) {
      latestViolation.tier = tier;
    }
    
    // Emit escalation event
    this.emit('escalated', {
      service,
      tier,
      violation,
      deadline: escalation.deadline
    });
    
    // Start timeout monitoring
    this.startEscalationTimeout(service, tier);
    
    // Notify appropriate parties
    await this.notifyEscalation(service, tier, violation);
  }

  async handleAtCurrentLevel(service, tier, violation) {
    console.log(`🔧 Handling ${service} at ${this.escalationTiers[tier].name}`);
    
    const tierConfig = this.escalationTiers[tier];
    
    // Check if auto-approval is available
    if (tierConfig.auto_approve) {
      await this.executeAutoAction(service, tier, violation);
    } else {
      await this.requestManualAction(service, tier, violation);
    }
  }

  async executeAutoAction(service, tier, violation) {
    const tierConfig = this.escalationTiers[tier];
    
    console.log(`🤖 Executing auto-action for ${service}:`, violation);
    
    // Determine appropriate action based on violation type
    const action = this.selectAutoAction(violation, tierConfig.capabilities);
    
    if (action) {
      try {
        await this.performAction(service, action);
        
        // Record resolution
        this.recordResolution(service, 'auto_action', action);
        
        console.log(`✅ Auto-action completed for ${service}: ${action}`);
        
      } catch (error) {
        console.error(`❌ Auto-action failed for ${service}:`, error);
        
        // Escalate to next tier
        const nextTier = this.getNextTier(tier);
        if (nextTier) {
          await this.escalate(service, nextTier, violation);
        }
      }
    }
  }

  selectAutoAction(violation, capabilities) {
    switch (violation.type) {
      case 'latency_spike':
        if (capabilities.includes('disable_profiler')) {
          return 'disable_profiler';
        }
        if (capabilities.includes('reduce_sampling')) {
          return 'reduce_sampling';
        }
        break;
        
      case 'error_rate_spike':
        if (capabilities.includes('service_restart')) {
          return 'service_restart';
        }
        break;
        
      case 'throughput_drop':
        if (capabilities.includes('increase_pool')) {
          return 'increase_pool';
        }
        break;
    }
    
    return null;
  }

  async performAction(service, action) {
    console.log(`🔧 Performing action: ${action} for ${service}`);
    
    // In production, this would integrate with deployment systems
    switch (action) {
      case 'disable_profiler':
        await this.disableProfiler(service);
        break;
      case 'reduce_sampling':
        await this.reduceSampling(service);
        break;
      case 'increase_pool':
        await this.increasePoolSize(service);
        break;
      case 'service_restart':
        await this.restartService(service);
        break;
    }
  }

  async disableProfiler(service) {
    // Implementation would disable profiler for specific service
    console.log(`🔬 Disabling profiler for ${service}`);
    await this.wait(2000);
  }

  async reduceSampling(service) {
    // Implementation would reduce sampling rate
    console.log(`📉 Reducing sampling for ${service}`);
    await this.wait(1000);
  }

  async increasePoolSize(service) {
    // Implementation would increase connection pool
    console.log(`⬆️ Increasing pool size for ${service}`);
    await this.wait(3000);
  }

  async restartService(service) {
    // Implementation would restart service
    console.log(`🔄 Restarting ${service}`);
    await this.wait(5000);
  }

  async requestManualAction(service, tier, violation) {
    console.log(`📋 Requesting manual action for ${service} at ${this.escalationTiers[tier].name}`);
    
    // Emit for manual handling
    this.emit('manual_action_required', {
      service,
      tier,
      violation,
      deadline: Date.now() + this.escalationTiers[tier].max_response_time,
      capabilities: this.escalationTiers[tier].capabilities
    });
  }

  async notifyEscalation(service, tier, violation) {
    const tierConfig = this.escalationTiers[tier];
    
    console.log(`📢 Notifying escalation for ${service} (${tierConfig.name})`);
    
    // In production, this would:
    // - Send alerts/paging
    // - Create tickets
    // - Notify appropriate teams
    // - Update dashboards
    
    this.emit('notification', {
      service,
      tier,
      tier_name: tierConfig.name,
      violation,
      deadline: Date.now() + tierConfig.max_response_time,
      severity: violation.severity
    });
  }

  startEscalationTimeout(service, tier) {
    const escalation = this.activeEscalations.get(service);
    const timeout = escalation.deadline - Date.now();
    
    setTimeout(() => {
      if (this.activeEscalations.has(service) && 
          this.activeEscalations.get(service).status === 'active') {
        console.log(`⏰ Escalation timeout for ${service} at ${tier}`);
        
        // Escalate to next tier
        const nextTier = this.getNextTier(tier);
        if (nextTier) {
          this.escalate(service, nextTier, escalation.violation);
        } else {
          this.emit('escalation_timeout', {
            service,
            tier,
            violation: escalation.violation
          });
        }
      }
    }, timeout);
  }

  getNextTier(currentTier) {
    const tiers = ['tier_0', 'tier_1', 'tier_2', 'tier_3'];
    const currentIndex = tiers.indexOf(currentTier);
    
    if (currentIndex < tiers.length - 1) {
      return tiers[currentIndex + 1];
    }
    
    return null; // No higher tier
  }

  recordResolution(service, resolutionType, action) {
    const history = this.serviceHistory.get(service) || [];
    const latestViolation = history[history.length - 1];
    
    if (latestViolation && !latestViolation.resolved) {
      latestViolation.resolved = true;
      latestViolation.resolution = {
        type: resolutionType,
        action,
        timestamp: Date.now()
      };
    }
    
    // Clear active escalation
    this.activeEscalations.delete(service);
    
    // Emit resolution event
    this.emit('violation_resolved', {
      service,
      resolutionType,
      action,
      timestamp: Date.now()
    });
  }

  // Get governance status
  getGovernanceStatus() {
    const status = {
      active_escalations: Array.from(this.activeEscalations.entries()).map(([service, esc]) => ({
        service,
        tier: esc.tier,
        tier_name: this.escalationTiers[esc.tier].name,
        deadline: esc.deadline,
        time_remaining: Math.max(0, esc.deadline - Date.now())
      })),
      
      escalation_queue: this.escalationQueue.length,
      
      service_violations: {},
      
      compliance_score: this.calculateComplianceScore()
    };
    
    // Add violation counts per service
    for (const [service, history] of this.serviceHistory.entries()) {
      const recentViolations = history.filter(h => 
        Date.now() - h.timestamp < (7 * 24 * 60 * 60 * 1000) // Last 7 days
      );
      
      status.service_violations[service] = {
        total: history.length,
        recent: recentViolations.length,
        resolved: history.filter(h => h.resolved).length,
        pending: history.filter(h => !h.resolved).length
      };
    }
    
    return status;
  }

  calculateComplianceScore() {
    let totalViolations = 0;
    let resolvedViolations = 0;
    
    for (const history of this.serviceHistory.values()) {
      totalViolations += history.length;
      resolvedViolations += history.filter(h => h.resolved).length;
    }
    
    if (totalViolations === 0) return 100;
    
    return Math.round((resolvedViolations / totalViolations) * 100);
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new GovernanceModel();
