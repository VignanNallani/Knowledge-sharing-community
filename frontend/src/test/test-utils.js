import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';

// Test utilities
export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

export const renderWithProviders = (component, options = {}) => {
  const queryClient = createTestQueryClient();
  
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {component}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>,
    options
  );
};

// Mock API responses
export const mockUser = {
  id: '1',
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  role: 'USER',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const mockPost = {
  id: '1',
  title: 'Test Post',
  content: 'This is a test post',
  authorId: '1',
  author: mockUser,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  version: 1,
  likes: [],
  comments: [],
};

// Mock API functions
export const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

// Setup and cleanup
export const setupTest = () => {
  vi.mock('../services/apiClient', () => ({
    default: mockApi,
  }));
  
  localStorage.clear();
};

export const cleanupTest = () => {
  vi.clearAllMocks();
  localStorage.clear();
};

// Common test patterns
export const expectLoadingState = (screen) => {
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
};

export const expectErrorState = (screen, message = /something went wrong/i) => {
  expect(screen.getByText(message)).toBeInTheDocument();
};

export const expectEmptyState = (screen, message = /no data/i) => {
  expect(screen.getByText(message)).toBeInTheDocument();
};

export const waitForLoadingToFinish = () => waitFor(() => {
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
});
