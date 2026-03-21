import { Queue, Worker } from 'bullmq';
import redisManager from '../config/redis.js';
import { logger } from '../config/index.js';

class QueueManager {
  constructor() {
    this.queues = new Map();
    this.workers = new Map();
    this.connection = null;
  }

  async getConnection() {
    if (!this.connection) {
      const redis = await redisManager.getClient();
      if (!redis) {
        throw new Error('Redis not available for queue connection');
      }
      
      this.connection = {
        host: redis.options.host || 'localhost',
        port: redis.options.port || 6379,
        db: redis.options.db || 0,
      };
    }
    return this.connection;
  }

  createQueue(name, options = {}) {
    if (this.queues.has(name)) {
      return this.queues.get(name);
    }

    const queue = new Queue(name, {
      connection: this.connection,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        ...options,
      },
    });

    this.queues.set(name, queue);
    logger.info(`Queue created: ${name}`);
    return queue;
  }

  createWorker(name, processor, options = {}) {
    if (this.workers.has(name)) {
      return this.workers.get(name);
    }

    const worker = new Worker(name, processor, {
      connection: this.connection,
      concurrency: options.concurrency || 5,
      ...options,
    });

    worker.on('completed', (job) => {
      logger.info(`Job completed: ${job.name} (${job.id})`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`Job failed: ${job.name} (${job.id})`, err);
    });

    worker.on('error', (err) => {
      logger.error(`Worker error for ${name}:`, err);
    });

    this.workers.set(name, worker);
    logger.info(`Worker created: ${name}`);
    return worker;
  }

  getQueue(name) {
    return this.queues.get(name);
  }

  getWorker(name) {
    return this.workers.get(name);
  }

  async addJob(queueName, jobName, data, options = {}) {
    const queue = this.getQueue(queueName) || this.createQueue(queueName);
    
    try {
      const job = await queue.add(jobName, data, {
        delay: options.delay || 0,
        priority: options.priority || 0,
        ...options,
      });
      
      logger.info(`Job added: ${jobName} to ${queueName} (${job.id})`);
      return job;
    } catch (error) {
      logger.error(`Failed to add job ${jobName} to ${queueName}:`, error);
      throw error;
    }
  }

  async getJobCounts(queueName) {
    const queue = this.getQueue(queueName);
    if (!queue) return null;

    try {
      return await queue.getJobCounts();
    } catch (error) {
      logger.error(`Failed to get job counts for ${queueName}:`, error);
      return null;
    }
  }

  async pauseQueue(queueName) {
    const queue = this.getQueue(queueName);
    if (!queue) return false;

    try {
      await queue.pause();
      logger.info(`Queue paused: ${queueName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to pause queue ${queueName}:`, error);
      return false;
    }
  }

  async resumeQueue(queueName) {
    const queue = this.getQueue(queueName);
    if (!queue) return false;

    try {
      await queue.resume();
      logger.info(`Queue resumed: ${queueName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to resume queue ${queueName}:`, error);
      return false;
    }
  }

  async clearQueue(queueName) {
    const queue = this.getQueue(queueName);
    if (!queue) return false;

    try {
      await queue.drain();
      logger.info(`Queue cleared: ${queueName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to clear queue ${queueName}:`, error);
      return false;
    }
  }

  async closeAll() {
    const closingPromises = [];

    // Close all workers
    for (const [name, worker] of this.workers) {
      closingPromises.push(worker.close().catch(err => 
        logger.error(`Error closing worker ${name}:`, err)
      ));
    }

    // Close all queues
    for (const [name, queue] of this.queues) {
      closingPromises.push(queue.close().catch(err => 
        logger.error(`Error closing queue ${name}:`, err)
      ));
    }

    await Promise.all(closingPromises);
    this.queues.clear();
    this.workers.clear();
    logger.info('All queues and workers closed');
  }

  async getStats() {
    const stats = {
      queues: {},
      workers: this.workers.size,
      totalQueues: this.queues.size,
    };

    for (const [name, queue] of this.queues) {
      try {
        const counts = await queue.getJobCounts();
        stats.queues[name] = counts;
      } catch (error) {
        stats.queues[name] = { error: error.message };
      }
    }

    return stats;
  }
}

// Singleton instance
const queueManager = new QueueManager();

export default queueManager;
