const axios = require('axios');

async function testAPI() {
  try {
    console.log('🚀 Starting API Load Testing...\n');
    
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('✅ Health check:', healthResponse.data);
    
    // Test 2: Database connectivity
    console.log('\n2️⃣ Testing database connectivity...');
    const dbResponse = await axios.get('http://localhost:3000/api/v1/test-db');
    console.log('✅ Database test:', dbResponse.data);
    
    // Test 3: Basic API endpoint
    console.log('\n3️⃣ Testing basic API endpoint...');
    const apiResponse = await axios.get('http://localhost:3000/api/v1/test');
    console.log('✅ API test:', apiResponse.data);
    
    console.log('\n🎯 All basic tests passed! Ready for load testing.');
    
    // Test 4: Load testing preparation
    console.log('\n4️⃣ Preparing for load testing...');
    console.log('📊 Test Configuration:');
    console.log('   - Target: http://localhost:3000/health');
    console.log('   - Concurrent connections: 50');
    console.log('   - Duration: 20 seconds');
    console.log('   - Expected: <500ms p95 latency');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    return false;
  }
}

testAPI().then(success => {
  if (success) {
    console.log('\n✅ Infrastructure is ready for load testing!');
    console.log('🚀 Next step: Run autocannon load test');
  } else {
    console.log('\n❌ Infrastructure not ready. Fix issues before load testing.');
  }
});
