// Slow Query Logger - Production Monitoring
import { logger } from '../config/index.js';

class SlowQueryLogger {
  constructor(options = {}) {
    this.slowThreshold = options.slowThreshold || 300; // 300ms
    this.verySlowThreshold = options.verySlowThreshold || 1000; // 1s
    this.criticalThreshold = options.criticalThreshold || 3000; // 3s
  }

  logSlowQuery(query, duration, params = {}) {
    let level = 'info';
    let message = 'Query executed';

    if (duration >= this.criticalThreshold) {
      level = 'error';
      message = 'CRITICAL slow query detected';
    } else if (duration >= this.verySlowThreshold) {
      level = 'warn';
      message = 'Very slow query detected';
    } else if (duration >= this.slowThreshold) {
      level = 'info';
      message = 'Slow query detected';
    }

    logger[level](message, {
      query: this.sanitizeQuery(query),
      duration: `${duration}ms`,
      threshold: this.getThreshold(duration),
      params: this.sanitizeParams(params),
      timestamp: new Date().toISOString()
    });
  }

  sanitizeQuery(query) {
    // Remove sensitive data from query logs
    if (typeof query === 'string') {
      return query.replace(/password\s*=\s*['"][^'"]*['"]/gi, 'password=***')
                 .replace(/token\s*=\s*['"][^'"]*['"]/gi, 'token=***');
    }
    return query;
  }

  sanitizeParams(params) {
    if (!params || typeof params !== 'object') return params;
    
    const sanitized = { ...params };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'accessToken', 'refreshToken', 'secret'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    });
    
    return sanitized;
  }

  getThreshold(duration) {
    if (duration >= this.criticalThreshold) return 'critical';
    if (duration >= this.verySlowThreshold) return 'very-slow';
    if (duration >= this.slowThreshold) return 'slow';
    return 'normal';
  }

  // Prisma query event hook
  createPrismaMiddleware() {
    return (params, next) => {
      const before = Date.now();
      
      return next(params).then(result => {
        const duration = Date.now() - before;
        this.logSlowQuery(params.model + '.' + params.action, duration, params.args);
        return result;
      }).catch(error => {
        const duration = Date.now() - before;
        this.logSlowQuery(params.model + '.' + params.action + ' (ERROR)', duration, params.args);
        throw error;
      });
    };
  }
}

export default SlowQueryLogger;
