/**
 * Mentorship System Webhooks
 * Provides event-driven integration points for external systems
 */

import { observability } from '../utils/observability.js';
import { MentorshipRequestDto, MentorshipRelationshipDto, SessionDto, FeedbackDto } from '../dto/mentorship.dto.js';
import { createHmac, randomBytes } from 'crypto';

const crypto = { createHmac, randomBytes };

class MentorshipWebhooks {
  constructor() {
    this.subscribers = new Map();
    this.eventQueue = [];
    this.isProcessing = false;
  }

  /**
   * Subscribe to mentorship events
   * @param {string} eventType - Event type to subscribe to
   * @param {string} webhookUrl - URL to send webhook to
   * @param {Object} options - Subscription options
   */
  subscribe(eventType, webhookUrl, options = {}) {
    const subscription = {
      id: this.generateSubscriptionId(),
      eventType,
      webhookUrl,
      secret: options.secret || this.generateSecret(),
      retries: options.retries || 3,
      timeout: options.timeout || 10000,
      headers: options.headers || {},
      active: true,
      createdAt: new Date(),
      lastTriggered: null,
      successCount: 0,
      failureCount: 0
    };

    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }

    this.subscribers.get(eventType).push(subscription);

    observability.trackBusinessEvent('webhook_subscribed', {
      eventType,
      webhookUrl,
      subscriptionId: subscription.id
    });

    return subscription;
  }

  /**
   * Unsubscribe from mentorship events
   * @param {string} subscriptionId - Subscription ID to remove
   */
  unsubscribe(subscriptionId) {
    for (const [eventType, subscriptions] of this.subscribers.entries()) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        if (subscriptions.length === 0) {
          this.subscribers.delete(eventType);
        }
        
        observability.trackBusinessEvent('webhook_unsubscribed', {
          eventType,
          subscriptionId
        });
        
        return true;
      }
    }
    return false;
  }

  /**
   * Trigger mentorship event
   * @param {string} eventType - Event type
   * @param {Object} eventData - Event data
   * @param {Object} context - Event context
   */
  async trigger(eventType, eventData, context = {}) {
    const event = {
      id: this.generateEventId(),
      eventType,
      data: this.sanitizeEventData(eventData, eventType),
      context: {
        timestamp: new Date().toISOString(),
        source: 'mentorship-system',
        version: '1.0',
        ...context
      },
      retryCount: 0
    };

    this.eventQueue.push(event);
    
    if (!this.isProcessing) {
      this.processEventQueue();
    }

    return event.id;
  }

  /**
   * Process event queue
   */
  async processEventQueue() {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      await this.deliverEvent(event);
    }

    this.isProcessing = false;
  }

  /**
   * Deliver event to subscribers
   * @param {Object} event - Event to deliver
   */
  async deliverEvent(event) {
    const subscribers = this.subscribers.get(event.eventType) || [];
    
    const deliveryPromises = subscribers
      .filter(sub => sub.active)
      .map(subscription => this.deliverToSubscriber(subscription, event));

    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Deliver event to specific subscriber
   * @param {Object} subscription - Subscription details
   * @param {Object} event - Event to deliver
   */
  async deliverToSubscriber(subscription, event) {
    const startTime = Date.now();
    
    try {
      const payload = this.createWebhookPayload(event, subscription);
      const signature = this.generateSignature(payload, subscription.secret);

      const response = await fetch(subscription.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Event-Type': event.eventType,
          'X-Event-ID': event.id,
          ...subscription.headers
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(subscription.timeout)
      });

      if (response.ok) {
        subscription.successCount++;
        subscription.lastTriggered = new Date();
        
        observability.trackBusinessEvent('webhook_delivered', {
          subscriptionId: subscription.id,
          eventType: event.eventType,
          eventId: event.id,
          responseTime: Date.now() - startTime
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      subscription.failureCount++;
      
      observability.trackError(error, {
        subscriptionId: subscription.id,
        eventType: event.eventType,
        eventId: event.id
      });

      // Retry logic
      if (subscription.failureCount <= subscription.retries) {
        const delay = Math.pow(2, subscription.failureCount) * 1000; // Exponential backoff
        setTimeout(() => {
          this.deliverToSubscriber(subscription, event);
        }, delay);
      } else {
        // Disable subscription after max retries
        subscription.active = false;
        
        observability.trackBusinessEvent('webhook_disabled', {
          subscriptionId: subscription.id,
          eventType: event.eventType,
          failureCount: subscription.failureCount
        });
      }
    }
  }

  /**
   * Create webhook payload
   * @param {Object} event - Event data
   * @param {Object} subscription - Subscription details
   */
  createWebhookPayload(event, subscription) {
    return {
      id: event.id,
      type: event.eventType,
      timestamp: event.context.timestamp,
      source: event.context.source,
      version: event.context.version,
      data: event.data,
      signature: this.generateSignature(event.data, subscription.secret)
    };
  }

  /**
   * Sanitize event data based on event type
   * @param {Object} data - Raw event data
   * @param {string} eventType - Event type
   */
  sanitizeEventData(data, eventType) {
    switch (eventType) {
      case 'mentorship_request.created':
        return MentorshipRequestDto.create(data);
      
      case 'mentorship_request.responded':
        return MentorshipRequestDto.detail(data);
      
      case 'mentorship_relationship.started':
        return MentorshipRelationshipDto.create(data);
      
      case 'mentorship_relationship.ended':
        return MentorshipRelationshipDto.detail(data);
      
      case 'mentorship_session.scheduled':
        return SessionDto.create(data);
      
      case 'mentorship_session.completed':
        return SessionDto.detail(data);
      
      case 'mentorship_feedback.submitted':
        return FeedbackDto.create(data);
      
      case 'mentorship_trust_score.updated':
        return {
          userId: data.userId,
          previousScore: data.previousScore,
          newScore: data.newScore,
          change: data.newScore - data.previousScore,
          reason: data.reason
        };
      
      default:
        return data;
    }
  }

  /**
   * Generate HMAC signature
   * @param {Object} payload - Payload to sign
   * @param {string} secret - Secret key
   */
  generateSignature(payload, secret) {
    const payloadString = JSON.stringify(payload);
    return crypto.createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Verify webhook signature
   * @param {Object} payload - Received payload
   * @param {string} signature - Received signature
   * @param {string} secret - Secret key
   */
  verifySignature(payload, signature, secret) {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Generate subscription ID
   */
  generateSubscriptionId() {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate secret key
   */
  generateSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get subscription statistics
   */
  getStatistics() {
    const stats = {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      totalEvents: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      eventsByType: {},
      subscriptionsByType: {}
    };

    for (const [eventType, subscriptions] of this.subscribers.entries()) {
      stats.subscriptionsByType[eventType] = subscriptions.length;
      stats.totalSubscriptions += subscriptions.length;
      
      subscriptions.forEach(sub => {
        if (sub.active) {
          stats.activeSubscriptions++;
        }
        stats.successfulDeliveries += sub.successCount;
        stats.failedDeliveries += sub.failureCount;
      });
    }

    return stats;
  }

  /**
   * Get subscription details
   */
  getSubscription(subscriptionId) {
    for (const subscriptions of this.subscribers.values()) {
      const subscription = subscriptions.find(sub => sub.id === subscriptionId);
      if (subscription) {
        return { ...subscription };
      }
    }
    return null;
  }

  /**
   * List all subscriptions
   */
  listSubscriptions(eventType = null) {
    if (eventType) {
      return this.subscribers.get(eventType) || [];
    }
    
    const allSubscriptions = [];
    for (const subscriptions of this.subscribers.values()) {
      allSubscriptions.push(...subscriptions);
    }
    return allSubscriptions;
  }
}

// Event Types
export const MENTORSHIP_EVENTS = {
  // Request Events
  REQUEST_CREATED: 'mentorship_request.created',
  REQUEST_RESPONDED: 'mentorship_request.responded',
  REQUEST_EXPIRED: 'mentorship_request.expired',
  REQUEST_WITHDRAWN: 'mentorship_request.withdrawn',
  
  // Relationship Events
  RELATIONSHIP_STARTED: 'mentorship_relationship.started',
  RELATIONSHIP_PAUSED: 'mentorship_relationship.paused',
  RELATIONSHIP_COMPLETED: 'mentorship_relationship.completed',
  RELATIONSHIP_TERMINATED: 'mentorship_relationship.terminated',
  
  // Session Events
  SESSION_SCHEDULED: 'mentorship_session.scheduled',
  SESSION_STARTED: 'mentorship_session.started',
  SESSION_COMPLETED: 'mentorship_session.completed',
  SESSION_CANCELLED: 'mentorship_session.cancelled',
  SESSION_NO_SHOW: 'mentorship_session.no_show',
  
  // Feedback Events
  FEEDBACK_SUBMITTED: 'mentorship_feedback.submitted',
  FEEDBACK_UPDATED: 'mentorship_feedback.updated',
  
  // Trust Score Events
  TRUST_SCORE_UPDATED: 'mentorship_trust_score.updated',
  TRUST_SCORE_ADJUSTED: 'mentorship_trust_score.adjusted',
  
  // Profile Events
  MENTOR_PROFILE_CREATED: 'mentor_profile.created',
  MENTOR_PROFILE_UPDATED: 'mentor_profile.updated',
  MENTOR_PROFILE_VERIFIED: 'mentor_profile.verified',
  
  MENTEE_PROFILE_CREATED: 'mentee_profile.created',
  MENTEE_PROFILE_UPDATED: 'mentee_profile.updated',
  
  // System Events
  SYSTEM_ALERT: 'mentorship_system.alert',
  SYSTEM_MAINTENANCE: 'mentorship_system.maintenance'
};

// Create singleton instance
const mentorshipWebhooks = new MentorshipWebhooks();

export default mentorshipWebhooks;
export { MENTORSHIP_EVENTS };
