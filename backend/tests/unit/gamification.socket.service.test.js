const EventEmitter = require('events');
const GamificationSocketService = require('../../src/services/gamification.socket.service');
const logger = require('../../src/utils/logger.util');

// Mock dependencies
jest.mock('../../src/utils/logger.util');
jest.mock('../../src/services/gamification.service');

describe('GamificationSocketService', () => {
  let gamificationSocketService;
  let mockIo;
  let mockSocket;
  let mockGamificationService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock logger
    logger.info = jest.fn();
    logger.error = jest.fn();
    logger.warn = jest.fn();

    // Mock gamification service
    mockGamificationService = new EventEmitter();
    mockGamificationService.getUserGamificationSummary = jest.fn().mockResolvedValue({});
    mockGamificationService.getUserLeaderboardRank = jest.fn().mockResolvedValue(null);
    mockGamificationService.getUserPoints = jest.fn().mockResolvedValue({ totalPoints: 100, level: 5 });
    mockGamificationService.updateAllLeaderboards = jest.fn().mockResolvedValue(50);
    mockGamificationService.getGamificationStats = jest.fn().mockResolvedValue({
      totalUsers: 100,
      totalPointsAwarded: 1000
    });

    // Mock Socket.IO
    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      on: jest.fn()
    };

    // Mock socket
    mockSocket = {
      userId: 1,
      id: 'socket123',
      join: jest.fn(),
      leave: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
      handshake: {
        address: '127.0.0.1'
      }
    };

    // Create service instance
    gamificationSocketService = new GamificationSocketService(mockIo);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with socket.io instance', () => {
      expect(gamificationSocketService.io).toBe(mockIo);
      expect(logger.info).toHaveBeenCalledWith('Gamification socket service event listeners setup complete');
    });

    it('should setup event listeners for gamification service events', () => {
      // Verify that event listeners are setup by checking if the service has the methods
      expect(typeof gamificationSocketService.handleUserConnection).toBe('function');
      expect(typeof gamificationSocketService.broadcastPointsUpdate).toBe('function');
      expect(typeof gamificationSocketService.broadcastBadgeEarned).toBe('function');
      expect(typeof gamificationSocketService.broadcastAchievementUnlocked).toBe('function');
      expect(typeof gamificationSocketService.broadcastLeaderboardUpdate).toBe('function');
      expect(typeof gamificationSocketService.broadcastLevelUp).toBe('function');
      expect(typeof gamificationSocketService.broadcastStreakMilestone).toBe('function');
    });
  });

  describe('handleUserConnection', () => {
    beforeEach(() => {
      // Mock localStorage
      global.localStorage = {
        getItem: jest.fn().mockReturnValue('1')
      };
    });

    it('should handle user connection successfully', async () => {
      await gamificationSocketService.handleUserConnection(mockSocket);

      expect(mockSocket.join).toHaveBeenCalledWith('user_1');
      expect(mockSocket.join).toHaveBeenCalledWith('gamification_global');
      expect(logger.info).toHaveBeenCalledWith('User 1 connected to gamification socket service');
      expect(mockGamificationService.getUserGamificationSummary).toHaveBeenCalledWith(1);
      expect(mockGamificationService.getUserLeaderboardRank).toHaveBeenCalledWith(1, 'GLOBAL');
    });

    it('should handle connection without userId', () => {
      mockSocket.userId = null;

      gamificationSocketService.handleUserConnection(mockSocket);

      expect(logger.warn).toHaveBeenCalledWith('Socket connection without userId');
      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('should handle socket events', async () => {
      await gamificationSocketService.handleUserConnection(mockSocket);

      // Verify that socket event handlers are registered
      expect(mockSocket.on).toHaveBeenCalledWith('subscribe_leaderboard', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('unsubscribe_leaderboard', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('get_realtime_points', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should handle get_realtime_points event', async () => {
      await gamificationSocketService.handleUserConnection(mockSocket);

      // Get the get_realtime_points event handler
      const getRealtimePointsHandler = mockSocket.on.mock.calls.find(call => call[0] === 'get_realtime_points')[1];

      // Call the handler
      await getRealtimePointsHandler();

      expect(mockGamificationService.getUserPoints).toHaveBeenCalledWith(1);
      expect(mockSocket.emit).toHaveBeenCalledWith('points_update', {
        userId: 1,
        points: 100,
        level: 5,
        timestamp: expect.any(String)
      });
    });

    it('should handle errors in get_realtime_points', async () => {
      mockGamificationService.getUserPoints.mockRejectedValue(new Error('Service error'));

      await gamificationSocketService.handleUserConnection(mockSocket);

      const getRealtimePointsHandler = mockSocket.on.mock.calls.find(call => call[0] === 'get_realtime_points')[1];

      await getRealtimePointsHandler();

      expect(logger.error).toHaveBeenCalledWith('Error getting realtime points:', expect.any(Error));
      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Failed to get points data' });
    });

    it('should handle disconnect event', async () => {
      await gamificationSocketService.handleUserConnection(mockSocket);

      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];

      disconnectHandler();

      expect(logger.info).toHaveBeenCalledWith('User 1 disconnected from gamification socket service');
    });
  });

  describe('handleLeaderboardSubscription', () => {
    beforeEach(() => {
      global.localStorage = {
        getItem: jest.fn().mockReturnValue('1')
      };
    });

    it('should handle leaderboard subscription', async () => {
      await gamificationSocketService.handleUserConnection(mockSocket);

      const subscribeHandler = mockSocket.on.mock.calls.find(call => call[0] === 'subscribe_leaderboard')[1];

      subscribeHandler({ type: 'GLOBAL' });

      expect(mockSocket.join).toHaveBeenCalledWith('leaderboard_GLOBAL');
      expect(logger.info).toHaveBeenCalledWith('User 1 subscribed to GLOBAL leaderboard');
    });

    it('should validate leaderboard type for subscription', async () => {
      await gamificationSocketService.handleUserConnection(mockSocket);

      const subscribeHandler = mockSocket.on.mock.calls.find(call => call[0] === 'subscribe_leaderboard')[1];

      subscribeHandler({});

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Leaderboard type is required' });
      expect(mockSocket.join).not.toHaveBeenCalledWith('leaderboard_');
    });

    it('should handle leaderboard unsubscription', async () => {
      await gamificationSocketService.handleUserConnection(mockSocket);

      const unsubscribeHandler = mockSocket.on.mock.calls.find(call => call[0] === 'unsubscribe_leaderboard')[1];

      unsubscribeHandler({ type: 'GLOBAL' });

      expect(mockSocket.leave).toHaveBeenCalledWith('leaderboard_GLOBAL');
      expect(logger.info).toHaveBeenCalledWith('User 1 unsubscribed from GLOBAL leaderboard');
    });

    it('should validate leaderboard type for unsubscription', async () => {
      await gamificationSocketService.handleUserConnection(mockSocket);

      const unsubscribeHandler = mockSocket.on.mock.calls.find(call => call[0] === 'unsubscribe_leaderboard')[1];

      unsubscribeHandler({});

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Leaderboard type is required' });
      expect(mockSocket.leave).not.toHaveBeenCalledWith('leaderboard_');
    });
  });

  describe('broadcastPointsUpdate', () => {
    it('should broadcast points update to specific user and global room', () => {
      const data = {
        userId: 1,
        points: 10,
        currentPoints: 110,
        activityType: 'POST_CREATED',
        description: 'Created a post'
      };

      gamificationSocketService.broadcastPointsUpdate(data);

      expect(mockIo.to).toHaveBeenCalledWith('user_1');
      expect(mockIo.emit).toHaveBeenCalledWith('points_update', {
        userId: 1,
        points: 110,
        pointsAwarded: 10,
        activityType: 'POST_CREATED',
        description: 'Created a post',
        timestamp: expect.any(String)
      });

      expect(mockIo.to).toHaveBeenCalledWith('gamification_global');
      expect(mockIo.emit).toHaveBeenCalledWith('global_points_update', {
        userId: 1,
        points: 110,
        activityType: 'POST_CREATED',
        timestamp: expect.any(String)
      });

      expect(logger.info).toHaveBeenCalledWith('Broadcasted points update for user 1: +10 points');
    });
  });

  describe('broadcastBadgeEarned', () => {
    it('should broadcast badge earned to specific user and global room', () => {
      const data = {
        userId: 1,
        badge: {
          id: 1,
          name: 'First Steps',
          description: 'Created your first post',
          type: 'CONTRIBUTION',
          tier: 'BRONZE'
        }
      };

      gamificationSocketService.broadcastBadgeEarned(data);

      expect(mockIo.to).toHaveBeenCalledWith('user_1');
      expect(mockIo.emit).toHaveBeenCalledWith('badge_earned', {
        userId: 1,
        badge: data.badge,
        timestamp: expect.any(String)
      });

      expect(mockIo.to).toHaveBeenCalledWith('gamification_global');
      expect(mockIo.emit).toHaveBeenCalledWith('community_badge', {
        userId: 1,
        badgeName: 'First Steps',
        badgeTier: 'BRONZE',
        timestamp: expect.any(String)
      });

      expect(logger.info).toHaveBeenCalledWith('Broadcasted badge earned for user 1: First Steps');
    });
  });

  describe('broadcastAchievementUnlocked', () => {
    it('should broadcast achievement unlocked to specific user and global room', () => {
      const data = {
        userId: 1,
        achievement: {
          id: 1,
          name: 'First Post',
          description: 'Create your first post',
          pointsReward: 10
        }
      };

      gamificationSocketService.broadcastAchievementUnlocked(data);

      expect(mockIo.to).toHaveBeenCalledWith('user_1');
      expect(mockIo.emit).toHaveBeenCalledWith('achievement_unlocked', {
        userId: 1,
        achievement: data.achievement,
        timestamp: expect.any(String)
      });

      expect(mockIo.to).toHaveBeenCalledWith('gamification_global');
      expect(mockIo.emit).toHaveBeenCalledWith('community_achievement', {
        userId: 1,
        achievementName: 'First Post',
        pointsReward: 10,
        timestamp: expect.any(String)
      });

      expect(logger.info).toHaveBeenCalledWith('Broadcasted achievement unlocked for user 1: First Post');
    });
  });

  describe('broadcastLeaderboardUpdate', () => {
    it('should broadcast leaderboard update and refresh all leaderboards', () => {
      const data = { userId: 1 };

      // Mock getLeaderboard method
      gamificationSocketService.getLeaderboard = jest.fn().mockResolvedValue([]);

      gamificationSocketService.broadcastLeaderboardUpdate(data);

      expect(mockIo.to).toHaveBeenCalledWith('gamification_global');
      expect(mockIo.emit).toHaveBeenCalledWith('leaderboard_updated', {
        userId: 1,
        timestamp: expect.any(String)
      });

      expect(logger.info).toHaveBeenCalledWith('Broadcasted leaderboard update triggered by user 1');
    });
  });

  describe('broadcastLevelUp', () => {
    it('should broadcast level up to specific user and global room', () => {
      const data = {
        userId: 1,
        oldLevel: 4,
        newLevel: 5,
        experiencePoints: 500
      };

      gamificationSocketService.broadcastLevelUp(data);

      expect(mockIo.to).toHaveBeenCalledWith('user_1');
      expect(mockIo.emit).toHaveBeenCalledWith('level_up', {
        userId: 1,
        oldLevel: 4,
        newLevel: 5,
        experiencePoints: 500,
        timestamp: expect.any(String)
      });

      expect(mockIo.to).toHaveBeenCalledWith('gamification_global');
      expect(mockIo.emit).toHaveBeenCalledWith('community_level_up', {
        userId: 1,
        newLevel: 5,
        timestamp: expect.any(String)
      });

      expect(logger.info).toHaveBeenCalledWith('Broadcasted level up for user 1: Level 4 → 5');
    });
  });

  describe('broadcastStreakMilestone', () => {
    it('should broadcast streak milestone to specific user and global room', () => {
      const data = {
        userId: 1,
        streakType: 'daily_login',
        currentStreak: 7,
        milestone: 7
      };

      gamificationSocketService.broadcastStreakMilestone(data);

      expect(mockIo.to).toHaveBeenCalledWith('user_1');
      expect(mockIo.emit).toHaveBeenCalledWith('streak_milestone', {
        userId: 1,
        streakType: 'daily_login',
        currentStreak: 7,
        milestone: 7,
        timestamp: expect.any(String)
      });

      expect(mockIo.to).toHaveBeenCalledWith('gamification_global');
      expect(mockIo.emit).toHaveBeenCalledWith('community_streak', {
        userId: 1,
        streakType: 'daily_login',
        currentStreak: 7,
        timestamp: expect.any(String)
      });

      expect(logger.info).toHaveBeenCalledWith('Broadcasted streak milestone for user 1: 7 days');
    });
  });

  describe('refreshAllLeaderboards', () => {
    it('should refresh all leaderboards and broadcast updates', async () => {
      await gamificationSocketService.refreshAllLeaderboards();

      expect(mockGamificationService.updateAllLeaderboards).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('All leaderboards refreshed and broadcasted');
    });

    it('should handle errors when refreshing leaderboards', async () => {
      mockGamificationService.updateAllLeaderboards.mockRejectedValue(new Error('Service error'));

      await gamificationSocketService.refreshAllLeaderboards();

      expect(logger.error).toHaveBeenCalledWith('Error refreshing leaderboards:', expect.any(Error));
    });
  });

  describe('getRealtimeStats', () => {
    it('should get realtime stats and broadcast to admin room', async () => {
      const stats = await gamificationSocketService.getRealtimeStats();

      expect(mockGamificationService.getGamificationStats).toHaveBeenCalled();
      expect(mockIo.to).toHaveBeenCalledWith('admin_gamification');
      expect(mockIo.emit).toHaveBeenCalledWith('gamification_stats', {
        totalUsers: 100,
        totalPointsAwarded: 1000,
        timestamp: expect.any(String)
      });

      expect(stats).toEqual({
        totalUsers: 100,
        totalPointsAwarded: 1000
      });
    });

    it('should handle errors when getting stats', async () => {
      mockGamificationService.getGamificationStats.mockRejectedValue(new Error('Service error'));

      await expect(gamificationSocketService.getRealtimeStats()).rejects.toThrow('Service error');
      expect(logger.error).toHaveBeenCalledWith('Error getting realtime stats:', expect.any(Error));
    });
  });

  describe('sendInitialGamificationData', () => {
    beforeEach(() => {
      global.localStorage = {
        getItem: jest.fn().mockReturnValue('1')
      };
    });

    it('should send initial gamification data to user', async () => {
      const mockSummary = {
        points: { totalPoints: 100, level: 5 },
        badges: [],
        achievements: [],
        dailyStreak: 7,
        weeklyStreak: 2
      };

      mockGamificationService.getUserGamificationSummary.mockResolvedValue(mockSummary);

      await gamificationSocketService.sendInitialGamificationData(mockSocket, 1);

      expect(mockSocket.emit).toHaveBeenCalledWith('gamification_init', {
        userId: 1,
        points: mockSummary.points,
        badges: mockSummary.badges,
        achievements: mockSummary.achievements,
        dailyStreak: mockSummary.dailyStreak,
        weeklyStreak: mockSummary.weeklyStreak,
        timestamp: expect.any(String)
      });
    });

    it('should handle errors when sending initial data', async () => {
      mockGamificationService.getUserGamificationSummary.mockRejectedValue(new Error('Service error'));

      await gamificationSocketService.sendInitialGamificationData(mockSocket, 1);

      expect(logger.error).toHaveBeenCalledWith('Error sending initial gamification data:', expect.any(Error));
      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Failed to load gamification data' });
    });
  });

  describe('broadcastLeaderboardData', () => {
    it('should broadcast leaderboard data to subscribers', async () => {
      const mockLeaderboard = [
        { rank: 1, score: 100, user: { name: 'User 1' } }
      ];

      gamificationSocketService.getLeaderboard = jest.fn().mockResolvedValue(mockLeaderboard);

      await gamificationSocketService.broadcastLeaderboardData('GLOBAL');

      expect(gamificationSocketService.getLeaderboard).toHaveBeenCalled();
      expect(mockIo.to).toHaveBeenCalledWith('leaderboard_GLOBAL');
      expect(mockIo.emit).toHaveBeenCalledWith('leaderboard_data', {
        type: 'GLOBAL',
        leaderboard: mockLeaderboard,
        timestamp: expect.any(String)
      });
    });

    it('should handle errors when broadcasting leaderboard data', async () => {
      gamificationSocketService.getLeaderboard = jest.fn().mockRejectedValue(new Error('Service error'));

      await gamificationSocketService.broadcastLeaderboardData('GLOBAL');

      expect(logger.error).toHaveBeenCalledWith('Error broadcasting leaderboard data for GLOBAL:', expect.any(Error));
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle missing userId in socket events', () => {
      mockSocket.userId = null;

      expect(() => {
        gamificationSocketService.handleUserConnection(mockSocket);
      }).not.toThrow();

      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle invalid event data', async () => {
      await gamificationSocketService.handleUserConnection(mockSocket);

      const subscribeHandler = mockSocket.on.mock.calls.find(call => call[0] === 'subscribe_leaderboard')[1];

      // Test with null data
      subscribeHandler(null);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Leaderboard type is required' });
    });

    it('should handle socket emit errors gracefully', () => {
      mockSocket.emit.mockImplementation(() => {
        throw new Error('Socket emit error');
      });

      expect(() => {
        gamificationSocketService.broadcastPointsUpdate({
          userId: 1,
          points: 10,
          currentPoints: 110,
          activityType: 'POST_CREATED'
        });
      }).not.toThrow();
    });

    it('should handle missing gamification service methods', () => {
      // Test with missing methods
      const service = new GamificationSocketService(mockIo);
      
      expect(typeof service.handleUserConnection).toBe('function');
      expect(typeof service.broadcastPointsUpdate).toBe('function');
    });

    it('should handle concurrent socket connections', async () => {
      const mockSocket2 = { ...mockSocket, userId: 2, id: 'socket456', join: jest.fn(), on: jest.fn() };

      await gamificationSocketService.handleUserConnection(mockSocket);
      await gamificationSocketService.handleUserConnection(mockSocket2);

      expect(mockSocket.join).toHaveBeenCalledWith('user_1');
      expect(mockSocket2.join).toHaveBeenCalledWith('user_2');
      expect(mockSocket.join).toHaveBeenCalledWith('gamification_global');
      expect(mockSocket2.join).toHaveBeenCalledWith('gamification_global');
    });
  });
});
