/**
 * TRAFFIC CLASSIFICATION SYSTEM
 * Manages user priority tiers and request criticality for intelligent load shedding
 * 
 * Ensures critical business flows are preserved during system stress
 * while providing fair access to all user tiers
 */

import EventEmitter from 'events';

class TrafficClassifier extends EventEmitter {
  constructor(dependencies = {}) {
    super();
    
    this.logger = dependencies.logger || console;
    this.metricsCollector = dependencies.metricsCollector;
    this.userService = dependencies.userService;
    this.sessionService = dependencies.sessionService;
    
    // User priority tiers
    this.userTiers = {
      CRITICAL: {
        name: 'Critical Users',
        priority: 1,
        description: 'System administrators and emergency services',
        rateLimitMultiplier: 10.0,
        queuePriority: 'IMMEDIATE',
        features: ['ALL'],
        bypassDegradation: true,
        examples: ['admin', 'system', 'emergency']
      },
      
      PREMIUM: {
        name: 'Premium Users',
        priority: 2,
        description: 'Paid subscribers and enterprise customers',
        rateLimitMultiplier: 5.0,
        queuePriority: 'HIGH',
        features: ['MOST'],
        bypassDegradation: false,
        examples: ['premium', 'enterprise', 'paid']
      },
      
      VERIFIED: {
        name: 'Verified Users',
        priority: 3,
        description: 'Verified contributors and active community members',
        rateLimitMultiplier: 2.0,
        queuePriority: 'MEDIUM',
        features: ['CORE'],
        bypassDegradation: false,
        examples: ['verified', 'contributor', 'active']
      },
      
      STANDARD: {
        name: 'Standard Users',
        priority: 4,
        description: 'Regular registered users',
        rateLimitMultiplier: 1.0,
        queuePriority: 'NORMAL',
        features: ['CORE'],
        bypassDegradation: false,
        examples: ['registered', 'user']
      },
      
      ANONYMOUS: {
        name: 'Anonymous Users',
        priority: 5,
        description: 'Unauthenticated visitors',
        rateLimitMultiplier: 0.5,
        queuePriority: 'LOW',
        features: ['READ_ONLY'],
        bypassDegradation: false,
        examples: ['anonymous', 'guest', 'visitor']
      }
    };
    
    // Request criticality levels
    this.requestCriticality = {
      CRITICAL: {
        name: 'Critical',
        priority: 1,
        description: 'System-critical operations that must succeed',
        maxResponseTime: 1000,
        retryPolicy: 'AGGRESSIVE',
        timeoutPolicy: 'EXTENDED',
        examples: ['authentication', 'session_management', 'health_check']
      },
      
      HIGH: {
        name: 'High',
        priority: 2,
        description: 'Business-critical operations',
        maxResponseTime: 2000,
        retryPolicy: 'STANDARD',
        timeoutPolicy: 'STANDARD',
        examples: ['content_creation', 'profile_update', 'payment']
      },
      
      MEDIUM: {
        name: 'Medium',
        priority: 3,
        description: 'Important but non-critical operations',
        maxResponseTime: 5000,
        retryPolicy: 'LIMITED',
        timeoutPolicy: 'STANDARD',
        examples: ['content_reading', 'search', 'comments']
      },
      
      LOW: {
        name: 'Low',
        priority: 4,
        description: 'Nice-to-have operations',
        maxResponseTime: 10000,
        retryPolicy: 'MINIMAL',
        timeoutPolicy: 'STRICT',
        examples: ['analytics', 'recommendations', 'social_features']
      },
      
      BACKGROUND: {
        name: 'Background',
        priority: 5,
        description: 'Non-interactive operations',
        maxResponseTime: 30000,
        retryPolicy: 'DEFERRED',
        timeoutPolicy: 'STRICT',
        examples: ['data_sync', 'cleanup', 'reporting']
      }
    };
    
    // Business-critical flows
    this.businessCriticalFlows = {
      AUTHENTICATION: {
        name: 'User Authentication',
        priority: 'CRITICAL',
        endpoints: ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'],
        userTiers: ['ALL'],
        systemStates: ['ALL'],
        fallbackBehavior: 'BASIC_AUTH_ONLY'
      },
      
      CONTENT_ACCESS: {
        name: 'Content Access',
        priority: 'HIGH',
        endpoints: ['/api/content/*', '/api/posts/*'],
        userTiers: ['ALL'],
        systemStates: ['FULL', 'REDUCED', 'EMERGENCY', 'READ_ONLY'],
        fallbackBehavior: 'CACHED_CONTENT_ONLY'
      },
      
      USER_PROFILE: {
        name: 'User Profile Management',
        priority: 'HIGH',
        endpoints: ['/api/users/*', '/api/profile/*'],
        userTiers: ['CRITICAL', 'PREMIUM', 'VERIFIED', 'STANDARD'],
        systemStates: ['FULL', 'REDUCED', 'EMERGENCY'],
        fallbackBehavior: 'READ_ONLY_PROFILE'
      },
      
      CONTENT_CREATION: {
        name: 'Content Creation',
        priority: 'MEDIUM',
        endpoints: ['/api/content/create', '/api/posts/create'],
        userTiers: ['CRITICAL', 'PREMIUM', 'VERIFIED'],
        systemStates: ['FULL', 'REDUCED'],
        fallbackBehavior: 'QUEUE_FOR_LATER'
      },
      
      SEARCH: {
        name: 'Search Functionality',
        priority: 'MEDIUM',
        endpoints: ['/api/search'],
        userTiers: ['ALL'],
        systemStates: ['FULL', 'REDUCED', 'READ_ONLY'],
        fallbackBehavior: 'BASIC_SEARCH_ONLY'
      },
      
      NOTIFICATIONS: {
        name: 'Notifications',
        priority: 'LOW',
        endpoints: ['/api/notifications/*'],
        userTiers: ['CRITICAL', 'PREMIUM', 'VERIFIED'],
        systemStates: ['FULL', 'REDUCED'],
        fallbackBehavior: 'DISABLE_NOTIFICATIONS'
      }
    };
    
    // System-critical flows
    this.systemCriticalFlows = {
      HEALTH_CHECKS: {
        name: 'Health Checks',
        priority: 'CRITICAL',
        endpoints: ['/health', '/status', '/ping'],
        userTiers: ['ALL'],
        systemStates: ['ALL'],
        bypassAllLimits: true
      },
      
      METRICS_COLLECTION: {
        name: 'Metrics Collection',
        priority: 'HIGH',
        endpoints: ['/api/metrics/*'],
        userTiers: ['CRITICAL'],
        systemStates: ['ALL'],
        bypassAllLimits: true
      },
      
      SYSTEM_ADMIN: {
        name: 'System Administration',
        priority: 'CRITICAL',
        endpoints: ['/api/admin/*', '/api/system/*'],
        userTiers: ['CRITICAL'],
        systemStates: ['ALL'],
        bypassAllLimits: true
      }
    };
    
    // Request classification cache
    this.classificationCache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
    
    // Rate limiting per tier
    this.rateLimits = {
      CRITICAL: { requests: 1000, window: 60 }, // 1000 req/min
      PREMIUM: { requests: 500, window: 60 },   // 500 req/min
      VERIFIED: { requests: 200, window: 60 },  // 200 req/min
      STANDARD: { requests: 100, window: 60 },  // 100 req/min
      ANONYMOUS: { requests: 20, window: 60 }   // 20 req/min
    };
    
    // Queue management
    this.requestQueues = {
      IMMEDIATE: [],
      HIGH: [],
      MEDIUM: [],
      NORMAL: [],
      LOW: []
    };
    
    // Metrics tracking
    this.classificationMetrics = {
      totalRequests: 0,
      classifiedByTier: {},
      classifiedByCriticality: {},
      rejectedRequests: 0,
      queuedRequests: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Classify an incoming request
   */
  async classifyRequest(req) {
    const startTime = Date.now();
    
    try {
      // Extract request information
      const requestInfo = this.extractRequestInfo(req);
      
      // Check cache first
      const cacheKey = this.generateCacheKey(requestInfo);
      const cached = this.classificationCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        this.updateMetrics('cache_hit');
        return cached.classification;
      }
      
      // Perform classification
      const classification = await this.performClassification(requestInfo);
      
      // Cache the result
      this.classificationCache.set(cacheKey, {
        classification,
        timestamp: Date.now()
      });
      
      // Update metrics
      this.updateMetrics('classification', classification);
      
      // Emit classification event
      this.emit('requestClassified', {
        requestInfo,
        classification,
        processingTime: Date.now() - startTime
      });
      
      return classification;
      
    } catch (error) {
      this.logger.error('Request classification failed:', error);
      
      // Return safe default classification
      return this.getDefaultClassification(requestInfo);
    }
  }

  /**
   * Extract request information
   */
  extractRequestInfo(req) {
    return {
      method: req.method,
      path: req.path,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      timestamp: Date.now(),
      headers: req.headers,
      query: req.query,
      body: req.body,
      user: req.user || null,
      session: req.session || null
    };
  }

  /**
   * Perform detailed classification
   */
  async performClassification(requestInfo) {
    // Classify user tier
    const userTier = await this.classifyUserTier(requestInfo);
    
    // Classify request criticality
    const criticality = this.classifyRequestCriticality(requestInfo);
    
    // Identify business flow
    const businessFlow = this.identifyBusinessFlow(requestInfo);
    
    // Check system flow
    const systemFlow = this.identifySystemFlow(requestInfo);
    
    // Calculate overall priority
    const overallPriority = this.calculateOverallPriority(userTier, criticality, businessFlow, systemFlow);
    
    // Determine routing decisions
    const routing = this.determineRouting(userTier, criticality, businessFlow, systemFlow);
    
    return {
      userTier,
      criticality,
      businessFlow,
      systemFlow,
      overallPriority,
      routing,
      timestamp: Date.now(),
      requestId: this.generateRequestId()
    };
  }

  /**
   * Classify user tier
   */
  async classifyUserTier(requestInfo) {
    // Check for authenticated user
    if (requestInfo.user) {
      const user = requestInfo.user;
      
      // Check for critical users
      if (this.isCriticalUser(user)) {
        return 'CRITICAL';
      }
      
      // Check for premium users
      if (this.isPremiumUser(user)) {
        return 'PREMIUM';
      }
      
      // Check for verified users
      if (this.isVerifiedUser(user)) {
        return 'VERIFIED';
      }
      
      // Default to standard for authenticated users
      return 'STANDARD';
    }
    
    // Anonymous user
    return 'ANONYMOUS';
  }

  /**
   * Classify request criticality
   */
  classifyRequestCriticality(requestInfo) {
    const path = requestInfo.path;
    const method = requestInfo.method;
    
    // Check system-critical endpoints first
    for (const [flowName, flow] of Object.entries(this.systemCriticalFlows)) {
      if (this.matchesEndpoint(path, flow.endpoints)) {
        return flow.priority;
      }
    }
    
    // Check business-critical endpoints
    for (const [flowName, flow] of Object.entries(this.businessCriticalFlows)) {
      if (this.matchesEndpoint(path, flow.endpoints)) {
        return flow.priority;
      }
    }
    
    // Classify based on HTTP method and path patterns
    if (path.includes('/auth/') || path.includes('/session/')) {
      return 'CRITICAL';
    }
    
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      return 'HIGH';
    }
    
    if (path.includes('/search') || path.includes('/api/')) {
      return 'MEDIUM';
    }
    
    if (path.includes('/analytics') || path.includes('/recommendations')) {
      return 'LOW';
    }
    
    return 'MEDIUM'; // Default
  }

  /**
   * Identify business flow
   */
  identifyBusinessFlow(requestInfo) {
    const path = requestInfo.path;
    
    for (const [flowName, flow] of Object.entries(this.businessCriticalFlows)) {
      if (this.matchesEndpoint(path, flow.endpoints)) {
        return flowName;
      }
    }
    
    return null;
  }

  /**
   * Identify system flow
   */
  identifySystemFlow(requestInfo) {
    const path = requestInfo.path;
    
    for (const [flowName, flow] of Object.entries(this.systemCriticalFlows)) {
      if (this.matchesEndpoint(path, flow.endpoints)) {
        return flowName;
      }
    }
    
    return null;
  }

  /**
   * Calculate overall priority
   */
  calculateOverallPriority(userTier, criticality, businessFlow, systemFlow) {
    let priority = 0;
    
    // User tier contribution (1-5)
    priority += this.userTiers[userTier].priority;
    
    // Criticality contribution (1-5)
    priority += this.requestCriticality[criticality].priority;
    
    // System flow bonus
    if (systemFlow) {
      priority -= 2; // Lower number = higher priority
    }
    
    // Business flow bonus
    if (businessFlow) {
      const flow = this.businessCriticalFlows[businessFlow];
      if (flow.priority === 'CRITICAL') priority -= 1;
      if (flow.priority === 'HIGH') priority -= 0.5;
    }
    
    return Math.max(1, Math.round(priority));
  }

  /**
   * Determine routing decisions
   */
  determineRouting(userTier, criticality, businessFlow, systemFlow) {
    const routing = {
      shouldQueue: false,
      queuePriority: 'NORMAL',
      shouldReject: false,
      rejectionReason: null,
      timeout: 30000,
      retryPolicy: 'STANDARD',
      rateLimitMultiplier: 1.0
    };
    
    // System flows get immediate processing
    if (systemFlow) {
      routing.queuePriority = 'IMMEDIATE';
      routing.timeout = 60000;
      routing.retryPolicy = 'AGGRESSIVE';
      return routing;
    }
    
    // Check user tier limits
    const tierConfig = this.userTiers[userTier];
    routing.rateLimitMultiplier = tierConfig.rateLimitMultiplier;
    routing.queuePriority = tierConfig.queuePriority;
    
    // Adjust based on criticality
    const criticalityConfig = this.requestCriticality[criticality];
    routing.timeout = criticalityConfig.maxResponseTime;
    routing.retryPolicy = criticalityConfig.retryPolicy;
    
    // Determine if request should be queued under load
    if (criticality === 'LOW' || criticality === 'BACKGROUND') {
      routing.shouldQueue = true;
    }
    
    return routing;
  }

  /**
   * Check if request should be rejected based on system state
   */
  shouldRejectRequest(classification, systemState) {
    const { userTier, criticality, businessFlow } = classification;
    
    // Never reject critical requests
    if (criticality === 'CRITICAL') {
      return { shouldReject: false, reason: null };
    }
    
    // Check business flow restrictions
    if (businessFlow) {
      const flow = this.businessCriticalFlows[businessFlow];
      if (!flow.systemStates.includes(systemState) && systemState !== 'FULL') {
        return {
          shouldReject: true,
          reason: `Flow ${businessFlow} not available in ${systemState} state`
        };
      }
    }
    
    // Check user tier restrictions
    const tierConfig = this.userTiers[userTier];
    if (!tierConfig.features.includes('ALL') && systemState !== 'FULL') {
      // Additional tier-based restrictions could be implemented here
    }
    
    return { shouldReject: false, reason: null };
  }

  /**
   * Check if user is critical
   */
  isCriticalUser(user) {
    if (!user) return false;
    
    return user.role === 'admin' || 
           user.role === 'system' ||
           user.email?.endsWith('@system.admin') ||
           user.permissions?.includes('SYSTEM_CRITICAL');
  }

  /**
   * Check if user is premium
   */
  isPremiumUser(user) {
    if (!user) return false;
    
    return user.subscription?.tier === 'premium' ||
           user.subscription?.tier === 'enterprise' ||
           user.plan === 'premium' ||
           user.isPremium === true;
  }

  /**
   * Check if user is verified
   */
  isVerifiedUser(user) {
    if (!user) return false;
    
    return user.verified === true ||
           user.badges?.includes('verified') ||
           user.reputation > 1000 ||
           user.postsCount > 50;
  }

  /**
   * Check if path matches endpoint patterns
   */
  matchesEndpoint(path, endpoints) {
    return endpoints.some(endpoint => {
      if (endpoint.includes('*')) {
        const pattern = endpoint.replace('*', '.*');
        return new RegExp(`^${pattern}$`).test(path);
      }
      return path === endpoint || path.startsWith(endpoint);
    });
  }

  /**
   * Generate cache key
   */
  generateCacheKey(requestInfo) {
    return `${requestInfo.method}:${requestInfo.path}:${requestInfo.user?.id || 'anonymous'}`;
  }

  /**
   * Generate request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get default classification
   */
  getDefaultClassification(requestInfo) {
    return {
      userTier: 'ANONYMOUS',
      criticality: 'MEDIUM',
      businessFlow: null,
      systemFlow: null,
      overallPriority: 7,
      routing: {
        shouldQueue: false,
        queuePriority: 'NORMAL',
        shouldReject: false,
        rejectionReason: null,
        timeout: 30000,
        retryPolicy: 'STANDARD',
        rateLimitMultiplier: 0.5
      },
      timestamp: Date.now(),
      requestId: this.generateRequestId()
    };
  }

  /**
   * Update classification metrics
   */
  updateMetrics(type, data = null) {
    this.classificationMetrics.totalRequests++;
    
    if (type === 'classification' && data) {
      // Track by user tier
      if (!this.classificationMetrics.classifiedByTier[data.userTier]) {
        this.classificationMetrics.classifiedByTier[data.userTier] = 0;
      }
      this.classificationMetrics.classifiedByTier[data.userTier]++;
      
      // Track by criticality
      if (!this.classificationMetrics.classifiedByCriticality[data.criticality]) {
        this.classificationMetrics.classifiedByCriticality[data.criticality] = 0;
      }
      this.classificationMetrics.classifiedByCriticality[data.criticality]++;
    }
  }

  /**
   * Get classification metrics
   */
  getMetrics() {
    return {
      ...this.classificationMetrics,
      cacheSize: this.classificationCache.size,
      queueSizes: Object.entries(this.requestQueues).map(([priority, queue]) => ({
        priority,
        size: queue.length
      }))
    };
  }

  /**
   * Clear classification cache
   */
  clearCache() {
    this.classificationCache.clear();
    this.logger.info('Traffic classification cache cleared');
  }

  /**
   * Get user tier configuration
   */
  getUserTierConfig(tier) {
    return this.userTiers[tier];
  }

  /**
   * Get criticality configuration
   */
  getCriticalityConfig(criticality) {
    return this.requestCriticality[criticality];
  }

  /**
   * Get business flow configuration
   */
  getBusinessFlowConfig(flow) {
    return this.businessCriticalFlows[flow];
  }

  /**
   * Update rate limits for system state
   */
  updateRateLimitsForSystemState(systemState) {
    const multipliers = {
      FULL: 1.0,
      REDUCED: 0.5,
      EMERGENCY: 0.2,
      SURVIVAL: 0.1,
      READ_ONLY: 0.3,
      CORE_ONLY: 0.05
    };
    
    const multiplier = multipliers[systemState] || 0.1;
    
    Object.keys(this.rateLimits).forEach(tier => {
      const baseLimit = this.userTiers[tier].rateLimitMultiplier;
      this.rateLimits[tier].requests = Math.round(100 * baseLimit * multiplier);
    });
    
    this.logger.info(`Rate limits updated for ${systemState} state with ${multiplier}x multiplier`);
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.clearCache();
    this.logger.info('TrafficClassifier shutdown complete');
  }
}

export default TrafficClassifier;
