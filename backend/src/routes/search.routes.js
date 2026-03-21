const express = require('express');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const searchService = require('../services/search.service');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for search endpoints
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many search requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all search routes
router.use(searchLimiter);

// Search posts
router.get('/posts', optionalAuth, async (req, res) => {
  try {
    const {
      q: query,
      skills,
      authorId,
      dateStart,
      dateEnd,
      sortBy = 'relevance',
      page = 1,
      limit = 20
    } = req.query;

    // Validate and parse parameters
    const filters = {};
    
    if (skills) {
      filters.skills = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim());
    }
    
    if (authorId) {
      filters.authorId = authorId;
    }
    
    if (dateStart || dateEnd) {
      filters.dateRange = {};
      if (dateStart) filters.dateRange.start = dateStart;
      if (dateEnd) filters.dateRange.end = dateEnd;
    }
    
    if (sortBy) {
      filters.sortBy = sortBy;
    }

    const pagination = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50) // Max 50 results per page
    };

    const result = await searchService.searchPosts(query, filters, pagination);
    
    res.json({
      success: true,
      data: result,
      meta: {
        query: query || '',
        totalResults: result.pagination.total,
        currentPage: result.pagination.page,
        totalPages: result.pagination.pages,
        hasNextPage: result.pagination.hasNext,
        hasPrevPage: result.pagination.hasPrev
      }
    });
  } catch (error) {
    console.error('Search posts error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search users
router.get('/users', optionalAuth, async (req, res) => {
  try {
    const {
      q: query,
      skills,
      role,
      availability,
      sortBy = 'relevance',
      page = 1,
      limit = 20
    } = req.query;

    // Validate and parse parameters
    const filters = {};
    
    if (skills) {
      filters.skills = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim());
    }
    
    if (role) {
      const validRoles = ['USER', 'MENTOR', 'ADMIN'];
      if (validRoles.includes(role.toUpperCase())) {
        filters.role = role.toUpperCase();
      }
    }
    
    if (availability) {
      filters.availability = availability;
    }

    const pagination = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50)
    };

    const result = await searchService.searchUsers(query, filters, pagination);
    
    res.json({
      success: true,
      data: result,
      meta: {
        query: query || '',
        totalResults: result.pagination.total,
        currentPage: result.pagination.page,
        totalPages: result.pagination.pages,
        hasNextPage: result.pagination.hasNext,
        hasPrevPage: result.pagination.hasPrev
      }
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search mentors
router.get('/mentors', optionalAuth, async (req, res) => {
  try {
    const {
      q: query,
      skills,
      availability,
      minRating,
      maxRating,
      sortBy = 'relevance',
      page = 1,
      limit = 20
    } = req.query;

    // Validate and parse parameters
    const filters = {};
    
    if (skills) {
      filters.skills = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim());
    }
    
    if (availability) {
      filters.availability = availability;
    }
    
    if (minRating || maxRating) {
      if (minRating) filters.minRating = Math.max(1, Math.min(5, parseInt(minRating)));
      if (maxRating) filters.maxRating = Math.max(1, Math.min(5, parseInt(maxRating)));
    }

    const pagination = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50)
    };

    const result = await searchService.searchMentors(query, filters, pagination);
    
    res.json({
      success: true,
      data: result,
      meta: {
        query: query || '',
        totalResults: result.pagination.total,
        currentPage: result.pagination.page,
        totalPages: result.pagination.pages,
        hasNextPage: result.pagination.hasNext,
        hasPrevPage: result.pagination.hasPrev
      }
    });
  } catch (error) {
    console.error('Search mentors error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Autocomplete suggestions
router.get('/autocomplete', optionalAuth, async (req, res) => {
  try {
    const {
      q: query,
      type = 'general',
      limit = 5
    } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({
        success: true,
        data: {
          suggestions: []
        }
      });
    }

    const validTypes = ['posts', 'users', 'mentors', 'general'];
    const searchType = validTypes.includes(type) ? type : 'general';

    const suggestions = await searchService.getAutocompleteSuggestions(
      query.trim(),
      searchType,
      Math.min(parseInt(limit), 10)
    );
    
    res.json({
      success: true,
      data: {
        suggestions,
        query: query.trim(),
        type: searchType
      }
    });
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get trending posts
router.get('/trending/posts', optionalAuth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const trendingPosts = await searchService.getTrendingPosts(
      Math.min(parseInt(limit), 20)
    );
    
    res.json({
      success: true,
      data: {
        posts: trendingPosts,
        count: trendingPosts.length
      }
    });
  } catch (error) {
    console.error('Trending posts error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get recommended mentors (requires authentication)
router.get('/recommended/mentors', authenticate, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const recommendedMentors = await searchService.getRecommendedMentors(
      req.user.id,
      Math.min(parseInt(limit), 20)
    );
    
    res.json({
      success: true,
      data: {
        mentors: recommendedMentors,
        count: recommendedMentors.length
      }
    });
  } catch (error) {
    console.error('Recommended mentors error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search analytics (admin only)
router.get('/analytics', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const {
      startDate,
      endDate,
      searchType,
      limit = 100
    } = req.query;

    // Build analytics query
    let whereClause = {};
    
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) whereClause.createdAt.lte = new Date(endDate);
    }
    
    if (searchType) {
      whereClause.searchType = searchType;
    }

    const analytics = await prisma.searchAnalytics.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      take: Math.min(parseInt(limit), 1000)
    });

    // Calculate statistics
    const stats = {
      totalSearches: analytics.length,
      averageResults: analytics.reduce((sum, a) => sum + a.resultsCount, 0) / analytics.length,
      topQueries: this.getTopQueries(analytics),
      searchTypes: this.getSearchTypeDistribution(analytics)
    };

    res.json({
      success: true,
      data: {
        analytics,
        stats
      }
    });
  } catch (error) {
    console.error('Search analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear search cache (admin only)
router.post('/cache/clear', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { pattern } = req.body;
    
    searchService.clearCache(pattern);
    
    res.json({
      success: true,
      message: pattern ? `Cache cleared for pattern: ${pattern}` : 'All search cache cleared'
    });
  } catch (error) {
    console.error('Cache clear error:', error);
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

    const stats = searchService.getCacheStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Cache stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper functions for analytics
function getTopQueries(analytics) {
  const queryCounts = {};
  
  analytics.forEach(record => {
    const query = record.query.toLowerCase();
    queryCounts[query] = (queryCounts[query] || 0) + 1;
  });

  return Object.entries(queryCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }));
}

function getSearchTypeDistribution(analytics) {
  const typeCounts = {};
  
  analytics.forEach(record => {
    typeCounts[record.searchType] = (typeCounts[record.searchType] || 0) + 1;
  });

  return Object.entries(typeCounts).map(([type, count]) => ({
    type,
    count,
    percentage: ((count / analytics.length) * 100).toFixed(2)
  }));
}

module.exports = router;
