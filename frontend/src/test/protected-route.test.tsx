import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import type { ProtectedRouteProps } from '@/types'

// Mock token manager
vi.mock('@/lib/tokenManager', () => ({
  tokenManager: {
    hasToken: vi.fn(() => false),
    clearTokens: vi.fn(),
    migrateFromLocalStorage: vi.fn(),
  },
}))

// Mock API service
vi.mock('@/services/api', () => ({
  apiService: {
    getCurrentUser: vi.fn(),
    createPost: vi.fn(),
    login: vi.fn(),
  },
}))

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    pathname: '/',
  },
  writable: true,
})

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('shows loading state initially', () => {
    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  test('redirects to signin when not authenticated', async () => {
    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    // Should redirect to signin - check for navigation
    await waitFor(() => {
      expect(window.location.pathname).toBe('/signin')
    })
  })

  test('renders children when authenticated', async () => {
    // Mock authenticated user BEFORE rendering
    const { tokenManager } = await import('@/lib/tokenManager')
    const { apiService } = await import('@/services/api')
    
    ;(tokenManager.hasToken as vi.Mock).mockReturnValue(true)
    ;(apiService.getCurrentUser as vi.Mock).mockResolvedValue({
      success: true,
      data: {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    })

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  test('redirects non-admin users for admin routes', async () => {
    // Mock authenticated user with USER role
    const { tokenManager } = await import('@/lib/tokenManager')
    ;(tokenManager.hasToken as vi.Mock).mockReturnValue(true)

    const { apiService } = await import('@/services/api')
    ;(apiService.getCurrentUser as vi.Mock).mockResolvedValue({
      success: true,
      data: {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER', // Not ADMIN
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    })

    renderWithProviders(
      <ProtectedRoute role="ADMIN">
        <div>Admin Content</div>
      </ProtectedRoute>
    )

    await waitFor(() => {
      expect(window.location.pathname).toBe('/community')
    })
  })

  test('renders admin content for admin users', async () => {
    // Mock authenticated admin user
    const { tokenManager } = await import('@/lib/tokenManager')
    ;(tokenManager.hasToken as vi.Mock).mockReturnValue(true)

    const { apiService } = await import('@/services/api')
    ;(apiService.getCurrentUser as vi.Mock).mockResolvedValue({
      success: true,
      data: {
        id: '1',
        email: 'admin@example.com',
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    })

    renderWithProviders(
      <ProtectedRoute role="ADMIN">
        <div>Admin Content</div>
      </ProtectedRoute>
    )

    await waitFor(() => {
      expect(screen.getByText('Admin Content')).toBeInTheDocument()
    })
  })
})
