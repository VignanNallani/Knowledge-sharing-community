import apiClient from './apiClient';
import { ApiResponse, Post, PaginationParams, PaginatedResponse } from '../types';

export const postAPI = {
  getPosts: async (params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Post>>> => {
    const response = await apiClient.get('/posts', { params });
    return response.data;
  },

  getPost: async (id: string): Promise<ApiResponse<Post>> => {
    const response = await apiClient.get(`/posts/${id}`);
    return response.data;
  },

  createPost: async (postData: Omit<Post, 'id' | 'author' | 'createdAt' | 'updatedAt' | 'version'>): Promise<ApiResponse<Post>> => {
    const response = await apiClient.post('/posts', postData);
    return response.data;
  },

  updatePost: async (id: string, postData: Partial<Omit<Post, 'id' | 'author' | 'createdAt' | 'updatedAt' | 'version'>>): Promise<ApiResponse<Post>> => {
    const response = await apiClient.put(`/posts/${id}`, postData);
    return response.data;
  },

  deletePost: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete(`/posts/${id}`);
    return response.data;
  },

  likePost: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.post(`/posts/${id}/like`);
    return response.data;
  },

  unlikePost: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete(`/posts/${id}/like`);
    return response.data;
  },
};

export default postAPI;
