#!/usr/bin/env node

// Controlled Load Test - Phase 6 Step 2
import { performance } from 'perf_hooks';

const API_BASE = 'http://localhost:4000';
const METRICS_URL = 'http://localhost:4000/metrics';

class ControlledLoadTest {
  constructor() {
    this.baselineRps = 0.42;
    this.targetRps = 2.1; // 5× baseline
    this.requestCount = 0;
    this.errorCount = 0;
    this.latencies = [];
    this.startTime = performance.now();
    this.phase = 'warmup';
    this.currentRps = this.baselineRps;
    this.metricsHistory = [];
  }

  async makeRequest(endpoint) {
    const start = performance.now();
    
    try {
      const response = await fetch(`${API_BASE}${endpoint}`);
      const end = performance.now();
      
      this.requestCount++;
      this.latencies.push(end - start);
      
      if (!response.ok) {
        this.errorCount++;
      }
      
      return {
        status: response.status,
        latency: end - start,
        endpoint
      };
    } catch (error) {
      this.errorCount++;
      return {
        status: 0,
        latency: performance.now() - start,
        endpoint,
        error: error.message
      };
    }
  }

  async collectMetrics() {
    try {
      const response = await fetch(METRICS_URL);
      const metricsText = await response.text();
      
      const metrics = {
        timestamp: performance.now(),
        concurrency: this.extractMetric(metricsText, 'concurrency_active_requests'),
        circuitBreaker: this.extractMetric(metricsText, 'circuit_breaker_state'),
        loadShedding: this.extractMetric(metricsText, 'load_shedding_stage'),
        eventLoopLag: this.extractMetric(metricsText, 'event_loop_lag_seconds') * 1000, // convert to ms
        poolActive: this.extractMetric(metricsText, 'db_connection_pool_active'),
        poolTotal: this.extractMetric(metricsText, 'db_connection_pool_total'),
        redisUp: this.extractMetric(metricsText, 'redis_up')
      };
      
      this.metricsHistory.push(metrics);
      return metrics;
    } catch (error) {
      console.error('Failed to collect metrics:', error.message);
      return null;
    }
  }

  extractMetric(metricsText, metricName) {
    const regex = new RegExp(`${metricName} ([\\d.]+)`);
    const match = metricsText.match(regex);
    return match ? parseFloat(match[1]) : 0;
  }

  calculateTargetRps(elapsed) {
    const phaseDuration = elapsed / 1000; // convert to seconds
    
    if (phaseDuration < 120) {
      // Phase A: Warmup (0-2 min)
      this.phase = 'warmup';
      return this.baselineRps;
    } else if (phaseDuration < 300) {
      // Phase B: Ramp (2-5 min)
      this.phase = 'ramp';
      const rampProgress = (phaseDuration - 120) / 180; // 0 to 1 over 3 minutes
      return this.baselineRps + (this.targetRps - this.baselineRps) * rampProgress;
    } else if (phaseDuration < 900) {
      // Phase C: Sustained (5-15 min)
      this.phase = 'sustained';
      return this.targetRps;
    } else if (phaseDuration < 1200) {
      // Phase D: Recovery (15-20 min)
      this.phase = 'recovery';
      return this.baselineRps;
    } else {
      // Test complete
      this.phase = 'complete';
      return 0;
    }
  }

  async runLoadTest() {
    console.log('🚀 STARTING CONTROLLED LOAD TEST');
    console.log(`📊 Baseline: ${this.baselineRps} RPS → Target: ${this.targetRps} RPS (5×)`);
    console.log('⏱️  Phase Timeline: Warmup(2m) → Ramp(3m) → Sustained(10m) → Recovery(5m)');
    console.log('='.repeat(60));
    
    const endpoints = [
      { path: '/api/v1/posts', weight: 0.7 },
      { path: '/health', weight: 0.2 },
      { path: '/api/v1/posts/1', weight: 0.1 }
    ];
    
    let lastMetricsTime = this.startTime;
    let lastReportTime = this.startTime;
    
    while (this.phase !== 'complete') {
      const elapsed = performance.now() - this.startTime;
      this.currentRps = this.calculateTargetRps(elapsed);
      
      // Select endpoint based on weight
      const rand = Math.random();
      let endpoint = endpoints[0].path;
      let cumulative = 0;
      
      for (const ep of endpoints) {
        cumulative += ep.weight;
        if (rand <= cumulative) {
          endpoint = ep.path;
          break;
        }
      }
      
      // Make request
      await this.makeRequest(endpoint);
      
      // Calculate delay for target RPS
      const requestInterval = 1000 / this.currentRps; // ms between requests
      await new Promise(resolve => setTimeout(resolve, requestInterval));
      
      // Collect metrics every 30 seconds
      if (elapsed - lastMetricsTime > 30000) {
        await this.collectMetrics();
        lastMetricsTime = performance.now();
      }
      
      // Report every 60 seconds
      if (elapsed - lastReportTime > 60000) {
        this.reportProgress();
        lastReportTime = performance.now();
      }
    }
    
    this.reportFinalResults();
  }

  reportProgress() {
    const elapsed = (performance.now() - this.startTime) / 1000;
    const currentRps = this.requestCount / elapsed;
    const errorRate = (this.errorCount / this.requestCount) * 100;
    
    const sortedLatencies = this.latencies.slice(-100).sort((a, b) => a - b);
    const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)];
    const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
    const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];
    
    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    
    console.log(`📊 [${elapsed.toFixed(0)}s] ${this.phase.toUpperCase()} | RPS: ${currentRps.toFixed(2)} | Target: ${this.currentRps.toFixed(2)} | Errors: ${errorRate.toFixed(1)}% | p95: ${p95.toFixed(0)}ms`);
    
    if (latestMetrics) {
      console.log(`       Concurrency: ${latestMetrics.concurrency} | Pool: ${latestMetrics.poolActive}/${latestMetrics.poolTotal} | Event Loop: ${latestMetrics.eventLoopLag.toFixed(1)}ms | Circuit: ${latestMetrics.circuitBreaker}`);
    }
  }

  reportFinalResults() {
    const elapsed = (performance.now() - this.startTime) / 1000;
    const avgRps = this.requestCount / elapsed;
    const errorRate = (this.errorCount / this.requestCount) * 100;
    
    const sortedLatencies = this.latencies.sort((a, b) => a - b);
    const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)];
    const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
    const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];
    
    console.log('\n🎯 LOAD TEST COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total Duration: ${elapsed.toFixed(1)}s`);
    console.log(`Total Requests: ${this.requestCount}`);
    console.log(`Average RPS: ${avgRps.toFixed(2)}`);
    console.log(`Error Rate: ${errorRate.toFixed(2)}%`);
    console.log(`Latency - p50: ${p50.toFixed(0)}ms | p95: ${p95.toFixed(0)}ms | p99: ${p99.toFixed(0)}ms`);
    
    // Peak metrics analysis
    if (this.metricsHistory.length > 0) {
      const peakConcurrency = Math.max(...this.metricsHistory.map(m => m.concurrency));
      const peakPoolUsage = this.metricsHistory.map(m => m.poolTotal > 0 ? m.poolActive / m.poolTotal : 0);
      const maxPoolUsage = Math.max(...peakPoolUsage);
      const maxEventLoopLag = Math.max(...this.metricsHistory.map(m => m.eventLoopLag));
      
      console.log(`\n🔍 PEAK SYSTEM METRICS:`);
      console.log(`Max Concurrency: ${peakConcurrency}`);
      console.log(`Max Pool Usage: ${(maxPoolUsage * 100).toFixed(1)}%`);
      console.log(`Max Event Loop Lag: ${maxEventLoopLag.toFixed(1)}ms`);
      
      // Check if guardrails activated
      const circuitBreakerTrips = this.metricsHistory.filter(m => m.circuitBreaker > 0).length;
      const loadSheddingActivations = this.metricsHistory.filter(m => m.loadShedding > 0).length;
      
      console.log(`\n🛡️  RESILIENCE ACTIVATION:`);
      console.log(`Circuit Breaker Trips: ${circuitBreakerTrips > 0 ? 'YES' : 'NO'} (${circuitBreakerTrips} measurements)`);
      console.log(`Load Shedding Activations: ${loadSheddingActivations > 0 ? 'YES' : 'NO'} (${loadSheddingActivations} measurements)`);
    }
    
    console.log('='.repeat(60));
    
    return {
      duration: elapsed,
      avgRps,
      errorRate,
      latency: { p50, p95, p99 },
      metrics: this.metricsHistory
    };
  }
}

// Run the controlled load test
const loadTest = new ControlledLoadTest();
loadTest.runLoadTest().catch(console.error);
