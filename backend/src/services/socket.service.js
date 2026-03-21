const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger.util');

const prisma = new PrismaClient();

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
    this.userRooms = new Map();
  }

  initialize(server) {
    try {
      this.io = new Server(server, {
        cors: {
          origin: process.env.FRONTEND_URL || "http://localhost:3000",
          methods: ["GET", "POST"],
          credentials: true
        },
        transports: ['websocket', 'polling']
      });

      this.setupMiddleware();
      this.setupEventHandlers();
      
      logger.info('Socket.io service initialized');
    } catch (error) {
      logger.error('Failed to initialize Socket.io service:', error);
    }
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { id: true, name: true, email: true, role: true, isActive: true }
        });

        if (!user || !user.isActive) {
          return next(new Error('User not found or inactive'));
        }

        socket.user = user;
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const userId = socket.user.id;
      logger.info(`User ${userId} connected via Socket.io`);

      // Store user connection
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId).add(socket.id);

      // Join user-specific room
      socket.join(`user_${userId}`);
      
      // Join role-specific rooms
      socket.join(`role_${socket.user.role}`);

      // Handle user joining specific rooms
      socket.on('join_room', (data) => {
        this.handleJoinRoom(socket, data);
      });

      // Handle user leaving rooms
      socket.on('leave_room', (data) => {
        this.handleLeaveRoom(socket, data);
      });

      // Handle mentorship room joins
      socket.on('join_mentor_room', (mentorId) => {
        socket.join(`mentor_${mentorId}`);
        logger.info(`User ${userId} joined mentor room for mentor ${mentorId}`);
      });

      socket.on('leave_mentor_room', (mentorId) => {
        socket.leave(`mentor_${mentorId}`);
        logger.info(`User ${userId} left mentor room for mentor ${mentorId}`);
      });

      // Handle session room joins
      socket.on('join_session_room', (sessionId) => {
        socket.join(`session_${sessionId}`);
        logger.info(`User ${userId} joined session room for session ${sessionId}`);
      });

      socket.on('leave_session_room', (sessionId) => {
        socket.leave(`session_${sessionId}`);
        logger.info(`User ${userId} left session room for session ${sessionId}`);
      });

      // Handle notification room joins
      socket.on('join_notification_room', () => {
        socket.join('notifications');
        logger.info(`User ${userId} joined notification room`);
      });

      // Handle search room joins
      socket.on('join_search_room', () => {
        socket.join('search_updates');
        logger.info(`User ${userId} joined search updates room`);
      });

      // Handle real-time updates
      socket.on('unread_count', (count) => {
        socket.emit('unread_count_updated', count);
      });

      // Handle typing indicators
      socket.on('typing_start', (data) => {
        this.handleTypingStart(socket, data);
      });

      socket.on('typing_stop', (data) => {
        this.handleTypingStop(socket, data);
      });

      // Handle presence updates
      socket.on('presence_update', (data) => {
        this.handlePresenceUpdate(socket, data);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Send initial unread count
      this.sendUnreadCount(socket, userId);
    });
  }

  handleJoinRoom(socket, data) {
    const { room, type = 'general' } = data;
    
    if (!room) return;

    socket.join(room);
    
    // Track user rooms
    if (!this.userRooms.has(socket.user.id)) {
      this.userRooms.set(socket.user.id, new Set());
    }
    this.userRooms.get(socket.user.id).add(room);

    logger.info(`User ${socket.user.id} joined room: ${room}`);

    // Notify other users in the room
    socket.to(room).emit('user_joined', {
      userId: socket.user.id,
      userName: socket.user.name,
      room,
      timestamp: new Date()
    });
  }

  handleLeaveRoom(socket, data) {
    const { room } = data;
    
    if (!room) return;

    socket.leave(room);
    
    // Remove from user rooms tracking
    if (this.userRooms.has(socket.user.id)) {
      this.userRooms.get(socket.user.id).delete(room);
    }

    logger.info(`User ${socket.user.id} left room: ${room}`);

    // Notify other users in the room
    socket.to(room).emit('user_left', {
      userId: socket.user.id,
      userName: socket.user.name,
      room,
      timestamp: new Date()
    });
  }

  handleTypingStart(socket, data) {
    const { room, entityType, entityId } = data;
    
    if (!room) return;

    socket.to(room).emit('typing_started', {
      userId: socket.user.id,
      userName: socket.user.name,
      entityType,
      entityId,
      timestamp: new Date()
    });
  }

  handleTypingStop(socket, data) {
    const { room, entityType, entityId } = data;
    
    if (!room) return;

    socket.to(room).emit('typing_stopped', {
      userId: socket.user.id,
      userName: socket.user.name,
      entityType,
      entityId,
      timestamp: new Date()
    });
  }

  handlePresenceUpdate(socket, data) {
    const { status, lastSeen } = data;
    
    // Update user presence
    socket.to(`user_${socket.user.id}`).emit('presence_updated', {
      userId: socket.user.id,
      status,
      lastSeen: lastSeen || new Date(),
      timestamp: new Date()
    });
  }

  handleDisconnect(socket) {
    const userId = socket.user.id;
    logger.info(`User ${userId} disconnected from Socket.io`);

    // Remove from connected users
    if (this.connectedUsers.has(userId)) {
      this.connectedUsers.get(userId).delete(socket.id);
      
      if (this.connectedUsers.get(userId).size === 0) {
        this.connectedUsers.delete(userId);
      }
    }

    // Clean up user rooms
    if (this.userRooms.has(userId)) {
      this.userRooms.get(userId).forEach(room => {
        socket.to(room).emit('user_left', {
          userId,
          userName: socket.user.name,
          room,
          timestamp: new Date()
        });
      });
      this.userRooms.delete(userId);
    }

    // Notify about user offline status
    socket.emit('presence_updated', {
      userId,
      status: 'offline',
      lastSeen: new Date(),
      timestamp: new Date()
    });
  }

  async sendUnreadCount(socket, userId) {
    try {
      const { notificationService } = require('./notification.service');
      const count = await notificationService.getUnreadCount(userId);
      
      socket.emit('unread_count_updated', count);
    } catch (error) {
      logger.error('Error sending unread count:', error);
    }
  }

  // Real-time event emitters
  emitSessionUpdate(sessionData) {
    if (!this.io) return;

    const event = {
      type: 'session_updated',
      data: sessionData,
      timestamp: new Date()
    };

    // Emit to mentor and mentee
    this.io.to(`session_${sessionData.id}`).emit('session_updated', event);
    this.io.to(`user_${sessionData.mentorId}`).emit('session_updated', event);
    this.io.to(`user_${sessionData.menteeId}`).emit('session_updated', event);
    
    logger.info(`Session update emitted for session ${sessionData.id}`);
  }

  emitPostUpdate(postData) {
    if (!this.io) return;

    const event = {
      type: 'post_updated',
      data: postData,
      timestamp: new Date()
    };

    // Emit to post room and author
    this.io.to(`post_${postData.id}`).emit('post_updated', event);
    this.io.to(`user_${postData.authorId}`).emit('post_updated', event);
    
    logger.info(`Post update emitted for post ${postData.id}`);
  }

  emitLikeUpdate(likeData) {
    if (!this.io) return;

    const event = {
      type: 'post_liked',
      data: likeData,
      timestamp: new Date()
    };

    // Emit to post room and author
    this.io.to(`post_${likeData.postId}`).emit('post_liked', event);
    this.io.to(`user_${likeData.post.authorId}`).emit('post_liked', event);
    
    logger.info(`Like update emitted for post ${likeData.postId}`);
  }

  emitCommentUpdate(commentData) {
    if (!this.io) return;

    const event = {
      type: 'comment_added',
      data: commentData,
      timestamp: new Date()
    };

    // Emit to post room and author
    this.io.to(`post_${commentData.postId}`).emit('comment_added', event);
    this.io.to(`user_${commentData.post.authorId}`).emit('comment_added', event);
    
    logger.info(`Comment update emitted for post ${commentData.postId}`);
  }

  emitFollowUpdate(followData) {
    if (!this.io) return;

    const event = {
      type: 'user_followed',
      data: followData,
      timestamp: new Date()
    };

    // Emit to follower and following
    this.io.to(`user_${followData.followerId}`).emit('user_followed', event);
    this.io.to(`user_${followData.followingId}`).emit('user_followed', event);
    
    logger.info(`Follow update emitted for user ${followData.followingId}`);
  }

  emitNotification(notification) {
    if (!this.io) return;

    const event = {
      type: 'notification_created',
      data: notification,
      timestamp: new Date()
    };

    // Emit to user
    this.io.to(`user_${notification.userId}`).emit('notification_created', event);
    
    logger.info(`Notification emitted for user ${notification.userId}`);
  }

  emitTrendingUpdate(trendingData) {
    if (!this.io) return;

    const event = {
      type: 'trending_updated',
      data: trendingData,
      timestamp: new Date()
    };

    // Emit to search updates room
    this.io.to('search_updates').emit('trending_updated', event);
    
    logger.info('Trending update emitted');
  }

  emitActivityUpdate(activity) {
    if (!this.io) return;

    const event = {
      type: 'activity_updated',
      data: activity,
      timestamp: new Date()
    };

    // Emit to activity feed room
    this.io.to('activity_feed').emit('activity_updated', event);
    
    logger.info(`Activity update emitted for ${activity.type}`);
  }

  emitSystemAnnouncement(announcement) {
    if (!this.io) return;

    const event = {
      type: 'system_announcement',
      data: announcement,
      timestamp: new Date()
    };

    // Emit to all connected users
    this.io.emit('system_announcement', event);
    
    logger.info('System announcement emitted');
  }

  emitPresenceUpdate(userId, status) {
    if (!this.io) return;

    const event = {
      type: 'presence_updated',
      data: {
        userId,
        status,
        timestamp: new Date()
      }
    };

    // Emit to user's followers
    this.io.to(`user_${userId}`).emit('presence_updated', event);
    
    logger.info(`Presence update emitted for user ${userId}`);
  }

  // Utility methods
  getConnectedUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  getUserConnections(userId) {
    return Array.from(this.connectedUsers.get(userId) || []);
  }

  getUserRooms(userId) {
    return Array.from(this.userRooms.get(userId) || []);
  }

  isUserConnected(userId) {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId).size > 0;
  }

  getRoomUsers(room) {
    if (!this.io) return [];
    
    const sockets = this.io.sockets.adapter.rooms.get(room);
    if (!sockets) return [];
    
    return Array.from(sockets).map(socketId => {
      const socket = this.io.sockets.sockets.get(socketId);
      return socket ? socket.user : null;
    }).filter(Boolean);
  }

  broadcastToRole(role, event, data) {
    if (!this.io) return;
    
    this.io.to(`role_${role}`).emit(event, {
      type: event,
      data,
      timestamp: new Date()
    });
    
    logger.info(`Broadcast to role ${role}: ${event}`);
  }

  broadcastToUsers(userIds, event, data) {
    if (!this.io) return;
    
    userIds.forEach(userId => {
      this.io.to(`user_${userId}`).emit(event, {
        type: event,
        data,
        timestamp: new Date()
      });
    });
    
    logger.info(`Broadcast to ${userIds.length} users: ${event}`);
  }

  // Rate limiting for events
  emitWithRateLimit(event, data, userId, limit = 10, windowMs = 60000) {
    if (!this.io) return;
    
    const key = `rate_limit_${userId}_${event}`;
    const now = Date.now();
    
    if (!this.rateLimits) {
      this.rateLimits = new Map();
    }
    
    const userLimits = this.rateLimits.get(userId) || {};
    const lastSent = userLimits[event];
    
    if (lastSent && now - lastSent < windowMs) {
      logger.warn(`Rate limit exceeded for user ${userId}, event: ${event}`);
      return false;
    }
    
    userLimits[event] = now;
    this.rateLimits.set(userId, userLimits);
    
    this.io.to(`user_${userId}`).emit(event, {
      type: event,
      data,
      timestamp: new Date()
    });
    
    return true;
  }

  // Cleanup
  cleanup() {
    if (this.io) {
      this.io.close();
      this.io = null;
    }
    
    this.connectedUsers.clear();
    this.userRooms.clear();
    
    if (this.rateLimits) {
      this.rateLimits.clear();
    }
    
    logger.info('Socket.io service cleaned up');
  }

  // Statistics
  getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      totalConnections: Array.from(this.connectedUsers.values()).reduce((sum, set) => sum + set.size, 0),
      userRooms: this.userRooms.size,
      rateLimits: this.rateLimits ? this.rateLimits.size : 0
    };
  }
}

module.exports = new SocketService();
