import { io } from 'socket.io-client';
import { ENV } from '../utils/env';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.user = null;
    this.eventListeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect(token) {
    if (this.socket && this.connected) {
      return Promise.resolve(this.socket);
    }

    return new Promise((resolve, reject) => {
      try {
        const serverUrl = ENV.SOCKET_URL;
        
        this.socket = io(serverUrl, {
          auth: { token },
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
          reconnectionDelayMax: 5000
        });

        this.setupEventHandlers();
        
        this.socket.on('connect', () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          console.log('Connected to Socket.io server');
          resolve(this.socket);
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          this.connected = false;
          reject(error);
        });

      } catch (error) {
        console.error('Error creating socket connection:', error);
        reject(error);
      }
    });
  }

  setupEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      console.log('Disconnected from Socket.io:', reason);
      
      // Handle reconnection
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        this.socket.connect();
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.connected = true;
      console.log(`Reconnected to Socket.io after ${attemptNumber} attempts`);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('Max reconnection attempts reached');
      }
    });

    // Real-time events
    this.socket.on('session_updated', (data) => {
      this.emit('session_updated', data);
    });

    this.socket.on('post_updated', (data) => {
      this.emit('post_updated', data);
    });

    this.socket.on('post_liked', (data) => {
      this.emit('post_liked', data);
    });

    this.socket.on('comment_added', (data) => {
      this.emit('comment_added', data);
    });

    this.socket.on('user_followed', (data) => {
      this.emit('user_followed', data);
    });

    this.socket.on('notification_created', (data) => {
      this.emit('notification_created', data);
      this.updateUnreadCount();
    });

    this.socket.on('trending_updated', (data) => {
      this.emit('trending_updated', data);
    });

    this.socket.on('activity_updated', (data) => {
      this.emit('activity_updated', data);
    });

    this.socket.on('system_announcement', (data) => {
      this.emit('system_announcement', data);
    });

    this.socket.on('presence_updated', (data) => {
      this.emit('presence_updated', data);
    });

    this.socket.on('unread_count_updated', (count) => {
      this.emit('unread_count', count);
    });

    // Room events
    this.socket.on('user_joined', (data) => {
      this.emit('user_joined', data);
    });

    this.socket.on('user_left', (data) => {
      this.emit('user_left', data);
    });

    // Typing indicators
    this.socket.on('typing_started', (data) => {
      this.emit('typing_started', data);
    });

    this.socket.on('typing_stopped', (data) => {
      this.emit('typing_stopped', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emit('socket_error', error);
    });
  }

  // Room management
  joinRoom(room, type = 'general') {
    if (!this.socket || !this.connected) {
      console.warn('Cannot join room: not connected');
      return;
    }

    this.socket.emit('join_room', { room, type });
    console.log(`Joined room: ${room}`);
  }

  leaveRoom(room) {
    if (!this.socket || !this.connected) {
      console.warn('Cannot leave room: not connected');
      return;
    }

    this.socket.emit('leave_room', { room });
    console.log(`Left room: ${room}`);
  }

  joinMentorRoom(mentorId) {
    if (!this.socket || !this.connected) return;
    
    this.socket.emit('join_mentor_room', mentorId);
    console.log(`Joined mentor room: ${mentorId}`);
  }

  leaveMentorRoom(mentorId) {
    if (!this.socket || !this.connected) return;
    
    this.socket.emit('leave_mentor_room', mentorId);
    console.log(`Left mentor room: ${mentorId}`);
  }

  joinSessionRoom(sessionId) {
    if (!this.socket || !this.connected) return;
    
    this.socket.emit('join_session_room', sessionId);
    console.log(`Joined session room: ${sessionId}`);
  }

  leaveSessionRoom(sessionId) {
    if (!this.socket || !this.connected) return;
    
    this.socket.emit('leave_session_room', sessionId);
    console.log(`Left session room: ${sessionId}`);
  }

  joinNotificationRoom() {
    if (!this.socket || !this.connected) return;
    
    this.socket.emit('join_notification_room');
    console.log('Joined notification room');
  }

  joinSearchRoom() {
    if (!this.socket || !this.connected) return;
    
    this.socket.emit('join_search_room');
    console.log('Joined search room');
  }

  // Typing indicators
  startTyping(room, entityType, entityId) {
    if (!this.socket || !this.connected) return;
    
    this.socket.emit('typing_start', { room, entityType, entityId });
  }

  stopTyping(room, entityType, entityId) {
    if (!this.socket || !this.connected) return;
    
    this.socket.emit('typing_stop', { room, entityType, entityId });
  }

  // Presence
  updatePresence(status, lastSeen) {
    if (!this.socket || !this.connected) return;
    
    this.socket.emit('presence_update', { status, lastSeen });
  }

  // Event listeners
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in socket event listener for ${event}:`, error);
        }
      });
    }
  }

  // Unread count management
  updateUnreadCount() {
    if (!this.socket || !this.connected) return;
    
    this.socket.emit('unread_count');
  }

  // Connection management
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.user = null;
      this.eventListeners.clear();
      console.log('Disconnected from Socket.io');
    }
  }

  isConnected() {
    return this.connected && this.socket && this.socket.connected;
  }

  // Utility methods
  getConnectionStatus() {
    return {
      connected: this.isConnected(),
      socketId: this.socket?.id,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }

  // Browser notification helper
  showBrowserNotification(title, message, options = {}) {
    if (!('Notification' in window)) {
      console.warn('Browser notifications not supported');
      return;
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: message,
        icon: options.icon || '/icons/notification-icon.png',
        badge: options.badge || '/icons/badge-icon.png',
        tag: options.tag || 'general',
        data: options.data,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false
      });

      if (options.url) {
        notification.onclick = () => {
          window.open(options.url, '_blank');
          notification.close();
        };
      }

      // Auto-close after 5 seconds
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return notification;
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.showBrowserNotification(title, message, options);
        }
      });
    }
  }

  // Push notification subscription helper
  async subscribeToPushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(ENV.VAPID_PUBLIC_KEY)
      });

      // Send subscription to server
      const response = await fetch('/api/v1/notifications/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth
            },
            userAgent: navigator.userAgent
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to subscribe to push notifications');
      }

      const data = await response.json();
      console.log('Subscribed to push notifications:', data);
      
      return data.data;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return null;
    }
  }

  async unsubscribeFromPushNotifications() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        
        // Notify server
        const response = await fetch('/api/v1/notifications/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to unsubscribe from push notifications');
        }

        console.log('Unsubscribed from push notifications');
        return true;
      }
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  // Debug methods
  debug() {
    console.log('Socket Service Debug Info:', {
      connected: this.connected,
      socketId: this.socket?.id,
      eventListeners: Array.from(this.eventListeners.entries()).map(([event, listeners]) => ({
        event,
        count: listeners.size
      })),
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    });
  }

  // Cleanup
  cleanup() {
    this.disconnect();
    this.eventListeners.clear();
    this.reconnectAttempts = 0;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
