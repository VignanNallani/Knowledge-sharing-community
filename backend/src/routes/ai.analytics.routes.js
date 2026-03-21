const express = require('express');
const router = express.Router();
const aiAnalyticsService = require('../services/ai.analytics.service');
const authMiddleware = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');
const { body, query, param, validationResult } = require('express-validator');

// Rate limiting for AI analytics endpoints
const analyticsRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many analytics requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const predictionRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 predictions per minute
  message: 'Too many prediction requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
router.use(authMiddleware);
router.use(analyticsRateLimit);

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Analytics Event Tracking
router.post('/events', [
  body('eventType').notEmpty().withMessage('Event type is required'),
  body('eventData').optional().isObject().withMessage('Event data must be an object'),
  body('sessionId').optional().isString().withMessage('Session ID must be a string'),
  body('duration').optional().isInt({ min: 0 }).withMessage('Duration must be a positive integer')
], handleValidationErrors, async (req, res) => {
  try {
    const { eventType, eventData, sessionId, duration } = req.body;
    const userId = req.user.id;

    const event = await aiAnalyticsService.trackAnalyticsEvent(userId, eventType, eventData, {
      sessionId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      referrer: req.get('Referrer'),
      metadata: {
        timestamp: new Date(),
        endpoint: req.path,
        method: req.method
      }
    });

    res.status(201).json({
      success: true,
      data: event,
      message: 'Analytics event tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking analytics event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track analytics event',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get User Behavior Analysis
router.get('/behavior/:userId', [
  param('userId').isInt().withMessage('User ID must be an integer'),
  query('behaviorType').optional().isString().withMessage('Behavior type must be a string')
], handleValidationErrors, async (req, res) => {
  try {
    const { userId } = req.params;
    const { behaviorType } = req.query;
    const currentUserId = req.user.id;

    // Users can only access their own behavior data unless admin
    if (userId != currentUserId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const behavior = await prisma.aIUserBehavior.findMany({
      where: {
        userId: parseInt(userId),
        ...(behaviorType && { behaviorType })
      },
      orderBy: { lastUpdated: 'desc' }
    });

    res.json({
      success: true,
      data: behavior,
      message: 'User behavior data retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting user behavior:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user behavior',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Content Recommendations
router.get('/recommendations/content', [
  query('userId').optional().isInt().withMessage('User ID must be an integer'),
  query('contentType').optional().isIn(['POST', 'MENTOR', 'SESSION', 'SKILL']).withMessage('Invalid content type'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('type').optional().isIn(['PERSONALIZED', 'TRENDING', 'SIMILAR', 'COLLABORATIVE']).withMessage('Invalid recommendation type')
], handleValidationErrors, async (req, res) => {
  try {
    const { userId, contentType = 'POST', limit = 10, type = 'PERSONALIZED' } = req.query;
    const currentUserId = req.user.id;

    // Use current user if userId not provided
    const targetUserId = userId ? parseInt(userId) : currentUserId;

    // Users can only get recommendations for themselves unless admin
    if (userId && targetUserId !== currentUserId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const recommendations = await aiAnalyticsService.generateContentRecommendations(targetUserId, {
      contentType,
      limit: parseInt(limit),
      recommendationType: type
    });

    res.json({
      success: true,
      data: recommendations,
      message: 'Content recommendations generated successfully'
    });
  } catch (error) {
    console.error('Error generating content recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate content recommendations',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Mentor Matching
router.get('/recommendations/mentors', [
  query('menteeId').optional().isInt().withMessage('Mentee ID must be an integer'),
  query('skills').optional().isString().withMessage('Skills must be a string'),
  query('experience').optional().isString().withMessage('Experience must be a string'),
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20')
], handleValidationErrors, async (req, res) => {
  try {
    const { menteeId, skills, experience, limit = 10 } = req.query;
    const currentUserId = req.user.id;

    // Use current user if menteeId not provided
    const targetMenteeId = menteeId ? parseInt(menteeId) : currentUserId;

    // Users can only get mentor matches for themselves unless admin
    if (menteeId && targetMenteeId !== currentUserId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const matches = await aiAnalyticsService.generateMentorMatches(targetMenteeId, {
      skills,
      experience,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: matches,
      message: 'Mentor matches generated successfully'
    });
  } catch (error) {
    console.error('Error generating mentor matches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate mentor matches',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Learning Path Generation
router.post('/learning-paths', [
  body('userId').optional().isInt().withMessage('User ID must be an integer'),
  body('pathType').isIn(['SKILL_BASED', 'CAREER_BASED', 'PERSONALIZED']).withMessage('Invalid path type'),
  body('targetSkills').optional().isString().withMessage('Target skills must be a string'),
  body('difficulty').optional().isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).withMessage('Invalid difficulty level'),
  body('estimatedDuration').optional().isInt({ min: 1, max: 200 }).withMessage('Duration must be between 1 and 200 hours')
], handleValidationErrors, async (req, res) => {
  try {
    const { userId, pathType, targetSkills, difficulty, estimatedDuration } = req.body;
    const currentUserId = req.user.id;

    // Use current user if userId not provided
    const targetUserId = userId ? parseInt(userId) : currentUserId;

    // Users can only generate learning paths for themselves unless admin
    if (userId && targetUserId !== currentUserId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const learningPath = await aiAnalyticsService.generateLearningPath(targetUserId, {
      pathType,
      targetSkills,
      difficulty,
      estimatedDuration
    });

    res.status(201).json({
      success: true,
      data: learningPath,
      message: 'Learning path generated successfully'
    });
  } catch (error) {
    console.error('Error generating learning path:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate learning path',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get Learning Paths
router.get('/learning-paths/:userId', [
  param('userId').isInt().withMessage('User ID must be an integer'),
  query('pathType').optional().isString().withMessage('Path type must be a string'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], handleValidationErrors, async (req, res) => {
  try {
    const { userId } = req.params;
    const { pathType, isActive } = req.query;
    const currentUserId = req.user.id;

    // Users can only access their own learning paths unless admin
    if (parseInt(userId) !== currentUserId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const whereClause = {
      userId: parseInt(userId),
      ...(pathType && { pathType }),
      ...(isActive !== undefined && { isActive: isActive === 'true' })
    };

    const learningPaths = await prisma.aILearningPath.findMany({
      where: whereClause,
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: learningPaths,
      message: 'Learning paths retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting learning paths:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve learning paths',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update Learning Path Progress
router.put('/learning-paths/:pathId/progress', [
  param('pathId').isInt().withMessage('Path ID must be an integer'),
  body('stepId').optional().isInt().withMessage('Step ID must be an integer'),
  body('progress').isFloat({ min: 0, max: 1 }).withMessage('Progress must be between 0 and 1'),
  body('isCompleted').optional().isBoolean().withMessage('isCompleted must be a boolean')
], handleValidationErrors, async (req, res) => {
  try {
    const { pathId } = req.params;
    const { stepId, progress, isCompleted } = req.body;
    const currentUserId = req.user.id;

    // Verify user owns the learning path
    const learningPath = await prisma.aILearningPath.findFirst({
      where: {
        id: parseInt(pathId),
        userId: currentUserId
      }
    });

    if (!learningPath) {
      return res.status(404).json({
        success: false,
        message: 'Learning path not found'
      });
    }

    // Update learning path progress
    const updatedPath = await prisma.aILearningPath.update({
      where: { id: parseInt(pathId) },
      data: {
        progress,
        ...(isCompleted && { completedAt: new Date() })
      }
    });

    // Update step progress if provided
    if (stepId) {
      await prisma.aILearningPathStep.update({
        where: { id: parseInt(stepId) },
        data: {
          isCompleted: isCompleted || false,
          ...(isCompleted && { completedAt: new Date() })
        }
      });
    }

    res.json({
      success: true,
      data: updatedPath,
      message: 'Learning path progress updated successfully'
    });
  } catch (error) {
    console.error('Error updating learning path progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update learning path progress',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Predictions (with stricter rate limiting)
router.get('/predictions', predictionRateLimit, [
  query('userId').optional().isInt().withMessage('User ID must be an integer'),
  query('predictionType').isIn(['ENGAGEMENT', 'RETENTION', 'PERFORMANCE', 'CONTENT_SUCCESS']).withMessage('Invalid prediction type'),
  query('timeRange').optional().isString().withMessage('Time range must be a string')
], handleValidationErrors, async (req, res) => {
  try {
    const { userId, predictionType, timeRange = '30d' } = req.query;
    const currentUserId = req.user.id;

    // Use current user if userId not provided
    const targetUserId = userId ? parseInt(userId) : currentUserId;

    // Users can only get predictions for themselves unless admin
    if (userId && targetUserId !== currentUserId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const predictions = await aiAnalyticsService.generatePredictions(targetUserId, predictionType, {
      timeRange
    });

    res.json({
      success: true,
      data: predictions,
      message: 'Predictions generated successfully'
    });
  } catch (error) {
    console.error('Error generating predictions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate predictions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get User Predictions
router.get('/predictions/:userId', [
  param('userId').isInt().withMessage('User ID must be an integer'),
  query('predictionType').optional().isString().withMessage('Prediction type must be a string'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], handleValidationErrors, async (req, res) => {
  try {
    const { userId } = req.params;
    const { predictionType, isActive } = req.query;
    const currentUserId = req.user.id;

    // Users can only access their own predictions unless admin
    if (parseInt(userId) !== currentUserId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const whereClause = {
      userId: parseInt(userId),
      ...(predictionType && { predictionType }),
      ...(isActive !== undefined && { isActive: isActive === 'true' })
    };

    const predictions = await prisma.aIPrediction.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({
      success: true,
      data: predictions,
      message: 'Predictions retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting predictions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve predictions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update Prediction Feedback
router.put('/predictions/:predictionId/feedback', [
  param('predictionId').isInt().withMessage('Prediction ID must be an integer'),
  body('feedback').optional().isString().withMessage('Feedback must be a string'),
  body('feedbackScore').optional().isFloat({ min: 1, max: 5 }).withMessage('Feedback score must be between 1 and 5'),
  body('isExecuted').optional().isBoolean().withMessage('isExecuted must be a boolean')
], handleValidationErrors, async (req, res) => {
  try {
    const { predictionId } = req.params;
    const { feedback, feedbackScore, isExecuted } = req.body;
    const currentUserId = req.user.id;

    // Verify user owns the prediction
    const prediction = await prisma.aIPrediction.findFirst({
      where: {
        id: parseInt(predictionId),
        userId: currentUserId
      }
    });

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found'
      });
    }

    const updatedPrediction = await prisma.aIPrediction.update({
      where: { id: parseInt(predictionId) },
      data: {
        ...(feedback && { feedback }),
        ...(feedbackScore && { feedbackScore }),
        ...(isExecuted !== undefined && { isExecuted }),
        ...(isExecuted && { executedAt: new Date() })
      }
    });

    res.json({
      success: true,
      data: updatedPrediction,
      message: 'Prediction feedback updated successfully'
    });
  } catch (error) {
    console.error('Error updating prediction feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update prediction feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// AI Insights
router.get('/insights', [
  query('insightType').isIn(['USER_TREND', 'PLATFORM_TREND', 'CONTENT_TREND', 'PERFORMANCE_ANOMALY']).withMessage('Invalid insight type'),
  query('timeRange').optional().isString().withMessage('Time range must be a string'),
  query('isRead').optional().isBoolean().withMessage('isRead must be a boolean')
], handleValidationErrors, async (req, res) => {
  try {
    const { insightType, timeRange = '30d', isRead } = req.query;

    const insights = await aiAnalyticsService.generateInsights(insightType, {
      timeRange,
      ...(isRead !== undefined && { isRead: isRead === 'true' })
    });

    res.json({
      success: true,
      data: insights,
      message: 'AI insights generated successfully'
    });
  } catch (error) {
    console.error('Error generating AI insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate AI insights',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get Insights
router.get('/insights/list', [
  query('insightType').optional().isString().withMessage('Insight type must be a string'),
  query('isRead').optional().isBoolean().withMessage('isRead must be a boolean'),
  query('isArchived').optional().isBoolean().withMessage('isArchived must be a boolean'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], handleValidationErrors, async (req, res) => {
  try {
    const { insightType, isRead, isArchived, limit = 50 } = req.query;

    const whereClause = {
      ...(insightType && { insightType }),
      ...(isRead !== undefined && { isRead: isRead === 'true' }),
      ...(isArchived !== undefined && { isArchived: isArchived === 'true' }),
      expiresAt: { gt: new Date() } // Only non-expired insights
    };

    const insights = await prisma.aIInsight.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    res.json({
      success: true,
      data: insights,
      message: 'Insights retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve insights',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Mark Insight as Read
router.put('/insights/:insightId/read', [
  param('insightId').isInt().withMessage('Insight ID must be an integer')
], handleValidationErrors, async (req, res) => {
  try {
    const { insightId } = req.params;

    const updatedInsight = await prisma.aIInsight.update({
      where: { id: parseInt(insightId) },
      data: { isRead: true }
    });

    res.json({
      success: true,
      data: updatedInsight,
      message: 'Insight marked as read successfully'
    });
  } catch (error) {
    console.error('Error marking insight as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark insight as read',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Archive Insight
router.put('/insights/:insightId/archive', [
  param('insightId').isInt().withMessage('Insight ID must be an integer')
], handleValidationErrors, async (req, res) => {
  try {
    const { insightId } = req.params;

    const updatedInsight = await prisma.aIInsight.update({
      where: { id: parseInt(insightId) },
      data: { isArchived: true }
    });

    res.json({
      success: true,
      data: updatedInsight,
      message: 'Insight archived successfully'
    });
  } catch (error) {
    console.error('Error archiving insight:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive insight',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// AI Models Management (Admin only)
router.get('/models', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const models = await prisma.aIModel.findMany({
      include: {
        trainings: {
          orderBy: { startedAt: 'desc' },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: models,
      message: 'AI models retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting AI models:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve AI models',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Train Model (Admin only)
router.post('/models/:modelId/train', [
  param('modelId').isInt().withMessage('Model ID must be an integer'),
  body('trainingType').optional().isIn(['INCREMENTAL', 'FULL', 'RETRAIN']).withMessage('Invalid training type')
], handleValidationErrors, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { modelId } = req.params;
    const { trainingType = 'INCREMENTAL' } = req.body;

    const model = await prisma.aIModel.findUnique({
      where: { id: parseInt(modelId) }
    });

    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Model not found'
      });
    }

    // Start training process
    await aiAnalyticsService.trainModel(model, trainingType);

    res.json({
      success: true,
      message: 'Model training started successfully'
    });
  } catch (error) {
    console.error('Error starting model training:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start model training',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get Analytics Metrics
router.get('/metrics', [
  query('timeRange').optional().isString().withMessage('Time range must be a string'),
  query('metricType').optional().isString().withMessage('Metric type must be a string')
], handleValidationErrors, async (req, res) => {
  try {
    const { timeRange = '30d', metricType } = req.query;

    const metrics = await aiAnalyticsService.getAnalyticsMetrics(timeRange);

    // Filter by metric type if specified
    const filteredMetrics = metricType 
      ? metrics.filter(metric => metric.metricType === metricType)
      : metrics;

    res.json({
      success: true,
      data: {
        timeRange,
        metrics: filteredMetrics,
        total: filteredMetrics.length
      },
      message: 'Analytics metrics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting analytics metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get Platform Analytics
router.get('/platform', [
  query('timeRange').optional().isString().withMessage('Time range must be a string'),
  query('metrics').optional().isString().withMessage('Metrics must be a string')
], handleValidationErrors, async (req, res) => {
  try {
    const { timeRange = '30d', metrics } = req.query;

    const platformAnalytics = await aiAnalyticsService.getAnalyticsMetrics(timeRange);

    res.json({
      success: true,
      data: {
        timeRange,
        analytics: platformAnalytics,
        generatedAt: new Date()
      },
      message: 'Platform analytics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting platform analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve platform analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Export Analytics Data
router.get('/export', [
  query('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv'),
  query('timeRange').optional().isString().withMessage('Time range must be a string'),
  query('metricType').optional().isString().withMessage('Metric type must be a string')
], handleValidationErrors, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { format = 'json', timeRange = '30d', metricType } = req.query;

    const analyticsData = await aiAnalyticsService.getAnalyticsMetrics(timeRange);
    const exportData = await aiAnalyticsService.exportAnalytics(format, {
      timeRange,
      metricType
    });

    // Set appropriate headers
    const filename = `analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.${format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');

    res.send(exportData);
  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Clear Cache (Admin only)
router.post('/cache/clear', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    aiAnalyticsService.clearAllCache();

    res.json({
      success: true,
      message: 'AI analytics cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get Cache Stats (Admin only)
router.get('/cache/stats', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const cacheStats = aiAnalyticsService.getCacheStats();

    res.json({
      success: true,
      data: cacheStats,
      message: 'Cache statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cache statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Health Check for AI Analytics Service
router.get('/health', async (req, res) => {
  try {
    const cacheStats = aiAnalyticsService.getCacheStats();
    const models = await prisma.aIModel.count({ where: { isActive: true } });

    const health = {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        aiAnalyticsService: 'operational',
        cache: cacheStats.keys > 0 ? 'operational' : 'empty',
        models: models > 0 ? 'operational' : 'no_active_models'
      },
      metrics: {
        activeModels: models,
        cacheKeys: cacheStats.keys,
        cacheHits: cacheStats.stats?.hits || 0,
        cacheMisses: cacheStats.stats?.misses || 0
      }
    };

    res.json({
      success: true,
      data: health,
      message: 'AI Analytics service health check completed'
    });
  } catch (error) {
    console.error('Error during health check:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
