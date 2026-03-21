import prisma from '../config/prisma.js';

export const findConversationById = (conversationId, options = {}) =>
  prisma.conversation.findUnique({
    where: { id: conversationId },
    ...options,
  });

export const findConversations = (options = {}) =>
  prisma.conversation.findMany({
    ...options,
  });

export const createConversation = (data) =>
  prisma.conversation.create({
    data,
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, profileImage: true } },
        },
      },
    },
  });

export const findConversationBetweenUsers = (userId1, userId2) =>
  prisma.conversation.findFirst({
    where: {
      members: {
        every: {
          userId: { in: [userId1, userId2] },
        },
      },
    },
  });

export const isConversationMember = (conversationId, userId) =>
  prisma.conversationMember.findFirst({
    where: { conversationId, userId },
  });

export const removeMemberFromConversation = (conversationId, userId) =>
  prisma.conversationMember.delete({
    where: {
      conversationId_userId: { conversationId, userId },
    },
  });

export const updateConversationLastActivity = (conversationId) =>
  prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

export const findMessageById = (messageId, options = {}) =>
  prisma.message.findUnique({
    where: { id: messageId },
    ...options,
  });

export const findMessages = (options = {}) =>
  prisma.message.findMany({
    ...options,
  });

export const createMessage = (data) =>
  prisma.message.create({
    data,
    include: {
      sender: { select: { id: true, name: true, profileImage: true } },
    },
  });

export const updateMessage = (messageId, data) =>
  prisma.message.update({
    where: { id: messageId },
    data,
  });

export const deleteMessage = (messageId) =>
  prisma.message.delete({
    where: { id: messageId },
  });

export const countMessages = (where = {}) =>
  prisma.message.count({ where });

export const markMessagesAsRead = (conversationId, userId) =>
  prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

export const countUnreadMessages = (userId) =>
  prisma.message.count({
    where: {
      conversation: {
        members: {
          some: { userId },
        },
      },
      senderId: { not: userId },
      readAt: null,
    },
  });

export default {
  findConversationById,
  findConversations,
  createConversation,
  findConversationBetweenUsers,
  isConversationMember,
  removeMemberFromConversation,
  updateConversationLastActivity,
  findMessageById,
  findMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  countMessages,
  markMessagesAsRead,
  countUnreadMessages,
};
