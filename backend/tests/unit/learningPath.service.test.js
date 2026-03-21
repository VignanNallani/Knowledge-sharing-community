const { PrismaClient } = require('@prisma/client');
const learningPathService = require('../../src/services/learningPath.service');
const logger = require('../../src/utils/logger.util');

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../src/utils/logger.util');
jest.mock('node-cron');

describe('LearningPathService', () => {
  let mockPrisma;
  let mockCache;
  let mockCron;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPrisma = {
      learningPath: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn()
      },
      learningPathStep: {
        createMany: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn()
      },
      learningPathProgress: {
        create: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn()
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn()
      },
      aIAnalyticsEvent: {
        create: jest.fn(),
        findMany: jest.fn()
      },
      aIUserBehavior: {
        findUnique: jest.fn()
      },
      skillMastery: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      }
    };

    PrismaClient.mockImplementation(() => mockPrisma);

    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      flushAll: jest.fn(),
      getStats: jest.fn(),
      keys: jest.fn()
    };

    mockCron = {
      schedule: jest.fn(() => ({
        stop: jest.fn(),
        nextDate: jest.fn(() => new Date(Date.now() + 60000))
      }))
    };

    logger.info = jest.fn();
    logger.error = jest.fn();
    logger.warn = jest.fn();

    jest.doMock('node-cache', () => jest.fn().mockImplementation(() => mockCache));
    jest.doMock('node-cron', () => jest.fn().mockImplementation(() => mockCron));
    jest.resetModules();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('generatePersonalizedLearningPath', () => {
    it('should generate a personalized learning path successfully', async () => {
      const service = require('../../src/services/learningPath.service');
      
      const userId = 1;
      const goals = ['Learn React', 'Master JavaScript'];
      const currentSkills = ['JavaScript', 'HTML', 'CSS'];
      const options = { difficulty: 'INTERMEDIATE', duration: 30 };

      const mockUser = { id: 1, name: 'Test User', experienceLevel: 'INTERMEDIATE' };
      const mockBehavior = { learningStyle: 'VISUAL', preferences: {} };
      const mockSkillMastery = [
        { skill: 'JavaScript', masteryLevel: 0.6, confidence: 0.7 },
        { skill: 'React', masteryLevel: 0.2, confidence: 0.3 }
      ];

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.aIUserBehavior.findUnique.mockResolvedValue(mockBehavior);
      mockPrisma.skillMastery.findMany.mockResolvedValue(mockSkillMastery);
      mockPrisma.learningPath.create.mockResolvedValue({ id: 1, userId, title: 'React Learning Path' });
      mockPrisma.learningPathStep.createMany.mockResolvedValue({ count: 5 });

      jest.spyOn(service, 'analyzeSkillGaps').mockResolvedValue(['React Advanced', 'State Management']);
      jest.spyOn(service, 'generatePathStructure').mockResolvedValue([
        { title: 'React Basics', order: 1, estimatedHours: 8 },
        { title: 'Advanced React', order: 2, estimatedHours: 12 }
      ]);

      const result = await service.generatePersonalizedLearningPath(userId, goals, currentSkills, options);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(mockPrisma.learningPath.create).toHaveBeenCalled();
      expect(mockPrisma.learningPathStep.createMany).toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      const service = require('../../src/services/learningPath.service');
      
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.generatePersonalizedLearningPath(1, [], [], {})
      ).rejects.toThrow('User not found');
    });

    it('should handle database errors', async () => {
      const service = require('../../src/services/learningPath.service');
      
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(
        service.generatePersonalizedLearningPath(1, [], [], {})
      ).rejects.toThrow('Failed to generate learning path');
    });
  });

  describe('getUserLearningPaths', () => {
    it('should get user learning paths successfully', async () => {
      const service = require('../../src/services/learningPath.service');
      
      const userId = 1;
      const mockPaths = [
        { id: 1, userId, title: 'React Path', status: 'IN_PROGRESS', progress: 45 },
        { id: 2, userId, title: 'Node.js Path', status: 'COMPLETED', progress: 100 }
      ];

      mockPrisma.learningPath.findMany.mockResolvedValue(mockPaths);

      const result = await service.getUserLearningPaths(userId);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('React Path');
      expect(result[1].status).toBe('COMPLETED');
    });

    it('should handle database errors', async () => {
      const service = require('../../src/services/learningPath.service');
      
      mockPrisma.learningPath.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getUserLearningPaths(1)).rejects.toThrow('Failed to get user learning paths');
    });
  });

  describe('analyzeSkillGaps', () => {
    it('should analyze skill gaps correctly', async () => {
      const service = require('../../src/services/learningPath.service');
      
      const goals = ['Learn React', 'Master TypeScript'];
      const currentSkills = ['JavaScript', 'HTML', 'CSS'];
      const skillMastery = [
        { skill: 'JavaScript', masteryLevel: 0.7, confidence: 0.8 }
      ];

      const result = await service.analyzeSkillGaps(goals, currentSkills, skillMastery);

      expect(result).toContain('React');
      expect(result).toContain('TypeScript');
    });
  });

  describe('generatePathStructure', () => {
    it('should generate learning path structure', async () => {
      const service = require('../../src/services/learningPath.service');
      
      const skillGaps = ['React', 'TypeScript'];
      const userLevel = 'INTERMEDIATE';
      const duration = 30;

      const result = await service.generatePathStructure(skillGaps, userLevel, duration);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('order');
      expect(result[0]).toHaveProperty('estimatedHours');
    });
  });

  describe('updatePathProgress', () => {
    it('should update path progress successfully', async () => {
      const service = require('../../src/services/learningPath.service');
      
      const userId = 1;
      const pathId = 1;
      const progressData = { completedSteps: 3, totalSteps: 5, progressPercentage: 60 };

      mockPrisma.learningPathProgress.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.learningPath.update.mockResolvedValue({ id: pathId, progress: 60 });

      const result = await service.updatePathProgress(userId, pathId, progressData);

      expect(result.progress).toBe(60);
      expect(mockPrisma.learningPathProgress.updateMany).toHaveBeenCalled();
    });

    it('should handle update errors', async () => {
      const service = require('../../src/services/learningPath.service');
      
      mockPrisma.learningPathProgress.updateMany.mockRejectedValue(new Error('Update failed'));

      await expect(
        service.updatePathProgress(1, 1, {})
      ).rejects.toThrow('Failed to update path progress');
    });
  });

  describe('deleteLearningPath', () => {
    it('should delete learning path successfully', async () => {
      const service = require('../../src/services/learningPath.service');
      
      const userId = 1;
      const pathId = 1;

      mockPrisma.learningPath.findUnique.mockResolvedValue({ id: pathId, userId });
      mockPrisma.learningPathProgress.deleteMany.mockResolvedValue({ count: 5 });
      mockPrisma.learningPathStep.deleteMany.mockResolvedValue({ count: 10 });
      mockPrisma.learningPath.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.deleteLearningPath(userId, pathId);

      expect(result).toBe(true);
      expect(mockPrisma.learningPath.deleteMany).toHaveBeenCalled();
    });

    it('should handle path not found', async () => {
      const service = require('../../src/services/learningPath.service');
      
      mockPrisma.learningPath.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteLearningPath(1, 999)
      ).rejects.toThrow('Learning path not found');
    });
  });

  describe('getLearningRecommendations', () => {
    it('should get learning recommendations', async () => {
      const service = require('../../src/services/learningPath.service');
      
      const userId = 1;
      const mockRecommendations = [
        { type: 'COURSE', title: 'React Advanced Patterns', relevance: 0.9 },
        { type: 'TUTORIAL', title: 'TypeScript Fundamentals', relevance: 0.8 }
      ];

      jest.spyOn(service, 'analyzeUserLearningHistory').mockResolvedValue(['React', 'JavaScript']);
      jest.spyOn(service, 'generateRecommendations').mockResolvedValue(mockRecommendations);

      const result = await service.getLearningRecommendations(userId);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('COURSE');
    });
  });

  describe('updateSkillMastery', () => {
    it('should update skill mastery successfully', async () => {
      const service = require('../../src/services/learningPath.service');
      
      const userId = 1;
      const skillUpdates = [
        { skill: 'React', masteryLevel: 0.8, confidence: 0.9 },
        { skill: 'TypeScript', masteryLevel: 0.6, confidence: 0.7 }
      ];

      mockPrisma.skillMastery.upsert.mockResolvedValue({ id: 1 });
      mockPrisma.aIAnalyticsEvent.create.mockResolvedValue({});

      const result = await service.updateSkillMastery(userId, skillUpdates);

      expect(result).toBeDefined();
      expect(mockPrisma.skillMastery.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('getLearningAnalytics', () => {
    it('should get learning analytics', async () => {
      const service = require('../../src/services/learningPath.service');
      
      const userId = 1;
      const mockAnalytics = {
        totalPaths: 5,
        completedPaths: 2,
        averageProgress: 65,
        timeSpent: 120,
        skillGrowth: 0.3
      };

      mockPrisma.learningPath.findMany.mockResolvedValue([
        { status: 'COMPLETED' },
        { status: 'COMPLETED' },
        { status: 'IN_PROGRESS', progress: 65 }
      ]);
      mockPrisma.aIAnalyticsEvent.findMany.mockResolvedValue([
        { eventType: 'LEARNING_TIME_SPENT', data: { hours: 120 } }
      ]);

      const result = await service.getLearningAnalytics(userId);

      expect(result.totalPaths).toBe(3);
      expect(result.completedPaths).toBe(2);
    });
  });

  describe('exportLearningPaths', () => {
    it('should export learning paths successfully', async () => {
      const service = require('../../src/services/learningPath.service');
      
      const userId = 1;
      const format = 'JSON';
      const mockPaths = [
        { id: 1, title: 'React Path', progress: 75, steps: [] }
      ];

      jest.spyOn(service, 'getUserLearningPaths').mockResolvedValue(mockPaths);

      const result = await service.exportLearningPaths(userId, format);

      expect(result).toBeDefined();
      expect(result.format).toBe(format);
      expect(result.paths).toHaveLength(1);
    });
  });

  describe('cache management', () => {
    it('should clear user cache correctly', async () => {
      const service = require('../../src/services/learningPath.service');
      
      const userId = 1;
      mockCache.del.mockReturnValue(true);

      service.clearUserCache(userId);

      expect(mockCache.del).toHaveBeenCalledWith(`user_${userId}_paths`);
      expect(mockCache.del).toHaveBeenCalledWith(`user_${userId}_analytics`);
    });

    it('should get cache stats', async () => {
      const service = require('../../src/services/learningPath.service');
      
      mockCache.getStats.mockReturnValue({ keys: 10, hits: 100, misses: 20 });

      const stats = service.getCacheStats();

      expect(stats.keys).toBe(10);
      expect(stats.hits).toBe(100);
    });
  });

  describe('health check', () => {
    it('should return healthy status', async () => {
      const service = require('../../src/services/learningPath.service');
      
      const health = await service.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeInstanceOf(Date);
    });

    it('should return error status when service fails', async () => {
      const service = require('../../src/services/learningPath.service');
      
      jest.spyOn(service, 'getHealthStatus').mockRejectedValue(new Error('Service error'));

      const health = await service.getHealthStatus();

      expect(health.status).toBe('error');
      expect(health.error).toBe('Service error');
    });
  });
});
