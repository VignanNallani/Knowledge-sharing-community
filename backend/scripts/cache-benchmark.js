import { performance } from 'perf_hooks';
import { PrismaClient } from '@prisma/client';
import { cacheService } from '../src/cache/cache.service.js';
import userService from '../src/services/user.service.js';
import postService from '../src/services/post.service.js';
import mentorshipService from '../src/services/mentorship.service.js';

const prisma = new PrismaClient();

class CacheBenchmark {
  constructor() {
    this.results = {
      user: { withoutCache: [], withCache: [] },
      post: { withoutCache: [], withCache: [] },
      mentorship: { withoutCache: [], withCache: [] }
    };
  }

  async setupTestData() {
    console.log('🔧 Setting up test data...');
    
    // Create test users
    this.testUsers = [];
    for (let i = 0; i < 10; i++) {
      const user = await prisma.user.create({
        data: {
          email: `benchmark-${i}-${Date.now()}@example.com`,
          name: `Benchmark User ${i}`,
          role: i % 2 === 0 ? 'MENTOR' : 'USER',
          isActive: true,
          bio: `Test bio for user ${i}`,
          skills: [`skill${i}`, `skill${i + 1}`]
        }
      });
      this.testUsers.push(user);

      // Create mentor profiles for mentor users
      if (user.role === 'MENTOR') {
        await prisma.mentorProfile.create({
          data: {
            userId: user.id,
            professionalTitle: `Senior Mentor ${i}`,
            yearsOfExperience: 5 + i,
            verificationStatus: 'VERIFIED',
            industry: 'technology',
            hourlyRate: 50 + (i * 10),
            featuredMentor: i < 3
          }
        });
      }
    }

    // Create test posts
    this.testPosts = [];
    for (let i = 0; i < 20; i++) {
      const post = await prisma.post.create({
        data: {
          title: `Benchmark Post ${i}`,
          content: `This is benchmark post content ${i}`.repeat(10),
          authorId: this.testUsers[i % this.testUsers.length].id
        }
      });
      this.testPosts.push(post);
    }

    console.log(`✅ Created ${this.testUsers.length} users and ${this.testPosts.length} posts`);
  }

  async cleanupTestData() {
    console.log('🧹 Cleaning up test data...');
    
    await prisma.post.deleteMany({
      where: { authorId: { in: this.testUsers.map(u => u.id) } }
    });
    
    await prisma.mentorProfile.deleteMany({
      where: { userId: { in: this.testUsers.map(u => u.id) } }
    });
    
    await prisma.user.deleteMany({
      where: { id: { in: this.testUsers.map(u => u.id) } }
    });
    
    console.log('✅ Cleanup completed');
  }

  async benchmarkUserService(iterations = 100) {
    console.log(`\n👤 Benchmarking UserService (${iterations} iterations)...`);
    
    // Benchmark without cache (clear cache each time)
    for (let i = 0; i < iterations; i++) {
      await cacheService.clear();
      
      const start = performance.now();
      await userService.getMyProfile(this.testUsers[i % this.testUsers.length].id);
      const end = performance.now();
      
      this.results.user.withoutCache.push(end - start);
    }

    // Warm up cache
    for (const user of this.testUsers) {
      await userService.getMyProfile(user.id);
    }

    // Benchmark with cache
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await userService.getMyProfile(this.testUsers[i % this.testUsers.length].id);
      const end = performance.now();
      
      this.results.user.withCache.push(end - start);
    }
  }

  async benchmarkPostService(iterations = 100) {
    console.log(`\n📝 Benchmarking PostService (${iterations} iterations)...`);
    
    // Benchmark without cache
    for (let i = 0; i < iterations; i++) {
      await cacheService.clear();
      
      const start = performance.now();
      await postService.getPostById(this.testPosts[i % this.testPosts.length].id);
      const end = performance.now();
      
      this.results.post.withoutCache.push(end - start);
    }

    // Warm up cache
    for (const post of this.testPosts) {
      await postService.getPostById(post.id);
    }

    // Benchmark with cache
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await postService.getPostById(this.testPosts[i % this.testPosts.length].id);
      const end = performance.now();
      
      this.results.post.withCache.push(end - start);
    }
  }

  async benchmarkMentorshipService(iterations = 50) {
    console.log(`\n🎯 Benchmarking MentorshipService (${iterations} iterations)...`);
    
    // Benchmark without cache
    for (let i = 0; i < iterations; i++) {
      await cacheService.clear();
      
      const start = performance.now();
      await mentorshipService.discoverMentors({
        page: 1,
        limit: 10,
        industry: i % 2 === 0 ? 'technology' : undefined
      });
      const end = performance.now();
      
      this.results.mentorship.withoutCache.push(end - start);
    }

    // Warm up cache
    await mentorshipService.discoverMentors({ page: 1, limit: 10 });
    await mentorshipService.discoverMentors({ page: 1, limit: 10, industry: 'technology' });

    // Benchmark with cache
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await mentorshipService.discoverMentors({
        page: 1,
        limit: 10,
        industry: i % 2 === 0 ? 'technology' : undefined
      });
      const end = performance.now();
      
      this.results.mentorship.withCache.push(end - start);
    }
  }

  calculateStats(times) {
    const sorted = [...times].sort((a, b) => a - b);
    const sum = times.reduce((a, b) => a + b, 0);
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: sum / times.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  displayResults() {
    console.log('\n📊 BENCHMARK RESULTS');
    console.log('='.repeat(80));

    const services = ['user', 'post', 'mentorship'];
    
    services.forEach(service => {
      console.log(`\n${service.toUpperCase()} SERVICE:`);
      console.log('-'.repeat(40));
      
      const withoutCache = this.calculateStats(this.results[service].withoutCache);
      const withCache = this.calculateStats(this.results[service].withCache);
      
      console.log('Without Cache (ms):');
      console.log(`  Mean: ${withoutCache.mean.toFixed(2)}`);
      console.log(`  Median: ${withoutCache.median.toFixed(2)}`);
      console.log(`  P95: ${withoutCache.p95.toFixed(2)}`);
      console.log(`  Min: ${withoutCache.min.toFixed(2)}`);
      console.log(`  Max: ${withoutCache.max.toFixed(2)}`);
      
      console.log('\nWith Cache (ms):');
      console.log(`  Mean: ${withCache.mean.toFixed(2)}`);
      console.log(`  Median: ${withCache.median.toFixed(2)}`);
      console.log(`  P95: ${withCache.p95.toFixed(2)}`);
      console.log(`  Min: ${withCache.min.toFixed(2)}`);
      console.log(`  Max: ${withCache.max.toFixed(2)}`);
      
      const improvement = ((withoutCache.mean - withCache.mean) / withoutCache.mean) * 100;
      const speedup = withoutCache.mean / withCache.mean;
      
      console.log(`\n🚀 Performance Improvement:`);
      console.log(`  Speedup: ${speedup.toFixed(2)}x faster`);
      console.log(`  Improvement: ${improvement.toFixed(1)}%`);
      
      if (improvement >= 40) {
        console.log(`  ✅ Meets 40% improvement target`);
      } else {
        console.log(`  ❌ Does not meet 40% improvement target`);
      }
    });

    console.log('\n' + '='.repeat(80));
  }

  async run() {
    console.log('🚀 Starting Cache Performance Benchmark');
    
    try {
      await this.setupTestData();
      
      await this.benchmarkUserService(100);
      await this.benchmarkPostService(100);
      await this.benchmarkMentorshipService(50);
      
      this.displayResults();
      
    } catch (error) {
      console.error('❌ Benchmark failed:', error);
    } finally {
      await this.cleanupTestData();
    }
  }
}

// Run benchmark if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const benchmark = new CacheBenchmark();
  benchmark.run().catch(console.error);
}

export default CacheBenchmark;
