import axios from "axios";
import { ENV } from '../utils/env';

const BASE_URL = ENV.API_URL;

// Create axios instance with auth
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      try {
        const refreshResponse = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {}, {
          withCredentials: true
        });
        
        const { accessToken } = refreshResponse.data.data;
        localStorage.setItem('accessToken', accessToken);
        
        // Retry original request
        error.config.headers.Authorization = `Bearer ${accessToken}`;
        return api.request(error.config);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Gamification API methods
export const gamificationAPI = {
  // Get user points
  async getUserPoints(userId = null) {
    try {
      const currentUserId = userId || localStorage.getItem('userId');
      const response = await api.get(`/api/v1/gamification/points`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting user points:', error);
      throw error;
    }
  },

  // Award points to user (admin only)
  async awardPoints(userId, points, sourceType, sourceId = null, description = null, metadata = {}) {
    try {
      const response = await api.post('/api/v1/gamification/points/award', {
        userId,
        points,
        sourceType,
        sourceId,
        description,
        metadata
      });
      return response.data.data;
    } catch (error) {
      console.error('Error awarding points:', error);
      throw error;
    }
  },

  // Get user badges
  async getUserBadges(userId = null, includeHidden = false) {
    try {
      const currentUserId = userId || localStorage.getItem('userId');
      const response = await api.get(`/api/v1/gamification/badges?includeHidden=${includeHidden}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting user badges:', error);
      throw error;
    }
  },

  // Award badge to user (admin only)
  async awardBadge(userId, badgeType, name, description) {
    try {
      const response = await api.post('/api/v1/gamification/badges/award', {
        userId,
        badgeType,
        name,
        description
      });
      return response.data.data;
    } catch (error) {
      console.error('Error awarding badge:', error);
      throw error;
    }
  },

  // Get user achievements
  async getUserAchievements(userId = null) {
    try {
      const currentUserId = userId || localStorage.getItem('userId');
      const response = await api.get('/api/v1/gamification/achievements');
      return response.data.data;
    } catch (error) {
      console.error('Error getting user achievements:', error);
      throw error;
    }
  },

  // Check and award achievements (admin only)
  async checkAndAwardAchievements(userId) {
    try {
      const response = await api.post('/api/v1/gamification/achievements/check', {
        userId
      });
      return response.data.data;
    } catch (error) {
      console.error('Error checking achievements:', error);
      throw error;
    }
  },

  // Get leaderboards
  async getLeaderboard(type = 'GLOBAL', skill = null, limit = 50) {
    try {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (skill) params.append('skill', skill);
      if (limit) params.append('limit', limit);

      const response = await api.get(`/api/v1/gamification/leaderboards?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  },

  // Get user leaderboard rank
  async getUserLeaderboardRank(userId = null, type = 'GLOBAL', skill = null) {
    try {
      const currentUserId = userId || localStorage.getItem('userId');
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (skill) params.append('skill', skill);

      const response = await api.get(`/api/v1/gamification/leaderboards/rank?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting user leaderboard rank:', error);
      throw error;
    }
  },

  // Update leaderboard (admin only)
  async updateLeaderboard(leaderboardId) {
    try {
      const response = await api.post(`/api/v1/gamification/leaderboards/${leaderboardId}/update`);
      return response.data.data;
    } catch (error) {
      console.error('Error updating leaderboard:', error);
      throw error;
    }
  },

  // Update all leaderboards (admin only)
  async updateAllLeaderboards() {
    try {
      const response = await api.post('/api/v1/gamification/leaderboards/update-all');
      return response.data.data;
    } catch (error) {
      console.error('Error updating all leaderboards:', error);
      throw error;
    }
  },

  // Get user gamification summary
  async getUserGamificationSummary(userId = null) {
    try {
      const currentUserId = userId || localStorage.getItem('userId');
      const response = await api.get('/api/v1/gamification/summary');
      return response.data.data;
    } catch (error) {
      console.error('Error getting user gamification summary:', error);
      throw error;
    }
  },

  // Get user activity history
  async getUserActivityHistory(userId = null, limit = 50) {
    try {
      const currentUserId = userId || localStorage.getItem('userId');
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit);

      const response = await api.get(`/api/v1/gamification/activity?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting user activity history:', error);
      throw error;
    }
  },

  // Get user point transactions
  async getPointTransactions(userId = null, limit = 50) {
    try {
      const currentUserId = userId || localStorage.getItem('userId');
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit);

      const response = await api.get(`/api/v1/gamification/transactions?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting point transactions:', error);
      throw error;
    }
  },

  // Update user streak
  async updateStreak(userId = null, streakType, activityDate = null) {
    try {
      const currentUserId = userId || localStorage.getItem('userId');
      const response = await api.post(`/api/v1/gamification/streaks/${streakType}/update`, {
        activityDate
      });
      return response.data.data;
    } catch (error) {
      console.error('Error updating streak:', error);
      throw error;
    }
  },

  // Initialize user gamification (admin only)
  async initializeUserGamification(userId) {
    try {
      const response = await api.post(`/api/v1/gamification/initialize/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error initializing user gamification:', error);
      throw error;
    }
  },

  // Get gamification statistics (admin only)
  async getGamificationStats() {
    try {
      const response = await api.get('/api/v1/gamification/stats');
      return response.data.data;
    } catch (error) {
      console.error('Error getting gamification stats:', error);
      throw error;
    }
  },

  // Get cache statistics (admin only)
  async getCacheStats() {
    try {
      const response = await api.get('/api/v1/gamification/cache/stats');
      return response.data.data;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      throw error;
    }
  },

  // Clear cache (admin only)
  async clearCache(userId = null) {
    try {
      const response = await api.post('/api/v1/gamification/cache/clear', {
        userId
      });
      return response.data;
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  },

  // Get available badges (admin only)
  async getAvailableBadges() {
    try {
      const response = await api.get('/api/v1/gamification/badges/available');
      return response.data.data;
    } catch (error) {
      console.error('Error getting available badges:', error);
      throw error;
    }
  },

  // Get available achievements (admin only)
  async getAvailableAchievements() {
    try {
      const response = await api.get('/api/v1/gamification/achievements/available');
      return response.data.data;
    } catch (error) {
      console.error('Error getting available achievements:', error);
      throw error;
    }
  },

  // Get available leaderboards (admin only)
  async getAvailableLeaderboards() {
    try {
      const response = await api.get('/api/v1/gamification/leaderboards/available');
      return response.data.data;
    } catch (error) {
      console.error('Error getting available leaderboards:', error);
      throw error;
    }
  },

  // Create custom badge (admin only)
  async createBadge(name, description, badgeType, iconUrl, pointsValue, requirements, sortOrder) {
    try {
      const response = await api.post('/api/v1/gamification/badges/create', {
        name,
        description,
        badgeType,
        iconUrl,
        pointsValue,
        requirements,
        sortOrder
      });
      return response.data.data;
    } catch (error) {
      console.error('Error creating badge:', error);
      throw error;
    }
  },

  // Create custom achievement (admin only)
  async createAchievement(name, description, achievementType, badgeType, pointsReward, requirements, sortOrder) {
    try {
      const response = await api.post('/api/v1/gamification/achievements/create', {
        name,
        description,
        achievementType,
        badgeType,
        pointsReward,
        requirements,
        sortOrder
      });
      return response.data.data;
    } catch (error) {
      console.error('Error creating achievement:', error);
      throw error;
    }
  },

  // Create custom leaderboard (admin only)
  async createLeaderboard(name, description, leaderboardType, skillFilter, timePeriod, maxEntries, resetFrequency) {
    try {
      const response = await api.post('/api/v1/gamification/leaderboards/create', {
        name,
        description,
        leaderboardType,
        skillFilter,
        timePeriod,
        maxEntries,
        resetFrequency
      });
      return response.data.data;
    } catch (error) {
      console.error('Error creating leaderboard:', error);
      throw error;
    }
  },

  // Get user gamification preferences
  async getUserPreferences(userId = null) {
    try {
      const currentUserId = userId || localStorage.getItem('userId');
      const response = await api.get('/api/v1/gamification/preferences');
      return response.data.data;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw error;
    }
  },

  // Update user gamification preferences
  async updateUserPreferences(preferences) {
    try {
      const response = await api.put('/api/v1/gamification/preferences', preferences);
      return response.data.data;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  },

  // Get user streaks
  async getUserStreaks(userId = null) {
    try {
      const currentUserId = userId || localStorage.getItem('userId');
      const response = await api.get('/api/v1/gamification/streaks');
      return response.data.data;
    } catch (error) {
      console.error('Error getting user streaks:', error);
      throw error;
    }
  },

  // Get top performers
  async getTopPerformers(limit = 10) {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit);

      const response = await api.get(`/api/v1/gamification/top-performers?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting top performers:', error);
      throw error;
    }
  },

  // Get gamification analytics (admin only)
  async getGamificationAnalytics(timeRange = '30d') {
    try {
      const params = new URLSearchParams();
      if (timeRange) params.append('timeRange', timeRange);

      const response = await api.get(`/api/v1/gamification/analytics?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting gamification analytics:', error);
      throw error;
    }
  },

  // Get achievement progress for user
  async getAchievementProgress(userId = null) {
    try {
      const currentUserId = userId || localStorage.getItem('userId');
      const response = await api.get('/api/v1/gamification/achievements/progress');
      return response.data.data;
    } catch (error) {
      console.error('Error getting achievement progress:', error);
      throw error;
    }
  }
};

// Utility functions for gamification
export const gamificationUtils = {
  // Format points with proper abbreviation
  formatPoints: (points) => {
    if (points >= 1000000) return (points / 1000000).toFixed(1) + 'M';
    if (points >= 1000) return (points / 1000).toFixed(1) + 'K';
    return points.toString();
  },

  // Calculate level progress percentage
  calculateLevelProgress: (currentLevel, experiencePoints) => {
    const currentLevelXP = Math.floor((currentLevel - 1) * currentLevel * 50);
    const nextLevelXP = Math.floor(currentLevel * (currentLevel + 1) * 50);
    const progressXP = experiencePoints - currentLevelXP;
    const totalXP = nextLevelXP - currentLevelXP;
    
    return Math.min(100, Math.max(0, (progressXP / totalXP) * 100));
  },

  // Get level color based on level number
  getLevelColor: (level) => {
    if (level >= 50) return 'text-purple-600';
    if (level >= 40) return 'text-red-600';
    if (level >= 30) return 'text-orange-600';
    if (level >= 20) return 'text-yellow-600';
    if (level >= 10) return 'text-green-600';
    return 'text-blue-600';
  },

  // Get badge color class
  getBadgeColorClass: (badgeType) => {
    const colorMap = {
      'BRONZE': 'bg-amber-100 text-amber-800 border-amber-300',
      'SILVER': 'bg-gray-100 text-gray-800 border-gray-300',
      'GOLD': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'PLATINUM': 'bg-purple-100 text-purple-800 border-purple-300',
      'DIAMOND': 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colorMap[badgeType] || colorMap['BRONZE'];
  },

  // Get badge gradient class
  getBadgeGradientClass: (badgeType) => {
    const gradientMap = {
      'BRONZE': 'from-amber-400 to-amber-600',
      'SILVER': 'from-gray-400 to-gray-600',
      'GOLD': 'from-yellow-400 to-yellow-600',
      'PLATINUM': 'from-purple-400 to-purple-600',
      'DIAMOND': 'from-blue-400 to-blue-600'
    };
    return gradientMap[badgeType] || gradientMap['BRONZE'];
  },

  // Get badge points value
  getBadgePointsValue: (badgeType) => {
    const pointsMap = {
      'BRONZE': 10,
      'SILVER': 25,
      'GOLD': 50,
      'PLATINUM': 100,
      'DIAMOND': 200
    };
    return pointsMap[badgeType] || 10;
  },

  // Format time ago
  formatTimeAgo: (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
  },

  // Calculate rank change
  calculateRankChange: (previousRank, currentRank) => {
    if (previousRank === null) return { change: 'same', difference: 0 };
    if (previousRank > currentRank) return { change: 'up', difference: previousRank - currentRank };
    if (previousRank < currentRank) return { change: 'down', difference: currentRank - previousRank };
    return { change: 'same', difference: 0 };
  },

  // Get rank change icon
  getRankChangeIcon: (change) => {
    const iconMap = {
      'up': '↑',
      'down': '↓',
      'same': '→'
    };
    return iconMap[change] || iconMap['same'];
  },

  // Get rank change color
  getRankChangeColor: (change) => {
    const colorMap = {
      'up': 'text-green-500',
      'down': 'text-red-500',
      'same': 'text-gray-400'
    };
    return colorMap[change] || colorMap['same'];
  },

  // Get medal for rank
  getMedalForRank: (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  },

  // Get medal color for rank
  getMedalColorForRank: (rank) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-gray-600';
  },

  // Format leaderboard type label
  getLeaderboardTypeLabel: (type) => {
    const labelMap = {
      'GLOBAL': 'Global Points',
      'WEEKLY': 'Weekly Points',
      'MONTHLY': 'Monthly Points',
      'SKILL_BASED': 'Skill Based'
    };
    return labelMap[type] || 'Global Points';
  },

  // Get leaderboard type icon
  getLeaderboardTypeIcon: (type) => {
    const iconMap = {
      'GLOBAL': '🏆',
      'WEEKLY': '📅',
      'MONTHLY': '📅',
      'SKILL_BASED': '🎯'
    };
    return iconMap[type] || '🏆';
  },

  // Format achievement type label
  getAchievementTypeLabel: (type) => {
    const labelMap = {
      'MENTOR_SESSIONS': 'Mentor Sessions',
      'POSTS_CREATED': 'Posts Created',
      'LIKES_RECEIVED': 'Likes Received',
      'COMMENTS_POSTED': 'Comments Posted',
      'FOLLOWERS_GAINED': 'Followers Gained',
      'STREAK_DAYS': 'Streak Days',
      'SKILL_MASTERY': 'Skill Mastery',
      'COMMUNITY_CONTRIBUTION': 'Community Contribution'
    };
    return labelMap[type] || type;
  },

  // Calculate achievement progress percentage
  calculateAchievementProgress: (currentCount, targetCount) => {
    if (targetCount === 0) return 0;
    return Math.min(100, Math.floor((currentCount * 100) / targetCount));
  },

  // Get achievement progress color
  getAchievementProgressColor: (percentage) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  },

  // Format badge type label
  getBadgeTypeLabel: (badgeType) => {
    const labelMap = {
      'BRONZE': 'Bronze',
      'SILVER': 'Silver',
      'GOLD': 'Gold',
      'PLATINUM': 'Platinum',
      'DIAMOND': 'Diamond'
    };
    return labelMap[badgeType] || 'Bronze';
  },

  // Check if user is in top percentage
  isInTopPercentage: (rank, totalUsers, percentage) => {
    return (rank / totalUsers) * 100 <= percentage;
  },

  // Get top percentage badge
  getTopPercentageBadge: (rank, totalUsers) => {
    const percentage = Math.round((rank / totalUsers) * 100);
    if (percentage <= 1) return '🏆';
    if (percentage <= 5) return '🥇';
    if (percentage <= 10) return '🥈';
    if (percentage <= 25) return '🥉';
    return null;
  },

  // Format large numbers with abbreviations
  formatLargeNumber: (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  },

  // Calculate streak milestone rewards
  calculateStreakMilestoneRewards: (streakDays) => {
    const milestones = [3, 7, 14, 30, 60, 100];
    return milestones.filter(milestone => streakDays >= milestone).length * 10;
  },

  // Get next streak milestone
  getNextStreakMilestone: (currentStreak) => {
    const milestones = [3, 7, 14, 30, 60, 100];
    return milestones.find(milestone => milestone > currentStreak) || null;
  },

  // Format streak type label
  getStreakTypeLabel: (streakType) => {
    const labelMap = {
      'daily_login': 'Daily Login',
      'weekly_activity': 'Weekly Activity',
      'mentorship_streak': 'Mentorship Streak'
    };
    return labelMap[streakType] || streakType;
  },

  // Calculate experience needed for next level
  getExperienceNeededForNextLevel: (currentLevel, currentExperience) => {
    const nextLevelXP = Math.floor(currentLevel * (currentLevel + 1) * 50);
    const currentLevelXP = Math.floor((currentLevel - 1) * currentLevel * 50);
    return nextLevelXP - currentExperience;
  },

  // Get points to level mapping
  getPointsToLevelMapping: () => {
    const mapping = {};
    for (let level = 1; level <= 50; level++) {
      mapping[level] = Math.floor((level - 1) * level * 50);
    }
    return mapping;
  },

  // Check if user has unlocked specific achievement
  hasAchievement: (achievements, achievementId) => {
    return achievements.some(achievement => achievement.achievementId === achievementId && achievement.isCompleted);
  },

  // Get completed achievements count
  getCompletedAchievementsCount: (achievements) => {
    return achievements.filter(achievement => achievement.isCompleted).length;
  },

  // Get total achievements count
  getTotalAchievementsCount: (achievements) => {
    return achievements.length;
  },

  // Calculate achievement completion percentage
  getAchievementCompletionPercentage: (achievements) => {
    if (achievements.length === 0) return 0;
    const completed = achievements.filter(achievement => achievement.isCompleted).length;
    return Math.round((completed / achievements.length) * 100);
  },

  // Sort achievements by completion percentage
  sortAchievementsByProgress: (achievements) => {
    return achievements.sort((a, b) => {
      const aProgress = a.isCompleted ? 100 : a.completionPercentage || 0;
      const bProgress = b.isCompleted ? 100 : b.completionPercentage || 0;
      return bProgress - aProgress;
    });
  },

  // Filter achievements by type
  filterAchievementsByType: (achievements, type) => {
    return achievements.filter(achievement => achievement.achievement.achievementType === type);
  },

  // Filter achievements by badge type
  filterAchievementsByBadgeType: (achievements, badgeType) => {
    return achievements.filter(achievement => achievement.achievement.badgeType === badgeType);
  },

  // Get achievement requirements as array
  getAchievementRequirements: (achievement) => {
    if (!achievement.requirements) return [];
    return Object.entries(achievement.requirements).map(([key, value]) => ({
      key,
      value,
      label: key.replace(/_/g, ' '),
      isMet: false // This would need to be calculated based on user data
    }));
  },

  // Validate achievement progress
  validateAchievementProgress: (currentCount, targetCount) => {
    return {
      isValid: currentCount >= 0 && targetCount > 0,
      isCompleted: currentCount >= targetCount,
      percentage: Math.min(100, Math.floor((currentCount * 100) / targetCount)),
      remaining: Math.max(0, targetCount - currentCount)
    };
  },

  // Get user activity summary
  getUserActivitySummary: (activities) => {
    const summary = {
      totalActivities: activities.length,
      totalPointsEarned: activities.reduce((sum, activity) => sum + (activity.pointsEarned || 0), 0),
      recentActivities: activities.slice(0, 10),
      activityTypes: [...new Set(activities.map(activity => activity.activityType))],
      mostRecentActivity: activities[0] || null
    };
    return summary;
  },

  // Get point transaction summary
  getPointTransactionSummary: (transactions) => {
    const summary = {
      totalTransactions: transactions.length,
      totalPointsEarned: transactions
        .filter(t => t.transactionType === 'EARNED')
        .reduce((sum, t) => sum + t.points, 0),
      totalPointsSpent: transactions
        .filter(t => t.transactionType === 'SPENT')
        .reduce((sum, t) => sum + Math.abs(t.points), 0),
      netPoints: transactions.reduce((sum, t) => sum + t.points, 0),
      recentTransactions: transactions.slice(0, 10),
      transactionTypes: [...new Set(transactions.map(t => t.transactionType))],
      mostRecentTransaction: transactions[0] || null
    };
    return summary;
  },

  // Format transaction type label
  getTransactionTypeLabel: (transactionType) => {
    const labelMap = {
      'EARNED': 'Earned',
      'SPENT': 'Spent',
      'BONUS': 'Bonus',
      'PENALTY': 'Penalty'
    };
    return labelMap[transactionType] || transactionType;
  },

  // Get transaction type color
  getTransactionTypeColor: (transactionType) => {
    const colorMap = {
      'EARNED': 'text-green-600',
      'SPENT': 'text-red-600',
      'BONUS': 'text-blue-600',
      'PENALTY': 'text-orange-600'
    };
    return colorMap[transactionType] || 'text-gray-600';
  },

  // Format source type label
  getSourceTypeLabel: (sourceType) => {
    const labelMap = {
      'post': 'Post',
      'session': 'Session',
      'like': 'Like',
      'comment': 'Comment',
      'follow': 'Follow',
      'achievement': 'Achievement',
      'badge': 'Badge',
      'login': 'Login',
      'streak': 'Streak',
      'admin': 'Admin'
    };
    return labelMap[sourceType] || sourceType;
  },

  // Check if notification is recent
  isNotificationRecent: (timestamp, minutes = 5) => {
    const now = new Date();
    const diffMinutes = Math.floor((now - timestamp) / (1000 * 60));
    return diffMinutes <= minutes;
  },

  // Group notifications by type
  groupNotificationsByType: (notifications) => {
    return notifications.reduce((groups, notification) => {
      const type = notification.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(notification);
      return groups;
    }, {});
  },

  // Count notifications by type
  countNotificationsByType: (notifications) => {
    const counts = {};
    notifications.forEach(notification => {
      counts[notification.type] = (counts[notification.type] || 0) + 1;
    });
    return counts;
  },

  // Get notification priority
  getNotificationPriority: (notification) => {
    const priorityMap = {
      'achievement': 1,
      'level': 2,
      'badge': 3,
      'streak': 4
    };
    return priorityMap[notification.type] || 5;
  },

  // Sort notifications by priority and timestamp
  sortNotifications: (notifications) => {
    return notifications.sort((a, b) => {
      const priorityA = gamificationUtils.getNotificationPriority(a);
      const priorityB = gamificationUtils.getNotificationPriority(b);
      
      // First sort by priority (lower number = higher priority)
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Then sort by timestamp (newer first)
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  },

  // Filter notifications by time range
  filterNotificationsByTimeRange: (notifications, hours = 24) => {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return notifications.filter(notification => 
      new Date(notification.timestamp) >= cutoffTime
    );
  }
};

export default gamificationAPI;
