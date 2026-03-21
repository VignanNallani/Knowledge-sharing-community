import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';
import { structuredLogger } from '../config/structured-logger.js';
import os from 'os';

let prisma = null;
let metricsInterval = null;

function getPrisma() {
  if (!prisma) {
    // Calculate optimal pool size based on CPU cores
    const cpuCount = os.cpus().length;
    const poolSize = Math.max(5, Math.min(10, Math.floor(cpuCount * 2)));
    
    prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' }
      ],
      datasources: {
        db: {
          url: process.env.DATABASE_URL.includes('?') 
            ? process.env.DATABASE_URL + `&connection_limit=${poolSize}&pool_timeout=10&connect_timeout=5&statement_timeout=5000`
            : process.env.DATABASE_URL + `?connection_limit=${poolSize}&pool_timeout=10&connect_timeout=5&statement_timeout=5000`
        }
      }
    });
    
    // Simple query logging for performance analysis
    prisma.$on('query', (e) => {
      console.log(`⏱️  Query Duration: ${e.duration}ms`);
      console.log(`🔍 Query: ${e.query.substring(0, 100)}...`);
    });
    
    // Log error events
    prisma.$on('error', (e) => {
      structuredLogger.error('Prisma error event', {
        message: e.message,
        target: e.target
      });
      
      // Note: Error metrics are now handled by metricsCollector.databaseMetrics()
    });
    
    // Update connection pool metrics periodically
    const updatePoolMetrics = async () => {
      try {
        // Get connection pool info (this varies by database driver)
        const result = await prisma.$queryRaw`
          SELECT 
            count(*) as total_connections,
            count(*) FILTER (WHERE state = 'active') as active_connections,
            count(*) FILTER (WHERE state = 'idle') as idle_connections
          FROM pg_stat_activity 
          WHERE datname = current_database()
        `;
        
        if (result && result[0]) {
          const stats = result[0];
          // Note: Pool metrics are now handled by metricsCollector.updatePoolMetrics()
        }
      } catch (error) {
        // Silently fail - pool metrics are optional
        structuredLogger.debug('Failed to collect connection pool metrics', { error: error.message });
      }
    };
    
    // Note: Pool metrics interval is now handled by metricsCollector
    
    logger.info('Prisma client initialized with query logging and metrics');
  }
  return prisma;
}

// Cleanup function for tests
export function cleanupPrismaMetrics() {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
  }
}

export default getPrisma;
