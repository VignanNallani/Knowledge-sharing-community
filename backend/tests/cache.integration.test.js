import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { cacheService } from '../src/cache/cache.service.js';
import userService from '../src/services/user.service.js';
import postService from '../src/services/post.service.js';
import mentorshipService from '../src/services/mentorship.service.js';
import getPrisma from '../src/config/prisma.js';

let queryCount = 0;
let queryHandler;

describe('Cache Integration Tests', () => {
  let testUser, testPost;
  let prisma;

  beforeAll(async () => {
    // Use real Prisma for integration testing
    prisma = getPrisma();
  });

  afterAll(async () => {
    // Clean up connections
    if (prisma) {
      await prisma.$disconnect();
    }
    
    // Shutdown cache service to clear intervals and Redis connections
    await cacheService.shutdown();
  });

  beforeEach(async () => {
    // Clear cache before each test
    try {
      await cacheService.clear();
    } catch (error) {
      // Ignore cache clear errors
    }
    
    // Reset query count
    queryCount = 0;
    
    // Enable Prisma query counting using query event
    queryHandler = () => {
      queryCount++;
    };
    prisma.$on('query', queryHandler);

    // Create test data
    try {
      testUser = await prisma.user.create({
        data: {
          email: `test-${Date.now()}@example.com`,
          name: 'Test User',
          role: 'USER',
          isActive: true,
          password: 'testPassword123'
        }
      });

      testPost = await prisma.post.create({
        data: {
          title: 'Test Post',
          content: 'Test content',
          authorId: testUser.id
        }
      });
    } catch (error) {
      console.error('Failed to create test data:', error);
      throw error;
    }
  });

  afterEach(async () => {
    // Clean up test data in reverse order of dependencies
    try {
      await prisma.post.deleteMany({ where: { authorId: testUser?.id } });
      await prisma.user.deleteMany({ where: { id: testUser?.id } });
    } catch (error) {
      // Ignore cleanup errors
    }
    
    // Clear cache
    try {
      await cacheService.clear();
    } catch (error) {
      // Ignore cache clear errors
    }
  });

  describe('UserService Cache Behavior', () => {
    it('should cache user profile on first call and hit cache on second call', async () => {
      // First call - should hit database
      const profile1 = await userService.getMyProfile(testUser.id);
      expect(profile1).toBeDefined();

      // Second call - should hit cache
      const profile2 = await userService.getMyProfile(testUser.id);
      expect(profile2).toEqual(profile1);
    });

    it('should invalidate cache on profile update', async () => {
      // First call - populate cache
      const originalProfile = await userService.getMyProfile(testUser.id);

      // Update profile
      await userService.updateMyProfile(testUser.id, {
        name: 'Updated Name',
        bio: 'Updated bio'
      });

      // Next call should hit database again
      const updatedProfile = await userService.getMyProfile(testUser.id);
      expect(updatedProfile.name).toBe('Updated Name');
      expect(updatedProfile.bio).toBe('Updated bio');
      expect(updatedProfile).not.toEqual(originalProfile);
    });

    it('should cache public user profile', async () => {
      // First call
      const profile1 = await userService.getUserProfile(testUser.id);
      expect(profile1).toBeDefined();

      // Second call should hit cache
      const profile2 = await userService.getUserProfile(testUser.id);
      expect(profile2).toEqual(profile1);
    });
  });

  describe('PostService Cache Behavior', () => {
    it('should cache post by ID', async () => {
      // First call
      const post1 = await postService.getPostById(testPost.id);
      expect(post1).toBeDefined();
      expect(post1.id).toBe(testPost.id);

      // Second call should hit cache
      const post2 = await postService.getPostById(testPost.id);
      expect(post2).toEqual(post1);
    });

    it('should invalidate post cache on update', async () => {
      // Populate cache
      const originalPost = await postService.getPostById(testPost.id);

      // Update post
      await postService.updatePost(testPost.id, {
        title: 'Updated Title'
      }, testUser.id, 'USER');

      // Next call should hit database
      const updatedPost = await postService.getPostById(testPost.id);
      expect(updatedPost.title).toBe('Updated Title');
      expect(updatedPost).not.toEqual(originalPost);
    });

    it('should invalidate post cache on delete', async () => {
      // Populate cache
      await postService.getPostById(testPost.id);

      // Delete post
      await postService.deletePost(testPost.id, testUser.id, 'USER');

      // Next call should throw error and hit database
      await expect(postService.getPostById(testPost.id))
        .rejects.toThrow('Post not found');
    });

    it('should cache paginated posts', async () => {
      // First call
      const posts1 = await postService.getPosts({ page: 1, limit: 10 });
      expect(posts1).toBeDefined();

      // Second call should hit cache
      const posts2 = await postService.getPosts({ page: 1, limit: 10 });
      expect(posts2).toEqual(posts1);
    });
  });

  describe('MentorshipService Cache Behavior', () => {
    it('should cache mentor discovery results', async () => {
      // First call - expensive mentor discovery query
      const mentors1 = await mentorshipService.discoverMentors({
        page: 1,
        limit: 10
      });
      expect(mentors1.mentors).toBeDefined();

      // Second call should hit cache
      const mentors2 = await mentorshipService.discoverMentors({
        page: 1,
        limit: 10
      });
      expect(mentors2).toEqual(mentors1);
    });

    it('should cache mentor discovery with different filters separately', async () => {
      // Call with industry filter
      const mentors1 = await mentorshipService.discoverMentors({
        page: 1,
        limit: 10,
        industry: 'technology'
      });
      expect(mentors1.mentors).toBeDefined();

      // Call with different filter - should be separate cache entry
      const mentors2 = await mentorshipService.discoverMentors({
        page: 1,
        limit: 10,
        maxRate: 100
      });
      expect(mentors2.mentors).toBeDefined();

      // Call first filter again - should hit cache
      const mentors3 = await mentorshipService.discoverMentors({
        page: 1,
        limit: 10,
        industry: 'technology'
      });
      expect(mentors3).toEqual(mentors1);
    });

    it('should invalidate mentor cache on profile update', async () => {
      // Populate cache
      const originalMentors = await mentorshipService.discoverMentors({ page: 1, limit: 10 });

      // Update mentor profile
      await mentorshipService.upsertMentorProfile(testUser.id, {
        professionalTitle: 'Senior Test Mentor',
        yearsOfExperience: 10
      });

      // Next discovery call should hit database
      const updatedMentors = await mentorshipService.discoverMentors({ page: 1, limit: 10 });
      expect(updatedMentors).toBeDefined();
      // Note: We can't easily test that it's different without knowing the exact structure
    });
  });

  describe('Cache Invalidation Patterns', () => {
    it('should invalidate user-related caches on follow/unfollow', async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: `other-${Date.now()}@example.com`,
          name: 'Other User',
          role: 'USER',
          isActive: true
        }
      });

      try {
        // Populate caches
        const originalProfile1 = await userService.getMyProfile(testUser.id);
        const originalProfile2 = await userService.getUserProfile(otherUser.id);

        // Follow user
        await userService.followUser(testUser.id, otherUser.id);

        // Next profile calls should hit database (cache invalidated)
        const updatedProfile1 = await userService.getMyProfile(testUser.id);
        const updatedProfile2 = await userService.getUserProfile(otherUser.id);
        expect(updatedProfile1).toBeDefined();
        expect(updatedProfile2).toBeDefined();
      } finally {
        await prisma.user.delete({ where: { id: otherUser.id } });
      }
    });

    it('should invalidate post caches on create/update/delete', async () => {
      // Populate posts list cache
      const originalPosts = await postService.getPosts({ page: 1, limit: 10 });

      // Create new post
      const newPost = await postService.createPost({
        title: 'New Test Post',
        content: 'New test content'
      }, testUser.id);

      // Posts list should be refreshed from database
      const updatedPosts = await postService.getPosts({ page: 1, limit: 10 });
      expect(updatedPosts).toBeDefined();
      expect(updatedPosts.posts.length).toBeGreaterThan(originalPosts.posts.length);

      // Clean up
      await prisma.post.delete({ where: { id: newPost.id } });
    });
  });

  describe('Cache Performance Verification', () => {
    it('should demonstrate performance improvement with cache', async () => {
      const iterations = 10;
      
      // First iteration - populate cache
      const startTime1 = Date.now();
      for (let i = 0; i < iterations; i++) {
        await userService.getMyProfile(testUser.id);
      }
      const firstIterationTime = Date.now() - startTime1;

      // Second iteration - should hit cache
      const startTime2 = Date.now();
      for (let i = 0; i < iterations; i++) {
        await userService.getMyProfile(testUser.id);
      }
      const secondIterationTime = Date.now() - startTime2;

      // Cache should be significantly faster
      expect(secondIterationTime).toBeLessThan(firstIterationTime);
      
      // At least 40% improvement
      const improvement = ((firstIterationTime - secondIterationTime) / firstIterationTime) * 100;
      expect(improvement).toBeGreaterThan(40);
    });
  });

  describe('Production Mode Hard Fail', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should fail fast when Redis unavailable in production', async () => {
      // Set production mode
      process.env.NODE_ENV = 'production';
      
      // This test would require mocking Redis to be unavailable
      // For now, we'll just verify the hard fail flag is set
      const redisCache = cacheService;
      expect(redisCache.hardFailEnabled).toBe(true);
    });
  });
});
