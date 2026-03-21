import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import autocannon from 'autocannon';

describe('Load Testing - 500 Concurrent Users', () => {
  const baseUrl = 'http://localhost:4000';
  let server;

  before(async () => {
    // Start server for load testing
    console.log('Starting server for load testing...');
    // Note: In real scenario, you'd start your actual server
  });

  after(async () => {
    // Clean up after load testing
    console.log('Load testing completed');
  });

  describe('API Endpoints Load Test', () => {
    it('should handle 500 concurrent users on health endpoint', async () => {
      const result = await autocannon({
        url: `${baseUrl}/health`,
        connections: 500,
        duration: 30,
        requests: [
          {
            method: 'GET',
            path: '/health'
          }
        ]
      });

      console.log('Health Endpoint Load Test Results:');
      console.log(`  Requests: ${result.requests.total}`);
      console.log(`  Avg Latency: ${result.latency.average.toFixed(2)}ms`);
      console.log(`  p95 Latency: ${result.latency.p95.toFixed(2)}ms`);
      console.log(`  p99 Latency: ${result.latency.p99.toFixed(2)}ms`);
      console.log(`  Throughput: ${result.requests.average} req/sec`);
      console.log(`  Errors: ${result.errors}`);
      console.log(`  Timeouts: ${result.timeouts}`);

      // Performance assertions
      assert(result.latency.average < 100, `Average latency should be < 100ms, got ${result.latency.average}ms`);
      assert(result.latency.p95 < 200, `p95 latency should be < 200ms, got ${result.latency.p95}ms`);
      assert(result.latency.p99 < 500, `p99 latency should be < 500ms, got ${result.latency.p99}ms`);
      assert(result.errors === 0, `Should have no errors, got ${result.errors}`);
      assert(result.timeouts === 0, `Should have no timeouts, got ${result.timeouts}`);
      assert(result.requests.average > 100, `Should handle > 100 req/sec, got ${result.requests.average}`);
    });

    it('should handle 500 concurrent users on posts endpoint', async () => {
      const result = await autocannon({
        url: `${baseUrl}/api/v1/posts`,
        connections: 500,
        duration: 30,
        requests: [
          {
            method: 'GET',
            path: '/api/v1/posts'
          }
        ]
      });

      console.log('Posts Endpoint Load Test Results:');
      console.log(`  Requests: ${result.requests.total}`);
      console.log(`  Avg Latency: ${result.latency.average.toFixed(2)}ms`);
      console.log(`  p95 Latency: ${result.latency.p95.toFixed(2)}ms`);
      console.log(`  p99 Latency: ${result.latency.p99.toFixed(2)}ms`);
      console.log(`  Throughput: ${result.requests.average} req/sec`);
      console.log(`  Errors: ${result.errors}`);
      console.log(`  Timeouts: ${result.timeouts}`);

      // Performance assertions (more lenient for database queries)
      assert(result.latency.average < 500, `Average latency should be < 500ms, got ${result.latency.average}ms`);
      assert(result.latency.p95 < 1000, `p95 latency should be < 1000ms, got ${result.latency.p95}ms`);
      assert(result.latency.p99 < 2000, `p99 latency should be < 2000ms, got ${result.latency.p99}ms`);
      assert(result.errors < result.requests.total * 0.01, `Error rate should be < 1%, got ${(result.errors/result.requests.total*100).toFixed(2)}%`);
    });

    it('should handle mixed workload (GET, POST, PUT)', async () => {
      const result = await autocannon({
        url: baseUrl,
        connections: 500,
        duration: 60,
        requests: [
          {
            method: 'GET',
            path: '/health',
            weight: 40 // 40% of requests
          },
          {
            method: 'GET',
            path: '/api/v1/posts',
            weight: 30 // 30% of requests
          },
          {
            method: 'POST',
            path: '/api/v1/posts',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-token'
            },
            body: JSON.stringify({
              title: 'Load Test Post',
              content: 'This is a load test post content'
            }),
            weight: 20 // 20% of requests
          },
          {
            method: 'GET',
            path: '/api/v1/users/profile',
            headers: {
              'Authorization': 'Bearer test-token'
            },
            weight: 10 // 10% of requests
          }
        ]
      });

      console.log('Mixed Workload Load Test Results:');
      console.log(`  Duration: ${result.duration} seconds`);
      console.log(`  Requests: ${result.requests.total}`);
      console.log(`  Avg Latency: ${result.latency.average.toFixed(2)}ms`);
      console.log(`  p95 Latency: ${result.latency.p95.toFixed(2)}ms`);
      console.log(`  p99 Latency: ${result.latency.p99.toFixed(2)}ms`);
      console.log(`  Throughput: ${result.requests.average} req/sec`);
      console.log(`  2xx: ${result.statusCodes['2xx'] || 0}`);
      console.log(`  4xx: ${result.statusCodes['4xx'] || 0}`);
      console.log(`  5xx: ${result.statusCodes['5xx'] || 0}`);
      console.log(`  Errors: ${result.errors}`);
      console.log(`  Timeouts: ${result.timeouts}`);

      // Performance assertions for mixed workload
      assert(result.latency.average < 1000, `Average latency should be < 1000ms, got ${result.latency.average}ms`);
      assert(result.latency.p95 < 2000, `p95 latency should be < 2000ms, got ${result.latency.p95}ms`);
      assert((result.statusCodes['5xx'] || 0) < result.requests.total * 0.05, `5xx error rate should be < 5%, got ${((result.statusCodes['5xx'] || 0)/result.requests.total*100).toFixed(2)}%`);
      assert(result.requests.average > 50, `Should handle > 50 req/sec mixed workload, got ${result.requests.average}`);
    });

    it('should handle sustained load without memory leaks', async () => {
      const results = [];
      
      // Run multiple short bursts to check for memory leaks
      for (let i = 0; i < 5; i++) {
        const result = await autocannon({
          url: `${baseUrl}/health`,
          connections: 200,
          duration: 10,
          requests: [
            {
              method: 'GET',
              path: '/health'
            }
          ]
        });

        results.push({
          iteration: i + 1,
          avgLatency: result.latency.average,
          throughput: result.requests.average,
          errors: result.errors
        });

        console.log(`Burst ${i + 1}: Avg Latency: ${result.latency.average.toFixed(2)}ms, Throughput: ${result.requests.average} req/sec`);

        // Wait between bursts
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Check for performance degradation
      const firstBurst = results[0];
      const lastBurst = results[results.length - 1];
      
      const latencyIncrease = (lastBurst.avgLatency - firstBurst.avgLatency) / firstBurst.avgLatency;
      const throughputDecrease = (firstBurst.throughput - lastBurst.throughput) / firstBurst.throughput;

      console.log('Sustained Load Analysis:');
      console.log(`  Latency Increase: ${(latencyIncrease * 100).toFixed(2)}%`);
      console.log(`  Throughput Decrease: ${(throughputDecrease * 100).toFixed(2)}%`);

      // Should not degrade significantly
      assert(latencyIncrease < 0.5, `Latency increase should be < 50%, got ${(latencyIncrease * 100).toFixed(2)}%`);
      assert(throughputDecrease < 0.3, `Throughput decrease should be < 30%, got ${(throughputDecrease * 100).toFixed(2)}%`);
    });
  });

  describe('Rate Limiting Load Test', () => {
    it('should enforce rate limits under high load', async () => {
      const result = await autocannon({
        url: `${baseUrl}/api/v1/auth/login`,
        connections: 100,
        duration: 30,
        requests: [
          {
            method: 'POST',
            path: '/api/v1/auth/login',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'password'
            })
          }
        ]
      });

      console.log('Rate Limiting Load Test Results:');
      console.log(`  Requests: ${result.requests.total}`);
      console.log(`  429 Status Codes: ${result.statusCodes['429'] || 0}`);
      console.log(`  Rate Limited: ${((result.statusCodes['429'] || 0) / result.requests.total * 100).toFixed(2)}%`);

      // Should see rate limiting in effect
      assert((result.statusCodes['429'] || 0) > 0, 'Should have some rate limited requests');
      assert((result.statusCodes['429'] || 0) < result.requests.total * 0.5, 'Rate limiting should not block more than 50% of requests');
    });
  });

  describe('Cache Performance Load Test', () => {
    it('should demonstrate cache benefits under load', async () => {
      // First run - cache cold
      const coldResult = await autocannon({
        url: `${baseUrl}/api/v1/posts`,
        connections: 100,
        duration: 20,
        requests: [
          {
            method: 'GET',
            path: '/api/v1/posts'
          }
        ]
      });

      // Wait for cache to warm up
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Second run - cache warm
      const warmResult = await autocannon({
        url: `${baseUrl}/api/v1/posts`,
        connections: 100,
        duration: 20,
        requests: [
          {
            method: 'GET',
            path: '/api/v1/posts'
          }
        ]
      });

      console.log('Cache Performance Comparison:');
      console.log(`  Cold Cache - Avg Latency: ${coldResult.latency.average.toFixed(2)}ms, Throughput: ${coldResult.requests.average} req/sec`);
      console.log(`  Warm Cache - Avg Latency: ${warmResult.latency.average.toFixed(2)}ms, Throughput: ${warmResult.requests.average} req/sec`);

      const latencyImprovement = (coldResult.latency.average - warmResult.latency.average) / coldResult.latency.average;
      const throughputImprovement = (warmResult.requests.average - coldResult.requests.average) / coldResult.requests.average;

      console.log(`  Latency Improvement: ${(latencyImprovement * 100).toFixed(2)}%`);
      console.log(`  Throughput Improvement: ${(throughputImprovement * 100).toFixed(2)}%`);

      // Cache should provide some improvement
      assert(warmResult.latency.average <= coldResult.latency.average, 'Warm cache should be faster or equal');
    });
  });
});
