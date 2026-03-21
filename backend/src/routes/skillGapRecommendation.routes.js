const express = require('express');
const router = express.Router();
const skillGapService = require('../services/skillGap.service');
const contentRecommendationService = require('../services/contentRecommendation.service');
const { authenticateToken } = require('../middleware/auth.middleware');
const { rateLimiter } = require('../middleware/rateLimit.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { body, query, param } = require('express-validator');

// Apply authentication to all routes
router.use(authenticateToken);

// Apply rate limiting - higher limits for load testing
router.use(rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs for load testing
  message: 'Too many requests from this IP, please try again later.'
}));

// ==================== SKILL GAP ROUTES ====================

/**
 * @route   POST /api/v1/skill-gaps/:userId/analyze
 * @desc    Analyze user's skill gaps using AI
 * @access  Private
 */
router.post('/skill-gaps/:userId/analyze',
  [
    param('userId').isString().withMessage('User ID must be a string'),
    body('includeHistorical').optional().isBoolean().withMessage('includeHistorical must be boolean'),
    body('predictFutureNeeds').optional().isBoolean().withMessage('predictFutureNeeds must be boolean'),
    body('careerGoals').optional().isArray().withMessage('careerGoals must be an array'),
    body('industry').optional().isString().withMessage('industry must be a string'),
    body('experienceLevel').optional().isString().withMessage('experienceLevel must be a string')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const options = req.body;

      // Check if user is requesting their own data or is admin
      if (req.user.id !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to analyze skill gaps for this user'
        });
      }

      const analysis = await skillGapService.analyzeUserSkillGaps(userId, options);

      res.json({
        success: true,
        data: analysis,
        message: 'Skill gap analysis completed successfully'
      });

    } catch (error) {
      logger.error('Error analyzing skill gaps:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze skill gaps',
        message: error.message
      });
    }
  }
);

/**
 * @route   GET /api/v1/skill-gaps/:userId
 * @desc    Get user's skill gaps
 * @access  Private
 */
router.get('/skill-gaps/:userId',
  [
    param('userId').isString().withMessage('User ID must be a string'),
    query('status').optional().isIn(['ACTIVE', 'ADDRESSING', 'CLOSED', 'IGNORED']).withMessage('Invalid status'),
    query('severity').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Invalid severity'),
    query('gapType').optional().isIn(['MISSING_SKILL', 'UNDERDEVELOPED', 'OUTDATED', 'PREREQUISITE']).withMessage('Invalid gap type'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const options = req.query;

      // Check if user is requesting their own data or is admin
      if (req.user.id !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to access skill gaps for this user'
        });
      }

      const gaps = await skillGapService.getUserSkillGaps(userId, options);

      res.json({
        success: true,
        data: gaps,
        count: gaps.length,
        message: 'Skill gaps retrieved successfully'
      });

    } catch (error) {
      logger.error('Error getting skill gaps:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get skill gaps',
        message: error.message
      });
    }
  }
);

/**
 * @route   PUT /api/v1/skill-gaps/:userId/:gapId/progress
 * @desc    Update skill gap progress
 * @access  Private
 */
router.put('/skill-gaps/:userId/:gapId/progress',
  [
    param('userId').isString().withMessage('User ID must be a string'),
    param('gapId').isString().withMessage('Gap ID must be a string'),
    body('progressValue').isFloat({ min: 0, max: 1 }).withMessage('Progress value must be between 0 and 1'),
    body('status').optional().isIn(['ACTIVE', 'ADDRESSING', 'CLOSED', 'IGNORED']).withMessage('Invalid status'),
    body('feedback').optional().isString().withMessage('Feedback must be a string')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId, gapId } = req.params;
      const progressData = req.body;

      // Check if user is updating their own data or is admin
      if (req.user.id !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to update skill gap progress for this user'
        });
      }

      const updatedGap = await skillGapService.updateSkillGapProgress(userId, gapId, progressData);

      res.json({
        success: true,
        data: updatedGap,
        message: 'Skill gap progress updated successfully'
      });

    } catch (error) {
      logger.error('Error updating skill gap progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update skill gap progress',
        message: error.message
      });
    }
  }
);

/**
 * @route   POST /api/v1/skill-gaps/:userId/:gapId/close
 * @desc    Close a skill gap
 * @access  Private
 */
router.post('/skill-gaps/:userId/:gapId/close',
  [
    param('userId').isString().withMessage('User ID must be a string'),
    param('gapId').isString().withMessage('Gap ID must be a string'),
    body('reason').isIn(['COMPLETED', 'IRRELEVANT', 'POSTPONED', 'ACHIEVED_ELSEWHERE']).withMessage('Invalid closure reason'),
    body('finalLevel').optional().isFloat({ min: 0, max: 1 }).withMessage('Final level must be between 0 and 1'),
    body('feedback').optional().isString().withMessage('Feedback must be a string'),
    body('timeSpent').optional().isInt({ min: 0 }).withMessage('Time spent must be non-negative')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId, gapId } = req.params;
      const closureData = req.body;

      // Check if user is closing their own gap or is admin
      if (req.user.id !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to close skill gap for this user'
        });
      }

      const closedGap = await skillGapService.closeSkillGap(userId, gapId, closureData);

      res.json({
        success: true,
        data: closedGap,
        message: 'Skill gap closed successfully'
      });

    } catch (error) {
      logger.error('Error closing skill gap:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to close skill gap',
        message: error.message
      });
    }
  }
);

/**
 * @route   GET /api/v1/skill-gaps/:userId/analytics
 * @desc    Get skill gap analytics for user
 * @access  Private
 */
router.get('/skill-gaps/:userId/analytics',
  [
    param('userId').isString().withMessage('User ID must be a string'),
    query('timeRange').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid time range')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { timeRange = '30d' } = req.query;

      // Check if user is requesting their own analytics or is admin
      if (req.user.id !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to access analytics for this user'
        });
      }

      const analytics = await skillGapService.getSkillGapAnalytics(userId, timeRange);

      res.json({
        success: true,
        data: analytics,
        message: 'Skill gap analytics retrieved successfully'
      });

    } catch (error) {
      logger.error('Error getting skill gap analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get skill gap analytics',
        message: error.message
      });
    }
  }
);

// ==================== CONTENT RECOMMENDATION ROUTES ====================

/**
 * @route   POST /api/v1/recommendations/content/:userId/generate
 * @desc    Generate content recommendations for user
 * @access  Private
 */
router.post('/recommendations/content/:userId/generate',
  [
    param('userId').isString().withMessage('User ID must be a string'),
    body('skillGapId').optional().isString().withMessage('Skill gap ID must be a string'),
    body('userSkillId').optional().isString().withMessage('User skill ID must be a string'),
    body('contentTypes').optional().isArray().withMessage('Content types must be an array'),
    body('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    body('algorithm').optional().isIn(['COLLABORATIVE', 'CONTENT_BASED', 'HYBRID', 'TRENDING', 'PERSONALIZED', 'AI_DRIVEN']).withMessage('Invalid algorithm'),
    body('includeTrending').optional().isBoolean().withMessage('includeTrending must be boolean'),
    body('difficulty').optional().isIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).withMessage('Invalid difficulty'),
    body('learningStyle').optional().isIn(['VISUAL', 'AUDITORY', 'KINESTHETIC', 'READING']).withMessage('Invalid learning style'),
    body('timeConstraint').optional().isInt({ min: 5 }).withMessage('Time constraint must be at least 5 minutes')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const options = req.body;

      // Check if user is requesting their own recommendations or is admin
      if (req.user.id !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to generate recommendations for this user'
        });
      }

      const recommendations = await contentRecommendationService.generateContentRecommendations(userId, options);

      res.json({
        success: true,
        data: recommendations,
        message: 'Content recommendations generated successfully'
      });

    } catch (error) {
      logger.error('Error generating content recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate content recommendations',
        message: error.message
      });
    }
  }
);

/**
 * @route   GET /api/v1/recommendations/content/:userId
 * @desc    Get user's content recommendations
 * @access  Private
 */
router.get('/recommendations/content/:userId',
  [
    param('userId').isString().withMessage('User ID must be a string'),
    query('status').optional().isIn(['ACTIVE', 'VIEWED', 'COMPLETED', 'DISMISSED', 'EXPIRED']).withMessage('Invalid status'),
    query('contentType').optional().isIn(['COURSE', 'TUTORIAL', 'ARTICLE', 'VIDEO', 'MENTOR_SESSION', 'PROJECT', 'EXERCISE', 'BOOK', 'PODCAST', 'WORKSHOP']).withMessage('Invalid content type'),
    query('algorithm').optional().isIn(['COLLABORATIVE', 'CONTENT_BASED', 'HYBRID', 'TRENDING', 'PERSONALIZED', 'AI_DRIVEN']).withMessage('Invalid algorithm'),
    query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const options = req.query;

      // Check if user is requesting their own recommendations or is admin
      if (req.user.id !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to access recommendations for this user'
        });
      }

      const recommendations = await contentRecommendationService.getUserRecommendations(userId, options);

      res.json({
        success: true,
        data: recommendations,
        count: recommendations.length,
        message: 'Content recommendations retrieved successfully'
      });

    } catch (error) {
      logger.error('Error getting content recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get content recommendations',
        message: error.message
      });
    }
  }
);

/**
 * @route   PUT /api/v1/recommendations/content/:userId/:recommendationId/status
 * @desc    Update recommendation status
 * @access  Private
 */
router.put('/recommendations/content/:userId/:recommendationId/status',
  [
    param('userId').isString().withMessage('User ID must be a string'),
    param('recommendationId').isString().withMessage('Recommendation ID must be a string'),
    body('status').isIn(['VIEWED', 'COMPLETED', 'DISMISSED', 'EXPIRED']).withMessage('Invalid status'),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('feedback').optional().isString().withMessage('Feedback must be a string')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId, recommendationId } = req.params;
      const { status, rating, feedback } = req.body;

      // Check if user is updating their own recommendation or is admin
      if (req.user.id !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to update recommendation status for this user'
        });
      }

      const metadata = { rating, feedback };
      const updatedRecommendation = await contentRecommendationService.updateRecommendationStatus(
        userId, 
        recommendationId, 
        status, 
        metadata
      );

      res.json({
        success: true,
        data: updatedRecommendation,
        message: 'Recommendation status updated successfully'
      });

    } catch (error) {
      logger.error('Error updating recommendation status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update recommendation status',
        message: error.message
      });
    }
  }
);

/**
 * @route   GET /api/v1/recommendations/content/:userId/analytics
 * @desc    Get content recommendation analytics for user
 * @access  Private
 */
router.get('/recommendations/content/:userId/analytics',
  [
    param('userId').isString().withMessage('User ID must be a string'),
    query('timeRange').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid time range')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { timeRange = '30d' } = req.query;

      // Check if user is requesting their own analytics or is admin
      if (req.user.id !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to access analytics for this user'
        });
      }

      const analytics = await contentRecommendationService.getRecommendationAnalytics(userId, timeRange);

      res.json({
        success: true,
        data: analytics,
        message: 'Content recommendation analytics retrieved successfully'
      });

    } catch (error) {
      logger.error('Error getting content recommendation analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get content recommendation analytics',
        message: error.message
      });
    }
  }
);

// ==================== LEARNING PATH RECOMMENDATION ROUTES ====================

/**
 * @route   POST /api/v1/recommendations/learning-path/:userId/suggest
 * @desc    Suggest updates to user's learning path based on skill gaps
 * @access  Private
 */
router.post('/recommendations/learning-path/:userId/suggest',
  [
    param('userId').isString().withMessage('User ID must be a string'),
    body('learningPathId').optional().isString().withMessage('Learning path ID must be a string'),
    body('includeNewGaps').optional().isBoolean().withMessage('includeNewGaps must be boolean'),
    body('prioritizeCritical').optional().isBoolean().withMessage('prioritizeCritical must be boolean')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const options = req.body;

      // Check if user is requesting their own recommendations or is admin
      if (req.user.id !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to generate learning path suggestions for this user'
        });
      }

      // Get user's skill gaps and current learning path
      const skillGaps = await skillGapService.getUserSkillGaps(userId, { status: 'ACTIVE' });
      
      // Generate learning path suggestions based on skill gaps
      const suggestions = await generateLearningPathSuggestions(userId, skillGaps, options);

      res.json({
        success: true,
        data: suggestions,
        message: 'Learning path suggestions generated successfully'
      });

    } catch (error) {
      logger.error('Error generating learning path suggestions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate learning path suggestions',
        message: error.message
      });
    }
  }
);

// ==================== HEALTH CHECK ROUTES ====================

/**
 * @route   GET /api/v1/skill-gaps/health
 * @desc    Get skill gap service health status
 * @access  Private
 */
router.get('/skill-gaps/health', async (req, res) => {
  try {
    const health = await skillGapService.getHealthStatus();
    res.json({
      success: true,
      data: health,
      message: 'Skill gap service is healthy'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Skill gap service health check failed',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/v1/recommendations/content/health
 * @desc    Get content recommendation service health status
 * @access  Private
 */
router.get('/recommendations/content/health', async (req, res) => {
  try {
    const health = await contentRecommendationService.getHealthStatus();
    res.json({
      success: true,
      data: health,
      message: 'Content recommendation service is healthy'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Content recommendation service health check failed',
      message: error.message
    });
  }
});

// ==================== UTILITY FUNCTIONS ====================

/**
 * Generate learning path suggestions based on skill gaps
 */
async function generateLearningPathSuggestions(userId, skillGaps, options) {
  try {
    const suggestions = [];
    
    // Group skill gaps by severity and urgency
    const criticalGaps = skillGaps.filter(gap => gap.gapSeverity === 'CRITICAL');
    const highGaps = skillGaps.filter(gap => gap.gapSeverity === 'HIGH');
    const mediumGaps = skillGaps.filter(gap => gap.gapSeverity === 'MEDIUM');
    
    // Generate suggestions for each gap
    for (const gap of criticalGaps) {
      suggestions.push({
        type: 'URGENT_UPDATE',
        skillGap: gap,
        recommendation: `Immediate attention needed for ${gap.skillName}`,
        suggestedActions: gap.recommendedActions,
        estimatedTime: gap.timeToClose,
        priority: 'URGENT'
      });
    }
    
    for (const gap of highGaps) {
      suggestions.push({
        type: 'HIGH_PRIORITY_UPDATE',
        skillGap: gap,
        recommendation: `High priority update for ${gap.skillName}`,
        suggestedActions: gap.recommendedActions,
        estimatedTime: gap.timeToClose,
        priority: 'HIGH'
      });
    }
    
    // Combine related gaps for efficiency
    const relatedGaps = findRelatedGaps(skillGaps);
    for (const relatedGroup of relatedGaps) {
      if (relatedGroup.length > 1) {
        suggestions.push({
          type: 'COMBINED_UPDATE',
          skillGaps: relatedGroup,
          recommendation: `Combined learning path for ${relatedGroup.map(g => g.skillName).join(', ')}`,
          suggestedActions: relatedGroup.flatMap(g => g.recommendedActions),
          estimatedTime: Math.max(...relatedGroup.map(g => g.timeToClose)),
          priority: 'MEDIUM'
        });
      }
    }
    
    return suggestions.sort((a, b) => {
      const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
  } catch (error) {
    logger.error('Error generating learning path suggestions:', error);
    throw error;
  }
}

/**
 * Find related skill gaps
 */
function findRelatedGaps(skillGaps) {
  const relatedGroups = [];
  const processed = new Set();
  
  for (const gap of skillGaps) {
    if (processed.has(gap.id)) continue;
    
    const related = [gap];
    processed.add(gap.id);
    
    // Find gaps with similar prerequisites or related skills
    for (const otherGap of skillGaps) {
      if (processed.has(otherGap.id)) continue;
      
      if (gap.skillName === otherGap.skillName) continue;
      
      // Check for related skills
      const gapPrereqs = gap.prerequisites || [];
      const otherPrereqs = otherGap.prerequisites || [];
      
      if (gapPrereqs.includes(otherGap.skillName) || otherPrereqs.includes(gap.skillName)) {
        related.push(otherGap);
        processed.add(otherGap.id);
      }
    }
    
    if (related.length > 1) {
      relatedGroups.push(related);
    }
  }
  
  return relatedGroups;
}

module.exports = router;
