import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import ProtectedRoute from '@/components/ProtectedRoute'

// Mock the AuthContext module
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

const renderWithProviders = (component: React.ReactElement, authProps: any = {}) => {
  // Set up the mock implementation
  const { useAuth } = await import('@/context/AuthContext')
  ;(useAuth as vi.Mock).mockReturnValue(authProps)
  
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('shows loading state initially', () => {
    const { useAuth } = require('@/context/AuthContext')
    ;(useAuth as vi.Mock).mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: true,
      sessionRestoring: false,
    })

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    )
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  test('redirects to signin when not authenticated', async () => {
    const { useAuth } = require('@/context/AuthContext')
    ;(useAuth as vi.Mock).mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
      sessionRestoring: false,
    })

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/',
      },
      writable: true,
    })

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    )

    // Should redirect to signin
    await waitFor(() => {
      expect(window.location.pathname).toBe('/signin')
    })
  })

  test('renders children when authenticated', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    const { useAuth } = require('@/context/AuthContext')
    ;(useAuth as vi.Mock).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      loading: false,
      sessionRestoring: false,
    })

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  test('redirects non-admin users for admin routes', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: 'USER', // Not ADMIN
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    const { useAuth } = require('@/context/AuthContext')
    ;(useAuth as vi.Mock).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      loading: false,
      sessionRestoring: false,
    })

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/',
      },
      writable: true,
    })

    render(
      <BrowserRouter>
        <ProtectedRoute role="ADMIN">
          <div>Admin Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(window.location.pathname).toBe('/community')
    })
  })

  test('renders admin content for admin users', async () => {
    const mockAdmin = {
      id: '1',
      email: 'admin@example.com',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    const { useAuth } = require('@/context/AuthContext')
    ;(useAuth as vi.Mock).mockReturnValue({
      user: mockAdmin,
      isAuthenticated: true,
      loading: false,
      sessionRestoring: false,
    })

    render(
      <BrowserRouter>
        <ProtectedRoute role="ADMIN">
          <div>Admin Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Admin Content')).toBeInTheDocument()
    })
  })
})
