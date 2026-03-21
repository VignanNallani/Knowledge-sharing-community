import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from './index.js';

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket.id mapping
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // Authentication middleware for socket connections
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        socket.userEmail = decoded.email;
        
        logger.info(`Socket authenticated: ${socket.userEmail} (${socket.userId})`);
        next();
      } catch (error) {
        logger.error('Socket authentication failed:', error);
        next(new Error('Invalid authentication token'));
      }
    });

    this.io.on('connection', (socket) => {
      logger.info(`User connected: ${socket.userEmail} (${socket.id})`);
      
      // Store user connection
      this.connectedUsers.set(socket.userId, socket.id);

      // Join user to their personal room for notifications
      socket.join(`user_${socket.userId}`);

      // Handle joining post-specific rooms
      socket.on('join_post', (postId) => {
        socket.join(`post_${postId}`);
        logger.debug(`User ${socket.userId} joined post_${postId}`);
      });

      // Handle leaving post-specific rooms
      socket.on('leave_post', (postId) => {
        socket.leave(`post_${postId}`);
        logger.debug(`User ${socket.userId} left post_${postId}`);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info(`User disconnected: ${socket.userEmail} (${socket.id})`);
        this.connectedUsers.delete(socket.userId);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.userEmail}:`, error);
      });
    });

    logger.info('Socket.io server initialized');
    return this.io;
  }

  // Emit events to specific users
  emitToUser(userId, event, data) {
    if (this.io) {
      this.io.to(`user_${userId}`).emit(event, data);
      logger.debug(`Emitted ${event} to user_${userId}`, { data });
    }
  }

  // Emit events to post room (all users viewing the post)
  emitToPost(postId, event, data) {
    if (this.io) {
      this.io.to(`post_${postId}`).emit(event, data);
      logger.debug(`Emitted ${event} to post_${postId}`, { data });
    }
  }

  // Emit events to all connected users
  emitToAll(event, data) {
    if (this.io) {
      this.io.emit(event, data);
      logger.debug(`Emitted ${event} to all users`, { data });
    }
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  // Get online user count
  getOnlineUserCount() {
    return this.connectedUsers.size;
  }

  // Get socket instance
  getIO() {
    return this.io;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
