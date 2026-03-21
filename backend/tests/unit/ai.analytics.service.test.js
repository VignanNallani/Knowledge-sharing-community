const { PrismaClient } = require('@prisma/client');
const aiAnalyticsService = require('../../src/services/ai.analytics.service');
const logger = require('../../src/utils/logger.util');

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../src/utils/logger.util');
jest.mock('node-cron');

describe('AIAnalyticsService', () => {
  let mockPrisma;
  let mockCache;
  let mockCron;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock Prisma client
    mockPrisma = {
      aIAnalyticsEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn()
      },
      aIUserBehavior: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn()
      },
      aIPrediction: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn()
      },
      aIContentRecommendation: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn()
      },
      aIMentorMatch: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn()
      },
      aILearningPath: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
      },
      aILearningPathStep: {
        createMany: jest.fn()
      },
      aIInsight: {
        createMany: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
      },
      aIAnalyticsMetrics: {
        findMany: jest.fn()
      },
      aIModel: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn()
      },
      aIModelTraining: {
        create: jest.fn(),
        update: jest.fn()
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn()
      },
      post: {
        findMany: jest.fn(),
        findUnique: jest.fn()
      },
      mentorshipSession: {
        findMany: jest.fn(),
        findUnique: jest.fn()
      }
    };

    // Mock Prisma constructor
    PrismaClient.mockImplementation(() => mockPrisma);

    // Mock NodeCache
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      flushAll: jest.fn(),
      getStats: jest.fn(),
      keys: jest.fn()
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

    // Mock NodeCache
    jest.doMock('node-cache', () => {
      return jest.fn().mockImplementation(() => mockCache);
    });

    // Mock node-cron
    jest.doMock('node-cron', () => {
      return jest.fn().mockImplementation(() => mockCron);
    });

    // Reset analytics service instance
    jest.resetModules();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      const service = require('../../src/services/ai.analytics.service');
      
      expect(service.isTraining).toBe(false);
      expect(service.models).toBeInstanceOf(Map);
      expect(service.predictionQueue).toEqual([]);
      expect(service.maxConcurrentTasks).toBe(10);
    });

    it('should load active AI models on startup', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const mockModels = [
        { id: 1, name: 'ContentRecommendation', isActive: true },
        { id: 2, name: 'UserBehavior', isActive: true }
      ];
      
      mockPrisma.aIModel.findMany.mockResolvedValue(mockModels);
      
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async initialization

      expect(mockPrisma.aIModel.findMany).toHaveBeenCalledWith({
        where: { isActive: true }
      });
      expect(service.models.size).toBe(2);
      expect(logger.info).toHaveBeenCalledWith('Loaded 2 AI models');
    });

    it('should start periodic model training', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      // Mock setInterval
      const mockSetInterval = jest.fn();
      global.setInterval = mockSetInterval;

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 24 * 60 * 60 * 1000);
      expect(logger.info).toHaveBeenCalledWith('Starting AI model training...');
    });

    it('should start prediction processor', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      // Mock setInterval
      const mockSetInterval = jest.fn();
      global.setInterval = mockSetInterval;

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 5000);
    });
  });

  describe('trackAnalyticsEvent', () => {
    it('should track analytics event successfully', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const eventData = {
        userId: 1,
        eventType: 'PAGE_VIEW',
        eventData: { page: '/dashboard', duration: 5000 },
        metadata: {
          sessionId: 'session123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      };

      const expectedEvent = {
        id: 1,
        userId: 1,
        eventType: 'PAGE_VIEW',
        eventAction: undefined,
        eventData: JSON.stringify(eventData.eventData),
        sessionId: 'session123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        referrer: undefined,
        timestamp: expect.any(Date),
        duration: 5000,
        metadata: JSON.stringify({})
      };

      mockPrisma.aIAnalyticsEvent.create.mockResolvedValue(expectedEvent);

      const result = await service.trackAnalyticsEvent(
        eventData.userId,
        eventData.eventType,
        eventData.eventData,
        eventData.metadata
      );

      expect(mockPrisma.aIAnalyticsEvent.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          eventType: 'PAGE_VIEW',
          eventAction: undefined,
          eventData: JSON.stringify(eventData.eventData),
          sessionId: 'session123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          referrer: undefined,
          duration: 5000,
          metadata: JSON.stringify({})
        }
      });

      expect(result).toEqual(expectedEvent);
      expect(logger.info).toHaveBeenCalledWith('Analytics event tracked:', expect.any(Object));
    });

    it('should emit real-time event', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const eventData = {
        userId: 1,
        eventType: 'PAGE_VIEW',
        eventData: { page: '/dashboard' }
      };

      mockPrisma.aIAnalyticsEvent.create.mockResolvedValue({
        id: 1,
        createdAt: new Date()
      });

      // Mock global.io
      global.io = {
        emit: jest.fn()
      };

      await service.trackAnalyticsEvent(
        eventData.userId,
        eventData.eventType,
        eventData.eventData
      );

      expect(global.io.emit).toHaveBeenCalledWith('analytics_event', {
        type: 'PAGE_VIEW',
        userId: 1,
        data: { page: '/dashboard' },
        timestamp: expect.any(Date)
      });
    });

    it('should handle errors during event tracking', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      mockPrisma.aIAnalyticsEvent.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.trackAnalyticsEvent(1, 'PAGE_VIEW', {})
      ).rejects.toThrow('Database error');
      
      expect(logger.error).toHaveBeenCalledWith('Error tracking analytics event:', expect.any(Error));
    });
  });

  describe('updateUserBehavior', () => {
    it('should update user behavior for existing behavior', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const userId = 1;
      const eventType = 'POST_LIKE';
      const eventData = { postId: 123 };

      const existingBehavior = {
        id: 1,
        userId: 1,
        behaviorType: 'CONTENT_PREFERENCE',
        behaviorData: JSON.stringify({
          likedPosts: [{ postId: 456, timestamp: new Date() }],
          pageViews: 10
        }),
        confidence: 0.7
      };

      mockPrisma.aIUserBehavior.findUnique.mockResolvedValue(existingBehavior);
      mockPrisma.aIUserBehavior.update.mockResolvedValue({
        ...existingBehavior,
        behaviorData: expect.any(String),
        confidence: expect.any(Number),
        lastUpdated: expect.any(Date)
      });

      await service.updateUserBehavior(userId, eventType, eventData);

      expect(mockPrisma.aIUserBehavior.findUnique).toHaveBeenCalledWith({
        where: { userId_behaviorType: { userId, behaviorType: 'CONTENT_PREFERENCE' } }
      });
      expect(mockPrisma.aIUserBehavior.update).toHaveBeenCalled();
    });

    it('should create new user behavior if not exists', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const userId = 1;
      const eventType = 'POST_LIKE';
      const eventData = { postId: 123 };

      mockPrisma.aIUserBehavior.findUnique.mockResolvedValue(null);
      mockPrisma.aIUserBehavior.create.mockResolvedValue({
        id: 1,
        userId: 1,
        behaviorType: 'CONTENT_PREFERENCE',
        behaviorData: expect.any(String),
        confidence: expect.any(Number)
      });

      await service.updateUserBehavior(userId, eventType, eventData);

      expect(mockPrisma.aIUserBehavior.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          behaviorType: 'CONTENT_PREFERENCE',
          behaviorData: expect.any(String),
          confidence: expect.any(Number)
        }
      });
    });

    it('should handle errors during behavior update', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      mockPrisma.aIUserBehavior.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(
        service.updateUserBehavior(1, 'POST_LIKE', {})
      ).rejects.toThrow('Database error');
      
      expect(logger.error).toHaveBeenCalledWith('Error updating user behavior:', expect.any(Error));
    });
  });

  describe('generateContentRecommendations', () => {
    it('should generate personalized recommendations', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const userId = 1;
      const options = {
        contentType: 'POST',
        limit: 10,
        recommendationType: 'PERSONALIZED'
      };

      const mockUserBehavior = {
        behaviorType: 'CONTENT_PREFERENCE',
        behaviorData: JSON.stringify({
          likedPosts: [{ postId: 123, timestamp: new Date() }],
          categories: { 'TECHNOLOGY': 5, 'BUSINESS': 3 }
        })
      };

      const mockUserInteractions = [
        { eventType: 'POST_LIKE', eventData: JSON.stringify({ postId: 123 }) },
        { eventType: 'POST_COMMENT', eventData: JSON.stringify({ postId: 456 }) }
      ];

      const mockPosts = [
        {
          id: 1,
          title: 'Tech Post 1',
          category: 'TECHNOLOGY',
          author: { id: 1, name: 'Author 1' },
          _count: { likes: 10, comments: 5 }
        }
      ];

      mockPrisma.aIUserBehavior.findUnique.mockResolvedValue(mockUserBehavior);
      mockPrisma.aIAnalyticsEvent.findMany.mockResolvedValue(mockUserInteractions);
      mockPrisma.post.findMany.mockResolvedValue(mockPosts);
      mockPrisma.aIContentRecommendation.deleteMany.mockResolvedValue({});
      mockPrisma.aIContentRecommendation.createMany.mockResolvedValue({});

      const result = await service.generateContentRecommendations(userId, options);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockPrisma.aIContentRecommendation.createMany).toHaveBeenCalled();
    });

    it('should use cached recommendations when available', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const userId = 1;
      const options = { contentType: 'POST', limit: 10 };
      const cacheKey = `content_recommendations_${userId}_POST_10_PERSONALIZED`;
      
      const cachedRecommendations = [
        { id: 1, contentType: 'POST', score: 0.8 }
      ];

      mockCache.get.mockReturnValue(cachedRecommendations);

      const result = await service.generateContentRecommendations(userId, options);

      expect(result).toEqual(cachedRecommendations);
      expect(mockCache.get).toHaveBeenCalledWith(cacheKey);
      expect(mockPrisma.post.findMany).not.toHaveBeenCalled();
    });

    it('should handle errors during recommendation generation', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      mockPrisma.aIUserBehavior.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(
        service.generateContentRecommendations(1)
      ).rejects.toThrow('Database error');
      
      expect(logger.error).toHaveBeenCalledWith('Error generating content recommendations:', expect.any(Error));
    });
  });

  describe('generateMentorMatches', () => {
    it('should generate mentor matches successfully', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const menteeId = 1;
      const options = {
        skills: 'JavaScript,React',
        experience: 'INTERMEDIATE',
        limit: 10
      };

      const mockMentee = {
        id: 1,
        name: 'Test Mentee',
        skills: 'JavaScript,Node.js'
      };

      const mockMentors = [
        {
          id: 2,
          name: 'Test Mentor',
          skills: 'JavaScript,React,Node.js',
          role: 'MENTOR',
          mentorshipsAsMentor: [
            { id: 1, rating: 5 },
            { id: 2, rating: 4 }
          ],
          _count: { mentorshipsAsMentor: 10 }
        }
      ];

      mockPrisma.user.findUnique.mockResolvedValue(mockMentee);
      mockPrisma.user.findMany.mockResolvedValue(mockMentors);
      mockPrisma.aIMentorMatch.deleteMany.mockResolvedValue({});
      mockPrisma.aIMentorMatch.createMany.mockResolvedValue({});

      const result = await service.generateMentorMatches(menteeId, options);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10);
      expect(mockPrisma.aIMentorMatch.createMany).toHaveBeenCalled();
    });

    it('should calculate mentor match scores correctly', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const mentee = { skills: 'JavaScript,React' };
      const mentor = {
        skills: 'JavaScript,React,Node.js',
        mentorshipsAsMentor: [
          { rating: 5 },
          { rating: 4 }
        ],
        _count: { mentorshipsAsMentor: 10 }
      };

      const matchScore = service.calculateMentorMatchScore(mentee, mentor, 'JavaScript,React', 'INTERMEDIATE');

      expect(matchScore).toBeGreaterThan(0);
      expect(matchScore).toBeLessThanOrEqual(1);
    });

    it('should handle errors during mentor matching', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(
        service.generateMentorMatches(1)
      ).rejects.toThrow('Database error');
      
      expect(logger.error).toHaveBeenCalledWith('Error generating mentor matches:', expect.any(Error));
    });
  });

  describe('generateLearningPath', () => {
    it('should generate skill-based learning path', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const userId = 1;
      const options = {
        pathType: 'SKILL_BASED',
        targetSkills: 'JavaScript,React',
        difficulty: 'INTERMEDIATE',
        estimatedDuration: 40
      };

      const mockUser = {
        id: 1,
        name: 'Test User',
        skills: 'JavaScript'
      };

      const mockLearningPath = {
        id: 1,
        userId: 1,
        pathName: 'JavaScript & React Mastery',
        pathType: 'SKILL_BASED',
        pathData: expect.any(String),
        estimatedDuration: 40,
        difficulty: 'INTERMEDIATE',
        isActive: true
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.aILearningPath.create.mockResolvedValue(mockLearningPath);
      mockPrisma.aILearningPathStep.createMany.mockResolvedValue({});

      const result = await service.generateLearningPath(userId, options);

      expect(result).toEqual(mockLearningPath);
      expect(mockPrisma.aILearningPath.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          pathName: expect.any(String),
          pathType: 'SKILL_BASED',
          pathData: expect.any(String),
          estimatedDuration: 40,
          difficulty: 'INTERMEDIATE',
          isActive: true
        }
      });
    });

    it('should generate career-based learning path', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const userId = 1;
      const options = {
        pathType: 'CAREER_BASED',
        targetSkills: 'Software Development',
        difficulty: 'ADVANCED'
      };

      const mockUser = {
        id: 1,
        name: 'Test User',
        bio: 'I want to become a software developer'
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.aILearningPath.create.mockResolvedValue({
        id: 1,
        userId: 1,
        pathName: 'Software Development Career Path',
        pathType: 'CAREER_BASED',
        pathData: expect.any(String),
        estimatedDuration: 60,
        difficulty: 'ADVANCED',
        isActive: true
      });
      mockPrisma.aILearningPathStep.createMany.mockResolvedValue({});

      const result = await service.generateLearningPath(userId, options);

      expect(result.pathType).toBe('CAREER_BASED');
      expect(result.difficulty).toBe('ADVANCED');
    });

    it('should handle errors during learning path generation', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(
        service.generateLearningPath(1)
      ).rejects.toThrow('Database error');
      
      expect(logger.error).toHaveBeenCalledWith('Error generating learning path:', expect.any(Error));
    });
  });

  describe('generatePredictions', () => {
    it('should generate engagement predictions', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const userId = 1;
      const predictionType = 'ENGAGEMENT';
      const options = { timeRange: '30d' };

      const mockUserData = {
        user: { id: 1, lastLoginAt: new Date() },
        behavior: [],
        analytics: [
          { eventType: 'PAGE_VIEW', timestamp: new Date() },
          { eventType: 'POST_LIKE', timestamp: new Date() }
        ],
        interactions: [
          { eventType: 'POST_LIKE', timestamp: new Date() }
        ]
      };

      const mockPredictions = [
        {
          predictionType: 'ENGAGEMENT',
          predictionData: expect.any(String),
          confidence: 0.8,
          expiresAt: expect.any(Date)
        }
      ];

      jest.spyOn(service, 'getUserPredictionData').mockResolvedValue(mockUserData);
      jest.spyOn(service, 'predictEngagement').mockResolvedValue(mockPredictions);
      jest.spyOn(service, 'storePredictions').mockResolvedValue();

      const result = await service.generatePredictions(userId, predictionType, options);

      expect(result).toEqual(mockPredictions);
      expect(service.predictEngagement).toHaveBeenCalledWith(mockUserData, options);
    });

    it('should generate retention predictions', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const userId = 1;
      const predictionType = 'RETENTION';
      const options = { timeRange: '90d' };

      const mockUserData = {
        user: { id: 1, lastLoginAt: new Date(Date.now() - 60 * 60 * 1000) },
        behavior: [],
        analytics: [],
        interactions: []
      };

      const mockPredictions = [
        {
          predictionType: 'RETENTION',
          predictionData: expect.any(String),
          confidence: 0.7,
          expiresAt: expect.any(Date)
        }
      ];

      jest.spyOn(service, 'getUserPredictionData').mockResolvedValue(mockUserData);
      jest.spyOn(service, 'predictRetention').mockResolvedValue(mockPredictions);
      jest.spyOn(service, 'storePredictions').mockResolvedValue();

      const result = await service.generatePredictions(userId, predictionType, options);

      expect(result).toEqual(mockPredictions);
      expect(service.predictRetention).toHaveBeenCalledWith(mockUserData, options);
    });

    it('should handle errors during prediction generation', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      jest.spyOn(service, 'getUserPredictionData').mockRejectedValue(new Error('Database error'));

      await expect(
        service.generatePredictions(1, 'ENGAGEMENT')
      ).rejects.toThrow('Database error');
      
      expect(logger.error).toHaveBeenCalledWith('Error generating predictions:', expect.any(Error));
    });
  });

  describe('generateInsights', () => {
    it('should generate user trend insights', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const insightType = 'USER_TREND';
      const options = { timeRange: '30d' };

      const mockEvents = [
        { eventType: 'PAGE_VIEW', timestamp: new Date() },
        { eventType: 'POST_LIKE', timestamp: new Date() }
      ];

      const mockInsights = [
        {
          insightType: 'USER_TREND',
          title: 'Peak Activity Time Identified',
          description: 'Users are most active at 14:00',
          insightData: expect.any(String),
          confidence: 0.8,
          impact: 'MEDIUM'
        }
      ];

      mockPrisma.aIAnalyticsEvent.findMany.mockResolvedValue(mockEvents);
      jest.spyOn(service, 'storeInsights').mockResolvedValue();

      const result = await service.generateInsights(insightType, options);

      expect(result).toEqual(mockInsights);
      expect(mockPrisma.aIAnalyticsEvent.findMany).toHaveBeenCalled();
    });

    it('should generate platform trend insights', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const insightType = 'PLATFORM_TREND';
      const options = { timeRange: '30d' };

      const mockInsights = [
        {
          insightType: 'PLATFORM_TREND',
          title: 'Rapid User Growth Detected',
          description: 'Platform user base growing at 5.0% per week',
          insightData: expect.any(String),
          confidence: 0.9,
          impact: 'HIGH'
        }
      ];

      jest.spyOn(service, 'calculateUserGrowth').mockReturnValue({ growthRate: 0.05, newUsers: 150 });
      jest.spyOn(service, 'calculateContentGrowth').mockReturnValue({ growthRate: 0.08, newContent: 200 });
      jest.spyOn(service, 'calculatePlatformEngagement').mockReturnValue({ averageSessionDuration: 1200 });
      jest.spyOn(service, 'storeInsights').mockResolvedValue();

      const result = await service.generateInsights(insightType, options);

      expect(result).toEqual(mockInsights);
      expect(service.calculateUserGrowth).toHaveBeenCalledWith('30d');
    });

    it('should handle errors during insight generation', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      mockPrisma.aIAnalyticsEvent.findMany.mockRejectedValue(new Error('Database error'));

      await expect(
        service.generateInsights('USER_TREND')
      ).rejects.toThrow('Database error');
      
      expect(logger.error).toHaveBeenCalledWith('Error generating AI insights:', expect.any(Error));
    });
  });

  describe('trainModels', () => {
    it('should train all active models', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const mockModels = [
        { id: 1, name: 'ContentRecommendation' },
        { id: 2, name: 'UserBehavior' }
      ];

      const mockTraining = {
        id: 1,
        modelId: 1,
        trainingType: 'INCREMENTAL',
        status: 'RUNNING',
        progress: 0
      };

      mockPrisma.aIModel.findMany.mockResolvedValue(mockModels);
      mockPrisma.aIModelTraining.create.mockResolvedValue(mockTraining);
      mockPrisma.aIModelTraining.update.mockResolvedValue({
        ...mockTraining,
        status: 'COMPLETED',
        progress: 1,
        completedAt: expect.any(Date),
        metrics: expect.any(String)
      });
      mockPrisma.aIModel.update.mockResolvedValue({});
      jest.spyOn(service, 'calculateModelPerformance').mockReturnValue({ accuracy: 0.85 });

      await service.trainModels();

      expect(service.isTraining).toBe(false);
      expect(mockPrisma.aIModel.findMany).toHaveBeenCalled();
      expect(mockPrisma.aIModelTraining.create).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during model training', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      mockPrisma.aIModel.findMany.mockRejectedValue(new Error('Database error'));

      await service.trainModels();

      expect(service.isTraining).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Error during model training:', expect.any(Error));
    });
  });

  describe('calculateEngagementScore', () => {
    it('should calculate engagement score correctly', () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const events = [
        { eventType: 'PAGE_VIEW' },
        { eventType: 'POST_LIKE' },
        { eventType: 'POST_COMMENT' },
        { eventType: 'POST_CREATE' },
        { eventType: 'MENTOR_SESSION_BOOKED' }
      ];

      const score = service.calculateEngagementScore(events);

      expect(score).toBe(5 / 30); // 5 engagement events out of 30 max
    });

    it('should handle empty events array', () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const score = service.calculateEngagementScore([]);

      expect(score).toBe(0);
    });
  });

  describe('calculateRetentionRisk', () => {
    it('should calculate retention risk correctly', () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const userData = {
        lastLoginAt: new Date(Date.now() - 60 * 60 * 1000 * 24), // 24 days ago
        engagementScore: 0.2
      };

      const risk = service.calculateRetentionRisk(userData);

      expect(risk).toBeGreaterThan(0);
      expect(risk).toBeLessThanOrEqual(1);
    });

    it('should handle missing last login', () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const userData = {
        engagementScore: 0.5
      };

      const risk = service.calculateRetentionRisk(userData);

      expect(risk).toBeGreaterThan(0);
    });
  });

  describe('extractUserPreferences', () => {
    it('should extract user preferences from behavior data', () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const behaviorData = {
        viewedPages: [
          { page: '/dashboard', timestamp: new Date() },
          { page: '/profile', timestamp: new Date() }
        ],
        likedPosts: [
          { postId: 1, timestamp: new Date() },
          { postId: 2, timestamp: new Date() }
        ],
        searchQueries: [
          { query: 'JavaScript', timestamp: new Date() }
        ]
      };

      const userInteractions = [
        { eventType: 'POST_LIKE', eventData: JSON.stringify({ postId: 3, category: 'TECHNOLOGY' }) }
      ];

      const preferences = service.extractUserPreferences(behaviorData, userInteractions);

      expect(preferences.categories).toBeDefined();
      expect(preferences.authors).toBeDefined();
      expect(preferences.topics).toBeDefined();
      expect(preferences.timeOfDay).toBeDefined();
    });

    it('should handle empty behavior data', () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const preferences = service.extractUserPreferences({}, []);

      expect(preferences.categories).toEqual({});
      expect(preferences.authors).toEqual({});
      expect(preferences.topics).toEqual({});
      expect(preferences.timeOfDay).toEqual({});
    });
  });

  describe('calculatePersonalizationScore', () => {
    it('should calculate personalization score correctly', () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const content = {
        category: 'TECHNOLOGY',
        authorId: 1
      };

      const preferences = {
        categories: { 'TECHNOLOGY': 5, 'BUSINESS': 3 },
        authors: { 1: 2, 2: 1 }
      };

      const score = service.calculatePersonalizationScore(content, preferences);

      expect(score).toBeGreaterThan(0.5); // Base score + category match + author match
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle missing preferences', () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const content = {
        category: 'TECHNOLOGY',
        authorId: 1
      };

      const preferences = {};

      const score = service.calculatePersonalizationScore(content, preferences);

      expect(score).toBe(0.5); // Base score only
    });
  });

  describe('calculateTrendingScore', () => {
    it('should calculate trending score correctly', () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const content = {
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        _count: { likes: 10, comments: 5 }
      };

      const score = service.calculateTrendingScore(content);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle old content', () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const content = {
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        _count: { likes: 100, comments: 50 }
      };

      const score = service.calculateTrendingScore(content);

      expect(score).toBeLessThan(0.5); // Old content should have lower score
    });
  });

  describe('calculateSimilarityScore', () => {
    it('should calculate similarity score correctly', () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const content = {
        authorId: 1
      };

      const likedPosts = [
        { eventData: JSON.stringify({ postId: 1, authorId: 1 }) },
        { eventData: JSON.stringify({ postId: 2, authorId: 2 }) }
      ];

      const score = service.calculateSimilarityScore(content, likedPosts);

      expect(score).toBeGreaterThan(0.3); // Base score + author match
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle no liked posts', () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const content = {
        authorId: 1
      };

      const score = service.calculateSimilarityScore(content, []);

      expect(score).toBe(0.3); // Base score only
    });
  });

  describe('combineRecommendations', () => {
    it('should combine recommendations correctly', () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const recommendationSets = [
        {
          type: 'PERSONALIZED',
          items: [
            { contentId: 1, score: 0.8 },
            { contentId: 2, score: 0.7 }
          ],
          weight: 0.5
        },
        {
          type: 'TRENDING',
          items: [
            { contentId: 3, score: 0.9 },
            { contentId: 4, score: 0.6 }
          ],
          weight: 0.3
        }
      ];

      const result = service.combineRecommendations(recommendationSets, 5);

      expect(result).toHaveLength(4);
      expect(result[0].score).toBeGreaterThan(result[1].score); // Sorted by score
      expect(result[0].recommendationType).toBe('PERSONALIZED');
    });

    it('should remove duplicates', () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const recommendationSets = [
        {
          type: 'PERSONALIZED',
          items: [
            { contentId: 1, score: 0.8 },
            { contentId: 2, score: 0.7 }
          ],
          weight: 0.5
        },
        {
          type: 'TRENDING',
          items: [
            { contentId: 1, score: 0.9 }, // Duplicate
            { contentId: 3, score: 0.6 }
          ],
          weight: 0.3
        }
      ];

      const result = service.combineRecommendations(recommendationSets, 5);

      expect(result).toHaveLength(3); // Duplicate removed
      expect(result.find(item => item.contentId === 1)).toBeDefined();
      expect(result.filter(item => item.contentId === 1).length).toBe(1);
    });
  });

  describe('storeRecommendations', () => {
    it('should store recommendations successfully', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const userId = 1;
      const recommendations = [
        {
          contentId: 1,
          contentType: 'POST',
          score: 0.8,
          recommendationType: 'PERSONALIZED',
          reason: 'Based on your interests'
        }
      ];

      mockPrisma.aIContentRecommendation.deleteMany.mockResolvedValue({});
      mockPrisma.aIContentRecommendation.createMany.mockResolvedValue({});

      await service.storeRecommendations(userId, recommendations, 'CONTENT', 'POST');

      expect(mockPrisma.aIContentRecommendation.deleteMany).toHaveBeenCalledWith({
        where: {
          userId,
          contentType: 'POST',
          expiresAt: { lt: expect.any(Date) }
        }
      });
      expect(mockPrisma.aIContentRecommendation.createMany).toHaveBeenCalledWith({
        data: expect.any(Array)
      });
    });

    it('should handle errors during recommendation storage', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      mockPrisma.aIContentRecommendation.deleteMany.mockRejectedValue(new Error('Database error'));

      await expect(
        service.storeRecommendations(1, [], 'CONTENT', 'POST')
      ).rejects.toThrow('Database error');
      
      expect(logger.error).toHaveBeenCalledWith('Error storing recommendations:', expect.any(Error));
    });
  });

  describe('storeMentorMatches', () => {
    it('should store mentor matches successfully', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const menteeId = 1;
      const matches = [
        {
          mentorId: 2,
          matchScore: 0.85,
          compatibilityFactors: '{}',
          recommendationReasons: '{}'
        }
      ];

      mockPrisma.aIMentorMatch.deleteMany.mockResolvedValue({});
      mockPrisma.aIMentorMatch.createMany.mockResolvedValue({});

      await service.storeMentorMatches(menteeId, matches);

      expect(mockPrisma.aIMentorMatch.deleteMany).toHaveBeenCalledWith({
        where: {
          menteeId,
          expiresAt: { lt: expect.any(Date) }
        }
      });
      expect(mockPrisma.aIMentorMatch.createMany).toHaveBeenCalledWith({
        data: expect.any(Array)
      });
    });

    it('should handle errors during mentor match storage', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      mockPrisma.aIMentorMatch.deleteMany.mockRejectedValue(new Error('Database error'));

      await expect(
        service.storeMentorMatches(1, [])
      ).rejects.toThrow('Database error');
      
      expect(logger.error).toHaveBeenCalledWith('Error storing mentor matches:', expect.any(Error));
    });
  });

  describe('storePredictions', () => {
    it('should store predictions successfully', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const userId = 1;
      const predictions = [
        {
          predictionType: 'ENGAGEMENT',
          predictionData: '{}',
          confidence: 0.8,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      ];

      mockPrisma.aIPrediction.deleteMany.mockResolvedValue({});
      mockPrisma.aIPrediction.createMany.mockResolvedValue({});

      await service.storePredictions(userId, predictions, 'ENGAGEMENT');

      expect(mockPrisma.aIPrediction.deleteMany).toHaveBeenCalledWith({
        where: {
          userId,
          predictionType: 'ENGAGEMENT',
          expiresAt: { lt: expect.any(Date) }
        }
      });
      expect(mockPrisma.aIPrediction.createMany).toHaveBeenCalledWith({
        data: expect.any(Array)
      });
    });

    it('should handle errors during prediction storage', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      mockPrisma.aIPrediction.deleteMany.mockRejectedValue(new Error('Database error'));

      await expect(
        service.storePredictions(1, [], 'ENGAGEMENT')
      ).rejects.toThrow('Database error');
      
      expect(logger.error).toHaveBeenCalledWith('Error storing predictions:', expect.any(Error));
    });
  });

  describe('storeInsights', () => {
    it('should store insights successfully', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const insights = [
        {
          insightType: 'USER_TREND',
          title: 'Peak Activity Time',
          description: 'Users are most active at 14:00',
          insightData: '{}',
          confidence: 0.8,
          impact: 'MEDIUM'
        }
      ];

      mockPrisma.aIInsight.createMany.mockResolvedValue({});

      await service.storeInsights(insights, 'USER_TREND');

      expect(mockPrisma.aIInsight.createMany).toHaveBeenCalledWith({
        data: expect.any(Array)
      });
    });

    it('should handle errors during insight storage', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      mockPrisma.aIInsight.createMany.mockRejectedValue(new Error('Database error'));

      await expect(
        service.storeInsights([], 'USER_TREND')
      ).rejects.toThrow('Database error');
      
      expect(logger.error).toHaveBeenCalledWith('Error storing insights:', expect.any(Error));
    });
  });

  describe('getAnalyticsMetrics', () => {
    it('should get analytics metrics successfully', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const timeRange = '30d';
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const mockEvents = [
        { eventType: 'PAGE_VIEW', timestamp: new Date() },
        { eventType: 'POST_LIKE', timestamp: new Date() }
      ];

      const mockMetrics = {
        timeRange,
        totalEvents: 100,
        uniqueUsers: 50,
        topEventTypes: [
          { eventType: 'PAGE_VIEW', count: 50 },
          { eventType: 'POST_LIKE', count: 30 }
        ],
        userEngagement: {
          averageDailyEngagement: 10,
          peakEngagement: 20,
          activeDays: 5
        },
        generatedAt: new Date()
      };

      mockPrisma.aIAnalyticsEvent.count.mockResolvedValue(100);
      mockPrisma.aIAnalyticsEvent.groupBy
        .mockResolvedValueOnce([{ _count: { eventType: 50 }, eventType: 'PAGE_VIEW' }])
        .mockResolvedValueOnce([{ _count: { eventType: 30 }, eventType: 'POST_LIKE' }]);
      mockPrisma.aIAnalyticsEvent.groupBy.mockResolvedValue([{ userId: 1 }, { userId: 1 }]);
      mockPrisma.aIAnalyticsEvent.findMany.mockResolvedValue(mockEvents);

      jest.spyOn(service, 'calculateUserEngagementMetrics').mockReturnValue({
        averageDailyEngagement: 10,
        peakEngagement: 20,
        activeDays: 5
      });

      const result = await service.getAnalyticsMetrics(timeRange);

      expect(result.timeRange).toBe(timeRange);
      expect(result.totalEvents).toBe(100);
      expect(result.uniqueUsers).toBe(50);
      expect(result.topEventTypes).toHaveLength(2);
      expect(result.userEngagement).toBeDefined();
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should handle errors during metrics retrieval', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      mockPrisma.aIAnalyticsEvent.count.mockRejectedValue(new Error('Database error'));

      await expect(
        service.getAnalyticsMetrics('30d')
      ).rejects.toThrow('Database error');
      
      expect(logger.error).toHaveBeenCalledWith('Error getting analytics metrics:', expect.any(Error));
    });
  });

  describe('clearCacheForUser', () => {
    it('should clear cache for specific user', () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const userId = 1;
      const mockKeys = [
        'content_recommendations_1_POST_10_PERSONALIZED',
        'predictions_1_ENAGEMENT',
        'insights_USER_TREND'
      ];

      mockCache.keys.mockReturnValue(mockKeys);
      mockCache.del.mockImplementation(() => {});

      service.clearCacheForUser(userId);

      expect(mockCache.keys).toHaveBeenCalled();
      expect(mockCache.del).toHaveBeenCalledTimes(mockKeys.length);
    });

    it('should handle empty cache keys', () => {
      const service = require('../../src/services/ai.analytics.service');
      
      mockCache.keys.mockReturnValue([]);

      service.clearCacheForUser(1);

      expect(mockCache.keys).toHaveBeenCalled();
      expect(mockCache.del).not.toHaveBeenCalled();
    });
  });

  describe('clearAllCache', () => {
    it('should clear all cache', () => {
      const service = require('../../src/services/ai.analytics.service');
      
      mockCache.flushAll.mockImplementation(() => {});

      service.clearAllCache();

      expect(mockCache.flushAll).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should get cache statistics', () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const mockStats = {
        keys: 10,
        hits: 100,
        misses: 20,
        ksize: 1024,
        vsize: 2048
      };

      mockCache.getStats.mockReturnValue(mockStats);

      const result = service.getCacheStats();

      expect(result).toEqual(mockStats);
      expect(mockCache.getStats).toHaveBeenCalled();
    });
  });

  describe('parseTimeRange', () => {
    it('should parse time range correctly', () => {
      const service = require('../../src/services/ai.analytics.service');
      
      expect(service.parseTimeRange('1d')).toBe(24 * 60 * 60 * 1000);
      expect(service.parseTimeRange('7d')).toBe(7 * 24 * 60 * 60 * 1000);
      expect(service.parseTimeRange('30d')).toBe(30 * 24 * 60 * 60 * 1000);
      expect(service.parseTimeRange('90d')).toBe(90 * 24 * 60 * 60 * 1000);
      expect(service.parseTimeRange('invalid')).toBe(30 * 24 * 60 * 60 * 1000); // Default to 30d
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent event tracking', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const events = Array.from({ length: 100 }, (_, i) => ({
        userId: 1,
        eventType: 'PAGE_VIEW',
        eventData: { page: `/page${i}` }
      }));

      mockPrisma.aIAnalyticsEvent.create.mockResolvedValue({ id: i + 1 });

      const results = await Promise.all(
        events.map(event => service.trackAnalyticsEvent(event.userId, event.eventType, event.eventData))
      );

      expect(results).toHaveLength(100);
      expect(mockPrisma.aIAnalyticsEvent.create).toHaveBeenCalledTimes(100);
    });

    it('should handle large recommendation sets', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const userId = 1;
      const options = { limit: 1000 };

      mockPrisma.aIUserBehavior.findUnique.mockResolvedValue({
        behaviorType: 'CONTENT_PREFERENCE',
        behaviorData: JSON.stringify({})
      });
      mockPrisma.aIAnalyticsEvent.findMany.mockResolvedValue([]);
      mockPrisma.post.findMany.mockResolvedValue(Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        title: `Post ${i + 1}`,
        category: 'TECHNOLOGY',
        author: { id: 1, name: 'Author 1' },
        _count: { likes: 10, comments: 5 }
      })));
      mockPrisma.aIContentRecommendation.deleteMany.mockResolvedValue({});
      mockPrisma.aIContentRecommendation.createMany.mockResolvedValue({});

      const result = await service.generateContentRecommendations(userId, options);

      expect(result).toHaveLength(1000);
      expect(mockPrisma.aIContentRecommendation.createMany).toHaveBeenCalled();
    });

    it('should handle memory pressure gracefully', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      // Simulate memory pressure
      const memoryUsage = {
        heapUsed: 600 * 1024 * 1024, // 600MB
        heapTotal: 500 * 1024 * 1024 // 500MB
      };
      process.memoryUsage = memoryUsage;

      const result = await service.generateContentRecommendations(1, { limit: 10 });

      // Should still work even under memory pressure
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle invalid JSON data gracefully', async () => {
      const service = require('../../src/services/ai.analytics.service');
      
      const eventData = {
        userId: 1,
        eventType: 'PAGE_VIEW',
        eventData: { invalid: 'json' }
      };

      mockPrisma.aIAnalyticsEvent.create.mockResolvedValue({
        id: 1,
        eventData: JSON.stringify(eventData.eventData)
      });

      const result = await service.trackAnalyticsEvent(
        eventData.userId,
        eventData.eventType,
        eventData.eventData
      );

      expect(result).toBeDefined();
      expect(result.eventData).toBe('{"invalid":"json"}');
    });
  });
});
