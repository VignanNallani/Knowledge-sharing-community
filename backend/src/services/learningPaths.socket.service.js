import logger from '../utils/logger.util.js';
import learningPathService from './learningPath.service.js';
import mentorRecommendationService from './mentorRecommendation.service.js';

class LearningPathsSocketService {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // userId -> socket
    this.userRooms = new Map(); // userId -> Set of rooms
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen for learning path events from the service
    learningPathService.on('learningPathCreated', (data) => {
      this.broadcastLearningPathCreated(data);
    });

    learningPathService.on('progressUpdated', (data) => {
      this.broadcastProgressUpdated(data);
    });

    learningPathService.on('learningPathDeleted', (data) => {
      this.broadcastLearningPathDeleted(data);
    });

    learningPathService.on('recommendationGenerated', (data) => {
      this.broadcastRecommendationGenerated(data);
    });

    // Listen for mentor recommendation events from the service
    mentorRecommendationService.on('mentorRecommendationsGenerated', (data) => {
      this.broadcastMentorRecommendationsGenerated(data);
    });

    mentorRecommendationService.on('mentorFeedbackUpdated', (data) => {
      this.broadcastMentorFeedbackUpdated(data);
    });

    mentorRecommendationService.on('mentorScoreUpdated', (data) => {
      this.broadcastMentorScoreUpdated(data);
    });

    logger.info('Learning Paths socket service event listeners setup completed');
  }

  handleUserConnection(socket) {
    try {
      const userId = socket.userId;
      
      if (!userId) {
        logger.warn('Socket connection without userId', { socketId: socket.id });
        return;
      }

      // Store user connection
      this.connectedUsers.set(userId, socket);

      // Join user-specific rooms
      socket.join(`user_${userId}`);
      socket.join('learning_paths_global');
      socket.join('mentor_recommendations_global');

      // Join learning paths rooms based on user preferences
      this.joinLearningPathsRooms(socket, userId);

      // Join mentor recommendation rooms based on user preferences
      this.joinMentorRecommendationRooms(socket, userId);

      // Send initial data to user
      this.sendInitialData(socket, userId);

      logger.info(`User ${userId} connected to learning paths socket service`, {
        socketId: socket.id,
        totalConnectedUsers: this.connectedUsers.size
      });

      // Notify others about new user connection
      this.broadcastToGlobal('user_connected', {
        userId,
        timestamp: new Date(),
        totalUsers: this.connectedUsers.size
      }, userId); // Exclude the user who just connected

    } catch (error) {
      logger.error('Error handling user connection in learning paths socket service:', error);
    }
  }

  handleUserDisconnection(socket) {
    try {
      const userId = socket.userId;
      
      if (!userId) {
        return;
      }

      // Remove user connection
      this.connectedUsers.delete(userId);
      this.userRooms.delete(userId);

      // Leave all rooms
      socket.leave(`user_${userId}`);
      socket.leave('learning_paths_global');
      socket.leave('mentor_recommendations_global');

      logger.info(`User ${userId} disconnected from learning paths socket service`, {
        socketId: socket.id,
        totalConnectedUsers: this.connectedUsers.size
      });

      // Notify others about user disconnection
      this.broadcastToGlobal('user_disconnected', {
        userId,
        timestamp: new Date(),
        totalUsers: this.connectedUsers.size
      }, userId);

    } catch (error) {
      logger.error('Error handling user disconnection in learning paths socket service:', error);
    }
  }

  async joinLearningPathsRooms(socket, userId) {
    try {
      // Get user's learning paths to join specific rooms
      const userPaths = await learningPathService.getUserLearningPaths(userId, {
        limit: 10
      });

      const rooms = [];

      // Join rooms for each learning path
      userPaths.forEach(path => {
        rooms.push(`learning_path_${path.id}`);
        rooms.push(`learning_path_progress_${path.id}`);
      });

      // Join general learning paths rooms
      rooms.push('learning_paths_updates');
      rooms.push('learning_paths_recommendations');
      rooms.push('learning_paths_progress');

      // Join rooms and track them
      const uniqueRooms = [...new Set(rooms)];
      uniqueRooms.forEach(room => {
        socket.join(room);
      });

      this.userRooms.set(userId, new Set(uniqueRooms));

      logger.info(`User ${userId} joined ${uniqueRooms.length} learning paths rooms`, {
        rooms: uniqueRooms
      });

    } catch (error) {
      logger.error('Error joining learning paths rooms:', error);
    }
  }

  async joinMentorRecommendationRooms(socket, userId) {
    try {
      // Get user's mentor recommendations to join specific rooms
      const userRecommendations = await mentorRecommendationService.getStoredMentorRecommendations(userId, {
        limit: 10
      });

      const rooms = [];

      // Join rooms for each mentor recommendation
      userRecommendations.forEach(rec => {
        rooms.push(`mentor_recommendation_${rec.mentorId}`);
        rooms.push(`mentor_availability_${rec.mentorId}`);
      });

      // Join general mentor recommendation rooms
      rooms.push('mentor_recommendations_updates');
      rooms.push('mentor_recommendations_feedback');
      rooms.push('mentor_recommendations_scoring');

      // Join rooms and track them
      const uniqueRooms = [...new Set(rooms)];
      uniqueRooms.forEach(room => {
        socket.join(room);
      });

      // Update user rooms set
      const existingRooms = this.userRooms.get(userId) || new Set();
      uniqueRooms.forEach(room => existingRooms.add(room));
      this.userRooms.set(userId, existingRooms);

      logger.info(`User ${userId} joined ${uniqueRooms.length} mentor recommendation rooms`, {
        rooms: uniqueRooms
      });

    } catch (error) {
      logger.error('Error joining mentor recommendation rooms:', error);
    }
  }

  async sendInitialData(socket, userId) {
    try {
      // Send recent learning paths
      const recentPaths = await learningPathService.getUserLearningPaths(userId, {
        limit: 5
      });

      if (recentPaths && recentPaths.length > 0) {
        socket.emit('initial_learning_paths', {
          userId,
          learningPaths: recentPaths,
          timestamp: new Date()
        });
      }

      // Send recent mentor recommendations
      const recentRecommendations = await mentorRecommendationService.getStoredMentorRecommendations(userId, {
        limit: 5
      });

      if (recentRecommendations && recentRecommendations.length > 0) {
        socket.emit('initial_mentor_recommendations', {
          userId,
          recommendations: recentRecommendations,
          timestamp: new Date()
        });
      }

      // Send current progress summary
      const progressSummary = await this.calculateProgressSummary(userId);
      if (progressSummary) {
        socket.emit('progress_summary', {
          userId,
          summary: progressSummary,
          timestamp: new Date()
        });
      }

      logger.info(`Initial data sent to user ${userId}`, {
        pathsCount: recentPaths.length,
        recommendationsCount: recentRecommendations.length,
        progressProvided: !!progressSummary
      });

    } catch (error) {
      logger.error('Error sending initial data:', error);
    }
  }

  // Broadcast methods
  broadcastLearningPathCreated(data) {
    try {
      const event = {
        type: 'learning_path_created',
        data: {
          ...data,
          timestamp: new Date()
        }
      };

      // Broadcast to user-specific room
      if (data.userId) {
        this.io.to(`user_${data.userId}`).emit('learning_path_created', event);
      }

      // Broadcast to learning paths global room
      this.io.to('learning_paths_global').emit('learning_path_created', event);

      // Broadcast to learning paths updates room
      this.io.to('learning_paths_updates').emit('learning_path_update', event);

      logger.debug('Learning path created event broadcasted', {
        pathId: data.learningPath?.id,
        userId: data.userId
      });

    } catch (error) {
      logger.error('Error broadcasting learning path created event:', error);
    }
  }

  broadcastProgressUpdated(data) {
    try {
      const event = {
        type: 'progress_updated',
        data: {
          ...data,
          timestamp: new Date()
        }
      };

      // Broadcast to user-specific room
      if (data.userId) {
        this.io.to(`user_${data.userId}`).emit('progress_updated', event);
      }

      // Broadcast to learning path specific room
      if (data.learningPathId) {
        this.io.to(`learning_path_progress_${data.learningPathId}`).emit('progress_updated', event);
      }

      // Broadcast to learning paths progress room
      this.io.to('learning_paths_progress').emit('progress_updated', event);

      // Update progress summary for user
      this.updateProgressSummary(data.userId);

      logger.debug('Progress updated event broadcasted', {
        learningPathId: data.learningPathId,
        userId: data.userId,
        stepId: data.stepId
      });

    } catch (error) {
      logger.error('Error broadcasting progress updated event:', error);
    }
  }

  broadcastLearningPathDeleted(data) {
    try {
      const event = {
        type: 'learning_path_deleted',
        data: {
          ...data,
          timestamp: new Date()
        }
      };

      // Broadcast to user-specific room
      if (data.userId) {
        this.io.to(`user_${data.userId}`).emit('learning_path_deleted', event);
      }

      // Broadcast to learning paths global room
      this.io.to('learning_paths_global').emit('learning_path_deleted', event);

      // Broadcast to learning paths updates room
      this.io.to('learning_paths_updates').emit('learning_path_update', event);

      logger.debug('Learning path deleted event broadcasted', {
        learningPathId: data.learningPathId,
        userId: data.userId
      });

    } catch (error) {
      logger.error('Error broadcasting learning path deleted event:', error);
    }
  }

  broadcastRecommendationGenerated(data) {
    try {
      const event = {
        type: 'recommendation_generated',
        data: {
          ...data,
          timestamp: new Date()
        }
      };

      // Broadcast to user-specific room
      if (data.userId) {
        this.io.to(`user_${data.userId}`).emit('recommendation_generated', event);
      }

      // Broadcast to learning paths recommendations room
      this.io.to('learning_paths_recommendations').emit('recommendation_update', event);

      logger.debug('Recommendation generated event broadcasted', {
        learningPathId: data.learningPathId,
        userId: data.userId
      });

    } catch (error) {
      logger.error('Error broadcasting recommendation generated event:', error);
    }
  }

  broadcastMentorRecommendationsGenerated(data) {
    try {
      const event = {
        type: 'mentor_recommendations_generated',
        data: {
          ...data,
          timestamp: new Date()
        }
      };

      // Broadcast to user-specific room
      if (data.userId) {
        this.io.to(`user_${data.userId}`).emit('mentor_recommendations_generated', event);
      }

      // Broadcast to mentor recommendations global room
      this.io.to('mentor_recommendations_global').emit('mentor_recommendations_generated', event);

      // Broadcast to mentor recommendations updates room
      this.io.to('mentor_recommendations_updates').emit('mentor_recommendation_update', event);

      logger.debug('Mentor recommendations generated event broadcasted', {
        userId: data.userId,
        recommendationsCount: data.recommendations?.length
      });

    } catch (error) {
      logger.error('Error broadcasting mentor recommendations generated event:', error);
    }
  }

  broadcastMentorFeedbackUpdated(data) {
    try {
      const event = {
        type: 'mentor_feedback_updated',
        data: {
          ...data,
          timestamp: new Date()
        }
      };

      // Broadcast to user-specific room
      if (data.userId) {
        this.io.to(`user_${data.userId}`).emit('mentor_feedback_updated', event);
      }

      // Broadcast to mentor recommendation specific room
      if (data.mentorId) {
        this.io.to(`mentor_recommendation_${data.mentorId}`).emit('mentor_feedback_updated', event);
      }

      // Broadcast to mentor recommendations feedback room
      this.io.to('mentor_recommendations_feedback').emit('mentor_feedback_update', event);

      logger.debug('Mentor feedback updated event broadcasted', {
        mentorId: data.mentorId,
        userId: data.userId,
        feedbackScore: data.feedback?.score
      });

    } catch (error) {
      logger.error('Error broadcasting mentor feedback updated event:', error);
    }
  }

  broadcastMentorScoreUpdated(data) {
    try {
      const event = {
        type: 'mentor_score_updated',
        data: {
          ...data,
          timestamp: new Date()
        }
      };

      // Broadcast to user-specific room
      if (data.userId) {
        this.io.to(`user_${data.userId}`).emit('mentor_score_updated', event);
      }

      // Broadcast to mentor recommendation specific room
      if (data.mentorId) {
        this.io.to(`mentor_recommendation_${data.mentorId}`).emit('mentor_score_updated', event);
      }

      // Broadcast to mentor recommendations scoring room
      this.io.to('mentor_recommendations_scoring').emit('mentor_score_update', event);

      logger.debug('Mentor score updated event broadcasted', {
        mentorId: data.mentorId,
        userId: data.userId,
        newScore: data.score
      });

    } catch (error) {
      logger.error('Error broadcasting mentor score updated event:', error);
    }
  }

  broadcastToGlobal(eventType, data, excludeUserId = null) {
    try {
      const event = {
        type: eventType,
        data: {
          ...data,
          timestamp: new Date()
        }
      };

      // Send to all connected users except the excluded one
      this.connectedUsers.forEach((socket, userId) => {
        if (userId !== excludeUserId) {
          socket.emit(eventType, event);
        }
      });

      // Also send to global rooms
      this.io.to('learning_paths_global').emit(eventType, event);
      this.io.to('mentor_recommendations_global').emit(eventType, event);

    } catch (error) {
      logger.error('Error broadcasting to global:', error);
    }
  }

  // Room management methods
  joinRoom(socket, userId, room) {
    try {
      socket.join(room);
      
      if (!this.userRooms.has(userId)) {
        this.userRooms.set(userId, new Set());
      }
      
      this.userRooms.get(userId).add(room);
      
      logger.debug(`User ${userId} joined room ${room}`, {
        socketId: socket.id,
        totalRooms: this.userRooms.get(userId).size
      });

    } catch (error) {
      logger.error('Error joining room:', error);
    }
  }

  leaveRoom(socket, userId, room) {
    try {
      socket.leave(room);
      
      if (this.userRooms.has(userId)) {
        this.userRooms.get(userId).delete(room);
      }
      
      logger.debug(`User ${userId} left room ${room}`, {
        socketId: socket.id,
        totalRooms: this.userRooms.get(userId).size
      });

    } catch (error) {
      logger.error('Error leaving room:', error);
    }
  }

  getUserRooms(userId) {
    return Array.from(this.userRooms.get(userId) || []);
  }

  // Progress summary methods
  async calculateProgressSummary(userId) {
    try {
      const userPaths = await learningPathService.getUserLearningPaths(userId, {
        limit: 100
      });

      const totalPaths = userPaths.length;
      const completedPaths = userPaths.filter(path => path.status === 'completed').length;
      const inProgressPaths = userPaths.filter(path => path.status === 'in_progress').length;
      const averageProgress = userPaths.reduce((sum, path) => sum + path.progress, 0) / totalPaths;

      const summary = {
        totalPaths,
        completedPaths,
        inProgressPaths,
        averageProgress: averageProgress || 0,
        completionRate: totalPaths > 0 ? completedPaths / totalPaths : 0
      };

      return summary;
    } catch (error) {
      logger.error('Error calculating progress summary:', error);
      return null;
    }
  }

  async updateProgressSummary(userId) {
    try {
      const summary = await this.calculateProgressSummary(userId);
      
      if (summary) {
        this.io.to(`user_${userId}`).emit('progress_summary_updated', {
          userId,
          summary,
          timestamp: new Date()
        });
      }
    } catch (error) {
      logger.error('Error updating progress summary:', error);
    }
  }

  // Health and monitoring methods
  getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      totalRooms: Array.from(this.userRooms.values()).reduce((total, rooms) => total + rooms.size, 0),
      timestamp: new Date()
    };
  }

  // Cleanup methods
  disconnectUser(userId) {
    try {
      const socket = this.connectedUsers.get(userId);
      if (socket) {
        this.handleUserDisconnection(socket);
      }
    } catch (error) {
      logger.error('Error disconnecting user:', error);
    }
  }

  shutdown() {
    try {
      // Disconnect all users
      this.connectedUsers.forEach((socket, userId) => {
        socket.disconnect(true);
      });

      // Clear all data
      this.connectedUsers.clear();
      this.userRooms.clear();

      logger.info('Learning Paths socket service shutdown completed');
    } catch (error) {
      logger.error('Error during socket service shutdown:', error);
    }
  }
}

module.exports = LearningPathsSocketService;
