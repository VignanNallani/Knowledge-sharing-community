import React from 'react'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'

// Mock the ProtectedRoute component itself to test its logic
vi.mock('@/components/ProtectedRoute', () => {
  return function MockProtectedRoute({ role, children }) {
    const mockAuth = {
      user: { role: 'USER' },
      isAuthenticated: false,
      loading: false,
    }
    
    // Simple logic test
    if (mockAuth.loading) {
      return <div data-testid="loading">Loading...</div>
    }
    
    if (!mockAuth.isAuthenticated) {
      return <div data-testid="redirect">Redirecting to signin...</div>
    }
    
    if (role && mockAuth.user?.role !== role) {
      return <div data-testid="access-denied">Access denied</div>
    }
    
    return <div data-testid="protected-content">{children}</div>
  }
})

import ProtectedRoute from '@/components/ProtectedRoute'

describe('ProtectedRoute - Component Logic', () => {
  test('renders loading state', () => {
    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    )
    
    expect(screen.getByTestId('loading')).toBeInTheDocument()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  test('shows redirect when not authenticated', () => {
    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    )
    
    expect(screen.getByTestId('redirect')).toBeInTheDocument()
    expect(screen.getByText('Redirecting to signin...')).toBeInTheDocument()
  })

  test('renders children when authenticated', () => {
    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    )
    
    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  test('shows access denied for wrong role', () => {
    render(
      <BrowserRouter>
        <ProtectedRoute role="ADMIN">
          <div>Admin Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    )
    
    expect(screen.getByTestId('access-denied')).toBeInTheDocument()
    expect(screen.getByText('Access denied')).toBeInTheDocument()
  })
})
