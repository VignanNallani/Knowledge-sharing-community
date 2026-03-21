import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import { tokenManager } from '../src/lib/tokenManager';

const API_BASE = 'http://localhost:4000/api/v1';

describe('Authentication Integration Tests', () => {
  let testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'TestPassword123!'
  };

  beforeEach(async () => {
    // Clean up any existing test user
    try {
      await axios.delete(`${API_BASE}/users/test@example.com`);
    } catch (error) {
      // User doesn't exist, which is fine
    }
  });

  afterEach(async () => {
    // Logout and clean up
    try {
      await axios.post(`${API_BASE}/auth/logout`, {}, {
        withCredentials: true
      });
      tokenManager.clearTokens();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Registration', () => {
    it('should register a new user', async () => {
      const response = await axios.post(`${API_BASE}/auth/register`, testUser);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.user.email).toBe(testUser.email);
      expect(response.data.data.accessToken).toBeDefined();
    });

    it('should reject duplicate registration', async () => {
      // First registration
      await axios.post(`${API_BASE}/auth/register`, testUser);
      
      // Second registration should fail
      const response = await axios.post(`${API_BASE}/auth/register`, testUser, {
        validateStatus: false
      }).catch(error => error.response);
      
      expect(response.status).toBe(409);
      expect(response.data.success).toBe(false);
    });
  });

  describe('Login', () => {
    it('should login with valid credentials', async () => {
      // Register user first
      await axios.post(`${API_BASE}/auth/register`, testUser);
      
      // Login
      const response = await axios.post(`${API_BASE}/auth/login`, testUser, {
        withCredentials: true
      });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.accessToken).toBeDefined();
      expect(response.data.data.user.email).toBe(testUser.email);
      
      // Check for refresh token cookie
      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader[0]).toContain('refreshToken');
    });

    it('should reject invalid credentials', async () => {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        email: 'test@example.com',
        password: 'wrongpassword'
      }, {
        validateStatus: false
      }).catch(error => error.response);
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
    });
  });

  describe('Protected Routes', () => {
    let accessToken = '';

    beforeEach(async () => {
      // Register and login to get token
      await axios.post(`${API_BASE}/auth/register`, testUser);
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, testUser, {
        withCredentials: true
      });
      accessToken = loginResponse.data.data.accessToken;
    });

    it('should access protected route with valid token', async () => {
      const response = await axios.get(`${API_BASE}/users/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.email).toBe(testUser.email);
    });

    it('should reject protected route with invalid token', async () => {
      const response = await axios.get(`${API_BASE}/users/me`, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      }).catch(error => error.response);
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
    });

    it('should reject protected route without token', async () => {
      const response = await axios.get(`${API_BASE}/users/me`).catch(error => error.response);
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      // Register and login
      await axios.post(`${API_BASE}/auth/register`, testUser);
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, testUser, {
        withCredentials: true
      });
      
      // Wait a bit then refresh
      const refreshResponse = await axios.post(`${API_BASE}/auth/refresh`, {}, {
        withCredentials: true
      });
      
      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.data.success).toBe(true);
      expect(refreshResponse.data.data.accessToken).toBeDefined();
    });

    it('should reject refresh with invalid token', async () => {
      const response = await axios.post(`${API_BASE}/auth/refresh`, {}, {
        withCredentials: true,
        validateStatus: false
      }).catch(error => error.response);
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
    });
  });

  describe('Logout', () => {
    it('should logout and clear tokens', async () => {
      // Register and login
      await axios.post(`${API_BASE}/auth/register`, testUser);
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, testUser, {
        withCredentials: true
      });
      
      // Logout
      const logoutResponse = await axios.post(`${API_BASE}/auth/logout`, {}, {
        withCredentials: true
      });
      
      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.data.success).toBe(true);
      
      // Try to access protected route - should fail
      const protectedResponse = await axios.get(`${API_BASE}/users/me`).catch(error => error.response);
      expect(protectedResponse.status).toBe(401);
    });
  });

  describe('Token Expiration', () => {
    it('should handle token expiration gracefully', async () => {
      // Register and login
      await axios.post(`${API_BASE}/auth/register`, testUser);
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, testUser, {
        withCredentials: true
      });
      
      // Wait for token to expire (15 minutes from auth.service.js)
      await new Promise(resolve => setTimeout(resolve, 16 * 60 * 1000)); // 16 minutes
      
      // Try to access protected route - should fail
      const response = await axios.get(`${API_BASE}/users/me`).catch(error => error.response);
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
    });
  });
});
