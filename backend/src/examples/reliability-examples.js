import { reliabilityOrchestrator, RELIABILITY_LEVELS } from '../utils/reliability-orchestrator.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ReliabilityExample');

/**
 * Example demonstrating the complete reliability patterns implementation
 * 
 * This example shows how to use all reliability systems together
 * through the unified orchestrator interface.
 */

// Example 1: Basic usage with default reliability
async function basicUsageExample() {
  logger.info('=== Basic Usage Example ===');
  
  try {
    const result = await reliabilityOrchestrator.execute(
      async () => {
        // Simulate an external API call
        logger.info('Making external API call...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate occasional failure
        if (Math.random() < 0.3) {
          throw new Error('External API temporarily unavailable');
        }
        
        return { data: 'API response', timestamp: Date.now() };
      },
      {
        serviceName: 'external-api-service',
        reliabilityLevel: RELIABILITY_LEVELS.STANDARD
      }
    );
    
    logger.info('Operation succeeded', { result });
    
  } catch (error) {
    logger.error('Operation failed', { error: error.message });
  }
}

// Example 2: High reliability for critical operations
async function criticalOperationExample() {
  logger.info('=== Critical Operation Example ===');
  
  try {
    const result = await reliabilityOrchestrator.execute(
      async () => {
        // Simulate database operation
        logger.info('Performing critical database operation...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Simulate database connection issues
        if (Math.random() < 0.1) {
          throw new Error('Database connection timeout');
        }
        
        return { recordId: '12345', status: 'created' };
      },
      {
        serviceName: 'database-service',
        reliabilityLevel: RELIABILITY_LEVELS.CRITICAL,
        context: {
          operation: 'user_creation',
          userId: 'user123'
        }
      }
    );
    
    logger.info('Critical operation succeeded', { result });
    
  } catch (error) {
    logger.error('Critical operation failed', { error: error.message });
  }
}

// Example 3: Custom reliability profile
async function customProfileExample() {
  logger.info('=== Custom Profile Example ===');
  
  try {
    const result = await reliabilityOrchestrator.execute(
      async () => {
        // Simulate file processing operation
        logger.info('Processing large file...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate processing errors
        if (Math.random() < 0.2) {
          throw new Error('File format not supported');
        }
        
        return { fileId: 'file789', processed: true };
      },
      {
        serviceName: 'file-processor',
        reliabilityLevel: RELIABILITY_LEVELS.HIGH,
        customConfig: {
          // Override specific settings
          timeoutConfig: {
            total_request: 10000, // 10 seconds
            business_logic: 8000  // 8 seconds
          },
          retryPolicy: {
            maxAttempts: 5,
            baseDelay: 2000
          }
        },
        context: {
          operation: 'file_processing',
          fileSize: '50MB'
        }
      }
    );
    
    logger.info('Custom profile operation succeeded', { result });
    
  } catch (error) {
    logger.error('Custom profile operation failed', { error: error.message });
  }
}

// Example 4: Fallback with cached results
async function fallbackWithCacheExample() {
  logger.info('=== Fallback with Cache Example ===');
  
  // Import fallback manager to register fallback handlers
  const { getFallbackManager } = await import('../utils/fallback-manager.js');
  
  // Register a fallback handler
  const fallbackManager = getFallbackManager('cache-service');
  fallbackManager.registerFallback('user_profile', async (context) => {
    logger.info('Using fallback for user profile', { context });
    return {
      userId: context.userId,
      name: 'Cached User',
      email: 'cached@example.com',
      lastUpdated: new Date().toISOString(),
      isFallback: true
    };
  });
  
  try {
    const result = await reliabilityOrchestrator.execute(
      async () => {
        // Simulate user profile fetch
        logger.info('Fetching user profile from database...');
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Simulate database failure
        if (Math.random() < 0.4) {
          throw new Error('Database connection failed');
        }
        
        return {
          userId: 'user123',
          name: 'John Doe',
          email: 'john@example.com',
          lastUpdated: new Date().toISOString()
        };
      },
      {
        serviceName: 'user-service',
        reliabilityLevel: RELIABILITY_LEVELS.HIGH,
        context: {
          operation: 'get_user_profile',
          userId: 'user123'
        }
      }
    );
    
    logger.info('User profile operation succeeded', { result });
    
  } catch (error) {
    logger.error('User profile operation failed', { error: error.message });
  }
}

// Example 5: Load shedding under high load
async function loadSheddingExample() {
  logger.info('=== Load Shedding Example ===');
  
  // Simulate multiple concurrent requests
  const requests = Array.from({ length: 20 }, (_, i) => 
    reliabilityOrchestrator.execute(
      async () => {
        logger.info(`Processing request ${i + 1}...`);
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        
        // Random failures to trigger load shedding
        if (Math.random() < 0.3) {
          throw new Error(`Request ${i + 1} failed`);
        }
        
        return { requestId: i + 1, processed: true };
      },
      {
        serviceName: 'high-load-service',
        reliabilityLevel: RELIABILITY_LEVELS.STANDARD,
        context: {
          operation: 'process_request',
          requestId: i + 1,
          priority: i < 5 ? 'high' : 'normal'
        }
      }
    )
  );
  
  try {
    const results = await Promise.allSettled(requests);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    logger.info('Load shedding test completed', {
      total: requests.length,
      successful,
      failed,
      successRate: (successful / requests.length * 100).toFixed(1) + '%'
    });
    
  } catch (error) {
    logger.error('Load shedding test failed', { error: error.message });
  }
}

// Example 6: Monitoring and health checks
async function monitoringExample() {
  logger.info('=== Monitoring Example ===');
  
  // Get system health
  const systemHealth = reliabilityOrchestrator.getSystemHealth();
  logger.info('System Health', systemHealth);
  
  // Get comprehensive metrics
  const metrics = reliabilityOrchestrator.getMetrics();
  logger.info('Reliability Metrics', {
    totalOperations: metrics.systemMetrics.totalOperations,
    successRate: (metrics.systemMetrics.successfulOperations / metrics.systemMetrics.totalOperations * 100).toFixed(1) + '%',
    systemHealth: metrics.systemMetrics.systemHealth
  });
  
  // Get reliability recommendations
  const recommendations = reliabilityOrchestrator.getReliabilityRecommendations('external-api-service');
  if (recommendations) {
    logger.info('Reliability Recommendations', recommendations);
  }
}

// Example 7: Event-driven monitoring
async function eventDrivenMonitoringExample() {
  logger.info('=== Event-Driven Monitoring Example ===');
  
  // Set up event listeners
  reliabilityOrchestrator.on('systemHealthChanged', (event) => {
    logger.warning('System health changed', event);
  });
  
  reliabilityOrchestrator.on('monitoring', (event) => {
    logger.debug('Monitoring event', {
      health: event.systemHealth,
      errorRate: event.errorRate?.toFixed(3)
    });
  });
  
  // Run some operations to generate events
  for (let i = 0; i < 5; i++) {
    await reliabilityOrchestrator.execute(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        if (Math.random() < 0.5) {
          throw new Error(`Simulated error ${i + 1}`);
        }
        return { operation: i + 1, success: true };
      },
      {
        serviceName: 'monitoring-test',
        reliabilityLevel: RELIABILITY_LEVELS.STANDARD
      }
    );
  }
  
  // Wait a bit for monitoring events
  await new Promise(resolve => setTimeout(resolve, 2000));
}

// Main execution function
async function runAllExamples() {
  logger.info('Starting Reliability Patterns Examples');
  
  try {
    await basicUsageExample();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await criticalOperationExample();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await customProfileExample();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await fallbackWithCacheExample();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await loadSheddingExample();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await monitoringExample();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await eventDrivenMonitoringExample();
    
    logger.info('All reliability examples completed successfully');
    
  } catch (error) {
    logger.error('Error running examples', { error: error.message });
  } finally {
    // Clean up
    reliabilityOrchestrator.stop();
  }
}

// Export examples for individual testing
export {
  basicUsageExample,
  criticalOperationExample,
  customProfileExample,
  fallbackWithCacheExample,
  loadSheddingExample,
  monitoringExample,
  eventDrivenMonitoringExample,
  runAllExamples
};

// Run all examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}
