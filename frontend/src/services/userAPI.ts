import apiClient from './apiClient';
import { ApiResponse, User } from '../types';

export const userAPI = {
  getProfile: async (userId: string, currentUserId?: string): Promise<ApiResponse<User>> => {
    const response = await apiClient.get(`/users/${userId}`, {
      params: currentUserId ? { currentUserId } : undefined
    });
    return response.data;
  },

  updateProfile: async (userId: string, userData: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await apiClient.put(`/users/${userId}`, userData);
    return response.data;
  },

  followUser: async (userId: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.post(`/users/${userId}/follow`);
    return response.data;
  },

  unfollowUser: async (userId: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete(`/users/${userId}/follow`);
    return response.data;
  },

  searchUsers: async (query: string): Promise<ApiResponse<User[]>> => {
    const response = await apiClient.get('/users/search', { params: { q: query } });
    return response.data;
  },
};

export default userAPI;
