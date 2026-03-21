import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '@/services/api';
import { tokenManager } from '@/lib/tokenManager';
import { authSyncManager } from '@/lib/authSyncManager';
import SessionRestoreSplash from '@/components/SessionRestoreSplash';
import type { User, AuthResponse, LoginCredentials, AuthContextType } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [sessionRestoring, setSessionRestoring] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async (): Promise<void> => {
      // Migrate from localStorage to memory (one-time migration)
      tokenManager.migrateFromLocalStorage();
      
      // Check if we have a token in memory
      if (tokenManager.hasToken()) {
        try {
          // Verify token is still valid by fetching current user
          const response = await apiService.getCurrentUser();
          setUser(response.data);
          setIsAuthenticated(true);
        } catch (error) {
          // Token invalid, clear it
          tokenManager.clearTokens();
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
      setSessionRestoring(false); // Hide splash after auth resolution
    };

    // Listen for logout from other tabs
    const handleLogoutFromOtherTab = (): void => {
      setUser(null);
      setIsAuthenticated(false);
    };

    window.addEventListener('auth-logout-from-other-tab', handleLogoutFromOtherTab);

    initAuth();

    return () => {
      window.removeEventListener('auth-logout-from-other-tab', handleLogoutFromOtherTab);
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await apiService.login(credentials);
      
      // Store access token in memory only
      tokenManager.setAccessToken(response.data.accessToken);
      
      // Store user data in state
      setUser(response.data.user);
      setIsAuthenticated(true);
      
      // Broadcast login to other tabs
      authSyncManager.broadcastLogin(response.data.user);
      
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Call backend logout to clear HttpOnly cookie
      await apiService.client.post('/auth/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Always clear memory tokens and broadcast logout
      tokenManager.clearTokens();
      setUser(null);
      setIsAuthenticated(false);
      
      // Broadcast logout to other tabs
      authSyncManager.broadcastLogout();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    loading,
    sessionRestoring,
    login,
    logout
  };

  // Show session restore splash during auth resolution
  if (sessionRestoring) {
    return <SessionRestoreSplash />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
