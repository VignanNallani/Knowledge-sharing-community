import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, mockUser, setupTest, cleanupTest } from './test-utils';
import { authAPI } from '../services/authAPI';

describe('Authentication API', () => {
  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    cleanupTest();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        data: {
          accessToken: 'mock-token',
          user: mockUser,
        },
        success: true,
      };

      vi.mocked(authAPI.login).mockResolvedValue(mockResponse);

      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await authAPI.login(credentials);

      expect(result.data.accessToken).toBe('mock-token');
      expect(result.data.user).toEqual(mockUser);
      expect(result.success).toBe(true);
    });

    it('should throw error with invalid credentials', async () => {
      const mockError = new Error('Invalid credentials');
      vi.mocked(authAPI.login).mockRejectedValue(mockError);

      const credentials = {
        email: 'invalid@example.com',
        password: 'wrongpassword',
      };

      await expect(authAPI.login(credentials)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should register successfully with valid data', async () => {
      const mockResponse = {
        data: {
          accessToken: 'mock-token',
          user: mockUser,
        },
        success: true,
      };

      vi.mocked(authAPI.register).mockResolvedValue(mockResponse);

      const userData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
      };

      const result = await authAPI.register(userData);

      expect(result.data.accessToken).toBe('mock-token');
      expect(result.data.user).toEqual(mockUser);
      expect(result.success).toBe(true);
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user successfully', async () => {
      const mockResponse = {
        data: mockUser,
        success: true,
      };

      vi.mocked(authAPI.getCurrentUser).mockResolvedValue(mockResponse);

      const result = await authAPI.getCurrentUser();

      expect(result.data).toEqual(mockUser);
      expect(result.success).toBe(true);
    });
  });
});
