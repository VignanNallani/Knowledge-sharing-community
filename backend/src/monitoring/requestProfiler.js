// Request Profiler - Detailed Latency Breakdown
import { logger } from '../config/index.js';

class RequestProfiler {
  constructor() {
    // Only enable in explicit development/profiling mode
    this.enabled = process.env.NODE_ENV === 'development' && process.env.ENABLE_PROFILER === 'true';
    this.sampleRate = parseFloat(process.env.PROFILER_SAMPLE_RATE) || 0.01; // Default 1% sampling
    
    if (this.enabled) {
      console.log('🔬 Request profiler enabled - WARNING: Use for development only!');
    }
  }

  // Middleware for detailed request timing
  middleware() {
    return (req, res, next) => {
      if (!this.enabled) {
        return next();
      }

      // Apply sampling to reduce overhead
      if (Math.random() > this.sampleRate) {
        return next();
      }

      const profileId = `profile_${Date.now()}_${Math.random()}`;
      const profile = {
        id: profileId,
        method: req.method,
        path: req.path,
        startTime: performance.now(),
        phases: {
          middleware: { start: performance.now() },
          auth: { start: null, duration: null },
          database: { start: null, duration: null, queries: [] },
          redis: { start: null, duration: null },
          serialization: { start: null, duration: null },
          response: { start: null, duration: null }
        }
      };

      // Attach profile to request for middleware tracking
      req.profile = profile;

      // Track middleware phase
      const originalNext = next;
      next = (...args) => {
        profile.phases.middleware.duration = performance.now() - profile.phases.middleware.start;
        return originalNext(...args);
      };

      // Override res methods to track phases
      const originalJson = res.json;
      res.json = function(data) {
        profile.phases.serialization.start = performance.now();
        const result = originalJson.call(this, data);
        profile.phases.serialization.duration = performance.now() - profile.phases.serialization.start;
        return result;
      };

      const originalEnd = res.end;
      res.end = function(...args) {
        profile.phases.response.start = performance.now();
        const result = originalEnd.call(this, ...args);
        profile.phases.response.duration = performance.now() - profile.phases.response.start;
        
        // Log complete profile
        profile.totalDuration = performance.now() - profile.startTime;
        RequestProfiler.logProfile(profile);
        
        return result;
      };

      next();
    };
  }

  // Track database query timing
  static trackDatabaseQuery(profile, query, duration, success) {
    if (!profile || !profile.phases.database) return;
    
    if (!profile.phases.database.start) {
      profile.phases.database.start = performance.now();
    }
    
    profile.phases.database.queries.push({
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      duration: duration,
      success: success,
      timestamp: performance.now()
    });
    
    // Update total database time
    profile.phases.database.duration = performance.now() - profile.phases.database.start;
  }

  // Track Redis timing
  static trackRedisOperation(profile, operation, duration, success) {
    if (!profile || !profile.phases.redis) return;
    
    if (!profile.phases.redis.start) {
      profile.phases.redis.start = performance.now();
    }
    
    profile.phases.redis.duration = performance.now() - profile.phases.redis.start;
  }

  // Log detailed profile
  static logProfile(profile) {
    const breakdown = [];
    
    // Middleware phase
    if (profile.phases.middleware.duration) {
      breakdown.push(`Middleware: ${profile.phases.middleware.duration.toFixed(2)}ms`);
    }
    
    // Database phase
    if (profile.phases.database.duration) {
      breakdown.push(`DB: ${profile.phases.database.duration.toFixed(2)}ms (${profile.phases.database.queries.length} queries)`);
      
      // Log slow queries
      profile.phases.database.queries.forEach((query, i) => {
        if (query.duration > 100) { // Log queries over 100ms
          logger.warn(`Slow Query ${i + 1}`, {
            profileId: profile.id,
            duration: `${query.duration.toFixed(2)}ms`,
            query: query.query,
            success: query.success
          });
        }
      });
    }
    
    // Redis phase
    if (profile.phases.redis.duration) {
      breakdown.push(`Redis: ${profile.phases.redis.duration.toFixed(2)}ms`);
    }
    
    // Serialization phase
    if (profile.phases.serialization.duration) {
      breakdown.push(`Serialization: ${profile.phases.serialization.duration.toFixed(2)}ms`);
    }
    
    // Response phase
    if (profile.phases.response.duration) {
      breakdown.push(`Response: ${profile.phases.response.duration.toFixed(2)}ms`);
    }
    
    // Log complete breakdown
    logger.info('Request Profile', {
      profileId: profile.id,
      method: profile.method,
      path: profile.path,
      totalDuration: `${profile.totalDuration.toFixed(2)}ms`,
      breakdown: breakdown.join(' | '),
      queryCount: profile.phases.database.queries.length,
      slowQueries: profile.phases.database.queries.filter(q => q.duration > 100).length
    });
  }

  // Get profile summary for analysis
  static getProfileSummary(profile) {
    return {
      id: profile.id,
      method: profile.method,
      path: profile.path,
      totalDuration: profile.totalDuration,
      phases: {
        middleware: profile.phases.middleware.duration,
        database: {
          duration: profile.phases.database.duration,
          queryCount: profile.phases.database.queries.length,
          slowQueries: profile.phases.database.queries.filter(q => q.duration > 100).length,
          queries: profile.phases.database.queries.map(q => ({
            duration: q.duration,
            success: q.success,
            queryPreview: q.query
          }))
        },
        redis: profile.phases.redis.duration,
        serialization: profile.phases.serialization.duration,
        response: profile.phases.response.duration
      }
    };
  }
}

export default RequestProfiler;
