import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import userService from '../services/userService.js';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { upload, handleUploadError } from '../middleware/upload.js';
const prisma = new PrismaClient();

const router = express.Router();

// Rate limiting for user actions
const userActionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
  message: {
    error: 'Too many user actions, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Follow/unfollow rate limiting
const followLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 follow/unfollow requests per minute
  message: {
    error: 'Too many follow/unfollow requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all user routes
router.use(userActionLimiter);

// Get user profile
router.get('/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const viewerId = req.user ? req.user.id : null;

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    const profile = await userService.getUserProfile(userId, viewerId);

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Upload profile image
router.post('/profile-image', authenticate, upload.single('image'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    const imageUrl = req.file.path; // Cloudinary URL from multer-storage-cloudinary
    
    // Update user profile with new image URL
    const updatedProfile = await userService.updateUserProfile(req.user.id, {
      profileImageUrl: imageUrl
    });

    res.json({
      success: true,
      data: {
        imageUrl: imageUrl,
        profile: updatedProfile
      },
      message: 'Profile image uploaded successfully'
    });
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const profileData = req.body;
    
    // Validate profile data
    const allowedFields = ['name', 'bio', 'profileImageUrl', 'skills', 'socialLinks'];
    const updateData = {};
    
    allowedFields.forEach(field => {
      if (profileData[field] !== undefined) {
        updateData[field] = profileData[field];
      }
    });

    const updatedProfile = await userService.updateUserProfile(req.user.id, updateData);

    res.json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Follow/unfollow user (toggle)
router.post('/:id/follow', authenticate, followLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const followingId = parseInt(id);
    const followerId = req.user.id;

    if (isNaN(followingId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    if (followerId === followingId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot follow yourself'
      });
    }

    // Check if already following
    const isFollowing = await userService.isFollowingUser(followerId, followingId);
    
    if (isFollowing) {
      // Unfollow if already following
      await userService.unfollowUser(followerId, followingId);
      res.json({
        success: true,
        data: { following: false },
        message: 'User unfollowed successfully'
      });
    } else {
      // Follow if not already following
      const follow = await userService.followUser(followerId, followingId);
      res.json({
        success: true,
        data: { following: true, follow },
        message: 'User followed successfully'
      });
    }
  } catch (error) {
    console.error('Follow toggle error:', error);
    
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Unfollow user
router.delete('/:id/unfollow', authenticate, followLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const followingId = parseInt(id);
    const followerId = req.user.id;

    if (isNaN(followingId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    const result = await userService.unfollowUser(followerId, followingId);

    res.json({
      success: true,
      data: result,
      message: 'User unfollowed successfully'
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    
    if (error.message === 'Not following this user') {
      return res.status(409).json({
        success: false,
        error: 'Not following this user'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user followers
router.get('/:id/followers', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const { page = 1, limit = 20 } = req.query;

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    const followers = await userService.getUserFollowers(userId, {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50)
    });

    res.json({
      success: true,
      data: followers
    });
  } catch (error) {
    console.error('Get user followers error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user following
router.get('/:id/following', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const { page = 1, limit = 20 } = req.query;

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    const following = await userService.getUserFollowing(userId, {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50)
    });

    res.json({
      success: true,
      data: following
    });
  } catch (error) {
    console.error('Get user following error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check if following user
router.get('/:id/following/check', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const followingId = parseInt(id);
    const followerId = req.user.id;

    if (isNaN(followingId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    const isFollowing = await userService.isFollowingUser(followerId, followingId);

    res.json({
      success: true,
      data: { isFollowing }
    });
  } catch (error) {
    console.error('Check follow status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add bookmark
router.post('/bookmarks', authenticate, async (req, res) => {
  try {
    const { entityType, entityId, title, description } = req.body;

    if (!entityType || !entityId) {
      return res.status(400).json({
        success: false,
        error: 'entityType and entityId are required'
      });
    }

    const validTypes = ['post', 'mentor', 'session'];
    if (!validTypes.includes(entityType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid entity type'
      });
    }

    const bookmark = await userService.addBookmark(
      req.user.id,
      entityType,
      parseInt(entityId),
      title,
      description
    );

    res.status(201).json({
      success: true,
      data: bookmark,
      message: 'Bookmark added successfully'
    });
  } catch (error) {
    console.error('Add bookmark error:', error);
    
    if (error.message === 'Already bookmarked') {
      return res.status(409).json({
        success: false,
        error: 'Already bookmarked'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Remove bookmark
router.delete('/bookmarks/:type/:id', authenticate, async (req, res) => {
  try {
    const { type, id } = req.params;
    const entityType = type;
    const entityId = parseInt(id);

    if (!entityType || isNaN(entityId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bookmark parameters'
      });
    }

    const result = await userService.removeBookmark(req.user.id, entityType, entityId);

    res.json({
      success: true,
      data: result,
      message: 'Bookmark removed successfully'
    });
  } catch (error) {
    console.error('Remove bookmark error:', error);
    
    if (error.message === 'Bookmark not found') {
      return res.status(404).json({
        success: false,
        error: 'Bookmark not found'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user bookmarks
router.get('/bookmarks', authenticate, async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;

    const bookmarks = await userService.getUserBookmarks(req.user.id, {
      type,
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50)
    });

    res.json({
      success: true,
      data: bookmarks
    });
  } catch (error) {
    console.error('Get user bookmarks error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check if bookmarked
router.get('/bookmarks/:type/:id/check', authenticate, async (req, res) => {
  try {
    const { type, id } = req.params;
    const entityType = type;
    const entityId = parseInt(id);

    if (!entityType || isNaN(entityId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bookmark parameters'
      });
    }

    const isBookmarked = await userService.isBookmarked(req.user.id, entityType, entityId);

    res.json({
      success: true,
      data: { isBookmarked }
    });
  } catch (error) {
    console.error('Check bookmark status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await userService.getUserStats(req.user.id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search users
router.get('/search', async (req, res) => {
  try {
    const { q, skills, role, page = 1, limit = 20 } = req.query;

    const filters = {
      query: q,
      skills: skills ? skills.split(',') : undefined,
      role,
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50)
    };

    const result = await userService.searchUsers(filters);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update privacy settings
router.put('/privacy', authenticate, async (req, res) => {
  try {
    const { privacySettings } = req.body;

    if (!privacySettings || typeof privacySettings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'privacySettings object is required'
      });
    }

    const updated = await userService.updateUserPrivacySettings(req.user.id, privacySettings);

    res.json({
      success: true,
      data: updated,
      message: 'Privacy settings updated successfully'
    });
  } catch (error) {
    console.error('Update privacy settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get current user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const profile = await userService.getUserProfile(req.user.id);

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Get current user profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user achievements
router.get('/:id/achievements', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    const profile = await userService.getUserProfile(userId, req.user ? req.user.id : null);

    res.json({
      success: true,
      data: profile.achievements || []
    });
  } catch (error) {
    console.error('Get user achievements error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user activity
router.get('/:id/activity', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const { page = 1, limit = 20 } = req.query;

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    const { activityFeedService } = require('../services/activityFeed.service');
    const activities = await activityFeedService.getUserActivityFeed(userId, {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50)
    });

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get cache stats (admin only)
router.get('/cache/stats', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const stats = userService.getCacheStats();

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


export default router;
