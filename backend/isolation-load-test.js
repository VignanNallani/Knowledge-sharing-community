#!/usr/bin/env node

import http from 'http';
import { performance } from 'perf_hooks';

const TARGET_URL = 'http://localhost:4001/api/v1/posts';
const CONCURRENT_REQUESTS = 2; // Test 2 RPS
const TEST_DURATION = 10000; // 10 seconds

class IsolationLoadTest {
  constructor() {
    this.results = [];
    this.activeRequests = 0;
    this.startTime = null;
    this.completedRequests = 0;
  }

  async makeRequest(requestId) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      this.activeRequests++;

      const req = http.get(TARGET_URL, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          this.activeRequests--;
          this.completedRequests++;

          this.results.push({
            requestId,
            statusCode: res.statusCode,
            duration: duration,
            timestamp: endTime - this.startTime
          });

          resolve();
        });
      });

      req.on('error', (err) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.activeRequests--;
        this.completedRequests++;

        this.results.push({
          requestId,
          statusCode: 0,
          duration: duration,
          error: err.message,
          timestamp: endTime - this.startTime
        });

        resolve();
      });

      req.setTimeout(10000, () => {
        req.destroy();
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.activeRequests--;
        this.completedRequests++;

        this.results.push({
          requestId,
          statusCode: 0,
          duration: duration,
          error: 'Request timeout',
          timestamp: endTime - this.startTime
        });

        resolve();
      });
    });
  }

  async runTest() {
    console.log(`🧪 ISOLATION LOAD TEST: ${CONCURRENT_REQUESTS} RPS for ${TEST_DURATION/1000}s`);
    console.log(`📍 Target: ${TARGET_URL}`);
    console.log('='.repeat(60));

    this.startTime = performance.now();
    const endTime = this.startTime + TEST_DURATION;

    let requestId = 0;
    const loadGenerator = setInterval(async () => {
      if (performance.now() >= endTime) {
        clearInterval(loadGenerator);
        return;
      }

      await this.makeRequest(++requestId);
    }, 1000); // Every second = RPS

    return new Promise((resolve) => {
      setTimeout(() => {
        this.analyzeResults();
        resolve();
      }, TEST_DURATION + 5000);
    });
  }

  analyzeResults() {
    const totalTime = performance.now() - this.startTime;
    const actualRPS = this.completedRequests / (totalTime / 1000);
    
    const successfulRequests = this.results.filter(r => r.statusCode === 200);
    const sortedDurations = successfulRequests.map(r => r.duration).sort((a, b) => a - b);
    
    const p50 = sortedDurations[Math.floor(sortedDurations.length * 0.5)];
    const p95 = sortedDurations[Math.floor(sortedDurations.length * 0.95)];
    
    const avgTotalTime = successfulRequests.length > 0 ? 
      successfulRequests.reduce((sum, r) => sum + r.duration, 0) / successfulRequests.length : 0;

    console.log('\n📊 ISOLATION LOAD TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`⏱️  Test Duration: ${(totalTime/1000).toFixed(1)}s`);
    console.log(`📈 Completed Requests: ${this.completedRequests}`);
    console.log(`🎯 Actual RPS: ${actualRPS.toFixed(2)}`);
    console.log(`✅ Successful Requests: ${successfulRequests.length}`);
    console.log(`📈 Success Rate: ${(successfulRequests.length / this.completedRequests * 100).toFixed(1)}%`);
    
    console.log('\n⏱️  LATENCY BREAKDOWN');
    console.log('-'.repeat(40));
    console.log(`📉 p50: ${p50?.toFixed(2)}ms`);
    console.log(`📉 p95: ${p95?.toFixed(2)}ms`);
    console.log(`⚙️  Avg Total Time: ${avgTotalTime.toFixed(2)}ms`);
    
    console.log('\n🎯 ISOLATION ANALYSIS');
    console.log('-'.repeat(40));
    if (avgTotalTime < 100) {
      console.log('✅ PURE NODE: Fast - overhead is in middleware/DB');
    } else if (avgTotalTime < 500) {
      console.log('⚠️  PURE NODE: Moderate - some intrinsic overhead');
    } else {
      console.log('🚨 PURE NODE: Slow - Node.js or system bottleneck');
    }
  }
}

// Run isolation test
const tester = new IsolationLoadTest();
tester.runTest().catch(console.error);
