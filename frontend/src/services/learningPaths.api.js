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

// Learning Paths API
export const learningPathsAPI = {
  // Create personalized learning path
  createPath: async (pathData) => {
    try {
      const response = await apiClient.post('/api/v1/learning-paths', pathData);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to create learning path');
    }
  },

  // Get learning paths for user
  getUserLearningPaths: async (userId, options = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (options.status) {
        params.append('status', options.status);
      }
      if (options.pathType) {
        params.append('pathType', options.pathType);
      }
      if (options.limit) {
        params.append('limit', options.limit.toString());
      }
      if (options.offset) {
        params.append('offset', options.offset.toString());
      }

      const response = await apiClient.get(`/api/v1/learning-paths/${userId}?${params}`);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to get learning paths');
    }
  },

  // Get learning path details
  getPathDetails: async (pathId, userId) => {
    try {
      const response = await apiClient.get(`/api/v1/learning-paths/details/${pathId}`, {
        params: { userId }
      });
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to get learning path details');
    }
  },

  // Update learning path progress
  updateProgress: async (pathId, stepId, progressData) => {
    try {
      const response = await apiClient.patch(`/api/v1/learning-paths/${pathId}/progress`, {
        stepId,
        ...progressData
      });
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to update progress');
    }
  },

  // Delete learning path
  deletePath: async (pathId) => {
    try {
      const response = await apiClient.delete(`/api/v1/learning-paths/${pathId}`);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to delete learning path');
    }
  },

  // Get recommendations for learning path
  getPathRecommendations: async (pathId) => {
    try {
      const response = await apiClient.get(`/api/v1/learning-paths/${pathId}/recommendations`);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to get recommendations');
    }
  },

  // Get all learning paths (admin)
  getAllLearningPaths: async (options = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (options.status) {
        params.append('status', options.status);
      }
      if (options.pathType) {
        params.append('pathType', options.pathType);
      }
      if (options.limit) {
        params.append('limit', options.limit.toString());
      }
      if (options.offset) {
        params.append('offset', options.offset.toString());
      }

      const response = await apiClient.get(`/api/v1/learning-paths?${params}`);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to get all learning paths');
    }
  },

  // Update learning path (admin)
  updatePath: async (pathId, updateData) => {
    try {
      const response = await apiClient.patch(`/api/v1/learning-paths/${pathId}`, updateData);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to update learning path');
    }
  },

  // Get learning path analytics
  getPathAnalytics: async (pathId) => {
    try {
      const response = await apiClient.get(`/api/v1/learning-paths/${pathId}/analytics`);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to get path analytics');
    }
  },

  // Export learning path data
  exportPathData: async (pathId, format = 'json') => {
    try {
      const response = await apiClient.get(`/api/v1/learning-paths/${pathId}/export`, {
        params: { format },
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        // Create download link for CSV
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `learning_path_${pathId}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        return response.data;
      }

      return response.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to export path data');
    }
  }
};

// Mentor Recommendations API
export const mentorRecommendationsAPI = {
  // Get mentor recommendations
  getRecommendations: async (userId, options = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (options.skills && options.skills.length > 0) {
        params.append('skills', JSON.stringify(options.skills));
      }
      if (options.experience) {
        params.append('experience', options.experience);
      }
      if (options.limit) {
        params.append('limit', options.limit.toString());
      }
      if (options.minRating) {
        params.append('minRating', options.minRating.toString());
      }
      if (options.maxSessions) {
        params.append('maxSessions', options.maxSessions.toString());
      }

      const response = await apiClient.get(`/api/v1/recommendations/mentors?${params}`, {
        params: { userId }
      });
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to get mentor recommendations');
    }
  },

  // Get stored mentor recommendations for user
  getStoredRecommendations: async (userId, options = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (options.limit) {
        params.append('limit', options.limit.toString());
      }
      if (options.minScore) {
        params.append('minScore', options.minScore.toString());
      }
      if (options.includeExpired !== undefined) {
        params.append('includeExpired', options.includeExpired.toString());
      }

      const response = await apiClient.get(`/api/v1/recommendations/mentors/${userId}?${params}`);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to get stored recommendations');
    }
  },

  // Update mentor feedback
  updateFeedback: async (mentorId, feedback) => {
    try {
      const response = await apiClient.post(`/api/v1/recommendations/mentors/${mentorId}/feedback`, feedback);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to update mentor feedback');
    }
  },

  // Update mentor scoring
  updateScore: async (mentorId, scoreData) => {
    try {
      const response = await apiClient.post(`/api/v1/recommendations/mentors/score`, {
        mentorId,
        ...scoreData
      });
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to update mentor score');
    }
  },

  // Get mentor availability
  getMentorAvailability: async (mentorId, options = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (options.startDate) {
        params.append('startDate', options.startDate.toISOString());
      }
      if (options.endDate) {
        params.append('endDate', options.endDate.toISOString());
      }
      if (options.status) {
        params.append('status', options.status);
      }

      const response = await apiClient.get(`/api/v1/recommendations/mentors/${mentorId}/availability?${params}`);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to get mentor availability');
    }
  },

  // Book mentor session
  bookSession: async (mentorId, slotId, bookingData) => {
    try {
      const response = await apiClient.post(`/api/v1/recommendations/mentors/${mentorId}/book`, {
        slotId,
        ...bookingData
      });
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to book session');
    }
  },

  // Get mentor profile
  getMentorProfile: async (mentorId) => {
    try {
      const response = await apiClient.get(`/api/v1/recommendations/mentors/${mentorId}/profile`);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to get mentor profile');
    }
  },

  // Get mentor reviews
  getMentorReviews: async (mentorId, options = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (options.limit) {
        params.append('limit', options.limit.toString());
      }
      if (options.offset) {
        params.append('offset', options.offset.toString());
      }
      if (options.rating) {
        params.append('rating', options.rating.toString());
      }

      const response = await apiClient.get(`/api/v1/recommendations/mentors/${mentorId}/reviews?${params}`);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to get mentor reviews');
    }
  },

  // Search mentors
  searchMentors: async (searchQuery, options = {}) => {
    try {
      const params = new URLSearchParams();
      
      params.append('q', searchQuery);
      
      if (options.skills && options.skills.length > 0) {
        params.append('skills', JSON.stringify(options.skills));
      }
      if (options.experience) {
        params.append('experience', options.experience);
      }
      if (options.minRating) {
        params.append('minRating', options.minRating.toString());
      }
      if (options.limit) {
        params.append('limit', options.limit.toString());
      }

      const response = await apiClient.get(`/api/v1/recommendations/mentors/search?${params}`);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to search mentors');
    }
  },

  // Get trending mentors
  getTrendingMentors: async (options = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (options.timeRange) {
        params.append('timeRange', options.timeRange);
      }
      if (options.limit) {
        params.append('limit', options.limit.toString());
      }

      const response = await apiClient.get(`/api/v1/recommendations/mentors/trending?${params}`);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to get trending mentors');
    }
  },

  // Get mentor statistics
  getMentorStats: async (mentorId) => {
    try {
      const response = await apiClient.get(`/api/v1/recommendations/mentors/${mentorId}/stats`);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to get mentor statistics');
    }
  },

  // Export mentor recommendations
  exportRecommendations: async (userId, format = 'json', options = {}) => {
    try {
      const params = new URLSearchParams();
      
      params.append('format', format);
      params.append('userId', userId);
      
      if (options.timeRange) {
        params.append('timeRange', options.timeRange);
      }
      if (options.includeExpired) {
        params.append('includeExpired', options.includeExpired.toString());
      }

      const response = await apiClient.get(`/api/v1/recommendations/mentors/export?${params}`, {
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        // Create download link for CSV
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mentor_recommendations_${userId}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        return response.data;
      }

      return response.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to export recommendations');
    }
  }
};

// Utility functions for learning paths and mentors
export const learningPathsUtils = {
  // Calculate progress percentage
  calculateProgress: (completedSteps, totalSteps) => {
    return totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  },

  // Format duration
  formatDuration: (minutes) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  },

  // Get status color
  getStatusColor: (status) => {
    switch (status) {
      case 'in_progress': return 'blue';
      case 'completed': return 'green';
      case 'paused': return 'yellow';
      case 'deleted': return 'red';
      default: return 'gray';
    }
  },

  // Get difficulty color
  getDifficultyColor: (difficulty) => {
    switch (difficulty) {
      case 'BEGINNER': return 'green';
      case 'INTERMEDIATE': return 'yellow';
      case 'ADVANCED': return 'red';
      default: return 'gray';
    }
  },

  // Format learning path type
  formatPathType: (pathType) => {
    return pathType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  },

  // Get next action for learning path
  getNextAction: (path) => {
    if (!path.steps || path.steps.length === 0) {
      return { type: 'start', message: 'Start your learning journey' };
    }

    const nextIncompleteStep = path.steps.find(step => !step.completed);
    if (nextIncompleteStep) {
      return {
        type: 'continue',
        message: `Continue with: ${nextIncompleteStep.title}`,
        step: nextIncompleteStep
      };
    }

    return { type: 'completed', message: 'Path completed!' };
  },

  // Generate learning path recommendations
  generateRecommendations: (path, userProgress) => {
    const recommendations = [];

    // Next steps recommendations
    const nextSteps = path.steps?.filter(step => !step.completed).slice(0, 3) || [];
    nextSteps.forEach(step => {
      recommendations.push({
        type: 'next_step',
        title: step.title,
        description: step.description,
        stepId: step.id,
        priority: 1 - (step.stepOrder / 100)
      });
    });

    // Content recommendations
    if (path.skills && path.skills.length > 0) {
      path.skills.forEach(skill => {
        recommendations.push({
          type: 'content',
          title: `Learn more about ${skill}`,
          description: `Find resources and content for ${skill}`,
          skill,
          priority: 0.5
        });
      });
    }

    // Mentor recommendations
    recommendations.push({
      type: 'mentor',
      title: 'Get expert guidance',
      description: 'Connect with mentors who specialize in your learning goals',
      priority: 0.7
    });

    return recommendations.sort((a, b) => b.priority - a.priority);
  },

  // Validate learning path data
  validatePathData: (data) => {
    const errors = [];

    if (!data.targetSkills || data.targetSkills.length === 0) {
      errors.push('At least one target skill is required');
    }

    if (!data.difficulty || !['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(data.difficulty)) {
      errors.push('Valid difficulty level is required');
    }

    if (!data.pathType || !['SKILL_BASED', 'CAREER_BASED', 'PERSONALIZED'].includes(data.pathType)) {
      errors.push('Valid path type is required');
    }

    if (data.estimatedDuration && (data.estimatedDuration < 1 || data.estimatedDuration > 200)) {
      errors.push('Estimated duration must be between 1 and 200 hours');
    }

    return errors;
  }
};

export const mentorRecommendationsUtils = {
  // Calculate match score percentage
  calculateMatchPercentage: (score) => {
    return Math.round(score * 100);
  },

  // Get score color
  getScoreColor: (score) => {
    if (score >= 0.8) return 'green';
    if (score >= 0.6) return 'yellow';
    if (score >= 0.4) return 'orange';
    return 'red';
  },

  // Format rating
  formatRating: (rating) => {
    return rating.toFixed(1);
  },

  // Get experience level label
  getExperienceLabel: (experience) => {
    switch (experience) {
      case 'BEGINNER': return 'Beginner Friendly';
      case 'INTERMEDIATE': return 'Intermediate';
      case 'ADVANCED': return 'Advanced';
      default: return 'All Levels';
    }
  },

  // Sort recommendations
  sortRecommendations: (recommendations, sortBy = 'overallScore', sortOrder = 'desc') => {
    return [...recommendations].sort((a, b) => {
      const aValue = a[sortBy] || 0;
      const bValue = b[sortBy] || 0;
      
      if (sortOrder === 'desc') {
        return bValue - aValue;
      } else {
        return aValue - bValue;
      }
    });
  },

  // Filter recommendations
  filterRecommendations: (recommendations, filters) => {
    return recommendations.filter(rec => {
      if (filters.minRating && rec.overallScore < filters.minRating) return false;
      if (filters.maxSessions && rec.sessionStats?.totalSessions > filters.maxSessions) return false;
      if (filters.skills && filters.skills.length > 0) {
        const hasRequiredSkill = filters.skills.some(skill => 
          rec.mentorSkills.some(mentorSkill => 
            mentorSkill.toLowerCase().includes(skill.toLowerCase())
          )
        );
        if (!hasRequiredSkill) return false;
      }
      return true;
    });
  },

  // Generate mentor recommendations reasons
  generateRecommendationReasons: (mentor) => {
    const reasons = [];

    if (mentor.overallScore >= 0.8) {
      reasons.push('Excellent overall match for your learning needs');
    }

    if (mentor.skillMatch >= 0.8) {
      reasons.push('Strong skill alignment with your goals');
    }

    if (mentor.availability >= 0.7) {
      reasons.push('Highly available with flexible scheduling');
    }

    if (mentor.performance >= 0.8) {
      reasons.push('Outstanding mentor with excellent reviews');
    }

    if (mentor.sessionStats?.totalSessions >= 20) {
      reasons.push(`Experienced mentor with ${mentor.sessionStats.totalSessions}+ sessions`);
    }

    if (reasons.length === 0) {
      reasons.push('Good match for your requirements');
    }

    return reasons;
  },

  // Validate mentor feedback
  validateFeedback: (feedback) => {
    const errors = [];

    if (!feedback.score || feedback.score < 1 || feedback.score > 5) {
      errors.push('Rating must be between 1 and 5');
    }

    if (feedback.comment && feedback.comment.length > 500) {
      errors.push('Comment must be less than 500 characters');
    }

    return errors;
  },

  // Format session duration
  formatSessionDuration: (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.round((end - start) / (1000 * 60)); // minutes
    
    if (duration < 60) {
      return `${duration} minutes`;
    }
    
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  },

  // Check if mentor is available
  isMentorAvailable: (availability, date) => {
    const targetDate = new Date(date).toDateString();
    return availability.some(slot => {
      const slotDate = new Date(slot.startTime).toDateString();
      return slotDate === targetDate && slot.status === 'AVAILABLE';
    });
  },

  // Get availability status color
  getAvailabilityStatusColor: (status) => {
    switch (status) {
      case 'AVAILABLE': return 'green';
      case 'BOOKED': return 'blue';
      case 'CANCELLED': return 'red';
      default: return 'gray';
    }
  }
};

// Export the API client for advanced usage
export default apiClient;
