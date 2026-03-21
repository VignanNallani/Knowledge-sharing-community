const { PrismaClient } = require('@prisma/client');
const searchService = require('../../src/services/search.service');

// Mock Prisma Client
jest.mock('@prisma/client');
jest.mock('../../src/utils/logger.util');

describe('SearchService', () => {
  let mockPrisma;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPrisma = {
      post: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn()
      },
      user: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn()
      },
      searchAnalytics: {
        create: jest.fn(),
        findMany: jest.fn()
      }
    };
    
    PrismaClient.mockImplementation(() => mockPrisma);
    
    // Clear cache
    searchService.clearCache();
  });

  describe('searchPosts', () => {
    it('should search posts with query and filters', async () => {
      const query = 'react';
      const filters = { skills: ['javascript'], sortBy: 'newest' };
      const pagination = { page: 1, limit: 10 };

      const mockPosts = [
        {
          id: 1,
          title: 'React Tutorial',
          content: 'Learn React basics',
          author: { id: 1, name: 'John', email: 'john@test.com', profileImage: null, skills: 'javascript' },
          tags: [{ tag: { name: 'javascript' } }],
          _count: { likes: 5, comments: 2 }
        }
      ];

      mockPrisma.post.findMany.mockResolvedValue(mockPosts);
      mockPrisma.post.count.mockResolvedValue(1);

      const result = await searchService.searchPosts(query, filters, pagination);

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          isActive: true,
          search_vector: {
            search: query,
            language: 'english'
          },
          tags: {
            some: {
              tag: {
                name: {
                  in: ['javascript']
                }
              }
            }
          }
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      });

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0].title).toBe('React Tutorial');
      expect(result.pagination.total).toBe(1);
    });

    it('should handle empty query', async () => {
      const filters = {};
      const pagination = { page: 1, limit: 10 };

      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(0);

      const result = await searchService.searchPosts('', filters, pagination);

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          isActive: true
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      });

      expect(result.posts).toEqual([]);
    });

    it('should cache results', async () => {
      const query = 'test';
      const filters = {};
      const pagination = { page: 1, limit: 10 };

      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(0);

      // First call
      await searchService.searchPosts(query, filters, pagination);
      
      // Second call should use cache
      await searchService.searchPosts(query, filters, pagination);

      // Should only call database once
      expect(mockPrisma.post.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('searchUsers', () => {
    it('should search users with filters', async () => {
      const query = 'john';
      const filters = { role: 'MENTOR', skills: ['react'] };
      const pagination = { page: 1, limit: 10 };

      const mockUsers = [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@test.com',
          role: 'MENTOR',
          bio: 'React expert',
          skills: 'react, javascript',
          profileImage: null,
          createdAt: new Date(),
          _count: { posts: 5, followers: 10, mentorshipsAsMentor: 3, mentorshipsAsMentee: 0 }
        }
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await searchService.searchUsers(query, filters, pagination);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          search_vector: {
            search: query,
            language: 'english'
          },
          role: 'MENTOR',
          skills: {
            contains: 'react'
          }
        },
        select: expect.any(Object),
        orderBy: expect.any(Object),
        skip: 0,
        take: 10
      });

      expect(result.users).toHaveLength(1);
      expect(result.users[0].name).toBe('John Doe');
    });

    it('should handle availability filter for mentors', async () => {
      const query = '';
      const filters = { role: 'MENTOR', availability: 'available' };
      const pagination = { page: 1, limit: 10 };

      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await searchService.searchUsers(query, filters, pagination);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          role: 'MENTOR',
          mentorAvailability: {
            some: {
              isActive: true
            }
          }
        },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      });
    });
  });

  describe('searchMentors', () => {
    it('should search mentors with rating filters', async () => {
      const query = 'react';
      const filters = { minRating: 4, maxRating: 5 };
      const pagination = { page: 1, limit: 10 };

      const mockMentors = [
        {
          id: 1,
          name: 'John Mentor',
          email: 'mentor@test.com',
          bio: 'React expert',
          skills: 'react, javascript',
          profileImage: null,
          createdAt: new Date(),
          mentorAvailability: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', timezone: 'UTC' }],
          mentorFeedback: [{ rating: 5 }, { rating: 4 }],
          _count: { mentorshipsAsMentor: 10, followers: 25 }
        }
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockMentors);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await searchService.searchMentors(query, filters, pagination);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          role: 'MENTOR',
          isActive: true,
          search_vector: {
            search: query,
            language: 'english'
          },
          mentorFeedback: {
            some: {
              rating: {
                gte: 4,
                lte: 5
              }
            }
          }
        },
        select: expect.any(Object),
        orderBy: expect.any(Object),
        skip: 0,
        take: 10
      });

      expect(result.mentors).toHaveLength(1);
      expect(result.mentors[0].averageRating).toBe(4.5);
    });
  });

  describe('getAutocompleteSuggestions', () => {
    it('should return empty array for short query', async () => {
      const result = await searchService.getAutocompleteSuggestions('a', 'posts', 5);
      expect(result).toEqual([]);
    });

    it('should return post suggestions', async () => {
      const query = 'react';
      const mockPosts = [
        { id: 1, title: 'React Tutorial', content: 'Learn React basics' }
      ];

      mockPrisma.post.findMany.mockResolvedValue(mockPosts);

      const result = await searchService.getAutocompleteSuggestions(query, 'posts', 5);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('post');
      expect(result[0].text).toBe('React Tutorial');
    });

    it('should cache suggestions', async () => {
      const query = 'test';
      mockPrisma.post.findMany.mockResolvedValue([]);

      // First call
      await searchService.getAutocompleteSuggestions(query, 'posts', 5);
      
      // Second call should use cache
      await searchService.getAutocompleteSuggestions(query, 'posts', 5);

      expect(mockPrisma.post.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTrendingPosts', () => {
    it('should return trending posts', async () => {
      const mockPosts = [
        {
          id: 1,
          title: 'Trending Post',
          content: 'Popular content',
          author: { id: 1, name: 'Author', profileImage: null },
          tags: [{ tag: { name: 'popular' } }],
          _count: { likes: 100, comments: 50 },
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        }
      ];

      mockPrisma.post.findMany.mockResolvedValue(mockPosts);

      const result = await searchService.getTrendingPosts(10);

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          isActive: true,
          createdAt: {
            gte: expect.any(Date)
          }
        },
        include: expect.any(Object),
        orderBy: [
          { likes: { _count: 'desc' } },
          { comments: { _count: 'desc' } },
          { createdAt: 'desc' }
        ],
        take: 10
      });

      expect(result).toHaveLength(1);
      expect(result[0].trendingScore).toBeGreaterThan(0);
    });

    it('should cache trending posts', async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);

      // First call
      await searchService.getTrendingPosts(10);
      
      // Second call should use cache
      await searchService.getTrendingPosts(10);

      expect(mockPrisma.post.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('getRecommendedMentors', () => {
    it('should return recommended mentors based on user skills', async () => {
      const userId = 1;
      const mockUser = { skills: 'react, javascript', role: 'USER' };
      const mockMentors = [
        {
          id: 2,
          name: 'Mentor John',
          bio: 'React expert',
          skills: 'react, nodejs',
          mentorFeedback: [{ rating: 5 }, { rating: 4 }],
          _count: { mentorshipsAsMentor: 20, followers: 50 }
        }
      ];

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.findMany.mockResolvedValue(mockMentors);

      const result = await searchService.getRecommendedMentors(userId, 10);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { skills: true, role: true }
      });

      expect(result).toHaveLength(1);
      expect(result[0].skillMatch).toBeGreaterThan(0);
      expect(result[0].recommendationScore).toBeGreaterThan(0);
    });

    it('should return empty array for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await searchService.getRecommendedMentors(999, 10);

      expect(result).toEqual([]);
    });
  });

  describe('calculateRelevanceScore', () => {
    it('should calculate relevance score for posts', () => {
      const post = {
        title: 'React Tutorial',
        content: 'Learn React basics',
        skills: 'react, javascript'
      };
      const query = 'react';

      const score = searchService.calculateRelevanceScore(post, query);

      expect(score).toBeGreaterThan(0);
    });

    it('should return 0 for empty query', () => {
      const post = { title: 'Test Post' };
      const query = '';

      const score = searchService.calculateRelevanceScore(post, query);

      expect(score).toBe(0);
    });
  });

  describe('calculateTrendingScore', () => {
    it('should calculate trending score', () => {
      const likes = 100;
      const comments = 50;
      const hoursSinceCreation = 2;

      const score = searchService.calculateTrendingScore(likes, comments, hoursSinceCreation);

      expect(score).toBeGreaterThan(0);
    });

    it('should apply time decay for older posts', () => {
      const likes = 100;
      const comments = 50;
      const recentHours = 2;
      const oldHours = 200;

      const recentScore = searchService.calculateTrendingScore(likes, comments, recentHours);
      const oldScore = searchService.calculateTrendingScore(likes, comments, oldHours);

      expect(recentScore).toBeGreaterThan(oldScore);
    });
  });

  describe('calculateSkillMatch', () => {
    it('should calculate skill match percentage', () => {
      const userSkills = 'react, javascript, nodejs';
      const mentorSkills = 'react, python, java';

      const match = searchService.calculateSkillMatch(userSkills, mentorSkills);

      expect(match).toBe(1/3); // 1 common skill out of 3 user skills
    });

    it('should return 0 for no skills', () => {
      const match = searchService.calculateSkillMatch('', 'react, javascript');

      expect(match).toBe(0);
    });
  });

  describe('highlightText', () => {
    it('should highlight matching text', () => {
      const text = 'React Tutorial';
      const query = 'React';

      const highlighted = searchService.highlightText(text, query);

      expect(highlighted).toBe('<mark>React</mark> Tutorial');
    });

    it('should return original text for empty query', () => {
      const text = 'React Tutorial';
      const query = '';

      const highlighted = searchService.highlightText(text, query);

      expect(highlighted).toBe(text);
    });
  });

  describe('cache management', () => {
    it('should clear cache with pattern', async () => {
      // Add some cached data
      mockPrisma.post.findMany.mockResolvedValue([]);
      await searchService.searchPosts('test', {}, { page: 1, limit: 10 });

      const statsBefore = searchService.getCacheStats();
      expect(statsBefore.keys).toBeGreaterThan(0);

      // Clear cache with pattern
      searchService.clearCache('posts');

      const statsAfter = searchService.getCacheStats();
      expect(statsAfter.keys).toBe(0);
    });

    it('should clear all cache', async () => {
      // Add some cached data
      mockPrisma.post.findMany.mockResolvedValue([]);
      await searchService.searchPosts('test', {}, { page: 1, limit: 10 });

      const statsBefore = searchService.getCacheStats();
      expect(statsBefore.keys).toBeGreaterThan(0);

      // Clear all cache
      searchService.clearCache();

      const statsAfter = searchService.getCacheStats();
      expect(statsAfter.keys).toBe(0);
    });

    it('should return cache statistics', () => {
      const stats = searchService.getCacheStats();

      expect(stats).toHaveProperty('keys');
      expect(stats).toHaveProperty('stats');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.post.findMany.mockRejectedValue(new Error('Database error'));

      await expect(searchService.searchPosts('test', {}, { page: 1, limit: 10 }))
        .rejects.toThrow('Failed to search posts: Database error');
    });

    it('should handle analytics logging errors without throwing', async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(0);
      mockPrisma.searchAnalytics.create.mockRejectedValue(new Error('Analytics error'));

      // Should not throw
      const result = await searchService.searchPosts('test', {}, { page: 1, limit: 10 });
      
      expect(result).toBeDefined();
      expect(result.posts).toEqual([]);
    });
  });
});
