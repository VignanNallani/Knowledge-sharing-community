const cron = require('node-cron');
const emailService = require('../services/email.service');
const logger = require('../utils/logger.util');

class EmailQueueProcessor {
  constructor() {
    this.isProcessing = false;
    this.processingJob = null;
  }

  start() {
    if (this.processingJob) {
      logger.warn('Email queue processor already running');
      return;
    }

    // Process email queue every 2 minutes
    this.processingJob = cron.schedule('*/2 * * * *', async () => {
      if (this.isProcessing) {
        logger.warn('Email queue processor already running, skipping this iteration');
        return;
      }

      this.isProcessing = true;
      
      try {
        logger.info('Processing email queue...');
        const results = await emailService.processEmailQueue();
        
        const successCount = results.filter(r => r.status === 'success').length;
        const failureCount = results.length - successCount;
        
        logger.info(`Email queue processing complete: ${results.length} processed (${successCount} successful, ${failureCount} failed)`);
        
        if (failureCount > 0) {
          const errors = results.filter(r => r.status === 'error');
          errors.forEach(error => {
            logger.error(`Email ${error.id} failed: ${error.error}`);
          });
        }
      } catch (error) {
        logger.error('Error in email queue processor:', error);
      } finally {
        this.isProcessing = false;
      }
    }, {
      scheduled: false
    });

    this.processingJob.start();
    logger.info('Email queue processor started (runs every 2 minutes)');
  }

  stop() {
    if (this.processingJob) {
      this.processingJob.stop();
      this.processingJob = null;
      logger.info('Email queue processor stopped');
    }
  }

  // Retry failed emails every 30 minutes
  startRetryProcessor() {
    // Retry failed emails every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
      try {
        logger.info('Retrying failed emails...');
        const results = await emailService.retryFailedEmails();
        
        const successCount = results.filter(r => r.status === 'success').length;
        const failureCount = results.length - successCount;
        
        if (results.length > 0) {
          logger.info(`Failed email retry complete: ${results.length} retried (${successCount} successful, ${failureCount} still failed)`);
        }
      } catch (error) {
        logger.error('Error in email retry processor:', error);
      }
    }, {
      scheduled: false
    });

    logger.info('Email retry processor started (runs every 30 minutes)');
  }

  // Cleanup old emails every day at 2 AM
  startCleanupProcessor() {
    // Run daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Cleaning up old emails...');
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        // Delete sent emails older than 30 days
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        
        const result = await prisma.emailQueue.deleteMany({
          where: {
            status: 'sent',
            sentAt: { lt: cutoffDate }
          }
        });

        logger.info(`Cleaned up ${result.count} old sent emails`);
        
        // Delete failed emails older than 7 days
        const failedCutoffDate = new Date();
        failedCutoffDate.setDate(failedCutoffDate.getDate() - 7);
        
        const failedResult = await prisma.emailQueue.deleteMany({
          where: {
            status: 'failed',
            updatedAt: { lt: failedCutoffDate }
          }
        });

        logger.info(`Cleaned up ${failedResult.count} old failed emails`);
        
        await prisma.$disconnect();
      } catch (error) {
        logger.error('Error in email cleanup processor:', error);
      }
    }, {
      scheduled: false
    });

    logger.info('Email cleanup processor started (runs daily at 2 AM)');
  }

  getStatus() {
    return {
      isProcessing: this.isProcessing,
      isScheduled: !!this.processingJob,
      nextRun: this.processingJob ? this.processingJob.nextDate().toISOString() : null
    };
  }

  // Manual processing trigger
  async processNow() {
    if (this.isProcessing) {
      throw new Error('Email queue processor is already running');
    }

    this.isProcessing = true;
    
    try {
      logger.info('Manual email queue processing triggered...');
      const results = await emailService.processEmailQueue();
      
      const successCount = results.filter(r => r.status === 'success').length;
      const failureCount = results.length - successCount;
      
      logger.info(`Manual email queue processing complete: ${results.length} processed (${successCount} successful, ${failureCount} failed)`);
      
      return results;
    } catch (error) {
      logger.error('Error in manual email queue processing:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  // Manual retry trigger
  async retryFailedNow() {
    try {
      logger.info('Manual failed email retry triggered...');
      const results = await emailService.retryFailedEmails();
      
      const successCount = results.filter(r => r.status === 'success').length;
      const failureCount = results.length - successCount;
      
      logger.info(`Manual failed email retry complete: ${results.length} retried (${successCount} successful, ${failureCount} still failed)`);
      
      return results;
    } catch (error) {
      logger.error('Error in manual failed email retry:', error);
      throw error;
    }
  }
}

module.exports = new EmailQueueProcessor();
