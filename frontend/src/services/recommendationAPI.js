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

// Recommendation API methods
export const recommendationService = {
  // Get mentor recommendations
  async getMentorRecommendations(limit = 10, filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.skills && filters.skills.length > 0) {
        params.append('skills', filters.skills.join(','));
      }
      if (filters.experienceLevel) params.append('experienceLevel', filters.experienceLevel);
      if (filters.availability !== undefined) params.append('availability', filters.availability);
      if (filters.rating) params.append('rating', filters.rating);
      if (filters.timeRange) params.append('timeRange', filters.timeRange);

      const response = await api.get(`/api/v1/recommendations/mentors?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting mentor recommendations:', error);
      throw error;
    }
  },

  // Get session recommendations
  async getSessionRecommendations(limit = 10, filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.skills && filters.skills.length > 0) {
        params.append('skills', filters.skills.join(','));
      }
      if (filters.experienceLevel) params.append('experienceLevel', filters.experienceLevel);
      if (filters.availability !== undefined) params.append('availability', filters.availability);
      if (filters.rating) params.append('rating', filters.rating);
      if (filters.timeRange) params.append('timeRange', filters.timeRange);

      const response = await api.get(`/api/v1/recommendations/sessions?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting session recommendations:', error);
      throw error;
    }
  },

  // Get post recommendations
  async getPostRecommendations(limit = 10, filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.skills && filters.skills.length > 0) {
        params.append('skills', filters.skills.join(','));
      }
      if (filters.categories && filters.categories.length > 0) {
        params.append('categories', filters.categories.join(','));
      }
      if (filters.timeRange) params.append('timeRange', filters.timeRange);
      if (filters.minEngagement) params.append('minEngagement', filters.minEngagement);

      const response = await api.get(`/api/v1/recommendations/posts?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting post recommendations:', error);
      throw error;
    }
  },

  // Get content recommendations
  async getContentRecommendations(limit = 10, filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.categories && filters.categories.length > 0) {
        params.append('categories', filters.categories.join(','));
      }
      if (filters.timeRange) params.append('timeRange', filters.timeRange);
      if (filters.minQuality) params.append('minQuality', filters.minQuality);

      const response = await api.get(`/api/v1/recommendations/content?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting content recommendations:', error);
      throw error;
    }
  },

  // Get hybrid recommendations
  async getHybridRecommendations(limit = 10, filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.type) params.append('type', filters.type);
      if (filters.skills && filters.skills.length > 0) {
        params.append('skills', filters.skills.join(','));
      }
      if (filters.categories && filters.categories.length > 0) {
        params.append('categories', filters.categories.join(','));
      }
      if (filters.timeRange) params.append('timeRange', filters.timeRange);
      if (filters.minQuality) params.append('minQuality', filters.minQuality);
      if (filters.minEngagement) params.append('minEngagement', filters.minEngagement);

      const response = await api.get(`/api/v1/recommendations/hybrid?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting hybrid recommendations:', error);
      throw error;
    }
  },

  // Get trending recommendations
  async getTrendingRecommendations(limit = 10, filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.categories && filters.categories.length > 0) {
        params.append('categories', filters.categories.join(','));
      }
      if (filters.timeRange) params.append('timeRange', filters.timeRange);

      const response = await api.get(`/api/v1/recommendations/trending?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting trending recommendations:', error);
      throw error;
    }
  },

  // Get personalized recommendations
  async getPersonalizedRecommendations(limit = 10, filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.type) params.append('type', filters.type);
      if (filters.skills && filters.skills.length > 0) {
        params.append('skills', filters.skills.join(','));
      }
      if (filters.categories && filters.categories.length > 0) {
        params.append('categories', filters.categories.join(','));
      }
      if (filters.timeRange) params.append('timeRange', filters.timeRange);
      if (filters.minQuality) params.append('minQuality', filters.minQuality);
      if (filters.minEngagement) params.append('minEngagement', filters.minEngagement);

      const response = await api.get(`/api/v1/recommendations/personalized?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      throw error;
    }
  },

  // Mark recommendation as clicked
  async markRecommendationClicked(recommendationId) {
    try {
      const response = await api.post(`/api/v1/recommendations/${recommendationId}/click`);
      return response.data.data;
    } catch (error) {
      console.error('Error marking recommendation as clicked:', error);
      throw error;
    }
  },

  // Dismiss recommendation
  async dismissRecommendation(recommendationId) {
    try {
      const response = await api.post(`/api/v1/recommendations/${recommendationId}/dismiss`);
      return response.data.data;
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
      throw error;
    }
  },

  // Get recommendation feedback
  async getRecommendationFeedback(recommendationId) {
    try {
      const response = await api.get(`/api/v1/recommendations/${recommendationId}/feedback`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting recommendation feedback:', error);
      throw error;
    }
  },

  // Add recommendation feedback
  async addFeedback(recommendationId, feedbackType, rating = null, comment = '') {
    try {
      const response = await api.post(`/api/v1/recommendations/${recommendationId}/feedback`, {
        feedbackType,
        rating,
        comment
      });
      return response.data.data;
    } catch (error) {
      console.error('Error adding recommendation feedback:', error);
      throw error;
    }
  },

  // Get user recommendation preferences
  async getUserPreferences() {
    try {
      const response = await api.get('/api/v1/recommendations/preferences');
      return response.data.data;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw error;
    }
  },

  // Update user recommendation preferences
  async updateUserPreferences(preferences) {
    try {
      const response = await api.put('/api/v1/recommendations/preferences', preferences);
      return response.data.data;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  },

  // Get recommendation history
  async getRecommendationHistory(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.type) params.append('type', filters.type);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.status !== undefined) params.append('status', filters.status);

      const response = await api.get(`/api/v1/recommendations/history?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting recommendation history:', error);
      throw error;
    }
  },

  // Get recommendation statistics (admin only)
  async getRecommendationStats() {
    try {
      const response = await api.get('/api/v1/recommendations/stats');
      return response.data.data;
    } catch (error) {
      console.error('Error getting recommendation stats:', error);
      throw error;
    }
  },

  // Get cache statistics (admin only)
  async getCacheStats() {
    try {
      const response = await api.get('/api/v1/recommendations/cache/stats');
      return response.data.data;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      throw error;
    }
  },

  // Clear cache (admin only)
  async clearCache() {
    try {
      const response = await api.post('/api/v1/recommendations/cache/clear');
      return response.data;
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  },

  // Refresh recommendation cache (admin only)
  async refreshCache() {
    try {
      const response = await api.post('/api/v1/recommendations/cache/refresh');
      return response.data.data;
    } catch (error) {
      console.error('Error refreshing cache:', error);
      throw error;
    }
  },

  // Get recommendation algorithms (admin only)
  async getAlgorithms() {
    try {
      const response = await api.get('/api/v1/recommendations/algorithms');
      return response.data.data;
    } catch (error) {
      console.error('Error getting algorithms:', error);
      throw error;
    }
  },

  // Get recommendation analytics (admin only)
  async getAnalytics(timeRange = '30d') {
    try {
      const response = await api.get(`/api/v1/recommendations/analytics?timeRange=${timeRange}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  },

  // Get recommendation performance metrics (admin only)
  async getPerformance(timeRange = '30d') {
    try {
      const response = await api.get(`/api/v1/recommendations/performance?timeRange=${timeRange}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw error;
    }
  },

  // Get user similarity scores (admin only)
  async getUserSimilarity(userId1, userId2) {
    try {
      const response = await api.get(`/api/v1/recommendations/similarity/${userId1}/${userId2}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting user similarity:', error);
      throw error;
    }
  },

  // Get content similarity scores (admin only)
  async getContentSimilarity(type1, id1, type2, id2) {
    try {
      const response = await api.get(`/api/v1/recommendations/similarity/${type1}/${id1}/${type2}/${id2}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting content similarity:', error);
      throw error;
    }
  },

  // Get top mentors (admin only)
  async getTopMentors(timeRange = '30d', limit = 50) {
    try {
      const params = new URLSearchParams();
      if (timeRange) params.append('timeRange', timeRange);
      if (limit) params.append('limit', limit);

      const response = await api.get(`/api/v1/recommendations/top-mentors?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting top mentors:', error);
      throw error;
    }
  },

  // Get top posts (admin only)
  async getTopPosts(timeRange = '30d', limit = 50) {
    try {
      const params = new URLSearchParams();
      if (timeRange) params.append('timeRange', timeRange);
      if (limit) params.append('limit', limit);

      const response = await api.get(`/api/v1/recommendations/top-posts?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting top posts:', error);
      throw error;
    }
  },

  // Get trending content (admin only)
  async getTrendingContent(timeRange = '30d', limit = 50) {
    try {
      const params = new URLSearchParams();
      if (timeRange) params.append('timeRange', timeRange);
      if (limit) params.append('limit', limit);

      const response = await api.get(`/api/v1/recommendations/trending-content?${params}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting trending content:', error);
      throw error;
    }
  }
};

// Utility functions for recommendations
export const recommendationUtils = {
  // Format recommendation score
  formatRecommendationScore: (score) => {
    return Math.round(score * 100);
  },

  // Format engagement metrics
  formatEngagementMetrics: (metrics) => {
    return {
      total: metrics.total || 0,
      clicked: metrics.clicked || 0,
      dismissed: metrics.dismissed || 0,
      clickRate: metrics.total > 0 ? (metrics.clicked / metrics.total) * 100 : 0,
      dismissRate: metrics.total > 0 ? (metrics.dismissed / metrics.total) * 100 : 0,
      averageRating: metrics.averageRating || 0
    };
  },

  // Calculate recommendation confidence
  calculateConfidence: (score, algorithmType) => {
    const algorithmWeights = {
      'COLLABORATIVE_FILTERING': 0.8,
      'CONTENT_BASED': 0.7,
      'SKILL_BASED': 0.9,
      'TRENDING_BASED': 0.6,
      'HYBRID_RECOMMENDATION': 0.9,
      'POPULARITY_BASED': 0.5
    };

    const baseConfidence = score || 0;
    const algorithmWeight = algorithmWeights[algorithmType] || 0.5;
    
    return Math.min(baseConfidence * algorithmWeight * 100, 100);
  },

  // Get recommendation type label
  getRecommendationTypeLabel: (type) => {
    const labels = {
      'MENTOR': 'Mentor',
      'SESSION': 'Session',
      'POST': 'Post',
      'CONTENT': 'Content',
      'TRENDING': 'Trending',
      'PERSONALIZED': 'Personalized',
      'HYBRID': 'Hybrid'
    };
    return labels[type] || type;
  },

  // Get algorithm label
  getAlgorithmLabel: (algorithm) => {
    const labels = {
      'COLLABORATIVE_FILTERING': 'Collaborative Filtering',
      'CONTENT_BASED': 'Content-Based',
      'SKILL_BASED': 'Skill-Based',
      'TRENDING_BASED': 'Trending-Based',
      'HYBRID_RECOMMENDATION': 'Hybrid',
      'POPULARITY_BASED': 'Popularity-Based'
    };
    return labels[algorithm] || algorithm;
  },

  // Format recommendation metadata
  formatMetadata: (metadata) => {
    return {
      skills: metadata.skills || [],
      categories: metadata.categories || [],
      timeRange: metadata.timeRange || '30d',
      minQuality: metadata.minQuality || 0,
      minEngagement: metadata.minEngagement || 0,
      experienceLevel: metadata.experienceLevel || '',
      availability: metadata.availability || '',
      rating: metadata.rating || 0,
      priceRange: metadata.priceRange || { min: 0, max: 1000 }
    };
  },

  // Debounce function for recommendation requests
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

  // Track recommendation interaction
  trackInteraction: (recommendationId, interactionType, metadata = {}) => {
    const interaction = {
      recommendationId,
      type: interactionType,
      timestamp: new Date(),
      metadata
    };

    // Store in localStorage for analytics
    const interactions = JSON.parse(localStorage.getItem('recommendation_interactions') || '[]');
    interactions.push(interaction);
    localStorage.setItem('recommendation_interactions', JSON.stringify(interactions));

    // Track in analytics
    if (window.gtag) {
      window.gtag('event', 'recommendation_interaction', {
        event_category: 'recommendations',
        event_label: interactionType,
        recommendation_id: recommendationId,
        metadata
      });
    }
  },

  // Get interaction history
  getInteractionHistory: () => {
    try {
      const interactions = JSON.parse(localStorage.getItem('recommendation_interactions') || '[]');
      return interactions;
    } catch (error) {
      console.error('Error getting interaction history:', error);
      return [];
    }
  },

  // Clear interaction history
  clearInteractionHistory: () => {
    localStorage.removeItem('recommendation_interactions');
  },

  // Get recommendation performance metrics
  getPerformanceMetrics: () => {
    const interactions = recommendationUtils.getInteractionHistory();
    
    const metrics = {
      total: interactions.length,
      clicked: interactions.filter(i => i.type === 'click').length,
      dismissed: interactions.filter(i => i.type === 'dismiss').length,
      liked: interactions.filter(i => i.type === 'like').length,
      shared: interactions.filter(i => i.type === 'share').length,
      bookmarked: interactions.filter(i => i.type === 'bookmark').length,
      averageRating: interactions
        .filter(i => i.metadata?.rating)
        .reduce((sum, i) => sum + i.metadata.rating, 0) / 
        interactions.filter(i => i.metadata?.rating).length || 1
    };

    return recommendationUtils.formatEngagementMetrics(metrics);
  },

  // Generate recommendation insights
  generateInsights: (recommendations) => {
    const insights = [];
    
    // Most popular recommendation type
    const typeCounts = recommendations.reduce((acc, rec) => {
      acc[rec.type] = (acc[rec.type] || 0) + 1;
      return acc;
    }, {});
    
    const mostPopularType = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'MENTOR';

    insights.push({
      type: 'most_popular_type',
      title: 'Most Popular Type',
      description: `${mostPopularType} recommendations get the most engagement`,
      value: typeCounts[mostPopularType] || 0
    });

    // Average recommendation score
    const avgScore = recommendations.reduce((sum, rec) => sum + (rec.recommendationScore || 0), 0) / recommendations.length;
    insights.push({
      type: 'average_score',
      title: 'Average Match Score',
      description: `Average match score across all recommendations`,
      value: Math.round(avgScore * 100)
    });

    // Top performing algorithm
    const algorithmCounts = recommendations.reduce((acc, rec) => {
      acc[rec.algorithm] = (acc[rec.algorithm] || 0) + 1;
      return acc;
    }, {});
    
    const topAlgorithm = Object.entries(algorithmCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'COLLABORATIVE_FILTERING';

    insights.push({
      type: 'top_algorithm',
      title: 'Top Performing Algorithm',
      description: `${recommendationUtils.getAlgorithmLabel(topAlgorithm)} performs best`,
      value: algorithmCounts[topAlgorithm] || 0
    });

    return insights;
  },

  // Validate recommendation filters
  validateFilters: (filters) => {
    const validFilters = {
      skills: Array.isArray(filters.skills),
      categories: Array.isArray(filters.categories),
      timeRange: ['7d', '30d', '90d', '1y'].includes(filters.timeRange),
      minQuality: filters.minQuality >= 0 && filters.minQuality <= 1,
      minEngagement: filters.minEngagement >= 0,
      experienceLevel: ['', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'].includes(filters.experienceLevel),
      availability: filters.availability === undefined || typeof filters.availability === 'boolean',
      rating: filters.rating >= 0 && filters.rating <= 5,
      priceRange: typeof filters.priceRange === 'object' && 
        typeof filters.priceRange.min === 'number' && 
        typeof filters.priceRange.max === 'number' &&
        filters.priceRange.min >= 0 && 
        filters.priceRange.max <= 10000
    };

    return Object.entries(validFilters).every(([key, isValid]) => isValid);
  },

  // Generate filter summary
  getFilterSummary: (filters) => {
    const summary = [];
    
    if (filters.skills && filters.skills.length > 0) {
      summary.push(`${filters.skills.length} skills`);
    }
    
    if (filters.categories && filters.categories.length > 0) {
      summary.push(`${filters.categories.length} categories`);
    }
    
    if (filters.experienceLevel) {
      summary.push(`Level: ${filters.experienceLevel}`);
    }
    
    if (filters.availability !== undefined) {
      summary.push(filters.availability ? 'Available' : 'Not Available');
    }
    
    if (filters.rating > 0) {
      summary.push(`${filters.rating}+ stars`);
    }
    
    if (filters.priceRange.min > 0 || filters.priceRange.max < 10000) {
      summary.push(`$${filters.priceRange.min} - $${filters.priceRange.max}`);
    }
    
    if (filters.timeRange !== '30d') {
      summary.push(`Last ${filters.timeRange}`);
    }
    
    if (filters.minEngagement > 0) {
      summary.push(`${filters.minEngagement}+ engagement`);
    }
    
    if (filters.minQuality > 0) {
      summary.push `${Math.round(filters.minQuality * 100)}% quality`);
    }

    return summary.join(' • ');
  }
};

export default recommendationService;
