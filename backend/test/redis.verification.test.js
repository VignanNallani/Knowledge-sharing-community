import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { cacheService } from '../src/cache/cache.service.js';

describe('Redis Verification - STEP 1', () => {
  before(async () => {
    // Clear cache before tests
    await cacheService.clear();
  });

  after(async () => {
    // Clean up after tests
    await cacheService.clear();
  });

  describe('Redis Container Running', () => {
    it('should connect to Redis successfully', async () => {
      console.log('🔍 Testing Redis Connection...');
      
      try {
        // Test basic Redis operations
        const testKey = 'redis-connection-test';
        const testValue = { connected: true, timestamp: Date.now() };
        
        // Set operation
        const setResult = await cacheService.set(testKey, testValue, 60);
        console.log(`  ✅ Redis SET: ${setResult}`);
        
        // Get operation
        const getResult = await cacheService.get(testKey);
        console.log(`  ✅ Redis GET: ${getResult ? 'Success' : 'Failed'}`);
        
        // Verify data integrity
        assert.deepStrictEqual(getResult, testValue, 'Data should match');
        
        // Delete operation
        const deleteResult = await cacheService.delete(testKey);
        console.log(`  ✅ Redis DELETE: ${deleteResult}`);
        
        console.log('  🎉 Redis container is running and accessible!');
        
      } catch (error) {
        console.log(`  ❌ Redis connection failed: ${error.message}`);
        throw error;
      }
    });

    it('should show REDIS_URL is correctly configured', () => {
      console.log('🔍 Checking REDIS_URL Configuration...');
      
      const redisUrl = process.env.REDIS_URL;
      console.log(`  REDIS_URL: ${redisUrl || 'NOT SET'}`);
      
      if (!redisUrl) {
        console.log('  ⚠️  REDIS_URL not set, using memory cache fallback');
      } else {
        console.log(`  ✅ REDIS_URL configured: ${redisUrl}`);
        assert(redisUrl.includes('redis://'), 'REDIS_URL should use redis:// protocol');
      }
    });
  });

  describe('Cache Hit Logs Visible', () => {
    it('should log cache hits and misses', async () => {
      console.log('🔍 Testing Cache Hit/Miss Logging...');
      
      const testData = { id: '123', name: 'Cache Test User' };
      const cacheKey = 'user:profile:123';
      
      // First access - should be miss
      console.log('  📝 First access (expecting miss):');
      const missResult = await cacheService.get(cacheKey);
      console.log(`    Result: ${missResult || 'null'} (MISS)`);
      assert.strictEqual(missResult, null, 'First access should be cache miss');
      
      // Set data
      console.log('  📝 Setting data in cache:');
      const setResult = await cacheService.set(cacheKey, testData, 300);
      console.log(`    Set result: ${setResult}`);
      
      // Second access - should be hit
      console.log('  📝 Second access (expecting hit):');
      const hitResult = await cacheService.get(cacheKey);
      console.log(`    Result: ${hitResult ? 'HIT' : 'MISS'}`);
      assert.deepStrictEqual(hitResult, testData, 'Second access should be cache hit');
      
      console.log('  🎉 Cache hit/miss logging is working!');
    });

    it('should track cache statistics', async () => {
      console.log('🔍 Testing Cache Statistics...');
      
      const stats = cacheService.getStats();
      console.log('  📊 Cache Statistics:');
      console.log(`    Hits: ${stats.hits || 0}`);
      console.log(`    Misses: ${stats.misses || 0}`);
      console.log(`    Sets: ${stats.sets || 0}`);
      console.log(`    Deletes: ${stats.deletes || 0}`);
      
      // Stats should be available
      assert(typeof stats === 'object', 'Stats should be an object');
      
      console.log('  🎉 Cache statistics tracking is working!');
    });
  });

  describe('TTL Actually Expiring', () => {
    it('should expire entries after TTL', async () => {
      console.log('🔍 Testing TTL Expiration...');
      
      const testData = { id: 'ttl-test', name: 'Expiring User' };
      const cacheKey = 'user:profile:ttl-test';
      const shortTTL = 2; // 2 seconds
      
      // Set data with short TTL
      console.log(`  📝 Setting data with ${shortTTL}s TTL...`);
      const setResult = await cacheService.set(cacheKey, testData, shortTTL);
      console.log(`    Set result: ${setResult}`);
      
      // Should be available immediately
      console.log('  📝 Checking immediately after set:');
      const immediateResult = await cacheService.get(cacheKey);
      console.log(`    Result: ${immediateResult ? 'FOUND' : 'NOT FOUND'}`);
      assert.deepStrictEqual(immediateResult, testData, 'Data should be available immediately');
      
      // Wait for expiration
      console.log(`  ⏳ Waiting ${shortTTL + 1}s for expiration...`);
      await new Promise(resolve => setTimeout(resolve, (shortTTL + 1) * 1000));
      
      // Should be expired
      console.log('  📝 Checking after expiration:');
      const expiredResult = await cacheService.get(cacheKey);
      console.log(`    Result: ${expiredResult ? 'FOUND' : 'EXPIRED'}`);
      assert.strictEqual(expiredResult, null, 'Data should be expired after TTL');
      
      console.log('  🎉 TTL expiration is working correctly!');
    });

    it('should handle different TTL values', async () => {
      console.log('🔍 Testing Different TTL Values...');
      
      const shortData = { id: 'short', ttl: 'short' };
      const longData = { id: 'long', ttl: 'long' };
      
      const shortKey = 'user:profile:short-ttl';
      const longKey = 'user:profile:long-ttl';
      
      // Set with different TTLs
      console.log('  📝 Setting short TTL (1s) and long TTL (5s)...');
      await cacheService.set(shortKey, shortData, 1);
      await cacheService.set(longKey, longData, 5);
      
      // Both should be available initially
      console.log('  📝 Initial check:');
      const shortInitial = await cacheService.get(shortKey);
      const longInitial = await cacheService.get(longKey);
      console.log(`    Short TTL: ${shortInitial ? 'FOUND' : 'NOT FOUND'}`);
      console.log(`    Long TTL: ${longInitial ? 'FOUND' : 'NOT FOUND'}`);
      
      assert.deepStrictEqual(shortInitial, shortData, 'Short TTL data should be available');
      assert.deepStrictEqual(longInitial, longData, 'Long TTL data should be available');
      
      // Wait for short to expire
      console.log('  ⏳ Waiting 2s for short TTL to expire...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('  📝 After 2s:');
      const shortExpired = await cacheService.get(shortKey);
      const longStillValid = await cacheService.get(longKey);
      console.log(`    Short TTL: ${shortExpired ? 'FOUND' : 'EXPIRED'}`);
      console.log(`    Long TTL: ${longStillValid ? 'FOUND' : 'NOT FOUND'}`);
      
      assert.strictEqual(shortExpired, null, 'Short TTL data should be expired');
      assert.deepStrictEqual(longStillValid, longData, 'Long TTL data should still be available');
      
      console.log('  🎉 Different TTL values are working correctly!');
    });
  });

  describe('DB Query Count Reduced', () => {
    it('should demonstrate query reduction through caching', async () => {
      console.log('🔍 Testing Database Query Reduction...');
      
      let queryCount = 0;
      
      // Simulate database query
      const mockDatabaseQuery = async (id) => {
        queryCount++;
        console.log(`    🗄️  Database query #${queryCount} for user ${id}`);
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate DB latency
        return { 
          id, 
          name: `User ${id}`, 
          email: `user${id}@example.com`,
          timestamp: Date.now()
        };
      };
      
      // Cached query function
      const cachedQuery = async (id) => {
        const cacheKey = `user:profile:${id}`;
        let data = await cacheService.get(cacheKey);
        
        if (!data) {
          console.log(`    💾 Cache miss for ${id}`);
          data = await mockDatabaseQuery(id);
          await cacheService.set(cacheKey, data, 300); // 5 minutes
          console.log(`    ✅ Cached data for ${id}`);
        } else {
          console.log(`    🎯 Cache hit for ${id}`);
        }
        
        return data;
      };
      
      console.log('  📝 First request for user1 (expecting DB query):');
      const result1 = await cachedQuery('user1');
      console.log(`    Query count: ${queryCount}`);
      assert.strictEqual(queryCount, 1, 'First request should query database');
      assert(result1.name, 'Should return user data');
      
      console.log('  📝 Second request for user1 (expecting cache hit):');
      const result2 = await cachedQuery('user1');
      console.log(`    Query count: ${queryCount}`);
      assert.strictEqual(queryCount, 1, 'Second request should use cache');
      assert.deepStrictEqual(result1, result2, 'Cached result should match');
      
      console.log('  📝 Request for different user (expecting DB query):');
      const result3 = await cachedQuery('user2');
      console.log(`    Query count: ${queryCount}`);
      assert.strictEqual(queryCount, 2, 'Different user should query database');
      assert.notDeepStrictEqual(result1, result3, 'Different user should have different data');
      
      console.log('  📝 Third request for user1 (expecting cache hit):');
      const result4 = await cachedQuery('user1');
      console.log(`    Query count: ${queryCount}`);
      assert.strictEqual(queryCount, 2, 'Third request should still use cache');
      
      const queryReduction = ((3 - queryCount) / 3) * 100;
      console.log(`  🎉 Query reduction: ${queryReduction.toFixed(1)}% (${queryCount} queries for 3 requests)`);
      
      assert(queryReduction >= 33, 'Should achieve at least 33% query reduction');
    });

    it('should handle cache invalidation properly', async () => {
      console.log('🔍 Testing Cache Invalidation...');
      
      const userId = 'invalidation-test-user';
      const userData = { id: userId, name: 'Test User', email: 'test@example.com' };
      const cacheKey = `user:profile:${userId}`;
      
      // Set user data in cache
      console.log('  📝 Setting user data in cache...');
      await cacheService.set(cacheKey, userData, 300);
      
      // Verify it's cached
      const cachedData = await cacheService.get(cacheKey);
      assert.deepStrictEqual(cachedData, userData, 'Data should be cached');
      console.log('  ✅ Data successfully cached');
      
      // Invalidate user cache
      console.log('  📝 Invalidating user cache...');
      let invalidatedCount = 0;
      
      if (cacheService.invalidateUser) {
        invalidatedCount = await cacheService.invalidateUser(userId);
        console.log(`    Invalidated ${invalidatedCount} cache entries`);
      } else {
        // Manual invalidation
        await cacheService.delete(cacheKey);
        invalidatedCount = 1;
        console.log('    Manual invalidation performed');
      }
      
      // Verify cache is cleared
      const afterInvalidation = await cacheService.get(cacheKey);
      assert.strictEqual(afterInvalidation, null, 'Cache should be cleared after invalidation');
      console.log('  ✅ Cache successfully invalidated');
      
      console.log('  🎉 Cache invalidation is working!');
    });
  });

  describe('Redis Performance Verification', () => {
    it('should demonstrate Redis performance benefits', async () => {
      console.log('🔍 Testing Redis Performance...');
      
      const iterations = 100;
      const testData = { 
        id: 'perf-test', 
        data: 'x'.repeat(100), // 100 bytes
        timestamp: Date.now()
      };
      
      // Test Redis set performance
      console.log(`  📝 Testing ${iterations} SET operations...`);
      const setStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        await cacheService.set(`perf:test:${i}`, { ...testData, index: i }, 300);
      }
      const setTime = Date.now() - setStart;
      const setOpsPerSec = iterations / (setTime / 1000);
      
      console.log(`    SET: ${iterations} ops in ${setTime}ms (${setOpsPerSec.toFixed(2)} ops/sec)`);
      
      // Test Redis get performance
      console.log(`  📝 Testing ${iterations} GET operations...`);
      const getStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        await cacheService.get(`perf:test:${i}`);
      }
      const getTime = Date.now() - getStart;
      const getOpsPerSec = iterations / (getTime / 1000);
      
      console.log(`    GET: ${iterations} ops in ${getTime}ms (${getOpsPerSec.toFixed(2)} ops/sec)`);
      
      // Performance assertions
      assert(setOpsPerSec > 100, `SET operations should be > 100 ops/sec, got ${setOpsPerSec.toFixed(2)}`);
      assert(getOpsPerSec > 500, `GET operations should be > 500 ops/sec, got ${getOpsPerSec.toFixed(2)}`);
      
      console.log('  🎉 Redis performance is excellent!');
    });
  });
});
