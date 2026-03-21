import { PrismaClient } from '@prisma/client';
import { cacheService } from '../src/cache/cache.service.js';
import userService from '../src/services/user.service.js';
import postService from '../src/services/post.service.js';
import mentorshipService from '../src/services/mentorship.service.js';

const prisma = new PrismaClient();

class CacheValidator {
  constructor() {
    this.queryCount = 0;
    this.setupQueryLogging();
  }

  setupQueryLogging() {
    // Enable Prisma query logging
    prisma.$use(async (params, next) => {
      this.queryCount++;
      console.log(`[DB QUERY #${this.queryCount}] ${params.model}.${params.action}`);
      return next(params);
    });
  }

  async resetQueryCount() {
    this.queryCount = 0;
  }

  async testUserServiceCache() {
    console.log('\n🧪 TESTING USER SERVICE CACHE');
    console.log('='.repeat(50));

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: `cache-test-${Date.now()}@example.com`,
        name: 'Cache Test User',
        role: 'USER',
        isActive: true,
        bio: 'Test bio for cache validation'
      }
    });

    try {
      // Test 1: First call should hit database
      console.log('\n📊 Test 1: First call (should hit DB)');
      this.resetQueryCount();
      const profile1 = await userService.getMyProfile(testUser.id);
      console.log(`✅ Profile retrieved, DB queries: ${this.queryCount}`);
      console.log(`Expected: 1, Actual: ${this.queryCount}, ${this.queryCount === 1 ? '✅ PASS' : '❌ FAIL'}`);

      // Test 2: Second call should hit cache
      console.log('\n📊 Test 2: Second call (should hit cache)');
      this.resetQueryCount();
      const profile2 = await userService.getMyProfile(testUser.id);
      console.log(`✅ Profile retrieved, DB queries: ${this.queryCount}`);
      console.log(`Expected: 0, Actual: ${this.queryCount}, ${this.queryCount === 0 ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Data consistency: ${JSON.stringify(profile1) === JSON.stringify(profile2) ? '✅ PASS' : '❌ FAIL'}`);

      // Test 3: Update should invalidate cache
      console.log('\n📊 Test 3: Update profile (should invalidate cache)');
      await userService.updateMyProfile(testUser.id, {
        name: 'Updated Cache Test User',
        bio: 'Updated bio'
      });
      console.log('✅ Profile updated');

      // Test 4: After update, should hit DB again
      console.log('\n📊 Test 4: Call after update (should hit DB again)');
      this.resetQueryCount();
      const profile3 = await userService.getMyProfile(testUser.id);
      console.log(`✅ Profile retrieved, DB queries: ${this.queryCount}`);
      console.log(`Expected: 1, Actual: ${this.queryCount}, ${this.queryCount === 1 ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Name updated: ${profile3.name === 'Updated Cache Test User' ? '✅ PASS' : '❌ FAIL'}`);

    } finally {
      // Cleanup
      await prisma.user.delete({ where: { id: testUser.id } });
      console.log('\n🧹 Test user cleaned up');
    }
  }

  async testPostServiceCache() {
    console.log('\n🧪 TESTING POST SERVICE CACHE');
    console.log('='.repeat(50));

    // Create test user and post
    const testUser = await prisma.user.create({
      data: {
        email: `post-cache-test-${Date.now()}@example.com`,
        name: 'Post Cache Test User',
        role: 'USER',
        isActive: true
      }
    });

    const testPost = await prisma.post.create({
      data: {
        title: 'Cache Test Post',
        content: 'This is a test post for cache validation',
        authorId: testUser.id
      }
    });

    try {
      // Test 1: First call should hit database
      console.log('\n📊 Test 1: First post call (should hit DB)');
      this.resetQueryCount();
      const post1 = await postService.getPostById(testPost.id);
      console.log(`✅ Post retrieved, DB queries: ${this.queryCount}`);
      console.log(`Expected: >0, Actual: ${this.queryCount}, ${this.queryCount > 0 ? '✅ PASS' : '❌ FAIL'}`);

      // Test 2: Second call should hit cache
      console.log('\n📊 Test 2: Second post call (should hit cache)');
      this.resetQueryCount();
      const post2 = await postService.getPostById(testPost.id);
      console.log(`✅ Post retrieved, DB queries: ${this.queryCount}`);
      console.log(`Expected: 0, Actual: ${this.queryCount}, ${this.queryCount === 0 ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Data consistency: ${JSON.stringify(post1) === JSON.stringify(post2) ? '✅ PASS' : '❌ FAIL'}`);

      // Test 3: Update should invalidate cache
      console.log('\n📊 Test 3: Update post (should invalidate cache)');
      await postService.updatePost(testPost.id, {
        title: 'Updated Cache Test Post'
      }, testUser.id, 'USER');
      console.log('✅ Post updated');

      // Test 4: After update, should hit DB again
      console.log('\n📊 Test 4: Call after update (should hit DB again)');
      this.resetQueryCount();
      const post3 = await postService.getPostById(testPost.id);
      console.log(`✅ Post retrieved, DB queries: ${this.queryCount}`);
      console.log(`Expected: >0, Actual: ${this.queryCount}, ${this.queryCount > 0 ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Title updated: ${post3.title === 'Updated Cache Test Post' ? '✅ PASS' : '❌ FAIL'}`);

    } finally {
      // Cleanup
      await prisma.post.delete({ where: { id: testPost.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
      console.log('\n🧹 Test post and user cleaned up');
    }
  }

  async testMentorshipCache() {
    console.log('\n🧪 TESTING MENTORSHIP SERVICE CACHE');
    console.log('='.repeat(50));

    // Create test mentor
    const testUser = await prisma.user.create({
      data: {
        email: `mentor-cache-test-${Date.now()}@example.com`,
        name: 'Mentor Cache Test',
        role: 'MENTOR',
        isActive: true
      }
    });

    const testMentor = await prisma.mentorProfile.create({
      data: {
        userId: testUser.id,
        professionalTitle: 'Cache Test Mentor',
        yearsOfExperience: 5,
        verificationStatus: 'VERIFIED',
        industry: 'technology',
        hourlyRate: 100
      }
    });

    try {
      // Test 1: First discovery call should hit database
      console.log('\n📊 Test 1: First mentor discovery (should hit DB)');
      this.resetQueryCount();
      const mentors1 = await mentorshipService.discoverMentors({
        page: 1,
        limit: 10
      });
      console.log(`✅ Mentors retrieved, DB queries: ${this.queryCount}`);
      console.log(`Expected: >0, Actual: ${this.queryCount}, ${this.queryCount > 0 ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Mentors found: ${mentors1.mentors.length}`);

      // Test 2: Second call should hit cache
      console.log('\n📊 Test 2: Second mentor discovery (should hit cache)');
      this.resetQueryCount();
      const mentors2 = await mentorshipService.discoverMentors({
        page: 1,
        limit: 10
      });
      console.log(`✅ Mentors retrieved, DB queries: ${this.queryCount}`);
      console.log(`Expected: 0, Actual: ${this.queryCount}, ${this.queryCount === 0 ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Data consistency: ${JSON.stringify(mentors1) === JSON.stringify(mentors2) ? '✅ PASS' : '❌ FAIL'}`);

      // Test 3: Different filters should create separate cache entries
      console.log('\n📊 Test 3: Different filters (should hit DB - new cache key)');
      this.resetQueryCount();
      const mentors3 = await mentorshipService.discoverMentors({
        page: 1,
        limit: 10,
        industry: 'technology'
      });
      console.log(`✅ Filtered mentors retrieved, DB queries: ${this.queryCount}`);
      console.log(`Expected: >0, Actual: ${this.queryCount}, ${this.queryCount > 0 ? '✅ PASS' : '❌ FAIL'}`);

      // Test 4: Same filter again should hit cache
      console.log('\n📊 Test 4: Same filter again (should hit cache)');
      this.resetQueryCount();
      const mentors4 = await mentorshipService.discoverMentors({
        page: 1,
        limit: 10,
        industry: 'technology'
      });
      console.log(`✅ Filtered mentors retrieved, DB queries: ${this.queryCount}`);
      console.log(`Expected: 0, Actual: ${this.queryCount}, ${this.queryCount === 0 ? '✅ PASS' : '❌ FAIL'}`);

    } finally {
      // Cleanup
      await prisma.mentorProfile.delete({ where: { id: testMentor.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
      console.log('\n🧹 Test mentor and user cleaned up');
    }
  }

  async testCachePerformance() {
    console.log('\n🚀 TESTING CACHE PERFORMANCE');
    console.log('='.repeat(50));

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: `perf-test-${Date.now()}@example.com`,
        name: 'Performance Test User',
        role: 'USER',
        isActive: true,
        bio: 'Performance test bio with some content to make it realistic'
      }
    });

    try {
      const iterations = 50;

      // Test without cache (clear each time)
      console.log(`\n📊 Testing ${iterations} calls WITHOUT cache...`);
      const timesWithoutCache = [];
      for (let i = 0; i < iterations; i++) {
        await cacheService.clear();
        const start = performance.now();
        await userService.getMyProfile(testUser.id);
        const end = performance.now();
        timesWithoutCache.push(end - start);
      }

      // Warm up cache
      await userService.getMyProfile(testUser.id);

      // Test with cache
      console.log(`\n📊 Testing ${iterations} calls WITH cache...`);
      const timesWithCache = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await userService.getMyProfile(testUser.id);
        const end = performance.now();
        timesWithCache.push(end - start);
      }

      // Calculate statistics
      const avgWithoutCache = timesWithoutCache.reduce((a, b) => a + b, 0) / timesWithoutCache.length;
      const avgWithCache = timesWithCache.reduce((a, b) => a + b, 0) / timesWithCache.length;
      const improvement = ((avgWithoutCache - avgWithCache) / avgWithoutCache) * 100;
      const speedup = avgWithoutCache / avgWithCache;

      console.log('\n📈 PERFORMANCE RESULTS:');
      console.log(`Average time without cache: ${avgWithoutCache.toFixed(2)}ms`);
      console.log(`Average time with cache: ${avgWithCache.toFixed(2)}ms`);
      console.log(`Speedup: ${speedup.toFixed(2)}x faster`);
      console.log(`Performance improvement: ${improvement.toFixed(1)}%`);
      
      if (improvement >= 40) {
        console.log('✅ Meets 40% improvement target');
      } else {
        console.log('❌ Does not meet 40% improvement target');
      }

    } finally {
      // Cleanup
      await prisma.user.delete({ where: { id: testUser.id } });
      console.log('\n🧹 Performance test user cleaned up');
    }
  }

  async runAllTests() {
    console.log('🔍 CACHE INTEGRATION VALIDATION');
    console.log('='.repeat(80));

    try {
      await this.testUserServiceCache();
      await this.testPostServiceCache();
      await this.testMentorshipCache();
      await this.testCachePerformance();

      console.log('\n✅ ALL CACHE VALIDATION TESTS COMPLETED');
      console.log('Check logs above for [CACHE HIT], [CACHE MISS], [CACHE SET], [CACHE INVALIDATE] messages');

    } catch (error) {
      console.error('❌ Cache validation failed:', error);
    } finally {
      await cacheService.clear();
      await prisma.$disconnect();
    }
  }
}

// Run validation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new CacheValidator();
  validator.runAllTests().catch(console.error);
}

export default CacheValidator;
