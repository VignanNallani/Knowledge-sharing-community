#!/usr/bin/env node

// Test Admission Control - Concurrent Request Test
import { performance } from 'perf_hooks';

const API_BASE = 'http://localhost:4000';

class AdmissionControlTest {
  constructor() {
    this.results = [];
    this.startTime = performance.now();
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
      console.log(`Request ${requestId}: ${response.status} (${(end - start).toFixed(0)}ms)`);
      
      return result;
    } catch (error) {
      const end = performance.now();
      const result = {
        requestId,
        status: 0,
        latency: end - start,
        success: false,
        error: error.message,
        timestamp: end - this.startTime
      };
      
      this.results.push(result);
      console.log(`Request ${requestId}: ERROR - ${error.message}`);
      
      return result;
    }
  }

  async runConcurrentTest(concurrentRequests = 10) {
    console.log(`🎯 Testing admission control with ${concurrentRequests} concurrent requests...`);
    
    // Launch all requests concurrently
    const promises = [];
    for (let i = 1; i <= concurrentRequests; i++) {
      promises.push(this.makeRequest(i));
    }
    
    // Wait for all to complete
    await Promise.all(promises);
    
    this.analyzeResults();
  }

  analyzeResults() {
    const totalRequests = this.results.length;
    const successfulRequests = this.results.filter(r => r.success).length;
    const rejectedRequests = this.results.filter(r => r.status === 503).length;
    const failedRequests = this.results.filter(r => !r.success && r.status !== 503).length;
    
    const latencies = this.results.filter(r => r.success).map(r => r.latency);
    latencies.sort((a, b) => a - b);
    
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    
    console.log('\n🎯 ADMISSION CONTROL TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Successful (2xx): ${successfulRequests}`);
    console.log(`Rejected (503): ${rejectedRequests}`);
    console.log(`Failed (other): ${failedRequests}`);
    console.log(`Rejection Rate: ${(rejectedRequests / totalRequests * 100).toFixed(1)}%`);
    
    if (latencies.length > 0) {
      console.log(`\nLatency Analysis (successful requests):`);
      console.log(`p50: ${p50.toFixed(0)}ms`);
      console.log(`p95: ${p95.toFixed(0)}ms`);
      console.log(`p99: ${p99.toFixed(0)}ms`);
    }
    
    // Analyze admission control behavior
    const sortedResults = this.results.sort((a, b) => a.timestamp - b.timestamp);
    console.log(`\n📊 Request Timeline:`);
    sortedResults.forEach(r => {
      const status = r.status === 503 ? 'REJECTED' : r.success ? 'SUCCESS' : 'FAILED';
      console.log(`  ${(r.timestamp / 1000).toFixed(1)}s: Request ${r.requestId} - ${status} (${r.latency.toFixed(0)}ms)`);
    });
    
    console.log('='.repeat(50));
    
    return {
      totalRequests,
      successfulRequests,
      rejectedRequests,
      failedRequests,
      rejectionRate: rejectedRequests / totalRequests,
      latency: latencies.length > 0 ? { p50, p95, p99 } : null
    };
  }
}

// Run the test
const test = new AdmissionControlTest();
test.runConcurrentTest(10).catch(console.error);
