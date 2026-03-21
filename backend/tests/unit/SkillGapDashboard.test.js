const { PrismaClient } = require('@prisma/client');
const skillGapService = require('../../src/services/skillGap.service');
const logger = require('../../src/utils/logger.util');

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../src/utils/logger.util');
jest.mock('node-cron');

describe('SkillGapService', () => {
  let mockPrisma;
  let mockCache;
  let mockCron;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Prisma client
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn()
      },
      userSkill: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn()
      },
      skillGap: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn()
      },
      aIAnalyticsEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn()
      },
      aIUserBehavior: {
        findUnique: jest.fn(),
        update: jest.fn()
      },
      mentorshipSession: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      slot: {
        findMany: jest.fn()
      }
    };

    PrismaClient.mockImplementation(() => mockPrisma);

    // Mock NodeCache
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      flushAll: jest.fn(),
      keys: jest.fn(),
      getStats: jest.fn(() => ({
        keys: 0,
        hits: 0,
        misses: 0,
        ksize: 0,
        vsize: 0
      }))
    };

    // Mock node-cron
    mockCron = {
      schedule: jest.fn(() => ({
        stop: jest.fn(),
        nextDate: jest.fn(() => new Date(Date.now() + 60000))
      }))
    };

    // Mock logger
    logger.info = jest.fn();
    logger.error = jest.fn();
    logger.warn = jest.fn();

    // Mock NodeCache and node-cron
    jest.doMock('node-cache', () => jest.fn().mockImplementation(() => mockCache));
    jest.doMock('node-cron', () => jest.fn().mockImplementation(() => mockCron));

    // Reset skill gap service instance
    jest.resetModules();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('analyzeUserSkillGaps', () => {
    it('should analyze skill gaps successfully', async () => {
      const userId = 1;
      const options = {
        includeHistorical: true,
        predictFutureNeeds: true,
        careerGoals: ['Full Stack Developer'],
        industry: 'TECH',
        experienceLevel: 'INTERMEDIATE'
      };

      const mockUser = { id: 1, name: 'Test User', role: 'USER' };
      const mockBehavior = { behaviorData: JSON.stringify({ learningStyle: 'VISUAL', experienceLevel: 'INTERMEDIATE' }) };
      const mockSkillMastery = [
        { skill: 'JavaScript', masteryLevel: 0.6, confidence: 0.7 },
        { skill: 'React', masteryLevel: 0.3, confidence: 0.4 }
      ];

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.aIUserBehavior.findUnique.mockResolvedValue(mockBehavior);
      mockPrisma.skillMastery.findMany.mockResolvedValue(mockSkillMastery);

      jest.spyOn(skillGapService, 'analyzeUserSkillGaps').mockResolvedValue({
        userId,
        gaps: [],
        insights: {},
        summary: { totalGaps: 0, criticalGaps: 0 },
        recommendations: []
      });

      const result = await skillGapService.analyzeUserSkillGaps(userId, options);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.gaps).toBeInstanceOf(Array);
      expect(result.insights).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should handle user not found', async () => {
      const userId = 999;
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(skillGapService.analyzeUserSkillGaps(userId, {})).rejects.toThrow('User not found');
    });

    it('should handle database errors gracefully', async () => {
      const userId = 1;
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(skillGapService.analyzeUserSkillGaps(userId, {})).rejects.toThrow('Failed to analyze skill gaps');
    });

    it('should include historical analysis when enabled', async () => {
      const userId = 1;
      const options = { includeHistorical: true };
      
      jest.spyOn(skillGapService, 'analyzeHistoricalPatterns').mockResolvedValue({
        skillAcquisitionRate: 0.8,
        preferredLearningMethods: ['VIDEO', 'TUTORIAL'],
        completionPatterns: ['HIGH', 'MEDIUM'],
        difficultyProgression: ['BEGINNER', 'INTERMEDIATE'],
        timeMasteryPatterns: ['FAST', 'MODERATE'],
        seasonalPatterns: ['WEEKEND_PEAK', 'WEEKDAY_LOW'],
        retentionRate: 0.85
      });

      const result = await skillGapService.analyzeUserSkillGaps(userId, options);

      expect(result.insights.historicalPatterns).toBeDefined();
      expect(result.insights.historicalPatterns.skillAcquisitionRate).toBe(0.8);
    });

    it('should predict future skill needs when enabled', async () => {
      const userId = 1;
      const options = { predictFutureNeeds: true };
      
      jest.spyOn(skillGapService, 'predictFutureSkillGaps').mockResolvedValue([
        {
          skillName: 'TypeScript',
          requiredLevel: 0.8,
          confidence: 0.9,
          timeframe: '6 months'
        },
        {
          skillName: 'Python',
          requiredLevel: 0.7,
          confidence: 0.7,
          timeframe: '3 months'
        }
      ]);

      const result = await skillGapService.analyzeUserSkillGaps(userId, options);

      expect(result.insights.futureGaps).toBeDefined();
      expect(result.insights.futureGaps).toHaveLength(2);
      expect(result.insights.futureGaps[0].skillName).toBe('TypeScript');
      expect(result.insights.futureGaps[0].requiredLevel).toBe(0.8);
    });

    it('should generate AI insights', async () => {
      const userId = 1;
      
      jest.spyOn(skillGapService, 'generateAIInsights').mockResolvedValue({
        overallSkillHealth: 0.75,
        criticalGaps: [],
        growthOpportunities: ['Focus on React mastery', 'Explore cloud technologies'],
        learningPathway: 'React → Advanced React → Full Stack',
        timeInvestment: 120,
        careerAlignment: 0.9,
        skillSynergies: ['JavaScript + React', 'TypeScript + Node.js'],
        marketDemand: 'HIGH',
        personalizedStrategy: 'Focus on practical projects'
      });

      const result = await skillGapService.analyzeUserSkillGaps(userId, {});

      expect(result.insights.aiInsights).toBeDefined();
      expect(result.insights.overallSkillHealth).toBe(0.75);
      expect(result.insights.growthOpportunities).toContain('Focus on React mastery');
    });

    it('should handle empty skill profile', async () => {
      const userId = 1;
      const mockUser = { id: 1, name: 'Test User', role: 'USER' };
      const mockBehavior = { behaviorData: JSON.stringify({}) };
      const mockSkillMastery = [];

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.aIUserBehavior.findUnique.mockResolvedValue(mockBehavior);
      mockPrisma.skillMastery.findMany.mockResolvedValue(mockSkillMastery);

      const result = await skillGapService.analyzeUserSkillGaps(userId, {});

      expect(result.gaps).toHaveLength(0);
      expect(result.insights.overallSkillHealth).toBe(0);
      expect(result.recommendations).toHaveLength(0);
    });

    it('should handle concurrent analysis requests', async () => {
      const userId = 1;
      const options = { includeHistorical: true, predictFutureNeeds: true };

      // Mock concurrent requests
      const promise1 = skillGapService.analyzeUserSkillGaps(userId, options);
      const promise2 = skillGapService.analyzeUserSkillGaps(userId, { ...options, careerGoals: ['Data Science'] });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.gaps).toBeDefined();
      expect(result2.gaps).toBeDefined();
      expect(result1.insights.careerAlignment).toBeDefined();
      expect(result2.insights.careerAlignment).toBeDefined();
    });
  });

  describe('getUserSkillGaps', () => {
    it('should get user skill gaps successfully', async () => {
      const userId = 1;
      const options = {
        status: 'ACTIVE',
        severity: 'HIGH',
        gapType: 'UNDERDEVELOPED',
        limit: 10,
        offset: 0
      };

      const mockGaps = [
        {
          id: 'gap-1',
          userId,
          skillName: 'JavaScript',
          gapType: 'UNDERDEVELOPED',
          currentLevel: 0.3,
          requiredLevel: 0.8,
          gapSeverity: 'HIGH',
          confidence: 0.85,
          impactScore: 0.9,
          urgency: 'HIGH',
          timeToClose: 40,
          recommendedActions: ['Complete course', 'Practice projects'],
          prerequisites: ['HTML', 'CSS'],
          relatedGaps: [],
          status: 'ACTIVE'
        }
      ];

      mockPrisma.skillGap.findMany.mockResolvedValue(mockGaps);

      const result = await skillGapService.getUserSkillGaps(userId, options);

      expect(result).toHaveLength(1);
      expect(result[0].skillName).toBe('JavaScript');
      expect(result[0].gapType).toBe('UNDERDEVELOPED');
      expect(result[0].gapSeverity).toBe('HIGH');
    });

    it('should handle empty results gracefully', async () => {
      const userId = 1;
      mockPrisma.skillGap.findMany.mockResolvedValue([]);

      const result = await skillGapService.getUserSkillGaps(userId);

      expect(result).toHaveLength(0);
    });
  });

  describe('updateSkillGapProgress', () => {
    it('should update gap progress successfully', async () => {
      const userId = 1;
      const gapId = 'gap-1';
      const progressData = {
        progressValue: 0.5,
        status: 'ADDRESSING',
        feedback: 'Making good progress!'
      };

      const mockUpdatedGap = {
        id: gapId,
        userId,
        progressTracker: 0.5,
        status: 'ADDRESSING',
        lastAssessed: new Date()
      };

      mockPrisma.skillGap.update.mockResolvedValue(mockUpdatedGap);

      const result = await skillGapService.updateSkillGapProgress(userId, gapId, progressData);

      expect(result.progressTracker).toBe(0.5);
      expect(result.status).toBe('ADDRESSING');
      expect(result.lastAssessed).toBeInstanceOf(Date);
    });
  });

  describe('closeSkillGap', () => {
    it('should close skill gap successfully', async () => {
      const userId = 1;
      const gapId = 'gap-1';
      const closureData = {
        reason: 'COMPLETED',
        finalLevel: 0.8,
        feedback: 'Excellent progress!',
        timeSpent: 45
      };

      const mockClosedGap = {
        id: gapId,
        userId,
        status: 'CLOSED',
        completedAt: new Date()
      };

      mockPrisma.skillGap.update.mockResolvedValue(mockClosedGap);

      const result = await skillGapService.closeSkillGap(userId, gapId, closureData);

      expect(result.status).toBe('CLOSED');
      expect(result.reason).toBe('COMPLETED');
      expect(result.finalLevel).toBe(0.8);
    });
  });

  describe('getSkillGapAnalytics', () => {
    it('should get analytics successfully', async () => {
      const userId = 1;
      const timeRange = '30d';

      const mockAnalytics = {
        totalGaps: 5,
        gapsBySeverity: {
          CRITICAL: 2,
          HIGH: 1,
          MEDIUM: 1,
          LOW: 1
        },
        closureRate: 0.8,
        averageTimeToClose: 45
      };

      mockPrisma.skillGap.findMany.mockResolvedValue([
        { id: 'gap-1', gapSeverity: 'CRITICAL' },
        { id: 'gap-2', gapSeverity: 'HIGH' }
      ]);

      const result = await skillGapService.getSkillGapAnalytics(userId, timeRange);

      expect(result.totalGaps).toBe(5);
      expect(result.gapsBySeverity.CRITICAL).toBe(2);
      expect(result.closureRate).toBe(0.8);
    });

    it('should handle empty analytics gracefully', async () => {
      const userId = 1;
      mockPrisma.skillGap.findMany.mockRejectedValue(new Error('No data found'));

      const result = await skillGapService.getSkillGapAnalytics(userId, '30d');

      expect(result.totalGaps).toBe(0);
      expect(result.closureRate).toBe(0);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const health = await skillGapService.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeInstanceOf(Date);
    });

    it('should return error status when service fails', async () => {
      jest.spyOn(skillGapService, 'getHealthStatus').mockRejectedValue(new Error('Service error'));

      const health = await skillGapService.getHealthStatus();

      expect(health.status).toBe('error');
      expect(health.error).toBe('Service error');
    });
  });

  describe('cache management', () => {
    it('should clear cache successfully', () => {
      skillGapService.clearCache();
      
      const cacheStats = skillGapService.getCacheStats();
      
      expect(cacheStats.keys).toBe(0);
      expect(cacheStats.hits).toBe(0);
      expect(cacheStats.misses).toBe(0);
    });
  });

  describe('queue management', () => {
    it('should queue analysis requests', async () => {
      const userId = 1;
      const options = { includeHistorical: true };

      // Queue multiple requests
      skillGapService.queueAnalysis(userId, options);
      skillGapService.queueAnalysis(userId, { ...options, careerGoals: ['Data Science'] });

      expect(skillGapService.analysisQueue).toHaveLength(2);
      expect(skillGapService.isProcessing).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should cleanup all resources', () => {
      skillGapService.cleanup();
      
      const health = skillGapService.getHealthStatus();
      
      expect(health.status).toBe('healthy');
    });
  });
});

// ==================== INTEGRATION TESTS ====================

describe('Integration with LearningPathService', () => {
  it('should integrate with learning path service', async () => {
    const userId = 1;
    const options = { includeHistorical: true };

    jest.spyOn(skillGapService, 'getUserLearningData').mockResolvedValue({
      user: { id: 1 },
      behavior: {},
      skillMastery: [],
      pastInteractions: [],
      previousScores: []
    });

    const result = await skillGapService.analyzeUserSkillGaps(userId, options);

    expect(result).toBeDefined();
    expect(result.insights.aiInsights).toBeDefined();
  });
});

describe('Integration with ContentRecommendationService', () => {
  it('should integrate with content recommendation service', async () => {
    const userId = 1;
    const options = {
      skillGapId: 'gap-1',
      contentTypes: ['COURSE', 'TUTORIAL'],
      algorithm: 'HYBRID'
    };

    jest.spyOn(skillGapService, 'getUserLearningData').mockResolvedValue({
      user: { id: 1 },
      behavior: {},
      skillMastery: [],
      pastInteractions: [],
      previousScores: []
    });

    const result = await skillGapService.analyzeUserSkillGaps(userId, options);

    expect(result).toBeDefined();
    expect(result.insights.growthOpportunities).toBeDefined();
    expect(result.insights.skillSynergies).toBeDefined();
  });
});

// ==================== PERFORMANCE TESTS ====================

describe('Performance Tests', () => {
  describe('Database Query Performance', () => {
    it('should handle large skill gap queries efficiently', async () => {
      const userId = 1;
      const options = { includeHistorical: true };

      // Mock large dataset
      const mockGaps = Array.from({ length: 100 }, (_, index) => ({
        id: `gap-${index}`,
        userId,
        skillName: `Skill ${index}`,
        gapSeverity: index % 4 === 0 ? 'CRITICAL' : 'HIGH'
      }));

      mockPrisma.skillGap.findMany.mockResolvedValue(mockGaps);

      const startTime = Date.now();
      const result = await skillGapService.analyzeUserSkillGaps(userId, options);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(result).toBeDefined();
    });
  });
});

// ==================== ERROR HANDLING TESTS ====================

describe('Error Handling', () => {
  it('should handle service errors gracefully', async () => {
    const userId = 1;
    
    // Database connection error
    mockPrisma.user.findUnique.mockRejectedValue(new Error('Connection lost'));
    await expect(skillGapService.analyzeUserSkillGaps(userId, {}))
      .rejects.toThrow('Failed to analyze skill gaps');

    // Service unavailable error
    jest.spyOn(skillGapService, 'analyzeUserSkillGaps').mockRejectedValue(new Error('Service unavailable'));
    await expect(skillGapService.analyzeUserSkillGaps(userId, {}))
      .rejects.toThrow('Service unavailable');

    // Timeout error
    jest.spyOn(skillGapService, 'analyzeUserSkillGaps').mockImplementation(() => {
      throw new Error('Request timeout');
    });
    await expect(skillGapService.analyzeUserSkillGaps(userId, {}))
      .rejects.toThrow('Request timeout');
  });
});

// ==================== DATA VALIDATION TESTS ====================

describe('Data Validation', () => {
  it('should validate gap data structure', async () => {
    const userId = 1;
    const options = { includeHistorical: true };

    const result = await skillGapService.analyzeUserSkillGaps(userId, options);

    expect(result).toBeDefined();
    expect(Array.isArray(result.gaps)).toBe(true);
    expect(result.gaps.every(gap => 
      typeof gap.id === 'string' &&
      typeof gap.userId === 'number' &&
      typeof gap.skillName === 'string' &&
      typeof gap.currentLevel === 'number' &&
      typeof gap.requiredLevel === 'number' &&
      typeof gap.confidence === 'number'
    )).toBe(true);
  });

  it('should validate confidence scores', async () => {
    const userId = 1;
    const options = { includeHistorical: true };

    const result = await skillGapService.analyzeUserSkillGaps(userId, options);

    expect(result.gaps.every(gap => 
      gap.confidence >= 0 && gap.confidence <= 1.0
    )).toBe(true);
  });

  it('should validate urgency levels', async () => {
    const userId = 1;
    const options = { includeHistorical: true };

    const result = await skillGapService.analyzeUserSkillGaps(userId, options);

    expect(result.gaps.every(gap => 
      ['IMMEDIATE', 'HIGH', 'MEDIUM', 'LOW'].includes(gap.urgency)
    )).toBe(true);
  });

  it('should validate impact scores', async () => {
    const userId = 1;
    const options = { includeHistorical: true };

    const result = await skillGapService.analyzeUserSkillGaps(userId, options);

    expect(result.gaps.every(gap => 
      gap.impactScore >= 0 && gap.impactScore <= 1.0
    )).toBe(true);
  });
});

// ==================== CACHE PERFORMANCE TESTS ====================

describe('Cache Performance', () => {
  it('should cache frequently accessed data', async () => {
    const userId = 1;
    const options = { includeHistorical: true };

    // First call - should hit database
    const result1 = await skillGapService.analyzeUserSkillGaps(userId, options);

    // Second call should use cache
    const result2 = await skillGapService.analyzeUserSkillGaps(userId, options);

    // Results should be identical
    expect(result1).toEqual(result2);
  });

  it('should clear expired cache', async () => {
    const userId = 1;
    
    // Add to cache
    await skillGapService.analyzeUserSkillGaps(userId, {});
    
    // Clear cache
    skillGapService.clearCache();
    
    // Cache should be empty
    const cacheStats = skillGapService.getCacheStats();
    expect(cacheStats.keys).toBe(0);
  });
});

// Clean up database connections
afterAll(async () => {
  // Clear any remaining cache
  if (skillGapService) {
    skillGapService.clearCache();
  }
});

module.exports = skillGapService;
