const logger = require('../utils/logger.util');
const aiAnalyticsService = require('./ai.analytics.service');

class AIAnalyticsSocketService {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // userId -> socket
    this.userRooms = new Map(); // userId -> Set of rooms
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen for AI analytics events from the service
    aiAnalyticsService.on('analyticsEvent', (data) => {
      this.broadcastAnalyticsEvent(data);
    });

    aiAnalyticsService.on('predictionCompleted', (data) => {
      this.broadcastPredictionUpdate(data);
    });

    aiAnalyticsService.on('insightGenerated', (data) => {
      this.broadcastInsightUpdate(data);
    });

    aiAnalyticsService.on('recommendationGenerated', (data) => {
      this.broadcastRecommendationUpdate(data);
    });

    aiAnalyticsService.on('metricsUpdated', (data) => {
      this.broadcastMetricsUpdate(data);
    });

    aiAnalyticsService.on('modelTrained', (data) => {
      this.broadcastModelTrainingUpdate(data);
    });

    logger.info('AI Analytics socket service event listeners setup completed');
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
      socket.join('ai_analytics_global');

      // Join analytics rooms based on user preferences
      this.joinAnalyticsRooms(socket, userId);

      // Send initial data to user
      this.sendInitialData(socket, userId);

      logger.info(`User ${userId} connected to AI analytics socket service`, {
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
      logger.error('Error handling user connection in AI analytics socket service:', error);
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
      socket.leave('ai_analytics_global');

      logger.info(`User ${userId} disconnected from AI analytics socket service`, {
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
      logger.error('Error handling user disconnection in AI analytics socket service:', error);
    }
  }

  async joinAnalyticsRooms(socket, userId) {
    try {
      // Get user preferences to determine which rooms to join
      const userBehavior = await aiAnalyticsService.getUserBehavior(userId);
      const rooms = [];

      // Join prediction rooms based on user interests
      if (userBehavior && userBehavior.length > 0) {
        userBehavior.forEach(behavior => {
          switch (behavior.behaviorType) {
            case 'CONTENT_PREFERENCE':
              rooms.push('content_recommendations');
              rooms.push('content_trends');
              break;
            case 'LEARNING_STYLE':
              rooms.push('learning_paths');
              rooms.push('skill_recommendations');
              break;
            case 'ENGAGEMENT_PATTERN':
              rooms.push('engagement_predictions');
              rooms.push('retention_alerts');
              break;
            case 'SKILL_INTEREST':
              rooms.push('skill_trends');
              rooms.push('mentor_matches');
              break;
          }
        });
      }

      // Join default rooms
      rooms.push('predictions');
      rooms.push('insights');
      rooms.push('metrics');

      // Join rooms and track them
      const uniqueRooms = [...new Set(rooms)];
      uniqueRooms.forEach(room => {
        socket.join(room);
      });

      this.userRooms.set(userId, new Set(uniqueRooms));

      logger.info(`User ${userId} joined ${uniqueRooms.length} AI analytics rooms`, {
        rooms: uniqueRooms
      });

    } catch (error) {
      logger.error('Error joining analytics rooms:', error);
    }
  }

  async sendInitialData(socket, userId) {
    try {
      // Send recent predictions
      const recentPredictions = await aiAnalyticsService.generatePredictions(userId, 'ENGAGEMENT', {
        limit: 5
      });

      if (recentPredictions && recentPredictions.length > 0) {
        socket.emit('initial_predictions', {
          userId,
          predictions: recentPredictions,
          timestamp: new Date()
        });
      }

      // Send recent insights
      const recentInsights = await aiAnalyticsService.generateInsights('USER_TREND', {
        limit: 5
      });

      if (recentInsights && recentInsights.length > 0) {
        socket.emit('initial_insights', {
          userId,
          insights: recentInsights,
          timestamp: new Date()
        });
      }

      // Send current metrics
      const currentMetrics = await aiAnalyticsService.getAnalyticsMetrics('7d');

      if (currentMetrics) {
        socket.emit('current_metrics', {
          userId,
          metrics: currentMetrics,
          timestamp: new Date()
        });
      }

      logger.info(`Initial data sent to user ${userId}`, {
        predictionsCount: recentPredictions.length,
        insightsCount: recentInsights.length,
        metricsProvided: !!currentMetrics
      });

    } catch (error) {
      logger.error('Error sending initial data:', error);
    }
  }

  // Broadcast methods
  broadcastAnalyticsEvent(data) {
    try {
      const event = {
        type: 'analytics_event',
        data: {
          ...data,
          timestamp: new Date()
        }
      };

      // Broadcast to global room
      this.io.to('ai_analytics_global').emit('analytics_event', event);

      // Broadcast to specific user rooms if applicable
      if (data.userId) {
        this.io.to(`user_${data.userId}`).emit('user_analytics_event', event);
      }

      // Broadcast to relevant rooms based on event type
      this.broadcastToRelevantRooms(data, event);

      logger.debug('Analytics event broadcasted', {
        eventType: data.eventType,
        userId: data.userId
      });

    } catch (error) {
      logger.error('Error broadcasting analytics event:', error);
    }
  }

  broadcastPredictionUpdate(data) {
    try {
      const event = {
        type: 'prediction_updated',
        data: {
          ...data,
          timestamp: new Date()
        }
      };

      // Broadcast to predictions room
      this.io.to('predictions').emit('prediction_updated', event);

      // Send to specific user
      if (data.userId) {
        this.io.to(`user_${data.userId}`).emit('user_prediction_updated', event);
      }

      logger.debug('Prediction update broadcasted', {
        predictionType: data.type,
        userId: data.userId
      });

    } catch (error) {
      logger.error('Error broadcasting prediction update:', error);
    }
  }

  broadcastInsightUpdate(data) {
    try {
      const event = {
        type: 'insight_updated',
        data: {
          ...data,
          timestamp: new Date()
        }
      };

      // Broadcast to insights room
      this.io.to('insights').emit('insight_updated', event);

      // Send to specific user
      if (data.userId) {
        this.io.to(`user_${data.userId}`).emit('user_insight_updated', event);
      }

      // Broadcast to insight type specific rooms
      if (data.insightType) {
        this.io.to(`insights_${data.insightType}`).emit('insight_type_updated', event);
      }

      logger.debug('Insight update broadcasted', {
        insightType: data.insightType,
        userId: data.userId
      });

    } catch (error) {
      logger.error('Error broadcasting insight update:', error);
    }
  }

  broadcastRecommendationUpdate(data) {
    try {
      const event = {
        type: 'recommendation_updated',
        data: {
          ...data,
          timestamp: new Date()
        }
      };

      // Broadcast to content recommendations room
      this.io.to('content_recommendations').emit('recommendation_updated', event);

      // Send to specific user
      if (data.userId) {
        this.io.to(`user_${data.userId}`).emit('user_recommendation_updated', event);
      }

      // Broadcast to content type specific rooms
      if (data.contentType) {
        this.io.to(`recommendations_${data.contentType}`).emit('content_type_updated', event);
      }

      logger.debug('Recommendation update broadcasted', {
        contentType: data.contentType,
        userId: data.userId
      });

    } catch (error) {
      logger.error('Error broadcasting recommendation update:', error);
    }
  }

  broadcastMetricsUpdate(data) {
    try {
      const event = {
        type: 'metrics_updated',
        data: {
          ...data,
          timestamp: new Date()
        }
      };

      // Broadcast to metrics room
      this.io.to('metrics').emit('metrics_updated', event);

      // Broadcast to admin users
      this.broadcastToAdmins('admin_metrics_updated', event);

      logger.debug('Metrics update broadcasted', {
        metricType: data.metricType,
        timeRange: data.timeRange
      });

    } catch (error) {
      logger.error('Error broadcasting metrics update:', error);
    }
  }

  broadcastModelTrainingUpdate(data) {
    try {
      const event = {
        type: 'model_training_update',
        data: {
          ...data,
          timestamp: new Date()
        }
      };

      // Broadcast to admin users
      this.broadcastToAdmins('admin_model_training', event);

      // Broadcast to model training room
      this.io.to('model_training').emit('training_update', event);

      logger.debug('Model training update broadcasted', {
        modelId: data.modelId,
        trainingType: data.trainingType,
        status: data.status
      });

    } catch (error) {
      logger.error('Error broadcasting model training update:', error);
    }
  }

  broadcastToRelevantRooms(data, event) {
    try {
      // Determine relevant rooms based on data type
      const relevantRooms = [];

      switch (data.eventType) {
        case 'POST_LIKE':
        relevantRooms.push('content_trends');
        relevantRooms.push('engagement_predictions');
          break;
        case 'POST_COMMENT':
          relevantRooms.push('content_trends');
          relevantRooms.push('engagement_predictions');
          break;
        case 'POST_CREATE':
          relevantRooms.push('content_trends');
          relevantRooms.push('skill_recommendations');
          break;
        case 'MENTOR_SESSION_BOOKED':
          relevantRooms.push('mentor_matches');
          relevantRooms.push('learning_paths');
          break;
        case 'MENTOR_SESSION_COMPLETED':
          relevantRooms.push('mentor_matches');
          relevantRooms.push('learning_paths');
          break;
        case 'SKILL_VIEW':
          relevantRooms.push('skill_trends');
          relevantRooms.push('skill_recommendations');
          break;
        case 'SEARCH_QUERY':
          relevantRooms.push('content_discovery');
          relevantRooms.push('content_recommendations');
          break;
      }

      // Broadcast to relevant rooms
      relevantRooms.forEach(room => {
        this.io.to(room).emit('relevant_event', event);
      });

    } catch (error) {
      logger.error('Error broadcasting to relevant rooms:', error);
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

      // Also send to global room
      this.io.to('ai_analytics_global').emit(eventType, event);

    } catch (error) {
      logger.error('Error broadcasting to global:', error);
    }
  }

  broadcastToAdmins(eventType, data) {
    try {
      const event = {
        type: eventType,
        data: {
          ...data,
          timestamp: new Date()
        }
      };

      // Send to all admin users
      this.connectedUsers.forEach((socket, userId) => {
        // Check if user is admin (this would require user data)
        socket.emit(eventType, event);
      });

      // Also send to admin room
      this.io.to('admin_analytics').emit(eventType, event);

    } catch (error) {
      logger.error('Error broadcasting to admins:', error);
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

      logger.info('AI Analytics socket service shutdown completed');
    } catch (error) {
      logger.error('Error during socket service shutdown:', error);
    }
  }
}

module.exports = AIAnalyticsSocketService;
