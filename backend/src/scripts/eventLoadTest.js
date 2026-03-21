import eventBus from '../core/events/eventBus.js';
import EVENT_TYPES from '../core/events/eventTypes.js';
import { logger } from '../config/index.js';

class EventLoadTest {
  constructor() {
    this.testResults = {
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
      startTime: null,
      endTime: null,
      executionTime: 0,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryLeak: 0,
      listenerCount: 0
    };
  }

  /**
   * Run load test with specified number of events
   */
  async runLoadTest(eventCount = 1000) {
    logger.info(`Starting event load test with ${eventCount} events`);
    
    // Record initial state
    this.testResults.startTime = Date.now();
    this.testResults.memoryBefore = process.memoryUsage();
    this.testResults.listenerCount = eventBus.getListenerCount(EVENT_TYPES.POST_LIKED);
    
    // Reset event stats before test
    eventBus.resetStats();
    
    // Emit events in batches to avoid overwhelming the system
    const batchSize = 100;
    const batches = Math.ceil(eventCount / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, eventCount);
      
      // Emit events in current batch
      for (let i = batchStart; i < batchEnd; i++) {
        try {
          const postId = Math.floor(Math.random() * 1000) + 1;
          const userId = Math.floor(Math.random() * 100) + 1;
          
          const emitted = eventBus.emit(EVENT_TYPES.POST_LIKED, {
            postId,
            userId,
            testId: i
          });
          
          if (emitted) {
            this.testResults.successfulEvents++;
          } else {
            this.testResults.failedEvents++;
          }
          
          this.testResults.totalEvents++;
        } catch (error) {
          this.testResults.failedEvents++;
          this.testResults.totalEvents++;
          logger.error(`Event ${i} failed`, { error: error.message });
        }
      }
      
      // Small delay between batches to prevent overwhelming
      if (batch < batches - 1) {
        await this.sleep(10); // 10ms delay between batches
      }
    }
    
    // Wait for all async events to be processed
    await this.sleep(1000);
    
    // Record final state
    this.testResults.endTime = Date.now();
    this.testResults.executionTime = this.testResults.endTime - this.testResults.startTime;
    this.testResults.memoryAfter = process.memoryUsage();
    this.testResults.memoryLeak = 
      this.testResults.memoryAfter.heapUsed - this.testResults.memoryBefore.heapUsed;
    
    // Get final statistics
    const finalStats = eventBus.getStats();
    
    this.logResults();
    this.validateResults(finalStats);
    
    return this.testResults;
  }

  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log test results
   */
  logResults() {
    logger.info('Event Load Test Results', {
      totalEvents: this.testResults.totalEvents,
      successfulEvents: this.testResults.successfulEvents,
      failedEvents: this.testResults.failedEvents,
      successRate: ((this.testResults.successfulEvents / this.testResults.totalEvents) * 100).toFixed(2) + '%',
      executionTime: this.testResults.executionTime + 'ms',
      eventsPerSecond: Math.round(this.testResults.totalEvents / (this.testResults.executionTime / 1000)),
      memoryBefore: Math.round(this.testResults.memoryBefore.heapUsed / 1024 / 1024) + 'MB',
      memoryAfter: Math.round(this.testResults.memoryAfter.heapUsed / 1024 / 1024) + 'MB',
      memoryLeak: Math.round(this.testResults.memoryLeak / 1024 / 1024) + 'MB',
      listenerCount: this.testResults.listenerCount
    });
  }

  /**
   * Validate test results and check for issues
   */
  validateResults(finalStats) {
    const issues = [];
    
    // Check for memory leaks
    if (this.testResults.memoryLeak > 50 * 1024 * 1024) { // 50MB threshold
      issues.push('Potential memory leak detected');
    }
    
    // Check for high failure rate
    const failureRate = (this.testResults.failedEvents / this.testResults.totalEvents) * 100;
    if (failureRate > 5) { // 5% threshold
      issues.push(`High failure rate: ${failureRate.toFixed(2)}%`);
    }
    
    // Check for listener explosion
    if (finalStats.totalListeners > this.testResults.listenerCount * 2) {
      issues.push('Potential listener explosion detected');
    }
    
    // Check for performance issues
    if (this.testResults.executionTime > 10000) { // 10 seconds threshold
      issues.push('Performance issue: execution time too high');
    }
    
    if (issues.length > 0) {
      logger.error('Event Load Test Issues Detected', { issues });
    } else {
      logger.info('Event Load Test Passed - No issues detected');
    }
    
    return issues;
  }

  /**
   * Run memory leak test over multiple iterations
   */
  async runMemoryLeakTest(iterations = 5, eventsPerIteration = 500) {
    logger.info(`Starting memory leak test with ${iterations} iterations`);
    
    const memorySnapshots = [];
    
    for (let i = 0; i < iterations; i++) {
      logger.info(`Memory leak test iteration ${i + 1}/${iterations}`);
      
      // Record memory before iteration
      const beforeMemory = process.memoryUsage();
      
      // Run load test
      await this.runLoadTest(eventsPerIteration);
      
      // Record memory after iteration
      const afterMemory = process.memoryUsage();
      
      memorySnapshots.push({
        iteration: i + 1,
        before: beforeMemory.heapUsed,
        after: afterMemory.heapUsed,
        delta: afterMemory.heapUsed - beforeMemory.heapUsed
      });
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Wait between iterations
      await this.sleep(2000);
    }
    
    // Analyze memory trends
    this.analyzeMemoryTrends(memorySnapshots);
    
    return memorySnapshots;
  }

  /**
   * Analyze memory usage trends
   */
  analyzeMemoryTrends(snapshots) {
    const deltas = snapshots.map(s => s.delta);
    const avgDelta = deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length;
    const maxDelta = Math.max(...deltas);
    const minDelta = Math.min(...deltas);
    
    logger.info('Memory Leak Analysis', {
      iterations: snapshots.length,
      averageDelta: Math.round(avgDelta / 1024 / 1024) + 'MB',
      maxDelta: Math.round(maxDelta / 1024 / 1024) + 'MB',
      minDelta: Math.round(minDelta / 1024 / 1024) + 'MB',
      trend: avgDelta > 10 * 1024 * 1024 ? 'Increasing' : 'Stable' // 10MB threshold
    });
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const loadTest = new EventLoadTest();
  
  async function runTests() {
    try {
      // Run basic load test
      await loadTest.runLoadTest(1000);
      
      // Run memory leak test
      await loadTest.runMemoryLeakTest(3, 500);
      
      logger.info('All event load tests completed');
      process.exit(0);
    } catch (error) {
      logger.error('Event load test failed', {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    }
  }
  
  runTests();
}

export default EventLoadTest;
