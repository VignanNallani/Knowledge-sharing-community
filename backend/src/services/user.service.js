import bcrypt from 'bcryptjs';
import { ApiError } from '../utils/ApiError.js';
import { paginate } from '../utils/pagination.js';
import userRepository from '../repositories/user.repo.js';
import followRepository from '../repositories/follow.repo.js';
import userDto from '../dto/user.dto.js';
import { cacheService } from '../cache/cache.service.js';
import { CACHE_KEYS, CACHE_TTL } from '../cache/cache.keys.js';
import { logger } from '../config/index.js';

class UserService {
  async getMyProfile(userId) {
    const cacheKey = CACHE_KEYS.USER_PROFILE(userId);
    
    // Try cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      logger.debug(`[CACHE HIT] ${cacheKey}`);
      return cached;
    }
    logger.debug(`[CACHE MISS] ${cacheKey}`);
    
    const user = await userRepository.findUserById(userId, {
      id: true,
      name: true,
      email: true,
      bio: true,
      skills: true,
      profileImageUrl: true,
      role: true,
      createdAt: true,
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const result = userDto.profile(user);
    
    // Cache for 30 minutes
    await cacheService.set(cacheKey, result, CACHE_TTL.DEFAULT);
    logger.debug(`[CACHE SET] ${cacheKey}`);
    
    return result;
  }

  async updateMyProfile(userId, updateData) {
    const { name, bio, skills, profileImageUrl } = updateData;

    // Convert skills array to comma-separated string for database storage
    const processedData = {
      name,
      bio,
      skills: Array.isArray(skills) ? skills.join(', ') : skills,
      profileImageUrl
    };

    const updatedUser = await userRepository.updateUserById(userId, processedData, {
      id: true,
      name: true,
      bio: true,
      skills: true,
      profileImageUrl: true,
    });

    const result = userDto.profile(updatedUser);
    
    // Invalidate user-related caches
    await cacheService.delete(CACHE_KEYS.USER_PROFILE(userId));
    await cacheService.invalidatePattern(`user.*:${userId}`);
    await cacheService.invalidatePattern(`.*user:${userId}.*`);
    logger.debug(`[CACHE INVALIDATE] user profile for ${userId}`);
    
    return result;
  }

  async getAllUsers(query) {
    const { skip, limit, page } = paginate(query);
    const search = query.search || "";
    const role = query.role;

    const where = {
      isActive: true,
      ...(role && { role }),
      name: { contains: search, mode: "insensitive" },
    };

    const [users, total] = await Promise.all([
      userRepository.searchUsers({
        where,
        skip,
        take: limit,
        select: { 
          id: true, 
          name: true, 
          email: true,
          bio: true, 
          skills: true, 
          profileImageUrl: true, 
          role: true,
          createdAt: true,
          _count: {
            select: { posts: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      userRepository.countUsers(where),
    ]);

    return {
      users: users.map(user => userDto.public(user)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserProfile(userId) {
    const cacheKey = `user:public:profile:${userId}`;
    
    // Try cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      logger.debug(`[CACHE HIT] ${cacheKey}`);
      return cached;
    }
    logger.debug(`[CACHE MISS] ${cacheKey}`);
    
    const user = await userRepository.findUserById(userId, {
      id: true,
      name: true,
      bio: true,
      skills: true,
      profileImageUrl: true,
      role: true,
      createdAt: true,
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const result = userDto.public(user);
    
    // Cache for 30 minutes
    await cacheService.set(cacheKey, result, CACHE_TTL.DEFAULT);
    logger.debug(`[CACHE SET] ${cacheKey}`);
    
    return result;
  }

  async isFollowingUser(followerId, followingId) {
    try {
      return await followRepository.isFollowing(followerId, followingId);
    } catch (error) {
      logger.error('Error checking follow status:', error);
      return false;
    }
  }

  async followUser(followerId, followingId) {
    if (followerId === followingId) {
      throw new ApiError(400, 'You cannot follow yourself');
    }

    try {
      // Rely on database unique constraint - no pre-check
      await followRepository.createFollow({ followerId, followingId });
      
      // Invalidate follow-related caches for both users
      await cacheService.delete(CACHE_KEYS.USER_FOLLOWERS(followingId));
      await cacheService.delete(CACHE_KEYS.USER_FOLLOWING(followerId));
      await cacheService.invalidatePattern(`user:*:${followerId}`);
      await cacheService.invalidatePattern(`user:*:${followingId}`);
      logger.debug(`[CACHE INVALIDATE] follow data for ${followerId} -> ${followingId}`);
      
      return { message: 'User followed successfully' };
    } catch (error) {
      // Handle unique constraint violation
      if (error.code === 'P2002') {
        throw new ApiError(400, 'Already following');
      }
      throw error;
    }
  }

  async unfollowUser(followerId, followingId) {
    await followRepository.deleteFollow({ followerId, followingId });
    
    // Invalidate follow-related caches for both users
    await cacheService.delete(CACHE_KEYS.USER_FOLLOWERS(followingId));
    await cacheService.delete(CACHE_KEYS.USER_FOLLOWING(followerId));
    await cacheService.invalidatePattern(`user:*:${followerId}`);
    await cacheService.invalidatePattern(`user:*:${followingId}`);
    logger.debug(`[CACHE INVALIDATE] unfollow data for ${followerId} -> ${followingId}`);
    
    return { message: 'User unfollowed successfully' };
  }

  async getUserFollowers(userId, query) {
    const { skip, limit, page } = paginate(query);
    
    const [followers, total] = await Promise.all([
      userRepository.listFollowers({
        userId,
        skip,
        take: limit,
        select: { follower: { select: { id: true, name: true, profileImageUrl: true } } },
      }),
      userRepository.countFollowers(userId),
    ]);
    
    return {
      followers: followers.map(f => userDto.minimal(f.follower)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUserFollowing(userId, query) {
    const { skip, limit, page } = paginate(query);
    
    const [following, total] = await Promise.all([
      userRepository.listFollowing({
        userId,
        skip,
        take: limit,
        select: { following: { select: { id: true, name: true, profileImageUrl: true } } },
      }),
      userRepository.countFollowing(userId),
    ]);
    
    return {
      following: following.map(f => userDto.minimal(f.following)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

export default new UserService();
