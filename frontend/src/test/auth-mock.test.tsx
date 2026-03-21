import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import apiService from '@/services/api'
import type { User, AuthResponse } from '@/types'

// Simple mock for testing
const createMockAuthContext = (initialState: any = {}) => {
  let state = {
    user: null,
    isAuthenticated: false,
    loading: true,
    sessionRestoring: false,
    login: vi.fn(),
    logout: vi.fn(),
    ...initialState
  }
  
  return {
    useAuth: () => state,
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
  }
}

// Test component that uses auth
const TestAuthComponent = ({ mockContext }: { mockContext: any }) => {
  const { login, user, isAuthenticated, loading } = mockContext.useAuth()

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

const renderWithProviders = (component: React.ReactElement, mockContext: any) => {
  return render(
    <BrowserRouter>
      <mockContext.AuthProvider>
        {component}
      </mockContext.AuthProvider>
    </BrowserRouter>
  )
}

describe('Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', async () => {
    const mockContext = createMockAuthContext({ loading: true })
    
    renderWithProviders(<TestAuthComponent mockContext={mockContext} />, mockContext)
    
    expect(screen.getByTestId('loading')).toBeInTheDocument()
  })

  it('shows login button when not authenticated', async () => {
    const mockContext = createMockAuthContext({ 
      loading: false, 
      isAuthenticated: false 
    })
    
    renderWithProviders(<TestAuthComponent mockContext={mockContext} />, mockContext)
    
    expect(screen.getByTestId('login-button')).toBeInTheDocument()
  })

  it('shows user email when authenticated', async () => {
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

    const mockContext = createMockAuthContext({ 
      loading: false, 
      isAuthenticated: true,
      user: mockUser
    })
    
    renderWithProviders(<TestAuthComponent mockContext={mockContext} />, mockContext)
    
    expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
  })

  it('calls login function when button clicked', async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      success: true,
      data: {
        accessToken: 'mock-token',
        user: {
          id: '1',
          email: 'test@example.com',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          role: 'USER',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        }
      }
    })

    const mockContext = createMockAuthContext({ 
      loading: false, 
      isAuthenticated: false,
      login: mockLogin
    })
    
    renderWithProviders(<TestAuthComponent mockContext={mockContext} />, mockContext)
    
    const loginButton = screen.getByTestId('login-button')
    await userEvent.click(loginButton)

    expect(mockLogin).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })
})
