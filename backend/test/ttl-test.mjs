import { cacheService } from '../src/cache/cache.service.js';

console.log('🎯 TTL EXPIRATION TEST - CRITICAL');
console.log('REDIS_URL:', process.env.REDIS_URL);

async function testTTL() {
  try {
    console.log('\n📝 Setting key with 5s TTL...');
    const setResult = await cacheService.set('ttl-test', { hello: 'world' }, 5);
    console.log('✅ Set result:', setResult);
    
    console.log('\n📝 Checking immediately after set...');
    const immediateValue = await cacheService.get('ttl-test');
    console.log('Immediate value:', immediateValue);
    
    if (!immediateValue) {
      throw new Error('❌ CRITICAL: Key not found immediately after set!');
    }
    
    console.log('\n⏳ Waiting 6 seconds for TTL expiration...');
    
    setTimeout(async () => {
      console.log('\n📝 Checking after 6 seconds...');
      const expiredValue = await cacheService.get('ttl-test');
      console.log('After 6 seconds:', expiredValue);
      
      if (expiredValue === null) {
        console.log('✅ SUCCESS: TTL expiration working correctly!');
        process.exit(0);
      } else {
        console.log('❌ CRITICAL FAILURE: TTL is broken - key still exists!');
        console.log('Expected: null');
        console.log('Actual:', expiredValue);
        process.exit(1);
      }
    }, 6000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testTTL();
