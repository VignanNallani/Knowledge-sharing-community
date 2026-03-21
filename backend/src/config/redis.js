import { createClient } from 'redis';
import { logger } from './index.js';

class RedisManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionPromise = null;
  }

  async getClient() {
    // Check if Redis URL is configured
    if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
      logger.warn('Redis not configured (no REDIS_URL or REDIS_HOST)');
      return null;
    }

    if (this.client && this.isConnected) {
      return this.client;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.connect();
    return this.connectionPromise;
  }

  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
      
      this.client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true,
        },
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis server connection refused');
            return new Error('Redis server connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            logger.error('Redis retry time exhausted');
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            logger.error('Redis max retry attempts reached');
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        },
      });

      this.client.on('connect', () => {
        logger.info('Redis client connecting');
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        logger.error('Redis client error:', error);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.warn('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      logger.info('Redis connected successfully');
      
      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.connectionPromise = null;
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.disconnect();
        logger.info('Redis disconnected');
      } catch (error) {
        logger.error('Error disconnecting Redis:', error);
      } finally {
        this.client = null;
        this.isConnected = false;
        this.connectionPromise = null;
      }
    }
  }

  async set(key, value, ttl = null) {
    const client = await this.getClient();
    if (!client) return false;

    try {
      const serializedValue = JSON.stringify(value);
      const finalKey = `${this.config?.keyPrefix || ''}${key}`;
      
      if (ttl) {
        await client.setEx(finalKey, ttl, serializedValue);
      } else {
        await client.set(finalKey, serializedValue);
      }
      
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      return false;
    }
  }

  async get(key) {
    const client = await this.getClient();
    if (!client) return null;

    try {
      const finalKey = `${this.config?.keyPrefix || ''}${key}`;
      const value = await client.get(finalKey);
      
      if (value === null) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async del(key) {
    const client = await this.getClient();
    if (!client) return false;

    try {
      const finalKey = `${this.config?.keyPrefix || ''}${key}`;
      await client.del(finalKey);
      return true;
    } catch (error) {
      logger.error('Redis del error:', error);
      return false;
    }
  }

  async exists(key) {
    const client = await this.getClient();
    if (!client) return false;

    try {
      const finalKey = `${this.config?.keyPrefix || ''}${key}`;
      const result = await client.exists(finalKey);
      return result === 1;
    } catch (error) {
      logger.error('Redis exists error:', error);
      return false;
    }
  }

  async expire(key, seconds) {
    const client = await this.getClient();
    if (!client) return false;

    try {
      const finalKey = `${this.config?.keyPrefix || ''}${key}`;
      await client.expire(finalKey, seconds);
      return true;
    } catch (error) {
      logger.error('Redis expire error:', error);
      return false;
    }
  }

  async ttl(key) {
    const client = await this.getClient();
    if (!client) return -1;

    try {
      const finalKey = `${this.config?.keyPrefix || ''}${key}`;
      return await client.ttl(finalKey);
    } catch (error) {
      logger.error('Redis ttl error:', error);
      return -1;
    }
  }

  async increment(key, amount = 1) {
    const client = await this.getClient();
    if (!client) return null;

    try {
      const finalKey = `${this.config?.keyPrefix || ''}${key}`;
      return await client.incrBy(finalKey, amount);
    } catch (error) {
      logger.error('Redis increment error:', error);
      return null;
    }
  }

  async decrement(key, amount = 1) {
    const client = await this.getClient();
    if (!client) return null;

    try {
      const finalKey = `${this.config?.keyPrefix || ''}${key}`;
      return await client.decrBy(finalKey, amount);
    } catch (error) {
      logger.error('Redis decrement error:', error);
      return null;
    }
  }

  async flushAll() {
    const client = await this.getClient();
    if (!client) return false;

    try {
      await client.flushAll();
      logger.info('Redis flushed all keys');
      return true;
    } catch (error) {
      logger.error('Redis flushAll error:', error);
      return false;
    }
  }

  async ping() {
    const client = await this.getClient();
    if (!client) return false;

    try {
      const response = await client.ping();
      return response === 'PONG';
    } catch (error) {
      logger.error('Redis ping error:', error);
      return false;
    }
  }

  isReady() {
    return this.isConnected && this.client;
  }

  async getInfo() {
    const client = await this.getClient();
    if (!client) return null;

    try {
      const info = await client.info();
      return {
        connected: this.isConnected,
        url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
        keyPrefix: this.config?.keyPrefix || '',
        ttl: this.config?.ttl || 300,
        info: info,
      };
    } catch (error) {
      logger.error('Redis info error:', error);
      return null;
    }
  }
}

// Singleton instance
const redisManager = new RedisManager();

export default redisManager;
