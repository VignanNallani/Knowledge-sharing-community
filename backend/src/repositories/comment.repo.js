import getPrisma from '../config/prisma.js';

const prisma = getPrisma();

export const findCommentById = (commentId, options = {}) =>
  prisma.comment.findUnique({
    where: { id: commentId },
    ...options,
  });

export const findComments = (options = {}) =>
  prisma.comment.findMany({
    ...options,
  });

export const createComment = (data, options = {}) =>
  prisma.comment.create({
    data,
    ...options,
  });

export const updateComment = async (commentId, data, userId, userRole) => {
  try {
    // First check ownership and get current version
    const currentComment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true, version: true }
    });

    if (!currentComment) {
      throw new Error('Comment not found');
    }

    const canModify = currentComment.authorId === userId || userRole === 'ADMIN';
    if (!canModify) {
      throw new Error('Unauthorized to modify this comment');
    }

    // Optimistic concurrency update with version check
    const updatedComment = await prisma.comment.update({
      where: { 
        id: commentId,
        version: currentComment.version // Ensure we're updating the expected version
      },
      data: {
        ...data,
        version: { increment: 1 } // Increment version atomically
      }
    });

    return updatedComment;
  } catch (error) {
    if (error.code === 'P2025') { // Prisma error for record not found (version mismatch)
      throw new Error('Comment was modified by another user. Please refresh and try again.');
    }
    throw error;
  }
};

export const deleteComment = async (commentId, userId, userRole) => {
  try {
    // Ownership enforcement at query level
    const deleteResult = await prisma.comment.deleteMany({
      where: { 
        id: commentId,
        OR: [
          { authorId: userId }, // Owner can delete
          { authorId: { not: userId }, userRole: 'ADMIN' } // Admin can delete any
        ]
      }
    });

    if (deleteResult.count === 0) {
      throw new Error('Unauthorized to delete this comment');
    }

    return true;
  } catch (error) {
    if (error.code === 'P2025') {
      throw new Error('Comment not found');
    }
    throw error;
  }
};

export const findCommentLike = ({ commentId, userId }) =>
  prisma.commentLike.findFirst({
    where: { commentId, userId },
  });

export const createCommentLike = ({ commentId, userId }) =>
  prisma.commentLike.create({
    data: { commentId, userId },
  });

export const deleteCommentLike = (likeId) =>
  prisma.commentLike.delete({
    where: { id: likeId },
  });

export const countComments = (where = {}) =>
  prisma.comment.count({ where });

export const findCommentsByPost = (postId, options = {}) =>
  prisma.comment.findMany({
    where: { postId },
    ...options,
  });

export const findReplies = (parentCommentId, options = {}) =>
  prisma.comment.findMany({
    where: { parentCommentId },
    ...options,
  });

export const findCommentsByAuthor = (authorId, options = {}) =>
  prisma.comment.findMany({
    where: { authorId },
    ...options,
  });

export const searchComments = ({ where, skip, take, include }) =>
  prisma.comment.findMany({
    where,
    skip,
    take,
    include,
    orderBy: { createdAt: "desc" },
  });

export default {
  findCommentById,
  findComments,
  createComment,
  updateComment,
  deleteComment,
  findCommentLike,
  createCommentLike,
  deleteCommentLike,
  countComments,
  findCommentsByPost,
  findReplies,
  findCommentsByAuthor,
  searchComments,
};
