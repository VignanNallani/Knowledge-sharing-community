#!/usr/bin/env node

// Simple Baseline Test - Establish Clean RPS
import { performance } from 'perf_hooks';

const API_BASE = 'http://localhost:4000';

class SimpleBaseline {
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
      
      return response.status;
    } catch (error) {
      this.errorCount++;
      return 0;
    }
  }

  async runBaseline() {
    console.log('🎯 Running simple baseline test...');
    
    // Test only reliable endpoints
    const endpoints = ['/health', '/api/v1/posts'];
    
    for (let i = 0; i < 30; i++) {
      for (const endpoint of endpoints) {
        await this.makeRequest(endpoint);
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms between requests
      }
    }
    
    this.reportStats();
  }

  reportStats() {
    const elapsed = (performance.now() - this.startTime) / 1000;
    const rps = this.requestCount / elapsed;
    const errorRate = (this.errorCount / this.requestCount) * 100;
    
    const sortedLatencies = this.latencies.sort((a, b) => a - b);
    const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)];
    const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
    const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];
    
    console.log('\n🎯 SIMPLE BASELINE RESULTS');
    console.log('='.repeat(40));
    console.log(`Duration: ${elapsed.toFixed(1)}s`);
    console.log(`Total Requests: ${this.requestCount}`);
    console.log(`Baseline RPS: ${rps.toFixed(2)}`);
    console.log(`Error Rate: ${errorRate.toFixed(2)}%`);
    console.log(`Latency - p50: ${p50.toFixed(0)}ms | p95: ${p95.toFixed(0)}ms | p99: ${p99.toFixed(0)}ms`);
    console.log('='.repeat(40));
    
    return { rps, errorRate, latency: { p50, p95, p99 } };
  }
}

const baseline = new SimpleBaseline();
baseline.runBaseline().catch(console.error);
