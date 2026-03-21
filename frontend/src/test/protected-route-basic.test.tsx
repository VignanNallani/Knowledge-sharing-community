import React from 'react'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import ProtectedRoute from '@/components/ProtectedRoute'

// Create a simple mock context
const TestAuthProvider = ({ children, value }: { children: React.ReactNode, value: any }) => {
  React.useAuth = () => value
  return <>{children}</>
}

describe('ProtectedRoute - Basic Functionality', () => {
  test('renders loading state', () => {
    const authValue = {
      user: null,
      isAuthenticated: false,
      loading: true,
      sessionRestoring: false,
    }

    render(
      <BrowserRouter>
        <TestAuthProvider value={authValue}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestAuthProvider>
      </BrowserRouter>
    )
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  test('redirects when not authenticated', () => {
    const authValue = {
      user: null,
      isAuthenticated: false,
      loading: false,
      sessionRestoring: false,
    }

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { pathname: '/' },
      writable: true,
    })

    render(
      <BrowserRouter>
        <TestAuthProvider value={authValue}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestAuthProvider>
      </BrowserRouter>
    )
    
    // Should show redirect component (Navigate will change location)
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  test('renders children when authenticated', () => {
    const authValue = {
      user: { id: '1', email: 'test@example.com', role: 'USER' },
      isAuthenticated: true,
      loading: false,
      sessionRestoring: false,
    }

    render(
      <BrowserRouter>
        <TestAuthProvider value={authValue}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestAuthProvider>
      </BrowserRouter>
    )
    
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  test('redirects non-admin for admin routes', () => {
    const authValue = {
      user: { id: '1', email: 'test@example.com', role: 'USER' },
      isAuthenticated: true,
      loading: false,
      sessionRestoring: false,
    }

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { pathname: '/' },
      writable: true,
    })

    render(
      <BrowserRouter>
        <TestAuthProvider value={authValue}>
          <ProtectedRoute role="ADMIN">
            <div>Admin Content</div>
          </ProtectedRoute>
        </TestAuthProvider>
      </BrowserRouter>
    )
    
    // Should not render admin content
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  test('renders admin content for admin users', () => {
    const authValue = {
      user: { id: '1', email: 'admin@example.com', role: 'ADMIN' },
      isAuthenticated: true,
      loading: false,
      sessionRestoring: false,
    }

    render(
      <BrowserRouter>
        <TestAuthProvider value={authValue}>
          <ProtectedRoute role="ADMIN">
            <div>Admin Content</div>
          </ProtectedRoute>
        </TestAuthProvider>
      </BrowserRouter>
    )
    
    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })
})
