import { io } from 'socket.io-client';
import { getAuthToken } from '../utils/auth';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
  }

  connect() {
    try {
      const token = getAuthToken();
      if (!token) {
        console.warn('No auth token found, socket connection aborted');
        return;
      }

      this.socket = io(process.env.REACT_APP_API_URL || 'http://localhost:4000', {
        auth: {
          token
        },
        transports: ['websocket', 'polling']
      });

      this.setupEventListeners();
      this.connected = true;
      console.log('Socket connected successfully');
    } catch (error) {
      console.error('Socket connection error:', error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
      console.log('Socket disconnected');
    }
  }

  setupEventListeners() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.connected = false;
    });

    // Comment events
    this.socket.on('new_comment', (data) => {
      console.log('New comment received:', data);
      this.emit('new_comment', data);
    });

    this.socket.on('comment_deleted', (data) => {
      console.log('Comment deleted:', data);
      this.emit('comment_deleted', data);
    });

    this.socket.on('comment_liked', (data) => {
      console.log('Comment liked:', data);
      this.emit('comment_liked', data);
    });

    this.socket.on('comment_unliked', (data) => {
      console.log('Comment unliked:', data);
      this.emit('comment_unliked', data);
    });

    // Post events
    this.socket.on('new_like', (data) => {
      console.log('New like received:', data);
      this.emit('new_like', data);
    });

    this.socket.on('post_unliked', (data) => {
      console.log('Post unliked:', data);
      this.emit('post_unliked', data);
    });

    // Notification events
    this.socket.on('new_notification', (data) => {
      console.log('New notification received:', data);
      this.emit('new_notification', data);
    });
  }

  // Join a post room to receive real-time updates
  joinPost(postId) {
    if (this.socket && this.connected) {
      this.socket.emit('join_post', postId);
      console.log(`Joined post room: ${postId}`);
    }
  }

  // Leave a post room
  leavePost(postId) {
    if (this.socket && this.connected) {
      this.socket.emit('leave_post', postId);
      console.log(`Left post room: ${postId}`);
    }
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in socket event handler for ${event}:`, error);
        }
      });
    }
  }

  // Get connection status
  isConnected() {
    return this.connected;
  }

  // Get socket instance
  getSocket() {
    return this.socket;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
