/**
 * Subscriber index file for auto-initialization
 * This file ensures all subscribers are initialized when the module is imported
 */

import { logger } from '../../../config/index.js';

// Import all subscribers to trigger auto-initialization
import notificationSubscriber from './notification.subscriber.js';
import activitySubscriber from './activity.subscriber.js';
import feedSubscriber from './feed.subscriber.js';

// Track initialization state
let subscribersInitialized = false;

/**
 * Initialize all subscribers
 */
async function initializeSubscribers() {
  if (subscribersInitialized) {
    logger.debug('Event subscribers already initialized, skipping...');
    return;
  }

  try {
    logger.info('Initializing event subscribers...');

    // Wait for all subscribers to initialize
    await Promise.all([
      notificationSubscriber.initialize(),
      activitySubscriber.initialize(),
      feedSubscriber.initialize()
    ]);

    subscribersInitialized = true;
    logger.info('All event subscribers initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize event subscribers', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Shutdown all subscribers
 */
async function shutdownSubscribers() {
  try {
    logger.info('Shutting down event subscribers...');

    // Wait for all subscribers to shutdown
    await Promise.all([
      notificationSubscriber.shutdown(),
      activitySubscriber.shutdown(),
      feedSubscriber.shutdown()
    ]);

    logger.info('All event subscribers shutdown successfully');
  } catch (error) {
    logger.error('Error shutting down event subscribers', {
      error: error.message,
      stack: error.stack
    });
  }
}

// Don't auto-initialize at import time - initialize after server starts
// initializeSubscribers().catch(error => {
//   logger.error('Event subscribers auto-initialization failed', {
//     error: error.message,
//     stack: error.stack
//   });
// });

// Handle process termination gracefully - DISABLED for Render compatibility
// process.on('SIGTERM', shutdownSubscribers);
// process.on('SIGINT', shutdownSubscribers);

export {
  notificationSubscriber,
  activitySubscriber,
  feedSubscriber,
  initializeSubscribers,
  shutdownSubscribers
};

export default {
  notificationSubscriber,
  activitySubscriber,
  feedSubscriber,
  initializeSubscribers,
  shutdownSubscribers
};
