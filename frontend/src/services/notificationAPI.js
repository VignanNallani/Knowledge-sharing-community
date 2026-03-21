import axios from "axios";
import { ENV } from '../utils/env';

const BASE_URL = ENV.API_URL;

// Create axios instance with auth
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      try {
        const refreshResponse = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {}, {
          withCredentials: true
        });
        
        const { accessToken } = refreshResponse.data.data;
        localStorage.setItem('accessToken', accessToken);
        
        // Retry original request
        error.config.headers.Authorization = `Bearer ${accessToken}`;
        return api.request(error.config);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Notification API methods
export const notificationService = {
  // Get user notifications
  async getUserNotifications(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.type) params.append('type', filters.type);
    if (filters.isRead !== undefined) params.append('isRead', filters.isRead);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await api.get(`/api/v1/notifications?${params}`);
    return response.data.data;
  },

  // Get unread notification count
  async getUnreadCount() {
    const response = await api.get('/api/v1/notifications/unread-count');
    return response.data.data;
  },

  // Mark notification as read
  async markNotificationAsRead(notificationId, userId) {
    const response = await api.put(`/api/v1/notifications/${notificationId}/read`);
    return response.data.data;
  },

  // Mark all notifications as read
  async markAllNotificationsAsRead(userId) {
    const response = await api.put('/api/v1/notifications/read-all');
    return response.data.data;
  },

  // Delete notification
  async deleteNotification(notificationId, userId) {
    const response = await api.delete(`/api/v1/notifications/${notificationId}`);
    return response.data.data;
  },

  // Get notification statistics
  async getNotificationStats() {
    const response = await api.get('/api/v1/notifications/stats');
    return response.data.data;
  },

  // Get notification preferences
  async getNotificationPreferences() {
    const response = await api.get('/api/v1/notifications/preferences');
    return response.data.data;
  },

  // Update notification preferences
  async updateNotificationPreferences(preferences) {
    const response = await api.put('/api/v1/notifications/preferences', preferences);
    return response.data.data;
  },

  // Create notification (internal use)
  async createNotification(notificationData) {
    const response = await api.post('/api/v1/notifications/create', notificationData);
    return response.data.data;
  },

  // Get email preferences
  async getEmailPreferences() {
    const response = await api.get('/api/v1/notifications/email/preferences');
    return response.data.data;
  },

  // Update email preferences
  async updateEmailPreferences(preferences) {
    const response = await api.put('/api/v1/notifications/email/preferences', preferences);
    return response.data.data;
  },

  // Send test email
  async sendTestEmail(email) {
    const response = await api.post('/api/v1/notifications/email/test', { to: email });
    return response.data.data;
  },

  // Get email queue status (admin only)
  async getEmailQueueStatus() {
    const response = await api.get('/api/v1/notifications/email/queue/status');
    return response.data.data;
  },

  // Process email queue (admin only)
  async processEmailQueue() {
    const response = await api.post('/api/v1/notifications/email/queue/process');
    return response.data.data;
  },

  // Retry failed emails (admin only)
  async retryFailedEmails() {
    const response = await api.post('/api/v1/notifications/email/queue/retry');
    return response.data.data;
  },

  // Get email template preview (admin only)
  async getEmailTemplate(template, data = {}) {
    const params = new URLSearchParams();
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        params.append(key, value);
      });
    }

    const response = await api.get(`/api/v1/notifications/email/templates/${template}?${params}`);
    return response.data.data;
  }
};

// Push notification API methods
export const pushNotificationService = {
  // Subscribe to push notifications
  async subscribe(subscription) {
    const response = await api.post('/api/v1/notifications/push/subscribe', { subscription });
    return response.data.data;
  },

  // Unsubscribe from push notifications
  async unsubscribe() {
    const response = await api.post('/api/v1/notifications/push/unsubscribe');
    return response.data.data;
  },

  // Get user's push subscriptions
  async getSubscriptions() {
    const response = await api.get('/api/v1/notifications/push/subscriptions');
    return response.data.data;
  },

  // Get subscription statistics (admin only)
  async getSubscriptionStats() {
    const response = await api.get('/api/v1/notifications/push/stats');
    return response.data.data;
  },

  // Get VAPID keys
  async getVAPIDKeys() {
    const response = await api.get('/api/v1/notifications/push/vapid-keys');
    return response.data.data;
  },

  // Send push notification
  async sendPushNotification(userId, title, message, data = {}, options = {}) {
    const response = await api.post('/api/v1/notifications/push/send', {
      userId,
      title,
      message,
      data,
      options
    });
    return response.data.data;
  },

  // Send bulk push notifications (admin only)
  async sendBulkPushNotifications(notifications) {
    const response = await api.post('/api/v1/notifications/push/bulk', { notifications });
    return response.data.data;
  },

  // Test push notification
  async testPushNotification(userId, title, message) {
    const response = await api.post('/api/v1/notifications/push/test', {
      userId,
      title,
      message
    });
    return response.data.data;
  },

  // Cleanup inactive subscriptions (admin only)
  async cleanupInactiveSubscriptions(daysOld = 30) {
    const response = await api.post('/api/v1/notifications/push/cleanup', { daysOld });
    return response.data.data;
  }
};

// Activity feed API methods
export const activityFeedService = {
  // Get user activity feed
  async getUserActivityFeed(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.type) params.append('type', filters.type);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await api.get(`/api/v1/activity/feed?${params}`);
    return response.data.data;
  },

  // Get followed users feed
  async getFollowedUsersFeed(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await api.get(`/api/v1/activity/followed-users?${params}`);
    return response.data.data;
  },

  // Get bookmarked content
  async getBookmarkedContent(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.type) params.append('type', filters.type);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await api.get(`/api/v1/activity/bookmarks?${params}`);
    return response.data.data;
  },

  // Get trending content
  async getTrendingContent(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.type) params.append('type', filters.type);
    if (filters.timeRange) params.append('timeRange', filters.timeRange);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await api.get(`/api/v1/activity/trending?${params}`);
    return response.data.data;
  },

  // Get personalized feed
  async getPersonalizedFeed(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await api.get(`/api/v1/activity/personalized?${params}`);
    return response.data.data;
  },

  // Get activity statistics
  async getActivityStats() {
    const response = await api.get('/api/v1/activity/stats');
    return response.data.data;
  },

  // Get activity feed by type
  async getActivityFeedByType(type, filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await api.get(`/api/v1/activity/type/${type}?${params}`);
    return response.data.data;
  },

  // Search activities
  async searchActivities(query, filters = {}) {
    const params = new URLSearchParams();
    
    if (query) params.append('q', query);
    if (filters.type) params.append('type', filters.type);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await api.get(`/api/v1/activity/search?${params}`);
    return response.data.data;
  },

  // Get trending topics
  async getTrendingTopics() {
    const response = await api.get('/api/v1/activity/trending-topics');
    return response.data.data;
  },

  // Get engagement metrics
  async getEngagementMetrics() {
    const response = await api.get('/api/v1/activity/engagement-metrics');
    return response.data.data;
  }
};

// Following system API methods
export const followingService = {
  // Follow user
  async followUser(userId) {
    const response = await api.post(`/api/v1/follow/${userId}`);
    return response.data.data;
  },

  // Unfollow user
  async unfollowUser(userId) {
    const response = await api.delete(`/api/v1/follow/${userId}`);
    return response.data.data;
  },

  // Get user's followers
  async getFollowers(userId, filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await api.get(`/api/v1/follow/${userId}/followers?${params}`);
    return response.data.data;
  },

  // Get user's following
  async getFollowing(userId, filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await api.get(`/api/v1/follow/${userId}/following?${params}`);
    return response.data.data;
  },

  // Check if following user
  async isFollowingUser(userId) {
    const response = await api.get(`/api/v1/follow/${userId}/check`);
    return response.data.data;
  },

  // Get follow statistics
  async getFollowStats() {
    const response = await api.get('/api/v1/follow/stats');
    return response.data.data;
  }
};

// Bookmarks API methods
export const bookmarkService = {
  // Add bookmark
  async addBookmark(entityType, entityId, title = '', description = '') {
    const response = await api.post('/api/v1/bookmarks', {
      entityType,
      entityId,
      title,
      description
    });
    return response.data.data;
  },

  // Remove bookmark
  async removeBookmark(entityType, entityId) {
    const response = await api.delete(`/api/v1/bookmarks/${entityType}/${entityId}`);
    return response.data.data;
  },

  // Get user's bookmarks
  async getBookmarks(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.type) params.append('type', filters.type);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await api.get(`/api/v1/bookmarks?${params}`);
    return response.data.data;
  },

  // Check if bookmarked
  async isBookmarked(entityType, entityId) {
    const response = await api.get(`/api/v1/bookmarks/${entityType}/${entityId}/check`);
    return response.data.data;
  },

  // Get bookmark statistics
  async getBookmarkStats() {
    const response = await api.get('/api/v1/bookmarks/stats');
    return response.data.data;
  }
};

export default api;
