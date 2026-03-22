import { EventEmitter } from 'events';
import { logger } from '../../config/index.js';
import EVENT_TYPES from './eventTypes.js';

class EventBus {
  constructor() {
    this.eventEmitter = new EventEmitter();
    
    // Set maximum listeners to prevent memory leak warnings
    this.eventEmitter.setMaxListeners(50);
    
    // Track event statistics
    this.eventStats = {
      emitted: {},
      errors: {},
      listeners: {}
    };
    
    // Bind methods to maintain context
    this.emit = this.emit.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
  }

  /**
   * Emit an event with safe async dispatch
   * @param {string} eventName - Name of the event
   * @param {object} payload - Event payload data
   */
  emit(eventName, payload = {}) {
    try {
      // Validate event name
      if (!eventName || typeof eventName !== 'string') {
        logger.error('EventBus: Invalid event name', { eventName, payload });
        return false;
      }

      // Validate payload
      if (payload !== null && typeof payload !== 'object') {
        logger.error('EventBus: Invalid payload type', { eventName, payload });
        return false;
      }

      // Validate event type exists
      if (!this.isValidEventType(eventName)) {
        logger.warn('EventBus: Unknown event type', { eventName, payload });
      }

      // Track emission
      this.eventStats.emitted[eventName] = (this.eventStats.emitted[eventName] || 0) + 1;

      // Add metadata to payload
      const enhancedPayload = {
        ...payload,
        _metadata: {
          timestamp: new Date().toISOString(),
          eventId: this.generateEventId(),
          eventName
        }
      };

      // Log event emission (structured)
      logger.info('Event emitted', {
        eventName,
        eventId: enhancedPayload._metadata.eventId,
        payload: this.sanitizePayload(payload),
        listenerCount: this.eventEmitter.listenerCount(eventName)
      });

      // Use setImmediate for non-blocking async dispatch
      const emitted = this.eventEmitter.listenerCount(eventName) > 0;
      
      if (emitted) {
        // Dispatch asynchronously to avoid blocking main thread
        setImmediate(() => {
          try {
            this.eventEmitter.emit(eventName, enhancedPayload);
          } catch (error) {
            // Track error statistics
            this.eventStats.errors[eventName] = (this.eventStats.errors[eventName] || 0) + 1;
            
            logger.error('EventBus: Error during async emit', {
              eventName,
              error: error.message,
              stack: error.stack,
              payload: this.sanitizePayload(payload)
            });
          }
        });
      } else {
        logger.warn('Event emitted but no listeners', { eventName });
      }

      return emitted;
    } catch (error) {
      // Track error statistics
      this.eventStats.errors[eventName] = (this.eventStats.errors[eventName] || 0) + 1;
      
      logger.error('EventBus: Error during emit', {
        eventName,
        error: error.message,
        stack: error.stack,
        payload: this.sanitizePayload(payload)
      });
      
      return false;
    }
  }

  /**
   * Register event listener with safe error handling
   * @param {string} eventName - Name of the event
   * @param {function} listener - Event listener function
   * @param {object} options - Listener options
   */
  on(eventName, listener, options = {}) {
    try {
      // Validate inputs
      if (!eventName || typeof eventName !== 'string') {
        throw new Error('Invalid event name');
      }

      if (typeof listener !== 'function') {
        throw new Error('Listener must be a function');
      }

      // Track listener registration
      this.eventStats.listeners[eventName] = (this.eventStats.listeners[eventName] || 0) + 1;

      // Create safe wrapper around listener
      const safeListener = async (payload) => {
        try {
          await listener(payload);
        } catch (error) {
          // Track error statistics
          this.eventStats.errors[eventName] = (this.eventStats.errors[eventName] || 0) + 1;
          
          logger.error('EventBus: Error in event listener', {
            eventName,
            error: error.message,
            stack: error.stack,
            payload: this.sanitizePayload(payload),
            listenerName: listener.name || 'anonymous'
          });
          
          // Don't re-throw to prevent application crash
          if (options.throwOnError) {
            throw error;
          }
        }
      };

      // Register the safe listener
      this.eventEmitter.on(eventName, safeListener);

      logger.info('Event listener registered', {
        eventName,
        listenerName: listener.name || 'anonymous',
        totalListeners: this.eventEmitter.listenerCount(eventName)
      });

      // Return unsubscribe function
      return () => this.off(eventName, safeListener);
    } catch (error) {
      logger.error('EventBus: Error registering listener', {
        eventName,
        error: error.message,
        listenerName: listener.name || 'anonymous'
      });
      throw error;
    }
  }

  /**
   * Remove event listener
   * @param {string} eventName - Name of the event
   * @param {function} listener - Event listener function
   */
  off(eventName, listener) {
    try {
      this.eventEmitter.off(eventName, listener);
      
      // Update listener count
      this.eventStats.listeners[eventName] = Math.max(0, 
        (this.eventStats.listeners[eventName] || 0) - 1
      );

      logger.info('Event listener removed', {
        eventName,
        listenerName: listener.name || 'anonymous',
        totalListeners: this.eventEmitter.listenerCount(eventName)
      });
    } catch (error) {
      logger.error('EventBus: Error removing listener', {
        eventName,
        error: error.message,
        listenerName: listener.name || 'anonymous'
      });
    }
  }

  /**
   * Remove all listeners for an event
   * @param {string} eventName - Name of the event
   */
  removeAllListeners(eventName) {
    try {
      this.eventEmitter.removeAllListeners(eventName);
      
      // Reset listener count
      this.eventStats.listeners[eventName] = 0;

      logger.info('All event listeners removed', { eventName });
    } catch (error) {
      logger.error('EventBus: Error removing all listeners', {
        eventName,
        error: error.message
      });
    }
  }

  /**
   * Validate event type against known event types
   */
  isValidEventType(eventName) {
    try {
      return Object.values(EVENT_TYPES).includes(eventName);
    } catch (error) {
      logger.warn('EventBus: Error validating event type', {
        eventName,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get comprehensive event statistics
   */
  getEventStats() {
    return {
      emitted: { ...this.eventStats.emitted },
      totalEmitted: Object.values(this.eventStats.emitted).reduce((sum, count) => sum + count, 0),
      uniqueEvents: Object.keys(this.eventStats.emitted).length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get listener statistics
   */
  getListenerStats() {
    const eventNames = this.eventEmitter.eventNames();
    const listenerCounts = {};
    
    eventNames.forEach(eventName => {
      listenerCounts[eventName] = this.eventEmitter.listenerCount(eventName);
    });

    return {
      listeners: { ...this.eventStats.listeners },
      currentListeners: listenerCounts,
      totalListeners: Object.values(listenerCounts).reduce((sum, count) => sum + count, 0),
      uniqueEvents: eventNames.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      errors: { ...this.eventStats.errors },
      totalErrors: Object.values(this.eventStats.errors).reduce((sum, count) => sum + count, 0),
      errorRate: this.calculateErrorRate(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate error rate percentage
   */
  calculateErrorRate() {
    const totalEmitted = Object.values(this.eventStats.emitted).reduce((sum, count) => sum + count, 0);
    const totalErrors = Object.values(this.eventStats.errors).reduce((sum, count) => sum + count, 0);
    
    if (totalEmitted === 0) return 0;
    return parseFloat(((totalErrors / totalEmitted) * 100).toFixed(2));
  }

  /**
   * Get comprehensive statistics (all stats combined)
   */
  getStats() {
    return {
      ...this.eventStats,
      eventStats: this.getEventStats(),
      listenerStats: this.getListenerStats(),
      errorStats: this.getErrorStats(),
      totalListeners: Object.values(this.eventStats.listeners).reduce((sum, count) => sum + count, 0),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset event statistics
   */
  resetStats() {
    this.eventStats = {
      emitted: {},
      errors: {},
      listeners: {}
    };
    logger.info('EventBus statistics reset');
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize payload for logging (remove sensitive data)
   */
  sanitizePayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    const sanitized = { ...payload };

    // Remove sensitive fields
    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    // Remove metadata for cleaner logs
    if (sanitized._metadata) {
      delete sanitized._metadata;
    }

    return sanitized;
  }

  /**
   * Get all registered event names
   */
  getEventNames() {
    return this.eventEmitter.eventNames();
  }

  /**
   * Get listener count for specific event
   */
  getListenerCount(eventName) {
    return this.eventEmitter.listenerCount(eventName);
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    try {
      logger.info('EventBus shutting down', this.getStats());
      this.eventEmitter.removeAllListeners();
      this.resetStats();
    } catch (error) {
      logger.error('EventBus: Error during shutdown', { error: error.message });
    }
  }
}

// Create singleton instance
const eventBus = new EventBus();

// Handle process termination gracefully - DISABLED for Render compatibility
// process.on('SIGTERM', () => {
//   eventBus.shutdown();
// });

// process.on('SIGINT', () => {
//   eventBus.shutdown();
// });

export default eventBus;
