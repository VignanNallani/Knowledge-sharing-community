const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const recommendationService = require('../services/recommendation.service');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for recommendation endpoints
const recommendationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // limit each IP to 50 requests per minute
  message: {
    error: 'Too many recommendation requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all recommendation routes
router.use(recommendationLimiter);

// Get mentor recommendations
router.get('/mentors', authenticate, async (req, res) => {
  try {
    const {
      limit = 10,
      skills,
      experienceLevel,
      availability,
      rating,
      timeRange
    } = req.query;

    const filters = {
      skills: skills ? skills.split(',') : undefined,
      experienceLevel,
      availability: availability === 'true' ? true : availability === 'false' ? false : undefined,
      rating: rating ? parseInt(rating) : undefined,
      timeRange: timeRange || '30d'
    };

    const recommendations = await recommendationService.generateRecommendations(
      req.user.id,
      'MENTOR',
      Math.min(parseInt(limit), 50),
      filters
    );

    res.json({
      success: true,
      data: recommendations,
      message: 'Mentor recommendations generated successfully'
    });
  } catch (error) {
    console.error('Get mentor recommendations error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get session recommendations
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const {
      limit = 10,
      skills,
      experienceLevel,
      availability,
      rating,
      timeRange
    } = req.query;

    const filters = {
      skills: skills ? skills.split(',') : undefined,
      experienceLevel,
      availability: availability === 'true' ? true : availability === 'false' ? false : undefined,
      rating: rating ? parseInt(rating) : undefined,
      timeRange: timeRange || '30d'
    };

    const recommendations = await recommendationService.generateRecommendations(
      req.user.id,
      'SESSION',
      Math.min(parseInt(limit), 50),
      filters
    );

    res.json({
      success: true,
      data: recommendations,
      message: 'Session recommendations generated successfully'
    });
  } catch (error) {
    console.error('Get session recommendations error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get post recommendations
router.get('/posts', authenticate, async (req, res) => {
  try {
    const {
      limit = 10,
      skills,
      categories,
      timeRange,
      minEngagement
    } = req.query;

    const filters = {
      skills: skills ? skills.split(',') : undefined,
      categories: categories ? categories.split(',') : undefined,
      timeRange: timeRange || '30d',
      minEngagement: minEngagement ? parseInt(minEngagement) : undefined
    };

    const recommendations = await recommendationService.generateRecommendations(
      req.user.id,
      'POST',
      Math.min(parseInt(limit), 50),
      filters
    );

    res.json({
      success: true,
      data: recommendations,
      message: 'Post recommendations generated successfully'
    });
  } catch (error) {
    console.error('Get post recommendations error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get content recommendations
router.get('/content', authenticate, async (req, res) => {
  try {
    const {
      limit = 10,
      categories,
      timeRange,
      minQuality
    } = req.query;

    const filters = {
      categories: categories ? categories.split(',') : undefined,
      timeRange: timeRange || '30d',
      minQuality: minQuality ? parseFloat(minQuality) : undefined
    };

    const recommendations = await recommendationService.generateRecommendations(
      req.user.id,
      'CONTENT',
      Math.min(parseInt(limit), 50),
      filters
    );

    res.json({
      success: true,
      data: recommendations,
      message: 'Content recommendations generated successfully'
    });
  } catch (error) {
    console.error('Get content recommendations error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get hybrid recommendations (combination of all types)
router.get('/hybrid', authenticate, async (req, res) => {
  try {
    const {
      limit = 10,
      type,
      skills,
      categories,
      timeRange,
      minQuality,
      minEngagement
    } = req.query;

    const filters = {
      skills: skills ? skills.split(',') : undefined,
      categories: categories ? categories.split(',') : undefined,
      timeRange: timeRange || '30d',
      minQuality: minQuality ? parseFloat(minQuality) : undefined,
      minEngagement: minEngagement ? parseInt(minEngagement) : undefined
    };

    const recommendations = await recommendationService.generateRecommendations(
      req.user.id,
      type || 'HYBRID',
      Math.min(parseInt(limit), 50),
      filters
    );

    res.json({
      success: true,
      data: recommendations,
      message: 'Hybrid recommendations generated successfully'
    });
  } catch (error) {
    console.error('Get hybrid recommendations error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get trending recommendations
router.get('/trending', authenticate, async (req, res) => {
  try {
    const {
      limit = 10,
      categories,
      timeRange = '30d'
    } = req.query;

    const filters = {
      categories: categories ? categories.split(',') : undefined,
      timeRange
    };

    const recommendations = await recommendationService.generateRecommendations(
      req.user.id,
      'TRENDING',
      Math.min(parseInt(limit), 50),
      filters
    );

    res.json({
      success: true,
      data: recommendations,
      message: 'Trending recommendations generated successfully'
    });
  } catch (error) {
    console.error('Get trending recommendations error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get personalized recommendations
router.get('/personalized', authenticate, async (req, res) => {
  try {
    const {
      limit = 10,
      type,
      skills,
      categories,
      timeRange,
      minQuality,
      minEngagement
    } = req.query;

    const filters = {
      skills: skills ? skills.split(',') : undefined,
      categories: categories ? categories.split(',') : undefined,
      timeRange: timeRange || '30d',
      minQuality: minQuality ? parseFloat(minQuality) : undefined,
      minEngagement: minEngagement ? parseInt(minEngagement) : undefined
    };

    // Get user preferences first
    const preferences = await recommendationService.getUserPreferences(req.user.id);
    
    // Generate personalized recommendations
    const recommendations = await recommendationService.generateRecommendations(
      req.user.id,
      type || 'PERSONALIZED',
      Math.min(parseInt(limit), 50),
      filters
    );

    res.json({
      success: true,
      data: recommendations,
      message: 'Personalized recommendations generated successfully'
    });
  } catch (error) {
    console.error('Get personalized recommendations error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mark recommendation as clicked
router.post('/:id/click', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const recommendationId = parseInt(id);

    if (isNaN(recommendationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recommendation ID'
      });
    }

    const result = await recommendationService.markRecommendationClicked(
      recommendationId,
      req.user.id
    );

    res.json({
      success: true,
      data: result,
      message: 'Recommendation marked as clicked'
    });
  } catch (error) {
    console.error('Mark recommendation clicked error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Dismiss recommendation
router.post('/:id/dismiss', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const recommendationId = parseInt(id);

    if (isNaN(recommendationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recommendation ID'
      });
    }

    const result = await recommendationService.dismissRecommendation(
      recommendationId,
      req.user.id
    );

    res.json({
      success: true,
      data: result,
      message: 'Recommendation dismissed'
    });
  } catch (error) {
    console.error('Dismiss recommendation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get recommendation feedback
router.get('/:id/feedback', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const recommendationId = parseInt(id);

    if (isNaN(recommendationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recommendation ID'
      });
    }

    const feedback = await recommendationService.getRecommendationFeedback(
      recommendationId,
      req.user.id
    );

    res.json({
      success: true,
      data: feedback,
      message: 'Recommendation feedback retrieved successfully'
    });
  } catch (error) {
    console.error('Get recommendation feedback error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add recommendation feedback
router.post('/:id/feedback', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { feedbackType, rating, comment } = req.body;
    const recommendationId = parseInt(id);

    if (isNaN(recommendationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recommendation ID'
      });
    }

    if (!feedbackType) {
      return res.status(400).json({
        success: false,
        error: 'feedbackType is required'
      });
    }

    const validTypes = ['CLICK', 'DISMISS', 'LIKE', 'DISLIKE', 'VIEW', 'SHARE', 'BOOKMARK'];
    if (!validTypes.includes(feedbackType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid feedbackType'
      });
    }

    // Save feedback
    const feedback = await prisma.recommendationFeedback.create({
      data: {
        userId: req.user.id,
        recommendationId,
        feedbackType,
        rating: rating ? parseInt(rating) : null,
        comment
      }
    });

    // Update recommendation score based on feedback
    await recommendationService.updateRecommendationScore(
      recommendationId,
      rating || 0,
      feedbackType
    );

    res.status(201).json({
      success: true,
      data: feedback,
      message: 'Feedback saved successfully'
    });
  } catch (error) {
    console.error('Add recommendation feedback error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user recommendation preferences
router.get('/preferences', authenticate, async (req, res) => {
  try {
    const preferences = await recommendationService.getUserPreferences(req.user.id);

    res.json({
      success: true,
      data: preferences,
      message: 'User preferences retrieved successfully'
    });
  } catch (error) {
    console.error('Get user preferences error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update user recommendation preferences
router.put('/preferences', authenticate, async (req, res) => {
  try {
    const preferences = req.body;

    // Validate preferences
    const validFields = ['skillWeights', 'categoryPreferences', 'autoRefresh', 'refreshFrequency'];
    const updateData = {};
    
    validFields.forEach(field => {
      if (preferences[field] !== undefined) {
        updateData[field] = preferences[field];
      }
    });

    const updated = await recommendationService.updateUserPreferences(
      req.user.id,
      updateData
    );

    res.json({
      success: true,
      data: updated,
      message: 'User preferences updated successfully'
    });
  } catch (error) {
    console.error('Update user preferences error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get recommendation history
router.get('/history', authenticate, async (req, res) => {
  try {
    const {
      type,
      startDate,
      endDate,
      limit = 50,
      status
    } = req.query;

    const filters = {
      type,
      startDate,
      endDate,
      limit: Math.min(parseInt(limit), 100),
      status: status === 'true' ? true : status === 'false' ? false : undefined
    };

    const history = await recommendationService.getRecommendationHistory(
      req.user.id,
      filters
    );

    res.json({
      success: true,
      data: history,
      message: 'Recommendation history retrieved successfully'
    });
  } catch (error) {
    console.error('Get recommendation history error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get recommendation statistics (admin only)
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const stats = await recommendationService.getRecommendationStats();

    res.json({
      success: true,
      data: stats,
      message: 'Recommendation statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Get recommendation stats error:', error);
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

    const stats = recommendationService.getCacheStats();

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

    recommendationService.clearAllCache();

    res.json({
      success: true,
      message: 'Recommendation cache cleared successfully'
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Refresh recommendation cache (admin only)
router.post('/cache/refresh', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const refreshed = await recommendationService.refreshRecommendationCache();

    res.json({
      success: true,
      data: { refreshed },
      message: 'Recommendation cache refreshed successfully'
    });
  } catch (error) {
    console.error('Refresh cache error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get recommendation algorithms (admin only)
router.get('/algorithms', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const algorithms = await prisma.recommendationAlgorithms.findMany({
      where: { isActive: true },
      orderBy: { weight: 'desc' }
    });

    res.json({
      success: true,
      data: algorithms,
      message: 'Recommendation algorithms retrieved successfully'
    });
  } catch (error) {
    console.error('Get algorithms error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get recommendation analytics (admin only)
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

    // Get analytics from the view
    const analytics = await prisma.$queryRaw`
      SELECT * FROM recommendation_analytics
      WHERE date >= NOW() - INTERVAL '${timeRange}'
      ORDER BY date DESC
    `;

    res.json({
      success: true,
      data: analytics,
      message: 'Recommendation analytics retrieved successfully'
    });
  } catch (error) {
    console.error('Get recommendation analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get recommendation performance metrics (admin only)
router.get('/performance', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { timeRange = '30d' } = req.query;

    // Get performance metrics from the view
    const performance = await prisma.$queryRaw`
      SELECT * FROM recommendation_performance
      WHERE date >= NOW() - INTERVAL '${timeRange}'
      ORDER BY date DESC
    `;

    res.json({
      success: true,
      data: performance,
      message: 'Recommendation performance metrics retrieved successfully'
    });
  } catch (error) {
    console.error('Get recommendation performance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user similarity scores (admin only)
router.get('/similarity/:userId1/:userId2', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { userId1, userId2 } = req.params;
    const similarity = await recommendationService.calculateUserSimilarity(
      parseInt(userId1),
      parseInt(userId2)
    );

    res.json({
      success: true,
      data: { similarity },
      message: 'User similarity calculated successfully'
    });
  } catch (error) {
    console.error('Get user similarity error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get content similarity scores (admin only)
router.get('/similarity/:type1/:id1/:type2/:id2', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { type1, id1, type2, id2 } = req.params;
    const similarity = await recommendationService.calculateContentSimilarity(
      type1,
      parseInt(id1),
      type2,
      parseInt(id2)
    );

    res.json({
      success: true,
      data: { similarity },
      message: 'Content similarity calculated successfully'
    });
  } catch (error) {
    console.error('Get content similarity error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get top mentors (admin only)
router.get('/top-mentors', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { timeRange = '30d', limit = 50 } = req.query;

    const mentors = await recommendationService.getTopMentors(
      timeRange,
      Math.min(parseInt(limit), 100)
    );

    res.json({
      success: true,
      data: mentors,
      message: 'Top mentors retrieved successfully'
    });
  } catch (error) {
    console.error('Get top mentors error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get top posts (admin only)
router.get('/top-posts', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { timeRange = '30d', limit = 50 } = req.query;

    const posts = await recommendationService.getTopPosts(
      timeRange,
      Math.min(parseInt(limit), 100)
    );

    res.json({
      success: true,
      data: posts,
      message: 'Top posts retrieved successfully'
    });
  } catch (error) {
    console.error('Get top posts error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get trending content (admin only)
router.get('/trending-content', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { timeRange = '30d', limit = 50 } = req.query;

    const content = await recommendationService.getTrendingContent(
      timeRange,
      Math.min(parseInt(limit), 100)
    );

    res.json({
      success: true,
      data: content,
      message: 'Trending content retrieved successfully'
    });
  } catch (error) {
    console.error('Get trending content error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
