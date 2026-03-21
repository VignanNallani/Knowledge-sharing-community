// Token Manager - Enterprise Memory Strategy
import { authSyncManager } from './authSyncManager';
import { apiService } from '../services/api';

class TokenManager {
  constructor() {
    this.accessToken = null;
    this.refreshPromise = null;
    this.setupCrossTabListeners();
  }

  setupCrossTabListeners() {
    // Listen for token refresh from other tabs
    window.addEventListener('auth-token-refreshed', (event) => {
      this.accessToken = event.detail;
    });

    // Listen for logout from other tabs
    window.addEventListener('auth-logout-from-other-tab', () => {
      this.clearTokens();
    });
  }

  // Set access token in memory only
  setAccessToken(token) {
    this.accessToken = token;
    // Broadcast to other tabs
    authSyncManager.broadcastTokenRefresh(token);
  }

  // Get access token from memory
  getAccessToken() {
    return this.accessToken;
  }

  // Clear all tokens
  clearTokens() {
    this.accessToken = null;
    this.refreshPromise = null;
    // Broadcast logout to other tabs
    authSyncManager.broadcastLogout();
  }

  // Check if token exists
  hasToken() {
    return !!this.accessToken;
  }

  // Silent refresh - prevents multiple concurrent refreshes
  async refreshAccessToken() {
    // If refresh already in progress, return existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._performRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  async _performRefresh() {
    try {
      const response = await apiService.client.post('/auth/refresh', {}, {
        withCredentials: true // Critical: sends HttpOnly cookie
      });

      const data = response.data;
      
      if (data.success && data.data?.accessToken) {
        this.setAccessToken(data.data.accessToken);
        return data.data.accessToken;
      } else {
        throw new Error('Invalid refresh response');
      }
    } catch (error) {
      this.clearTokens(); // Clear invalid tokens
      throw error;
    }
  }

  // Initialize from localStorage (migration only)
  migrateFromLocalStorage() {
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) {
      this.setAccessToken(storedToken);
      localStorage.removeItem('accessToken'); // Clean up
    }
  }
}

// Export singleton
export const tokenManager = new TokenManager();
export default tokenManager;
