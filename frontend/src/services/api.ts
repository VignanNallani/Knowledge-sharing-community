import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { tokenManager } from "@/lib/tokenManager";
import type { 
  User, 
  AuthResponse, 
  LoginCredentials, 
  RegisterCredentials, 
  Post, 
  CreatePostRequest,
  Comment,
  CreateCommentRequest,
  Mentor,
  MentorshipRequest,
  CreateMentorshipRequest,
  ApiResponse,
  PaginatedResponse,
  PaginationParams
} from "@/types";

// API Service Layer - Production Ready
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";

class ApiService {
  public client: AxiosInstance;

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
      (config: InternalAxiosRequestConfig) => {
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
      (response: AxiosResponse) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Try token refresh using token manager
          try {
            const newToken = await tokenManager.refreshAccessToken();
            
            // Retry original request with new token
            error.config.headers.Authorization = `Bearer ${newToken}`;
            return this.client(error.config);
          } catch (refreshError) {
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
  async getPosts(params: PaginationParams = {}): Promise<ApiResponse<PaginatedResponse<Post>>> {
    try {
      const response: AxiosResponse<ApiResponse<PaginatedResponse<Post>>> = await this.client.get('/posts', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      throw error;
    }
  }

  async createPost(postData: CreatePostRequest): Promise<ApiResponse<Post>> {
    try {
      const response: AxiosResponse<ApiResponse<Post>> = await this.client.post('/posts', postData);
      return response.data;
    } catch (error) {
      console.error('Failed to create post:', error);
      throw error;
    }
  }

  async getPost(id: string): Promise<ApiResponse<Post>> {
    try {
      const response: AxiosResponse<ApiResponse<Post>> = await this.client.get(`/posts/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch post:', error);
      throw error;
    }
  }

  async updatePost(id: string, postData: Partial<Omit<Post, 'id' | 'author' | 'createdAt' | 'updatedAt' | 'version'>>): Promise<ApiResponse<Post>> {
    try {
      const response: AxiosResponse<ApiResponse<Post>> = await this.client.put(`/posts/${id}`, postData);
      return response.data;
    } catch (error) {
      console.error('Failed to update post:', error);
      throw error;
    }
  }

  async deletePost(id: string): Promise<ApiResponse<void>> {
    try {
      const response: AxiosResponse<ApiResponse<void>> = await this.client.delete(`/posts/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete post:', error);
      throw error;
    }
  }

  // Comments API
  async getComments(postId: string, params: PaginationParams = {}): Promise<ApiResponse<PaginatedResponse<Comment>>> {
    try {
      const response: AxiosResponse<ApiResponse<PaginatedResponse<Comment>>> = await this.client.get(`/posts/${postId}/comments`, { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      throw error;
    }
  }

  async createComment(commentData: CreateCommentRequest): Promise<ApiResponse<Comment>> {
    try {
      const response: AxiosResponse<ApiResponse<Comment>> = await this.client.post('/comments', commentData);
      return response.data;
    } catch (error) {
      console.error('Failed to create comment:', error);
      throw error;
    }
  }

  // Users API
  async getUsers(params: PaginationParams = {}): Promise<ApiResponse<PaginatedResponse<User>>> {
    try {
      const response: AxiosResponse<ApiResponse<PaginatedResponse<User>>> = await this.client.get('/users', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    try {
      const response: AxiosResponse<ApiResponse<User>> = await this.client.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      throw error;
    }
  }

  // Mentorship API
  async getMentors(params: PaginationParams = {}): Promise<ApiResponse<PaginatedResponse<Mentor>>> {
    try {
      const response: AxiosResponse<ApiResponse<PaginatedResponse<Mentor>>> = await this.client.get('/mentorship', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch mentors:', error);
      throw error;
    }
  }

  async createMentorshipRequest(requestData: CreateMentorshipRequest): Promise<ApiResponse<MentorshipRequest>> {
    try {
      const response: AxiosResponse<ApiResponse<MentorshipRequest>> = await this.client.post('/mentorship/requests', requestData);
      return response.data;
    } catch (error) {
      console.error('Failed to create mentorship request:', error);
      throw error;
    }
  }

  async getMyMentorships(params: PaginationParams = {}): Promise<ApiResponse<PaginatedResponse<MentorshipRequest>>> {
    try {
      const response: AxiosResponse<ApiResponse<PaginatedResponse<MentorshipRequest>>> = await this.client.get('/mentorship/my-requests', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch mentorships:', error);
      throw error;
    }
  }

  // Auth API
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    try {
      const response: AxiosResponse<ApiResponse<AuthResponse>> = await this.client.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      console.error('Failed to login:', error);
      throw error;
    }
  }

  async register(userData: RegisterCredentials): Promise<ApiResponse<AuthResponse>> {
    try {
      const response: AxiosResponse<ApiResponse<AuthResponse>> = await this.client.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Failed to register:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const response: AxiosResponse<ApiResponse<User>> = await this.client.get('/auth/me');
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
