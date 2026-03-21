import axios from 'axios';
import { toast } from 'react-hot-toast';

// Centralized axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000',
  timeout: 8000, // 8 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add JWT token
api.interceptors.request.use(
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

// Response interceptor - Handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }

    // Handle 429 Rate Limit
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const message = retryAfter 
        ? `Rate limit exceeded. Try again in ${retryAfter} seconds.`
        : 'Rate limit exceeded. Please try again later.';
      toast.error(message);
      return Promise.reject(new Error(message));
    }

    // Handle 500 Server Error
    if (error.response?.status >= 500) {
      const message = 'Server error. Please try again later.';
      toast.error(message);
      return Promise.reject(new Error(message));
    }

    // Handle Network Error
    if (!error.response) {
      const message = 'Network error. Please check your connection.';
      toast.error(message);
      return Promise.reject(new Error(message));
    }

    // Return the original error
    return Promise.reject(error);
  }
);

// Retry logic for failed requests
const retryRequest = async (fn, retries = 2) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && shouldRetry(error)) {
      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, 3 - retries) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(fn, retries - 1);
    }
    throw error;
  }
};

// Determine if request should be retried
const shouldRetry = (error) => {
  if (!error.response) return true; // Network errors
  const status = error.response.status;
  return status === 408 || status === 429 || status >= 500;
};

// Normalize API responses
const normalizeResponse = (response) => {
  return {
    success: true,
    data: response.data,
    message: response.data?.message || 'Success',
    count: response.data?.count || (Array.isArray(response.data) ? response.data.length : 1),
    timestamp: new Date().toISOString()
  };
};

// Error handling helper
const handleError = (error, defaultMessage = 'An error occurred') => {
  console.error('API Error:', error);
  const message = error.message || defaultMessage;
  toast.error(message);
  return {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };
};

// ==================== SKILL GAP API ====================

export const skillGapApi = {
  // Analyze user skill gaps
  analyzeSkillGaps: async (userId, options = {}) => {
    try {
      const response = await retryRequest(() => 
        api.post(`/api/v1/skill-gaps/${userId}/analyze`, options)
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleError(error, 'Failed to analyze skill gaps');
    }
  },

  // Get user skill gaps
  getSkillGaps: async (userId, options = {}) => {
    try {
      const params = new URLSearchParams(options);
      const response = await retryRequest(() => 
        api.get(`/api/v1/skill-gaps/${userId}?${params}`)
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleError(error, 'Failed to get skill gaps');
    }
  },

  // Update skill gap progress
  updateGapProgress: async (userId, gapId, progressData) => {
    try {
      const response = await retryRequest(() => 
        api.put(`/api/v1/skill-gaps/${userId}/${gapId}/progress`, progressData)
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleError(error, 'Failed to update gap progress');
    }
  },

  // Close skill gap
  closeGap: async (userId, gapId, closureData) => {
    try {
      const response = await retryRequest(() => 
        api.post(`/api/v1/skill-gaps/${userId}/${gapId}/close`, closureData)
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleError(error, 'Failed to close skill gap');
    }
  },

  // Get skill gap analytics
  getAnalytics: async (userId, timeRange = '30d') => {
    try {
      const response = await retryRequest(() => 
        api.get(`/api/v1/skill-gaps/${userId}/analytics?timeRange=${timeRange}`)
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleError(error, 'Failed to get skill gap analytics');
    }
  },

  // Refresh skill gaps (trigger re-analysis)
  refreshSkillGaps: async (userId, options = {}) => {
    try {
      const response = await skillGapApi.analyzeSkillGaps(userId, options);
      return normalizeResponse(response);
    } catch (error) {
      return handleError(error, 'Failed to refresh skill gaps');
    }
  },

  // Get user skills
  getUserSkills: async (userId) => {
    try {
      const response = await retryRequest(() => 
        api.get(`/api/v1/users/${userId}/skills`)
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleError(error, 'Failed to get user skills');
    }
  },

  // Update user skill
  updateUserSkill: async (userId, skillId, skillData) => {
    try {
      const response = await retryRequest(() => 
        api.put(`/api/v1/users/${userId}/skills/${skillId}`, skillData)
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleError(error, 'Failed to update user skill');
    }
  }
};

// ==================== CONTENT RECOMMENDATION API ====================

export const contentRecommendationApi = {
  // Generate content recommendations
  generateRecommendations: async (userId, options = {}) => {
    try {
      const response = await retryRequest(() => 
        api.post(`/api/v1/recommendations/content/${userId}/generate`, options)
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleError(error, 'Failed to generate content recommendations');
    }
  },

  // Get user recommendations
  getRecommendations: async (userId, options = {}) => {
    try {
      const params = new URLSearchParams(options);
      const response = await retryRequest(() => 
        api.get(`/api/v1/recommendations/content/${userId}?${params}`)
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleError(error, 'Failed to get content recommendations');
    }
  },

  // Update recommendation status
  updateRecommendationStatus: async (userId, recommendationId, status, metadata = {}) => {
    try {
      const response = await retryRequest(() => 
        api.put(`/api/v1/recommendations/content/${userId}/${recommendationId}/status`, {
          status,
          ...metadata
        })
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleError(error, 'Failed to update recommendation status');
    }
  },

  // Get recommendation analytics
  getAnalytics: async (userId, timeRange = '30d') => {
    try {
      const response = await retryRequest(() => 
        api.get(`/api/v1/recommendations/content/${userId}/analytics?timeRange=${timeRange}`)
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleError(error, 'Failed to get recommendation analytics');
    }
  },

  // Refresh recommendations
  refreshRecommendations: async (userId, options = {}) => {
    try {
      const response = await contentRecommendationApi.generateRecommendations(userId, options);
      return normalizeResponse(response);
    } catch (error) {
      return handleError(error, 'Failed to refresh recommendations');
    }
  },

  // Mark recommendation as viewed
  markAsViewed: async (userId, recommendationId) => {
    try {
      const response = await contentRecommendationApi.updateRecommendationStatus(
        userId, 
        recommendationId, 
        'VIEWED'
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleError(error, 'Failed to mark recommendation as viewed');
    }
  },

  // Mark recommendation as completed
  markAsCompleted: async (userId, recommendationId, rating, feedback) => {
    try {
      const response = await contentRecommendationApi.updateRecommendationStatus(
        userId, 
        recommendationId, 
        'COMPLETED',
        { rating, feedback }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleError(error, 'Failed to mark recommendation as completed');
    }
  },

  // Dismiss recommendation
  dismissRecommendation: async (userId, recommendationId, feedback) => {
    try {
      const response = await contentRecommendationApi.updateRecommendationStatus(
        userId, 
        recommendationId, 
        'DISMISSED',
        { feedback }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleError(error, 'Failed to dismiss recommendation');
    }
  },

  // Rate recommendation
  rateRecommendation: async (userId, recommendationId, rating) => {
    try {
      const response = await contentRecommendationApi.updateRecommendationStatus(
        userId, 
        recommendationId, 
        'COMPLETED',
        { rating }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleError(error, 'Failed to rate recommendation');
    }
  },

  // Get learning path suggestions
  getLearningPathSuggestions: async (userId, options = {}) => {
    try {
      const response = await retryRequest(() => 
        api.post(`/api/v1/recommendations/learning-path/${userId}/suggest`, options)
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleError(error, 'Failed to get learning path suggestions');
    }
  }
};

// ==================== HEALTH CHECK API ====================

export const healthApi = {
  // Get skill gap service health
  getSkillGapServiceHealth: async () => {
    try {
      const response = await api.get('/api/v1/skill-gaps/health');
      return normalizeResponse(response);
    } catch (error) {
      return handleError(error, 'Failed to get skill gap service health');
    }
  },

  // Get content recommendation service health
  getContentRecommendationServiceHealth: async () => {
    try {
      const response = await api.get('/api/v1/recommendations/content/health');
      return normalizeResponse(response);
    } catch (error) {
      return handleError(error, 'Failed to get content recommendation service health');
    }
  },

  // Get overall system health
  getSystemHealth: async () => {
    try {
      const response = await api.get('/api/v1/health');
      return normalizeResponse(response);
    } catch (error) {
      return handleError(error, 'Failed to get system health');
    }
  }
};

// ==================== UTILITY FUNCTIONS ====================

// Batch API calls for better performance
export const batchApiCalls = async (calls) => {
  try {
    const responses = await Promise.allSettled(
      calls.map(call => retryRequest(() => call()))
    );
    
    return responses.map((response, index) => {
      if (response.status === 'fulfilled') {
        return normalizeResponse(response.value);
      } else {
        return handleError(
          response.reason, 
          `Failed to execute API call ${index + 1}`
        );
      }
    });
  } catch (error) {
    return handleError(error, 'Failed to execute batch API calls');
  }
};

// Cache API responses for better performance
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const cachedApiCall = async (key, apiCall) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await apiCall();
    cache.set(key, {
      data: response,
      timestamp: Date.now()
    });
    return response;
  } catch (error) {
    cache.delete(key);
    throw error;
  }
};

// Clear cache
export const clearCache = (pattern = null) => {
  if (pattern) {
    for (const [key] of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
};

export default {
  skillGapApi,
  contentRecommendationApi,
  healthApi,
  batchApiCalls,
  cachedApiCall,
  clearCache
};
