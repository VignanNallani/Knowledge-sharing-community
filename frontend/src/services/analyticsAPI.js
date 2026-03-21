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

// Analytics API methods
export const analyticsService = {
  // Track analytics event
  async trackEvent(eventType, eventData = {}, sessionId = null) {
    try {
      const response = await api.post('/api/v1/analytics/events', {
        eventType,
        eventData,
        sessionId
      });
      return response.data.data;
    } catch (error) {
      console.error('Error tracking event:', error);
      throw error;
    }
  },

  // Track user activity
  async trackUserActivity(activityType, entityType = null, entityId = null, activityData = {}, duration = null) {
    try {
      const response = await api.post('/api/v1/analytics/activity', {
        activityType,
        entityType,
        entityId,
        activityData,
        duration
      });
      return response.data.data;
    } catch (error) {
      console.error('Error tracking user activity:', error);
      throw error;
    }
  },

  // Get session engagement metrics
  async getSessionEngagementMetrics(sessionId, filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/api/v1/analytics/sessions/${sessionId}/engagement?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting session engagement metrics:', error);
      throw error;
    }
  },

  // Get mentor performance metrics
  async getMentorPerformanceMetrics(mentorId, timeRange = '30d') {
    try {
      const params = new URLSearchParams({ timeRange });
      const response = await api.get(`/api/v1/analytics/mentors/${mentorId}/performance?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting mentor performance metrics:', error);
      throw error;
    }
  },

  // Get user analytics
  async getUserAnalytics(userId, filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.timeRange) params.append('timeRange', filters.timeRange);
      if (filters.eventTypes) params.append('eventTypes', filters.eventTypes.join(','));
      if (filters.groupBy) params.append('groupBy', filters.groupBy);

      const response = await api.get(`/api/v1/analytics/users/${userId}/analytics?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting user analytics:', error);
      throw error;
    }
  },

  // Get platform analytics (admin only)
  async getPlatformAnalytics(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.timeRange) params.append('timeRange', filters.timeRange);
      if (filters.metrics) params.append('metrics', filters.metrics.join(','));

      const response = await api.get(`/api/v1/analytics/platform?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting platform analytics:', error);
      throw error;
    }
  },

  // Get real-time metrics
  async getRealTimeMetrics() {
    try {
      const response = await api.get('/api/v1/analytics/realtime');
      return response.data.data;
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      throw error;
    }
  },

  // Get top mentors
  async getTopMentors(timeRange = '30d', limit = 10) {
    try {
      const params = new URLSearchParams({ timeRange, limit });
      const response = await api.get(`/api/v1/analytics/top-mentors?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting top mentors:', error);
      throw error;
    }
  },

  // Get top content
  async getTopContent(timeRange = '30d', limit = 10) {
    try {
      const params = new URLSearchParams({ timeRange, limit });
      const response = await api.get(`/api/v1/analytics/top-content?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting top content:', error);
      throw error;
    }
  },

  // Export analytics data
  async exportAnalytics(format = 'json', filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.timeRange) params.append('timeRange', filters.timeRange);
      if (filters.metrics) params.append('metrics', filters.metrics.join(','));
      params.append('format', format);

      const response = await api.get(`/api/v1/analytics/export?${params}`, {
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        // Create download link for CSV
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${filters.timeRange || '30d'}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        return response.data;
      } else {
        return response.data;
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
      throw error;
    }
  },

  // Get cache stats
  async getCacheStats() {
    try {
      const response = await api.get('/api/v1/analytics/cache/stats');
      return response.data.data;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      throw error;
    }
  },

  // Clear cache
  async clearCache() {
    try {
      const response = await api.post('/api/v1/analytics/cache/clear');
      return response.data;
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  },

  // Get analytics dashboard data
  async getDashboardData(timeRange = '30d') {
    try {
      const params = new URLSearchParams({ timeRange });
      const response = await api.get(`/api/v1/analytics/dashboard?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  },

  // Get engagement trends
  async getEngagementTrends(timeRange = '30d', groupBy = 'day') {
    try {
      const params = new URLSearchParams({ timeRange, groupBy });
      const response = await api.get(`/api/v1/analytics/trends/engagement?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting engagement trends:', error);
      throw error;
    }
  },

  // Get user journey analytics
  async getUserJourney(userId, timeRange = '30d') {
    try {
      const params = new URLSearchParams({ timeRange });
      const response = await api.get(`/api/v1/analytics/journey/${userId}?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting user journey:', error);
      throw error;
    }
  }
};

// Utility functions for analytics
export const analyticsUtils = {
  // Format large numbers
  formatNumber: (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  },

  // Format percentage
  formatPercentage: (value, total) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : '0';
  },

  // Format date for analytics
  formatDate: (date, format = 'short') => {
    const d = new Date(date);
    switch (format) {
      case 'short':
        return d.toLocaleDateString();
      case 'long':
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      case 'time':
        return d.toLocaleTimeString();
      case 'datetime':
        return d.toLocaleString();
      default:
        return d.toISOString();
    }
  },

  // Calculate growth rate
  calculateGrowthRate: (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  },

  // Generate color based on value
  getColorByValue: (value, type = 'positive') => {
    if (type === 'positive') {
      if (value > 80) return '#10B981'; // green
      if (value > 60) return '#3B82F6'; // blue
      if (value > 40) return '#F59E0B'; // yellow
      return '#EF4444'; // red
    } else {
      if (value > 80) return '#EF4444'; // red
      if (value > 60) return '#F59E0B'; // yellow
      if (value > 40) return '#3B82F6'; // blue
      return '#10B981'; // green
    }
  },

  // Generate trend indicator
  getTrendIndicator: (current, previous) => {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'stable';
  },

  // Debounce function for analytics tracking
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Track page view
  trackPageView: (page, metadata = {}) => {
    return analyticsService.trackEvent('PAGE_VIEW', {
      page,
      ...metadata
    });
  },

  // Track session start
  trackSessionStart: (sessionId, metadata = {}) => {
    return analyticsService.trackEvent('SESSION_START', {
      sessionId,
      ...metadata
    });
  },

  // Track session end
  trackSessionEnd: (sessionId, duration, metadata = {}) => {
    return analyticsService.trackEvent('SESSION_END', {
      sessionId,
      duration,
      ...metadata
    });
  },

  // Track user interaction
  trackUserInteraction: (action, target, metadata = {}) => {
    return analyticsService.trackUserActivity('USER_INTERACTION', target, null, {
      action,
      ...metadata
    });
  },

  // Track content engagement
  trackContentEngagement: (contentType, contentId, action, metadata = {}) => {
    return analyticsService.trackUserActivity('CONTENT_ENGAGEMENT', contentType, contentId, {
      action,
      ...metadata
    });
  }
};

export default analyticsService;
