import BaseService from '../base/BaseService.js';
import followRepository from '../repositories/follow.repo.js';
import { ErrorFactory, ApiError } from '../errors/index.js';
import eventBus from '../core/events/eventBus.js';
import EVENT_TYPES from '../core/events/eventTypes.js';
import databaseService from '../config/database.js';

class FollowService extends BaseService {
  constructor() {
    super(followRepository);
  }

  // Follow user with validation - Transaction safe
  async followUser(followerId, followingId) {
    try {
      // Validate input
      if (!followerId || !followingId) {
        throw new Error('Follower ID and following ID are required');
      }

      if (followerId === followingId) {
        throw new Error('Cannot follow yourself');
      }

      // Use transaction to prevent race conditions
      const follow = await databaseService.transaction(async (tx) => {
        // Check if both users exist
        const [follower, following] = await Promise.all([
          tx.user.findUnique({
            where: { id: followerId },
            select: { id: true, isActive: true }
          }),
          tx.user.findUnique({
            where: { id: followingId },
            select: { id: true, isActive: true }
          })
        ]);

        if (!follower || !follower.isActive) {
          throw ErrorFactory.notFound('Follower user not found or inactive');
        }

        if (!following || !following.isActive) {
          throw ErrorFactory.notFound('Following user not found or inactive');
        }

        // Check if already following within transaction
        const existingFollow = await tx.follower.findUnique({
          where: {
            followerId_followingId: { followerId, followingId }
          }
        });

        if (existingFollow) {
          throw ApiError.conflict('Already following this user');
        }

        // Create follow relationship atomically
        return await tx.follower.create({
          data: { followerId, followingId },
          include: {
            follower: {
              select: {
                id: true,
                name: true,
                email: true,
                profileImage: true
              }
            },
            following: {
              select: {
                id: true,
                name: true,
                email: true,
                profileImage: true
              }
            }
          }
        });
      }, {
        timeout: 3000,
        isolationLevel: 'ReadCommitted'
      });
      
      // Emit event outside transaction
      eventBus.emit(EVENT_TYPES.USER_FOLLOWED, {
        followerId,
        followingId
      });

      return follow;
    } catch (error) {
      if (error.message.includes('Already following')) {
        throw error;
      }
      throw ErrorFactory.databaseOperationFailed('followUser', error);
    }
  }

  // Unfollow user with idempotent handling - Transaction safe
  async unfollowUser(followerId, followingId) {
    try {
      // Validate input
      if (!followerId || !followingId) {
        throw new Error('Follower ID and following ID are required');
      }

      if (followerId === followingId) {
        throw new Error('Cannot unfollow yourself');
      }

      // Use transaction to prevent race conditions
      const result = await databaseService.transaction(async (tx) => {
        // Check if follow relationship exists
        const existingFollow = await tx.follower.findUnique({
          where: {
            followerId_followingId: { followerId, followingId }
          }
        });

        if (!existingFollow) {
          return { unfollowed: false, action: 'was_not_following' };
        }

        // Remove follow relationship atomically
        await tx.follower.delete({
          where: {
            followerId_followingId: { followerId, followingId }
          }
        });

        return { unfollowed: true, action: 'unfollowed' };
      }, {
        timeout: 3000,
        isolationLevel: 'ReadCommitted'
      });
      
      // Emit event only if was actually following (outside transaction)
      if (result.unfollowed) {
        eventBus.emit(EVENT_TYPES.USER_UNFOLLOWED, {
          followerId,
          followingId
        });
      }

      return result;
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('unfollowUser', error);
    }
  }

  // Get followers of user with pagination
  async getFollowers(userId, options = {}) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const { page = 1, limit = 20 } = options;
      
      // Validate pagination parameters
      if (page < 1) throw new Error('Page must be greater than 0');
      if (limit < 1 || limit > 100) throw new Error('Limit must be between 1 and 100');

      return await followRepository.getFollowers(userId, { page, limit });
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getFollowers', error);
    }
  }

  // Get following of user with pagination
  async getFollowing(userId, options = {}) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const { page = 1, limit = 20 } = options;
      
      // Validate pagination parameters
      if (page < 1) throw new Error('Page must be greater than 0');
      if (limit < 1 || limit > 100) throw new Error('Limit must be between 1 and 100');

      return await followRepository.getFollowing(userId, { page, limit });
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getFollowing', error);
    }
  }

  // Get follower count
  async getFollowersCount(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      return await followRepository.getFollowersCount(userId);
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getFollowersCount', error);
    }
  }

  // Get following count
  async getFollowingCount(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      return await followRepository.getFollowingCount(userId);
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getFollowingCount', error);
    }
  }

  // Get follow relationship between two users
  async getFollowRelationship(userId1, userId2) {
    try {
      if (!userId1 || !userId2) {
        throw new Error('Both user IDs are required');
      }

      return await followRepository.getFollowRelationship(userId1, userId2);
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getFollowRelationship', error);
    }
  }

  // Batch follow status check
  async getFollowStatus(userId, targetUserIds) {
    try {
      if (!userId || !targetUserIds || !Array.isArray(targetUserIds)) {
        throw new Error('User ID and target user IDs array are required');
      }

      if (targetUserIds.length === 0) {
        return {};
      }

      if (targetUserIds.length > 50) {
        throw new Error('Cannot check more than 50 users at once');
      }

      return await followRepository.getFollowStatus(userId, targetUserIds);
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getFollowStatus', error);
    }
  }

  // Check if user follows another user
  async isFollowing(followerId, followingId) {
    try {
      return await followRepository.isFollowing(followerId, followingId);
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('isFollowing', error);
    }
  }

  // Get user's social stats
  async getUserSocialStats(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      return await followRepository.getUserSocialStats(userId);
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getUserSocialStats', error);
    }
  }

  // Get mutual followers between two users
  async getMutualFollowers(userId1, userId2, options = {}) {
    try {
      if (!userId1 || !userId2) {
        throw new Error('Both user IDs are required');
      }

      if (userId1 === userId2) {
        throw new Error('Cannot compare user with themselves');
      }

      return await followRepository.getMutualFollowers(userId1, userId2, options);
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getMutualFollowers', error);
    }
  }
}

export default new FollowService();
