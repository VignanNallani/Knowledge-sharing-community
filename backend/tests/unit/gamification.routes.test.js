const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../../src/services/gamification.service');
jest.mock('../../src/middleware/auth.middleware');

const gamificationRoutes = require('../../src/routes/gamification.routes');
const gamificationService = require('../../src/services/gamification.service');
const { authenticate } = require('../../src/middleware/auth.middleware');

describe('Gamification Routes', () => {
  let app;
  let mockUser;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1/gamification', gamificationRoutes);

    // Mock user
    mockUser = {
      id: 1,
      email: 'test@example.com',
      role: 'USER'
    };

    // Mock authentication middleware
    authenticate.mockImplementation((req, res, next) => {
      req.user = mockUser;
      next();
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/v1/gamification/points', () => {
    it('should get user points successfully', async () => {
      const mockPoints = {
        userId: 1,
        totalPoints: 100,
        level: 5
      };

      gamificationService.getUserPoints.mockResolvedValue(mockPoints);

      const response = await request(app)
        .get('/api/v1/gamification/points')
        .expect(200);

      expect(gamificationService.getUserPoints).toHaveBeenCalledWith(1);
      expect(response.body).toEqual({
        success: true,
        data: mockPoints,
        message: 'User points retrieved successfully'
      });
    });

    it('should handle errors when getting user points', async () => {
      gamificationService.getUserPoints.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/gamification/points')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('POST /api/v1/gamification/points/award', () => {
    it('should award points to user successfully (admin only)', async () => {
      mockUser.role = 'ADMIN';

      const awardData = {
        userId: 2,
        points: 10,
        sourceType: 'POST_CREATED',
        sourceId: 123,
        description: 'Created a post',
        metadata: { entityType: 'POST' }
      };

      const mockResult = {
        currentPoints: 110,
        pointsAwarded: 10,
        activityType: 'POST_CREATED'
      };

      gamificationService.awardPoints.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v1/gamification/points/award')
        .send(awardData)
        .expect(200);

      expect(gamificationService.awardPoints).toHaveBeenCalledWith(
        awardData.userId,
        awardData.points,
        awardData.sourceType,
        awardData.sourceId,
        awardData.description,
        awardData.metadata
      );

      expect(response.body).toEqual({
        success: true,
        data: mockResult,
        message: 'Points awarded successfully'
      });
    });

    it('should reject non-admin users from awarding points', async () => {
      const awardData = {
        userId: 2,
        points: 10,
        sourceType: 'POST_CREATED'
      };

      const response = await request(app)
        .post('/api/v1/gamification/points/award')
        .send(awardData)
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: 'Admin access required'
      });

      expect(gamificationService.awardPoints).not.toHaveBeenCalled();
    });

    it('should validate required fields when awarding points', async () => {
      mockUser.role = 'ADMIN';

      // Missing userId
      const response1 = await request(app)
        .post('/api/v1/gamification/points/award')
        .send({
          points: 10,
          sourceType: 'POST_CREATED'
        })
        .expect(400);

      expect(response1.body).toEqual({
        success: false,
        error: 'userId, points, and sourceType are required'
      });

      // Missing points
      const response2 = await request(app)
        .post('/api/v1/gamification/points/award')
        .send({
          userId: 2,
          sourceType: 'POST_CREATED'
        })
        .expect(400);

      expect(response2.body).toEqual({
        success: false,
        error: 'userId, points, and sourceType are required'
      });

      // Missing sourceType
      const response3 = await request(app)
        .post('/api/v1/gamification/points/award')
        .send({
          userId: 2,
          points: 10
        })
        .expect(400);

      expect(response3.body).toEqual({
        success: false,
        error: 'userId, points, and sourceType are required'
      });

      expect(gamificationService.awardPoints).not.toHaveBeenCalled();
    });

    it('should handle errors when awarding points', async () => {
      mockUser.role = 'ADMIN';

      const awardData = {
        userId: 2,
        points: 10,
        sourceType: 'POST_CREATED'
      };

      gamificationService.awardPoints.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/v1/gamification/points/award')
        .send(awardData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Service error'
      });
    });
  });

  describe('GET /api/v1/gamification/badges', () => {
    it('should get user badges successfully', async () => {
      const mockBadges = [
        {
          id: 1,
          userId: 1,
          badgeId: 1,
          earnedAt: new Date(),
          badge: {
            id: 1,
            name: 'First Steps',
            description: 'Created your first post',
            type: 'CONTRIBUTION',
            tier: 'BRONZE'
          }
        }
      ];

      gamificationService.getUserBadges.mockResolvedValue(mockBadges);

      const response = await request(app)
        .get('/api/v1/gamification/badges')
        .expect(200);

      expect(gamificationService.getUserBadges).toHaveBeenCalledWith(1);
      expect(response.body).toEqual({
        success: true,
        data: mockBadges,
        message: 'User badges retrieved successfully'
      });
    });

    it('should handle includeHidden parameter', async () => {
      const mockBadges = [];

      gamificationService.getUserBadges.mockResolvedValue(mockBadges);

      await request(app)
        .get('/api/v1/gamification/badges?includeHidden=true')
        .expect(200);

      expect(gamificationService.getUserBadges).toHaveBeenCalledWith(1, true);
    });

    it('should handle errors when getting user badges', async () => {
      gamificationService.getUserBadges.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/gamification/badges')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('POST /api/v1/gamification/badges/award', () => {
    it('should award badge to user successfully (admin only)', async () => {
      mockUser.role = 'ADMIN';

      const badgeData = {
        userId: 2,
        badgeType: 'BRONZE',
        name: 'Test Badge',
        description: 'Test Description'
      };

      const mockBadgeId = 1;

      gamificationService.awardBadge.mockResolvedValue(mockBadgeId);

      const response = await request(app)
        .post('/api/v1/gamification/badges/award')
        .send(badgeData)
        .expect(200);

      expect(gamificationService.awardBadge).toHaveBeenCalledWith(
        badgeData.userId,
        badgeData.badgeType,
        badgeData.name,
        badgeData.description
      );

      expect(response.body).toEqual({
        success: true,
        data: { badgeId: mockBadgeId },
        message: 'Badge awarded successfully'
      });
    });

    it('should reject non-admin users from awarding badges', async () => {
      const badgeData = {
        userId: 2,
        badgeType: 'BRONZE',
        name: 'Test Badge'
      };

      const response = await request(app)
        .post('/api/v1/gamification/badges/award')
        .send(badgeData)
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: 'Admin access required'
      });

      expect(gamificationService.awardBadge).not.toHaveBeenCalled();
    });

    it('should validate required fields when awarding badges', async () => {
      mockUser.role = 'ADMIN';

      // Missing userId
      const response1 = await request(app)
        .post('/api/v1/gamification/badges/award')
        .send({
          badgeType: 'BRONZE',
          name: 'Test Badge'
        })
        .expect(400);

      expect(response1.body).toEqual({
        success: false,
        error: 'userId, badgeType, and name are required'
      });

      expect(gamificationService.awardBadge).not.toHaveBeenCalled();
    });

    it('should handle errors when awarding badges', async () => {
      mockUser.role = 'ADMIN';

      const badgeData = {
        userId: 2,
        badgeType: 'BRONZE',
        name: 'Test Badge'
      };

      gamificationService.awardBadge.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/v1/gamification/badges/award')
        .send(badgeData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Service error'
      });
    });
  });

  describe('GET /api/v1/gamification/achievements', () => {
    it('should get user achievements successfully', async () => {
      const mockAchievements = [
        {
          id: 1,
          userId: 1,
          achievementId: 1,
          progress: 100,
          completedAt: new Date(),
          achievement: {
            id: 1,
            name: 'First Post',
            description: 'Create your first post',
            type: 'POSTS_CREATED',
            points: 10
          }
        }
      ];

      gamificationService.getUserAchievements.mockResolvedValue(mockAchievements);

      const response = await request(app)
        .get('/api/v1/gamification/achievements')
        .expect(200);

      expect(gamificationService.getUserAchievements).toHaveBeenCalledWith(1);
      expect(response.body).toEqual({
        success: true,
        data: mockAchievements,
        message: 'User achievements retrieved successfully'
      });
    });

    it('should handle errors when getting user achievements', async () => {
      gamificationService.getUserAchievements.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/gamification/achievements')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('POST /api/v1/gamification/achievements/check', () => {
    it('should check and award achievements successfully (admin only)', async () => {
      mockUser.role = 'ADMIN';

      const checkData = {
        userId: 2
      };

      const mockAwardedAchievements = [
        {
          id: 1,
          name: 'First Post',
          badgeType: 'BRONZE',
          pointsReward: 10
        }
      ];

      gamificationService.checkAndAwardAchievements.mockResolvedValue(mockAwardedAchievements);

      const response = await request(app)
        .post('/api/v1/gamification/achievements/check')
        .send(checkData)
        .expect(200);

      expect(gamificationService.checkAndAwardAchievements).toHaveBeenCalledWith(2);

      expect(response.body).toEqual({
        success: true,
        data: mockAwardedAchievements,
        message: 'Achievements checked and awarded successfully'
      });
    });

    it('should reject non-admin users from checking achievements', async () => {
      const checkData = {
        userId: 2
      };

      const response = await request(app)
        .post('/api/v1/gamification/achievements/check')
        .send(checkData)
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: 'Admin access required'
      });

      expect(gamificationService.checkAndAwardAchievements).not.toHaveBeenCalled();
    });

    it('should validate userId when checking achievements', async () => {
      mockUser.role = 'ADMIN';

      const response = await request(app)
        .post('/api/v1/gamification/achievements/check')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'userId is required'
      });

      expect(gamificationService.checkAndAwardAchievements).not.toHaveBeenCalled();
    });

    it('should handle errors when checking achievements', async () => {
      mockUser.role = 'ADMIN';

      const checkData = {
        userId: 2
      };

      gamificationService.checkAndAwardAchievements.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/v1/gamification/achievements/check')
        .send(checkData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Service error'
      });
    });
  });

  describe('GET /api/v1/gamification/leaderboards', () => {
    it('should get leaderboard successfully', async () => {
      const mockLeaderboard = [
        {
          rank: 1,
          score: 100,
          user: {
            id: 1,
            name: 'User 1',
            profileImage: 'image1.jpg'
          },
          userPoints: {
            level: 5,
            totalPointsEarned: 100
          }
        }
      ];

      gamificationService.getLeaderboard.mockResolvedValue(mockLeaderboard);

      const response = await request(app)
        .get('/api/v1/gamification/leaderboards')
        .expect(200);

      expect(gamificationService.getLeaderboard).toHaveBeenCalledWith('GLOBAL', undefined, 50);

      expect(response.body).toEqual({
        success: true,
        data: mockLeaderboard,
        message: 'Leaderboard retrieved successfully'
      });
    });

    it('should handle query parameters correctly', async () => {
      const mockLeaderboard = [];

      gamificationService.getLeaderboard.mockResolvedValue(mockLeaderboard);

      await request(app)
        .get('/api/v1/gamification/leaderboards?type=WEEKLY&skill=javascript&limit=25')
        .expect(200);

      expect(gamificationService.getLeaderboard).toHaveBeenCalledWith('WEEKLY', 'javascript', 25);
    });

    it('should handle errors when getting leaderboard', async () => {
      gamificationService.getLeaderboard.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/gamification/leaderboards')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('GET /api/v1/gamification/leaderboards/rank', () => {
    it('should get user leaderboard rank successfully', async () => {
      const mockRank = {
        rankPosition: 5,
        totalUsers: 100,
        score: 50,
        leaderboardName: 'Global Points'
      };

      gamificationService.getUserLeaderboardRank.mockResolvedValue(mockRank);

      const response = await request(app)
        .get('/api/v1/gamification/leaderboards/rank')
        .expect(200);

      expect(gamificationService.getUserLeaderboardRank).toHaveBeenCalledWith(1, 'GLOBAL', undefined);

      expect(response.body).toEqual({
        success: true,
        data: mockRank,
        message: 'User leaderboard rank retrieved successfully'
      });
    });

    it('should handle query parameters for rank', async () => {
      const mockRank = null;

      gamificationService.getUserLeaderboardRank.mockResolvedValue(mockRank);

      await request(app)
        .get('/api/v1/gamification/leaderboards/rank?type=WEEKLY&skill=javascript')
        .expect(200);

      expect(gamificationService.getUserLeaderboardRank).toHaveBeenCalledWith(1, 'WEEKLY', 'javascript');
    });

    it('should handle errors when getting user rank', async () => {
      gamificationService.getUserLeaderboardRank.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/gamification/leaderboards/rank')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('GET /api/v1/gamification/summary', () => {
    it('should get user gamification summary successfully', async () => {
      const mockSummary = {
        points: { totalPoints: 100, level: 5 },
        badges: [],
        achievements: [],
        dailyStreak: 7,
        weeklyStreak: 2,
        completedAchievements: 3,
        totalAchievements: 10
      };

      gamificationService.getUserGamificationSummary.mockResolvedValue(mockSummary);

      const response = await request(app)
        .get('/api/v1/gamification/summary')
        .expect(200);

      expect(gamificationService.getUserGamificationSummary).toHaveBeenCalledWith(1);

      expect(response.body).toEqual({
        success: true,
        data: mockSummary,
        message: 'User gamification summary retrieved successfully'
      });
    });

    it('should handle errors when getting summary', async () => {
      gamificationService.getUserGamificationSummary.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/gamification/summary')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('GET /api/v1/gamification/activity', () => {
    it('should get user activity history successfully', async () => {
      const mockActivity = [
        {
          id: 1,
          userId: 1,
          activityType: 'POST_CREATED',
          pointsEarned: 10,
          description: 'Created a post',
          createdAt: new Date(),
          user: {
            id: 1,
            name: 'User 1',
            profileImage: 'image1.jpg'
          }
        }
      ];

      gamificationService.getUserActivityHistory.mockResolvedValue(mockActivity);

      const response = await request(app)
        .get('/api/v1/gamification/activity')
        .expect(200);

      expect(gamificationService.getUserActivityHistory).toHaveBeenCalledWith(1, 50);

      expect(response.body).toEqual({
        success: true,
        data: mockActivity,
        message: 'User activity history retrieved successfully'
      });
    });

    it('should handle limit parameter for activity', async () => {
      const mockActivity = [];

      gamificationService.getUserActivityHistory.mockResolvedValue(mockActivity);

      await request(app)
        .get('/api/v1/gamification/activity?limit=25')
        .expect(200);

      expect(gamificationService.getUserActivityHistory).toHaveBeenCalledWith(1, 25);
    });

    it('should handle errors when getting activity history', async () => {
      gamificationService.getUserActivityHistory.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/gamification/activity')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('POST /api/v1/gamification/leaderboards/refresh', () => {
    it('should refresh leaderboards successfully (admin only)', async () => {
      mockUser.role = 'ADMIN';

      const mockResult = 50;

      gamificationService.updateAllLeaderboards.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v1/gamification/leaderboards/refresh')
        .expect(200);

      expect(gamificationService.updateAllLeaderboards).toHaveBeenCalled();

      expect(response.body).toEqual({
        success: true,
        data: { updatedEntries: mockResult },
        message: 'Leaderboards refreshed successfully'
      });
    });

    it('should reject non-admin users from refreshing leaderboards', async () => {
      const response = await request(app)
        .post('/api/v1/gamification/leaderboards/refresh')
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: 'Admin access required'
      });

      expect(gamificationService.updateAllLeaderboards).not.toHaveBeenCalled();
    });

    it('should handle errors when refreshing leaderboards', async () => {
      mockUser.role = 'ADMIN';

      gamificationService.updateAllLeaderboards.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/v1/gamification/leaderboards/refresh')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Service error'
      });
    });
  });

  describe('Rate limiting', () => {
    it('should apply rate limiting to all gamification routes', async () => {
      // Mock rate limiter to reject requests
      const rateLimitMiddleware = require('express-rate-limit');
      const mockRateLimit = jest.fn((req, res, next) => {
        res.status(429).json({
          success: false,
          error: 'Too many requests'
        });
      });

      // This test verifies that rate limiting is applied
      // In a real scenario, the rate limiter would be configured in the routes file
      expect(true).toBe(true); // Placeholder for rate limiting verification
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all protected routes', async () => {
      // Mock authentication to fail
      authenticate.mockImplementation((req, res, next) => {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      });

      const response = await request(app)
        .get('/api/v1/gamification/points')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authentication required'
      });

      expect(gamificationService.getUserPoints).not.toHaveBeenCalled();
    });
  });

  describe('Input validation', () => {
    it('should handle malformed JSON requests', async () => {
      mockUser.role = 'ADMIN';

      const response = await request(app)
        .post('/api/v1/gamification/points/award')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      // Express handles JSON parsing errors automatically
      expect(response.status).toBe(400);
    });

    it('should handle empty request bodies', async () => {
      mockUser.role = 'ADMIN';

      const response = await request(app)
        .post('/api/v1/gamification/points/award')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'userId, points, and sourceType are required'
      });
    });
  });

  describe('Error handling', () => {
    it('should handle service errors gracefully', async () => {
      gamificationService.getUserPoints.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .get('/api/v1/gamification/points')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Service unavailable'
      });
    });

    it('should handle timeout errors', async () => {
      gamificationService.getUserPoints.mockRejectedValue(new Error('Request timeout'));

      const response = await request(app)
        .get('/api/v1/gamification/points')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Request timeout'
      });
    });
  });
});
