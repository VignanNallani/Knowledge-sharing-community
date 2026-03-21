import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import apiService from '@/services/api'
import type { User, AuthResponse } from '@/types'

// Mock API service
vi.mock('@/services/api', () => ({
  default: {
    login: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}))

// Mock token manager
vi.mock('@/lib/tokenManager', () => ({
  tokenManager: {
    setAccessToken: vi.fn(),
    hasToken: vi.fn(() => false),
    clearTokens: vi.fn(),
    migrateFromLocalStorage: vi.fn(),
  },
}))

// Mock auth sync manager
vi.mock('@/lib/authSyncManager', () => ({
  authSyncManager: {
    broadcastLogin: vi.fn(),
  },
}))

// Test component that uses auth
const TestAuthComponent = () => {
  const { login, user, isAuthenticated, loading } = useAuth()

  if (loading) return <div data-testid="loading">Loading...</div>

  const handleLogin = async () => {
    try {
      await login({ email: 'test@example.com', password: 'password123' })
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <span data-testid="user-email">{user?.email}</span>
        </div>
      ) : (
        <button onClick={handleLogin} data-testid="login-button">
          Login
        </button>
      )}
    </div>
  )
}

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', async () => {
    renderWithProviders(<TestAuthComponent />)
    
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toBeInTheDocument()
    })
  })

  it('shows login button when not authenticated', async () => {
    renderWithProviders(<TestAuthComponent />)
    
    await waitFor(() => {
      expect(screen.getByTestId('login-button')).toBeInTheDocument()
    })
  })

  it('successful login updates auth state', async () => {
    const mockUser: User = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    const mockResponse: AuthResponse = {
      accessToken: 'mock-token',
      user: mockUser,
    }

    const mockApiResponse = {
      success: true,
      data: mockResponse,
    }

    vi.mocked(apiService.login).mockResolvedValue(mockApiResponse)

    renderWithProviders(<TestAuthComponent />)

    const loginButton = await screen.findByTestId('login-button')
    await userEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
    })

    expect(apiService.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })
})
