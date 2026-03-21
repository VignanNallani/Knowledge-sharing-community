/**
 * UX FALLBACK ENGINE
 * Provides graceful error responses and user messaging during system degradation
 * 
 * Ensures users always receive meaningful feedback and alternative options
 * when features are unavailable or the system is under stress
 */

import EventEmitter from 'events';

class UxFallbackEngine extends EventEmitter {
  constructor(dependencies = {}) {
    super();
    
    this.logger = dependencies.logger || console;
    this.stateManager = dependencies.stateManager;
    this.featureMatrix = dependencies.featureMatrix;
    this.messageService = dependencies.messageService;
    
    // UX response templates
    this.responseTemplates = {
      // System state messages
      SYSTEM_STATES: {
        FULL: {
          title: 'All Systems Operational',
          message: 'All features are available and working normally.',
          type: 'success',
          showBanner: false,
          allowActions: true
        },
        
        REDUCED: {
          title: 'Limited Functionality',
          message: 'We\'re experiencing some issues. Some features may be temporarily unavailable.',
          type: 'warning',
          showBanner: true,
          allowActions: true,
          actions: ['retry_later', 'check_status']
        },
        
        EMERGENCY: {
          title: 'Emergency Mode',
          message: 'Critical systems only. We\'re working to restore full functionality.',
          type: 'error',
          showBanner: true,
          allowActions: false,
          actions: ['check_status']
        },
        
        SURVIVAL: {
          title: 'Basic Service Only',
          message: 'Only essential features are available. Full service will be restored soon.',
          type: 'error',
          showBanner: true,
          allowActions: false,
          actions: ['check_status']
        },
        
        READ_ONLY: {
          title: 'Read-Only Mode',
          message: 'You can view content, but creating or editing is temporarily disabled.',
          type: 'warning',
          showBanner: true,
          allowActions: true,
          actions: ['notify_when_available']
        },
        
        CORE_ONLY: {
          title: 'Limited Access',
          message: 'Basic navigation and authentication only. All other features are temporarily unavailable.',
          type: 'error',
          showBanner: true,
          allowActions: false
        }
      },
      
      // Feature-specific messages
      FEATURE_UNAVAILABLE: {
        title: 'Feature Temporarily Unavailable',
        message: 'This feature is currently disabled due to system maintenance.',
        type: 'warning',
        showAlternative: true,
        actions: ['try_alternative', 'notify_when_available']
      },
      
      // Error responses
      RATE_LIMITED: {
        title: 'Too Many Requests',
        message: 'You\'ve exceeded the rate limit. Please try again later.',
        type: 'error',
        retryAfter: 60,
        actions: ['retry_later']
      },
      
      QUEUE_FULL: {
        title: 'System Busy',
        message: 'The system is experiencing high demand. Your request has been queued.',
        type: 'info',
        estimatedWait: 300,
        actions: ['check_queue_position', 'cancel_request']
      },
      
      DEPENDENCY_FAILED: {
        title: 'Service Unavailable',
        message: 'A required service is temporarily unavailable. Please try again later.',
        type: 'error',
        actions: ['retry_later', 'check_status']
      }
    };
    
    // Alternative actions and fallbacks
    this.alternativeActions = {
      CONTENT_CREATION: {
        primary: 'Save as Draft',
        secondary: 'Try Later',
        fallback: 'Email Content to Self',
        description: 'Your content will be saved as a draft and published when the system is ready.'
      },
      
      FILE_UPLOADS: {
        primary: 'Try Smaller File',
        secondary: 'Upload Later',
        fallback: 'Use Cloud Storage Link',
        description: 'File uploads are temporarily disabled. Consider using a cloud storage link.'
      },
      
      SEARCH: {
        primary: 'Basic Search',
        secondary: 'Browse Categories',
        fallback: 'Browse Recent Content',
        description: 'Advanced search is unavailable. Try basic search or browse by category.'
      },
      
      NOTIFICATIONS: {
        primary: 'Check Manually',
        secondary: 'Email Notifications',
        fallback: 'RSS Feed',
        description: 'Real-time notifications are disabled. Check for updates manually.'
      },
      
      COMMENTS: {
        primary: 'Read Comments',
        secondary: 'React with Emoji',
        fallback: 'Share Content',
        description: 'Commenting is temporarily disabled. You can still read existing comments.'
      }
    };
    
    // User guidance by system state
    this.userGuidance = {
      FULL: {
        description: 'All features are available for use.',
        tips: [],
        limitations: []
      },
      
      REDUCED: {
        description: 'Core features are available. Some advanced features may be limited.',
        tips: [
          'Save your work frequently',
          'Use basic search instead of advanced search',
          'Avoid large file uploads'
        ],
        limitations: [
          'File uploads may be slower',
          'Advanced search features are disabled',
          'Real-time notifications may be delayed'
        ]
      },
      
      EMERGENCY: {
        description: 'Only essential features are available. Focus on critical tasks.',
        tips: [
          'Read existing content',
          'Use basic navigation',
          'Avoid creating new content'
        ],
        limitations: [
          'Content creation is disabled',
          'File uploads are not available',
          'Comments and social features are disabled'
        ]
      },
      
      SURVIVAL: {
        description: 'Basic reading and navigation only. System is under heavy load.',
        tips: [
          'Be patient with slow responses',
          'Use cached content when possible',
          'Avoid repeated requests'
        ],
        limitations: [
          'All write operations are disabled',
          'Search functionality is limited',
          'User profiles may be incomplete'
        ]
      },
      
      READ_ONLY: {
        description: 'You can view content but cannot make changes.',
        tips: [
          'Read and browse content',
          'Save content locally for later editing',
          'Prepare content for when editing is restored'
        ],
        limitations: [
          'No content creation or editing',
          'No comments or interactions',
          'No profile changes'
        ]
      },
      
      CORE_ONLY: {
        description: 'Only authentication and basic navigation available.',
        tips: [
          'Log in to be ready when features return',
          'Browse basic site structure',
          'Check status page for updates'
        ],
        limitations: [
          'No content access',
          'No user profiles',
          'No search functionality'
        ]
      }
    };
    
    // Progressive enhancement strategies
    this.progressiveEnhancement = {
      CONTENT_LOADING: {
        full: 'Load with all media, comments, and interactions',
        reduced: 'Load text content with basic images',
        emergency: 'Load text content only',
        survival: 'Load cached text content only',
        readOnly: 'Load from cache with no updates'
      },
      
      SEARCH_FUNCTIONALITY: {
        full: 'Advanced search with filters and suggestions',
        reduced: 'Basic search with limited results',
        emergency: 'Category browsing only',
        survival: 'No search available',
        readOnly: 'Read-only search of cached content'
      },
      
      USER_INTERACTIONS: {
        full: 'All interactions including real-time updates',
        reduced: 'Basic interactions without real-time updates',
        emergency: 'Read-only interactions',
        survival: 'No interactions available',
        readOnly: 'View existing interactions only'
      }
    };
    
    // Response caching
    this.responseCache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
    
    // Metrics
    this.metrics = {
      totalResponses: 0,
      responsesByType: {},
      userActions: {},
      fallbackUsage: {}
    };
  }

  /**
   * Generate UX response for a request
   */
  async generateResponse(requestContext, error = null, systemState = null) {
    try {
      const responseId = this.generateResponseId();
      const startTime = Date.now();
      
      // Determine response type
      const responseType = this.determineResponseType(requestContext, error, systemState);
      
      // Generate appropriate response
      const response = await this.buildResponse(responseType, requestContext, error, systemState);
      
      // Cache the response
      this.cacheResponse(responseId, response);
      
      // Update metrics
      this.updateMetrics(responseType);
      
      // Emit response event
      this.emit('responseGenerated', {
        responseId,
        responseType,
        requestContext,
        response,
        processingTime: Date.now() - startTime
      });
      
      return response;
      
    } catch (err) {
      this.logger.error('UX response generation failed:', err);
      return this.getDefaultErrorResponse(requestContext);
    }
  }

  /**
   * Determine response type based on context
   */
  determineResponseType(requestContext, error, systemState) {
    // Check for specific errors first
    if (error) {
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        return 'RATE_LIMITED';
      }
      
      if (error.code === 'QUEUE_FULL') {
        return 'QUEUE_FULL';
      }
      
      if (error.code === 'DEPENDENCY_FAILED') {
        return 'DEPENDENCY_FAILED';
      }
      
      if (error.code === 'FEATURE_DISABLED') {
        return 'FEATURE_UNAVAILABLE';
      }
    }
    
    // Check system state
    if (systemState && systemState !== 'FULL') {
      return 'SYSTEM_STATE';
    }
    
    // Default to success response
    return 'SUCCESS';
  }

  /**
   * Build response based on type
   */
  async buildResponse(responseType, requestContext, error, systemState) {
    const baseResponse = {
      timestamp: Date.now(),
      requestId: requestContext.requestId || this.generateRequestId(),
      systemState: systemState || 'FULL',
      responseId: this.generateResponseId()
    };
    
    switch (responseType) {
      case 'SYSTEM_STATE':
        return this.buildSystemStateResponse(baseResponse, systemState, requestContext);
        
      case 'FEATURE_UNAVAILABLE':
        return this.buildFeatureUnavailableResponse(baseResponse, requestContext, error);
        
      case 'RATE_LIMITED':
        return this.buildRateLimitedResponse(baseResponse, requestContext, error);
        
      case 'QUEUE_FULL':
        return this.buildQueueFullResponse(baseResponse, requestContext, error);
        
      case 'DEPENDENCY_FAILED':
        return this.buildDependencyFailedResponse(baseResponse, requestContext, error);
        
      case 'SUCCESS':
      default:
        return this.buildSuccessResponse(baseResponse, requestContext);
    }
  }

  /**
   * Build system state response
   */
  buildSystemStateResponse(baseResponse, systemState, requestContext) {
    const template = this.responseTemplates.SYSTEM_STATES[systemState] || 
                    this.responseTemplates.SYSTEM_STATES.FULL;
    
    const guidance = this.userGuidance[systemState] || this.userGuidance.FULL;
    
    return {
      ...baseResponse,
      type: 'system_state',
      status: template.type,
      title: template.title,
      message: template.message,
      showBanner: template.showBanner,
      allowActions: template.allowActions,
      actions: template.actions || [],
      guidance: {
        description: guidance.description,
        tips: guidance.tips,
        limitations: guidance.limitations
      },
      progressiveEnhancement: this.getProgressiveEnhancement(systemState),
      estimatedRecovery: this.estimateRecoveryTime(systemState),
      alternatives: this.getAlternativesForState(systemState)
    };
  }

  /**
   * Build feature unavailable response
   */
  buildFeatureUnavailableResponse(baseResponse, requestContext, error) {
    const template = this.responseTemplates.FEATURE_UNAVAILABLE;
    const feature = this.extractFeatureFromRequest(requestContext);
    const alternative = this.alternativeActions[feature];
    
    return {
      ...baseResponse,
      type: 'feature_unavailable',
      status: template.type,
      title: template.title,
      message: template.message,
      feature: feature,
      showAlternative: template.showAlternative && !!alternative,
      alternative: alternative,
      actions: template.actions,
      fallbackOptions: this.getFallbackOptions(feature),
      notifyWhenAvailable: true
    };
  }

  /**
   * Build rate limited response
   */
  buildRateLimitedResponse(baseResponse, requestContext, error) {
    const template = this.responseTemplates.RATE_LIMITED;
    const retryAfter = error?.retryAfter || template.retryAfter;
    
    return {
      ...baseResponse,
      type: 'rate_limited',
      status: template.type,
      title: template.title,
      message: template.message,
      retryAfter: retryAfter,
      actions: template.actions,
      nextRequestTime: Date.now() + (retryAfter * 1000),
      rateLimitInfo: {
        limit: error?.limit,
        remaining: error?.remaining,
        reset: error?.reset
      }
    };
  }

  /**
   * Build queue full response
   */
  buildQueueFullResponse(baseResponse, requestContext, error) {
    const template = this.responseTemplates.QUEUE_FULL;
    const estimatedWait = error?.estimatedWait || template.estimatedWait;
    const queuePosition = error?.queuePosition || null;
    
    return {
      ...baseResponse,
      type: 'queue_full',
      status: template.type,
      title: template.title,
      message: template.message,
      estimatedWait: estimatedWait,
      queuePosition: queuePosition,
      actions: template.actions,
      canCancel: true,
      queueId: error?.queueId || this.generateQueueId()
    };
  }

  /**
   * Build dependency failed response
   */
  buildDependencyFailedResponse(baseResponse, requestContext, error) {
    const template = this.responseTemplates.DEPENDENCY_FAILED;
    const dependency = error?.dependency || 'Unknown service';
    
    return {
      ...baseResponse,
      type: 'dependency_failed',
      status: template.type,
      title: template.title,
      message: template.message,
      dependency: dependency,
      actions: template.actions,
      canRetry: true,
      retryDelay: 30000, // 30 seconds
      affectedFeatures: this.getFeaturesAffectedByDependency(dependency)
    };
  }

  /**
   * Build success response
   */
  buildSuccessResponse(baseResponse, requestContext) {
    return {
      ...baseResponse,
      type: 'success',
      status: 'success',
      message: 'Request completed successfully',
      data: requestContext.responseData || null
    };
  }

  /**
   * Get progressive enhancement for system state
   */
  getProgressiveEnhancement(systemState) {
    const enhancement = {};
    
    Object.entries(this.progressiveEnhancement).forEach(([feature, levels]) => {
      enhancement[feature] = levels[systemState.toLowerCase()] || levels.full;
    });
    
    return enhancement;
  }

  /**
   * Estimate recovery time for system state
   */
  estimateRecoveryTime(systemState) {
    const estimates = {
      FULL: 0,
      REDUCED: 300000,      // 5 minutes
      EMERGENCY: 900000,    // 15 minutes
      SURVIVAL: 1800000,    // 30 minutes
      READ_ONLY: 600000,    // 10 minutes
      CORE_ONLY: 3600000    // 1 hour
    };
    
    return estimates[systemState] || 0;
  }

  /**
   * Get alternatives for system state
   */
  getAlternativesForState(systemState) {
    const alternatives = {
      REDUCED: [
        'Use basic search instead of advanced search',
        'Save content as drafts for later publishing',
        'Use smaller file sizes for uploads'
      ],
      EMERGENCY: [
        'Read existing content',
        'Browse categories manually',
        'Check back later for full functionality'
      ],
      SURVIVAL: [
        'Use cached content when possible',
        'Avoid repeated requests',
        'Be patient with slow responses'
      ],
      READ_ONLY: [
        'Save content locally for editing later',
        'Prepare content for when editing is restored',
        'Use offline mode if available'
      ],
      CORE_ONLY: [
        'Wait for system recovery',
        'Check status page for updates',
        'Contact support if urgent'
      ]
    };
    
    return alternatives[systemState] || [];
  }

  /**
   * Extract feature from request context
   */
  extractFeatureFromRequest(requestContext) {
    const path = requestContext.path || '';
    const method = requestContext.method || 'GET';
    
    if (path.includes('/content/create') || path.includes('/posts/create')) {
      return 'CONTENT_CREATION';
    }
    
    if (path.includes('/upload')) {
      return 'FILE_UPLOADS';
    }
    
    if (path.includes('/search')) {
      return 'SEARCH';
    }
    
    if (path.includes('/notifications')) {
      return 'NOTIFICATIONS';
    }
    
    if (path.includes('/comments')) {
      return 'COMMENTS';
    }
    
    return 'UNKNOWN';
  }

  /**
   * Get fallback options for a feature
   */
  getFallbackOptions(feature) {
    const fallbacks = {
      CONTENT_CREATION: [
        { id: 'save_draft', label: 'Save as Draft', description: 'Save content locally' },
        { id: 'email_later', label: 'Email to Self', description: 'Send content via email' },
        { id: 'schedule', label: 'Schedule for Later', description: 'Queue for publishing' }
      ],
      
      FILE_UPLOADS: [
        { id: 'smaller_file', label: 'Try Smaller File', description: 'Reduce file size' },
        { id: 'cloud_link', label: 'Use Cloud Link', description: 'Provide external link' },
        { id: 'upload_later', label: 'Upload Later', description: 'Save for later upload' }
      ],
      
      SEARCH: [
        { id: 'basic_search', label: 'Basic Search', description: 'Use simple search' },
        { id: 'browse_categories', label: 'Browse Categories', description: 'Navigate by category' },
        { id: 'recent_content', label: 'Recent Content', description: 'View latest posts' }
      ]
    };
    
    return fallbacks[feature] || [];
  }

  /**
   * Get features affected by dependency
   */
  getFeaturesAffectedByDependency(dependency) {
    const affectedFeatures = {
      DATABASE: ['Content Reading', 'User Profiles', 'Authentication', 'Content Creation'],
      CACHE: ['Search', 'Content Reading', 'User Profiles'],
      AUTH_SERVICE: ['Authentication', 'User Sessions'],
      FILE_STORAGE: ['File Uploads', 'Content Creation', 'User Profiles'],
      NOTIFICATION_SERVICE: ['Notifications', 'Comments', 'Social Features'],
      SEARCH_SERVICE: ['Search', 'Recommendations', 'Advanced Search']
    };
    
    return affectedFeatures[dependency] || ['Unknown features'];
  }

  /**
   * Generate response ID
   */
  generateResponseId() {
    return `ux_resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate request ID
   */
  generateRequestId() {
    return `ux_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate queue ID
   */
  generateQueueId() {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cache response
   */
  cacheResponse(responseId, response) {
    this.responseCache.set(responseId, {
      response,
      timestamp: Date.now()
    });
  }

  /**
   * Get cached response
   */
  getCachedResponse(responseId) {
    const cached = this.responseCache.get(responseId);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.response;
    }
    return null;
  }

  /**
   * Update metrics
   */
  updateMetrics(responseType) {
    this.metrics.totalResponses++;
    
    if (!this.metrics.responsesByType[responseType]) {
      this.metrics.responsesByType[responseType] = 0;
    }
    this.metrics.responsesByType[responseType]++;
  }

  /**
   * Get default error response
   */
  getDefaultErrorResponse(requestContext) {
    return {
      timestamp: Date.now(),
      requestId: requestContext.requestId || this.generateRequestId(),
      type: 'error',
      status: 'error',
      title: 'Service Temporarily Unavailable',
      message: 'We\'re experiencing technical difficulties. Please try again later.',
      actions: ['retry_later'],
      canRetry: true,
      retryDelay: 30000
    };
  }

  /**
   * Get user guidance for current state
   */
  getUserGuidance(systemState) {
    return this.userGuidance[systemState] || this.userGuidance.FULL;
  }

  /**
   * Get response template
   */
  getResponseTemplate(type, subtype = null) {
    if (subtype && this.responseTemplates[type]?.[subtype]) {
      return this.responseTemplates[type][subtype];
    }
    return this.responseTemplates[type];
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.responseCache.size
    };
  }

  /**
   * Clear response cache
   */
  clearCache() {
    this.responseCache.clear();
    this.logger.info('UX fallback response cache cleared');
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.clearCache();
    this.logger.info('UxFallbackEngine shutdown complete');
  }
}

export default UxFallbackEngine;
