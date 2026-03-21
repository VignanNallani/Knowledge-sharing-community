import { logger } from './index.js';
import getPrisma from './prisma.js';

class DatabaseService {
  constructor() {
    this.isConnecting = false;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected || this.isConnecting) {
      return getPrisma();
    }

    this.isConnecting = true;
    
    try {
      const prisma = getPrisma();
      // Test connection
      await prisma.$connect();
      this.isConnected = true;
      
      logger.info('Database connected successfully');
      return prisma;
      
    } catch (error) {
      this.isConnecting = false;
      logger.error('Database connection failed', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.isConnected) {
      try {
        const prisma = getPrisma();
        await prisma.$disconnect();
        this.isConnected = false;
        this.isConnecting = false;
        logger.info('Database disconnected');
      } catch (error) {
        logger.error('Database disconnection error', error);
        throw error;
      }
    }
  }

  // Transaction helper with timeout and retry logic
  async transaction(callback, options = {}) {
    const {
      timeout = 5000,
      isolationLevel = 'Serializable',
      maxRetries = 3
    } = options;

    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await getPrisma().$transaction(callback, {
          timeout,
          isolationLevel
        });
      } catch (error) {
        lastError = error;
        
        // Retry on deadlock or connection issues
        if (this.shouldRetryTransaction(error) && attempt < maxRetries) {
          logger.warn(`Transaction attempt ${attempt} failed, retrying...`, {
            error: error.message,
            code: error.code
          });
          
          // Exponential backoff
          await this.delay(Math.pow(2, attempt) * 100);
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError;
  }

  shouldRetryTransaction(error) {
    // Retry on deadlock, connection timeout, serialization failures, or transient errors
    const retryableCodes = [
      'P2024', // Connection timeout
      'P2028', // Transaction error
      'P2034'  // Serialization failure/deadlock
    ];
    
    return retryableCodes.includes(error.code) || 
           error.message.includes('deadlock') ||
           error.message.includes('timeout') ||
           error.message.includes('serialization');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check
  async healthCheck() {
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get connection stats (PostgreSQL specific)
  async getConnectionStats() {
    try {
      const stats = await getPrisma().$queryRaw`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `;
      
      return stats[0];
    } catch (error) {
      logger.error('Failed to get connection stats', error);
      return null;
    }
  }

  get client() {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return getPrisma();
  }
}

// Singleton instance
const databaseService = new DatabaseService();

// Legacy export for backward compatibility
export async function connectDatabase() {
  try {
    await databaseService.connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Database connection failed', { error: error.message, stack: error.stack });
    // Don't exit - let the server continue and readiness handle the failure
    throw error;
  }
}

export default databaseService;
