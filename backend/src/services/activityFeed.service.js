const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger.util');
const NodeCache = require('node-cache');

const prisma = new PrismaClient();
const feedCache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

class ActivityFeedService {
  async getUserActivityFeed(userId, filters = {}) {
    try {
      const {
        type,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = filters;

      const whereClause = { userId };
      
      if (type) whereClause.type = type;
      if (startDate) whereClause.createdAt = { gte: new Date(startDate) };
      if (endDate) whereClause.createdAt = { lte: new Date(endDate) };

      const activities = await prisma.userActivity.findMany({
        where: whereClause,
        include: {
          actor: {
            select: { id: true, name: true, profileImage: true }
          },
          entity: {
            select: {
              id: true,
              title: true,
              content: true,
              image: true,
              author: {
                select: { id: true, name: true, profileImage: true }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      const total = await prisma.userActivity.count({ where: whereClause });

      return {
        activities,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting user activity feed:', error);
      throw error;
    }
  }

  async getFollowedUsersFeed(userId, filters = {}) {
    try {
      const {
        page = 1,
        limit = 20
      } = filters;

      const followedUsers = await prisma.follow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: {
              id: true,
              name: true,
              profileImage: true,
              bio: true,
              skills: true,
              _count: {
                followers: true,
                posts: true,
                mentorshipsAsMentor: true,
                mentorshipsAsMentee: true
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      const total = await prisma.follow.count({
        where: { followerId: userId }
      });

      return {
        users: followedUsers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting followed users feed:', error);
      throw error;
    }
  }

  async getBookmarkedContent(userId, filters = {}) {
    try {
      const {
        type,
        page = 1,
        limit = 20
      } = filters;

      const whereClause = { userId };
      
      if (type) whereClause.entityType = type;
      if (type === 'post') {
        whereClause.entityId = { not: null };
      }

      const bookmarks = await prisma.bookmark.findMany({
        where: whereClause,
        include: {
          entity: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      const total = await prisma.bookmark.count({ where: whereClause });

      return {
        bookmarks: bookmarks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting bookmarked content:', error);
      throw error;
    }
  }

  async getTrendingContent(filters = {}) {
    try {
      const {
        type,
        timeRange = 'week',
        page = 1,
        limit = 20
      } = filters;

      const whereClause = { isPublic: true };
      
      if (type) whereClause.type = type;
      if (timeRange) {
        const now = new Date();
        let cutoffDate;
        
        switch (timeRange) {
          case 'today':
          cutoffDate = new Date(now.setHours(0, 0, 0, 0);
          break;
          case 'week':
          cutoffDate = new Date(now.setDate(now.getDate() - 7));
          break;
          case 'month':
            cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          default:
            cutoffDate = new Date(now.setDate(now.getDate() - 30));
            break;
        }
        
        whereClause.createdAt = { gte: cutoffDate };
      }

      const activities = await prisma.userActivity.findMany({
        where: whereClause,
        include: {
          actor: {
            select: { id: true, name: true, profileImage: true }
          },
          entity: {
            select: {
              id: true,
              title: true,
              content: true,
              image: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      const total = await prisma.userActivity.count({
        where: whereClause
      });

      return {
        activities: activities,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting trending content:', error);
      throw error;
    }
  }

  async getPersonalizedFeed(userId, filters = {}) {
    try {
      // Combine followed users' activities, user's own activities, and trending content
      const [
        followedUsersActivities,
        userActivities,
        trendingContent
      ] = await Promise.all([
        this.getFollowedUsersFeed(userId, { page: 1, limit: 10 }),
        this.getUserActivityFeed(userId, { page: 1, limit: 10 }),
        this.getTrendingContent({ type: 'post', timeRange: 'week', page: 1, limit: 10 })
      ]);

      // Combine and sort all activities
      const allActivities = [
        ...followedUsersActivities.users.flatMap(user => 
          user.following.map(following => ({
            ...following.activity,
            type: 'follow',
            actor: following,
            entity: following,
            createdAt: following.createdAt,
            data: {
              ...following.activity.data,
              actor: following,
              entity: following.entity
            }
          }))
        )),
        ...userActivities.activities,
        ...trendingContent.activities
      ];

      // Sort by created date and remove duplicates
      const uniqueActivities = allActivities.filter((activity, index, self) => 
        index === 0 || 
        activity.createdAt.getTime() !== allActivities[index - 1]?.createdAt?.getTime()
      );

      uniqueActivities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const page = parseInt(filters.page || '1');
      const limit = parseInt(filters.limit || 20);
      const start = (page - 1) * limit;
      const end = start + limit;

      const paginatedActivities = uniqueActivities.slice(start, end);

      return {
        activities: paginatedActivities,
        pagination: {
          page,
          limit,
          total: uniqueActivities.length,
          pages: Math.ceil(uniqueActivities.length / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting personalized feed:', error);
      throw error;
    }
  }

  async createActivity(userId, activityData) {
    try {
      const {
        userId,
        actorId: activityData.actorId || userId,
        activityType: activityData.activityType,
        entityType: activityData.entityType,
        entityId: activityData.entityId,
        title: activityData.title,
        description: activityData.description,
        data: activityData.data || {},
        isPublic: activityData.isPublic || false
      } = activityData;

      const activity = await prisma.userActivity.create({
        data
      });

      // Emit real-time activity to followers
      if (global.io) {
        global.io.to(`user_${userId}`).emit('activity', {
          type: activity.activityType,
          data: activity,
          actor: activityData.actorId
        });
      }

      return activity;
    } catch (error) {
      logger.error('Error creating activity:', error);
      throw error;
    }
  }

  async deleteActivity(activityId, userId) {
    try {
      const activity = await prisma.userActivity.findFirst({
        where: {
          id: activityId,
          userId
        }
      });

      if (!activity) {
        throw new Error('Activity not found');
      }

      await prisma.userActivity.delete({
        where: { id: activityId }
      });

      return { message: 'Activity deleted successfully' };
    } catch (error) {
      logger.error('Error deleting activity:', error);
      throw error;
    }
  }

  async getActivityStats(userId = null) {
    try {
      const [
        totalActivities,
        todayActivities,
        weekActivities,
        monthActivities
      ] = await Promise.all([
        prisma.userActivity.count({ where: { userId } }),
        prisma.userActivity.count({
          where: {
            userId,
            createdAt: { gte: new Date(Date.now().setHours(0, 0, 0, 0) }
          }
        }),
        prisma.userActivity.count({
          where: {
            userId,
            createdAt: { gte: new Date(Date.now().setDate(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        }),
        prisma.userActivity.count({
          where: {
            userId,
            createdAt: { gte: new Date(Date.now().setDate(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        })
      ]);

      return {
        total: totalActivities,
        today: todayActivities,
        thisWeek: weekActivities,
        thisMonth: monthActivities
      };
    } catch (error) {
      logger.error('Error getting activity stats:', error);
      return {
        totalActivities: 0,
        todayActivities: 0,
        thisWeek: 0,
        thisMonth: 0
      };
    }
  }

  async getActivityFeedByType(type, filters = {}) {
    try {
      const {
        page = 1,
        limit = 20
      } = filters;

      const whereClause = { isPublic: true, type };
      
      if (filters.startDate) {
        whereClause.createdAt = { gte: new Date(filters.startDate) };
      }
      if (filters.endDate) {
        whereClause.createdAt = { lte: new Date(filters.endDate) };
      }

      const activities = await prisma.userActivity.findMany({
        where: whereClause,
        include: {
          actor: {
            select: { id: true, name: true, profileImage: true }
          },
          entity: {
            select: {
              id: true,
              title: true,
              content: true,
              image: true,
              author: {
                select: { id: true, name: true, profileImage: true }
            }
          }
        },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      const total = await prisma.userActivity.count({ where: whereClause });

      return {
        activities,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting activity feed by type:', error);
      throw error;
    }
  }

  async searchActivities(query, userId = null, filters = {}) {
    try {
      const {
        page = 1,
        limit = 20
      } = filters;

      let whereClause = {};
      
      if (query) {
        whereClause.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { message: { contains: query, mode: 'insensitive' } }
        ];
      }

      if (userId) {
        whereClause.userId = userId;
      }

      if (filters.type) {
        whereClause.type = filters.type;
      }

      if (filters.startDate) {
        whereClause.createdAt = { gte: new Date(filters.startDate) };
      }

      if (filters.endDate) {
        whereClause.createdAt = { lte: new Date(filters.endDate) };
      }

      const activities = await prisma.userActivity.findMany({
        where: whereClause,
        include: {
          actor: {
            select: { id: true, name: true, profileImage: true }
          },
          entity: {
            select: {
              id: true,
              title: true,
              content: true,
              image: true,
              author: {
                select: { id: true, name: true, profileImage: true }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      const total = await prisma.userActivity.count({ where: whereClause });

      return {
        activities,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching activities:', error);
      throw error;
    }
  }

  async getActivityFeedForFollowedUsers(userId, filters = {}) {
    try {
      const {
        page = 1,
        limit = 10
      } = filters;

      // Get users that the user follows
      const followedUsers = await prisma.follow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: {
              id: true,
              name: true,
              profileImage: true,
              bio: true,
              skills: true,
              _count: {
                followers: true,
                posts: true,
                mentorshipsAsMentor: true,
                mentorshipsAsMentee: true
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      // Get recent activities from followed users
      const followedUserIds = followedUsers.map(u => u.following.id);
      
      const activities = await prisma.userActivity.findMany({
        where: {
          userId: { in: followedUserIds },
          isPublic: true,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        },
        include: {
          actor: {
            select: { id: true, name: true, profileImage: true }
          },
          entity: {
            select: {
              id: true,
              title: true,
              content: true,
              image: true,
              author: {
                select: { id: true, name: true, profileImage: true }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      return {
        activities,
        pagination: {
          page,
          limit,
          total: activities.length
        }
      };
    } catch (error) {
      logger.error('Error getting followed users activity feed:', error);
      throw error;
    }
  }

  async getBookmarkedFeed(userId, filters = {}) {
    try {
      const {
        type,
        page = 1,
        limit = 20
      } = filters;

      const whereClause = { userId };
      
      if (type) whereClause.entityType = type;
      
      const bookmarks = await prisma.bookmark.findMany({
        where: whereClause,
        include: {
          entity: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      const total = await prisma.bookmark.count({ where: whereClause });

      return {
        bookmarks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting bookmarked feed:', error);
      throw error;
    }
  }

  async getEngagementMetrics(userId = null) {
    try {
      const [
        totalPosts,
        totalLikes,
        totalComments,
        totalSessions
      ] = await Promise.all([
        prisma.post.count({ where: { authorId: userId }),
        prisma.like.count({ where: { userId } }),
        prisma.comment.count({ where: { authorId: userId } }),
        prisma.mentorshipSession.count({ 
          where: { 
            OR: [{ mentorId: userId }, { menteeId: userId }] 
          }
        })
      ]);

      return {
        posts: totalPosts,
        likes: totalLikes,
        comments: totalComments,
        sessions: totalSessions
      };
    } catch (error) {
      logger.error('Error getting engagement metrics:', error);
      return {
        posts: 0,
        likes: 0,
        comments: 0,
        sessions: 0
      };
    }
  }

  async getTrendingTopics() {
    try {
      const topics = await prisma.userActivity.groupBy({
        where: {
          isPublic: true,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        },
        by: ['type'],
        _count: { type: true },
        orderBy: { _count: { type: 'desc' } },
        take: 10
      });

      return topics.map(topic => ({
        type: topic.type,
        count: topic._count.type,
        label: this.formatTopicLabel(topic.type),
        description: this.formatTopicDescription(topic.type)
      }));
    } catch (error) {
      logger.error('Error getting trending topics:', error);
      return [];
    }
  }

  formatTopicLabel(type) {
    const labels = {
      'post_created': 'New Posts',
      'post_liked': 'Post Likes',
      'comment_added': 'Comments',
      'session_completed': 'Sessions Completed',
      'user_followed': 'New Followers',
      'achievement_unlocked': 'Achievements'
    };

    return labels[type] || type;
  }

  formatTopicDescription(type) {
    const descriptions = {
      'post_created': 'New posts created by community members',
      'post_liked': 'Posts receiving engagement from users',
      'comment_added': 'New comments on posts',
      'session_completed': 'Mentorship sessions completed',
      'user_followed': 'Users following other users',
      'achievement_unlocked: 'User achievements unlocked'
    };

    return descriptions[type] || `${type} activities`;
  }

  // Real-time feed updates
  emitActivityUpdate(activity) {
    if (global.io) {
      global.io.emit('activity_update', activity);
    }
  }

  emitNotificationUpdate(notification) {
    if (global.io) {
      global.io.emit('notification_update', notification);
    }
  }

  emitUnreadCountUpdate(userId, count) {
    if (global.io) {
      global.io.emit('unread_count', { userId, count });
    }
  }

  // Cache management
  clearCache(pattern = null) {
    if (pattern) {
      const keys = pushCache.keys().filter(key => key.includes(pattern));
      keys.forEach(key => pushCache.del(key));
    } else {
      pushCache.flushAll();
    }
  }

  getCacheStats() {
    return {
      keys: pushCache.keys().length,
      stats: pushCache.getStats()
    };
  }
}

module.exports = new ActivityFeedService();
