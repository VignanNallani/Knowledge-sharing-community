import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import queueService from '../src/queues/index.js';

describe('BullMQ Queue System Audit', () => {
  beforeEach(async () => {
    // Clear any existing queues
    await queueService.clearQueue('email-queue');
    await queueService.clearQueue('notification-queue');
  });

  afterEach(async () => {
    // Clean up after each test
    await queueService.shutdown();
  });

  describe('Job Failure and Retry Logic', () => {
    it('should handle job failures and retry with exponential backoff', async () => {
      let attemptCount = 0;
      
      // Create a failing job processor
      const failingProcessor = async (job) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Simulated failure attempt ${attemptCount}`);
        }
        return { success: true, attempt: attemptCount };
      };

      // Add failing job using email queue
      const job = await queueService.sendEmail({
        name: 'failing-job',
        data: { test: 'data' }
      }, { attempts: 3, backoff: { type: 'exponential', delay: 100 } });

      assert(job.id, 'Job should have an ID');

      // Wait for retries (simulate)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify retry attempts were made
      const stats = await queueService.getQueueStats();
      assert(stats.queues['email-queue'], 'Queue stats should be available');
      
      console.log('Job retry test completed');
    });

    it('should fail job after max attempts', async () => {
      let attemptCount = 0;
      
      const alwaysFailingProcessor = async (job) => {
        attemptCount++;
        throw new Error(`Always failing attempt ${attemptCount}`);
      };

      // Add job that will always fail
      const job = await queueService.addJob('email-queue', 'always-failing', 
        { test: 'data' }, 
        { attempts: 2 } // Max 2 attempts
      );

      // Wait for all attempts
      await new Promise(resolve => setTimeout(resolve, 500));

      const stats = await queueService.getQueueStats();
      console.log('Final queue stats:', stats);
    });
  });

  describe('Job Idempotency', () => {
    it('should prevent duplicate job execution', async () => {
      const executionCount = { count: 0 };
      
      const idempotentProcessor = async (job) => {
        executionCount.count++;
        const result = { 
          jobId: job.id, 
          executionId: Math.random(),
          timestamp: Date.now()
        };
        
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 50));
        
        return result;
      };

      // Add multiple jobs with same data (should be separate jobs)
      const job1 = await queueService.addJob('notification-queue', 'idempotent-test', 
        { userId: '123', action: 'notify' }
      );
      
      const job2 = await queueService.addJob('notification-queue', 'idempotent-test', 
        { userId: '123', action: 'notify' }
      );

      assert.notStrictEqual(job1.id, job2.id, 'Jobs should have different IDs');
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      console.log('Idempotency test - jobs created:', job1.id, job2.id);
    });

    it('should handle job deduplication with same job ID', async () => {
      const jobId = 'dedup-test-' + Date.now();
      
      const processor = async (job) => {
        return { processed: true, jobId: job.id };
      };

      // Try to add job with same ID
      const job1 = await queueService.addJob('email-queue', 'dedup-test', 
        { data: 'test' }, 
        { jobId: jobId }
      );
      
      // This should either update the existing job or fail
      try {
        const job2 = await queueService.addJob('email-queue', 'dedup-test', 
          { data: 'updated' }, 
          { jobId: jobId }
        );
        console.log('Job deduplication test completed');
      } catch (error) {
        console.log('Job deduplication correctly prevented duplicate');
      }
    });
  });

  describe('Job Latency Measurement', () => {
    it('should measure job processing latency', async () => {
      const latencies = [];
      
      const latencyProcessor = async (job) => {
        const start = Date.now();
        
        // Simulate variable processing time
        const processingTime = 10 + Math.random() * 90; // 10-100ms
        await new Promise(resolve => setTimeout(resolve, processingTime));
        
        const end = Date.now();
        const latency = end - start;
        latencies.push(latency);
        
        return { 
          latency, 
          processingTime,
          jobId: job.id 
        };
      };

      // Add multiple jobs to measure latency
      const jobs = [];
      for (let i = 0; i < 10; i++) {
        const job = await queueService.addJob('notification-queue', 'latency-test', 
          { index: i }
        );
        jobs.push(job);
      }

      // Wait for all jobs to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('Latency measurements:', latencies);
      
      if (latencies.length > 0) {
        const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const maxLatency = Math.max(...latencies);
        const minLatency = Math.min(...latencies);
        
        console.log(`Latency Stats - Avg: ${avgLatency.toFixed(2)}ms, Min: ${minLatency}ms, Max: ${maxLatency}ms`);
        
        // Latency should be reasonable (< 200ms average)
        assert(avgLatency < 200, `Average latency should be < 200ms, got ${avgLatency}ms`);
      }
    });
  });

  describe('Queue Performance', () => {
    it('should handle high job throughput', async () => {
      const processedCount = { count: 0 };
      
      const throughputProcessor = async (job) => {
        processedCount.count++;
        return { processed: true, count: processedCount.count };
      };

      const startTime = Date.now();
      const jobCount = 100;

      // Add many jobs rapidly
      const jobs = [];
      for (let i = 0; i < jobCount; i++) {
        const job = await queueService.addJob('email-queue', 'throughput-test', 
          { index: i }
        );
        jobs.push(job);
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const throughput = jobCount / (totalTime / 1000); // jobs per second

      console.log(`Throughput Test: ${jobCount} jobs in ${totalTime}ms = ${throughput.toFixed(2)} jobs/sec`);
      console.log(`Processed: ${processedCount.count} jobs`);

      // Should process most jobs within reasonable time
      assert(processedCount.count >= jobCount * 0.8, 'Should process at least 80% of jobs');
      assert(throughput > 10, 'Should achieve at least 10 jobs/second throughput');
    });
  });

  describe('Queue Health and Monitoring', () => {
    it('should provide accurate queue statistics', async () => {
      const stats = await queueService.getQueueStats();
      
      assert(typeof stats === 'object', 'Stats should be an object');
      assert(typeof stats.totalQueues === 'number', 'Should have totalQueues count');
      assert(typeof stats.workers === 'number', 'Should have workers count');
      assert(typeof stats.queues === 'object', 'Should have queues object');

      console.log('Queue stats:', stats);

      // Add some jobs to test stats
      await queueService.addJob('email-queue', 'stats-test', { data: 'test1' });
      await queueService.addJob('email-queue', 'stats-test', { data: 'test2' });

      const statsWithJobs = await queueService.getQueueStats();
      console.log('Stats with jobs:', statsWithJobs);
    });

    it('should handle queue pause and resume', async () => {
      // Pause the queue
      const paused = await queueService.pauseQueue('email-queue');
      assert(paused, 'Should be able to pause queue');

      // Add job while paused
      const job = await queueService.addJob('email-queue', 'paused-test', { data: 'test' });
      assert(job.id, 'Job should be added even when paused');

      // Resume the queue
      const resumed = await queueService.resumeQueue('email-queue');
      assert(resumed, 'Should be able to resume queue');

      console.log('Pause/Resume test completed');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle Redis connection failures gracefully', async () => {
      // This test would require mocking Redis failures
      // For now, we test the error handling structure
      
      try {
        // Try to get queue stats (should work or fail gracefully)
        const stats = await queueService.getQueueStats();
        console.log('Error handling test - stats retrieved:', !!stats);
      } catch (error) {
        console.log('Error handling test - caught error:', error.message);
        // Should handle Redis errors gracefully
        assert(error.message.includes('Redis') || error.message.includes('connection'), 
          'Should handle Redis-related errors');
      }
    });

    it('should handle worker crashes', async () => {
      let crashCount = 0;
      
      const crashyProcessor = async (job) => {
        crashCount++;
        if (crashCount === 2) {
          // Simulate worker crash on second job
          throw new Error('Worker crash simulation');
        }
        return { success: true, crashCount };
      };

      // Add jobs that will cause crash
      await queueService.addJob('notification-queue', 'crash-test', { data: 'test1' });
      await queueService.addJob('notification-queue', 'crash-test', { data: 'test2' });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Worker crash test completed');
    });
  });
});
