const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger.util');
const NodeCache = require('node-cache');

const prisma = new PrismaClient();
const userCache = new NodeCache({ stdTTL: 600 }); // 10 minutes cache

class UserService {
  async getUserProfile(userId, viewerId = null) {
    try {
      // Check cache first
      const cacheKey = `user_profile_${userId}_${viewerId || 'public'}`;
      let profile = userCache.get(cacheKey);
      
      if (!profile) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            _count: {
              select: {
                followers: true,
                following: true,
                posts: true,
                mentorshipsAsMentor: true,
                mentorshipsAsMentee: true,
                bookmarks: true
              }
            },
            mentorshipsAsMentor: {
              where: {
                status: 'COMPLETED'
              },
              include: {
                mentee: {
                  select: { id: true, name: true, profileImageUrl: true }
                }
              },
              take: 5,
              orderBy: { completedAt: 'desc' }
            },
            posts: {
              where: {
                isPublished: true
              },
              include: {
                _count: {
                  select: {
                    likes: true,
                    comments: true,
                    bookmarks: true
                  }
                }
              },
              take: 6,
              orderBy: { createdAt: 'desc' }
            },
            achievements: {
              select: {
                achievementType: true,
                unlockedAt: true
              },
              orderBy: { unlockedAt: 'desc' },
              take: 10
            }
          }
        });

        if (!user) {
          throw new Error('User not found');
        }

        // Check if viewer is following this user
        let isFollowing = false;
        if (viewerId && viewerId !== userId) {
          const follow = await prisma.follower.findUnique({
            where: {
              followerId: viewerId,
              followingId: userId
            }
          });
          isFollowing = !!follow;
        }

        // Format profile data
        profile = {
          id: user.id,
          name: user.name,
          email: viewerId === userId ? user.email : null, // Only show email to owner
          bio: user.bio,
          profileImageUrl: user.profileImageUrl,
          skills: user.skills,
          socialLinks: user.socialLinks,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          stats: {
            followers: user._count.followers,
            following: user._count.following,
            posts: user._count.posts,
            mentorshipsAsMentor: user._count.mentorshipsAsMentor,
            mentorshipsAsMentee: user._count.mentorshipsAsMentee,
            bookmarks: user._count.bookmarks
          },
          recentSessions: user.mentorshipsAsMentor,
          recentPosts: user.posts,
          achievements: user.achievements,
          isFollowing: isFollowing,
          isOwnProfile: viewerId === userId
        };

        // Cache the profile
        userCache.set(cacheKey, profile);
      }

      return profile;
    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(userId, profileData) {
    try {
      const {
        name,
        bio,
        profileImageUrl,
        skills,
        socialLinks,
        privacySettings
      } = profileData;

      const updateData = {};
      
      if (name !== undefined) updateData.name = name;
      if (bio !== undefined) updateData.bio = bio;
      if (profileImageUrl !== undefined) updateData.profileImageUrl = profileImageUrl;
      if (skills !== undefined) updateData.skills = skills;
      if (socialLinks !== undefined) updateData.socialLinks = socialLinks;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          bio: true,
          profileImageUrl: true,
          skills: true,
          socialLinks: true,
          role: true,
          isActive: true,
          updatedAt: true
        }
      });

      // Clear cache for this user
      this.clearUserCache(userId);

      // Emit profile update event
      if (global.io) {
        global.io.emit('profile_updated', {
          userId,
          profile: updatedUser,
          timestamp: new Date()
        });
      }

      return updatedUser;
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }

  async followUser(followerId, followingId) {
    try {
      // Validate users
      const [follower, following] = await Promise.all([
        prisma.user.findUnique({ where: { id: followerId } }),
        prisma.user.findUnique({ where: { id: followingId } })
      ]);

      if (!follower || !following) {
        throw new Error('User not found');
      }

      if (followerId === followingId) {
        throw new Error('Cannot follow yourself');
      }

      // Check if already following
      const existingFollow = await prisma.follower.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId
          }
        }
      });

      if (existingFollow) {
        throw new Error('Already following this user');
      }

      // Create follow relationship
      const follow = await prisma.follower.create({
        data: {
          followerId,
          followingId
        },
        include: {
          follower: {
            select: {
              id: true,
              name: true,
              profileImageUrl: true
            }
          },
          following: {
            select: {
              id: true,
              name: true,
              profileImageUrl: true
            }
          }
        }
      });

      // Create activity
      await this.createActivity(followerId, {
        actorId: followerId,
        activityType: 'user_followed',
        entityType: 'user',
        entityId: followingId,
        title: `Started following ${following.name}`,
        description: `${follower.name} is now following ${following.name}`,
        data: {
          followerId,
          followingId,
          followerName: follower.name,
          followingName: following.name
        },
        isPublic: true
      });

      // Create notification
      const { notificationService } = require('./notification.service');
      await notificationService.notifyNewFollower(followingId, {
        id: followerId,
        name: follower.name,
        profileImageUrl: follower.profileImageUrl
      });

      // Emit real-time events
      if (global.io) {
        global.io.to(`user_${followingId}`).emit('new_follower', {
          follower: follow.follower,
          following: follow.following,
          timestamp: new Date()
        });

        global.io.emit('follow_update', {
          type: 'follow',
          data: follow,
          timestamp: new Date()
        });
      }

      // Clear cache
      this.clearUserCache(followingId);

      return follow;
    } catch (error) {
      logger.error('Error following user:', error);
      throw error;
    }
  }

  async unfollowUser(followerId, followingId) {
    try {
      // Check if following exists
      const existingFollow = await prisma.follower.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId
          }
        }
      });

      if (!existingFollow) {
        throw new Error('Not following this user');
      }

      // Delete follow relationship
      await prisma.follower.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId
          }
        }
      });

      // Emit real-time events
      if (global.io) {
        global.io.emit('follow_update', {
          type: 'unfollow',
          data: {
            followerId,
            followingId
          },
          timestamp: new Date()
        });
      }

      // Clear cache
      this.clearUserCache(followingId);

      return { message: 'Successfully unfollowed user' };
    } catch (error) {
      logger.error('Error unfollowing user:', error);
      throw error;
    }
  }

  async getUserFollowers(userId, filters = {}) {
    try {
      const {
        page = 1,
        limit = 20
      } = filters;

      const followers = await prisma.follower.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: {
              id: true,
              name: true,
              profileImageUrl: true,
              bio: true,
              skills: true,
              _count: {
                select: {
                  followers: true,
                  posts: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      const total = await prisma.follower.count({
        where: { followingId: userId }
      });

      return {
        followers: followers.map(f => f.follower),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting user followers:', error);
      throw error;
    }
  }

  async getUserFollowing(userId, filters = {}) {
    try {
      const {
        page = 1,
        limit = 20
      } = filters;

      const following = await prisma.follower.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: {
              id: true,
              name: true,
              profileImageUrl: true,
              bio: true,
              skills: true,
              _count: {
                select: {
                  followers: true,
                  posts: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      const total = await prisma.follower.count({
        where: { followerId: userId }
      });

      return {
        following: following.map(f => f.following),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting user following:', error);
      throw error;
    }
  }

  async isFollowingUser(followerId, followingId) {
    try {
      const follow = await prisma.follower.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId
          }
        }
      });

      return !!follow;
    } catch (error) {
      logger.error('Error checking follow status:', error);
      return false;
    }
  }

  async addBookmark(userId, entityType, entityId, title = '', description = '') {
    try {
      // Check if already bookmarked
      const existingBookmark = await prisma.bookmark.findUnique({
        where: {
          userId_entityType_entityId: {
            userId,
            entityType,
            entityId
          }
        }
      });

      if (existingBookmark) {
        throw new Error('Already bookmarked');
      }

      // Get entity details for title/description
      if (!title || !description) {
        const entityDetails = await this.getEntityDetails(entityType, entityId);
        title = title || entityDetails.title;
        description = description || entityDetails.description;
      }

      const bookmark = await prisma.bookmark.create({
        data: {
          userId,
          entityType,
          entityId,
          title,
          description
        },
        include: {
          entity: true
        }
      });

      // Create activity
      await this.createActivity(userId, {
        actorId: userId,
        activityType: 'bookmark_added',
        entityType,
        entityId,
        title: `Bookmarked ${entityType}`,
        description: `Bookmarked ${title}`,
        data: {
          bookmarkId: bookmark.id,
          entityType,
          entityId,
          title,
          description
        },
        isPublic: false // Bookmarks are private
      });

      // Emit real-time events
      if (global.io) {
        global.io.to(`user_${userId}`).emit('bookmark_added', {
          bookmark,
          timestamp: new Date()
        });
      }

      return bookmark;
    } catch (error) {
      logger.error('Error adding bookmark:', error);
      throw error;
    }
  }

  async removeBookmark(userId, entityType, entityId) {
    try {
      const bookmark = await prisma.bookmark.findUnique({
        where: {
          userId_entityType_entityId: {
            userId,
            entityType,
            entityId
          }
        }
      });

      if (!bookmark) {
        throw new Error('Bookmark not found');
      }

      await prisma.bookmark.delete({
        where: {
          userId_entityType_entityId: {
            userId,
            entityType,
            entityId
          }
        }
      });

      // Emit real-time events
      if (global.io) {
        global.io.to(`user_${userId}`).emit('bookmark_removed', {
          bookmarkId: bookmark.id,
          entityType,
          entityId,
          timestamp: new Date()
        });
      }

      return { message: 'Bookmark removed successfully' };
    } catch (error) {
      logger.error('Error removing bookmark:', error);
      throw error;
    }
  }

  async getUserBookmarks(userId, filters = {}) {
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
      logger.error('Error getting user bookmarks:', error);
      throw error;
    }
  }

  async isBookmarked(userId, entityType, entityId) {
    try {
      const bookmark = await prisma.bookmark.findUnique({
        where: {
          userId_entityType_entityId: {
            userId,
            entityType,
            entityId
          }
        }
      });

      return !!bookmark;
    } catch (error) {
      logger.error('Error checking bookmark status:', error);
      return false;
    }
  }

  async getEntityDetails(entityType, entityId) {
    try {
      let entity = null;

      switch (entityType) {
        case 'post':
          entity = await prisma.post.findUnique({
            where: { id: entityId },
            select: {
              id: true,
              title: true,
              content: true,
              image: true
            }
          });
          break;
        case 'mentor':
          entity = await prisma.user.findUnique({
            where: { id: entityId },
            select: {
              id: true,
              name: true,
              bio: true,
              profileImageUrl: true
            }
          });
          break;
        case 'session':
          entity = await prisma.mentorshipSession.findUnique({
            where: { id: entityId },
            select: {
              id: true,
              title: true,
              description: true,
              scheduledAt: true
            }
          });
          break;
        default:
          throw new Error('Invalid entity type');
      }

      if (!entity) {
        throw new Error('Entity not found');
      }

      return {
        title: entity.title || entity.name || 'Untitled',
        description: entity.description || entity.content || ''
      };
    } catch (error) {
      logger.error('Error getting entity details:', error);
      throw error;
    }
  }

  async createActivity(userId, activityData) {
    try {
      const activity = await prisma.userActivity.create({
        data: {
          userId,
          actorId: activityData.actorId || userId,
          activityType: activityData.activityType,
          entityType: activityData.entityType,
          entityId: activityData.entityId,
          title: activityData.title,
          description: activityData.description,
          data: activityData.data || {},
          isPublic: activityData.isPublic || false
        }
      });

      // Emit activity update
      if (global.io) {
        global.io.emit('activity_updated', {
          type: activity.activityType,
          data: activity,
          timestamp: new Date()
        });
      }

      return activity;
    } catch (error) {
      logger.error('Error creating activity:', error);
      throw error;
    }
  }

  async getUserStats(userId) {
    try {
      const [
        totalPosts,
        totalLikes,
        totalComments,
        totalSessions,
        totalFollowers,
        totalFollowing,
        totalBookmarks
      ] = await Promise.all([
        prisma.post.count({ where: { authorId: userId } }),
        prisma.like.count({ where: { userId } }),
        prisma.comment.count({ where: { authorId: userId } }),
        prisma.mentorshipSession.count({
          where: {
            OR: [{ mentorId: userId }, { menteeId: userId }]
          }
        }),
        prisma.follower.count({ where: { followingId: userId } }),
        prisma.follower.count({ where: { followerId: userId } }),
        prisma.bookmark.count({ where: { userId } })
      ]);

      return {
        posts: totalPosts,
        likes: totalLikes,
        comments: totalComments,
        sessions: totalSessions,
        followers: totalFollowers,
        following: totalFollowing,
        bookmarks: totalBookmarks
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  async searchUsers(query, filters = {}) {
    try {
      const {
        skills,
        role,
        page = 1,
        limit = 20
      } = filters;

      let whereClause = {
        isActive: true
      };

      if (query) {
        whereClause.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { bio: { contains: query, mode: 'insensitive' } }
        ];
      }

      if (skills && skills.length > 0) {
        whereClause.skills = {
          hasSome: skills
        };
      }

      if (role) {
        whereClause.role = role;
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          bio: true,
          profileImageUrl: true,
          skills: true,
          role: true,
          _count: {
            select: {
              followers: true,
              posts: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      const total = await prisma.user.count({ where: whereClause });

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }

  async updateUserPrivacySettings(userId, privacySettings) {
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          privacySettings: privacySettings || {}
        }
      });

      // Clear cache
      this.clearUserCache(userId);

      return updated;
    } catch (error) {
      logger.error('Error updating privacy settings:', error);
      throw error;
    }
  }

  clearUserCache(userId) {
    const keys = userCache.keys();
    keys.forEach(key => {
      if (key.includes(`user_profile_${userId}`)) {
        userCache.del(key);
      }
    });
  }

  getCacheStats() {
    return {
      keys: userCache.keys().length,
      stats: userCache.getStats()
    };
  }
}

module.exports = new UserService();
