const { PrismaClient } = require('@prisma/client');
const analyticsService = require('../../src/services/analytics.service');

// Mock Prisma Client
jest.mock('@prisma/client');
jest.mock('../../src/utils/logger.util');

describe('AnalyticsService', () => {
  let mockPrisma;
  let mockGlobalIO;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPrisma = {
      analyticsEvents: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn()
      },
      userActivityLogs: {
        create: jest.fn(),
        findMany: jest.fn()
      },
      sessionEngagementMetrics: {
        findMany: jest.fn()
      },
      mentorPerformanceMetrics: {
        findFirst: jest.fn(),
        findMany: jest.fn()
      },
      mentorshipSession: {
        findMany: jest.fn(),
        count: jest.fn()
      },
      user: {
        count: jest.fn()
      },
      like: {
        count: jest.fn()
      },
      comment: {
        count: jest.fn()
      },
      follow: {
        count: jest.fn()
      },
      bookmark: {
        count: jest.fn()
      },
      post: {
        findMany: jest.fn()
      }
    };

    mockGlobalIO = {
      emit: jest.fn(),
      to: jest.fn(() => mockGlobalIO),
      join: jest.fn(() => mockGlobalIO)
    };

    global.io = mockGlobalIO;
    PrismaClient.mockImplementation(() => mockPrisma);
  });

  describe('trackEvent', () => {
    it('should track analytics event successfully', async () => {
      const userId = 1;
      const eventType = 'PAGE_VIEW';
      const eventData = { page: '/dashboard' };
      const sessionId = 'session_123';
      
      const mockEvent = {
        id: 1,
        userId,
        eventType,
        eventData,
        sessionId,
        createdAt: new Date()
      };

      mockPrisma.analyticsEvents.create.mockResolvedValue(mockEvent);

      const result = await analyticsService.trackEvent(
        userId,
        eventType,
        eventData,
        sessionId,
        { ipAddress: '127.0.0.1', userAgent: 'Mozilla/5.0' }
      );

      expect(mockPrisma.analyticsEvents.create).toHaveBeenCalledWith({
        userId,
        eventType,
        eventData,
        sessionId,
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        referrer: undefined
      });

      expect(mockGlobalIO.emit).toHaveBeenCalledWith('analytics_event', {
        type: eventType,
        userId,
        data: eventData,
        timestamp: mockEvent.createdAt
      });

      expect(result).toEqual(mockEvent);
    });

    it('should handle missing required fields', async () => {
      const userId = 1;
      const eventType = null;

      await expect(analyticsService.trackEvent(userId, eventType))
        .rejects.toThrow();
    });
  });

  describe('trackUserActivity', () => {
    it('should track user activity successfully', async () => {
      const userId = 1;
      const activityType = 'POST_CREATE';
      const entityType = 'post';
      const entityId = 123;
      const activityData = { title: 'Test Post' };
      const duration = 5000;
      
      const mockActivity = {
        id: 1,
        userId,
        activityType,
        entityType,
        entityId,
        activityData,
        durationMs: duration,
        createdAt: new Date()
      };

      mockPrisma.userActivityLogs.create.mockResolvedValue(mockActivity);

      const result = await analyticsService.trackUserActivity(
        userId,
        activityType,
        entityType,
        entityId,
        activityData,
        duration
      );

      expect(mockPrisma.userActivityLogs.create).toHaveBeenCalledWith({
        userId,
        activityType,
        entityType,
        entityId,
        activityData,
        durationMs: duration
      });

      expect(mockGlobalIO.emit).toHaveBeenCalledWith('user_activity', {
        type: activityType,
        data: mockActivity,
        timestamp: mockActivity.createdAt
      });

      expect(result).toEqual(mockActivity);
    });

    it('should track activity without optional fields', async () => {
      const userId = 1;
      const activityType = 'LOGIN';
      
      const mockActivity = {
        id: 1,
        userId,
        activityType,
        createdAt: new Date()
      };

      mockPrisma.userActivityLogs.create.mockResolvedValue(mockActivity);

      const result = await analyticsService.trackUserActivity(userId, activityType);

      expect(mockPrisma.userActivityLogs.create).toHaveBeenCalledWith({
        userId,
        activityType,
        entityType: null,
        entityId: null,
        activityData: {},
        durationMs: null
      });

      expect(result).toEqual(mockActivity);
    });
  });

  describe('getSessionEngagementMetrics', () => {
    it('should get session engagement metrics successfully', async () => {
      const sessionId = 1;
      const filters = { startDate: '2024-01-01', endDate: '2024-01-31' };
      
      const mockMetrics = [
        {
          id: 1,
          sessionId,
          engagementScore: 85.5,
          interactionCount: 10,
          totalDurationMinutes: 60,
          ratingGiven: 5,
          feedbackGiven: true,
          completionRate: 100,
          session: {
            id: sessionId,
            title: 'Test Session',
            scheduledAt: new Date(),
            status: 'COMPLETED',
            mentor: { id: 1, name: 'John Doe', profileImage: 'avatar.jpg' },
            mentee: { id: 2, name: 'Jane Smith', profileImage: 'avatar2.jpg' }
          }
        }
      ];

      mockPrisma.sessionEngagementMetrics.findMany.mockResolvedValue(mockMetrics);

      const result = await analyticsService.getSessionEngagementMetrics(sessionId, filters);

      expect(mockPrisma.sessionEngagementMetrics.findMany).toHaveBeenCalledWith({
        where: {
          sessionId,
          createdAt: { gte: new Date('2024-01-01') }
        },
        include: {
          session: {
            select: {
              id: true,
              title: true,
              scheduledAt: true,
              status: true,
              mentor: {
                select: {
                  id: true,
                  name: true,
                  profileImage: true
                }
              },
              mentee: {
                select: {
                  id: true,
                  name: true,
                  profileImage: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      expect(result).toEqual(mockMetrics);
    });

    it('should return cached metrics', async () => {
      const sessionId = 1;
      const filters = {};
      
      const mockMetrics = [{ id: 1, sessionId: 1 }];
      mockPrisma.sessionEngagementMetrics.findMany.mockResolvedValue(mockMetrics);

      // First call should hit database
      const result1 = await analyticsService.getSessionEngagementMetrics(sessionId, filters);
      expect(result1).toEqual(mockMetrics);

      // Second call should use cache
      const result2 = await analyticsService.getSessionEngagementMetrics(sessionId, filters);
      expect(result2).toEqual(mockMetrics);
      
      // Should only call database once
      expect(mockPrisma.sessionEngagementMetrics.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMentorPerformanceMetrics', () => {
    it('should get mentor performance metrics successfully', async () => {
      const mentorId = 1;
      const timeRange = '30d';
      
      const mockPerformanceData = {
        mentorId,
        totalSessions: 10,
        completedSessions: 8,
        averageRating: 4.5,
        totalMentees: 5,
        responseTimeAvg: 15,
        availabilityScore: 80,
        engagementScore: 90,
        revenueGenerated: 500,
        calculatedAt: new Date()
      };

      const mockSessionData = [
        {
          id: 1,
          title: 'Test Session',
          createdAt: new Date(),
          status: 'COMPLETED',
          feedback: { rating: 5 },
          mentee: { id: 2, name: 'Jane Smith', profileImage: 'avatar.jpg' }
        }
      ];

      mockPrisma.mentorPerformanceMetrics.findFirst.mockResolvedValue(mockPerformanceData);
      mockPrisma.mentorshipSession.findMany.mockResolvedValue(mockSessionData);

      const result = await analyticsService.getMentorPerformanceMetrics(mentorId, timeRange);

      expect(result).toEqual({
        performance: mockPerformanceData,
        recentSessions: mockSessionData,
        calculatedAt: expect.any(Date)
      });
    });

    it('should calculate metrics when not available', async () => {
      const mentorId = 1;
      const timeRange = '30d';
      
      const mockSessions = [
        {
          id: 1,
          createdAt: new Date(),
          status: 'COMPLETED',
          feedback: { rating: 5 },
          menteeId: 2
        },
        {
          id: 2,
          createdAt: new Date(),
          status: 'COMPLETED',
          feedback: { rating: 4 },
          menteeId: 3
        }
      ];

      mockPrisma.mentorPerformanceMetrics.findFirst.mockResolvedValue(null);
      mockPrisma.mentorshipSession.findMany.mockResolvedValue(mockSessions);

      const result = await analyticsService.getMentorPerformanceMetrics(mentorId, timeRange);

      expect(result.performance).toEqual({
        mentorId,
        totalSessions: 2,
        completedSessions: 2,
        averageRating: 4.5,
        totalMentees: 2,
        responseTimeAvg: expect.any(Number),
        availabilityScore: 100,
        engagementScore: expect.any(Number),
        revenueGenerated: 0,
        calculatedAt: expect.any(Date)
      });
    });
  });

  describe('getUserAnalytics', () => {
    it('should get user analytics successfully', async () => {
      const userId = 1;
      const filters = { timeRange: '30d', eventTypes: ['PAGE_VIEW', 'POST_CREATE'], groupBy: 'day' };
      
      const mockEvents = [
        {
          id: 1,
          userId,
          eventType: 'PAGE_VIEW',
          eventData: { page: '/dashboard' },
          createdAt: new Date()
        }
      ];

      const mockActivities = [
        {
          id: 1,
          userId,
          activityType: 'POST_CREATE',
          entityType: 'post',
          entityId: 123,
          activityData: { title: 'Test Post' },
          createdAt: new Date()
        }
      ];

      mockPrisma.analyticsEvents.findMany.mockResolvedValue(mockEvents);
      mockPrisma.userActivityLogs.findMany.mockResolvedValue(mockActivities);

      const result = await analyticsService.getUserAnalytics(userId, filters);

      expect(result).toEqual({
        summary: expect.any(Object),
        timeline: expect.any(Array),
        trends: expect.any(Object)
      });
    });

    it('should process analytics data correctly', async () => {
      const userId = 1;
      const filters = { groupBy: 'day' };
      
      const mockEvents = [
        {
          id: 1,
          userId,
          eventType: 'PAGE_VIEW',
          eventData: { page: '/dashboard' },
          createdAt: new Date('2024-01-01T10:00:00Z')
        },
        {
          id: 2,
          userId,
          eventType: 'POST_LIKE',
          eventData: { postId: 123 },
          createdAt: new Date('2024-01-01T11:00:00Z')
        }
      ];

      mockPrisma.analyticsEvents.findMany.mockResolvedValue(mockEvents);
      mockPrisma.userActivityLogs.findMany.mockResolvedValue([]);

      const result = await analyticsService.getUserAnalytics(userId, filters);

      expect(result.summary).toBeDefined();
      expect(result.timeline).toHaveLength(2);
      expect(result.timeline[0].type).toBe('POST_LIKE'); // Should be sorted by date desc
    });
  });

  describe('getPlatformAnalytics', () => {
    it('should get platform analytics successfully', async () => {
      const filters = { timeRange: '30d', metrics: ['events', 'users', 'sessions', 'engagement'] };
      
      const mockEventStats = [
        { eventType: 'PAGE_VIEW', _count: { eventType: 100 } },
        { eventType: 'POST_CREATE', _count: { eventType: 50 } }
      ];

      const mockUserStats = { total: 1000, active: 500, new: 100 };
      const mockSessionStats = { total: 200, completed: 180, completionRate: 90, averageDuration: 60 };
      const mockEngagementStats = { likes: 500, comments: 200, follows: 150, bookmarks: 75 };

      mockPrisma.analyticsEvents.groupBy
        .mockResolvedValueOnce(mockEventStats)
        .mockResolvedValueOnce({ total: 1000 });
      mockPrisma.user.count
        .mockResolvedValueOnce(500)
        .mockResolvedValueOnce(100);
      mockPrisma.mentorshipSession.count
        .mockResolvedValueOnce(200)
        .mockResolvedValueOnce(180);
      mockPrisma.mentorshipSession.aggregate.mockResolvedValue({ _avg: { duration: 60 } });
      mockPrisma.like.count.mockResolvedValue(500);
      mockPrisma.comment.count.mockResolvedValue(200);
      mockPrisma.follow.count.mockResolvedValue(150);
      mockPrisma.bookmark.count.mockResolvedValue(75);

      const result = await analyticsService.getPlatformAnalytics(filters);

      expect(result).toEqual({
        events: {
          PAGE_VIEW: 100,
          POST_CREATE: 50
        },
        users: mockUserStats,
        sessions: mockSessionStats,
        engagement: mockEngagementStats,
        timeRange: '30d',
        generatedAt: expect.any(Date)
      });
    });

    it('should handle partial metrics', async () => {
      const filters = { timeRange: '30d', metrics: ['events', 'users'] };
      
      const mockEventStats = [{ eventType: 'PAGE_VIEW', _count: { eventType: 100 } }];
      const mockUserStats = { total: 1000, active: 500, new: 100 };

      mockPrisma.analyticsEvents.groupBy.mockResolvedValue(mockEventStats);
      mockPrisma.user.count
        .mockResolvedValueOnce(1000)
        .mockResolvedValueOnce(500)
        .mockResolvedValueOnce(100);

      const result = await analyticsService.getPlatformAnalytics(filters);

      expect(result.events).toEqual({ PAGE_VIEW: 100 });
      expect(result.users).toEqual(mockUserStats);
      expect(result.sessions).toBeNull();
      expect(result.engagement).toBeNull();
    });
  });

  describe('getRealTimeMetrics', () => {
    it('should get real-time metrics successfully', async () => {
      const mockUserStats = [{ userId: 1 }, { userId: 2 }];
      
      mockPrisma.analyticsEvents.groupBy
        .mockResolvedValueOnce(mockUserStats)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce([{ userId: 1 }, { userId: 2 }])
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(50);

      const result = await analyticsService.getRealTimeMetrics();

      expect(result).toEqual({
        lastHour: {
          activeUsers: 2,
          pageViews: 50,
          sessions: 25
        },
        lastDay: {
          activeUsers: 2,
          pageViews: 100,
          sessions: 50
        },
        timestamp: expect.any(Date)
      });
    });

    it('should return cached metrics', async () => {
      mockPrisma.analyticsEvents.groupBy
        .mockResolvedValueOnce([{ userId: 1 }])
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(12);

      // First call should hit database
      const result1 = await analyticsService.getRealTimeMetrics();
      expect(result1).toBeDefined();

      // Second call should use cache
      const result2 = await analyticsService.getRealTimeMetrics();
      expect(result2).toEqual(result1);
      
      // Should only call database once
      expect(mockPrisma.analyticsEvents.groupBy).toHaveBeenCalledTimes(3);
    });
  });

  describe('getTopMentors', () => {
    it('should get top mentors successfully', async () => {
      const timeRange = '30d';
      const limit = 10;
      
      const mockMentors = [
        {
          id: 1,
          mentorId: 1,
          averageRating: 5.0,
          completedSessions: 50,
          engagementScore: 95.5,
          mentor: {
            id: 1,
            name: 'John Doe',
            profileImage: 'avatar.jpg',
            bio: 'Expert mentor',
            skills: ['JavaScript', 'React']
          }
        }
      ];

      mockPrisma.mentorPerformanceMetrics.findMany.mockResolvedValue(mockMentors);

      const result = await analyticsService.getTopMentors(timeRange, limit);

      expect(mockPrisma.mentorPerformanceMetrics.findMany).toHaveBeenCalledWith({
        where: {
          calculatedAt: expect.any(Date)
        },
        include: {
          mentor: {
            select: {
              id: true,
              name: true,
              profileImage: true,
              bio: true,
              skills: true
            }
          }
        },
        orderBy: [
          { averageRating: 'desc' },
          { completedSessions: 'desc' },
          { engagementScore: 'desc' }
        ],
        take: limit
      });

      expect(result).toEqual(mockMentors);
    });
  });

  describe('getTopContent', () => {
    it('should get top content successfully', async () => {
      const timeRange = '30d';
      const limit = 10;
      
      const mockPosts = [
        {
          id: 1,
          title: 'Test Post',
          author: { id: 1, name: 'John Doe', profileImage: 'avatar.jpg' },
          _count: { likes: 100, comments: 25, bookmarks: 10 }
        }
      ];

      const mockSessions = [
        {
          id: 1,
          title: 'Test Session',
          mentor: { id: 1, name: 'John Doe', profileImage: 'avatar.jpg' },
          mentee: { id: 2, name: 'Jane Smith', profileImage: 'avatar2.jpg' },
          feedback: { rating: 5 }
        }
      ];

      mockPrisma.post.findMany.mockResolvedValue(mockPosts);
      mockPrisma.mentorshipSession.findMany.mockResolvedValue(mockSessions);

      const result = await analyticsService.getTopContent(timeRange, limit);

      expect(result).toEqual({
        posts: mockPosts,
        sessions: mockSessions
      });
    });
  });

  describe('utility functions', () => {
    it('should format date for grouping correctly', () => {
      const service = analyticsService;
      
      const date = new Date('2024-01-15T10:30:00Z');
      
      expect(service.formatDateForGrouping(date, 'day')).toBe('2024-01-15');
      expect(service.formatDateForGrouping(date, 'hour')).toMatch(/^2024-01-15T\d{2}:00$/);
      expect(service.formatDateForGrouping(date, 'month')).toBe('2024-01');
    });

    it('should get date range start correctly', () => {
      const service = analyticsService;
      
      const now = new Date('2024-01-15T10:30:00Z');
      
      const result7d = service.getDateRangeStart('7d');
      const expected7d = new Date('2024-01-08T10:30:00Z');
      expect(result7d.getTime()).toBeCloseTo(expected7d.getTime(), 1000);

      const result30d = service.getDateRangeStart('30d');
      const expected30d = new Date('2023-12-16T10:30:00Z');
      expect(result30d.getTime()).toBeCloseTo(expected30d.getTime(), 1000);
    });

    it('should convert to CSV correctly', () => {
      const service = analyticsService;
      
      const data = {
        users: { total: 1000, active: 500 },
        sessions: { total: 200, completed: 180 }
      };

      const csv = service.convertToCSV(data);
      
      expect(csv).toContain('category,metric,value');
      expect(csv).toContain('users,total,1000');
      expect(csv).toContain('users,active,500');
      expect(csv).toContain('sessions,total,200');
      expect(csv).toContain('sessions,completed,180');
    });
  });

  describe('cache management', () => {
    it('should clear cache for event type', () => {
      const service = analyticsService;
      
      // Mock cache
      service.analyticsCache = {
        keys: jest.fn(() => ['analytics_events', 'user_analytics']),
        del: jest.fn(),
        flushAll: jest.fn()
      };

      service.clearCacheForEvent('PAGE_VIEW');

      expect(service.analyticsCache.del).toHaveBeenCalled();
    });

    it('should clear all cache', () => {
      const service = analyticsService;
      
      service.analyticsCache = {
        flushAll: jest.fn()
      };

      service.clearAllCache();

      expect(service.analyticsCache.flushAll).toHaveBeenCalled();
    });

    it('should get cache stats', () => {
      const service = analyticsService;
      
      service.analyticsCache = {
        keys: jest.fn(() => ['key1', 'key2']),
        getStats: jest.fn(() => ({ keys: 2, hits: 100 }))
      };

      const stats = service.getCacheStats();

      expect(stats).toEqual({
        keys: 2,
        stats: { keys: 2, hits: 100 }
      });
    });
  });

  describe('exportAnalytics', () => {
    it('should export as JSON', async () => {
      const service = analyticsService;
      const data = { users: { total: 1000 }, sessions: { total: 200 } };

      const result = service.exportAnalytics('json', {}, data);

      expect(result).toBe(JSON.stringify(data, null, 2));
    });

    it('should export as CSV', async () => {
      const service = analyticsService;
      const data = { users: { total: 1000 }, sessions: { total: 200 } };

      const result = service.exportAnalytics('csv', {}, data);

      expect(result).toContain('category,metric,value');
      expect(result).toContain('users,total,1000');
      expect(result).toContain('sessions,total,200');
    });
  });
});
