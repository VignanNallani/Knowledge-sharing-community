import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Trophy, TrendingUp, Users, Award } from 'lucide-react';
import LeaderboardsPage from '../LeaderboardsPage';

// Mock dependencies
jest.mock('../../services/gamificationAPI');
jest.mock('../../services/socket', () => ({
  __esModule: true,
  default: {
    connected: false,
    connect: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

describe('LeaderboardsPage Component', () => {
  const mockLeaderboardData = [
    {
      rank: 1,
      score: 1000,
      user: {
        id: 1,
        name: 'John Doe',
        profileImage: 'john.jpg'
      },
      userPoints: {
        level: 10,
        totalPointsEarned: 1000
      }
    },
    {
      rank: 2,
      score: 850,
      user: {
        id: 2,
        name: 'Jane Smith',
        profileImage: 'jane.jpg'
      },
      userPoints: {
        level: 9,
        totalPointsEarned: 850
      }
    },
    {
      rank: 3,
      score: 750,
      user: {
        id: 3,
        name: 'Bob Johnson',
        profileImage: 'bob.jpg'
      },
      userPoints: {
        level: 8,
        totalPointsEarned: 750
      }
    }
  ];

  const mockUserRank = {
    rankPosition: 5,
    totalUsers: 100,
    score: 500,
    leaderboardName: 'Global Points'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('1');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    it('should render leaderboards page', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('Leaderboards')).toBeInTheDocument();
        expect(screen.getByText('Global Points')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      });
    });

    it('should render user rank information', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('Your Rank')).toBeInTheDocument();
        expect(screen.getByText('#5')).toBeInTheDocument();
        expect(screen.getByText('of 100')).toBeInTheDocument();
        expect(screen.getByText('500 points')).toBeInTheDocument();
      });
    });

    it('should render different leaderboard types', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('Global Points')).toBeInTheDocument();
        expect(screen.getByText('Weekly Points')).toBeInTheDocument();
        expect(screen.getByText('Monthly Points')).toBeInTheDocument();
        expect(screen.getByText('Skill Based')).toBeInTheDocument();
      });
    });

    it('should render empty state when no leaderboard data', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockResolvedValue([]);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(null);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText(/No leaderboard data available/)).toBeInTheDocument();
        expect(screen.getByText(/Check back later for updates/)).toBeInTheDocument();
      });
    });

    it('should render loading state', () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockImplementation(() => new Promise(() => {}));
      gamificationAPI.getUserLeaderboardRank.mockImplementation(() => new Promise(() => {}));

      render(<LeaderboardsPage />);

      expect(screen.getByTestId('leaderboards-loading')).toBeInTheDocument();
    });

    it('should render error state', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockRejectedValue(new Error('API Error'));
      gamificationAPI.getUserLeaderboardRank.mockRejectedValue(new Error('API Error'));

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load leaderboards/)).toBeInTheDocument();
      });
    });

    it('should render skill-based leaderboard with skill filter', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('Leaderboards')).toBeInTheDocument();
      });

      // Select skill-based leaderboard
      fireEvent.click(screen.getByText('Skill Based'));

      await waitFor(() => {
        expect(screen.getByText('Select Skill')).toBeInTheDocument();
        expect(screen.getByText('JavaScript')).toBeInTheDocument();
        expect(screen.getByText('React')).toBeInTheDocument();
      });
    });

    it('should render time range selector', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('All Time')).toBeInTheDocument();
        expect(screen.getByText('This Week')).toBeInTheDocument();
        expect(screen.getByText('This Month')).toBeInTheDocument();
      });
    });
  });

  describe('Socket Integration', () => {
    it('should connect to socket when not connected', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);
      socket.connected = false;

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(socket.connect).toHaveBeenCalled();
      });
    });

    it('should not connect to socket when already connected', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);
      socket.connected = true;

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(socket.connect).not.toHaveBeenCalled();
      });
    });

    it('should handle leaderboard updates from socket', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'leaderboard_updated') {
          socketEventHandler = handler;
        }
      });

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Simulate leaderboard update
      socketEventHandler({ userId: 4 });

      await waitFor(() => {
        expect(screen.getByTestId('leaderboard-refresh-indicator')).toBeInTheDocument();
      });
    });

    it('should clean up socket events on unmount', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);
      socket.connected = true;

      const { unmount } = render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      unmount();

      expect(socket.off).toHaveBeenCalledWith('leaderboard_updated', expect.any(Function));
    });
  });

  describe('Leaderboard Interactions', () => {
    it('should switch between leaderboard types', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('Global Points')).toBeInTheDocument();
      });

      // Switch to weekly leaderboard
      fireEvent.click(screen.getByText('Weekly Points'));

      await waitFor(() => {
        expect(gamificationAPI.getLeaderboard).toHaveBeenCalledWith('WEEKLY', undefined, 50);
        expect(gamificationAPI.getUserLeaderboardRank).toHaveBeenCalledWith(1, 'WEEKLY', undefined);
      });
    });

    it('should filter by skill for skill-based leaderboard', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('Leaderboards')).toBeInTheDocument();
      });

      // Select skill-based leaderboard
      fireEvent.click(screen.getByText('Skill Based'));
      fireEvent.click(screen.getByText('JavaScript'));

      await waitFor(() => {
        expect(gamificationAPI.getLeaderboard).toHaveBeenCalledWith('SKILL_BASED', 'javascript', 50);
        expect(gamificationAPI.getUserLeaderboardRank).toHaveBeenCalledWith(1, 'SKILL_BASED', 'javascript');
      });
    });

    it('should change time range', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('Leaderboards')).toBeInTheDocument();
      });

      // Change time range to weekly
      fireEvent.click(screen.getByText('This Week'));

      await waitFor(() => {
        expect(gamificationAPI.getLeaderboard).toHaveBeenCalledWith('GLOBAL', undefined, 50);
      });
    });

    it('should search users in leaderboard', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Search for user
      const searchInput = screen.getByPlaceholderText('Search users...');
      fireEvent.change(searchInput, { target: { value: 'Jane' } });

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      });
    });

    it('should refresh leaderboard', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard
        .mockResolvedValueOnce(mockLeaderboardData)
        .mockResolvedValueOnce([
          ...mockLeaderboardData,
          {
            rank: 4,
            score: 600,
            user: { id: 4, name: 'Alice Brown', profileImage: 'alice.jpg' },
            userPoints: { level: 7, totalPointsEarned: 600 }
          }
        ]);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click refresh button
      fireEvent.click(screen.getByRole('button', { name: /Refresh/ }));

      await waitFor(() => {
        expect(screen.getByText('Alice Brown')).toBeInTheDocument();
      });

      expect(gamificationAPI.getLeaderboard).toHaveBeenCalledTimes(2);
    });

    it('should show/hide filters', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('Leaderboards')).toBeInTheDocument();
      });

      // Show filters
      fireEvent.click(screen.getByRole('button', { name: /Filters/ }));

      await waitFor(() => {
        expect(screen.getByText('Skill Filter')).toBeInTheDocument();
        expect(screen.getByText('Time Range')).toBeInTheDocument();
      });

      // Hide filters
      fireEvent.click(screen.getByRole('button', { name: /Filters/ }));

      await waitFor(() => {
        expect(screen.queryByText('Skill Filter')).not.toBeInTheDocument();
      });
    });
  });

  describe('User Rankings', () => {
    it('should highlight current user in leaderboard', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const leaderboardWithCurrentUser = [
        ...mockLeaderboardData,
        {
          rank: 5,
          score: 500,
          user: {
            id: 1, // Current user
            name: 'You',
            profileImage: 'user.jpg'
          },
          userPoints: {
            level: 6,
            totalPointsEarned: 500
          }
        }
      ];

      gamificationAPI.getLeaderboard.mockResolvedValue(leaderboardWithCurrentUser);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        const currentUserRow = screen.getByTestId('leaderboard-row-1');
        expect(currentUserRow).toHaveClass('current-user');
      });
    });

    it('should show rank changes', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const leaderboardWithRankChanges = [
        {
          rank: 1,
          score: 1000,
          previousRank: 2,
          user: {
            id: 1,
            name: 'John Doe',
            profileImage: 'john.jpg'
          },
          userPoints: {
            level: 10,
            totalPointsEarned: 1000
          }
        },
        {
          rank: 2,
          score: 850,
          previousRank: 1,
          user: {
            id: 2,
            name: 'Jane Smith',
            profileImage: 'jane.jpg'
          },
          userPoints: {
            level: 9,
            totalPointsEarned: 850
          }
        }
      ];

      gamificationAPI.getLeaderboard.mockResolvedValue(leaderboardWithRankChanges);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('rank-up-1')).toBeInTheDocument(); // John moved up
        expect(screen.getByTestId('rank-down-2')).toBeInTheDocument(); // Jane moved down
      });
    });

    it('should show no rank change indicator', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const leaderboardWithNoRankChange = [
        {
          rank: 1,
          score: 1000,
          previousRank: 1,
          user: {
            id: 1,
            name: 'John Doe',
            profileImage: 'john.jpg'
          },
          userPoints: {
            level: 10,
            totalPointsEarned: 1000
          }
        }
      ];

      gamificationAPI.getLeaderboard.mockResolvedValue(leaderboardWithNoRankChange);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('rank-same-1')).toBeInTheDocument();
      });
    });
  });

  describe('Animations', () => {
    it('should show refresh animation', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click refresh button
      fireEvent.click(screen.getByRole('button', { name: /Refresh/ }));

      await waitFor(() => {
        expect(screen.getByTestId('refresh-animation')).toBeInTheDocument();
      });
    });

    it('should show rank change animations', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'leaderboard_updated') {
          socketEventHandler = handler;
        }
      });

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      socketEventHandler({ userId: 1 });

      await waitFor(() => {
        expect(screen.getByTestId('rank-change-animation')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText('Leaderboards')).toBeInTheDocument();
        expect(screen.getByLabelText('Leaderboard type selector')).toBeInTheDocument();
        expect(screen.getByLabelText('User rank')).toBeInTheDocument();
      });
    });

    it('should be keyboard navigable', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        const leaderboardTabs = screen.getAllByRole('tab');
        leaderboardTabs.forEach(tab => {
          expect(tab).toHaveAttribute('tabIndex', '0');
        });
      });
    });

    it('should announce leaderboard updates to screen readers', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'leaderboard_updated') {
          socketEventHandler = handler;
        }
      });

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      socketEventHandler({ userId: 1 });

      await waitFor(() => {
        const announcement = screen.getByRole('status');
        expect(announcement).toHaveTextContent(/Leaderboard updated/);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockRejectedValue(new Error('Network error'));
      gamificationAPI.getUserLeaderboardRank.mockRejectedValue(new Error('Network error'));

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load leaderboards/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
      });
    });

    it('should retry on error button click', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockUserRank);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load leaderboards/)).toBeInTheDocument();
      });

      // Click retry button
      fireEvent.click(screen.getByRole('button', { name: /Retry/ }));

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(gamificationAPI.getLeaderboard).toHaveBeenCalledTimes(2);
    });

    it('should handle socket errors gracefully', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);
      socket.connect.mockImplementation(() => {
        throw new Error('Socket connection failed');
      });

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Should still render leaderboards despite socket error
      expect(screen.queryByText(/Socket error/)).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile screen size', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);

      // Mock mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const container = screen.getByTestId('leaderboards-page');
      expect(container).toHaveClass('mobile-optimized');
    });

    it('should adapt to tablet screen size', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);

      // Mock tablet viewport
      global.innerWidth = 768;
      global.innerHeight = 1024;

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const container = screen.getByTestId('leaderboards-page');
      expect(container).toHaveClass('tablet-optimized');
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);

      const { rerender } = render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Rerender with same props
      rerender(<LeaderboardsPage />);

      // Should not trigger new API calls
      expect(gamificationAPI.getLeaderboard).toHaveBeenCalledTimes(1);
      expect(gamificationAPI.getUserLeaderboardRank).toHaveBeenCalledTimes(1);
    });

    it('should debounce rapid filter changes', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Rapid filter changes
      fireEvent.click(screen.getByText('Weekly Points'));
      fireEvent.click(screen.getByText('Monthly Points'));
      fireEvent.click(screen.getByText('Global Points'));

      // Should only apply final filter due to debouncing
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing userId in localStorage', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(null);
      
      localStorageMock.getItem.mockReturnValue(null);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(gamificationAPI.getUserLeaderboardRank).toHaveBeenCalledWith(null, 'GLOBAL', undefined);
    });

    it('should handle invalid leaderboard data', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const invalidLeaderboardData = [
        {
          rank: null,
          score: 'invalid',
          user: {
            id: 1,
            name: null,
            profileImage: undefined
          },
          userPoints: {
            level: 'invalid',
            totalPointsEarned: null
          }
        }
      ];

      gamificationAPI.getLeaderboard.mockResolvedValue(invalidLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(null);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('Unknown User')).toBeInTheDocument();
        expect(screen.getByText('0 points')).toBeInTheDocument();
        expect(screen.getByText('Level 1')).toBeInTheDocument();
      });
    });

    it('should handle very large leaderboard', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const largeLeaderboard = Array.from({ length: 1000 }, (_, i) => ({
        rank: i + 1,
        score: 1000 - i,
        user: {
          id: i + 1,
          name: `User ${i + 1}`,
          profileImage: `user${i + 1}.jpg`
        },
        userPoints: {
          level: Math.floor((1000 - i) / 100),
          totalPointsEarned: 1000 - i
        }
      }));

      gamificationAPI.getLeaderboard.mockResolvedValue(largeLeaderboard);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(mockUserRank);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('User 1')).toBeInTheDocument();
        expect(screen.getByText('User 50')).toBeInTheDocument(); // Should show first 50
        expect(screen.queryByText('User 51')).not.toBeInTheDocument();
      });
    });

    it('should handle user not in leaderboard', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getLeaderboard.mockResolvedValue(mockLeaderboardData);
      gamificationAPI.getUserLeaderboardRank.mockResolvedValue(null);

      render(<LeaderboardsPage />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText(/Not ranked yet/)).toBeInTheDocument();
        expect(screen.getByText(/Start participating to appear on the leaderboard/)).toBeInTheDocument();
      });
    });
  });
});
