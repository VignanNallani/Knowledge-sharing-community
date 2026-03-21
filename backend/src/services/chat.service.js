import { ApiError } from '../utils/ApiError.js';
import { paginate } from '../utils/pagination.js';
import chatRepository from '../repositories/chat.repo.js';
import userRepository from '../repositories/user.repo.js';

class ChatService {
  async getThreads(userId, query) {
    const { skip, limit, page } = paginate(query);

    const threads = await chatRepository.findConversations({
      where: { members: { some: { userId } } },
      skip,
      take: limit,
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        members: {
          include: {
            user: { select: { id: true, name: true, profileImage: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      threads: threads.map(thread => ({
        ...thread,
        otherMember: thread.members.find(member => member.userId !== userId)?.user,
      })),
    };
  }

  async getMessages(conversationId, userId, query) {
    const { skip, limit, page } = paginate(query);

    const conversation = await chatRepository.findConversationById(conversationId);
    if (!conversation) {
      throw new ApiError(404, 'Conversation not found');
    }

    const isMember = await chatRepository.isConversationMember(conversationId, userId);
    if (!isMember) {
      throw new ApiError(403, 'Not authorized to view this conversation');
    }

    const [messages, total] = await Promise.all([
      chatRepository.findMessages({
        where: { conversationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, name: true, profileImage: true } },
        },
      }),
      chatRepository.countMessages({ conversationId }),
    ]);

    return {
      messages,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async startConversation(userId, otherUserId) {
    if (!otherUserId) {
      throw new ApiError(400, 'otherUserId required');
    }

    if (userId === otherUserId) {
      throw new ApiError(400, 'Cannot start conversation with yourself');
    }

    const otherUser = await userRepository.findUserById(otherUserId);
    if (!otherUser) {
      throw new ApiError(404, 'User not found');
    }

    let conversation = await chatRepository.findConversationBetweenUsers(userId, otherUserId);
    
    if (!conversation) {
      conversation = await chatRepository.createConversation({
        members: {
          create: [
            { userId },
            { userId: otherUserId },
          ],
        },
      });
    }

    return conversation;
  }

  async sendMessage(conversationId, userId, messageData) {
    const { body } = messageData;

    if (!body?.trim()) {
      throw new ApiError(400, 'Message body required');
    }

    const conversation = await chatRepository.findConversationById(conversationId);
    if (!conversation) {
      throw new ApiError(404, 'Conversation not found');
    }

    const isMember = await chatRepository.isConversationMember(conversationId, userId);
    if (!isMember) {
      throw new ApiError(403, 'Not authorized to send messages in this conversation');
    }

    const message = await chatRepository.createMessage({
      conversationId,
      senderId: userId,
      body: body.trim(),
    });

    await chatRepository.updateConversationLastActivity(conversationId);

    return message;
  }

  async deleteMessage(messageId, userId) {
    const message = await chatRepository.findMessageById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    const isMember = await chatRepository.isConversationMember(message.conversationId, userId);
    if (!isMember) {
      throw new ApiError(403, 'Not authorized to delete this message');
    }

    if (message.senderId !== userId) {
      throw new ApiError(403, 'Can only delete your own messages');
    }

    await chatRepository.deleteMessage(messageId);
    return { message: 'Message deleted successfully' };
  }

  async markMessagesAsRead(conversationId, userId) {
    const conversation = await chatRepository.findConversationById(conversationId);
    if (!conversation) {
      throw new ApiError(404, 'Conversation not found');
    }

    const isMember = await chatRepository.isConversationMember(conversationId, userId);
    if (!isMember) {
      throw new ApiError(403, 'Not authorized to access this conversation');
    }

    await chatRepository.markMessagesAsRead(conversationId, userId);
    return { message: 'Messages marked as read' };
  }

  async getUnreadMessageCount(userId) {
    const count = await chatRepository.countUnreadMessages(userId);
    return { unreadCount: count };
  }

  async leaveConversation(conversationId, userId) {
    const conversation = await chatRepository.findConversationById(conversationId);
    if (!conversation) {
      throw new ApiError(404, 'Conversation not found');
    }

    const isMember = await chatRepository.isConversationMember(conversationId, userId);
    if (!isMember) {
      throw new ApiError(403, 'Not a member of this conversation');
    }

    await chatRepository.removeMemberFromConversation(conversationId, userId);
    return { message: 'Left conversation successfully' };
  }

  async searchMessages(userId, query) {
    const { q, conversationId } = query;

    if (!q?.trim()) {
      throw new ApiError(400, 'Search query required');
    }

    let where = {
      body: { contains: q.trim(), mode: 'insensitive' },
    };

    if (conversationId) {
      const isMember = await chatRepository.isConversationMember(conversationId, userId);
      if (!isMember) {
        throw new ApiError(403, 'Not authorized to search in this conversation');
      }
      where.conversationId = conversationId;
    } else {
      where.conversation = {
        members: { some: { userId } },
      };
    }

    const messages = await chatRepository.findMessages({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, name: true, profileImage: true } },
        conversation: { select: { id: true } },
      },
    });

    return { messages };
  }
}

export default new ChatService();
