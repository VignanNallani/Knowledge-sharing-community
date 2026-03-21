#!/usr/bin/env node

// Scientific Load Test - Map New Failure Boundary
import { performance } from 'perf_hooks';

class ScientificLoadTest {
  constructor(baseUrl = 'http://localhost:4000') {
    this.baseUrl = baseUrl;
    this.results = {
      requests: [],
      summary: {}
    };
  }

  async runSustainedLoad(rps, durationSeconds = 60) {
    console.log(`🔬 SCIENTIFIC LOAD TEST: ${rps} RPS for ${durationSeconds}s`);
    console.log('='.repeat(60));
    
    const interval = 1000 / rps; // ms between requests
    const totalRequests = rps * durationSeconds;
    const promises = [];
    
    console.log(`📊 Target: ${totalRequests} requests over ${durationSeconds}s`);
    console.log(`⏱️  Interval: ${interval.toFixed(2)}ms between requests`);
    
    const startTime = performance.now();
    
    // Launch requests at precise intervals
    for (let i = 0; i < totalRequests; i++) {
      const requestTime = startTime + (i * interval);
      const delay = Math.max(0, requestTime - performance.now());
      
      const promise = new Promise(resolve => {
        setTimeout(async () => {
          const result = await this.makeRequest(i + 1);
          resolve(result);
        }, delay);
      });
      
      promises.push(promise);
    }
    
    // Wait for all requests to complete
    const allResults = await Promise.all(promises);
    const endTime = performance.now();
    
    // Analyze results
    const analysis = this.analyzeResults(allResults, endTime - startTime);
    
    return analysis;
  }

  async makeRequest(requestId) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/posts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      let data = null;
      let dataSize = 0;
      
      if (response.ok) {
        data = await response.json();
        dataSize = JSON.stringify(data).length;
      }
      
      const result = {
        requestId,
        timestamp: startTime,
        duration,
        status: response.status,
        success: response.ok,
        dataSize,
        error: response.ok ? null : `HTTP ${response.status}`,
        latencyCategory: this.categorizeLatency(duration),
        // Extract performance metrics if available
        queryTime: data?.performance?.queryTime ? parseFloat(data.performance.queryTime) : null,
        totalTime: data?.performance?.totalTime ? parseFloat(data.performance.totalTime) : null
      };
      
      // Log interesting events
      if (duration > 2000) {
        console.log(`🐌 Slow request: ${requestId} - ${duration.toFixed(2)}ms`);
      }
      
      if (!response.ok) {
        console.log(`❌ Failed request: ${requestId} - ${response.status} (${duration.toFixed(2)}ms)`);
      }
      
      if (result.queryTime && result.queryTime > 500) {
        console.log(`🔍 Slow query: ${requestId} - ${result.queryTime.toFixed(2)}ms`);
      }
      
      return result;
      
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return {
        requestId,
        timestamp: startTime,
        duration,
        status: 0,
        success: false,
        dataSize: 0,
        error: error.message,
        latencyCategory: 'error'
      };
    }
  }

  categorizeLatency(duration) {
    if (duration < 100) return 'fast';
    if (duration < 500) return 'good';
    if (duration < 1000) return 'acceptable';
    if (duration < 2000) return 'slow';
    return 'very_slow';
  }

  analyzeResults(results, testDuration) {
    console.log('\n📊 LOAD TEST ANALYSIS');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const rejected = results.filter(r => r.status === 503);
    const timeouts = results.filter(r => r.error && r.error.includes('timeout'));
    
    // Calculate statistics
    const durations = successful.map(r => r.duration);
    const avgDuration = durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
    const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
    
    // Percentiles
    const sortedDurations = durations.sort((a, b) => a - b);
    const p50 = sortedDurations[Math.floor(sortedDurations.length * 0.5)] || 0;
    const p95 = sortedDurations[Math.floor(sortedDurations.length * 0.95)] || 0;
    const p99 = sortedDurations[Math.floor(sortedDurations.length * 0.99)] || 0;
    
    // Calculate actual RPS
    const actualRPS = results.length / (testDuration / 1000);
    const successRPS = successful.length / (testDuration / 1000);
    
    // Latency distribution
    const latencyDist = {
      fast: results.filter(r => r.latencyCategory === 'fast').length,
      good: results.filter(r => r.latencyCategory === 'good').length,
      acceptable: results.filter(r => r.latencyCategory === 'acceptable').length,
      slow: results.filter(r => r.latencyCategory === 'slow').length,
      very_slow: results.filter(r => r.latencyCategory === 'very_slow').length,
      error: results.filter(r => r.latencyCategory === 'error').length
    };
    
    // Query performance analysis
    const queryTimes = results.filter(r => r.queryTime).map(r => r.queryTime);
    const avgQueryTime = queryTimes.length > 0 ? queryTimes.reduce((sum, t) => sum + t, 0) / queryTimes.length : 0;
    const maxQueryTime = queryTimes.length > 0 ? Math.max(...queryTimes) : 0;
    
    console.log(`📈 REQUEST METRICS:`);
    console.log(`   Total requests: ${results.length}`);
    console.log(`   Successful: ${successful.length} (${((successful.length/results.length)*100).toFixed(1)}%)`);
    console.log(`   Failed: ${failed.length} (${((failed.length/results.length)*100).toFixed(1)}%)`);
    console.log(`   Rejected (503): ${rejected.length} (${((rejected.length/results.length)*100).toFixed(1)}%)`);
    console.log(`   Timeouts: ${timeouts.length}`);
    
    console.log(`\n⏱️  LATENCY ANALYSIS:`);
    console.log(`   Average: ${avgDuration.toFixed(2)}ms`);
    console.log(`   Min/Max: ${minDuration.toFixed(2)}ms / ${maxDuration.toFixed(2)}ms`);
    console.log(`   p50: ${p50.toFixed(2)}ms`);
    console.log(`   p95: ${p95.toFixed(2)}ms`);
    console.log(`   p99: ${p99.toFixed(2)}ms`);
    console.log(`   Variance: ${(maxDuration - minDuration).toFixed(2)}ms`);
    
    console.log(`\n🎯 THROUGHPUT:`);
    console.log(`   Target RPS: ${(results.length / (testDuration / 1000)).toFixed(2)}`);
    console.log(`   Actual RPS: ${actualRPS.toFixed(2)}`);
    console.log(`   Success RPS: ${successRPS.toFixed(2)}`);
    console.log(`   Test duration: ${(testDuration / 1000).toFixed(2)}s`);
    
    console.log(`\n🔍 QUERY PERFORMANCE:`);
    console.log(`   Avg query time: ${avgQueryTime.toFixed(2)}ms`);
    console.log(`   Max query time: ${maxQueryTime.toFixed(2)}ms`);
    console.log(`   Query samples: ${queryTimes.length}`);
    
    console.log(`\n📊 LATENCY DISTRIBUTION:`);
    Object.entries(latencyDist).forEach(([category, count]) => {
      const percentage = ((count / results.length) * 100).toFixed(1);
      console.log(`   ${category}: ${count} (${percentage}%)`);
    });
    
    // Performance assessment
    console.log(`\n🎯 PERFORMANCE ASSESSMENT:`);
    
    if (p95 < 500) {
      console.log(`🟢 EXCELLENT: p95 < 500ms`);
    } else if (p95 < 1000) {
      console.log(`🟡 GOOD: p95 < 1s`);
    } else if (p95 < 2000) {
      console.log(`🟠 FAIR: p95 < 2s`);
    } else {
      console.log(`🔴 POOR: p95 > 2s`);
    }
    
    if (rejected.length > results.length * 0.1) {
      console.log(`⚠️  High rejection rate (${((rejected.length/results.length)*100).toFixed(1)}%)`);
    }
    
    if (maxDuration - minDuration > avgDuration) {
      console.log(`⚠️  High variance suggests instability`);
    }
    
    // Bottleneck analysis
    console.log(`\n🔍 BOTTLENECK ANALYSIS:`);
    
    if (avgQueryTime > 0) {
      const dbRatio = (avgQueryTime / avgDuration) * 100;
      console.log(`   DB time ratio: ${dbRatio.toFixed(1)}% of total latency`);
      
      if (dbRatio > 70) {
        console.log(`   → Database-bound`);
      } else if (dbRatio < 30) {
        console.log(`   → Application-bound (not DB)`);
      } else {
        console.log(`   → Mixed DB/App workload`);
      }
    }
    
    console.log('='.repeat(60));
    
    return {
      summary: {
        totalRequests: results.length,
        successful: successful.length,
        failed: failed.length,
        rejected: rejected.length,
        actualRPS,
        successRPS,
        avgDuration,
        p95,
        variance: maxDuration - minDuration,
        avgQueryTime
      },
      details: results
    };
  }
}

// Run scientific load tests at different RPS levels
async function runScientificTests() {
  const tester = new ScientificLoadTest();
  
  console.log('🔬 STARTING SCIENTIFIC LOAD TEST SERIES');
  console.log('Testing capacity boundaries after optimization');
  console.log('='.repeat(60));
  
  const testLevels = [5, 8, 10]; // RPS levels to test
  
  for (const rps of testLevels) {
    console.log(`\n🎯 TESTING ${rps} RPS...`);
    const result = await tester.runSustainedLoad(rps, 30); // 30-second tests
    
    // Brief assessment
    if (result.summary.p95 < 1000 && result.summary.rejected < 3) {
      console.log(`✅ ${rps} RPS: STABLE`);
    } else if (result.summary.p95 < 2000 && result.summary.rejected < 10) {
      console.log(`🟡 ${rps} RPS: MARGINAL`);
    } else {
      console.log(`❌ ${rps} RPS: UNSTABLE`);
    }
    
    // Wait between tests
    if (rps !== testLevels[testLevels.length - 1]) {
      console.log(`⏳ Waiting 10 seconds before next test...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  console.log('\n🎯 SCIENTIFIC TEST SERIES COMPLETE');
  console.log('Review results to determine optimal capacity envelope');
}

// Run the tests
runScientificTests().catch(console.error);
