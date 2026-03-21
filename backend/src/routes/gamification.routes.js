const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const gamificationService = require('../services/gamification.service');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for gamification endpoints
const gamificationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
  message: {
    error: 'Too many gamification requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all gamification routes
router.use(gamificationLimiter);

// Get user points
router.get('/points', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const points = await gamificationService.getUserPoints(userId);

    res.json({
      success: true,
      data: points,
      message: 'User points retrieved successfully'
    });
  } catch (error) {
    console.error('Get user points error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Award points to user (admin only)
router.post('/points/award', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { userId, points, sourceType, sourceId, description, metadata } = req.body;

    if (!userId || !points || !sourceType) {
      return res.status(400).json({
        success: false,
        error: 'userId, points, and sourceType are required'
      });
    }

    const result = await gamificationService.awardPoints(userId, points, sourceType, sourceId, description, metadata);

    res.json({
      success: true,
      data: result,
      message: 'Points awarded successfully'
    });
  } catch (error) {
    console.error('Award points error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user badges
router.get('/badges', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { includeHidden = false } = req.query;

    const badges = await gamificationService.getUserBadges(userId, includeHidden === 'true');

    res.json({
      success: true,
      data: badges,
      message: 'User badges retrieved successfully'
    });
  } catch (error) {
    console.error('Get user badges error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Award badge to user (admin only)
router.post('/badges/award', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { userId, badgeType, name, description } = req.body;

    if (!userId || !badgeType || !name) {
      return res.status(400).json({
        success: false,
        error: 'userId, badgeType, and name are required'
      });
    }

    const badgeId = await gamificationService.awardBadge(userId, badgeType, name, description);

    res.json({
      success: true,
      data: { badgeId },
      message: 'Badge awarded successfully'
    });
  } catch (error) {
    console.error('Award badge error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user achievements
router.get('/achievements', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const achievements = await gamificationService.getUserAchievements(userId);

    res.json({
      success: true,
      data: achievements,
      message: 'User achievements retrieved successfully'
    });
  } catch (error) {
    console.error('Get user achievements error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check and award achievements (admin only)
router.post('/achievements/check', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const awardedAchievements = await gamificationService.checkAndAwardAchievements(userId);

    res.json({
      success: true,
      data: awardedAchievements,
      message: 'Achievements checked and awarded successfully'
    });
  } catch (error) {
    console.error('Check achievements error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get leaderboards
router.get('/leaderboards', authenticate, async (req, res) => {
  try {
    const { type = 'GLOBAL', skill, limit = 50 } = req.query;

    const leaderboard = await gamificationService.getLeaderboard(type, skill, parseInt(limit));

    res.json({
      success: true,
      data: leaderboard,
      message: 'Leaderboard retrieved successfully'
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user leaderboard rank
router.get('/leaderboards/rank', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type = 'GLOBAL', skill } = req.query;

    const rank = await gamificationService.getUserLeaderboardRank(userId, type, skill);

    res.json({
      success: true,
      data: rank,
      message: 'User leaderboard rank retrieved successfully'
    });
  } catch (error) {
    console.error('Get user leaderboard rank error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update leaderboard (admin only)
router.post('/leaderboards/:id/update', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { id } = req.params;
    const leaderboardId = parseInt(id);

    if (isNaN(leaderboardId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid leaderboard ID'
      });
    }

    const updatedCount = await gamificationService.updateLeaderboard(leaderboardId);

    res.json({
      success: true,
      data: { updatedCount },
      message: 'Leaderboard updated successfully'
    });
  } catch (error) {
    console.error('Update leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update all leaderboards (admin only)
router.post('/leaderboards/update-all', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const totalUpdated = await gamificationService.updateAllLeaderboards();

    res.json({
      success: true,
      data: { totalUpdated },
      message: 'All leaderboards updated successfully'
    });
  } catch (error) {
    console.error('Update all leaderboards error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user gamification summary
router.get('/summary', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const summary = await gamificationService.getUserGamificationSummary(userId);

    res.json({
      success: true,
      data: summary,
      message: 'User gamification summary retrieved successfully'
    });
  } catch (error) {
    console.error('Get user gamification summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user activity history
router.get('/activity', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50 } = req.query;

    const activities = await gamificationService.getUserActivityHistory(userId, parseInt(limit));

    res.json({
      success: true,
      data: activities,
      message: 'User activity history retrieved successfully'
    });
  } catch (error) {
    console.error('Get user activity history error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user point transactions
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50 } = req.query;

    const transactions = await gamificationService.getPointTransactions(userId, parseInt(limit));

    res.json({
      success: true,
      data: transactions,
      message: 'User point transactions retrieved successfully'
    });
  } catch (error) {
    console.error('Get user point transactions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update user streak
router.post('/streaks/:type/update', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.params;
    const { activityDate } = req.body;

    if (!['daily_login', 'weekly_activity', 'mentorship_streak'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid streak type'
      });
    }

    const date = activityDate ? new Date(activityDate) : new Date();
    const newStreak = await gamificationService.updateStreak(userId, type, date);

    res.json({
      success: true,
      data: { currentStreak: newStreak },
      message: 'Streak updated successfully'
    });
  } catch (error) {
    console.error('Update streak error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Initialize user gamification (admin only)
router.post('/initialize/:userId', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { userId } = req.params;
    const userIdInt = parseInt(userId);

    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    await gamificationService.initializeUserGamification(userIdInt);

    res.json({
      success: true,
      message: 'User gamification initialized successfully'
    });
  } catch (error) {
    console.error('Initialize user gamification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get gamification statistics (admin only)
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const stats = await gamificationService.getGamificationStats();

    res.json({
      success: true,
      data: stats,
      message: 'Gamification statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Get gamification stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get cache statistics (admin only)
router.get('/cache/stats', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const stats = gamificationService.getCacheStats();

    res.json({
      success: true,
      data: stats,
      message: 'Cache statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Get cache stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear cache (admin only)
router.post('/cache/clear', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { userId } = req.body;

    if (userId) {
      gamificationService.clearCache(userId);
    } else {
      gamificationService.clearCache();
    }

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get available badges (admin only)
router.get('/badges/available', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const badges = await prisma.badges.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });

    res.json({
      success: true,
      data: badges,
      message: 'Available badges retrieved successfully'
    });
  } catch (error) {
    console.error('Get available badges error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get available achievements (admin only)
router.get('/achievements/available', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const achievements = await prisma.achievements.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });

    res.json({
      success: true,
      data: achievements,
      message: 'Available achievements retrieved successfully'
    });
  } catch (error) {
    console.error('Get available achievements error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get available leaderboards (admin only)
router.get('/leaderboards/available', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const leaderboards = await prisma.leaderboards.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: leaderboards,
      message: 'Available leaderboards retrieved successfully'
    });
  } catch (error) {
    console.error('Get available leaderboards error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create custom badge (admin only)
router.post('/badges/create', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { name, description, badgeType, iconUrl, pointsValue, requirements, sortOrder } = req.body;

    if (!name || !description || !badgeType) {
      return res.status(400).json({
        success: false,
        error: 'name, description, and badgeType are required'
      });
    }

    const badge = await prisma.badges.create({
      data: {
        name,
        description,
        badgeType,
        iconUrl,
        pointsValue: pointsValue || 0,
        requirements: requirements || {},
        sortOrder: sortOrder || 0
      }
    });

    res.json({
      success: true,
      data: badge,
      message: 'Badge created successfully'
    });
  } catch (error) {
    console.error('Create badge error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create custom achievement (admin only)
router.post('/achievements/create', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { name, description, achievementType, badgeType, pointsReward, requirements, sortOrder } = req.body;

    if (!name || !description || !achievementType || !badgeType) {
      return res.status(400).json({
        success: false,
        error: 'name, description, achievementType, and badgeType are required'
      });
    }

    const achievement = await prisma.achievements.create({
      data: {
        name,
        description,
        achievementType,
        badgeType,
        pointsReward: pointsReward || 0,
        requirements: requirements || {},
        sortOrder: sortOrder || 0
      }
    });

    res.json({
      success: true,
      data: achievement,
      message: 'Achievement created successfully'
    });
  } catch (error) {
    console.error('Create achievement error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create custom leaderboard (admin only)
router.post('/leaderboards/create', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { name, description, leaderboardType, skillFilter, timePeriod, maxEntries, resetFrequency } = req.body;

    if (!name || !leaderboardType || !timePeriod) {
      return res.status(400).json({
        success: false,
        error: 'name, leaderboardType, and timePeriod are required'
      });
    }

    const leaderboard = await prisma.leaderboards.create({
      data: {
        name,
        description,
        leaderboardType,
        skillFilter,
        timePeriod,
        maxEntries: maxEntries || 100,
        resetFrequency
      }
    });

    res.json({
      success: true,
      data: leaderboard,
      message: 'Leaderboard created successfully'
    });
  } catch (error) {
    console.error('Create leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user gamification preferences
router.get('/preferences', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = await prisma.gamificationPreferences.findUnique({
      where: { userId }
    });

    res.json({
      success: true,
      data: preferences || {
        showBadgesPublicly: true,
        showPointsPublicly: true,
        showAchievementsPublicly: true,
        enableNotifications: true,
        notificationTypes: ['badge_earned', 'achievement_unlocked', 'leaderboard_change'],
        leaderboardPreferences: {
          showGlobal: true,
          showSkillBased: true,
          showFriendBased: true
        }
      },
      message: 'User gamification preferences retrieved successfully'
    });
  } catch (error) {
    console.error('Get user gamification preferences error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update user gamification preferences
router.put('/preferences', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = req.body;

    const updated = await prisma.gamificationPreferences.upsert({
      where: { userId },
      update: preferences,
      create: { userId, ...preferences }
    });

    res.json({
      success: true,
      data: updated,
      message: 'User gamification preferences updated successfully'
    });
  } catch (error) {
    console.error('Update user gamification preferences error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user streaks
router.get('/streaks', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const streaks = await prisma.streakTracking.findMany({
      where: { userId },
      orderBy: { streakType: 'asc' }
    });

    res.json({
      success: true,
      data: streaks,
      message: 'User streaks retrieved successfully'
    });
  } catch (error) {
    console.error('Get user streaks error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get top performers across all categories
router.get('/top-performers', authenticate, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get top users by points
    const topByPoints = await prisma.userPoints.findMany({
      select: {
        userId: true,
        currentPoints: true,
        totalPointsEarned: true,
        level: true,
        user: {
          select: {
            id: true,
            name: true,
            profileImage: true
          }
        }
      },
      orderBy: {
        totalPointsEarned: 'desc'
      },
      take: parseInt(limit)
    });

    // Get top users by badges
    const topByBadges = await prisma.userBadges.groupBy({
      by: ['userId'],
      _count: {
        badgeId: true
      },
      orderBy: {
        _count: {
          badgeId: 'desc'
        }
      },
      take: parseInt(limit)
    });

    // Get top users by achievements
    const topByAchievements = await prisma.userAchievements.groupBy({
      by: ['userId'],
      where: { isCompleted: true },
      _count: {
        achievementId: true
      },
      orderBy: {
        _count: {
          achievementId: 'desc'
        }
      },
      take: parseInt(limit)
    });

    // Enrich with user data
    const userIds = [
      ...topByPoints.map(p => p.userId),
      ...topByBadges.map(p => p.userId),
      ...topByAchievements.map(p => p.userId)
    ];

    const users = await prisma.user.findMany({
      where: {
        id: { in: [...new Set(userIds)] }
      },
      select: {
        id: true,
        name: true,
        profileImage: true
      }
    });

    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    const enrichedBadges = topByBadges.map(item => ({
      ...item,
      user: userMap[item.userId]
    }));

    const enrichedAchievements = topByAchievements.map(item => ({
      ...item,
      user: userMap[item.userId]
    }));

    res.json({
      success: true,
      data: {
        topByPoints,
        topByBadges: enrichedBadges,
        topByAchievements: enrichedAchievements
      },
      message: 'Top performers retrieved successfully'
    });
  } catch (error) {
    console.error('Get top performers error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get gamification analytics (admin only)
router.get('/analytics', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { timeRange = '30d' } = req.query;

    // Calculate date range
    const startDate = new Date();
    switch (timeRange) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
        break;
    }

    // Get analytics data
    const [
      pointsAwarded,
      badgesEarned,
      achievementsUnlocked,
      activeUsers,
      leaderboardUpdates,
      streakMilestones
    ] = await Promise.all([
      prisma.pointTransactions.aggregate({
        where: {
          createdAt: { gte: startDate },
          transactionType: 'EARNED'
        },
        _sum: { points: true },
        _count: true
      }),
      prisma.userBadges.count({
        where: {
          earnedAt: { gte: startDate }
        }
      }),
      prisma.userAchievements.count({
        where: {
          unlockedAt: { gte: startDate },
          isCompleted: true
        }
      }),
      prisma.activityLog.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: startDate }
        },
        _count: true
      }),
      prisma.leaderboards.aggregate({
        where: {
          updatedAt: { gte: startDate }
        },
        _count: true
      }),
      prisma.streakTracking.aggregate({
        where: {
          updatedAt: { gte: startDate }
        },
        _sum: { currentStreak: true },
        _count: true
      })
    ]);

    res.json({
      success: true,
      data: {
        pointsAwarded: {
          totalPoints: pointsAwarded._sum.points || 0,
          transactions: pointsAwarded._count
        },
        badgesEarned,
        achievementsUnlocked,
        activeUsers: activeUsers.length,
        leaderboardUpdates: leaderboardUpdates._count,
        streakMilestones: {
          totalStreakDays: streakMilestones._sum.currentStreak || 0,
          activeStreaks: streakMilestones._count
        },
        timeRange
      },
      message: 'Gamification analytics retrieved successfully'
    });
  } catch (error) {
    console.error('Get gamification analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get achievement progress for user
router.get('/achievements/progress', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const achievements = await prisma.achievements.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });

    const progress = [];
    for (const achievement of achievements) {
      const userAchievement = await prisma.userAchievements.findUnique({
        where: {
          userId_achievementId: {
            userId,
            achievementId: achievement.id
          }
        }
      });

      const currentProgress = userAchievement ? userAchievement.completionPercentage : 0;
      const calculatedProgress = await gamificationService.calculateAchievementProgress(
        userId, 
        achievement.achievementType, 
        achievement.requirements
      );

      progress.push({
        achievement,
        currentProgress: Math.max(currentProgress, calculatedProgress),
        isCompleted: userAchievement?.isCompleted || false,
        unlockedAt: userAchievement?.unlockedAt,
        progressData: userAchievement?.progressData || {}
      });
    }

    res.json({
      success: true,
      data: progress,
      message: 'Achievement progress retrieved successfully'
    });
  } catch (error) {
    console.error('Get achievement progress error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
