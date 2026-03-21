import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import ProtectedRoute from '@/components/ProtectedRoute'

// Simple mock AuthContext
const MockAuthProvider = ({ children, isAuthenticated = false, user = null }) => {
  const authValue = {
    user,
    isAuthenticated,
    loading: false,
    sessionRestoring: false,
    login: vi.fn(),
    logout: vi.fn(),
  }
  
  // Mock the useAuth hook
  React.useAuth = () => authValue
  
  return <>{children}</>
}

const renderWithProviders = (component, authProps = {}) => {
  return render(
    <BrowserRouter>
      <MockAuthProvider {...authProps}>
        {component}
      </MockAuthProvider>
    </BrowserRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    // Reset window location
    window.location.pathname = '/'
  })

  test('shows loading state initially', () => {
    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      { loading: true }
    )
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  test('redirects to signin when not authenticated', async () => {
    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      { isAuthenticated: false }
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

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      { isAuthenticated: true, user: mockUser }
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

    renderWithProviders(
      <ProtectedRoute role="ADMIN">
        <div>Admin Content</div>
      </ProtectedRoute>,
      { isAuthenticated: true, user: mockUser }
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

    renderWithProviders(
      <ProtectedRoute role="ADMIN">
        <div>Admin Content</div>
      </ProtectedRoute>,
      { isAuthenticated: true, user: mockAdmin }
    )

    await waitFor(() => {
      expect(screen.getByText('Admin Content')).toBeInTheDocument()
    })
  })
})
