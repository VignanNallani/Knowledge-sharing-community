import http from 'http';

console.log('🧪 Testing graceful shutdown timing...');

const startTime = Date.now();

// Test server response
const testServer = () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/health',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve(data.trim());
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
};

async function runTest() {
  try {
    // 1. Verify server is running
    console.log('1️⃣ Checking if server is running...');
    const response = await testServer();
    console.log('✅ Server response:', response);
    
    // 2. Send shutdown signal to current process
    console.log('2️⃣ Sending SIGTERM signal...');
    const shutdownTime = Date.now();
    
    // This will trigger the graceful shutdown in the server process
    // Note: In a real scenario, this would be sent from outside (Docker, Kubernetes, etc.)
    process.kill(process.pid, 'SIGTERM');
    
    // 3. Wait a bit and check if server is still responding
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const stillRunning = await testServer();
      console.log('❌ Server still responding after shutdown signal:', stillRunning);
    } catch (error) {
      if (error.message.includes('ECONNREFUSED')) {
        const shutdownDuration = Date.now() - shutdownTime;
        console.log('✅ Graceful shutdown successful!');
        console.log(`📊 Shutdown duration: ${shutdownDuration}ms`);
        console.log('🎯 Server stopped accepting connections');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

runTest();
