import axios from 'axios';
import { ENV } from '../utils/env';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: ENV.API_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Token expired, try to refresh
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
            refreshToken
          });

          const { accessToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);

          // Retry original request with new token
          originalRequest._retry = true;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Utility function to handle API errors
const handleApiError = (error, defaultMessage = 'An error occurred') => {
  if (error.response) {
    // Server responded with error status
    const message = error.response.data?.message || defaultMessage;
    const status = error.response.status;
    
    if (status === 401) {
      // Unauthorized, clear tokens and redirect to login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return new Error('Authentication required');
    }
    
    if (status === 403) {
      return new Error('Access denied');
    }
    
    if (status === 429) {
      return new Error('Too many requests. Please try again later.');
    }
    
    if (status >= 500) {
      return new Error('Server error. Please try again later.');
    }
    
    return new Error(message);
  } else if (error.request) {
    // Request was made but no response received
    return new Error('Network error. Please check your connection.');
  } else {
    // Something else happened
    return new Error(defaultMessage);
  }
};

// Analytics Event Tracking
export const trackAnalyticsEvent = async (eventType, eventData = {}, metadata = {}) => {
  try {
    const response = await apiClient.post('/api/v1/ai-analytics/events', {
      eventType,
      eventData,
      ...metadata
    });
    
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to track analytics event');
  }
};

// Get User Behavior Analysis
export const getUserBehaviorAnalysis = async (userId, behaviorType = null) => {
  try {
    const params = new URLSearchParams();
    if (behaviorType) {
      params.append('behaviorType', behaviorType);
    }
    
    const response = await apiClient.get(`/api/v1/ai-analytics/behavior/${userId}?${params}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to get user behavior analysis');
  }
};

// Content Recommendations
export const getContentRecommendations = async (userId, options = {}) => {
  try {
    const {
      contentType = 'POST',
      limit = 10,
      type = 'PERSONALIZED'
    } = options;

    const params = new URLSearchParams({
      contentType,
      limit: limit.toString(),
      type
    });

    const response = await apiClient.get(`/api/v1/ai-analytics/recommendations/content?${params}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to get content recommendations');
  }
};

// Mentor Matching
export const getMentorMatches = async (menteeId, options = {}) => {
  try {
    const {
      skills = null,
      experience = null,
      limit = 10
    } = options;

    const params = new URLSearchParams();
    if (skills) {
      params.append('skills', skills);
    }
    if (experience) {
      params.append('experience', experience);
    }
    params.append('limit', limit.toString());

    const response = await apiClient.get(`/api/v1/ai-analytics/recommendations/mentors?${params}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to get mentor matches');
  }
};

// Learning Path Generation
export const generateLearningPath = async (userId, options = {}) => {
  try {
    const {
      pathType = 'SKILL_BASED',
      targetSkills = null,
      difficulty = 'INTERMEDIATE',
      estimatedDuration = 40
    } = options;

    const response = await apiClient.post('/api/v1/ai-analytics/learning-paths', {
      userId,
      pathType,
      targetSkills,
      difficulty,
      estimatedDuration
    });
    
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to generate learning path');
  }
};

// Get Learning Paths
export const getLearningPaths = async (userId, options = {}) => {
  try {
    const {
      pathType = null,
      isActive = true
    } = options;

    const params = new URLSearchParams();
    if (pathType) {
      params.append('pathType', pathType);
    }
    params.append('isActive', isActive.toString());

    const response = await apiClient.get(`/api/v1/ai-analytics/learning-paths/${userId}?${params}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to get learning paths');
  }
};

// Update Learning Path Progress
export const updateLearningPathProgress = async (pathId, progressData) => {
  try {
    const response = await apiClient.put(`/api/v1/ai-analytics/learning-paths/${pathId}/progress`, progressData);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to update learning path progress');
  }
};

// Predictions
export const getPredictions = async (userId, predictionType = 'ENGAGEMENT', options = {}) => {
  try {
    const {
      timeRange = '30d'
    } = options;

    const params = new URLSearchParams({
      predictionType,
      timeRange
    });

    const response = await apiClient.get(`/api/v1/ai-analytics/predictions?${params}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to get predictions');
  }
};

// Get User Predictions
export const getUserPredictions = async (userId, options = {}) => {
  try {
    const {
      predictionType = null,
      isActive = true
    } = options;

    const params = new URLSearchParams();
    if (predictionType) {
      params.append('predictionType', predictionType);
    }
    params.append('isActive', isActive.toString());

    const response = await apiClient.get(`/api/v1/ai-analytics/predictions/${userId}?${params}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to get user predictions');
  }
};

// Update Prediction Feedback
export const updatePredictionFeedback = async (predictionId, feedbackData) => {
  try {
    const response = await apiClient.put(`/api/v1/ai-analytics/predictions/${predictionId}/feedback`, feedbackData);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to update prediction feedback');
  }
};

// AI Insights
export const getInsights = async (insightType = 'USER_TREND', options = {}) => {
  try {
    const {
      timeRange = '30d',
      isRead = null
    } = options;

    const params = new URLSearchParams({
      insightType,
      timeRange,
      ...(isRead !== null && { isRead: isRead.toString() })
    });

    const response = await apiClient.get(`/api/v1/ai-analytics/insights?${params}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to get AI insights');
  }
};

// Get All Insights
export const getAllInsights = async (options = {}) => {
  try {
    const {
      insightType = null,
      isRead = null,
      isArchived = null,
      limit = 50
    } = options;

    const params = new URLSearchParams();
    if (insightType) {
      params.append('insightType', insightType);
    }
    if (isRead !== null) {
      params.append('isRead', isRead.toString());
    }
    if (isArchived !== null) {
      params.append('isArchived', isArchived.toString());
    }
    params.append('limit', limit.toString());

    const response = await apiClient.get(`/api/v1/ai-analytics/insights/list?${params}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to get insights');
  }
};

// Mark Insight as Read
export const markInsightAsRead = async (insightId) => {
  try {
    const response = await apiClient.put(`/api/v1/ai-analytics/insights/${insightId}/read`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to mark insight as read');
  }
};

// Archive Insight
export const archiveInsight = async (insightId) => {
  try {
    const response = await apiClient.put(`/api/v1/ai-analytics/insights/${insightId}/archive`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to archive insight');
  }
};

// AI Models Management (Admin only)
export const getAIModels = async () => {
  try {
    const response = await apiClient.get('/api/v1/ai-analytics/models');
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to get AI models');
  }
};

// Train Model (Admin only)
export const trainAIModel = async (modelId, trainingType = 'INCREMENTAL') => {
  try {
    const response = await apiClient.post(`/api/v1/ai-analytics/models/${modelId}/train`, {
      trainingType
    });
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to start model training');
  }
};

// Analytics Metrics
export const getMetrics = async (options = {}) => {
  try {
    const {
      timeRange = '30d',
      metricType = null
    } = options;

    const params = new URLSearchParams({
      timeRange,
      ...(metricType && { metricType })
    });

    const response = await apiClient.get(`/api/v1/ai-analytics/metrics?${params}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to get analytics metrics');
  }
};

// Get Platform Analytics
export const getPlatformAnalytics = async (options = {}) => {
  try {
    const {
      timeRange = '30d',
      metrics = null
    } = options;

    const params = new URLSearchParams({
      timeRange,
      ...(metrics && { metrics })
    });

    const response = await apiClient.get(`/api/v1/ai-analytics/platform?${params}`);
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to get platform analytics');
  }
};

// Export Analytics Data
export const exportAnalytics = async (format = 'json', options = {}) => {
  try {
    const {
      timeRange = '30d',
      metricType = null
    } = options;

    const params = new URLSearchParams({
      format,
      timeRange,
      ...(metricType && { metricType })
    });

    const response = await apiClient.get(`/api/v1/ai-analytics/export?${params}`, {
      responseType: format === 'csv' ? 'blob' : 'json'
    });

    if (format === 'csv') {
      // Create download link for CSV
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics_${timeRange}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return response.data;
    }

    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to export analytics data');
  }
};

// Clear Cache (Admin only)
export const clearAnalyticsCache = async () => {
  try {
    const response = await apiClient.post('/api/v1/ai-analytics/cache/clear');
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to clear analytics cache');
  }
};

// Get Cache Stats (Admin only)
export const getCacheStats = async () => {
  try {
    const response = await apiClient.get('/api/v1/ai-analytics/cache/stats');
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to get cache statistics');
  }
};

// Health Check
export const getHealthStatus = async () => {
  try {
    const response = await apiClient.get('/api/v1/ai-analytics/health');
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to get health status');
  }
};

// Update Recommendation Interaction
export const updateRecommendationInteraction = async (recommendationId, interactionType) => {
  try {
    const response = await apiClient.put(`/api/v1/ai-analytics/recommendations/${recommendationId}/interaction`, {
      interactionType
    });
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to update recommendation interaction');
  }
};

// Batch Operations
export const batchTrackEvents = async (events) => {
  try {
    const response = await apiClient.post('/api/v1/ai-analytics/events/batch', {
      events
    });
    return response.data.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to batch track events');
  }
};

// Real-time Analytics
export const subscribeToRealTimeUpdates = (userId, callbacks) => {
  const socket = require('./socket').default;
  
  if (!socket.connected) {
    socket.connect();
  }

  // Authenticate with user ID
  socket.emit('authenticate', { userId });

  // Subscribe to real-time events
  socket.on('analytics_event', callbacks.onAnalyticsEvent || (() => {}));
  socket.on('prediction_updated', callbacks.onPredictionUpdated || (() => {}));
  socket.on('insight_updated', callbacks.onInsightUpdated || (() => {}));
  socket.on('recommendation_updated', callbacks.onRecommendationUpdated || (() => {}));
  socket.on('metrics_updated', callbacks.onMetricsUpdated || (() => {}));

  return {
    unsubscribe: () => {
      socket.off('analytics_event');
      socket.off('prediction_updated');
      socket.off('insight_updated');
      socket.off('recommendation_updated');
      socket.off('metrics_updated');
    }
  };
};

// Utility functions for common analytics operations
export const analyticsUtils = {
  // Calculate engagement score
  calculateEngagementScore: (events) => {
    if (!events || events.length === 0) return 0;
    
    const engagementEvents = events.filter(event => 
      ['POST_LIKE', 'POST_COMMENT', 'POST_CREATE', 'MENTOR_SESSION_BOOKED'].includes(event.eventType)
    );
    
    return Math.min(engagementEvents.length / 30, 1); // Normalize to 0-1 scale
  },

  // Calculate retention risk
  calculateRetentionRisk: (userData) => {
    let riskScore = 0;
    
    if (userData.lastLoginAt) {
      const daysSinceLastLogin = Math.floor((Date.now() - new Date(userData.lastLoginAt)) / (1000 * 60 * 60 * 24));
      if (daysSinceLastLogin > 30) riskScore += 0.4;
      if (daysSinceLastLogin > 90) riskScore += 0.6;
    }
    
    if (userData.engagementScore < 0.3) riskScore += 0.3;
    
    return Math.min(riskScore, 1);
  },

  // Format prediction confidence
  formatConfidence: (confidence) => {
    return `${Math.round(confidence * 100)}%`;
  },

  // Format impact level
  formatImpactLevel: (impact) => {
    const levels = {
      'HIGH': { color: 'red', label: 'High Impact' },
      'MEDIUM': { color: 'yellow', label: 'Medium Impact' },
      'LOW': { color: 'green', label: 'Low Impact' }
    };
    
    return levels[impact] || { color: 'gray', label: 'Unknown Impact' };
  },

  // Generate time range options
  getTimeRangeOptions: () => [
    { value: '1d', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ],

  // Generate prediction type options
  getPredictionTypeOptions: () => [
    { value: 'ENGAGEMENT', label: 'Engagement Prediction' },
    { value: 'RETENTION', label: 'Retention Prediction' },
    { value: 'PERFORMANCE', label: 'Performance Prediction' },
    { value: 'CONTENT_SUCCESS', label: 'Content Success Prediction' }
  ],

  // Generate insight type options
  getInsightTypeOptions: () => [
    { value: 'USER_TREND', label: 'User Trends' },
    { value: 'PLATFORM_TREND', label: 'Platform Trends' },
    { value: 'CONTENT_TREND', label: 'Content Trends' },
    { value: 'PERFORMANCE_ANOMALY', label: 'Performance Anomalies' }
  ],

  // Generate recommendation type options
  getRecommendationTypeOptions: () => [
    { value: 'PERSONALIZED', label: 'Personalized' },
    { value: 'TRENDING', label: 'Trending' },
    { value: 'SIMILAR', label: 'Similar Content' },
    { value: 'COLLABORATIVE', label: 'Collaborative Filtering' }
  ]
};

// Export the API client for advanced usage
export default apiClient;
