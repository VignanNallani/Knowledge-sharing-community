import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TrendingPosts from '../TrendingPosts';
import * as searchAPI from '../../../services/searchAPI';

// Mock the API
jest.mock('../../../services/searchAPI');

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  TrendingUp: () => <div data-testid="trending-icon">Trending</div>,
  Heart: () => <div data-testid="heart-icon">Heart</div>,
  MessageCircle: () => <div data-testid="message-icon">Message</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  User: () => <div data-testid="user-icon">User</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  ArrowUp: () => <div data-testid="arrow-up-icon">Up</div>,
  ArrowDown: () => <div data-testid="arrow-down-icon">Down</div>,
  Minus: () => <div data-testid="minus-icon">Minus</div>,
  Eye: () => <div data-testid="eye-icon">Eye</div>,
}));

describe('TrendingPosts', () => {
  const mockPosts = [
    {
      id: 1,
      title: 'React Tutorial',
      content: 'Learn React basics and advanced concepts',
      image: 'https://example.com/react.jpg',
      author: {
        id: 1,
        name: 'John Doe',
        profileImage: 'https://example.com/john.jpg'
      },
      tags: [
        { name: 'react' },
        { name: 'javascript' }
      ],
      _count: {
        likes: 150,
        comments: 25
      },
      viewCount: 1000,
      trendingScore: 85.5,
      createdAt: new Date('2024-01-15T10:00:00Z')
    },
    {
      id: 2,
      title: 'JavaScript Best Practices',
      content: 'Essential JavaScript patterns and practices',
      image: null,
      author: {
        id: 2,
        name: 'Jane Smith',
        profileImage: null
      },
      tags: [
        { name: 'javascript' },
        { name: 'programming' }
      ],
      _count: {
        likes: 200,
        comments: 40
      },
      viewCount: 1500,
      trendingScore: 92.3,
      createdAt: new Date('2024-01-14T15:30:00Z')
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses
    searchAPI.getTrendingPosts.mockResolvedValue({
      posts: mockPosts,
      count: mockPosts.length
    });
  });

  const renderComponent = (props = {}) => {
    return render(
      <BrowserRouter>
        <TrendingPosts {...props} />
      </BrowserRouter>
    );
  };

  test('renders trending posts header', () => {
    renderComponent();
    
    expect(screen.getByText('Trending Posts')).toBeInTheDocument();
    expect(screen.getByTestId('trending-icon')).toBeInTheDocument();
  });

  test('renders trending posts list', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('React Tutorial')).toBeInTheDocument();
      expect(screen.getByText('JavaScript Best Practices')).toBeInTheDocument();
    });
  });

  test('renders post cards with correct information', async () => {
    renderComponent();
    
    await waitFor(() => {
      // Check first post
      expect(screen.getByText('React Tutorial')).toBeInTheDocument();
      expect(screen.getByText('Learn React basics and advanced concepts')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument(); // likes
      expect(screen.getByText('25')).toBeInTheDocument(); // comments
      expect(screen.getByText('1.0K')).toBeInTheDocument(); // views
    });
  });

  test('renders ranking badges', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
    });
  });

  test('renders trending scores', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('86')).toBeInTheDocument(); // rounded 85.5
      expect(screen.getByText('92')).toBeInTheDocument(); // rounded 92.3
    });
  });

  test('handles time filter change', async () => {
    renderComponent();
    
    const timeFilter = screen.getByDisplayValue('This Week');
    fireEvent.change(timeFilter, { target: { value: 'today' } });
    
    await waitFor(() => {
      expect(searchAPI.getTrendingPosts).toHaveBeenCalledWith(10);
    });
  });

  test('handles sort filter change', async () => {
    renderComponent();
    
    const sortFilter = screen.getByDisplayValue('Trending');
    fireEvent.change(sortFilter, { target: { value: 'likes' } });
    
    await waitFor(() => {
      expect(searchAPI.getTrendingPosts).toHaveBeenCalledWith(10);
    });
  });

  test('renders loading state', () => {
    searchAPI.getTrendingPosts.mockImplementation(() => new Promise(() => {}));
    
    renderComponent();
    
    // Should show loading skeleton
    expect(screen.getAllByRole('status')).toHaveLength(10); // 10 skeleton cards
  });

  test('renders error state', async () => {
    searchAPI.getTrendingPosts.mockRejectedValue(new Error('API Error'));
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Unable to Load Trending Posts')).toBeInTheDocument();
      expect(screen.getByText('Failed to load trending posts')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  test('handles retry on error', async () => {
    searchAPI.getTrendingPosts
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce({ posts: mockPosts, count: mockPosts.length });
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
    
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);
    
    await waitFor(() => {
      expect(screen.getByText('React Tutorial')).toBeInTheDocument();
    });
  });

  test('renders empty state', async () => {
    searchAPI.getTrendingPosts.mockResolvedValue({ posts: [], count: 0 });
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('No Trending Posts')).toBeInTheDocument();
      expect(screen.getByText('Check back later for trending content')).toBeInTheDocument();
    });
  });

  test('renders posts without images', async () => {
    renderComponent();
    
    await waitFor(() => {
      // Second post has no image, should still render
      expect(screen.getByText('JavaScript Best Practices')).toBeInTheDocument();
    });
  });

  test('renders tags correctly', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('javascript')).toBeInTheDocument();
      expect(screen.getByText('programming')).toBeInTheDocument();
    });
  });

  test('renders author avatars', async () => {
    renderComponent();
    
    await waitFor(() => {
      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(2); // Two author avatars
    });
  });

  test('handles limit prop', async () => {
    renderComponent({ limit: 5 });
    
    await waitFor(() => {
      expect(searchAPI.getTrendingPosts).toHaveBeenCalledWith(5);
    });
  });

  test('renders engagement metrics', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
      expect(screen.getByTestId('message-icon')).toBeInTheDocument();
      expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
    });
  });

  test('renders time ago correctly', async () => {
    renderComponent();
    
    await waitFor(() => {
      // Should show time ago for posts
      expect(screen.getByText(/ago$/)).toBeInTheDocument();
    });
  });

  test('renders load more button when posts exist', async () => {
    renderComponent({ limit: 1 });
    
    await waitFor(() => {
      expect(screen.getByText('Load More Trending Posts')).toBeInTheDocument();
    });
  });

  test('formats large numbers correctly', async () => {
    const mockPostsWithLargeNumbers = [
      {
        ...mockPosts[0],
        _count: { likes: 1500000, comments: 25000 },
        viewCount: 10000000
      }
    ];
    
    searchAPI.getTrendingPosts.mockResolvedValue({
      posts: mockPostsWithLargeNumbers,
      count: 1
    });
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('1.5M')).toBeInTheDocument(); // likes
      expect(screen.getByText('25.0K')).toBeInTheDocument(); // comments
      expect(screen.getByText('10.0M')).toBeInTheDocument(); // views
    });
  });
});
