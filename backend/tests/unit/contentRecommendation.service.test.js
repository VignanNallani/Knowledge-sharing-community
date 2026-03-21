const { PrismaClient } = require('@prisma/client');
const contentRecommendationService = require('../../src/services/contentRecommendation.service');

jest.mock('@prisma/client');
jest.mock('../../src/utils/logger.util');
jest.mock('node-cache');

describe('ContentRecommendationService', () => {
  let mockPrisma;
  let mockCache;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPrisma = {
      user: { findUnique: jest.fn(), findMany: jest.fn() },
      contentRecommendation: { 
        create: jest.fn(), 
        findMany: jest.fn(), 
        update: jest.fn(), 
        deleteMany: jest.fn() 
      },
      post: { findMany: jest.fn() },
      mentorshipSession: { findMany: jest.fn() }
    };

    PrismaClient.mockImplementation(() => mockPrisma);
    mockCache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    
    jest.doMock('node-cache', () => jest.fn().mockImplementation(() => mockCache));
    jest.resetModules();
  });

  describe('generateContentRecommendations', () => {
    it('should generate recommendations successfully', async () => {
      const userId = 1;
      const options = { contentTypes: ['COURSE'], limit: 10 };

      const mockUserData = { user: { id: 1, name: 'Test User' } };
      const mockGaps = [{ id: 'gap-1', skillName: 'JavaScript' }];
      const mockSkills = [{ id: 'skill-1', skillName: 'JavaScript' }];

      mockPrisma.user.findUnique.mockResolvedValue(mockUserData.user);
      jest.spyOn(contentRecommendationService, 'getUserRecommendationContext').mockResolvedValue(mockUserData);
      jest.spyOn(contentRecommendationService, 'getRelevantSkillGaps').mockResolvedValue(mockGaps);
      jest.spyOn(contentRecommendationService, 'getUserSkills').mockResolvedValue(mockSkills);

      const result = await contentRecommendationService.generateContentRecommendations(userId, options);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.metadata).toBeDefined();
    });

    it('should handle user not found', async () => {
      const userId = 999;
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(contentRecommendationService.generateContentRecommendations(userId, {}))
        .rejects.toThrow('Failed to get user recommendation context');
    });

    it('should generate hybrid recommendations', async () => {
      const userId = 1;
      const options = { algorithm: 'HYBRID', includeTrending: true };

      const mockCollaborative = [{ id: 'rec-1', recommendationScore: 0.8 }];
      const mockContentBased = [{ id: 'rec-2', recommendationScore: 0.7 }];
      const mockTrending = [{ id: 'rec-3', recommendationScore: 0.6 }];

      jest.spyOn(contentRecommendationService, 'generateCollaborativeRecommendations').mockResolvedValue(mockCollaborative);
      jest.spyOn(contentRecommendationService, 'generateContentBasedRecommendations').mockResolvedValue(mockContentBased);
      jest.spyOn(contentRecommendationService, 'generateTrendingRecommendations').mockResolvedValue(mockTrending);

      const result = await contentRecommendationService.generateContentRecommendations(userId, options);

      expect(result.recommendations).toHaveLength(3);
      expect(result.metadata.algorithmUsed).toBe('HYBRID');
    });
  });

  describe('getUserRecommendations', () => {
    it('should get user recommendations successfully', async () => {
      const userId = 1;
      const options = { status: 'ACTIVE', limit: 10 };

      const mockRecommendations = [
        {
          id: 'rec-1',
          userId,
          contentType: 'COURSE',
          recommendationScore: 0.8,
          status: 'ACTIVE'
        }
      ];

      mockPrisma.contentRecommendation.findMany.mockResolvedValue(mockRecommendations);

      const result = await contentRecommendationService.getUserRecommendations(userId, options);

      expect(result).toHaveLength(1);
      expect(result[0].contentType).toBe('COURSE');
      expect(result[0].status).toBe('ACTIVE');
    });

    it('should filter by content type', async () => {
      const userId = 1;
      const options = { contentType: 'COURSE' };

      const mockRecommendations = [
        { id: 'rec-1', contentType: 'COURSE' },
        { id: 'rec-2', contentType: 'TUTORIAL' }
      ];

      mockPrisma.contentRecommendation.findMany.mockResolvedValue(mockRecommendations);

      const result = await contentRecommendationService.getUserRecommendations(userId, options);

      expect(result).toHaveLength(1);
      expect(result[0].contentType).toBe('COURSE');
    });
  });

  describe('updateRecommendationStatus', () => {
    it('should update status successfully', async () => {
      const userId = 1;
      const recommendationId = 'rec-1';
      const status = 'COMPLETED';
      const metadata = { rating: 5, feedback: 'Great!' };

      const mockUpdated = {
        id: recommendationId,
        status,
        rating: 5,
        feedback: 'Great!'
      };

      mockPrisma.contentRecommendation.update.mockResolvedValue(mockUpdated);

      const result = await contentRecommendationService.updateRecommendationStatus(userId, recommendationId, status, metadata);

      expect(result.status).toBe('COMPLETED');
      expect(result.rating).toBe(5);
      expect(result.feedback).toBe('Great!');
    });

    it('should handle invalid recommendation', async () => {
      const userId = 1;
      const recommendationId = 'invalid-rec';
      const status = 'COMPLETED';

      await expect(contentRecommendationService.updateRecommendationStatus(userId, recommendationId, status))
        .rejects.toThrow('Failed to update recommendation status');
    });
  });

  describe('getRecommendationAnalytics', () => {
    it('should get analytics successfully', async () => {
      const userId = 1;
      const timeRange = '30d';

      const mockRecommendations = [
        { id: 'rec-1', contentType: 'COURSE', status: 'COMPLETED', rating: 5 },
        { id: 'rec-2', contentType: 'TUTORIAL', status: 'VIEWED', rating: 4 }
      ];

      mockPrisma.contentRecommendation.findMany.mockResolvedValue(mockRecommendations);

      const result = await contentRecommendationService.getRecommendationAnalytics(userId, timeRange);

      expect(result.totalRecommendations).toBe(2);
      expect(result.engagementRate).toBeGreaterThan(0);
      expect(result.completionRate).toBeGreaterThan(0);
    });

    it('should handle empty analytics', async () => {
      const userId = 1;
      mockPrisma.contentRecommendation.findMany.mockResolvedValue([]);

      const result = await contentRecommendationService.getRecommendationAnalytics(userId);

      expect(result.totalRecommendations).toBe(0);
      expect(result.engagementRate).toBe(0);
      expect(result.completionRate).toBe(0);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const health = await contentRecommendationService.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeInstanceOf(Date);
    });

    it('should return error status', async () => {
      jest.spyOn(contentRecommendationService, 'getHealthStatus').mockRejectedValue(new Error('Service error'));

      const health = await contentRecommendationService.getHealthStatus();

      expect(health.status).toBe('error');
      expect(health.error).toBe('Service error');
    });
  });
});
