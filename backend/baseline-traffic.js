#!/usr/bin/env node

// Baseline Traffic Generator - Establish Current RPS
import { performance } from 'perf_hooks';

const API_BASE = 'http://localhost:4000';
const ENDPOINTS = [
  '/health',
  '/api/v1/posts',
  '/api/v1/posts/1',
  '/api/v1/posts/2',
  '/api/v1/posts/3'
];

class TrafficGenerator {
  constructor() {
    this.requestCount = 0;
    this.errorCount = 0;
    this.startTime = performance.now();
    this.latencies = [];
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
        latency: end - start
      };
    } catch (error) {
      this.errorCount++;
      return {
        status: 0,
        latency: performance.now() - start,
        error: error.message
      };
    }
  }

  async generateBaselineTraffic(durationMinutes = 5) {
    console.log(`🎯 Generating baseline traffic for ${durationMinutes} minutes...`);
    
    const endTime = this.startTime + (durationMinutes * 60 * 1000);
    let lastReport = this.startTime;
    
    while (performance.now() < endTime) {
      // Simulate realistic traffic patterns
      const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
      await this.makeRequest(endpoint);
      
      // Realistic user think time: 200ms - 2s between requests
      const thinkTime = 200 + Math.random() * 1800;
      await new Promise(resolve => setTimeout(resolve, thinkTime));
      
      // Report every 30 seconds
      if (performance.now() - lastReport > 30000) {
        this.reportStats();
        lastReport = performance.now();
      }
    }
    
    this.reportFinalStats();
  }

  reportStats() {
    const elapsed = (performance.now() - this.startTime) / 1000;
    const rps = this.requestCount / elapsed;
    const errorRate = (this.errorCount / this.requestCount) * 100;
    
    const sortedLatencies = this.latencies.sort((a, b) => a - b);
    const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)];
    const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
    const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];
    
    console.log(`📊 [${elapsed.toFixed(1)}s] RPS: ${rps.toFixed(2)} | Errors: ${errorRate.toFixed(1)}% | p50: ${p50.toFixed(0)}ms | p95: ${p95.toFixed(0)}ms | p99: ${p99.toFixed(0)}ms`);
  }

  reportFinalStats() {
    const elapsed = (performance.now() - this.startTime) / 1000;
    const rps = this.requestCount / elapsed;
    const errorRate = (this.errorCount / this.requestCount) * 100;
    
    const sortedLatencies = this.latencies.sort((a, b) => a - b);
    const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)];
    const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
    const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];
    
    console.log('\n🎯 BASELINE MEASUREMENT COMPLETE');
    console.log('='.repeat(50));
    console.log(`Duration: ${elapsed.toFixed(1)}s`);
    console.log(`Total Requests: ${this.requestCount}`);
    console.log(`Baseline RPS: ${rps.toFixed(2)}`);
    console.log(`Error Rate: ${errorRate.toFixed(2)}%`);
    console.log(`Latency - p50: ${p50.toFixed(0)}ms | p95: ${p95.toFixed(0)}ms | p99: ${p99.toFixed(0)}ms`);
    console.log('='.repeat(50));
    
    return {
      baselineRps: rps,
      errorRate,
      latency: { p50, p95, p99 }
    };
  }
}

// Run baseline measurement
const generator = new TrafficGenerator();
generator.generateBaselineTraffic(5).catch(console.error);
