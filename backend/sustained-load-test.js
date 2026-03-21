#!/usr/bin/env node

// Sustained Load Test - Validate Admission Control Under Stress
import { performance } from 'perf_hooks';

const API_BASE = 'http://localhost:4000';

class SustainedLoadTest {
  constructor(targetRps = 1.2, durationMinutes = 5) {
    this.targetRps = targetRps;
    this.durationMs = durationMinutes * 60 * 1000;
    this.requestInterval = 1000 / targetRps; // ms between requests
    
    this.results = [];
    this.startTime = performance.now();
    this.requestCount = 0;
    this.rejectedCount = 0;
    this.successCount = 0;
  }

  async makeRequest(requestId) {
    const start = performance.now();
    
    try {
      const response = await fetch(`${API_BASE}/api/v1/posts`);
      const end = performance.now();
      
      const result = {
        requestId,
        status: response.status,
        latency: end - start,
        success: response.ok,
        timestamp: end - this.startTime
      };
      
      this.results.push(result);
      
      if (response.status === 503) {
        this.rejectedCount++;
        console.log(`[${((end - this.startTime) / 1000).toFixed(1)}s] Request ${requestId}: REJECTED (503)`);
      } else if (response.ok) {
        this.successCount++;
        console.log(`[${((end - this.startTime) / 1000).toFixed(1)}s] Request ${requestId}: SUCCESS (${(end - start).toFixed(0)}ms)`);
      } else {
        console.log(`[${((end - this.startTime) / 1000).toFixed(1)}s] Request ${requestId}: FAILED (${response.status})`);
      }
      
      return result;
    } catch (error) {
      const end = performance.now();
      this.rejectedCount++;
      const result = {
        requestId,
        status: 0,
        latency: end - start,
        success: false,
        error: error.message,
        timestamp: end - this.startTime
      };
      
      this.results.push(result);
      console.log(`[${((end - this.startTime) / 1000).toFixed(1)}s] Request ${requestId}: ERROR - ${error.message}`);
      
      return result;
    }
  }

  async runSustainedLoad() {
    console.log(`🎯 SUSTAINED LOAD TEST - ${this.targetRps} RPS for ${this.durationMs / 60000} minutes`);
    console.log(`📊 Target interval: ${this.requestInterval.toFixed(0)}ms between requests`);
    console.log('='.repeat(60));
    
    const endTime = this.startTime + this.durationMs;
    let requestId = 1;
    
    while (performance.now() < endTime) {
      // Make request
      this.makeRequest(requestId++);
      this.requestCount++;
      
      // Wait for target interval
      await new Promise(resolve => setTimeout(resolve, this.requestInterval));
      
      // Report every 30 seconds
      if (requestId % Math.floor(30 * this.targetRps) === 0) {
        this.reportProgress();
      }
    }
    
    // Wait for final requests to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    this.reportFinalResults();
  }

  reportProgress() {
    const elapsed = (performance.now() - this.startTime) / 1000;
    const currentRps = this.requestCount / elapsed;
    const rejectionRate = (this.rejectedCount / this.requestCount) * 100;
    
    console.log(`\n📊 [${elapsed.toFixed(0)}s] Progress Report:`);
    console.log(`   Target RPS: ${this.targetRps} | Actual RPS: ${currentRps.toFixed(2)}`);
    console.log(`   Rejection Rate: ${rejectionRate.toFixed(1)}% | Success Rate: ${((this.successCount / this.requestCount) * 100).toFixed(1)}%`);
    
    // Check current system capacity
    this.checkSystemCapacity();
  }

  checkSystemCapacity() {
    try {
      // Quick check of current capacity
      fetch(`${API_BASE}/api/v1/posts`)
        .then(response => {
          if (response.status === 503) {
            const responseClone = response.clone();
            return responseClone.json();
          }
          return null;
        })
        .then(capacityInfo => {
          if (capacityInfo && capacityInfo.capacity) {
            console.log(`   System Capacity: ${capacityInfo.capacity.active}/${capacityInfo.capacity.max} active`);
          }
        })
        .catch(() => {}); // Ignore errors in progress reporting
    } catch (error) {
      // Ignore
    }
  }

  reportFinalResults() {
    const elapsed = (performance.now() - this.startTime) / 1000;
    const actualRps = this.requestCount / elapsed;
    const rejectionRate = (this.rejectedCount / this.requestCount) * 100;
    const successRate = (this.successCount / this.requestCount) * 100;
    
    // Latency analysis for successful requests only
    const successfulResults = this.results.filter(r => r.success);
    const latencies = successfulResults.map(r => r.latency).sort((a, b) => a - b);
    
    let latencyStats = null;
    if (latencies.length > 0) {
      const p50 = latencies[Math.floor(latencies.length * 0.5)];
      const p95 = latencies[Math.floor(latencies.length * 0.95)];
      const p99 = latencies[Math.floor(latencies.length * 0.99)];
      
      latencyStats = { p50, p95, p99 };
    }
    
    console.log('\n🎯 SUSTAINED LOAD TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Duration: ${elapsed.toFixed(1)}s`);
    console.log(`Target RPS: ${this.targetRps} | Actual RPS: ${actualRps.toFixed(2)}`);
    console.log(`Total Requests: ${this.requestCount}`);
    console.log(`Successful: ${this.successCount} (${successRate.toFixed(1)}%)`);
    console.log(`Rejected: ${this.rejectedCount} (${rejectionRate.toFixed(1)}%)`);
    
    if (latencyStats) {
      console.log(`\n📊 Latency Analysis (successful requests):`);
      console.log(`   p50: ${latencyStats.p50.toFixed(0)}ms`);
      console.log(`   p95: ${latencyStats.p95.toFixed(0)}ms`);
      console.log(`   p99: ${latencyStats.p99.toFixed(0)}ms`);
    }
    
    // Analyze rejection pattern
    const timeSeriesRejections = this.analyzeRejectionPattern();
    if (timeSeriesRejections.isStable) {
      console.log(`\n✅ REJECTION PATTERN: Stable (controlled admission)`);
    } else {
      console.log(`\n⚠️  REJECTION PATTERN: Unstable (may need tuning)`);
    }
    
    console.log('='.repeat(60));
    
    return {
      duration: elapsed,
      targetRps: this.targetRps,
      actualRps,
      totalRequests: this.requestCount,
      successCount: this.successCount,
      rejectedCount: this.rejectedCount,
      rejectionRate,
      latency: latencyStats,
      rejectionPattern: timeSeriesRejections
    };
  }

  analyzeRejectionPattern() {
    // Analyze if rejections are consistent (good) or bursty (bad)
    const windowSize = 30; // 30-second windows
    const windows = [];
    
    for (let i = 0; i < this.durationMs / 1000 / windowSize; i++) {
      const windowStart = i * windowSize * 1000;
      const windowEnd = (i + 1) * windowSize * 1000;
      
      const windowResults = this.results.filter(r => 
        r.timestamp >= windowStart && r.timestamp < windowEnd
      );
      
      const windowRejections = windowResults.filter(r => r.status === 503).length;
      windows.push(windowRejections);
    }
    
    // Check if pattern is stable (low variance)
    const avgRejections = windows.reduce((sum, count) => sum + count, 0) / windows.length;
    const variance = windows.reduce((sum, count) => sum + Math.pow(count - avgRejections, 2), 0) / windows.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      windows,
      avgRejections,
      stdDev,
      isStable: stdDev < avgRejections * 0.3 // Stable if stdDev < 30% of mean
    };
  }
}

// Run sustained load test at 1.2 RPS for 5 minutes
const test = new SustainedLoadTest(1.2, 5);
test.runSustainedLoad().catch(console.error);
