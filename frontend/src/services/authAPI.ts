import apiClient from './apiClient';
import { ApiResponse, AuthResponse, LoginCredentials, RegisterCredentials } from '../types';

export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  register: async (credentials: RegisterCredentials): Promise<ApiResponse<AuthResponse>> => {
    const response = await apiClient.post('/auth/register', credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  refreshToken: async (): Promise<ApiResponse<{ accessToken: string }>> => {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },

  getCurrentUser: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

export default authAPI;
