import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import ProtectedRoute from '@/components/ProtectedRoute'

// Mock the AuthContext module
vi.mock('@/context/AuthContext')

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('shows loading state initially', () => {
    // Mock useAuth to return loading state
    const { useAuth } = vi.mocked(await import('@/context/AuthContext'))
    useAuth.mockReturnValue({
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
    // Mock useAuth to return not authenticated
    const { useAuth } = vi.mocked(await import('@/context/AuthContext'))
    useAuth.mockReturnValue({
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

    // Mock useAuth to return authenticated user
    const { useAuth } = vi.mocked(await import('@/context/AuthContext'))
    useAuth.mockReturnValue({
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
})
