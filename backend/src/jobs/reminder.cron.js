const cron = require('node-cron');
const reminderService = require('../services/reminder.service');
const logger = require('../utils/logger.util');

class ReminderCronJob {
  constructor() {
    this.isRunning = false;
    this.job = null;
  }

  start() {
    if (this.job) {
      logger.warn('Reminder cron job already running');
      return;
    }

    // Run every 5 minutes to check for pending reminders
    this.job = cron.schedule('*/5 * * * *', async () => {
      if (this.isRunning) {
        logger.warn('Reminder job already running, skipping this iteration');
        return;
      }

      this.isRunning = true;
      
      try {
        logger.info('Processing pending reminders...');
        const results = await reminderService.processPendingReminders();
        
        const successful = results.filter(r => r.status === 'success').length;
        const failed = results.filter(r => r.status === 'error').length;
        
        logger.info(`Reminder processing complete: ${successful} successful, ${failed} failed`);
        
        if (failed > 0) {
          const errors = results.filter(r => r.status === 'error');
          errors.forEach(error => {
            logger.error(`Reminder ${error.reminderId} failed: ${error.error}`);
          });
        }
      } catch (error) {
        logger.error('Error in reminder cron job:', error);
      } finally {
        this.isRunning = false;
      }
    }, {
      scheduled: false
    });

    this.job.start();
    logger.info('Reminder cron job started (runs every 5 minutes)');
  }

  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      logger.info('Reminder cron job stopped');
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      isScheduled: !!this.job,
      nextRun: this.job ? this.job.nextDate().toISOString() : null
    };
  }
}

module.exports = new ReminderCronJob();
