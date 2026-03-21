const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger.util');
const NodeCache = require('node-cache');

const prisma = new PrismaClient();
const analyticsCache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

class AnalyticsService {
  async trackEvent(userId, eventType, eventData = {}, sessionId = null, metadata = {}) {
    try {
      const event = await prisma.analyticsEvents.create({
        data: {
          userId,
          eventType,
          eventData,
          sessionId,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          referrer: metadata.referrer
        }
      });

      // Update real-time metrics
      if (global.io) {
        global.io.emit('analytics_event', {
          type: eventType,
          userId,
          data: eventData,
          timestamp: event.createdAt
        });
      }

      // Clear relevant cache entries
      this.clearCacheForEvent(eventType);

      return event;
    } catch (error) {
      logger.error('Error tracking analytics event:', error);
      throw error;
    }
  }

  async trackUserActivity(userId, activityType, entityType = null, entityId = null, activityData = {}, duration = null) {
    try {
      const activity = await prisma.userActivityLogs.create({
        data: {
          userId,
          activityType,
          entityType,
          entityId,
          activityData,
          durationMs: duration
        }
      });

      // Update real-time activity feed
      if (global.io) {
        global.io.to(`user_${userId}`).emit('user_activity', {
          type: activityType,
          data: activity,
          timestamp: activity.createdAt
        });
      }

      return activity;
    } catch (error) {
      logger.error('Error tracking user activity:', error);
      throw error;
    }
  }

  async getSessionEngagementMetrics(sessionId, filters = {}) {
    try {
      const cacheKey = `session_engagement_${sessionId}_${JSON.stringify(filters)}`;
      let metrics = analyticsCache.get(cacheKey);

      if (!metrics) {
        const whereClause = { sessionId };
        
        if (filters.startDate) {
          whereClause.createdAt = { gte: new Date(filters.startDate) };
        }
        if (filters.endDate) {
          whereClause.createdAt = { lte: new Date(filters.endDate) };
        }

        metrics = await prisma.sessionEngagementMetrics.findMany({
          where: whereClause,
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

        analyticsCache.set(cacheKey, metrics);
      }

      return metrics;
    } catch (error) {
      logger.error('Error getting session engagement metrics:', error);
      throw error;
    }
  }

  async getMentorPerformanceMetrics(mentorId, timeRange = '30d') {
    try {
      const cacheKey = `mentor_performance_${mentorId}_${timeRange}`;
      let metrics = analyticsCache.get(cacheKey);

      if (!metrics) {
        const startDate = this.getDateRangeStart(timeRange);
        
        const [performanceData, sessionData] = await Promise.all([
          prisma.mentorPerformanceMetrics.findFirst({
            where: {
              mentorId,
              calculatedAt: { gte: startDate }
            },
            orderBy: { calculatedAt: 'desc' }
          }),
          prisma.mentorshipSession.findMany({
            where: {
              mentorId,
              createdAt: { gte: startDate }
            },
            include: {
              feedback: true,
              mentee: {
                select: {
                  id: true,
                  name: true,
                  profileImage: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
          })
        ]);

        // Calculate additional metrics if not available
        if (!performanceData) {
          performanceData = await this.calculateMentorMetrics(mentorId, startDate);
        }

        metrics = {
          performance: performanceData,
          recentSessions: sessionData,
          calculatedAt: new Date()
        };

        analyticsCache.set(cacheKey, metrics);
      }

      return metrics;
    } catch (error) {
      logger.error('Error getting mentor performance metrics:', error);
      throw error;
    }
  }

  async calculateMentorMetrics(mentorId, startDate) {
    try {
      const sessions = await prisma.mentorshipSession.findMany({
        where: {
          mentorId,
          createdAt: { gte: startDate }
        },
        include: {
          feedback: true
        }
      });

      const totalSessions = sessions.length;
      const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length;
      const totalMentees = new Set(sessions.map(s => s.menteeId)).size;
      
      const ratings = sessions
        .filter(s => s.feedback && s.feedback.rating)
        .map(s => s.feedback.rating);
      
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
        : 0;

      const responseTimes = sessions
        .filter(s => s.scheduledAt && s.createdAt)
        .map(s => Math.abs(new Date(s.scheduledAt) - new Date(s.createdAt)) / (1000 * 60)); // in minutes
      
      const responseTimeAvg = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

      const availabilityScore = totalSessions > 0 
        ? (completedSessions / totalSessions) * 100 
        : 0;

      const engagementScore = averageRating > 0 
        ? averageRating * (completedSessions / totalSessions) * 20 
        : 0;

      return {
        mentorId,
        totalSessions,
        completedSessions,
        averageRating: parseFloat(averageRating.toFixed(2)),
        totalMentees,
        responseTimeAvg: Math.round(responseTimeAvg),
        availabilityScore: parseFloat(availabilityScore.toFixed(2)),
        engagementScore: parseFloat(engagementScore.toFixed(2)),
        revenueGenerated: 0, // Calculate based on session pricing
        calculatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error calculating mentor metrics:', error);
      throw error;
    }
  }

  async getUserAnalytics(userId, filters = {}) {
    try {
      const {
        timeRange = '30d',
        eventTypes = [],
        groupBy = 'day'
      } = filters;

      const startDate = this.getDateRangeStart(timeRange);
      const cacheKey = `user_analytics_${userId}_${timeRange}_${groupBy}_${JSON.stringify(eventTypes)}`;
      
      let analytics = analyticsCache.get(cacheKey);

      if (!analytics) {
        const whereClause = {
          userId,
          createdAt: { gte: startDate }
        };

        if (eventTypes.length > 0) {
          whereClause.eventType = { in: eventTypes };
        }

        const events = await prisma.analyticsEvents.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: 1000
        });

        const activities = await prisma.userActivityLogs.findMany({
          where: {
            userId,
            createdAt: { gte: startDate }
          },
          orderBy: { createdAt: 'desc' },
          take: 1000
        });

        analytics = this.processAnalyticsData(events, activities, groupBy);
        analyticsCache.set(cacheKey, analytics);
      }

      return analytics;
    } catch (error) {
      logger.error('Error getting user analytics:', error);
      throw error;
    }
  }

  async getPlatformAnalytics(filters = {}) {
    try {
      const {
        timeRange = '30d',
        metrics = ['events', 'users', 'sessions', 'engagement']
      } = filters;

      const startDate = this.getDateRangeStart(timeRange);
      const cacheKey = `platform_analytics_${timeRange}_${JSON.stringify(metrics)}`;
      
      let analytics = analyticsCache.get(cacheKey);

      if (!analytics) {
        const [eventStats, userStats, sessionStats, engagementStats] = await Promise.all([
          this.getEventStats(startDate),
          this.getUserStats(startDate),
          this.getSessionStats(startDate),
          this.getEngagementStats(startDate)
        ]);

        analytics = {
          events: metrics.includes('events') ? eventStats : null,
          users: metrics.includes('users') ? userStats : null,
          sessions: metrics.includes('sessions') ? sessionStats : null,
          engagement: metrics.includes('engagement') ? engagementStats : null,
          timeRange,
          generatedAt: new Date()
        };

        analyticsCache.set(cacheKey, analytics);
      }

      return analytics;
    } catch (error) {
      logger.error('Error getting platform analytics:', error);
      throw error;
    }
  }

  async getEventStats(startDate) {
    try {
      const stats = await prisma.analyticsEvents.groupBy({
        by: ['eventType'],
        where: {
          createdAt: { gte: startDate }
        },
        _count: { eventType: true },
        orderBy: { _count: { eventType: 'desc' } }
      });

      return stats.reduce((acc, stat) => {
        acc[stat.eventType] = stat._count.eventType;
        return acc;
      }, {});
    } catch (error) {
      logger.error('Error getting event stats:', error);
      return {};
    }
  }

  async getUserStats(startDate) {
    try {
      const [totalUsers, activeUsers, newUsers] = await Promise.all([
        prisma.user.count({
          where: { isActive: true }
        }),
        prisma.user.count({
          where: {
            isActive: true,
            updatedAt: { gte: startDate }
          }
        }),
        prisma.user.count({
          where: {
            isActive: true,
            createdAt: { gte: startDate }
          }
        })
      ]);

      return {
        total: totalUsers,
        active: activeUsers,
        new: newUsers
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      return {};
    }
  }

  async getSessionStats(startDate) {
    try {
      const [totalSessions, completedSessions, averageDuration] = await Promise.all([
        prisma.mentorshipSession.count({
          where: {
            createdAt: { gte: startDate }
          }
        }),
        prisma.mentorshipSession.count({
          where: {
            status: 'COMPLETED',
            createdAt: { gte: startDate }
          }
        }),
        prisma.mentorshipSession.aggregate({
          where: {
            status: 'COMPLETED',
            createdAt: { gte: startDate }
          },
          _avg: {
            duration: true
          }
        })
      ]);

      const completionRate = totalSessions > 0 
        ? (completedSessions / totalSessions) * 100 
        : 0;

      return {
        total: totalSessions,
        completed: completedSessions,
        completionRate: parseFloat(completionRate.toFixed(2)),
        averageDuration: averageDuration._avg.duration || 0
      };
    } catch (error) {
      logger.error('Error getting session stats:', error);
      return {};
    }
  }

  async getEngagementStats(startDate) {
    try {
      const [totalLikes, totalComments, totalFollows, totalBookmarks] = await Promise.all([
        prisma.like.count({
          where: {
            createdAt: { gte: startDate }
          }
        }),
        prisma.comment.count({
          where: {
            createdAt: { gte: startDate }
          }
        }),
        prisma.follow.count({
          where: {
            createdAt: { gte: startDate }
          }
        }),
        prisma.bookmark.count({
          where: {
            createdAt: { gte: startDate }
          }
        })
      ]);

      return {
        likes: totalLikes,
        comments: totalComments,
        follows: totalFollows,
        bookmarks: totalBookmarks
      };
    } catch (error) {
      logger.error('Error getting engagement stats:', error);
      return {};
    }
  }

  processAnalyticsData(events, activities, groupBy) {
    try {
      const processed = {
        summary: {},
        timeline: [],
        trends: {}
      };

      // Process events
      events.forEach(event => {
        const date = this.formatDateForGrouping(event.createdAt, groupBy);
        
        if (!processed.summary[date]) {
          processed.summary[date] = {
            events: 0,
            pageViews: 0,
            sessions: 0,
            interactions: 0
          };
        }

        processed.summary[date].events++;

        switch (event.eventType) {
          case 'PAGE_VIEW':
            processed.summary[date].pageViews++;
            break;
          case 'SESSION_START':
            processed.summary[date].sessions++;
            break;
          case 'POST_LIKE':
          case 'POST_COMMENT':
          case 'USER_FOLLOW':
            processed.summary[date].interactions++;
            break;
        }
      });

      // Process activities
      activities.forEach(activity => {
        const date = this.formatDateForGrouping(activity.createdAt, groupBy);
        
        if (!processed.summary[date]) {
          processed.summary[date] = {
            events: 0,
            pageViews: 0,
            sessions: 0,
            interactions: 0
          };
        }

        switch (activity.activityType) {
          case 'POST_CREATE':
          case 'POST_LIKE':
          case 'POST_COMMENT':
          case 'USER_FOLLOW':
            processed.summary[date].interactions++;
            break;
        }
      });

      // Generate timeline
      const allItems = [...events, ...activities]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 50);

      processed.timeline = allItems.map(item => ({
        type: item.eventType || item.activityType,
        timestamp: item.createdAt,
        data: item.eventData || item.activityData
      }));

      return processed;
    } catch (error) {
      logger.error('Error processing analytics data:', error);
      return { summary: {}, timeline: [], trends: {} };
    }
  }

  formatDateForGrouping(date, groupBy) {
    const d = new Date(date);
    
    switch (groupBy) {
      case 'hour':
        return d.toISOString().slice(0, 13) + ':00';
      case 'day':
        return d.toISOString().slice(0, 10);
      case 'week':
        const weekStart = new Date(d.setDate(d.getDate() - d.getDay()));
        return weekStart.toISOString().slice(0, 10);
      case 'month':
        return d.toISOString().slice(0, 7);
      default:
        return d.toISOString().slice(0, 10);
    }
  }

  getDateRangeStart(timeRange) {
    const now = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '1d':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
        break;
    }

    return startDate;
  }

  async getRealTimeMetrics() {
    try {
      const cacheKey = 'realtime_metrics';
      let metrics = analyticsCache.get(cacheKey);

      if (!metrics) {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const [activeUsersLastHour, pageViewsLastHour, sessionsLastHour] = await Promise.all([
          prisma.analyticsEvents.groupBy({
            by: ['userId'],
            where: {
              createdAt: { gte: oneHourAgo }
            },
            _count: { userId: true }
          }),
          prisma.analyticsEvents.count({
            where: {
              eventType: 'PAGE_VIEW',
              createdAt: { gte: oneHourAgo }
            }
          }),
          prisma.analyticsEvents.count({
            where: {
              eventType: 'SESSION_START',
              createdAt: { gte: oneHourAgo }
            }
          })
        ]);

        const [activeUsersLastDay, pageViewsLastDay, sessionsLastDay] = await Promise.all([
          prisma.analyticsEvents.groupBy({
            by: ['userId'],
            where: {
              createdAt: { gte: oneDayAgo }
            },
            _count: { userId: true }
          }),
          prisma.analyticsEvents.count({
            where: {
              eventType: 'PAGE_VIEW',
              createdAt: { gte: oneDayAgo }
            }
          }),
          prisma.analyticsEvents.count({
            where: {
              eventType: 'SESSION_START',
              createdAt: { gte: oneDayAgo }
            }
          })
        ]);

        metrics = {
          lastHour: {
            activeUsers: activeUsersLastHour.length,
            pageViews: pageViewsLastHour,
            sessions: sessionsLastHour
          },
          lastDay: {
            activeUsers: activeUsersLastDay.length,
            pageViews: pageViewsLastDay,
            sessions: sessionsLastDay
          },
          timestamp: now
        };

        // Cache for 5 minutes
        analyticsCache.set(cacheKey, metrics);
      }

      return metrics;
    } catch (error) {
      logger.error('Error getting real-time metrics:', error);
      throw error;
    }
  }

  async getTopMentors(timeRange = '30d', limit = 10) {
    try {
      const startDate = this.getDateRangeStart(timeRange);
      const cacheKey = `top_mentors_${timeRange}_${limit}`;
      
      let mentors = analyticsCache.get(cacheKey);

      if (!mentors) {
        mentors = await prisma.mentorPerformanceMetrics.findMany({
          where: {
            calculatedAt: { gte: startDate }
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

        analyticsCache.set(cacheKey, mentors);
      }

      return mentors;
    } catch (error) {
      logger.error('Error getting top mentors:', error);
      throw error;
    }
  }

  async getTopContent(timeRange = '30d', limit = 10) {
    try {
      const startDate = this.getDateRangeStart(timeRange);
      const cacheKey = `top_content_${timeRange}_${limit}`;
      
      let content = analyticsCache.get(cacheKey);

      if (!content) {
        const [topPosts, topSessions] = await Promise.all([
          prisma.post.findMany({
            where: {
              createdAt: { gte: startDate },
              isPublished: true
            },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  profileImage: true
                }
              },
              _count: {
                select: {
                  likes: true,
                  comments: true,
                  bookmarks: true
                }
              }
            },
            orderBy: {
              likes: {
                _count: 'desc'
              }
            },
            take: limit
          }),
          prisma.mentorshipSession.findMany({
            where: {
              createdAt: { gte: startDate },
              status: 'COMPLETED'
            },
            include: {
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
              },
              feedback: true
            },
            orderBy: {
              feedback: {
                rating: 'desc'
              }
            },
            take: limit
          })
        ]);

        content = {
          posts: topPosts,
          sessions: topSessions
        };

        analyticsCache.set(cacheKey, content);
      }

      return content;
    } catch (error) {
      logger.error('Error getting top content:', error);
      throw error;
    }
  }

  clearCacheForEvent(eventType) {
    const keys = analyticsCache.keys();
    keys.forEach(key => {
      if (key.includes('analytics') || key.includes('metrics')) {
        analyticsCache.del(key);
      }
    });
  }

  clearAllCache() {
    analyticsCache.flushAll();
  }

  getCacheStats() {
    return {
      keys: analyticsCache.keys().length,
      stats: analyticsCache.getStats()
    };
  }

  async exportAnalytics(format = 'json', filters = {}) {
    try {
      const analytics = await this.getPlatformAnalytics(filters);
      
      switch (format.toLowerCase()) {
        case 'csv':
          return this.convertToCSV(analytics);
        case 'json':
        default:
          return JSON.stringify(analytics, null, 2);
      }
    } catch (error) {
      logger.error('Error exporting analytics:', error);
      throw error;
    }
  }

  convertToCSV(data) {
    const csvRows = [];
    
    // Convert nested data to flat structure
    Object.entries(data).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        Object.entries(value).forEach(([subKey, subValue]) => {
          csvRows.push({
            category: key,
            metric: subKey,
            value: subValue
          });
        });
      }
    });

    // Convert to CSV string
    const headers = ['category', 'metric', 'value'];
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => 
        headers.map(header => `"${row[header] || ''}"`).join(',')
      )
    ].join('\n');

    return csvContent;
  }
}

module.exports = new AnalyticsService();
