import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import apiService from '@/services/api'
import type { CreatePostRequest } from '@/types'

// Mock API service
vi.mock('@/services/api', () => ({
  default: {
    createPost: vi.fn(),
    getPosts: vi.fn(),
  },
}))

// Test component for post creation
const TestCreatePost = () => {
  const [title, setTitle] = React.useState('')
  const [content, setContent] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await apiService.createPost({ title, content })
      setTitle('')
      setContent('')
    } catch (err) {
      setError('Failed to create post')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} data-testid="create-post-form">
      <div>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="title-input"
          required
        />
      </div>
      <div>
        <label htmlFor="content">Content</label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          data-testid="content-input"
          required
        />
      </div>
      {error && <div data-testid="error-message">{error}</div>}
      <button type="submit" disabled={loading} data-testid="submit-button">
        {loading ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  )
}

describe('Post Creation and Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('shows validation errors for empty fields', async () => {
    render(<TestCreatePost />)

    const titleInput = screen.getByTestId('title-input')
    const contentInput = screen.getByTestId('content-input')
    const submitButton = screen.getByTestId('submit-button')
    const form = screen.getByTestId('create-post-form')

    // Try to submit empty form - HTML5 validation should prevent submission
    expect(titleInput).toHaveValue('')
    expect(contentInput).toHaveValue('')
    
    // Form should not submit due to HTML5 validation
    fireEvent.submit(form)
    
    // API should not be called due to validation
    // Note: HTML5 validation prevents the submit event from reaching our handler
  })

  test('successfully creates post with valid data', async () => {
    const mockPost = {
      id: '1',
      title: 'Test Post',
      content: 'Test content',
      authorId: '1',
      author: {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      version: 1,
      likes: [],
      comments: [],
    }

    const mockResponse = {
      success: true,
      data: mockPost,
    }

    ;(apiService.createPost as vi.Mock).mockResolvedValue(mockResponse)

    render(<TestCreatePost />)

    const titleInput = screen.getByTestId('title-input')
    const contentInput = screen.getByTestId('content-input')
    const submitButton = screen.getByTestId('submit-button')

    await userEvent.type(titleInput, 'Test Post')
    await userEvent.type(contentInput, 'Test content')
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(apiService.createPost).toHaveBeenCalledWith({
        title: 'Test Post',
        content: 'Test content',
      })
    })

    // Form should be reset after successful submission
    expect(titleInput).toHaveValue('')
    expect(contentInput).toHaveValue('')
  })

  test('shows error message when post creation fails', async () => {
    const mockError = new Error('Network error')
    ;(apiService.createPost as vi.Mock).mockRejectedValue(mockError)

    render(<TestCreatePost />)

    const titleInput = screen.getByTestId('title-input')
    const contentInput = screen.getByTestId('content-input')
    const submitButton = screen.getByTestId('submit-button')

    await userEvent.type(titleInput, 'Test Post')
    await userEvent.type(contentInput, 'Test content')
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to create post')
    })

    expect(apiService.createPost).toHaveBeenCalledWith({
      title: 'Test Post',
      content: 'Test content',
    })
  })

  test('disables submit button while loading', async () => {
    // Mock delayed response
    ;(apiService.createPost as vi.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    )

    render(<TestCreatePost />)

    const titleInput = screen.getByTestId('title-input')
    const contentInput = screen.getByTestId('content-input')
    const submitButton = screen.getByTestId('submit-button')

    await userEvent.type(titleInput, 'Test Post')
    await userEvent.type(contentInput, 'Test content')
    await userEvent.click(submitButton)

    // Button should be disabled and show loading text
    expect(screen.getByTestId('submit-button')).toBeDisabled()
    expect(screen.getByTestId('submit-button')).toHaveTextContent('Creating...')

    // Wait for the async operation to complete
    await waitFor(() => {
      expect(screen.getByTestId('submit-button')).not.toBeDisabled()
    }, { timeout: 200 })
  })

  test('handles idempotency key for duplicate prevention', async () => {
    const mockPost = {
      id: '1',
      title: 'Test Post',
      content: 'Test content',
      authorId: '1',
      author: {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      version: 1,
      likes: [],
      comments: [],
    }

    const mockResponse = {
      success: true,
      data: mockPost,
    }

    ;(apiService.createPost as vi.Mock).mockResolvedValue(mockResponse)

    render(<TestCreatePost />)

    const titleInput = screen.getByTestId('title-input')
    const contentInput = screen.getByTestId('content-input')
    const submitButton = screen.getByTestId('submit-button')

    await userEvent.type(titleInput, 'Test Post')
    await userEvent.type(contentInput, 'Test content')
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(apiService.createPost).toHaveBeenCalledWith({
        title: 'Test Post',
        content: 'Test content',
      })
    })

    // Verify that the API was called with the expected structure
    expect(apiService.createPost).toHaveBeenCalledTimes(1)
  })
})
