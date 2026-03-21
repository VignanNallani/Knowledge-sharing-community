import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { recommendationService } from '../../../services/recommendationAPI';
import RecommendationCards from '../RecommendationCards';

// Mock the recommendation service
jest.mock('../../../services/recommendationAPI');
jest.mock('../../../services/socket', () => ({
  connected: false,
  connect: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Star: () => <div data-testid="star-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Heart: () => <div data-testid="heart-icon" />,
  MessageCircle: () => <div data-testid="message-circle-icon" />,
  Share2: () => <div data-testid="share2-icon" />,
  Bookmark: () => <div data-testid="bookmark-icon" />,
  X: () => <div data-testid="x-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Award: () => <div data-testid="award-icon" />,
  Target: () => <div data-testid="target-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  ThumbsUp: () => <div data-testid="thumbs-up-icon" />,
  ThumbsDown: () => <div data-testid="thumbs-down-icon" />,
  Loader2: () => <div data-testid="loader2-icon" />
}));

// Mock Link component
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>
}));

const mockRecommendations = [
  {
    id: 1,
    title: 'JavaScript Mentor',
    name: 'John Doe',
    type: 'MENTOR',
    algorithm: 'COLLABORATIVE_FILTERING',
    recommendationScore: 0.85,
    skills: ['JavaScript', 'React', 'Node.js'],
    bio: 'Expert JavaScript developer with 10+ years experience',
    profileImage: 'avatar.jpg',
    _count: {
      followers: 100,
      posts: 50,
      mentorshipsAsMentor: 25
    },
    metadata: {
      skills: ['JavaScript', 'React'],
      experienceLevel: 'ADVANCED',
      availability: true,
      rating: 4.8,
      timeRange: '30d'
    }
  },
  {
    id: 2,
    title: 'React Tutorial',
    content: 'Learn React from scratch with this comprehensive tutorial',
    type: 'POST',
    algorithm: 'CONTENT_BASED',
    recommendationScore: 0.78,
    tags: ['react', 'tutorial', 'javascript'],
    author: {
      id: 3,
      name: 'Jane Smith',
      profileImage: 'avatar2.jpg'
    },
    _count: {
      likes: 150,
      comments: 75,
      bookmarks: 20,
      shares: 10
    },
    metadata: {
      categories: ['Tutorial', 'Guide'],
      timeRange: '30d',
      minEngagement: 10
    }
  },
  {
    id: 3,
    title: 'Node.js Workshop',
    description: 'Hands-on Node.js workshop for beginners',
    type: 'SESSION',
    algorithm: 'SKILL_BASED',
    recommendationScore: 0.92,
    mentor: {
      id: 4,
      name: 'Bob Johnson',
      profileImage: 'avatar3.jpg'
    },
    mentee: {
      id: 5,
      name: 'Alice Brown',
      profileImage: 'avatar4.jpg'
    },
    feedback: {
      rating: 4.9
    },
    duration: 120,
    price: 100,
    scheduledAt: new Date('2024-01-15'),
    completedAt: new Date('2024-01-15'),
    metadata: {
      skills: ['Node.js', 'JavaScript'],
      experienceLevel: 'BEGINNER',
      availability: true,
      rating: 4.9,
      timeRange: '30d'
    }
  }
];

const renderComponent = (props = {}) => {
  const defaultProps = {
    type: 'MENTOR',
    limit: 10,
    filters: {},
    showActions: true,
    showFeedback: true,
    className: ''
  };

  return render(
    <BrowserRouter>
      <RecommendationCards {...defaultProps} {...props} />
    </BrowserRouter>
  );
};

describe('RecommendationCards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      recommendationService.getMentorRecommendations.mockImplementation(() => new Promise(() => {}));
      
      renderComponent();
      
      expect(screen.getByTestId('loader2-icon')).toBeInTheDocument();
    });

    it('should render mentor recommendations correctly', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      
      renderComponent({ type: 'MENTOR' });
      
      await waitFor(() => {
        expect(screen.getByText('JavaScript Mentor')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Expert JavaScript developer with 10+ years experience')).toBeInTheDocument();
        expect(screen.getByText('JavaScript')).toBeInTheDocument();
        expect(screen.getByText('React')).toBeInTheDocument();
        expect(screen.getByText('Node.js')).toBeInTheDocument();
      });
    });

    it('should render post recommendations correctly', async () => {
      recommendationService.getPostRecommendations.mockResolvedValue([mockRecommendations[1]]);
      
      renderComponent({ type: 'POST' });
      
      await waitFor(() => {
        expect(screen.getByText('React Tutorial')).toBeInTheDocument();
        expect(screen.getByText('Learn React from scratch with this comprehensive tutorial')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('#react')).toBeInTheDocument();
        expect(screen.getByText('#tutorial')).toBeInTheDocument();
        expect(screen.getByText('#javascript')).toBeInTheDocument();
      });
    });

    it('should render session recommendations correctly', async () => {
      recommendationService.getSessionRecommendations.mockResolvedValue([mockRecommendations[2]]);
      
      renderComponent({ type: 'SESSION' });
      
      await waitFor(() => {
        expect(screen.getByText('Node.js Workshop')).toBeInTheDocument();
        expect(screen.getByText('Hands-on Node.js workshop for beginners')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
        expect(screen.getByText('Alice Brown')).toBeInTheDocument();
        expect(screen.getByText('120 min')).toBeInTheDocument();
        expect(screen.getByText('$100')).toBeInTheDocument();
      });
    });

    it('should render content recommendations correctly', async () => {
      recommendationService.getContentRecommendations.mockResolvedValue([mockRecommendations[1]]);
      
      renderComponent({ type: 'CONTENT' });
      
      await waitFor(() => {
        expect(screen.getByText('React Tutorial')).toBeInTheDocument();
        expect(screen.getByText('Learn React from scratch with this comprehensive tutorial')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should render trending recommendations correctly', async () => {
      recommendationService.getTrendingRecommendations.mockResolvedValue([mockRecommendations[1]]);
      
      renderComponent({ type: 'TRENDING' });
      
      await waitFor(() => {
        expect(screen.getByText('React Tutorial')).toBeInTheDocument();
        expect(screen.getByText('Learn React from scratch with this comprehensive tutorial')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should render hybrid recommendations correctly', async () => {
      recommendationService.getHybridRecommendations.mockResolvedValue(mockRecommendations);
      
      renderComponent({ type: 'HYBRID' });
      
      await waitFor(() => {
        expect(screen.getByText('JavaScript Mentor')).toBeInTheDocument();
        expect(screen.getByText('React Tutorial')).toBeInTheDocument();
        expect(screen.getByText('Node.js Workshop')).toBeInTheDocument();
      });
    });

    it('should render personalized recommendations correctly', async () => {
      recommendationService.getPersonalizedRecommendations.mockResolvedValue([mockRecommendations[0]]);
      
      renderComponent({ type: 'PERSONALIZED' });
      
      await waitFor(() => {
        expect(screen.getByText('JavaScript Mentor')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should render empty state when no recommendations', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([]);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('No Recommendations Yet')).toBeInTheDocument();
        expect(screen.getByText(/Start following mentors and engaging with content/)).toBeInTheDocument();
      });
    });

    it('should render error state when API fails', async () => {
      recommendationService.getMentorRecommendations.mockRejectedValue(new Error('API Error'));
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText(/Error loading recommendations: API Error/)).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should hide actions when showActions is false', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      
      renderComponent({ showActions: false });
      
      await waitFor(() => {
        expect(screen.queryByTestId('thumbs-up-icon')).not.toBeInTheDocument();
        expect(screen.queryByTestId('thumbs-down-icon')).not.toBeInTheDocument();
        expect(screen.queryByTestId('bookmark-icon')).not.toBeInTheDocument();
        expect(screen.queryByTestId('share2-icon')).not.toBeInTheDocument();
        expect(screen.queryByTestId('x-icon')).not.toBeInTheDocument();
      });
    });

    it('should hide feedback when showFeedback is false', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      
      renderComponent({ showFeedback: false });
      
      await waitFor(() => {
        expect(screen.queryByTestId('thumbs-up-icon')).not.toBeInTheDocument();
        expect(screen.queryByTestId('thumbs-down-icon')).not.toBeInTheDocument();
        expect(screen.queryByTestId('bookmark-icon')).not.toBeInTheDocument();
        expect(screen.queryByTestId('share2-icon')).not.toBeInTheDocument();
      });
    });

    it('should apply custom className', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      
      renderComponent({ className: 'custom-class' });
      
      await waitFor(() => {
        const container = screen.getByText('JavaScript Mentor').closest('.custom-class');
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('API Calls', () => {
    it('should call correct API method for mentor recommendations', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      
      renderComponent({ type: 'MENTOR', limit: 5, filters: { skills: ['JavaScript'] } });
      
      await waitFor(() => {
        expect(recommendationService.getMentorRecommendations).toHaveBeenCalledWith(5, { skills: ['JavaScript'] });
      });
    });

    it('should call correct API method for session recommendations', async () => {
      recommendationService.getSessionRecommendations.mockResolvedValue([mockRecommendations[2]]);
      
      renderComponent({ type: 'SESSION', limit: 8, filters: { rating: 4.5 } });
      
      await waitFor(() => {
        expect(recommendationService.getSessionRecommendations).toHaveBeenCalledWith(8, { rating: 4.5 });
      });
    });

    it('should call correct API method for post recommendations', async () => {
      recommendationService.getPostRecommendations.mockResolvedValue([mockRecommendations[1]]);
      
      renderComponent({ type: 'POST', limit: 12, filters: { categories: ['Tutorial'] } });
      
      await waitFor(() => {
        expect(recommendationService.getPostRecommendations).toHaveBeenCalledWith(12, { categories: ['Tutorial'] });
      });
    });

    it('should call correct API method for content recommendations', async () => {
      recommendationService.getContentRecommendations.mockResolvedValue([mockRecommendations[1]]);
      
      renderComponent({ type: 'CONTENT', limit: 15, filters: { minQuality: 0.8 } });
      
      await waitFor(() => {
        expect(recommendationService.getContentRecommendations).toHaveBeenCalledWith(15, { minQuality: 0.8 });
      });
    });

    it('should call correct API method for trending recommendations', async () => {
      recommendationService.getTrendingRecommendations.mockResolvedValue([mockRecommendations[1]]);
      
      renderComponent({ type: 'TRENDING', limit: 10, filters: { timeRange: '7d' } });
      
      await waitFor(() => {
        expect(recommendationService.getTrendingRecommendations).toHaveBeenCalledWith(10, { timeRange: '7d' });
      });
    });

    it('should call correct API method for hybrid recommendations', async () => {
      recommendationService.getHybridRecommendations.mockResolvedValue(mockRecommendations);
      
      renderComponent({ type: 'HYBRID', limit: 20, filters: { skills: ['JavaScript'] } });
      
      await waitFor(() => {
        expect(recommendationService.getHybridRecommendations).toHaveBeenCalledWith(20, { skills: ['JavaScript'] });
      });
    });

    it('should call correct API method for personalized recommendations', async () => {
      recommendationService.getPersonalizedRecommendations.mockResolvedValue([mockRecommendations[0]]);
      
      renderComponent({ type: 'PERSONALIZED', limit: 10, filters: { categories: ['Tutorial'] } });
      
      await waitFor(() => {
        expect(recommendationService.getPersonalizedRecommendations).toHaveBeenCalledWith(10, { categories: ['Tutorial'] });
      });
    });

    it('should refetch when filters change', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      
      const { rerender } = renderComponent({ type: 'MENTOR', filters: { skills: ['JavaScript'] } });
      
      await waitFor(() => {
        expect(recommendationService.getMentorRecommendations).toHaveBeenCalledWith(10, { skills: ['JavaScript'] });
      });
      
      rerender(
        <BrowserRouter>
          <RecommendationCards type="MENTOR" filters={{ skills: ['React'] }} />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(recommendationService.getMentorRecommendations).toHaveBeenCalledWith(10, { skills: ['React'] });
      });
    });

    it('should refetch when limit changes', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      
      const { rerender } = renderComponent({ type: 'MENTOR', limit: 5 });
      
      await waitFor(() => {
        expect(recommendationService.getMentorRecommendations).toHaveBeenCalledWith(5, {});
      });
      
      rerender(
        <BrowserRouter>
          <RecommendationCards type="MENTOR" limit={10} />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(recommendationService.getMentorRecommendations).toHaveBeenCalledWith(10, {});
      });
    });
  });

  describe('User Interactions', () => {
    it('should handle dismiss action', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      recommendationService.dismissRecommendation.mockResolvedValue({});
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('JavaScript Mentor')).toBeInTheDocument();
      });
      
      const dismissButton = screen.getByTestId('x-icon');
      fireEvent.click(dismissButton);
      
      await waitFor(() => {
        expect(recommendationService.dismissRecommendation).toHaveBeenCalledWith(1);
      });
    });

    it('should handle like feedback', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      recommendationService.addFeedback.mockResolvedValue({});
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('JavaScript Mentor')).toBeInTheDocument();
      });
      
      const likeButton = screen.getByTestId('thumbs-up-icon');
      fireEvent.click(likeButton);
      
      await waitFor(() => {
        expect(recommendationService.addFeedback).toHaveBeenCalledWith(1, 'LIKE');
      });
    });

    it('should handle dislike feedback', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      recommendationService.addFeedback.mockResolvedValue({});
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('JavaScript Mentor')).toBeInTheDocument();
      });
      
      const dislikeButton = screen.getByTestId('thumbs-down-icon');
      fireEvent.click(dislikeButton);
      
      await waitFor(() => {
        expect(recommendationService.addFeedback).toHaveBeenCalledWith(1, 'DISLIKE');
      });
    });

    it('should handle bookmark feedback', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      recommendationService.addFeedback.mockResolvedValue({});
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('JavaScript Mentor')).toBeInTheDocument();
      });
      
      const bookmarkButton = screen.getByTestId('bookmark-icon');
      fireEvent.click(bookmarkButton);
      
      await waitFor(() => {
        expect(recommendationService.addFeedback).toHaveBeenCalledWith(1, 'BOOKMARK');
      });
    });

    it('should handle share feedback', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      recommendationService.addFeedback.mockResolvedValue({});
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('JavaScript Mentor')).toBeInTheDocument();
      });
      
      const shareButton = screen.getByTestId('share2-icon');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(recommendationService.addFeedback).toHaveBeenCalledWith(1, 'SHARE');
      });
    });

    it('should handle click tracking', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      recommendationService.markRecommendationClicked.mockResolvedValue({});
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('JavaScript Mentor')).toBeInTheDocument();
      });
      
      const link = screen.getByText('JavaScript Mentor');
      fireEvent.click(link);
      
      await waitFor(() => {
        expect(recommendationService.markRecommendationClicked).toHaveBeenCalledWith(1);
      });
    });

    it('should handle retry on error', async () => {
      recommendationService.getMentorRecommendations
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce([mockRecommendations[0]]);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText(/Error loading recommendations: API Error/)).toBeInTheDocument();
      });
      
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(recommendationService.getMentorRecommendations).toHaveBeenCalledTimes(2);
        expect(screen.getByText('JavaScript Mentor')).toBeInTheDocument();
      });
    });
  });

  describe('Socket Integration', () => {
    it('should connect to socket on mount', () => {
      const mockSocket = require('../../../services/socket');
      
      renderComponent();
      
      expect(mockSocket.connect).toHaveBeenCalled();
    });

    it('should set up socket listeners', () => {
      const mockSocket = require('../../../services/socket');
      
      renderComponent();
      
      expect(mockSocket.on).toHaveBeenCalledWith('recommendation_updated', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('recommendation_dismissed', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('recommendation_clicked', expect.any(Function));
    });

    it('should clean up socket listeners on unmount', () => {
      const mockSocket = require('../../../services/socket');
      
      const { unmount } = renderComponent();
      
      unmount();
      
      expect(mockSocket.off).toHaveBeenCalledWith('recommendation_updated', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('recommendation_dismissed', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('recommendation_clicked', expect.any(Function));
    });
  });

  describe('Data Display', () => {
    it('should display recommendation score correctly', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('85%')).toBeInTheDocument();
      });
    });

    it('should display algorithm badge correctly', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('COLLABORATIVE FILTERING')).toBeInTheDocument();
      });
    });

    it('should display skills correctly', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('JavaScript')).toBeInTheDocument();
        expect(screen.getByText('React')).toBeInTheDocument();
        expect(screen.getByText('Node.js')).toBeInTheDocument();
      });
    });

    it('should display engagement metrics correctly', async () => {
      recommendationService.getPostRecommendations.mockResolvedValue([mockRecommendations[1]]);
      
      renderComponent({ type: 'POST' });
      
      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument(); // likes
        expect(screen.getByText('75')).toBeInTheDocument(); // comments
        expect(screen.getByText('20')).toBeInTheDocument(); // bookmarks
        expect(screen.getByText('10')).toBeInTheDocument(); // shares
      });
    });

    it('should display session details correctly', async () => {
      recommendationService.getSessionRecommendations.mockResolvedValue([mockRecommendations[2]]);
      
      renderComponent({ type: 'SESSION' });
      
      await waitFor(() => {
        expect(screen.getByText('120 min')).toBeInTheDocument();
        expect(screen.getByText('$100')).toBeInTheDocument();
        expect(screen.getByText('4.9')).toBeInTheDocument(); // rating
      });
    });

    it('should display author information correctly', async () => {
      recommendationService.getPostRecommendations.mockResolvedValue([mockRecommendations[1]]);
      
      renderComponent({ type: 'POST' });
      
      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should display mentor information correctly', async () => {
      recommendationService.getSessionRecommendations.mockResolvedValue([mockRecommendations[2]]);
      
      renderComponent({ type: 'SESSION' });
      
      await waitFor(() => {
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
        expect(screen.getByText('Alice Brown')).toBeInTheDocument();
      });
    });

    it('should truncate long content correctly', async () => {
      const longContent = {
        ...mockRecommendations[1],
        content: 'This is a very long content that should be truncated properly to fit within the component design and maintain readability while showing only the most important information to the user.'
      };
      
      recommendationService.getPostRecommendations.mockResolvedValue([longContent]);
      
      renderComponent({ type: 'POST' });
      
      await waitFor(() => {
        const contentElement = screen.getByText(/This is a very long content/);
        expect(contentElement).toBeInTheDocument();
        // Check if content is truncated (should have line-clamp class)
        expect(contentElement).toHaveClass('line-clamp-2');
      });
    });

    it('should display tags correctly', async () => {
      recommendationService.getPostRecommendations.mockResolvedValue([mockRecommendations[1]]);
      
      renderComponent({ type: 'POST' });
      
      await waitFor(() => {
        expect(screen.getByText('#react')).toBeInTheDocument();
        expect(screen.getByText('#tutorial')).toBeInTheDocument();
        expect(screen.getByText('#javascript')).toBeInTheDocument();
      });
    });

    it('should display follower count correctly', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument(); // followers
      });
    });

    it('should display post count correctly', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('50')).toBeInTheDocument(); // posts
      });
    });

    it('should display mentorship count correctly', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument(); // mentorships
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      recommendationService.getMentorRecommendations.mockRejectedValue(new Error('Network Error'));
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText(/Error loading recommendations: Network Error/)).toBeInTheDocument();
      });
    });

    it('should handle dismiss errors gracefully', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      recommendationService.dismissRecommendation.mockRejectedValue(new Error('Dismiss Error'));
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('JavaScript Mentor')).toBeInTheDocument();
      });
      
      const dismissButton = screen.getByTestId('x-icon');
      fireEvent.click(dismissButton);
      
      // Should not crash the component
      await waitFor(() => {
        expect(screen.getByText('JavaScript Mentor')).toBeInTheDocument();
      });
    });

    it('should handle feedback errors gracefully', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      recommendationService.addFeedback.mockRejectedValue(new Error('Feedback Error'));
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('JavaScript Mentor')).toBeInTheDocument();
      });
      
      const likeButton = screen.getByTestId('thumbs-up-icon');
      fireEvent.click(likeButton);
      
      // Should not crash the component
      await waitFor(() => {
        expect(screen.getByText('JavaScript Mentor')).toBeInTheDocument();
      });
    });

    it('should handle click tracking errors gracefully', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      recommendationService.markRecommendationClicked.mockRejectedValue(new Error('Click Error'));
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('JavaScript Mentor')).toBeInTheDocument();
      });
      
      const link = screen.getByText('JavaScript Mentor');
      fireEvent.click(link);
      
      // Should not crash the component
      await waitFor(() => {
        expect(screen.getByText('JavaScript Mentor')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      
      renderComponent();
      
      await waitFor(() => {
        const dismissButton = screen.getByTestId('x-icon').closest('button');
        expect(dismissButton).toHaveAttribute('title', 'Dismiss recommendation');
      });
    });

    it('should have proper link structure', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      
      renderComponent();
      
      await waitFor(() => {
        const link = screen.getByText('JavaScript Mentor');
        expect(link).toHaveAttribute('href', '/profile/1');
      });
    });

    it('should have proper button structure for actions', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      
      renderComponent();
      
      await waitFor(() => {
        const likeButton = screen.getByTestId('thumbs-up-icon').closest('button');
        expect(likeButton).toBeInTheDocument();
        
        const dismissButton = screen.getByTestId('x-icon').closest('button');
        expect(dismissButton).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should not make unnecessary API calls', async () => {
      recommendationService.getMentorRecommendations.mockResolvedValue([mockRecommendations[0]]);
      
      renderComponent();
      
      await waitFor(() => {
        expect(recommendationService.getMentorRecommendations).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle large recommendation lists efficiently', async () => {
      const largeRecommendations = Array.from({ length: 50 }, (_, index) => ({
        ...mockRecommendations[0],
        id: index + 1,
        title: `Mentor ${index + 1}`
      }));
      
      recommendationService.getMentorRecommendations.mockResolvedValue(largeRecommendations);
      
      renderComponent({ limit: 50 });
      
      await waitFor(() => {
        expect(screen.getByText('Mentor 1')).toBeInTheDocument();
        expect(screen.getByText('Mentor 50')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing profile image', async () => {
      const recommendationWithoutImage = {
        ...mockRecommendations[0],
        profileImage: null
      };
      
      recommendationService.getMentorRecommendations.mockResolvedValue([recommendationWithoutImage]);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('JavaScript Mentor')).toBeInTheDocument();
        // Should use default avatar
        const image = screen.getByAltText('John Doe');
        expect(image).toHaveAttribute('src', '/images/default-avatar.png');
      });
    });

    it('should handle missing skills', async () => {
      const recommendationWithoutSkills = {
        ...mockRecommendations[0],
        skills: null
      };
      
      recommendationService.getMentorRecommendations.mockResolvedValue([recommendationWithoutSkills]);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('JavaScript Mentor')).toBeInTheDocument();
        expect(screen.queryByText('JavaScript')).not.toBeInTheDocument();
      });
    });

    it('should handle missing bio', async () => {
      const recommendationWithoutBio = {
        ...mockRecommendations[0],
        bio: null
      };
      
      recommendationService.getMentorRecommendations.mockResolvedValue([recommendationWithoutBio]);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('JavaScript Mentor')).toBeInTheDocument();
        expect(screen.queryByText(/Expert JavaScript developer/)).not.toBeInTheDocument();
      });
    });

    it('should handle missing counts', async () => {
      const recommendationWithoutCounts = {
        ...mockRecommendations[0],
        _count: null
      };
      
      recommendationService.getMentorRecommendations.mockResolvedValue([recommendationWithoutCounts]);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('JavaScript Mentor')).toBeInTheDocument();
        expect(screen.queryByText('100')).not.toBeInTheDocument();
      });
    });

    it('should handle missing feedback', async () => {
      const recommendationWithoutFeedback = {
        ...mockRecommendations[2],
        feedback: null
      };
      
      recommendationService.getSessionRecommendations.mockResolvedValue([recommendationWithoutFeedback]);
      
      renderComponent({ type: 'SESSION' });
      
      await waitFor(() => {
        expect(screen.getByText('Node.js Workshop')).toBeInTheDocument();
        expect(screen.queryByText('4.9')).not.toBeInTheDocument();
      });
    });

    it('should handle missing metadata', async () => {
      const recommendationWithoutMetadata = {
        ...mockRecommendations[0],
        metadata: null
      };
      
      recommendationService.getMentorRecommendations.mockResolvedValue([recommendationWithoutMetadata]);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('JavaScript Mentor')).toBeInTheDocument();
        // Should still render without crashing
      });
    });

    it('should handle zero recommendation score', async () => {
      const recommendationWithZeroScore = {
        ...mockRecommendations[0],
        recommendationScore: 0
      };
      
      recommendationService.getMentorRecommendations.mockResolvedValue([recommendationWithZeroScore]);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('0%')).toBeInTheDocument();
      });
    });

    it('should handle negative recommendation score', async () => {
      const recommendationWithNegativeScore = {
        ...mockRecommendations[0],
        recommendationScore: -0.5
      };
      
      recommendationService.getMentorRecommendations.mockResolvedValue([recommendationWithNegativeScore]);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('-50%')).toBeInTheDocument();
      });
    });

    it('should handle very high recommendation score', async () => {
      const recommendationWithHighScore = {
        ...mockRecommendations[0],
        recommendationScore: 2.5
      };
      
      recommendationService.getMentorRecommendations.mockResolvedValue([recommendationWithHighScore]);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('250%')).toBeInTheDocument();
      });
    });
  });
});
