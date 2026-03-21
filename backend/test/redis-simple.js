import { cacheService } from '../src/cache/cache.service.js';

console.log('🔍 Simple Redis Connection Test');
console.log('REDIS_URL:', process.env.REDIS_URL);

async function testRedis() {
  try {
    // Test basic operations
    console.log('Testing SET...');
    const setResult = await cacheService.set('test-key', { message: 'Hello Redis!' }, 60);
    console.log('SET Result:', setResult);
    
    console.log('Testing GET...');
    const getResult = await cacheService.get('test-key');
    console.log('GET Result:', getResult);
    
    console.log('Testing DELETE...');
    const deleteResult = await cacheService.delete('test-key');
    console.log('DELETE Result:', deleteResult);
    
    console.log('✅ Redis is working!');
    
  } catch (error) {
    console.error('❌ Redis test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testRedis();
