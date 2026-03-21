import queueManager from './queue.manager.js';
import { emailJobProcessor } from './jobs/email.job.js';
import { notificationJobProcessor } from './jobs/notification.job.js';
import { logger } from '../config/index.js';

class QueueService {
  constructor() {
    this.isInitialized = false;
    this.queues = {
      email: 'email-queue',
      notifications: 'notification-queue',
      cleanup: 'cleanup-queue',
      analytics: 'analytics-queue'
    };
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create email queue and worker
      queueManager.createQueue(this.queues.email);
      queueManager.createWorker(
        this.queues.email,
        emailJobProcessor,
        { concurrency: 3 }
      );

      // Create notification queue and worker
      queueManager.createQueue(this.queues.notifications);
      queueManager.createWorker(
        this.queues.notifications,
        notificationJobProcessor,
        { concurrency: 5 }
      );

      // Create cleanup queue and worker
      queueManager.createQueue(this.queues.cleanup);
      queueManager.createWorker(
        this.queues.cleanup,
        this.cleanupJobProcessor.bind(this),
        { concurrency: 1 }
      );

      // Create analytics queue and worker
      queueManager.createQueue(this.queues.analytics);
      queueManager.createWorker(
        this.queues.analytics,
        this.analyticsJobProcessor.bind(this),
        { concurrency: 2 }
      );

      this.isInitialized = true;
      logger.info('Queue service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize queue service:', error);
      throw error;
    }
  }

  // Email queue methods
  async sendEmail(jobData, options = {}) {
    return await queueManager.addJob(
      this.queues.email,
      jobData.name,
      jobData.data,
      options
    );
  }

  // Notification queue methods
  async sendNotification(jobData, options = {}) {
    return await queueManager.addJob(
      this.queues.notifications,
      jobData.name,
      jobData.data,
      options
    );
  }

  // Cleanup queue methods
  async scheduleCleanup(type, data, delay = 0) {
    return await queueManager.addJob(
      this.queues.cleanup,
      type,
      data,
      { delay }
    );
  }

  // Analytics queue methods
  async trackEvent(eventData, options = {}) {
    return await queueManager.addJob(
      this.queues.analytics,
      'track_event',
      eventData,
      options
    );
  }

  // Cleanup job processor
  async cleanupJobProcessor(job) {
    const { type, data } = job.data;
    
    try {
      logger.info(`Processing cleanup job: ${type}`, { jobId: job.id });

      switch (type) {
        case 'expired_sessions':
          await this.cleanupExpiredSessions(data);
          break;
        case 'old_notifications':
          await this.cleanupOldNotifications(data);
          break;
        case 'cache_cleanup':
          await this.cleanupCache(data);
          break;
        case 'temp_files':
          await this.cleanupTempFiles(data);
          break;
        default:
          logger.warn(`Unknown cleanup job type: ${type}`);
      }

      logger.info(`Cleanup job completed: ${type}`, { jobId: job.id });
      return { success: true, cleanedAt: new Date().toISOString() };
    } catch (error) {
      logger.error(`Cleanup job failed: ${type}`, { 
        jobId: job.id, 
        error: error.message 
      });
      throw error;
    }
  }

  // Analytics job processor
  async analyticsJobProcessor(job) {
    const { eventType, data } = job.data;
    
    try {
      logger.info(`Processing analytics job: ${eventType}`, { jobId: job.id });

      // Track analytics events asynchronously
      // This would integrate with analytics services like:
      // - Google Analytics
      // - Mixpanel
      // - Amplitude
      // - Custom analytics database

      await this.trackAnalyticsEvent(eventType, data);

      logger.info(`Analytics job completed: ${eventType}`, { jobId: job.id });
      return { success: true, trackedAt: new Date().toISOString() };
    } catch (error) {
      logger.error(`Analytics job failed: ${eventType}`, { 
        jobId: job.id, 
        error: error.message 
      });
      throw error;
    }
  }

  // Cleanup helpers
  async cleanupExpiredSessions(data) {
    // Clean up expired user sessions
    logger.info('Cleaning up expired sessions');
    // Implementation would depend on your session storage
  }

  async cleanupOldNotifications(data) {
    // Clean up old notifications (older than 30 days)
    logger.info('Cleaning up old notifications');
    // Implementation would query and delete old notifications
  }

  async cleanupCache(data) {
    // Clean up cache entries
    logger.info('Cleaning up cache');
    const { cacheService } = await import('../cache/cache.service.js');
    await cacheService.clear();
  }

  async cleanupTempFiles(data) {
    // Clean up temporary files
    logger.info('Cleaning up temporary files');
    // Implementation would delete files older than threshold
  }

  // Analytics helpers
  async trackAnalyticsEvent(eventType, data) {
    // Track analytics events
    logger.info(`Tracking analytics event: ${eventType}`, data);
    // Implementation would send to analytics service
  }

  // Queue management methods
  async getQueueStats() {
    return await queueManager.getStats();
  }

  async pauseQueue(queueName) {
    return await queueManager.pauseQueue(queueName);
  }

  async resumeQueue(queueName) {
    return await queueManager.resumeQueue(queueName);
  }

  async clearQueue(queueName) {
    return await queueManager.clearQueue(queueName);
  }

  async shutdown() {
    await queueManager.closeAll();
    this.isInitialized = false;
    logger.info('Queue service shutdown complete');
  }
}

// Singleton instance
const queueService = new QueueService();

export default queueService;
export { queueManager };
