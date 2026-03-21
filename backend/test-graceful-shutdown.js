#!/usr/bin/env node

/**
 * Graceful Shutdown Test
 * Tests the graceful shutdown behavior and timing
 */

import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/health',
  method: 'GET',
  timeout: 5000
};

console.log('🧪 Testing graceful shutdown behavior...');

// Test 1: Check if server is responding
const req1 = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('✅ Server is responding:', data.trim());
    
    // Test 2: Initiate shutdown signal
    console.log('🔄 Sending SIGINT to test graceful shutdown...');
    
    // Send the signal
    process.kill(process.pid, 'SIGINT');
    
    // Test 3: Check if server stops gracefully
    setTimeout(() => {
      const req2 = http.request(options, (res) => {
        console.log('❌ Server still responding after shutdown signal');
        process.exit(1);
      });
      
      req2.on('error', (err) => {
        if (err.code === 'ECONNREFUSED') {
          console.log('✅ Server gracefully shut down (connection refused)');
          process.exit(0);
        } else {
          console.log('❌ Unexpected error:', err.message);
          process.exit(1);
        }
      });
      
      req2.setTimeout(2000, () => {
        console.log('⏰ Shutdown timeout - server may be hanging');
        req2.destroy();
        process.exit(1);
      });
      
      req2.end();
    }, 1000);
  });
});

req1.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    console.log('❌ Server is not running');
    process.exit(1);
  } else {
    console.log('❌ Connection error:', err.message);
    process.exit(1);
  }
});

req1.setTimeout(5000, () => {
  console.log('⏰ Initial request timeout');
  req1.destroy();
  process.exit(1);
});

req1.end();
