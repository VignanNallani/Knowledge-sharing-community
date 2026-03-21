const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const analyticsService = require('../services/analytics.service');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for analytics endpoints
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
  message: {
    error: 'Too many analytics requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all analytics routes
router.use(analyticsLimiter);

// Track analytics event
router.post('/events', authenticate, async (req, res) => {
  try {
    const { eventType, eventData, sessionId } = req.body;
    const userId = req.user.id;

    if (!eventType) {
      return res.status(400).json({
        success: false,
        error: 'eventType is required'
      });
    }

    const event = await analyticsService.trackEvent(
      userId,
      eventType,
      eventData,
      sessionId,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referrer')
      }
    );

    res.status(201).json({
      success: true,
      data: event,
      message: 'Event tracked successfully'
    });
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Track user activity
router.post('/activity', authenticate, async (req, res) => {
  try {
    const { activityType, entityType, entityId, activityData, duration } = req.body;
    const userId = req.user.id;

    if (!activityType) {
      return res.status(400).json({
        success: false,
        error: 'activityType is required'
      });
    }

    const activity = await analyticsService.trackUserActivity(
      userId,
      activityType,
      entityType,
      entityId,
      activityData,
      duration
    );

    res.status(201).json({
      success: true,
      data: activity,
      message: 'Activity tracked successfully'
    });
  } catch (error) {
    console.error('Track activity error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get session engagement metrics
router.get('/sessions/:sessionId/engagement', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { startDate, endDate } = req.query;

    const metrics = await analyticsService.getSessionEngagementMetrics(
      parseInt(sessionId),
      { startDate, endDate }
    );

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Get session engagement metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get mentor performance metrics
router.get('/mentors/:mentorId/performance', authenticate, async (req, res) => {
  try {
    const { mentorId } = req.params;
    const { timeRange = '30d' } = req.query;

    // Check if user is requesting their own metrics or is admin
    if (req.user.id !== parseInt(mentorId) && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const metrics = await analyticsService.getMentorPerformanceMetrics(
      parseInt(mentorId),
      timeRange
    );

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Get mentor performance metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user analytics
router.get('/users/:userId/analytics', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      timeRange = '30d', 
      eventTypes = [], 
      groupBy = 'day' 
    } = req.query;

    // Check if user is requesting their own analytics or is admin
    if (req.user.id !== parseInt(userId) && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const analytics = await analyticsService.getUserAnalytics(
      parseInt(userId),
      { timeRange, eventTypes, groupBy }
    );

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get user analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get platform analytics (admin only)
router.get('/platform', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { 
      timeRange = '30d', 
      metrics = ['events', 'users', 'sessions', 'engagement'] 
    } = req.query;

    const analytics = await analyticsService.getPlatformAnalytics({ timeRange, metrics });

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get platform analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get real-time metrics
router.get('/realtime', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const metrics = await analyticsService.getRealTimeMetrics();

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Get real-time metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get top mentors
router.get('/top-mentors', authenticate, async (req, res) => {
  try {
    const { timeRange = '30d', limit = 10 } = req.query;

    const mentors = await analyticsService.getTopMentors(timeRange, parseInt(limit));

    res.json({
      success: true,
      data: mentors
    });
  } catch (error) {
    console.error('Get top mentors error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get top content
router.get('/top-content', authenticate, async (req, res) => {
  try {
    const { timeRange = '30d', limit = 10 } = req.query;

    const content = await analyticsService.getTopContent(timeRange, parseInt(limit));

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Get top content error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export analytics data (admin only)
router.get('/export', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { format = 'json', timeRange = '30d', metrics = ['events', 'users', 'sessions', 'engagement'] } = req.query;

    const analyticsData = await analyticsService.exportAnalytics(format, { timeRange, metrics });

    if (format.toLowerCase() === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
      res.send(analyticsData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics.json');
      res.json(analyticsData);
    }
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get cache stats (admin only)
router.get('/cache/stats', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const stats = analyticsService.getCacheStats();

    res.json({
      success: true,
      data: stats
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
router.post('/cache/clear', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    analyticsService.clearAllCache();

    res.json({
      success: true,
      message: 'Analytics cache cleared successfully'
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get analytics dashboard data
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const userId = req.user.id;

    // Get comprehensive dashboard data
    const [
      userAnalytics,
      realTimeMetrics,
      topMentors,
      topContent,
      platformStats
    ] = await Promise.all([
      analyticsService.getUserAnalytics(userId, { timeRange }),
      analyticsService.getRealTimeMetrics(),
      analyticsService.getTopMentors(timeRange, 5),
      analyticsService.getTopContent(timeRange, 5),
      req.user.role === 'ADMIN' 
        ? analyticsService.getPlatformAnalytics({ timeRange, metrics: ['users', 'sessions', 'engagement'] })
        : Promise.resolve({})
    ]);

    const dashboardData = {
      user: userAnalytics,
      realTime: realTimeMetrics,
      topMentors,
      topContent,
      platform: req.user.role === 'ADMIN' ? platformStats : null,
      timeRange,
      generatedAt: new Date()
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get engagement trends
router.get('/trends/engagement', authenticate, async (req, res) => {
  try {
    const { timeRange = '30d', groupBy = 'day' } = req.query;

    const startDate = analyticsService.getDateRangeStart(timeRange);
    const endDate = new Date();

    const [eventStats, userStats, sessionStats, engagementStats] = await Promise.all([
      analyticsService.getEventStats(startDate),
      analyticsService.getUserStats(startDate),
      analyticsService.getSessionStats(startDate),
      analyticsService.getEngagementStats(startDate)
    ]);

    const trends = {
      timeRange,
      groupBy,
      startDate,
      endDate,
      events: eventStats,
      users: userStats,
      sessions: sessionStats,
      engagement: engagementStats,
      generatedAt: new Date()
    };

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Get engagement trends error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user journey analytics
router.get('/journey/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeRange = '30d' } = req.query;

    // Check if user is requesting their own journey or is admin
    if (req.user.id !== parseInt(userId) && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const userAnalytics = await analyticsService.getUserAnalytics(
      parseInt(userId),
      { timeRange, eventTypes: ['PAGE_VIEW', 'SESSION_START', 'POST_CREATE', 'USER_FOLLOW'], groupBy: 'day' }
    );

    // Process journey data
    const journey = {
      userId: parseInt(userId),
      timeRange,
      timeline: userAnalytics.timeline || [],
      summary: userAnalytics.summary || {},
      insights: this.generateJourneyInsights(userAnalytics),
      generatedAt: new Date()
    };

    res.json({
      success: true,
      data: journey
    });
  } catch (error) {
    console.error('Get user journey error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to generate journey insights
function generateJourneyInsights(userAnalytics) {
  const insights = [];
  
  if (!userAnalytics.summary) return insights;

  const { summary } = userAnalytics;
  
  // Most active day
  if (summary.timeline) {
    const mostActiveDay = Object.entries(summary.timeline)
      .sort(([,a], [,b]) => b.events - a.events)[0];
    
    if (mostActiveDay) {
      insights.push({
        type: 'most_active_day',
        title: 'Most Active Day',
        description: `Most active on ${mostActiveDay[0]} with ${mostActiveDay[1].events} activities`,
        value: mostActiveDay[0]
      });
    }
  }

  // Engagement patterns
  const totalInteractions = Object.values(summary.timeline)
    .reduce((sum, day) => sum + (day.interactions || 0), 0);
  
  if (totalInteractions > 0) {
    insights.push({
      type: 'engagement_level',
      title: 'Engagement Level',
      description: `${totalInteractions} total interactions in the period`,
      value: totalInteractions > 50 ? 'high' : totalInteractions > 20 ? 'medium' : 'low'
    });
  }

  return insights;
}

module.exports = router;
