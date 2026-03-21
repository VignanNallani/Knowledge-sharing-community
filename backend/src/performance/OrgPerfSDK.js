// @org/perf-sdk - Organization Performance SDK
// Enforces standardized measurement across all services

import EventEmitter from 'events';

class OrgPerfSDK extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Standardized configuration (enforced organization-wide)
    this.config = {
      // Standard histogram buckets (no custom buckets allowed)
      histogramBuckets: [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
      
      // Standard window durations
      windows: {
        short: 60000,      // 1 minute
        medium: 300000,    // 5 minutes  
        long: 3600000      // 1 hour
      },
      
      // Standard percentiles
      percentiles: [50, 75, 90, 95, 99],
      
      // Standard sampling strategy
      sampling: {
        default_rate: 0.01,  // 1% default sampling
        error_sampling: 1.0,  // 100% sampling for errors
        slow_sampling: 1.0   // 100% sampling for slow requests
      },
      
      // Standard warmup protocol
      warmup: {
        duration: 30000,    // 30 seconds
        min_requests: 100,  // Minimum requests for valid measurement
        exclude_from_metrics: true
      }
    };
    
    // Performance budget (loaded from contract)
    this.budget = null;
    
    // Measurement state
    this.isWarmedUp = false;
    this.requestCount = 0;
    this.startTime = Date.now();
    
    // Initialize
    this.loadBudget();
    this.setupWarmup();
    this.enforceAsyncLogging();
  }

  // Load performance budget from contract file
  async loadBudget() {
    try {
      const contractPath = this.findContractFile();
      const contract = await import(contractPath);
      this.budget = contract.default;
      
      console.log(`📋 Loaded performance budget: ${this.budget.service} v${this.budget.version}`);
      
      // Validate budget completeness
      this.validateBudget();
      
    } catch (error) {
      console.error('❌ Failed to load performance budget:', error.message);
      throw new Error('Performance budget is required. Please create performance-contracts/{service}.yaml');
    }
  }

  findContractFile() {
    // Auto-discover contract file based on service name
    const service = process.env.SERVICE_NAME || 'unknown-service';
    return `./performance-contracts/${service}.yaml`;
  }

  validateBudget() {
    const required = ['latency_budget', 'error_budget', 'resource_budgets'];
    const missing = required.filter(field => !this.budget[field]);
    
    if (missing.length > 0) {
      throw new Error(`Performance budget missing required fields: ${missing.join(', ')}`);
    }
  }

  // Standardized request measurement
  measureRequest(req, res, next) {
    // Skip measurement during warmup
    if (!this.isWarmedUp) {
      return next();
    }
    
    const requestId = this.generateRequestId();
    const startTime = process.hrtime.bigint();
    
    // Track request lifecycle
    this.requestCount++;
    
    // Standardized response tracking
    const originalEnd = res.end;
    res.end = function(...args) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1e6; // Convert to ms
      
      // Record standardized metrics
      OrgPerfSDK.recordMetrics({
        requestId,
        method: req.method,
        route: this.normalizeRoute(req.path),
        statusCode: res.statusCode,
        duration,
        timestamp: Date.now()
      });
      
      // Check budget violations
      OrgPerfSDK.checkBudgetViolations({
        duration,
        statusCode: res.statusCode,
        route: this.normalizeRoute(req.path)
      });
      
      return originalEnd.apply(this, args);
    };
    
    next();
  }

  // Standardized metric recording
  static recordMetrics(data) {
    // Enforce async logging (never block request thread)
    setImmediate(() => {
      OrgPerfSDK.emit('metric', data);
      
      // Check for slow requests
      if (data.duration > 1000) { // > 1 second
        OrgPerfSDK.emit('slow_request', data);
      }
      
      // Check for errors
      if (data.statusCode >= 500) {
        OrgPerfSDK.emit('error', data);
      }
    });
  }

  // Standardized budget violation checking
  static checkBudgetViolations(data) {
    const sdk = new OrgPerfSDK();
    if (!sdk.budget) return;
    
    const violations = [];
    
    // Check latency budgets
    if (data.duration > sdk.budget.latency_budget.p95) {
      violations.push({
        type: 'latency_violation',
        metric: 'p95',
        actual: data.duration,
        budget: sdk.budget.latency_budget.p95,
        severity: data.duration > sdk.budget.latency_budget.p95 * 2 ? 'critical' : 'warning'
      });
    }
    
    // Check error budget
    const errorRate = OrgPerfSDK.calculateErrorRate(data.statusCode);
    if (errorRate > sdk.budget.error_budget.max_rate) {
      violations.push({
        type: 'error_violation',
        metric: 'error_rate',
        actual: errorRate,
        budget: sdk.budget.error_budget.max_rate,
        severity: errorRate > sdk.budget.error_budget.max_rate * 2 ? 'critical' : 'warning'
      });
    }
    
    // Emit violations for handling
    if (violations.length > 0) {
      OrgPerfSDK.emit('budget_violation', {
        violations,
        request: data,
        timestamp: Date.now()
      });
    }
  }

  // Standardized route normalization (no custom logic allowed)
  normalizeRoute(path) {
    // Replace UUIDs and IDs with placeholders
    return path
      .replace(/\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, '/:uuid')
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:token');
  }

  // Standardized warmup protocol
  setupWarmup() {
    setTimeout(() => {
      this.isWarmedUp = this.requestCount >= this.config.warmup.min_requests;
      
      if (this.isWarmedUp) {
        console.log('🔥 Performance SDK warmed up and ready');
        this.emit('warmed_up');
      } else {
        console.log(`⚠️ Warmup incomplete (${this.requestCount} requests)`);
      }
    }, this.config.warmup.duration);
  }

  // Enforce async logging (never block event loop)
  enforceAsyncLogging() {
    // Override console.log to be async in production
    if (process.env.NODE_ENV === 'production') {
      const originalLog = console.log;
      console.log = (...args) => {
        setImmediate(() => originalLog.apply(console, args));
      };
    }
  }

  // Standardized request ID generation
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Standardized error rate calculation
  static calculateErrorRate(statusCode) {
    return statusCode >= 500 ? 1.0 : 0.0;
  }

  // Standardized histogram recording
  static recordHistogram(name, value, labels = {}) {
    // Enforce standard buckets
    const sdk = new OrgPerfSDK();
    const bucket = sdk.findBucket(value);
    
    setImmediate(() => {
      OrgPerfSDK.emit('histogram', {
        name,
        bucket,
        value,
        labels,
        timestamp: Date.now()
      });
    });
  }

  findBucket(value) {
    const buckets = this.config.histogramBuckets;
    for (let i = 0; i < buckets.length - 1; i++) {
      if (value >= buckets[i] && value < buckets[i + 1]) {
        return buckets[i];
      }
    }
    return buckets[buckets.length - 1];
  }

  // Get current budget for external access
  getBudget() {
    return this.budget;
  }

  // Get SDK configuration (read-only)
  getConfig() {
    return { ...this.config };
  }
}

// Export singleton instance
export default new OrgPerfSDK();

// Export standardized interfaces
export const PerformanceBudget = {
  create: (service, version, budgets) => ({
    service,
    version,
    budgets,
    created: new Date().toISOString(),
    approved: false
  }),
  
  validate: (contract) => {
    const required = ['service', 'version', 'latency_budget', 'error_budget'];
    return required.every(field => contract[field]);
  }
};

export const StandardMetrics = {
  histogram: (name, value, labels) => OrgPerfSDK.recordHistogram(name, value, labels),
  counter: (name, labels) => OrgPerfSDK.emit('counter', { name, labels, timestamp: Date.now() }),
  gauge: (name, value, labels) => OrgPerfSDK.emit('gauge', { name, value, labels, timestamp: Date.now() })
};
