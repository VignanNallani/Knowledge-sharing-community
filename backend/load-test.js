#!/usr/bin/env node

import autocannon from 'autocannon';

async function runLoadTest() {
  console.log('🚀 Starting Load Test for Knowledge Sharing API\n');
  
  // Test configurations
  const tests = [
    {
      name: 'Light Load (10 concurrent)',
      connections: 10,
      duration: 10,
      title: 'Light Load Test'
    },
    {
      name: 'Medium Load (50 concurrent)', 
      connections: 50,
      duration: 15,
      title: 'Medium Load Test'
    },
    {
      name: 'Heavy Load (100 concurrent)',
      connections: 100,
      duration: 20,
      title: 'Heavy Load Test'
    }
  ];

  const baseUrl = 'http://localhost:3000';
  
  for (const test of tests) {
    console.log(`\n📊 ${test.title}`);
    console.log(`Connections: ${test.connections}`);
    console.log(`Duration: ${test.duration}s`);
    console.log('─'.repeat(50));
    
    const result = await autocannon({
      url: `${baseUrl}/api/v1/posts`,
      connections: test.connections,
      duration: test.duration,
      headers: {
        'Content-Type': 'application/json'
      },
      // Add some variety to requests
      requests: [
        {
          method: 'GET',
          path: '/api/v1/posts'
        },
        {
          method: 'GET', 
          path: '/api/v1/posts?page=1&limit=5'
        },
        {
          method: 'GET',
          path: '/api/v1/posts?page=2&limit=10'
        }
      ]
    });

    // Display results
    console.log(`✅ Completed: ${test.name}`);
    console.log(`📈 Requests/sec: ${result.requests.average.toFixed(2)}`);
    console.log(`⚡ Latency (avg): ${result.latency.average.toFixed(2)}ms`);
    console.log(`⚡ Latency (p95): ${result.latency.p95.toFixed(2)}ms`);
    console.log(`⚡ Latency (p99): ${result.latency.p99.toFixed(2)}ms`);
    console.log(`📦 Throughput: ${(result.throughput.average / 1024).toFixed(2)} KB/sec`);
    console.log(`❌ Errors: ${result.errors}`);
    console.log(`🔥 Timeouts: ${result.timeouts}`);
    
    // Performance analysis
    const avgLatency = result.latency.average;
    const p95Latency = result.latency.p95;
    const errorRate = (result.errors / result.requests.total) * 100;
    
    console.log('\n📊 Performance Analysis:');
    if (avgLatency < 100) {
      console.log('✅ Average latency: EXCELLENT (<100ms)');
    } else if (avgLatency < 500) {
      console.log('✅ Average latency: GOOD (<500ms)');
    } else if (avgLatency < 1000) {
      console.log('⚠️  Average latency: ACCEPTABLE (<1s)');
    } else {
      console.log('❌ Average latency: POOR (>1s)');
    }
    
    if (p95Latency < 200) {
      console.log('✅ P95 latency: EXCELLENT (<200ms)');
    } else if (p95Latency < 800) {
      console.log('✅ P95 latency: GOOD (<800ms)');
    } else if (p95Latency < 1500) {
      console.log('⚠️  P95 latency: ACCEPTABLE (<1.5s)');
    } else {
      console.log('❌ P95 latency: POOR (>1.5s)');
    }
    
    if (errorRate === 0) {
      console.log('✅ Error rate: PERFECT (0%)');
    } else if (errorRate < 1) {
      console.log('✅ Error rate: EXCELLENT (<1%)');
    } else if (errorRate < 5) {
      console.log('⚠️  Error rate: ACCEPTABLE (<5%)');
    } else {
      console.log('❌ Error rate: POOR (>5%)');
    }
    
    // Wait between tests
    if (test !== tests[tests.length - 1]) {
      console.log('\n⏳ Waiting 10 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  console.log('\n🎯 Load Testing Complete!');
  console.log('\n💡 Recommendations:');
  console.log('- Monitor memory usage during high load');
  console.log('- Check database connection pool utilization');
  console.log('- Verify cache hit rates under load');
  console.log('- Test with Redis enabled for comparison');
}

// Health check before starting
async function healthCheck() {
  try {
    const response = await fetch('http://localhost:3000/health');
    if (response.ok) {
      console.log('✅ API is healthy, starting load tests...\n');
      return true;
    }
  } catch (error) {
    console.log('❌ API health check failed:', error.message);
    console.log('Please ensure the API is running on http://localhost:3000');
    return false;
  }
}

// Main execution
async function main() {
  const isHealthy = await healthCheck();
  if (!isHealthy) {
    process.exit(1);
  }
  
  try {
    await runLoadTest();
  } catch (error) {
    console.error('❌ Load test failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Load test interrupted by user');
  process.exit(0);
});

main().catch(console.error);
