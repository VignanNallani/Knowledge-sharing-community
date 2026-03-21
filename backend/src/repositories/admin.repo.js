import prisma from '../config/prisma.js';

export const findPendingPosts = (options = {}) =>
  prisma.post.findMany({
    where: { status: "PENDING" },
    ...options,
  });

export const countPendingPosts = () =>
  prisma.post.count({ where: { status: "PENDING" } });

export const updatePostStatus = (postId, status) =>
  prisma.post.update({
    where: { id: postId },
    data: { status },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

export const findUsers = (options = {}) =>
  prisma.user.findMany({
    ...options,
  });

export const countUsers = (where = {}) =>
  prisma.user.count({ where });

export const updateUserStatus = (userId, isActive) =>
  prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });

export const updateUserRole = (userId, role) =>
  prisma.user.update({
    where: { id: userId },
    data: { role },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });

export const countPosts = (where = {}) =>
  prisma.post.count({ where });

export const countComments = () =>
  prisma.comment.count();

export const countReports = (where = {}) =>
  prisma.report.count({ where });

export const findActivities = (options = {}) =>
  prisma.activity.findMany({
    ...options,
  });

export const countActivities = (where = {}) =>
  prisma.activity.count({ where });

export default {
  findPendingPosts,
  countPendingPosts,
  updatePostStatus,
  findUsers,
  countUsers,
  updateUserStatus,
  updateUserRole,
  countPosts,
  countComments,
  countReports,
  findActivities,
  countActivities,
};
