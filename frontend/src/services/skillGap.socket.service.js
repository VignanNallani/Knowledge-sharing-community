import { io } from 'socket.io-client';
import { ENV } from '../utils/env';
import { toast } from 'react-hot-toast';

class SkillGapSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.userId = null;
    this.rooms = new Set();
  }

  // Initialize socket connection
  initialize(userId, token) {
    this.userId = userId;
    
    // Configure socket connection
    const BASE_URL = ENV.SOCKET_URL;
    this.socket = io(BASE_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      forceNewConnection: true
    });

    this.setupEventListeners();
    this.connect();
  }

  // Setup event listeners
  setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      toast.success('Connected to real-time updates');
      console.log('Socket connected');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('Socket disconnected:', reason);
      
      if (reason === 'io server disconnect') {
        toast.warning('Server disconnected. Attempting to reconnect...');
        this.attemptReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnected = false;
      this.attemptReconnect();
    });

    // Skill gap events
    this.socket.on('skillGapsAnalyzed', (data) => {
      this.handleSkillGapsAnalyzed(data);
    });

    this.socket.on('skillGapProgressUpdated', (data) => {
      this.handleSkillGapProgressUpdated(data);
    });

    this.socket.on('skillGapClosed', (data) => {
      this.handleSkillGapClosed(data);
    });

    // Content recommendation events
    this.socket.on('contentRecommendationsGenerated', (data) => {
      this.handleContentRecommendationsGenerated(data);
    });

    this.socket.on('recommendationStatusUpdated', (data) => {
      this.handleRecommendationStatusUpdated(data);
    });

    // Learning path events
    this.socket.on('learningPathAdjusted', (data) => {
      this.handleLearningPathAdjusted(data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error('Real-time update error');
    });
  }

  // Connect to socket
  connect() {
    if (this.socket && !this.isConnected) {
      this.socket.connect();
    }
  }

  // Attempt to reconnect
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      toast.error('Unable to connect to real-time updates');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Join user-specific room
  joinUserRoom(userId) {
    if (!this.socket || !this.isConnected) return;
    
    const roomName = `user_${userId}`;
    this.socket.emit('joinRoom', { roomName });
    this.rooms.add(roomName);
  }

  // Join skill gap room
  joinSkillGapRoom(userId) {
    if (!this.socket || !this.isConnected) return;
    
    const roomName = `skill_gaps_${userId}`;
    this.socket.emit('joinRoom', { roomName });
    this.rooms.add(roomName);
  }

  // Join content recommendations room
  joinContentRoom(userId) {
    if (!this.socket || !this.isConnected) return;
    
    const roomName = `content_recommendations_${userId}`;
    this.socket.emit('joinRoom', { roomName });
    this.rooms.add(roomName);
  }

  // Leave room
  leaveRoom(roomName) {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.emit('leaveRoom', { roomName });
    this.rooms.delete(roomName);
  }

  // Leave all rooms
  leaveAllRooms() {
    if (!this.socket || !this.isConnected) return;
    
    this.rooms.forEach(roomName => {
      this.socket.emit('leaveRoom', { roomName });
    });
    this.rooms.clear();
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.leaveAllRooms();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Add event listener
  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Remove event listener
  removeEventListener(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      if (callbacks.length === 0) {
        this.listeners.delete(event);
      }
    }
  }

  // Trigger event listeners
  triggerEventListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Event handlers
  handleSkillGapsAnalyzed(data) {
    this.triggerEventListeners('skillGapsAnalyzed', data);
    
    // Show subtle notification for important updates
    if (data.gaps?.criticalGaps > 0) {
      toast.info(`Found ${data.gaps.criticalGaps} critical skill gaps`, {
        duration: 3000
      });
    }
  }

  handleSkillGapProgressUpdated(data) {
    this.triggerEventListeners('skillGapProgressUpdated', data);
    
    // Show progress notification for significant progress
    if (data.progress > 0.5 && data.progress % 0.25 < 0.01) {
      toast.success(`Great progress on ${data.skillName}!`, {
        duration: 2000
      });
    }
  }

  handleSkillGapClosed(data) {
    this.triggerEventListeners('skillGapClosed', data);
    
    if (data.reason === 'COMPLETED') {
      toast.success(`Skill gap in ${data.skillName} closed successfully!`, {
        duration: 3000
      });
    }
  }

  handleContentRecommendationsGenerated(data) {
    this.triggerEventListeners('contentRecommendationsGenerated', data);
    
    const { recommendations } = data;
    if (recommendations?.length > 0) {
      const topRecommendation = recommendations[0];
      toast.info(`New ${topRecommendation.contentType.toLowerCase()} recommendation: ${topRecommendation.title}`, {
        duration: 3000
      });
    }
  }

  handleRecommendationStatusUpdated(data) {
    this.triggerEventListeners('recommendationStatusUpdated', data);
    
    if (data.status === 'COMPLETED' && data.rating >= 4) {
      toast.success('Thanks for your feedback!', {
        duration: 2000
      });
    }
  }

  handleLearningPathAdjusted(data) {
    this.triggerEventListeners('learningPathAdjusted', data);
    
    toast.info('Learning path adjusted based on your progress', {
      duration: 3000
    });
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      userId: this.userId,
      rooms: Array.from(this.rooms),
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      reconnectDelay: this.reconnectDelay
    };
  }

  // Health check
  healthCheck() {
    return {
      status: this.isConnected ? 'connected' : 'disconnected',
      socket: this.socket ? 'initialized' : 'not initialized',
      userId: this.userId,
      rooms: this.rooms.size,
      listeners: Array.from(this.listeners.entries()).reduce((acc, [event, callbacks]) => {
      acc[event] = callbacks.length;
      return acc;
    }, {}),
      timestamp: new Date().toISOString()
    };
  }

  // Cleanup
  cleanup() {
    this.disconnect();
    this.listeners.clear();
  }
}

// Create singleton instance
const skillGapSocketService = new SkillGapService();

export default skillGapServiceService;
