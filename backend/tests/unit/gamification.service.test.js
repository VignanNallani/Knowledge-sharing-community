const { PrismaClient } = require('@prisma/client');
const gamificationService = require('../../src/services/gamification.service');
const logger = require('../../src/utils/logger.util');

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../src/utils/logger.util');

describe('GamificationService', () => {
  let mockPrisma;
  let mockCache;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock Prisma client
    mockPrisma = {
      badge: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn()
      },
      achievement: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn()
      },
      leaderboard: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn()
      },
      userPoint: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
        aggregate: jest.fn()
      },
      userActivity: {
        create: jest.fn(),
        findMany: jest.fn()
      },
      userBadge: {
        findMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn()
      },
      userAchievement: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn()
      },
      leaderboardEntry: {
        findMany: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
        findFirst: jest.fn()
      },
      post: {
        count: jest.fn()
      },
      like: {
        count: jest.fn()
      },
      comment: {
        count: jest.fn()
      },
      mentorship: {
        count: jest.fn()
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn()
      }
    };

    // Mock Prisma constructor
    PrismaClient.mockImplementation(() => mockPrisma);

    // Mock cache
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      flushAll: jest.fn(),
      getStats: jest.fn()
    };

    // Mock NodeCache
    jest.doMock('node-cache', () => {
      return jest.fn().mockImplementation(() => mockCache);
    });

    // Mock logger
    logger.info = jest.fn();
    logger.error = jest.fn();
    logger.warn = jest.fn();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('initializeDefaultData', () => {
    it('should initialize default badges, achievements, and leaderboards', async () => {
      // Mock successful upserts
      mockPrisma.badge.upsert.mockResolvedValue({});
      mockPrisma.achievement.upsert.mockResolvedValue({});
      mockPrisma.leaderboard.upsert.mockResolvedValue({});

      // Create new instance to trigger initialization
      const service = require('../../src/services/gamification.service');

      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPrisma.badge.upsert).toHaveBeenCalledTimes(5);
      expect(mockPrisma.achievement.upsert).toHaveBeenCalledTimes(18);
      expect(mockPrisma.leaderboard.upsert).toHaveBeenCalledTimes(7);
      expect(logger.info).toHaveBeenCalledWith('Gamification service initialized successfully');
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock error during badge creation
      mockPrisma.badge.upsert.mockRejectedValue(new Error('Database error'));

      // Create new instance to trigger initialization
      const service = require('../../src/services/gamification.service');

      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(logger.error).toHaveBeenCalledWith('Error initializing gamification service:', expect.any(Error));
    });
  });

  describe('awardPoints', () => {
    it('should award points to user successfully', async () => {
      const userId = 1;
      const points = 10;
      const activityType = 'POST_CREATED';
      const description = 'Created a post';

      // Mock database responses
      mockPrisma.userActivity.create.mockResolvedValue({});
      mockPrisma.userPoint.aggregate.mockResolvedValue({ _sum: { points: 100 } });
      mockPrisma.userPoint.upsert.mockResolvedValue({});

      // Mock event emission
      const emitSpy = jest.spyOn(gamificationService, 'emit');
      
      // Mock other methods
      gamificationService.checkAndAwardAchievements = jest.fn().mockResolvedValue([]);
      gamificationService.updateRelevantLeaderboards = jest.fn().mockResolvedValue();

      const result = await gamificationService.awardPoints(userId, points, activityType, null, description);

      expect(mockPrisma.userActivity.create).toHaveBeenCalledWith({
        data: {
          userId,
          activityType,
          entityType: null,
          entityId: null,
          pointsEarned: points,
          description,
          metadata: '{}'
        }
      });

      expect(mockPrisma.userPoint.aggregate).toHaveBeenCalledWith({
        where: { userId },
        _sum: { points: true }
      });

      expect(mockPrisma.userPoint.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: { points: 110 },
        create: {
          userId,
          points: 110,
          activityType,
          description: 'Points awarded for POST_CREATED'
        }
      });

      expect(result).toEqual({
        currentPoints: 110,
        pointsAwarded: points,
        activityType
      });

      expect(emitSpy).toHaveBeenCalledWith('pointsAwarded', {
        userId,
        points,
        currentPoints: 110,
        activityType,
        description
      });
    });

    it('should handle errors when awarding points', async () => {
      const userId = 1;
      const points = 10;
      const activityType = 'POST_CREATED';

      // Mock database error
      mockPrisma.userActivity.create.mockRejectedValue(new Error('Database error'));

      await expect(gamificationService.awardPoints(userId, points, activityType))
        .rejects.toThrow('Database error');

      expect(logger.error).toHaveBeenCalledWith('Error awarding points:', expect.any(Error));
    });

    it('should handle metadata correctly', async () => {
      const userId = 1;
      const points = 10;
      const activityType = 'POST_CREATED';
      const metadata = { entityType: 'POST', postId: 123 };

      mockPrisma.userActivity.create.mockResolvedValue({});
      mockPrisma.userPoint.aggregate.mockResolvedValue({ _sum: { points: 0 } });
      mockPrisma.userPoint.upsert.mockResolvedValue({});
      
      gamificationService.checkAndAwardAchievements = jest.fn().mockResolvedValue([]);
      gamificationService.updateRelevantLeaderboards = jest.fn().mockResolvedValue();

      await gamificationService.awardPoints(userId, points, activityType, null, null, metadata);

      expect(mockPrisma.userActivity.create).toHaveBeenCalledWith({
        data: {
          userId,
          activityType,
          entityType: 'POST',
          entityId: null,
          pointsEarned: points,
          description: null,
          metadata: JSON.stringify(metadata)
        }
      });
    });
  });

  describe('getUserPoints', () => {
    it('should get user points from cache', async () => {
      const userId = 1;
      const cachedPoints = { userId, totalPoints: 100, level: 5 };

      mockCache.get.mockReturnValue(cachedPoints);

      const result = await gamificationService.getUserPoints(userId);

      expect(mockCache.get).toHaveBeenCalledWith(`user_points_${userId}`);
      expect(result).toEqual(cachedPoints);
      expect(mockPrisma.userPoint.aggregate).not.toHaveBeenCalled();
    });

    it('should get user points from database when not cached', async () => {
      const userId = 1;
      const dbPoints = { _sum: { points: 100 } };

      mockCache.get.mockReturnValue(null);
      mockPrisma.userPoint.aggregate.mockResolvedValue(dbPoints);

      const result = await gamificationService.getUserPoints(userId);

      expect(mockPrisma.userPoint.aggregate).toHaveBeenCalledWith({
        where: { userId },
        _sum: { points: true }
      });

      expect(result).toEqual({
        userId,
        totalPoints: 100,
        level: expect.any(Number)
      });

      expect(mockCache.set).toHaveBeenCalledWith(`user_points_${userId}`, result);
    });

    it('should handle zero points correctly', async () => {
      const userId = 1;
      const dbPoints = { _sum: { points: null } };

      mockCache.get.mockReturnValue(null);
      mockPrisma.userPoint.aggregate.mockResolvedValue(dbPoints);

      const result = await gamificationService.getUserPoints(userId);

      expect(result.totalPoints).toBe(0);
      expect(result.level).toBe(1);
    });

    it('should handle errors when getting user points', async () => {
      const userId = 1;

      mockCache.get.mockReturnValue(null);
      mockPrisma.userPoint.aggregate.mockRejectedValue(new Error('Database error'));

      await expect(gamificationService.getUserPoints(userId))
        .rejects.toThrow('Database error');

      expect(logger.error).toHaveBeenCalledWith('Error getting user points:', expect.any(Error));
    });
  });

  describe('getUserBadges', () => {
    it('should get user badges from cache', async () => {
      const userId = 1;
      const cachedBadges = [{ id: 1, badge: { name: 'Test Badge' } }];

      mockCache.get.mockReturnValue(cachedBadges);

      const result = await gamificationService.getUserBadges(userId);

      expect(mockCache.get).toHaveBeenCalledWith(`user_badges_${userId}`);
      expect(result).toEqual(cachedBadges);
      expect(mockPrisma.userBadge.findMany).not.toHaveBeenCalled();
    });

    it('should get user badges from database when not cached', async () => {
      const userId = 1;
      const dbBadges = [{ id: 1, badge: { name: 'Test Badge' } }];

      mockCache.get.mockReturnValue(null);
      mockPrisma.userBadge.findMany.mockResolvedValue(dbBadges);

      const result = await gamificationService.getUserBadges(userId);

      expect(mockPrisma.userBadge.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          badge: true
        },
        orderBy: {
          earnedAt: 'desc'
        }
      });

      expect(result).toEqual(dbBadges);
      expect(mockCache.set).toHaveBeenCalledWith(`user_badges_${userId}`, dbBadges);
    });

    it('should handle errors when getting user badges', async () => {
      const userId = 1;

      mockCache.get.mockReturnValue(null);
      mockPrisma.userBadge.findMany.mockRejectedValue(new Error('Database error'));

      await expect(gamificationService.getUserBadges(userId))
        .rejects.toThrow('Database error');

      expect(logger.error).toHaveBeenCalledWith('Error getting user badges:', expect.any(Error));
    });
  });

  describe('getUserAchievements', () => {
    it('should get user achievements from cache', async () => {
      const userId = 1;
      const cachedAchievements = [{ id: 1, achievement: { name: 'Test Achievement' } }];

      mockCache.get.mockReturnValue(cachedAchievements);

      const result = await gamificationService.getUserAchievements(userId);

      expect(mockCache.get).toHaveBeenCalledWith(`user_achievements_${userId}`);
      expect(result).toEqual(cachedAchievements);
      expect(mockPrisma.userAchievement.findMany).not.toHaveBeenCalled();
    });

    it('should get user achievements from database when not cached', async () => {
      const userId = 1;
      const dbAchievements = [{ id: 1, achievement: { name: 'Test Achievement' } }];

      mockCache.get.mockReturnValue(null);
      mockPrisma.userAchievement.findMany.mockResolvedValue(dbAchievements);

      const result = await gamificationService.getUserAchievements(userId);

      expect(mockPrisma.userAchievement.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          achievement: true
        },
        orderBy: {
          progress: 'desc'
        }
      });

      expect(result).toEqual(dbAchievements);
      expect(mockCache.set).toHaveBeenCalledWith(`user_achievements_${userId}`, dbAchievements);
    });

    it('should handle errors when getting user achievements', async () => {
      const userId = 1;

      mockCache.get.mockReturnValue(null);
      mockPrisma.userAchievement.findMany.mockRejectedValue(new Error('Database error'));

      await expect(gamificationService.getUserAchievements(userId))
        .rejects.toThrow('Database error');

      expect(logger.error).toHaveBeenCalledWith('Error getting user achievements:', expect.any(Error));
    });
  });

  describe('calculateLevel', () => {
    it('should calculate level correctly for various experience points', () => {
      expect(gamificationService.calculateLevel(0)).toBe(1);
      expect(gamificationService.calculateLevel(100)).toBe(2);
      expect(gamificationService.calculateLevel(300)).toBe(3);
      expect(gamificationService.calculateLevel(600)).toBe(4);
      expect(gamificationService.calculateLevel(1000)).toBe(5);
    });

    it('should handle edge cases', () => {
      expect(gamificationService.calculateLevel(-100)).toBe(0);
      expect(gamificationService.calculateLevel(null)).toBe(0);
      expect(gamificationService.calculateLevel(undefined)).toBe(0);
    });
  });

  describe('checkAndAwardAchievements', () => {
    it('should check and award achievements correctly', async () => {
      const userId = 1;
      const achievements = [
        { id: 1, name: 'First Post', type: 'POSTS_CREATED', criteria: JSON.stringify({ target: 1 }), points: 10, isActive: true },
        { id: 2, name: 'First Like', type: 'LIKES_RECEIVED', criteria: JSON.stringify({ target: 1 }), points: 5, isActive: true }
      ];

      mockPrisma.achievement.findMany.mockResolvedValue(achievements);
      mockPrisma.userAchievement.findUnique.mockResolvedValue(null);
      mockPrisma.userAchievement.create.mockResolvedValue({});
      
      // Mock progress calculation
      gamificationService.calculateAchievementProgress = jest.fn()
        .mockResolvedValueOnce(100) // First achievement completed
        .mockResolvedValueOnce(50);  // Second achievement in progress

      // Mock points awarding
      gamificationService.awardPoints = jest.fn().mockResolvedValue({});
      gamificationService.awardBadge = jest.fn().mockResolvedValue(1);

      const result = await gamificationService.checkAndAwardAchievements(userId);

      expect(mockPrisma.achievement.findMany).toHaveBeenCalledWith({
        where: { isActive: true }
      });

      expect(gamificationService.calculateAchievementProgress).toHaveBeenCalledTimes(2);
      expect(gamificationService.awardPoints).toHaveBeenCalledWith(userId, 10, 'achievement', 1, 'Achievement unlocked: First Post', {"target": 1});
      expect(gamificationService.awardBadge).toHaveBeenCalledWith(userId, 'BRONZE', 'First Post', 'Create your first post');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        name: 'First Post',
        badgeType: 'BRONZE',
        pointsReward: 10
      });
    });

    it('should skip already completed achievements', async () => {
      const userId = 1;
      const achievements = [{ id: 1, name: 'First Post', type: 'POSTS_CREATED', criteria: '{}', points: 10, isActive: true }];

      mockPrisma.achievement.findMany.mockResolvedValue(achievements);
      mockPrisma.userAchievement.findUnique.mockResolvedValue({ progress: 100, completedAt: new Date() });

      const result = await gamificationService.checkAndAwardAchievements(userId);

      expect(gamificationService.calculateAchievementProgress).not.toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });

    it('should handle errors during achievement checking', async () => {
      const userId = 1;

      mockPrisma.achievement.findMany.mockRejectedValue(new Error('Database error'));

      await expect(gamificationService.checkAndAwardAchievements(userId))
        .rejects.toThrow('Database error');

      expect(logger.error).toHaveBeenCalledWith('Error checking achievements:', expect.any(Error));
    });
  });

  describe('calculateAchievementProgress', () => {
    it('should calculate progress for POSTS_CREATED achievement', async () => {
      const userId = 1;
      const achievementType = 'POSTS_CREATED';
      const requirements = { target: 10 };

      mockPrisma.post.count.mockResolvedValue(5);

      const progress = await gamificationService.calculateAchievementProgress(userId, achievementType, requirements);

      expect(mockPrisma.post.count).toHaveBeenCalledWith({
        where: {
          authorId: userId,
          isPublished: true
        }
      });

      expect(progress).toBe(50); // 5/10 * 100
    });

    it('should calculate progress for LIKES_RECEIVED achievement', async () => {
      const userId = 1;
      const achievementType = 'LIKES_RECEIVED';
      const requirements = { target: 100 };

      mockPrisma.like.count.mockResolvedValue(25);

      const progress = await gamificationService.calculateAchievementProgress(userId, achievementType, requirements);

      expect(mockPrisma.like.count).toHaveBeenCalledWith({
        where: {
          post: {
            authorId: userId
          }
        }
      });

      expect(progress).toBe(25); // 25/100 * 100
    });

    it('should calculate progress for COMMENTS_POSTED achievement', async () => {
      const userId = 1;
      const achievementType = 'COMMENTS_POSTED';
      const requirements = { target: 50 };

      mockPrisma.comment.count.mockResolvedValue(10);

      const progress = await gamificationService.calculateAchievementProgress(userId, achievementType, requirements);

      expect(mockPrisma.comment.count).toHaveBeenCalledWith({
        where: {
          authorId: userId
        }
      });

      expect(progress).toBe(20); // 10/50 * 100
    });

    it('should handle unknown achievement types', async () => {
      const userId = 1;
      const achievementType = 'UNKNOWN_TYPE';
      const requirements = { target: 10 };

      const progress = await gamificationService.calculateAchievementProgress(userId, achievementType, requirements);

      expect(progress).toBe(0);
    });

    it('should handle errors during progress calculation', async () => {
      const userId = 1;
      const achievementType = 'POSTS_CREATED';
      const requirements = { target: 10 };

      mockPrisma.post.count.mockRejectedValue(new Error('Database error'));

      const progress = await gamificationService.calculateAchievementProgress(userId, achievementType, requirements);

      expect(progress).toBe(0);
      expect(logger.error).toHaveBeenCalledWith('Error calculating achievement progress:', expect.any(Error));
    });
  });

  describe('awardBadge', () => {
    it('should award new badge to user', async () => {
      const userId = 1;
      const badgeType = 'BRONZE';
      const name = 'Test Badge';
      const description = 'Test Description';

      mockPrisma.badge.findUnique.mockResolvedValue(null);
      mockPrisma.badge.create.mockResolvedValue({ id: 1, name, type: badgeType, tier: badgeType });
      mockPrisma.userBadge.findUnique.mockResolvedValue(null);
      mockPrisma.userBadge.create.mockResolvedValue({});

      const emitSpy = jest.spyOn(gamificationService, 'emit');

      const result = await gamificationService.awardBadge(userId, badgeType, name, description);

      expect(mockPrisma.badge.create).toHaveBeenCalledWith({
        name,
        description,
        type: badgeType,
        tier: badgeType,
        pointsValue: 10
      });

      expect(mockPrisma.userBadge.create).toHaveBeenCalledWith({
        userId,
        badgeId: 1
      });

      expect(emitSpy).toHaveBeenCalledWith('badgeEarned', {
        userId,
        badge: expect.objectContaining({
          id: 1,
          name,
          description,
          type: badgeType,
          tier: badgeType,
          pointsValue: 10
        })
      });

      expect(result).toBe(1);
    });

    it('should not award duplicate badge', async () => {
      const userId = 1;
      const badgeType = 'BRONZE';
      const name = 'Test Badge';
      const description = 'Test Description';

      const existingBadge = { id: 1, name, type: badgeType, tier: badgeType };
      mockPrisma.badge.findUnique.mockResolvedValue(existingBadge);
      mockPrisma.userBadge.findUnique.mockResolvedValue({ userId, badgeId: 1 });

      const result = await gamificationService.awardBadge(userId, badgeType, name, description);

      expect(mockPrisma.userBadge.create).not.toHaveBeenCalled();
      expect(result).toBe(1);
    });

    it('should handle errors when awarding badge', async () => {
      const userId = 1;
      const badgeType = 'BRONZE';
      const name = 'Test Badge';

      mockPrisma.badge.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(gamificationService.awardBadge(userId, badgeType, name))
        .rejects.toThrow('Database error');

      expect(logger.error).toHaveBeenCalledWith('Error awarding badge:', expect.any(Error));
    });
  });

  describe('getLeaderboard', () => {
    it('should get leaderboard from cache', async () => {
      const type = 'GLOBAL';
      const skillFilter = null;
      const limit = 50;
      const cachedLeaderboard = [{ userId: 1, rank: 1, score: 100 }];

      mockCache.get.mockReturnValue(cachedLeaderboard);

      const result = await gamificationService.getLeaderboard(type, skillFilter, limit);

      expect(mockCache.get).toHaveBeenCalledWith(`leaderboard_${type}_${skillFilter}_${limit}`);
      expect(result).toEqual(cachedLeaderboard);
      expect(mockPrisma.leaderboard.findFirst).not.toHaveBeenCalled();
    });

    it('should get leaderboard from database when not cached', async () => {
      const type = 'GLOBAL';
      const skillFilter = null;
      const limit = 50;
      const leaderboardRecord = { id: 1, name: 'Global Points', type, isActive: true };
      const dbLeaderboard = [{ userId: 1, rank: 1, score: 100 }];

      mockCache.get.mockReturnValue(null);
      mockPrisma.leaderboard.findFirst.mockResolvedValue(leaderboardRecord);
      mockPrisma.leaderboardEntry.findMany.mockResolvedValue(dbLeaderboard);

      const result = await gamificationService.getLeaderboard(type, skillFilter, limit);

      expect(mockPrisma.leaderboard.findFirst).toHaveBeenCalledWith({
        where: {
          type,
          skillFilter,
          isActive: true
        }
      });

      expect(mockPrisma.leaderboardEntry.findMany).toHaveBeenCalledWith({
        where: {
          leaderboardId: 1
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profileImage: true
            }
          },
          userPoints: {
            select: {
              level: true,
              totalPointsEarned: true
            }
          }
        },
        orderBy: {
          rank: 'asc'
        },
        take: limit
      });

      expect(result).toEqual(dbLeaderboard);
      expect(mockCache.set).toHaveBeenCalledWith(`leaderboard_${type}_${skillFilter}_${limit}`, dbLeaderboard);
    });

    it('should return empty array when leaderboard not found', async () => {
      const type = 'UNKNOWN';
      const skillFilter = null;
      const limit = 50;

      mockCache.get.mockReturnValue(null);
      mockPrisma.leaderboard.findFirst.mockResolvedValue(null);

      const result = await gamificationService.getLeaderboard(type, skillFilter, limit);

      expect(result).toEqual([]);
      expect(mockPrisma.leaderboardEntry.findMany).not.toHaveBeenCalled();
    });

    it('should handle errors when getting leaderboard', async () => {
      const type = 'GLOBAL';
      const skillFilter = null;
      const limit = 50;

      mockCache.get.mockReturnValue(null);
      mockPrisma.leaderboard.findFirst.mockRejectedValue(new Error('Database error'));

      await expect(gamificationService.getLeaderboard(type, skillFilter, limit))
        .rejects.toThrow('Database error');

      expect(logger.error).toHaveBeenCalledWith('Error getting leaderboard:', expect.any(Error));
    });
  });

  describe('updateLeaderboard', () => {
    it('should update global leaderboard correctly', async () => {
      const leaderboardId = 1;
      const leaderboardRecord = { id: 1, name: 'Global Points', type: 'GLOBAL' };
      const entries = [{ userId: 1, score: 100 }, { userId: 2, score: 90 }];

      mockPrisma.leaderboard.findUnique.mockResolvedValue(leaderboardRecord);
      mockPrisma.leaderboardEntry.deleteMany.mockResolvedValue({});
      mockPrisma.leaderboardEntry.create.mockResolvedValue({});
      mockPrisma.leaderboards.update.mockResolvedValue({});

      gamificationService.getGlobalLeaderboardEntries = jest.fn().mockResolvedValue(entries);

      const result = await gamificationService.updateLeaderboard(leaderboardId);

      expect(mockPrisma.leaderboardEntry.deleteMany).toHaveBeenCalledWith({
        where: { leaderboardId }
      });

      expect(mockPrisma.leaderboardEntry.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.leaderboardEntry.create).toHaveBeenCalledWith({
        data: {
          leaderboardId,
          userId: 1,
          rank: 1,
          score: 100
        }
      });

      expect(mockPrisma.leaderboards.update).toHaveBeenCalledWith({
        where: { id: leaderboardId },
        data: {
          updatedAt: expect.any(Date)
        }
      });

      expect(result).toBe(2);
    });

    it('should handle ties in leaderboard correctly', async () => {
      const leaderboardId = 1;
      const leaderboardRecord = { id: 1, name: 'Global Points', type: 'GLOBAL' };
      const entries = [{ userId: 1, score: 100 }, { userId: 2, score: 100 }, { userId: 3, score: 90 }];

      mockPrisma.leaderboard.findUnique.mockResolvedValue(leaderboardRecord);
      mockPrisma.leaderboardEntry.deleteMany.mockResolvedValue({});
      mockPrisma.leaderboardEntry.create.mockResolvedValue({});
      mockPrisma.leaderboards.update.mockResolvedValue({});

      gamificationService.getGlobalLeaderboardEntries = jest.fn().mockResolvedValue(entries);

      await gamificationService.updateLeaderboard(leaderboardId);

      // Check that ties are handled correctly (same rank for same scores)
      expect(mockPrisma.leaderboardEntry.create).toHaveBeenCalledWith({
        data: {
          leaderboardId,
          userId: 1,
          rank: 1,
          score: 100
        }
      });

      expect(mockPrisma.leaderboardEntry.create).toHaveBeenCalledWith({
        data: {
          leaderboardId,
          userId: 2,
          rank: 1,
          score: 100
        }
      });

      expect(mockPrisma.leaderboardEntry.create).toHaveBeenCalledWith({
        data: {
          leaderboardId,
          userId: 3,
          rank: 3,
          score: 90
        }
      });
    });

    it('should return 0 when leaderboard not found', async () => {
      const leaderboardId = 1;

      mockPrisma.leaderboard.findUnique.mockResolvedValue(null);

      const result = await gamificationService.updateLeaderboard(leaderboardId);

      expect(result).toBe(0);
      expect(mockPrisma.leaderboardEntry.deleteMany).not.toHaveBeenCalled();
    });

    it('should handle errors when updating leaderboard', async () => {
      const leaderboardId = 1;

      mockPrisma.leaderboard.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(gamificationService.updateLeaderboard(leaderboardId))
        .rejects.toThrow('Database error');

      expect(logger.error).toHaveBeenCalledWith('Error updating leaderboard:', expect.any(Error));
    });
  });

  describe('cache operations', () => {
    it('should clear user-specific cache', () => {
      const userId = 1;

      gamificationService.clearCache(userId);

      expect(mockCache.del).toHaveBeenCalledWith(`user_points_${userId}`);
      expect(mockCache.del).toHaveBeenCalledWith(`user_badges_${userId}`);
      expect(mockCache.del).toHaveBeenCalledWith(`user_achievements_${userId}`);
      expect(mockCache.del).toHaveBeenCalledWith(`user_summary_${userId}`);
    });

    it('should clear all cache', () => {
      gamificationService.clearCache();

      expect(mockCache.flushAll).toHaveBeenCalled();
    });

    it('should get cache stats', () => {
      const stats = { keys: 10, ksize: 1024, vsize: 2048 };
      mockCache.getStats.mockReturnValue(stats);

      const result = gamificationService.getCacheStats();

      expect(result).toEqual(stats);
      expect(mockCache.getStats).toHaveBeenCalled();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null/undefined userId gracefully', async () => {
      await expect(gamificationService.getUserPoints(null))
        .rejects.toThrow();

      await expect(gamificationService.getUserBadges(undefined))
        .rejects.toThrow();

      await expect(gamificationService.getUserAchievements(''))
        .rejects.toThrow();
    });

    it('should handle database connection errors', async () => {
      const userId = 1;

      mockCache.get.mockReturnValue(null);
      mockPrisma.userPoint.aggregate.mockRejectedValue(new Error('Connection timeout'));

      await expect(gamificationService.getUserPoints(userId))
        .rejects.toThrow('Connection timeout');

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle malformed JSON in criteria', async () => {
      const userId = 1;
      const achievementType = 'POSTS_CREATED';
      const requirements = { target: 10 };

      mockPrisma.post.count.mockResolvedValue(5);

      // Test with valid JSON string
      const progress1 = await gamificationService.calculateAchievementProgress(userId, achievementType, JSON.stringify(requirements));
      expect(progress1).toBe(50);

      // Test with malformed JSON (should handle gracefully)
      const progress2 = await gamificationService.calculateAchievementProgress(userId, achievementType, 'invalid json');
      expect(progress2).toBe(0);
    });
  });
});
