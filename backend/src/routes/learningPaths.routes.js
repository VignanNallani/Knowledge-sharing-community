const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth.middleware');
const learningPathService = require('../services/learningPath.service');
const mentorRecommendationService = require('../services/mentorRecommendation.service');
const logger = require('../utils/logger.util');

const router = express.Router();

// Rate limiting configuration
const learningPathsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many learning path requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

const mentorRecommendationsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // 50 requests per minute
  message: 'Too many mentor recommendation requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to all routes
router.use(learningPathsLimiter);

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

// LEARNING PATHS ROUTES

// POST /api/v1/learning-paths - Create personalized learning path
router.post('/',
  authMiddleware,
  [
    body('targetSkills')
      .isArray()
      .withMessage('Target skills must be an array'),
    body('targetSkills.*')
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Each skill must be a string between 1 and 50 characters'),
    body('difficulty')
      .optional()
      .isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
      .withMessage('Difficulty must be BEGINNER, INTERMEDIATE, or ADVANCED'),
    body('pathType')
      .optional()
      .isIn(['SKILL_BASED', 'CAREER_BASED', 'PERSONALIZED'])
      .withMessage('Path type must be SKILL_BASED, CAREER_BASED, or PERSONALIZED'),
    body('estimatedDuration')
      .optional()
      .isInt({ min: 1, max: 200 })
      .withMessage('Estimated duration must be between 1 and 200 hours'),
    body('careerGoals')
      .optional()
      .isArray()
      .withMessage('Career goals must be an array'),
    body('careerGoals.*')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Each career goal must be a string between 1 and 100 characters'),
    body('currentSkills')
      .optional()
      .isArray()
      .withMessage('Current skills must be an array'),
    body('currentSkills.*')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Each current skill must be a string between 1 and 50 characters'),
    body('learningStyle')
      .optional()
      .isIn(['VISUAL', 'AUDITORY', 'KINESTHETIC', 'READING', 'INTERACTIVE'])
      .withMessage('Learning style must be VISUAL, AUDITORY, KINESTHETIC, READING, or INTERACTIVE')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const {
        targetSkills = [],
        difficulty = 'INTERMEDIATE',
        pathType = 'PERSONALIZED',
        estimatedDuration = 40,
        careerGoals = [],
        currentSkills = [],
        learningStyle = 'VISUAL'
      } = req.body;

      logger.info(`Creating learning path for user ${userId}`, {
        targetSkills,
        difficulty,
        pathType,
        estimatedDuration
      });

      const result = await learningPathService.generatePersonalizedPath(userId, {
        targetSkills,
        difficulty,
        pathType,
        estimatedDuration,
        careerGoals,
        currentSkills,
        learningStyle
      });

      res.status(201).json({
        success: true,
        message: 'Learning path created successfully',
        data: result
      });

    } catch (error) {
      logger.error('Error creating learning path:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create learning path',
        error: error.message
      });
    }
  }
);

// GET /api/v1/learning-paths/:userId - Get learning paths for user
router.get('/:userId',
  authMiddleware,
  [
    param('userId')
      .isInt({ min: 1 })
      .withMessage('User ID must be a positive integer'),
    query('status')
      .optional()
      .isIn(['in_progress', 'completed', 'paused'])
      .withMessage('Status must be in_progress, completed, or paused'),
    query('pathType')
      .optional()
      .isIn(['SKILL_BASED', 'CAREER_BASED', 'PERSONALIZED'])
      .withMessage('Path type must be SKILL_BASED, CAREER_BASED, or PERSONALIZED'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const {
        status,
        pathType,
        limit = 10,
        offset = 0
      } = req.query;

      // Check authorization (user can only access their own paths)
      if (parseInt(userId) !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      logger.info(`Getting learning paths for user ${userId}`, {
        status,
        pathType,
        limit,
        offset
      });

      const learningPaths = await learningPathService.getUserLearningPaths(parseInt(userId), {
        status,
        pathType,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        message: 'Learning paths retrieved successfully',
        data: learningPaths,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: learningPaths.length
        }
      });

    } catch (error) {
      logger.error('Error getting learning paths:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve learning paths',
        error: error.message
      });
    }
  }
);

// GET /api/v1/learning-paths/details/:id - Get learning path details
router.get('/details/:id',
  authMiddleware,
  [
    param('id')
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Learning path ID must be a string between 1 and 50 characters')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      logger.info(`Getting learning path details for path ${id}`, { userId });

      const learningPath = await learningPathService.getLearningPathDetails(id, userId);

      res.json({
        success: true,
        message: 'Learning path details retrieved successfully',
        data: learningPath
      });

    } catch (error) {
      logger.error('Error getting learning path details:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: 'Learning path not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve learning path details',
        error: error.message
      });
    }
  }
);

// PATCH /api/v1/learning-paths/:id/progress - Update learning path progress
router.patch('/:id/progress',
  authMiddleware,
  [
    param('id')
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Learning path ID must be a string between 1 and 50 characters'),
    body('stepId')
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Step ID must be a string between 1 and 50 characters'),
    body('progressValue')
      .isFloat({ min: 0, max: 1 })
      .withMessage('Progress value must be between 0 and 1'),
    body('timeSpent')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Time spent must be a non-negative integer'),
    body('completed')
      .optional()
      .isBoolean()
      .withMessage('Completed must be a boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const {
        stepId,
        progressValue,
        timeSpent = 0,
        completed = false
      } = req.body;

      logger.info(`Updating progress for learning path ${id}`, {
        userId,
        stepId,
        progressValue,
        timeSpent,
        completed
      });

      const result = await learningPathService.updateProgress(userId, id, stepId, {
        progressValue,
        timeSpent,
        completed
      });

      res.json({
        success: true,
        message: 'Progress updated successfully',
        data: result
      });

    } catch (error) {
      logger.error('Error updating learning path progress:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update progress',
        error: error.message
      });
    }
  }
);

// DELETE /api/v1/learning-paths/:id - Delete learning path
router.delete('/:id',
  authMiddleware,
  [
    param('id')
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Learning path ID must be a string between 1 and 50 characters')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      logger.info(`Deleting learning path ${id}`, { userId });

      const result = await learningPathService.deleteLearningPath(id, userId);

      res.json({
        success: true,
        message: 'Learning path deleted successfully',
        data: result
      });

    } catch (error) {
      logger.error('Error deleting learning path:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: 'Learning path not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete learning path',
        error: error.message
      });
    }
  }
);

// GET /api/v1/learning-paths/:id/recommendations - Get recommendations for learning path
router.get('/:id/recommendations',
  authMiddleware,
  [
    param('id')
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Learning path ID must be a string between 1 and 50 characters')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      logger.info(`Getting recommendations for learning path ${id}`, { userId });

      const recommendations = await learningPathService.generateRecommendations(userId, id);

      res.json({
        success: true,
        message: 'Recommendations retrieved successfully',
        data: recommendations
      });

    } catch (error) {
      logger.error('Error getting learning path recommendations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve recommendations',
        error: error.message
      });
    }
  }
);

// MENTOR RECOMMENDATIONS ROUTES

// GET /api/v1/recommendations/mentors - Get top mentor recommendations
router.get('/recommendations/mentors',
  authMiddleware,
  mentorRecommendationsLimiter,
  [
    query('skills')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') {
          try {
            const skills = JSON.parse(value);
            return Array.isArray(skills);
          } catch {
            return false;
          }
        }
        return true;
      })
      .withMessage('Skills must be a valid JSON array'),
    query('experience')
      .optional()
      .isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
      .withMessage('Experience must be BEGINNER, INTERMEDIATE, or ADVANCED'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Limit must be between 1 and 20'),
    query('minRating')
      .optional()
      .isFloat({ min: 1, max: 5 })
      .withMessage('Minimum rating must be between 1 and 5'),
    query('maxSessions')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Maximum sessions must be a non-negative integer')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const {
        skills,
        experience = 'INTERMEDIATE',
        limit = 10,
        minRating = 4.0,
        maxSessions
      } = req.query;

      // Parse skills if provided as string
      const parsedSkills = skills ? (typeof skills === 'string' ? JSON.parse(skills) : skills) : [];

      logger.info(`Getting mentor recommendations for user ${userId}`, {
        skills: parsedSkills,
        experience,
        limit,
        minRating,
        maxSessions
      });

      const recommendations = await mentorRecommendationService.generateMentorRecommendations(userId, {
        skills: parsedSkills,
        experience,
        limit: parseInt(limit),
        filters: {
          minRating: parseFloat(minRating),
          maxSessions: maxSessions ? parseInt(maxSessions) : undefined
        }
      });

      res.json({
        success: true,
        message: 'Mentor recommendations retrieved successfully',
        data: recommendations
      });

    } catch (error) {
      logger.error('Error getting mentor recommendations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve mentor recommendations',
        error: error.message
      });
    }
  }
);

// GET /api/v1/recommendations/mentors/:userId - Get personalized mentor recommendations for user
router.get('/recommendations/mentors/:userId',
  authMiddleware,
  mentorRecommendationsLimiter,
  [
    param('userId')
      .isInt({ min: 1 })
      .withMessage('User ID must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Limit must be between 1 and 20'),
    query('minScore')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('Minimum score must be between 0 and 1'),
    query('includeExpired')
      .optional()
      .isBoolean()
      .withMessage('Include expired must be a boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const {
        limit = 10,
        minScore = 0.5,
        includeExpired = false
      } = req.query;

      // Check authorization (user can only access their own recommendations)
      if (parseInt(userId) !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      logger.info(`Getting stored mentor recommendations for user ${userId}`, {
        limit,
        minScore,
        includeExpired
      });

      const recommendations = await mentorRecommendationService.getStoredMentorRecommendations(parseInt(userId), {
        limit: parseInt(limit),
        minScore: parseFloat(minScore),
        includeExpired: includeExpired === 'true'
      });

      res.json({
        success: true,
        message: 'Mentor recommendations retrieved successfully',
        data: recommendations
      });

    } catch (error) {
      logger.error('Error getting stored mentor recommendations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve mentor recommendations',
        error: error.message
      });
    }
  }
);

// POST /api/v1/recommendations/mentors/score - Update mentor scoring
router.post('/recommendations/mentors/score',
  authMiddleware,
  mentorRecommendationsLimiter,
  [
    body('mentorId')
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Mentor ID must be a string between 1 and 50 characters'),
    body('score')
      .isFloat({ min: 0, max: 1 })
      .withMessage('Score must be between 0 and 1'),
    body('skillMatch')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('Skill match must be between 0 and 1'),
    body('availability')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('Availability must be between 0 and 1'),
    body('performance')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('Performance must be between 0 and 1'),
    body('compatibility')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('Compatibility must be between 0 and 1')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const {
        mentorId,
        score,
        skillMatch,
        availability,
        performance,
        compatibility
      } = req.body;

      logger.info(`Updating mentor score for mentor ${mentorId}`, {
        userId,
        score,
        skillMatch,
        availability,
        performance,
        compatibility
      });

      // This would update the mentor scoring in the database
      // For now, we'll just return success
      res.json({
        success: true,
        message: 'Mentor score updated successfully',
        data: {
          mentorId,
          userId,
          score,
          skillMatch,
          availability,
          performance,
          compatibility,
          updatedAt: new Date()
        }
      });

    } catch (error) {
      logger.error('Error updating mentor score:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update mentor score',
        error: error.message
      });
    }
  }
);

// POST /api/v1/recommendations/mentors/:mentorId/feedback - Update mentor feedback
router.post('/recommendations/mentors/:mentorId/feedback',
  authMiddleware,
  mentorRecommendationsLimiter,
  [
    param('mentorId')
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Mentor ID must be a string between 1 and 50 characters'),
    body('score')
      .isFloat({ min: 1, max: 5 })
      .withMessage('Feedback score must be between 1 and 5'),
    body('comment')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Feedback comment must be between 1 and 500 characters')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { mentorId } = req.params;
      const { score, comment } = req.body;

      logger.info(`Updating mentor feedback for mentor ${mentorId}`, {
        userId,
        score,
        comment
      });

      const result = await mentorRecommendationService.updateMentorFeedback(userId, mentorId, {
        score,
        comment
      });

      res.json({
        success: true,
        message: 'Mentor feedback updated successfully',
        data: result
      });

    } catch (error) {
      logger.error('Error updating mentor feedback:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update mentor feedback',
        error: error.message
      });
    }
  }
);

// GET /api/v1/recommendations/mentors/:mentorId/availability - Get mentor availability
router.get('/recommendations/mentors/:mentorId/availability',
  authMiddleware,
  mentorRecommendationsLimiter,
  [
    param('mentorId')
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Mentor ID must be a string between 1 and 50 characters'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO8601 date'),
    query('status')
      .optional()
      .isIn(['AVAILABLE', 'BOOKED', 'CANCELLED'])
      .withMessage('Status must be AVAILABLE, BOOKED, or CANCELLED')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { mentorId } = req.params;
      const {
        startDate,
        endDate,
        status = 'AVAILABLE'
      } = req.query;

      const options = {
        status
      };

      if (startDate) {
        options.startDate = new Date(startDate);
      }

      if (endDate) {
        options.endDate = new Date(endDate);
      }

      logger.info(`Getting availability for mentor ${mentorId}`, options);

      const availability = await mentorRecommendationService.getMentorAvailability(mentorId, options);

      res.json({
        success: true,
        message: 'Mentor availability retrieved successfully',
        data: availability
      });

    } catch (error) {
      logger.error('Error getting mentor availability:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve mentor availability',
        error: error.message
      });
    }
  }
);

// HEALTH CHECK ENDPOINT

// GET /api/v1/learning-paths/health - Health check for learning paths service
router.get('/health', async (req, res) => {
  try {
    const learningPathHealth = await learningPathService.getHealthStatus();
    const mentorRecommendationHealth = await mentorRecommendationService.getHealthStatus();

    const health = {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        learningPaths: learningPathHealth,
        mentorRecommendations: mentorRecommendationHealth
      }
    };

    // Check if any service is unhealthy
    if (learningPathHealth.status === 'error' || mentorRecommendationHealth.status === 'error') {
      health.status = 'degraded';
      return res.status(503).json(health);
    }

    res.json(health);

  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date(),
      error: error.message
    });
  }
});

// ERROR HANDLING MIDDLEWARE

router.use((error, req, res, next) => {
  logger.error('Unhandled error in learning paths routes:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      error: error.message
    });
  }

  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized access'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

module.exports = router;
