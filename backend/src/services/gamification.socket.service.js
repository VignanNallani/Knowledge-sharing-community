import logger from '../utils/logger.util.js';
import gamificationService from './gamification.service.js';

class GamificationSocketService {
  constructor(io) {
    this.io = io;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen to gamification service events
    gamificationService.on('pointsAwarded', (data) => {
      this.broadcastPointsUpdate(data);
    });

    gamificationService.on('badgeEarned', (data) => {
      this.broadcastBadgeEarned(data);
    });

    gamificationService.on('achievementUnlocked', (data) => {
      this.broadcastAchievementUnlocked(data);
    });

    gamificationService.on('leaderboardUpdated', (data) => {
      this.broadcastLeaderboardUpdate(data);
    });

    gamificationService.on('levelUp', (data) => {
      this.broadcastLevelUp(data);
    });

    gamificationService.on('streakMilestone', (data) => {
      this.broadcastStreakMilestone(data);
    });

    logger.info('Gamification socket service event listeners setup complete');
  }

  // Handle user connection
  handleUserConnection(socket) {
    const userId = socket.userId;
    
    if (!userId) {
      logger.warn('Socket connection without userId');
      return;
    }

    // Join user to their personal room for targeted updates
    socket.join(`user_${userId}`);
    
    // Join global gamification room
    socket.join('gamification_global');
    
    logger.info(`User ${userId} connected to gamification socket service`);

    // Send initial gamification data
    this.sendInitialGamificationData(socket, userId);

    // Handle socket events
    socket.on('subscribe_leaderboard', (data) => {
      this.handleLeaderboardSubscription(socket, data);
    });

    socket.on('unsubscribe_leaderboard', (data) => {
      this.handleLeaderboardUnsubscription(socket, data);
    });

    socket.on('get_realtime_points', async () => {
      try {
        const points = await gamificationService.getUserPoints(userId);
        socket.emit('points_update', {
          userId,
          points: points.totalPoints,
          level: points.level,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Error getting realtime points:', error);
        socket.emit('error', { message: 'Failed to get points data' });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`User ${userId} disconnected from gamification socket service`);
    });
  }

  async sendInitialGamificationData(socket, userId) {
    try {
      // Get user's gamification summary
      const summary = await gamificationService.getUserGamificationSummary(userId);
      
      socket.emit('gamification_init', {
        userId,
        points: summary.points,
        badges: summary.badges,
        achievements: summary.achievements,
        dailyStreak: summary.dailyStreak,
        weeklyStreak: summary.weeklyStreak,
        timestamp: new Date().toISOString()
      });

      // Send current leaderboard positions
      const globalRank = await gamificationService.getUserLeaderboardRank(userId, 'GLOBAL');
      if (globalRank) {
        socket.emit('leaderboard_rank', {
          type: 'GLOBAL',
          rank: globalRank.rankPosition,
          totalUsers: globalRank.totalUsers,
          score: globalRank.score
        });
      }

    } catch (error) {
      logger.error('Error sending initial gamification data:', error);
      socket.emit('error', { message: 'Failed to load gamification data' });
    }
  }

  broadcastPointsUpdate(data) {
    const { userId, points, currentPoints, activityType, description } = data;
    
    // Send to specific user
    this.io.to(`user_${userId}`).emit('points_update', {
      userId,
      points: currentPoints,
      pointsAwarded: points,
      activityType,
      description,
      timestamp: new Date().toISOString()
    });

    // Send to global room for real-time updates
    this.io.to('gamification_global').emit('global_points_update', {
      userId,
      points: currentPoints,
      activityType,
      timestamp: new Date().toISOString()
    });

    logger.info(`Broadcasted points update for user ${userId}: +${points} points`);
  }

  broadcastBadgeEarned(data) {
    const { userId, badge } = data;
    
    // Send to specific user
    this.io.to(`user_${userId}`).emit('badge_earned', {
      userId,
      badge,
      timestamp: new Date().toISOString()
    });

    // Send to global room for community celebration
    this.io.to('gamification_global').emit('community_badge', {
      userId,
      badgeName: badge.name,
      badgeTier: badge.tier,
      timestamp: new Date().toISOString()
    });

    logger.info(`Broadcasted badge earned for user ${userId}: ${badge.name}`);
  }

  broadcastAchievementUnlocked(data) {
    const { userId, achievement } = data;
    
    // Send to specific user
    this.io.to(`user_${userId}`).emit('achievement_unlocked', {
      userId,
      achievement,
      timestamp: new Date().toISOString()
    });

    // Send to global room for community recognition
    this.io.to('gamification_global').emit('community_achievement', {
      userId,
      achievementName: achievement.name,
      pointsReward: achievement.points,
      timestamp: new Date().toISOString()
    });

    logger.info(`Broadcasted achievement unlocked for user ${userId}: ${achievement.name}`);
  }

  broadcastLeaderboardUpdate(data) {
    const { userId } = data;
    
    // Update all leaderboard subscribers
    this.io.to('gamification_global').emit('leaderboard_updated', {
      userId,
      timestamp: new Date().toISOString()
    });

    // Send specific leaderboard updates to subscribers
    this.broadcastLeaderboardData('GLOBAL');
    this.broadcastLeaderboardData('WEEKLY');
    this.broadcastLeaderboardData('MONTHLY');

    logger.info(`Broadcasted leaderboard update triggered by user ${userId}`);
  }

  async broadcastLeaderboardData(type) {
    try {
      const leaderboard = await gamificationService.getLeaderboard(type, null, 20);
      
      this.io.to(`leaderboard_${type}`).emit('leaderboard_data', {
        type,
        leaderboard,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Error broadcasting leaderboard data for ${type}:`, error);
    }
  }

  broadcastLevelUp(data) {
    const { userId, oldLevel, newLevel, experiencePoints } = data;
    
    // Send to specific user
    this.io.to(`user_${userId}`).emit('level_up', {
      userId,
      oldLevel,
      newLevel,
      experiencePoints,
      timestamp: new Date().toISOString()
    });

    // Send to global room for community celebration
    this.io.to('gamification_global').emit('community_level_up', {
      userId,
      newLevel,
      timestamp: new Date().toISOString()
    });

    logger.info(`Broadcasted level up for user ${userId}: Level ${oldLevel} → ${newLevel}`);
  }

  broadcastStreakMilestone(data) {
    const { userId, streakType, currentStreak, milestone } = data;
    
    // Send to specific user
    this.io.to(`user_${userId}`).emit('streak_milestone', {
      userId,
      streakType,
      currentStreak,
      milestone,
      timestamp: new Date().toISOString()
    });

    // Send to global room for streak celebration
    this.io.to('gamification_global').emit('community_streak', {
      userId,
      streakType,
      currentStreak,
      timestamp: new Date().toISOString()
    });

    logger.info(`Broadcasted streak milestone for user ${userId}: ${currentStreak} days`);
  }

  handleLeaderboardSubscription(socket, data) {
    const { type } = data;
    
    if (!type) {
      socket.emit('error', { message: 'Leaderboard type is required' });
      return;
    }

    // Join leaderboard room
    socket.join(`leaderboard_${type}`);
    
    // Send current leaderboard data
    this.broadcastLeaderboardData(type);
    
    logger.info(`User ${socket.userId} subscribed to ${type} leaderboard`);
  }

  handleLeaderboardUnsubscription(socket, data) {
    const { type } = data;
    
    if (!type) {
      socket.emit('error', { message: 'Leaderboard type is required' });
      return;
    }

    // Leave leaderboard room
    socket.leave(`leaderboard_${type}`);
    
    logger.info(`User ${socket.userId} unsubscribed from ${type} leaderboard`);
  }

  // Public method to trigger manual leaderboard broadcasts
  async refreshAllLeaderboards() {
    try {
      await gamificationService.updateAllLeaderboards();
      
      // Broadcast updated data
      this.broadcastLeaderboardData('GLOBAL');
      this.broadcastLeaderboardData('WEEKLY');
      this.broadcastLeaderboardData('MONTHLY');
      
      logger.info('All leaderboards refreshed and broadcasted');
    } catch (error) {
      logger.error('Error refreshing leaderboards:', error);
    }
  }

  // Get real-time statistics
  async getRealtimeStats() {
    try {
      const stats = await gamificationService.getGamificationStats();
      
      // Broadcast to admin room if needed
      this.io.to('admin_gamification').emit('gamification_stats', {
        ...stats,
        timestamp: new Date().toISOString()
      });
      
      return stats;
    } catch (error) {
      logger.error('Error getting realtime stats:', error);
      throw error;
    }
  }
}

module.exports = GamificationSocketService;
