#!/usr/bin/env node

// Single Request Profiling - Isolate Latency Components
import { performance } from 'perf_hooks';

const API_BASE = 'http://localhost:4000';

class SingleRequestProfiler {
  constructor() {
    this.results = [];
  }

  async profileSingleRequest(endpoint = '/api/v1/posts') {
    console.log(`🔍 PROFILING SINGLE REQUEST: ${endpoint}`);
    console.log('='.repeat(60));
    
    const profile = {
      endpoint,
      startTime: performance.now(),
      phases: {
        dns: { start: null, duration: null },
        tcp: { start: null, duration: null },
        ssl: { start: null, duration: null },
        serverProcessing: { start: null, duration: null },
        firstByte: { start: null, duration: null },
        download: { start: null, duration: null }
      }
    };

    try {
      // Make request with detailed timing
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const fetchStart = performance.now();
      profile.phases.dns.start = fetchStart;
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const fetchEnd = performance.now();
      profile.totalDuration = fetchEnd - fetchStart;
      
      // Parse response
      const responseStart = performance.now();
      const data = await response.json();
      const responseEnd = performance.now();
      
      profile.responseData = {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        dataSize: JSON.stringify(data).length,
        parseTime: responseEnd - responseStart
      };
      
      console.log(`✅ Request completed successfully`);
      console.log(`📊 Status: ${response.status}`);
      console.log(`📊 Total time: ${profile.totalDuration.toFixed(2)}ms`);
      console.log(`📊 Response size: ${profile.responseData.dataSize} bytes`);
      console.log(`📊 Parse time: ${profile.responseData.parseTime.toFixed(2)}ms`);
      
      // Analyze response structure
      if (data.data && Array.isArray(data.data)) {
        console.log(`📊 Records returned: ${data.data.length}`);
        if (data.data.length > 0) {
          console.log(`📊 Sample record keys: ${Object.keys(data.data[0]).join(', ')}`);
        }
      }
      
      return profile;
      
    } catch (error) {
      const errorEnd = performance.now();
      profile.totalDuration = errorEnd - profile.startTime;
      profile.error = {
        message: error.message,
        name: error.name,
        duration: errorEnd - profile.startTime
      };
      
      console.log(`❌ Request failed: ${error.message}`);
      console.log(`📊 Time to failure: ${profile.error.duration.toFixed(2)}ms`);
      
      return profile;
    }
  }

  async runMultipleProfiles(count = 3, endpoint = '/api/v1/posts') {
    console.log(`🎯 RUNNING ${count} SINGLE-REQUEST PROFILES`);
    console.log('='.repeat(60));
    
    const profiles = [];
    
    for (let i = 1; i <= count; i++) {
      console.log(`\n--- Profile ${i}/${count} ---`);
      const profile = await this.profileSingleRequest(endpoint);
      profiles.push(profile);
      
      // Wait between requests to avoid any caching effects
      if (i < count) {
        console.log(`⏳ Waiting 2 seconds before next request...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    this.analyzeProfiles(profiles);
    return profiles;
  }

  analyzeProfiles(profiles) {
    console.log('\n📊 PROFILE ANALYSIS');
    console.log('='.repeat(60));
    
    const successfulProfiles = profiles.filter(p => !p.error);
    const failedProfiles = profiles.filter(p => p.error);
    
    if (successfulProfiles.length === 0) {
      console.log('❌ All requests failed');
      failedProfiles.forEach((profile, i) => {
        console.log(`  Profile ${i + 1}: ${profile.error.message} (${profile.error.duration.toFixed(2)}ms)`);
      });
      return;
    }
    
    // Calculate statistics
    const durations = successfulProfiles.map(p => p.totalDuration);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    
    console.log(`✅ Successful requests: ${successfulProfiles.length}`);
    console.log(`❌ Failed requests: ${failedProfiles.length}`);
    console.log(`📊 Average duration: ${avgDuration.toFixed(2)}ms`);
    console.log(`📊 Min duration: ${minDuration.toFixed(2)}ms`);
    console.log(`📊 Max duration: ${maxDuration.toFixed(2)}ms`);
    console.log(`📊 Variance: ${(maxDuration - minDuration).toFixed(2)}ms`);
    
    // Analyze response consistency
    if (successfulProfiles.length > 1) {
      const dataSizes = successfulProfiles.map(p => p.responseData.dataSize);
      const avgSize = dataSizes.reduce((sum, s) => sum + s, 0) / dataSizes.length;
      const sizeVariance = Math.max(...dataSizes) - Math.min(...dataSizes);
      
      console.log(`📊 Average response size: ${avgSize.toFixed(0)} bytes`);
      console.log(`📊 Response size variance: ${sizeVariance.toFixed(0)} bytes`);
      
      if (sizeVariance > 100) {
        console.log(`⚠️  High response size variance suggests inconsistent data`);
      }
    }
    
    // Performance classification
    if (avgDuration < 500) {
      console.log(`🟢 EXCELLENT: Average latency under 500ms`);
    } else if (avgDuration < 1500) {
      console.log(`🟡 GOOD: Average latency under 1.5s`);
    } else if (avgDuration < 3000) {
      console.log(`🟠 FAIR: Average latency under 3s`);
    } else {
      console.log(`🔴 POOR: Average latency over 3s - needs optimization`);
    }
    
    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    
    if (avgDuration > 1000) {
      console.log(`  • Latency is high - investigate database queries`);
      console.log(`  • Check for missing indexes or N+1 queries`);
    }
    
    if (failedProfiles.length > 0) {
      console.log(`  • Some requests failed - check error logs`);
      console.log(`  • May indicate timeout or resource issues`);
    }
    
    const variance = maxDuration - minDuration;
    if (variance > avgDuration * 0.5) {
      console.log(`  • High variance suggests inconsistent performance`);
      console.log(`  • May indicate resource contention or caching issues`);
    }
    
    console.log('='.repeat(60));
  }
}

// Run single request profiling
const profiler = new SingleRequestProfiler();
profiler.runMultipleProfiles(3, '/api/v1/posts').catch(console.error);
