import { ApiError } from '../utils/ApiError.js';
import { paginate } from '../utils/pagination.js';
import { logActivity } from './activityService.js';
import adminRepository from '../repositories/admin.repo.js';
import userRepository from '../repositories/user.repo.js';
import postRepository from '../repositories/post.repo.js';
import { ActivityType } from '@prisma/client';

class AdminService {
  async getPendingPosts(query) {
    const { skip, limit, page } = paginate(query);
    
    const [posts, total] = await Promise.all([
      adminRepository.findPendingPosts({
        skip,
        take: limit,
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      adminRepository.countPendingPosts(),
    ]);
    
    return {
      posts,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async approvePost(postId, adminId) {
    const post = await postRepository.findPostById(parseInt(postId));
    if (!post) {
      throw new ApiError(404, 'Post not found');
    }

    const updatedPost = await adminRepository.updatePostStatus(parseInt(postId), 'APPROVED');

    await logActivity({
      type: ActivityType.POST_APPROVED,
      message: `approved post "${post.title}"`,
      userId: adminId,
      entity: "POST",
      entityId: post.id,
    });

    return updatedPost;
  }

  async rejectPost(postId, adminId) {
    const post = await postRepository.findPostById(parseInt(postId));
    if (!post) {
      throw new ApiError(404, 'Post not found');
    }

    const updatedPost = await adminRepository.updatePostStatus(parseInt(postId), 'REJECTED');

    await logActivity({
      type: ActivityType.POST_REJECTED,
      message: `rejected a post`,
      userId: adminId,
      entity: "POST",
      entityId: postId,
    });

    return updatedPost;
  }

  async getUsers(query) {
    const { skip, limit, page } = paginate(query);
    const { status, role } = query;

    const where = {};
    if (status) where.isActive = status === 'active';
    if (role) where.role = role.toUpperCase();

    const [users, total] = await Promise.all([
      adminRepository.findUsers({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      adminRepository.countUsers(where),
    ]);

    return {
      users,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateUserStatus(userId, status, adminId) {
    const user = await userRepository.findUserById(parseInt(userId));
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const updatedUser = await adminRepository.updateUserStatus(parseInt(userId), status);

    await logActivity({
      type: ActivityType.USER_UPDATED,
      message: `${status ? 'activated' : 'deactivated'} user ${user.name}`,
      userId: adminId,
      entity: "USER",
      entityId: user.id,
    });

    return updatedUser;
  }

  async updateUserRole(userId, role, adminId) {
    const user = await userRepository.findUserById(parseInt(userId));
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (!['USER', 'MENTOR', 'ADMIN', 'SUPERADMIN'].includes(role.toUpperCase())) {
      throw new ApiError(400, 'Invalid role');
    }

    const updatedUser = await adminRepository.updateUserRole(parseInt(userId), role.toUpperCase());

    await logActivity({
      type: ActivityType.USER_UPDATED,
      message: `changed role of user ${user.name} to ${role}`,
      userId: adminId,
      entity: "USER",
      entityId: user.id,
    });

    return updatedUser;
  }

  async getDashboardStats() {
    const [
      totalUsers,
      activeUsers,
      totalPosts,
      pendingPosts,
      approvedPosts,
      totalComments,
      totalReports,
      pendingReports,
    ] = await Promise.all([
      adminRepository.countUsers(),
      adminRepository.countUsers({ isActive: true }),
      adminRepository.countPosts(),
      adminRepository.countPosts({ status: 'PENDING' }),
      adminRepository.countPosts({ status: 'APPROVED' }),
      adminRepository.countComments(),
      adminRepository.countReports(),
      adminRepository.countReports({ status: 'PENDING' }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
      },
      posts: {
        total: totalPosts,
        pending: pendingPosts,
        approved: approvedPosts,
        rejected: totalPosts - pendingPosts - approvedPosts,
      },
      comments: {
        total: totalComments,
      },
      reports: {
        total: totalReports,
        pending: pendingReports,
        resolved: totalReports - pendingReports,
      },
    };
  }

  async getSystemLogs(query) {
    const { skip, limit, page } = paginate(query);
    const { type, userId, dateFrom, dateTo } = query;

    const where = {};
    if (type) where.type = type.toUpperCase();
    if (userId) where.userId = parseInt(userId);
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [logs, total] = await Promise.all([
      adminRepository.findActivities({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      adminRepository.countActivities(where),
    ]);

    return {
      logs,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

export default new AdminService();
