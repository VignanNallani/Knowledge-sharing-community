import axios from "axios";
import { tokenManager } from "../lib/tokenManager";

// API Service Layer - Production Ready
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      withCredentials: true, // Important for HttpOnly cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth - uses memory token
    this.client.interceptors.request.use(
      (config) => {
        const token = tokenManager.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling - uses token manager
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Try token refresh using token manager
          try {
            const newToken = await tokenManager.refreshAccessToken();
            
            // Retry original request with new token
            error.config.headers.Authorization = `Bearer ${newToken}`;
            return this.client(error.config);
          } catch (_refreshError) {
            // Refresh failed, clear tokens and redirect
            tokenManager.clearTokens();
            window.location.href = "/signin";
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Posts API
  async getPosts(params = {}) {
    try {
      const response = await this.client.get('/posts', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      throw error;
    }
  }

  async createPost(postData) {
    try {
      const response = await this.client.post('/posts', postData);
      return response.data;
    } catch (error) {
      console.error('Failed to create post:', error);
      throw error;
    }
  }

  // Users API
  async getUsers(params = {}) {
    try {
      const response = await this.client.get('/users', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  }

  // Mentorship API
  async getMentors(params = {}) {
    try {
      const response = await this.client.get('/users', { params: { ...params, role: 'MENTOR' } });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch mentors:', error);
      throw error;
    }
  }

  async createBooking(bookingData) {
    try {
      const response = await this.client.post('/bookings', bookingData);
      return response.data;
    } catch (error) {
      console.error('Failed to create booking:', error);
      throw error;
    }
  }

  // Auth API
  async login(credentials) {
    try {
      const response = await this.client.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      console.error('Failed to login:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      const response = await this.client.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Failed to register:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      const response = await this.client.get('/auth/me');
      return response.data;
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
