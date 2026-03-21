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

// Search Posts
export const searchPosts = async (params = {}) => {
  const {
    q,
    skills,
    authorId,
    dateStart,
    dateEnd,
    sortBy = 'relevance',
    page = 1,
    limit = 20
  } = params;

  const queryParams = new URLSearchParams();
  
  if (q) queryParams.append('q', q);
  if (skills) queryParams.append('skills', Array.isArray(skills) ? skills.join(',') : skills);
  if (authorId) queryParams.append('authorId', authorId);
  if (dateStart) queryParams.append('dateStart', dateStart);
  if (dateEnd) queryParams.append('dateEnd', dateEnd);
  if (sortBy) queryParams.append('sortBy', sortBy);
  if (page) queryParams.append('page', page);
  if (limit) queryParams.append('limit', limit);

  const response = await api.get(`/api/v1/search/posts?${queryParams}`);
  return response.data.data;
};

// Search Users
export const searchUsers = async (params = {}) => {
  const {
    q,
    skills,
    role,
    availability,
    sortBy = 'relevance',
    page = 1,
    limit = 20
  } = params;

  const queryParams = new URLSearchParams();
  
  if (q) queryParams.append('q', q);
  if (skills) queryParams.append('skills', Array.isArray(skills) ? skills.join(',') : skills);
  if (role) queryParams.append('role', role);
  if (availability) queryParams.append('availability', availability);
  if (sortBy) queryParams.append('sortBy', sortBy);
  if (page) queryParams.append('page', page);
  if (limit) queryParams.append('limit', limit);

  const response = await api.get(`/api/v1/search/users?${queryParams}`);
  return response.data.data;
};

// Search Mentors
export const searchMentors = async (params = {}) => {
  const {
    q,
    skills,
    availability,
    minRating,
    maxRating,
    sortBy = 'relevance',
    page = 1,
    limit = 20
  } = params;

  const queryParams = new URLSearchParams();
  
  if (q) queryParams.append('q', q);
  if (skills) queryParams.append('skills', Array.isArray(skills) ? skills.join(',') : skills);
  if (availability) queryParams.append('availability', availability);
  if (minRating) queryParams.append('minRating', minRating);
  if (maxRating) queryParams.append('maxRating', maxRating);
  if (sortBy) queryParams.append('sortBy', sortBy);
  if (page) queryParams.append('page', page);
  if (limit) queryParams.append('limit', limit);

  const response = await api.get(`/api/v1/search/mentors?${queryParams}`);
  return response.data.data;
};

// Get Autocomplete Suggestions
export const getAutocompleteSuggestions = async (query, type = 'general', limit = 5) => {
  const queryParams = new URLSearchParams();
  
  if (query) queryParams.append('q', query);
  if (type) queryParams.append('type', type);
  if (limit) queryParams.append('limit', limit);

  const response = await api.get(`/api/v1/search/autocomplete?${queryParams}`);
  return response.data.data;
};

// Get Trending Posts
export const getTrendingPosts = async (limit = 10) => {
  const queryParams = new URLSearchParams();
  if (limit) queryParams.append('limit', limit);

  const response = await api.get(`/api/v1/search/trending/posts?${queryParams}`);
  return response.data.data;
};

// Get Recommended Mentors
export const getRecommendedMentors = async (limit = 10) => {
  const queryParams = new URLSearchParams();
  if (limit) queryParams.append('limit', limit);

  const response = await api.get(`/api/v1/search/recommended/mentors?${queryParams}`);
  return response.data.data;
};

// Search utility functions
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const highlightText = (text, query) => {
  if (!text || !query) return text;
  
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

export const formatSearchResult = (result, query) => {
  if (result.title) {
    return {
      ...result,
      highlightedTitle: highlightText(result.title, query),
      highlightedContent: result.content ? highlightText(result.content.substring(0, 200) + '...', query) : ''
    };
  }
  
  if (result.name) {
    return {
      ...result,
      highlightedName: highlightText(result.name, query),
      highlightedBio: result.bio ? highlightText(result.bio.substring(0, 200) + '...', query) : ''
    };
  }
  
  return result;
};

export default api;
