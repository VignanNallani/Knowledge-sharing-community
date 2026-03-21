// Baseline Engine - Defines "Healthy" performance mathematically
import fs from 'fs/promises';
import { performance } from 'perf_hooks';

class BaselineEngine {
  constructor() {
    this.baselinePath = './performance-baseline.json';
    this.currentBaseline = null;
  }

  // Capture performance baseline with statistical rigor
  async captureBaseline(commitSha = process.env.GIT_COMMIT || 'unknown') {
    console.log('📊 Capturing statistically robust performance baseline...');
    
    // Run multiple independent tests for statistical validity
    const testRuns = [];
    const numRuns = 7; // Odd number for median stability
    
    for (let i = 0; i < numRuns; i++) {
      console.log(`🧪 Baseline run ${i + 1}/${numRuns}...`);
      
      // Warm up system before measurement
      await this.warmupSystem();
      
      // Run controlled test
      const runResult = await this.runControlledTest();
      testRuns.push(runResult);
      
      // Cool down between runs
      await this.cooldown();
    }
    
    // Compute statistical baseline
    const baseline = this.computeStatisticalBaseline(testRuns, commitSha);
    
    await this.saveBaseline(baseline);
    this.currentBaseline = baseline;
    
    console.log('✅ Statistically robust baseline captured:', baseline);
    return baseline;
  }

  async warmupSystem() {
    console.log('🔥 Warming up system...');
    // Run warmup requests to stabilize caches, JIT compilation, etc.
    const warmupRequests = 20;
    
    for (let i = 0; i < warmupRequests; i++) {
      try {
        await fetch('http://localhost:4000/api/v1/posts');
      } catch (error) {
        // Ignore warmup errors
      }
      await this.wait(100); // 100ms between requests
    }
  }

  async cooldown() {
    // Wait for system to stabilize between runs
    await this.wait(2000);
  }

  async runControlledTest() {
    const testConfig = {
      duration: 30000,        // 30 seconds per run
      rps: 3,                // Fixed concurrency
      warmup: 5000,          // 5s warmup already done
      dataset: 'stable'      // Use consistent test data
    };

    const results = {};
    
    // Test different RPS levels for comprehensive baseline
    const rpsLevels = [1, 3, 5];
    
    for (const rps of rpsLevels) {
      console.log(`📊 Testing ${rps} RPS...`);
      results[rps] = await this.measureAtRPS(rps, testConfig);
    }

    return this.aggregateResults(results);
  }

  computeStatisticalBaseline(testRuns, commitSha) {
    // Collect all measurements across runs
    const allMeasurements = {
      p50: [],
      p95: [],
      p99: [],
      mean: [],
      error_rate: [],
      throughput: []
    };

    testRuns.forEach(run => {
      allMeasurements.p50.push(run.p50);
      allMeasurements.p95.push(run.p95);
      allMeasurements.p99.push(run.p99);
      allMeasurements.mean.push(run.mean);
      allMeasurements.error_rate.push(run.error_rate);
      allMeasurements.throughput.push(run.throughput);
    });

    // Compute statistics for each metric
    const baseline = {
      version: commitSha,
      timestamp: Date.now(),
      environment: process.env.NODE_ENV || 'development',
      num_runs: testRuns.length,
      statistical_confidence: 0.95,
      
      // For each metric: mean, stddev, min, max, median
      p95: this.computeStats(allMeasurements.p95),
      p50: this.computeStats(allMeasurements.p50),
      p99: this.computeStats(allMeasurements.p99),
      mean: this.computeStats(allMeasurements.mean),
      error_rate: this.computeStats(allMeasurements.error_rate),
      throughput: this.computeStats(allMeasurements.throughput),
      
      // Regression thresholds (3 sigma)
      thresholds: {
        p95_max: this.computeStats(allMeasurements.p95).mean + (3 * this.computeStats(allMeasurements.p95).stddev),
        p50_max: this.computeStats(allMeasurements.p50).mean + (3 * this.computeStats(allMeasurements.p50).stddev),
        error_rate_max: Math.max(0.05, this.computeStats(allMeasurements.error_rate).mean + (3 * this.computeStats(allMeasurements.error_rate).stddev)),
        throughput_min: this.computeStats(allMeasurements.throughput).mean - (3 * this.computeStats(allMeasurements.throughput).stddev)
      },
      
      // Raw data for analysis
      raw_runs: testRuns
    };

    return baseline;
  }

  computeStats(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const n = sorted.length;
    
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const median = n % 2 === 0 ? 
      (sorted[n/2 - 1] + sorted[n/2]) / 2 : 
      sorted[Math.floor(n/2)];
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stddev = Math.sqrt(variance);
    
    return {
      mean: mean,
      median: median,
      stddev: stddev,
      min: sorted[0],
      max: sorted[n - 1],
      count: n,
      coefficient_of_variation: stddev / mean
    };
  }

  percentile(arr, p) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  async saveBaseline(baseline) {
    await fs.writeFile(this.baselinePath, JSON.stringify(baseline, null, 2));
  }

  async loadBaseline() {
    try {
      const data = await fs.readFile(this.baselinePath, 'utf8');
      this.currentBaseline = JSON.parse(data);
      return this.currentBaseline;
    } catch (error) {
      console.log('⚠️ No baseline found, run capture first');
      return null;
    }
  }

  // Measurement methods would be implemented with actual load tests
  async measurePureNode() {
    // Placeholder - would run isolation test
    return 35; // ms
  }

  async measureWithMiddleware() {
    // Placeholder - would test with admission control only
    return 45; // ms  
  }

  async measureFullStack() {
    // Placeholder - would test full production stack
    return 55; // ms
  }
}

export default BaselineEngine;
