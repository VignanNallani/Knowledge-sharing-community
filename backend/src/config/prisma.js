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
    
    // Configure connection pool for production
    if (process.env.NODE_ENV === 'production') {
      logger.info(`Production database pool configured: ${poolSize} connections per process`);
    }
    
    // Set up query event listener for slow query detection and logging
    prisma.$on('query', (e) => {
      const duration = e.duration / 1000; // Convert to seconds for Prometheus
      const query = e.query;
      const params = e.params;
      const target = e.target;
      
      // Extract operation and table from query
      const operation = query.trim().split(/\s+/)[0]?.toUpperCase() || 'UNKNOWN';
      const tableMatch = query.match(/(?:FROM|JOIN|INTO|UPDATE)\s+([^\s]+)/i);
      const table = tableMatch ? tableMatch[1].replace(/["`]/g, '') : 'UNKNOWN';
      
      // Note: Prometheus metrics are now handled by metricsCollector.databaseMetrics()
      
      // Log all queries at debug level
      structuredLogger.debug('Database query executed', {
        query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
        duration: e.duration,
        target,
        params: params ? 'present' : 'none',
        operation,
        table
      });
      
      // Alert on slow queries (200ms threshold)
      if (e.duration > 200) {
        structuredLogger.warn('Slow database query detected', {
          query: query.substring(0, 500) + (query.length > 500 ? '...' : ''),
          duration: e.duration,
          target,
          params: params ? 'present' : 'none',
          threshold: 200,
          severity: e.duration > 1000 ? 'critical' : 'warning',
          operation,
          table
        });
      }
      
      // Critical queries (1 second+)
      if (e.duration > 1000) {
        logger.error('Critical database query performance', {
          query: query.substring(0, 1000),
          duration: e.duration,
          target,
          params: params ? 'present' : 'none',
          severity: 'critical',
          operation,
          table
        });
      }
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
