const { PrismaClient } = require('@prisma/client');
const recommendationService = require('../../src/services/recommendation.service');

// Mock Prisma Client
jest.mock('@prisma/client');
jest.mock('../../src/utils/logger.util');
jest.mock('node-cache');

describe('RecommendationService', () => {
  let mockPrisma;
  let mockCache;
  let mockGlobalIO;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        create: jest.fn()
      },
      mentorshipSession: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      post: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      recommendationLogs: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        delete: jest.fn()
      },
      userRecommendationPreferences: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        create: jest.fn()
      },
      aiMetadata: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn()
      },
      contentSimilarity: {
        findMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      recommendationFeedback: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn()
      },
      recommendationCache: {
        create: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn()
      }
    };

    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      flushAll: jest.fn(),
      keys: jest.fn(),
      getStats: jest.fn(() => ({
        keys: 0,
        stats: {
          hits: 0,
          misses: 0,
          ksize: 0,
          v: 0
        }
      }))
    };

    mockGlobalIO = {
      emit: jest.fn(),
      to: jest.fn(() => mockGlobalIO),
      join: jest.fn(() => mockGlobalIO)
    };

    global.io = mockGlobalIO;
    PrismaClient.mockImplementation(() => mockPrisma);
    NodeCache.mockImplementation(() => mockCache);

    // Initialize algorithms
    recommendationService.initializeAlgorithms();
  });

  describe('generateRecommendations', () => {
    it('should generate mentor recommendations successfully', async () => {
      const userId = 1;
      const type = 'MENTOR';
      const limit = 5;
      const filters = { skills: ['JavaScript', 'React'] };

      const mockMentors = [
        {
          id: 1,
          name: 'John Doe',
          profileImage: 'avatar.jpg',
          bio: 'Expert JavaScript developer',
          skills: ['JavaScript', 'React', 'Node.js'],
          _count: { followers: 10, posts: 5, mentorshipsAsMentor: 20 },
          mentorshipSessionsAsMentor: []
        },
        {
          id: 2,
          name: 'Jane Smith',
          profileImage: 'avatar2.jpg',
          bio: 'React expert',
          skills: ['React', 'TypeScript', 'Vue.js'],
          _count: { followers: 15, posts: 8, mentorshipsAsMentor: 30 },
          mentorshipSessionsAsMentor: []
        }
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockMentors);
      mockPrisma.user.count.mockResolvedValue(2);

      const result = await recommendationService.generateRecommendations(userId, type, limit, filters);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('MENTOR');
      expect(result[0].recommendationScore).toBeDefined();
      expect(result[0].algorithm).toBe('COLLABORATIVE_FILTERING');
    });

    it('should generate session recommendations successfully', async () => {
      const userId = 1;
      const type = 'SESSION';
      const limit = 5;
      const filters = { skills: ['JavaScript'], rating: 4 };

      const mockSessions = [
        {
          id: 1,
          title: 'JavaScript Basics',
          description: 'Learn JavaScript fundamentals',
          mentor: { id: 1, name: 'John Doe' },
          mentee: { id: 2, name: 'Jane Smith' },
          feedback: { rating: 5 },
          duration: 60,
          price: 50,
          createdAt: new Date(),
          completedAt: new Date()
        }
      ];

      mockPrisma.mentorshipSession.findMany.mockResolvedValue(mockSessions);
      mockPrisma.mentorshipSession.count.mockResolvedValue(1);

      const result = await recommendationService.generateRecommendations(userId, type, limit, filters);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('SESSION');
      expect(result[0].recommendationScore).toBeDefined();
      expect(result[0].algorithm).toBe('CONTENT_BASED');
    });

    it('should generate post recommendations successfully', async () => {
      const userId = 1;
      const type = 'POST';
      const limit = 5;
      const filters = { categories: ['Tutorial', 'Guide'] };

      const mockPosts = [
        {
          id: 1,
          title: 'React Tutorial',
          content: 'Learn React basics',
          author: { id: 1, name: 'John Doe' },
          tags: ['react', 'tutorial', 'javascript'],
          _count: { likes: 10, comments: 5, bookmarks: 2 },
          createdAt: new Date(),
          aiMetadata: {
            trending_score: 0.8,
            quality_score: 0.9
          }
        }
      ];

      mockPrisma.post.findMany.mockResolvedValue(mockPosts);
      mockPrisma.post.count.mockResolvedValue(1);

      const result = await recommendationService.generateRecommendations(userId, type, limit, filters);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('POST');
      expect(result[0].recommendationScore).toBeDefined();
      expect(result[0].algorithm).toBe('CONTENT_BASED');
    });

    it('should generate hybrid recommendations successfully', async () => {
      const userId = 1;
      const type = 'HYBRID';
      const limit = 5;
      const filters = { skills: ['JavaScript'], categories: ['Tutorial'] };

      const mockContent = [
        {
          id: 1,
          title: 'React Tutorial',
          type: 'POST',
          recommendationScore: 0.8
        },
        {
          id: 2,
          title: 'JavaScript Basics',
          type: 'SESSION',
          recommendationScore: 0.7
        }
      ];

      jest.spyOn(recommendationService, 'generateMentorRecommendations').mockResolvedValue([mockContent[0]]);
      jest.spyOn(recommendationService, 'generatePostRecommendations').mockResolvedValue([mockContent[1]]);

      const result = await recommendationService.generateRecommendations(userId, type, limit, filters);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('POST');
      expect(result[1].type).toBe('SESSION');
      expect(result[0].recommendationScore).toBe(0.8);
      expect(result[1].recommendationScore).toBe(0.7);
    });

    it('should use cache for repeated requests', async () => {
      const userId = 1;
      const type = 'MENTOR';
      const limit = 5;
      const filters = {};

      const mockMentors = [{ id: 1, name: 'John Doe' }];
      mockPrisma.user.findMany.mockResolvedValue(mockMentors);

      // First call should hit database
      const result1 = await recommendationService.generateRecommendations(userId, type, limit, filters);
      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await recommendationService.generateRecommendations(userId, type, limit, filters);
      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('should handle empty results gracefully', async () => {
      const userId = 1;
      const type = 'MENTOR';
      const limit = 5;
      const filters = { skills: ['NonExistentSkill'] };

      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await recommendationService.generateRecommendations(userId, type, limit, filters);

      expect(result).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      const userId = 1;
      const type = 'MENTOR';
      const limit = 5;
      const filters = {};

      mockPrisma.user.findMany.mockRejectedValue(new Error('Database error'));

      await expect(recommendationService.generateRecommendations(userId, type, limit, filters))
        .rejects.toThrow('Database error');
    });
  });

  describe('generateMentorRecommendations', () => {
    it('should apply skill filtering correctly', async () => {
      const userId = 1;
      const limit = 10;
      const filters = { skills: ['JavaScript', 'React', 'Python'] };

      const mockMentors = [
        {
          id: 1,
          name: 'John Doe',
          skills: ['JavaScript', 'React', 'Node.js']
        },
        {
          id: 2,
          name: 'Jane Smith',
          skills: ['Python', 'Data Science', 'Machine Learning']
        },
        {
          id: 3,
          name: 'Bob Johnson',
          skills: ['Docker', 'AWS', 'DevOps']
        }
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockMentors);

      const result = await recommendationService.generateMentorRecommendations(userId, limit, filters);

      expect(result).toHaveLength(1);
      expect(result[0].skills).toContain('JavaScript');
      expect(result[0].skills).toContain('React');
    });

    it('should apply rating filtering correctly', async () => {
      const userId = 1;
      const limit = 10;
      const filters = { rating: 4.5 };

      const mockMentors = [
        {
          id: 1,
          name: 'John Doe',
          mentorshipSessionsAsMentor: [
            { feedback: { rating: 5 } },
            { feedback: { rating: 4 } },
            { feedback: { rating: 3 } }
          ]
        },
        {
          id: 2,
          name: 'Jane Smith',
          mentorshipSessionsAsMentor: [
            { feedback: { rating: 4.8 } },
            { feedback: { rating: 4.2 } },
            { feedback: { rating: 3.5 } }
          ]
        }
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockMentors);

      const result = await recommendationService.generateMentorRecommendations(userId, limit, filters);

      expect(result).toHaveLength(1);
      expect(result[0].feedback?.rating).toBeGreaterThanOrEqual(4.5);
    });

    it('should calculate recommendation scores correctly', async () => {
      const userId = 1;
      const limit = 10;
      const filters = {};

      const mockMentors = [
        {
          id: 1,
          _count: { followers: 100, posts: 50, mentorshipsAsMentor: 25 }
        },
        {
          id: 2,
          _count: { followers: 50, posts: 25, mentorshipsAsMentor: 10 }
        }
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockMentors);

      const result = await recommendationService.generateMentorRecommendations(userId, limit, filters);

      expect(result[0].recommendationScore).toBeGreaterThan(result[1].recommendationScore);
    });
  });

  describe('generateSessionRecommendations', () => {
    it('should apply skill filtering correctly', async () => {
      const userId = 1;
      const limit = 10;
      const filters = { skills: ['JavaScript', 'React'] };

      const mockSessions = [
        {
          id: 1,
          mentor: { skills: ['JavaScript', 'React', 'Node.js'] },
          title: 'JavaScript Workshop'
        },
        {
          id: 2,
          mentor: { skills: ['Python', 'Data Science'] },
          title: 'Python Workshop'
        }
      ];

      mockPrisma.mentorshipSession.findMany.mockResolvedValue(mockSessions);

      const result = await recommendationService.generateSessionRecommendations(userId, limit, filters);

      expect(result).toHaveLength(1);
      expect(result[0].mentor.skills).toContain('JavaScript');
      expect(result[0].mentor.skills).toContain('React');
    });

    it('should apply rating filtering correctly', async () => {
      const userId = 1;
      const limit = 10;
      const filters = { rating: 4.5 };

      const mockSessions = [
        {
          id: 1,
          feedback: { rating: 5 },
          title: 'Advanced JavaScript'
        },
        {
          id: 2,
          feedback: { rating: 4.8 },
          title: 'Intermediate React'
        },
        {
          id: 3,
          feedback: { rating: 3.5 },
          title: 'Basic Python'
        }
      ];

      mockPrisma.mentorshipSession.findMany.mockResolvedValue(mockSessions);

      const result = await recommendationService.generateSessionRecommendations(userId, limit, filters);

      expect(result).toHaveLength(2);
      expect(result[0].feedback.rating).toBeGreaterThanOrEqual(4.5);
      expect(result[1].feedback.rating).toBeGreaterThanOrEqual(4.5);
    });

    it('should calculate session scores correctly', async () => {
      const userId = 1;
      const limit = 10;
      const filters = {};

      const mockSessions = [
        {
          id: 1,
          feedback: { rating: 5 },
          duration: 60,
          mentor: { experience: 5 },
          price: 100
        },
        {
          id: 2,
          feedback: { rating: 4.5 },
          duration: 90,
          mentor: { experience: 3 },
          price: 150
        }
      ];

      mockPrisma.mentorshipSession.findMany.mockResolvedValue(mockSessions);

      const result = await recommendationService.generateSessionRecommendations(userId, limit, filters);

      expect(result[0].recommendationScore).toBeGreaterThan(result[1].recommendationScore);
    });
  });

  describe('generatePostRecommendations', () => {
    it('should apply category filtering correctly', async () => {
      const userId = 1;
      const limit = 10;
      const filters = { categories: ['Tutorial', 'Guide'] };

      const mockPosts = [
        {
          id: 1,
          categories: ['Tutorial', 'JavaScript'],
          title: 'React Tutorial'
        },
        {
          id: 2,
          categories: ['Guide', 'Python'],
          title: 'Python Guide'
        }
      ];

      mockPrisma.post.findMany.mockResolvedValue(mockPosts);

      const result = await recommendationService.generatePostRecommendations(userId, limit, filters);

      expect(result).toHaveLength(1);
      expect(result[0].categories).toContain('Tutorial');
    });

    it('should apply engagement filtering correctly', async () => {
      const userId = 1;
      const limit = 10;
      const filters = { minEngagement: 10 };

      const mockPosts = [
        {
          id: 1,
          _count: { likes: 15, comments: 5, bookmarks: 2 }
        },
        {
          id: 2,
          _count: { likes: 5, comments: 2, bookmarks: 1 }
        }
      ];

      mockPrisma.post.findMany.mockResolvedValue(mockPosts);

      const result = await recommendationService.generatePostRecommendations(userId, limit, filters);

      expect(result).toHaveLength(1);
      expect(result[0]._count.likes).toBeGreaterThanOrEqual(10);
    });

    it('should calculate post scores correctly', async () => {
      const userId = 1;
      const limit = 10;
      const filters = {};

      const mockPosts = [
        {
          id: 1,
          _count: { likes: 100, comments: 50, bookmarks: 10 },
          aiMetadata: { trending_score: 0.8, quality_score: 0.9 }
        },
        {
          id: 2,
          _count: { likes: 50, comments: 25, bookmarks: 5 },
          aiMetadata: { trending_score: 0.6, quality_score: 0.7 }
        }
      ];

      mockPrisma.post.findMany.mockResolvedValue(mockPosts);

      const result = await recommendationService.generatePostRecommendations(userId, limit, filters);

      expect(result[0].recommendationScore).toBeGreaterThan(result[1].recommendationScore);
    });
  });

  describe('calculateUserSimilarity', () => {
    it('should calculate user similarity correctly', async () => {
      const userId1 = 1;
      const userId2 = 2;

      const mockSimilarity = 0.8;

      mockPrisma.$queryRaw.mockResolvedValue([{ calculate_collaborative_similarity: mockSimilarity }]);

      const result = await recommendationService.calculateUserSimilarity(userId1, userId2);

      expect(result).toBe(mockSimilarity);
    });

    it('should handle database errors gracefully', async () => {
      const userId1 = 1;
      const userId2 = 2;

      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database error'));

      const result = await recommendationService.calculateUserSimilarity(userId1, userId2);

      expect(result).toBe(0);
    });
  });

  describe('calculateContentSimilarity', () => {
    it('should calculate content similarity correctly', async () => {
      const type1 = 'POST';
      const id1 = 1;
      const type2 = 'POST';
      const id2 = 2;

      const mockSimilarity = 0.75;

      mockPrisma.$queryRaw.mockResolvedValue([{ calculate_content_similarity: mockSimilarity }]);

      const result = await recommendationService.calculateContentSimilarity(type1, id1, type2, id2);

      expect(result).toBe(mockSimilarity);
    });

    it('should handle database errors gracefully', async () => {
      const type1 = 'POST';
      const id1 = 1;
      const type2 = 'POST';
      const id2 = 2;

      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database error'));

      const result = await recommendationService.calculateContentSimilarity(type1, id1, type2, id2);

      expect(result).toBe(0);
    });
  });

  describe('calculateRecommendationScore', () => {
    it('should calculate recommendation score correctly', () => {
      const similarity = 0.8;
      const followersCount = 100;
      const postsCount = 50;
      const mentorshipCount = 25;
      const algorithmWeight = 1.0;

      const score = recommendationService.calculateRecommendationScore(
        similarity,
        followersCount,
        postsCount,
        mentorshipCount,
        algorithmWeight
      );

      const expectedScore = (similarity + Math.log10(followersCount + 1) / Math.log10(100) * 0.2 +
        Math.log10(postsCount + 1) / Math.log10(100) * 0.2 +
        Math.log10(mentorshipCount + 1) / Math.log10(50) * 0.2) * algorithmWeight;

      expect(score).toBeCloseTo(expectedScore, 2);
    });

    it('should handle edge cases', () => {
      const similarity = 0;
      const followersCount = 0;
      const postsCount = 0;
      const mentorshipCount = 0;
      const algorithmWeight = 1.0;

      const score = recommendationService.calculateRecommendationScore(
        similarity,
        followersCount,
        postsCount,
        mentorshipCount,
        algorithmWeight
      );

      expect(score).toBe(0);
    });
  });

  describe('getUserPreferences', () => {
    it('should get user preferences', async () => {
      const userId = 1;

      const mockPreferences = {
        userId,
        skillWeights: { javascript: 1.0, react: 0.9 },
        categoryPreferences: { posts: true, sessions: true },
        autoRefresh: true,
        refreshFrequency: 3600
      };

      mockPrisma.userRecommendationPreferences.findUnique.mockResolvedValue(mockPreferences);

      const result = await recommendationService.getUserPreferences(userId);

      expect(result.userId).toBe(userId);
      expect(result.skillWeights).toEqual(mockPreferences.skillWeights);
      expect(result.categoryPreferences).toEqual(mockPreferences.categoryPreferences);
      expect(result.autoRefresh).toBe(true);
    });

    it('should create default preferences if none exist', async () => {
      const userId = 1;

      mockPrisma.userRecommendationPreferences.findUnique.mockResolvedValue(null);

      const result = await recommendationService.getUserPreferences(userId);

      expect(result.userId).toBe(userId);
      expect(result.skillWeights).toBeDefined();
      expect(result.categoryPreferences).toBeDefined();
      expect(result.autoRefresh).toBe(true);
    });

    it('should update user preferences', async () => {
      const userId = 1;
      const newPreferences = {
        skillWeights: { python: 0.8, docker: 0.9 },
        categoryPreferences: { posts: false, sessions: true },
        autoRefresh: false,
        refreshFrequency: 1800
      };

      mockPrisma.userRecommendationPreferences.upsert.mockResolvedValue(newPreferences);

      const result = await recommendationService.updateUserPreferences(userId, newPreferences);

      expect(result.skillWeights.python).toBe(0.8);
      expect(result.autoRefresh).toBe(false);
      expect(result.refreshFrequency).toBe(1800);
    });
  });

  describe('saveRecommendation', () => {
    it('should save recommendation successfully', async () => {
      const userId = 1;
      const type = 'MENTOR';
      const entityId = 1;
      const score = 0.8;
      const algorithmType = 'COLLABORATIVE_FILTERING';
      const metadata = { skills: ['JavaScript'] };

      const mockRecommendation = {
        id: 1,
        userId,
        recommendationType: type,
        entityId,
        recommendationScore: score,
        algorithmType,
        algorithmData: metadata,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      mockPrisma.recommendationLogs.create.mockResolvedValue(mockRecommendation);

      const result = await recommendationService.saveRecommendation(
        userId,
        type,
        entityId,
        score,
        algorithmType,
        metadata
      );

      expect(result.id).toBe(1);
      expect(result.userId).toBe(userId);
      expect(result.recommendationType).toBe(type);
      expect(result.entityId).toBe(entityId);
      expect(result.recommendationScore).toBe(score);
      expect(result.algorithmType).toBe(algorithmType);
    });

    it('should set expiration date', async () => {
      const userId = 1;
      const type = 'MENTOR';
      const entityId = 1;
      const score = 0.8;
      const algorithmType = 'COLLABORATIVE_FILTERING';
      const metadata = { skills: ['JavaScript'] };

      const mockRecommendation = {
        id: 1,
        userId,
        recommendationType: type,
        entityId,
        recommendationScore: score,
        algorithmType,
        algorithmData: metadata,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      mockPrisma.recommendationLogs.create.mockResolvedValue(mockRecommendation);

      const result = await recommendationService.saveRecommendation(
        userId,
        type,
        entityId,
        score,
        algorithmType,
        metadata
      );

      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(new Date().getTime());
    });

    it('should handle errors gracefully', async () => {
      const userId = 1;
      const type = 'MENTOR';
      const entityId = 1;
      const score = 0.8;
      const algorithmType = 'COLLABORATIVE_FILTERING';
      const metadata = { skills: ['JavaScript'] };

      mockPrisma.recommendationLogs.create.mockRejectedValue(new Error('Database error'));

      await expect(recommendationService.saveRecommendation(
        userId,
        type,
        entityId,
        score,
        algorithmType,
        metadata
      )).rejects.toThrow('Database error');
    });
  });

  describe('markRecommendationClicked', () => {
    it('should mark recommendation as clicked successfully', async () => {
      const userId = 1;
      const recommendationId = 1;

      const mockRecommendation = {
        id: recommendationId,
        userId,
        isClicked: false
      };

      mockPrisma.recommendationLogs.update.mockResolvedValue({
        where: { id: recommendationId, userId },
        data: {
          isClicked: true,
          clickedAt: new Date()
        }
      });

      const result = await recommendationService.markRecommendationClicked(recommendationId);

      expect(result.isClicked).toBe(true);
    });

    it('should update user preferences on click', async () => {
      const userId = 1;
      const recommendationId = 1;

      mockPrisma.recommendationLogs.update.mockResolvedValue({
        where: { id: recommendationId, userId },
        data: {
          isClicked: true,
          clickedAt: new Date()
        }
      });

      mockPrisma.userRecommendationPreferences.update.mockResolvedValue({
        where: { userId },
        data: {
          interactionHistory: {
            type: 'click',
            entityId: recommendationId,
            timestamp: new Date()
          }
        }
      });

      const result = await recommendationService.markRecommendationClicked(recommendationId);

      expect(result.isClicked).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const userId = 1;
      const recommendationId = 1;

      mockPrisma.recommendationLogs.update.mockRejectedValue(new Error('Database error'));

      await expect(recommendationService.markRecommendationClicked(recommendationId))
        .rejects.toThrow('Database error');
    });
  });

  describe('dismissRecommendation', () => {
    it('should dismiss recommendation successfully', async () => {
      const userId = 1;
      const recommendationId = 1;

      const mockRecommendation = {
        id: recommendationId,
        userId,
        isDismissed: false
      };

      mockPrisma.recommendationLogs.update.mockResolvedValue({
        where: { id: recommendationId, userId },
        data: {
          isDismissed: true,
          dismissedAt: new Date()
        }
      });

      const result = await recommendationService.dismissRecommendation(recommendationId);

      expect(result.isDismissed).toBe(true);
    });

    it('should update user preferences on dismiss', async () => {
      const userId = 1;
      const recommendationId = 1;

      mockPrisma.recommendationLogs.update.mockResolvedValue({
        where: { id: recommendationId, userId },
        data: {
          isDismissed: true,
          dismissedAt: new Date()
        }
      });

      mockPrisma.userRecommendationPreferences.update.mockResolvedValue({
        where: { userId },
        data: {
          feedbackHistory: {
            type: 'dismiss',
            entityId: recommendationId,
            timestamp: new Date()
          }
        }
      });

      const result = await recommendationService.dismissRecommendation(recommendationId);

      expect(result.isDismissed).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const userId = 1;
      const recommendationId = 1;

      mockPrisma.recommendationLogs.update.mockRejectedValue(new Error('Database error'));

      await expect(recommendationService.dismissRecommendation(recommendationId))
        .rejects.toThrow('Database error');
    });
  });

  describe('getRecommendationFeedback', () => {
    it('should get recommendation feedback successfully', async () => {
      const userId = 1;
      const recommendationId = 1;

      const mockFeedback = {
        id: 1,
        userId,
        feedbackType: 'LIKE',
        rating: 5,
        comment: 'Great recommendation!',
        createdAt: new Date()
      };

      mockPrisma.recommendationFeedback.findUnique.mockResolvedValue(mockFeedback);

      const result = await recommendationService.getRecommendationFeedback(recommendationId, userId);

      expect(result.id).toBe(1);
      expect(result.feedbackType).toBe('LIKE');
      expect(result.rating).toBe(5);
      expect(result.comment).toBe('Great recommendation!');
    });

    it('should return empty array if no feedback', async () => {
      const userId = 1;
      const recommendationId = 1;

      mockPrisma.recommendationFeedback.findUnique.mockResolvedValue(null);

      const result = await recommendationService.getRecommendationFeedback(recommendationId, userId);

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      const userId = 1;
      const recommendationId = 1;

      mockPrisma.recommendationFeedback.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(recommendationService.getRecommendationFeedback(recommendationId, userId))
        .rejects.toThrow('Database error');
    });
  });

  describe('addFeedback', () => {
    it('should add feedback successfully', async () => {
      const userId = 1;
      const recommendationId = 1;
      const feedbackType = 'LIKE';
      const rating = 5;
      const comment = 'Great recommendation!';

      const mockFeedback = {
        id: 1,
        userId,
        feedbackType,
        rating,
        comment,
        createdAt: new Date()
      };

      mockPrisma.recommendationFeedback.create.mockResolvedValue(mockFeedback);

      const result = await recommendationService.addFeedback(recommendationId, feedbackType, rating, comment);

      expect(result.id).toBe(1);
      expect(result.feedbackType).toBe('LIKE');
      expect(result.rating).toBe(5);
      expect(result.comment).toBe('Great recommendation!');
    });

    it('should handle invalid feedback type', async () => {
      const userId = 1;
      const recommendationId = 1;
      const feedbackType = 'INVALID';
      const rating = 5;
      const comment = 'Great recommendation!';

      await expect(recommendationService.addFeedback(recommendationId, feedbackType, rating, comment))
        .rejects.toThrow('Invalid feedback type');
    });

    it('should handle missing rating gracefully', async () => {
      const userId = 1;
      const recommendationId = 1;
      const feedbackType = 'LIKE';
      const comment = 'Great recommendation!';

      const result = await recommendationService.addFeedback(recommendationId, feedbackType, null, comment);

      expect(result.id).toBe(1);
    });
  });

  describe('getRecommendationHistory', () => {
    it('should get recommendation history successfully', async () => {
      const userId = 1;
      const filters = {
        limit: 10,
        offset: 0,
        type: 'MENTOR'
      };

      const mockHistory = [
        {
          id: 1,
          userId,
          recommendationType: 'MENTOR',
          entityId: 1,
          recommendationScore: 0.8,
          isClicked: true,
          createdAt: new Date('2024-01-15')
        },
        {
          id: 2,
          userId,
          recommendationType: 'MENTOR',
          entityId: 2,
          recommendationScore: 0.7,
          isClicked: false,
          createdAt: new Date('2024-01-16')
        }
      ];

      mockPrisma.recommendationLogs.findMany.mockResolvedValue(mockHistory);

      const result = await recommendationService.getRecommendationHistory(userId, filters);

      expect(result).toHaveLength(2);
      expect(result[0].recommendationType).toBe('MENTOR');
      expect(new Date(result[0].createdAt).getTime()).toBe(new Date('2024-01-15').getTime());
      expect(new Date(result[1].createdAt).getTime()).toBe(new Date('2024-01-16').getTime());
    });

    it('should handle errors gracefully', async () => {
      const userId = 1;
      const filters = {
        limit: 10
      };

      mockPrisma.recommendationLogs.findMany.mockRejectedValue(new Error('Database error'));

      await expect(recommendationService.getRecommendationHistory(userId, filters))
        .rejects.toThrow('Database error');
    });
  });

  describe('refreshRecommendationCache', () => {
    it('should refresh recommendation cache successfully', async () => {
      mockCache.flushAll.mockReturnValue(true);
      mockPrisma.recommendationCache.deleteMany.mockResolvedValue({ count: 5 });

      const result = await recommendationService.refreshRecommendationCache();

      expect(result.deleted).toBe(5);
      expect(mockCache.flushAll).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.recommendationCache.deleteMany.mockRejectedValue(new Error('Database error'));

      await expect(recommendationService.refreshRecommendationCache())
        .rejects.toThrow('Database error');
    });
  });

  describe('populateRecommendationCache', () => {
    it('should populate recommendation cache successfully', async () => {
      const populated = { count: 25 };

      mockPrisma.recommendationCache.deleteMany.mockResolvedValue(populated.count);
      mockPrisma.recommendationCache.populateCache.mockResolvedValue(populated);

      const result = await recommendationService.populateRecommendationCache();

      expect(result.populated).toBe(25);
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.recommendationCache.deleteMany.mockRejectedValue(new Error('Database error'));
      mockPrisma.recommendationCache.populateCache.mockRejectedValue(new Error('Database error'));

      await expect(recommendationService.populateRecommendationCache())
        .rejects.toThrow('Database error');
    });
  });

  describe('getTopMentors', () => {
    it('should get top mentors successfully', async () => {
      const timeRange = '30d';
      const limit = 10;

      const mockMentors = [
        {
          id: 1,
          name: 'John Doe',
          _count: { mentorshipsAsMentor: 50 },
          averageRating: 4.8,
          responseRate: 0.9
        },
        {
          id: 2,
          name: 'Jane Smith',
          _count: { mentorshipsAsMentor: 30 },
          averageRating: 4.6,
          responseRate: 0.85
        }
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockMentors);

      const result = await recommendationService.getTopMentors(timeRange, limit);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('John Doe');
      expect(result[1].name).toBe('Jane Smith');
    });

    it('should handle errors gracefully', async () => {
      const timeRange = '30d';
      const limit = 10;

      mockPrisma.user.findMany.mockRejectedValue(new Error('Database error'));

      await expect(recommendationService.getTopMentors(timeRange, limit))
        .rejects.toThrow('Database error');
    });
  });

  describe('getTopPosts', () => {
    it('should get top posts successfully', async () => {
      const timeRange = '30d';
      const limit = 10;

      const mockPosts = [
        {
          id: 1,
          title: 'Advanced React Patterns',
          _count: { likes: 150, comments: 45, bookmarks: 20 },
          author: { name: 'John Doe' }
        },
        {
          id: 2,
          title: 'JavaScript Best Practices',
          _count: { likes: 120, comments: 30, bookmarks: 15 },
          author: { name: 'Jane Smith' }
        }
      ];

      mockPrisma.post.findMany.mockResolvedValue(mockPosts);

      const result = await recommendationService.getTopPosts(timeRange, limit);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Advanced React Patterns');
      expect(result[1].title).toBe('JavaScript Best Practices');
    });

    it('should handle errors gracefully', async () => {
      const timeRange = '30d';
      const limit = 10;

      mockPrisma.post.findMany.mockRejectedValue(new Error('Database error'));

      await expect(recommendationService.getTopPosts(timeRange, limit))
        .rejects.toThrow('Database error');
    });
  });

  describe('getTrendingContent', () => {
    it('should get trending content successfully', async () => {
      const timeRange = '30d';
      const limit = 10;

      const mockContent = [
        {
          id: 1,
          type: 'POST',
          title: 'React 18 Features',
          trending_score: 0.9,
          engagement_rate: 0.15
        },
        {
          id: 2,
          type: 'SESSION',
          title: 'Node.js Masterclass',
          trending_score: 0.8,
          engagement_rate: 0.12
        }
      ];

      mockPrisma.post.findMany.mockResolvedValue([mockContent[0]]);
      mockPrisma.mentorshipSession.findMany.mockResolvedValue([mockContent[1]]);

      const result = await recommendationService.getTrendingContent(timeRange, limit);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('React 18 Features');
      expect(result[1].title).toBe('Node.js Masterclass');
    });

    it('should handle errors gracefully', async () => {
      const timeRange = '30d';
      const limit = 10;

      mockPrisma.post.findMany.mockRejectedValue(new Error('Database error'));

      await expect(recommendationService.getTrendingContent(timeRange, limit))
        .rejects.toThrow('Database error');
    });
  });
});
