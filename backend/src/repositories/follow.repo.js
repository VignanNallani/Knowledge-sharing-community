import BaseRepository from '../base/BaseRepository.js';
import getPrisma from '../config/prisma.js';

const prisma = getPrisma();

class FollowRepository extends BaseRepository {
  constructor() {
    super(prisma.follower, 'Follower');
  }

  // Check if following exists
  async isFollowing(followerId, followingId) {
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
      throw error;
    }
  }

  // Create follow relationship
  async follow(followerId, followingId) {
    try {
      return await prisma.follower.create({
        data: {
          followerId,
          followingId,
          createdAt: new Date()
        },
        include: {
          follower: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              profileImage: true
            }
          },
          following: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              profileImage: true
            }
          }
        }
      });
    } catch (error) {
      // Handle unique constraint violation
      if (error.code === 'P2002') {
        throw new Error('Already following this user');
      }
      throw error;
    }
  }

  // Remove follow relationship
  async unfollow(followerId, followingId) {
    try {
      const result = await prisma.follower.deleteMany({
        where: {
          followerId,
          followingId
        }
      });
      return result.count > 0;
    } catch (error) {
      throw error;
    }
  }

  // Get followers of user (people who follow this user)
  async getFollowers(userId, options = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      const skip = (page - 1) * limit;
      const orderBy = { [sortBy]: sortOrder };

      const followers = await prisma.follower.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              profileImage: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      });

      // Get total count
      const total = await prisma.follower.count({
        where: { followingId: userId }
      });

      return {
        data: followers.map(f => ({
          ...f.follower,
          followedAt: f.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get following of user (people this user follows)
  async getFollowing(userId, options = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      const skip = (page - 1) * limit;
      const orderBy = { [sortBy]: sortOrder };

      const following = await prisma.follower.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              profileImage: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      });

      // Get total count
      const total = await prisma.follower.count({
        where: { followerId: userId }
      });

      return {
        data: following.map(f => ({
          ...f.following,
          followedAt: f.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get follower count
  async getFollowersCount(userId) {
    try {
      return await prisma.follower.count({
        where: { followingId: userId }
      });
    } catch (error) {
      throw error;
    }
  }

  // Get following count
  async getFollowingCount(userId) {
    try {
      return await prisma.follower.count({
        where: { followerId: userId }
      });
    } catch (error) {
      throw error;
    }
  }

  // Get follow relationship between two users
  async getFollowRelationship(userId1, userId2) {
    try {
      const [user1FollowsUser2, user2FollowsUser1] = await Promise.all([
        this.isFollowing(userId1, userId2),
        this.isFollowing(userId2, userId1)
      ]);

      return {
        user1FollowsUser2,
        user2FollowsUser1
      };
    } catch (error) {
      throw error;
    }
  }

  // Batch follow status check
  async getFollowStatus(userId, targetUserIds) {
    try {
      const followStatuses = await prisma.follower.findMany({
        where: {
          followerId: userId,
          followingId: { in: targetUserIds }
        },
        select: {
          followingId: true
        }
      });

      const statusMap = {};
      targetUserIds.forEach(id => {
        statusMap[id] = followStatuses.some(status => status.followingId === id);
      });

      return statusMap;
    } catch (error) {
      throw error;
    }
  }

  // Legacy methods for backward compatibility
  async findFollow({ followerId, followingId }) {
    try {
      return await prisma.follower.findUnique({
        where: { followerId_followingId: { followerId, followingId } },
      });
    } catch (error) {
      throw error;
    }
  }

  async findFollowWithDetails({ followerId, followingId }) {
    try {
      return await prisma.follower.findUnique({
        where: { followerId_followingId: { followerId, followingId } },
        include: { following: { select: { name: true } } },
      });
    } catch (error) {
      throw error;
    }
  }

  async createFollow({ followerId, followingId }) {
    try {
      return await prisma.follower.create({
        data: { followerId, followingId },
      });
    } catch (error) {
      throw error;
    }
  }

  async deleteFollow({ followerId, followingId }) {
    try {
      return await prisma.follower.delete({
        where: { followerId_followingId: { followerId, followingId } },
      });
    } catch (error) {
      throw error;
    }
  }

  async findFollowers(options = {}) {
    try {
      return await prisma.follower.findMany({
        ...options,
      });
    } catch (error) {
      throw error;
    }
  }

  async findFollowing(options = {}) {
    try {
      return await prisma.follower.findMany({
        ...options,
      });
    } catch (error) {
      throw error;
    }
  }

  async findUserFollowers(userId, options = {}) {
    try {
      return await prisma.follower.findMany({
        where: { followingId: userId },
        ...options,
      });
    } catch (error) {
      throw error;
    }
  }

  async findUserFollowing(userId, options = {}) {
    try {
      return await prisma.follower.findMany({
        where: { followerId: userId },
        ...options,
      });
    } catch (error) {
      throw error;
    }
  }

  async countFollowers(where = {}) {
    try {
      return await prisma.follower.count({ where });
    } catch (error) {
      throw error;
    }
  }
}

const followRepository = new FollowRepository();
export default followRepository;
