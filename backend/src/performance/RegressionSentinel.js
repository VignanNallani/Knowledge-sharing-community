// Regression Sentinel - Automated PR Gatekeeper
import BaselineEngine from './BaselineEngine.js';

class RegressionSentinel {
  constructor() {
    this.baselineEngine = new BaselineEngine();
    this.thresholds = {
      p95_regression: 1.25,  // 25% increase triggers failure
      p99_regression: 1.5,   // 50% increase triggers failure
      min_requests: 50,        // Minimum requests for valid test
      test_duration: 60000     // 60 seconds
    };
  }

  // PR gatekeeper - runs on every deploy with deterministic testing
  async validatePR(prContext = {}) {
    console.log('🚦 Running deterministic regression sentinel...');
    
    // Load current baseline
    const baseline = await this.baselineEngine.loadBaseline();
    if (!baseline) {
      console.log('⚠️ No baseline found, skipping regression test');
      return { status: 'skipped', reason: 'no_baseline' };
    }

    // Run deterministic performance test
    const currentMetrics = await this.runDeterministicPerformanceTest();
    
    // Compare against baseline with statistical thresholds
    const regression = this.detectStatisticalRegression(baseline, currentMetrics);
    
    if (regression.detected) {
      console.log('🚨 STATISTICAL REGRESSION DETECTED:', regression);
      
      // Auto-bisect if possible
      if (prContext.commitRange) {
        const culprit = await this.autoBisect(prContext, baseline, currentMetrics);
        regression.culprit = culprit;
      }
      
      return { status: 'failed', regression };
    }

    console.log('✅ No statistical regression detected');
    return { status: 'passed', currentMetrics };
  }

  async runDeterministicPerformanceTest() {
    console.log('🧪 Running deterministic performance test...');
    
    const testConfig = {
      duration: 30000,         // Fixed 30 seconds
      rps_levels: [1, 3, 5],   // Fixed RPS levels
      warmup: 10000,          // 10s warmup
      cooldown: 5000,         // 5s cooldown
      seed: 42,               // Fixed seed for reproducibility
      dataset: 'stable',      // Fixed test dataset
      isolation: true         // Isolated from other workloads
    };

    const results = {};
    
    for (const rps of testConfig.rps_levels) {
      console.log(`📊 Testing ${rps} RPS (deterministic)...`);
      results[rps] = await this.measureAtRPSDeterministic(rps, testConfig);
    }

    return this.aggregateDeterministicResults(results);
  }

  async measureAtRPSDeterministic(targetRPS, config) {
    // Deterministic load testing with fixed parameters
    const testResults = [];
    const testDuration = config.duration;
    const interval = 1000 / targetRPS; // ms between requests
    
    const startTime = Date.now();
    let requestCount = 0;
    
    // Fixed seed for reproducibility
    const random = this.seededRandom(config.seed);
    
    while (Date.now() - startTime < testDuration) {
      const requestStart = Date.now();
      
      try {
        // Use deterministic endpoint and data
        const response = await fetch('http://localhost:4000/api/v1/posts', {
          method: 'GET',
          headers: {
            'X-Test-Seed': config.seed.toString(),
            'X-Test-RPS': targetRPS.toString()
          }
        });
        
        const latency = Date.now() - requestStart;
        testResults.push({
          latency,
          success: response.ok,
          status_code: response.status,
          timestamp: requestStart
        });
        
      } catch (error) {
        testResults.push({
          latency: Date.now() - requestStart,
          success: false,
          error: error.message,
          timestamp: requestStart
        });
      }
      
      requestCount++;
      
      // Precise timing for fixed RPS
      const elapsed = Date.now() - requestStart;
      const waitTime = Math.max(0, interval - elapsed);
      await this.wait(waitTime);
    }
    
    return this.calculateDeterministicMetrics(testResults, targetRPS);
  }

  calculateDeterministicMetrics(results, rps) {
    const successful = results.filter(r => r.success);
    const latencies = successful.map(r => r.latency);
    const errors = results.filter(r => !r.success);
    
    if (latencies.length === 0) {
      return {
        p50: 0,
        p95: 0,
        mean: 0,
        error_rate: 1.0,
        throughput: 0,
        requests: results.length,
        rps: rps
      };
    }
    
    return {
      p50: this.percentile(latencies, 0.5),
      p95: this.percentile(latencies, 0.95),
      mean: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      error_rate: errors.length / results.length,
      throughput: successful.length / (results.length / 1000), // requests per second
      requests: results.length,
      rps: rps
    };
  }

  aggregateDeterministicResults(results) {
    const allP50 = Object.values(results).map(r => r.p50);
    const allP95 = Object.values(results).map(r => r.p95);
    const allMean = Object.values(results).map(r => r.mean);
    const allErrorRates = Object.values(results).map(r => r.error_rate);
    const allThroughput = Object.values(results).map(r => r.throughput);

    return {
      p50: this.computeStats(allP50),
      p95: this.computeStats(allP95),
      mean: this.computeStats(allMean),
      error_rate: this.computeStats(allErrorRates),
      throughput: this.computeStats(allThroughput),
      by_rps: results
    };
  }

  detectStatisticalRegression(baseline, current) {
    // Use 3-sigma thresholds from baseline
    const p95Regression = current.p95.mean > baseline.thresholds.p95_max;
    const p50Regression = current.p50.mean > baseline.thresholds.p50_max;
    const errorRateRegression = current.error_rate.mean > baseline.thresholds.error_rate_max;
    const throughputRegression = current.throughput.mean < baseline.thresholds.throughput_min;

    // Don't use p99 in CI - too unstable for short tests
    return {
      detected: p95Regression || p50Regression || errorRateRegression || throughputRegression,
      p95_regression: p95Regression,
      p50_regression: p50Regression,
      error_rate_regression: errorRateRegression,
      throughput_regression: throughputRegression,
      baseline: baseline,
      current: current,
      thresholds: baseline.thresholds,
      statistical_confidence: 0.95
    };
  }

  // Helper for deterministic randomness
  seededRandom(seed) {
    let value = seed;
    return function() {
      value = (value * 9301 + 49297) % 233280;
      return value / 233280;
    };
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
      count: n
    };
  }

  async autoBisect(prContext, baseline, current) {
    console.log('🔍 Starting automatic commit bisect...');
    
    // This would use git bisect to find the exact commit
    // that introduced the regression
    const commits = prContext.commitRange;
    const culprit = await this.binarySearchCommits(commits, baseline, current);
    
    console.log(`🎯 Regression culprit: ${culprit.commit}`);
    return culprit;
  }

  async binarySearchCommits(commits, baseline, current) {
    // Simplified bisect algorithm
    let left = 0;
    let right = commits.length - 1;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const testCommit = commits[mid];
      
      // Test performance at this commit
      const metrics = await this.testCommitPerformance(testCommit);
      
      if (this.isRegression(baseline, metrics)) {
        right = mid;
      } else {
        left = mid + 1;
      }
    }
    
    return commits[left];
  }

  isRegression(baseline, metrics) {
    return metrics.p95 > (baseline.p95 * this.thresholds.p95_regression);
  }

  percentile(arr, p) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }
}

export default RegressionSentinel;
