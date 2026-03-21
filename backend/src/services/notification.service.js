import getPrisma from '../config/prisma.js';

class NotificationService {
  async getUserNotifications(userId, { page = 1, limit = 20 }) {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;
    
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          message: true,
          read: true,
          postId: true,
          createdAt: true
        }
      }),
      prisma.notification.count({
        where: { userId }
      })
    ]);
    
    const unreadCount = await prisma.notification.count({
      where: { 
        userId,
        read: false 
      }
    });
    
    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  async createNotification(userId, { type, message, postId }) {
    const prisma = getPrisma();
    
    return await prisma.notification.create({
      data: {
        userId,
        type,
        message,
        postId
      }
    });
  }
  
  async markAsRead(userId, notificationId) {
    const prisma = getPrisma();
    
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId, // Ensure user can only mark their own notifications
        read: false
      },
      data: {
        read: true
      }
    });
  }
  
  async markAllAsRead(userId) {
    const prisma = getPrisma();
    
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false
      },
      data: {
        read: true
      }
    });
  }
}

export default new NotificationService();
