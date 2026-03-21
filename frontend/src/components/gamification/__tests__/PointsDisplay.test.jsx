import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Trophy, Star, TrendingUp } from 'lucide-react';
import PointsDisplay from '../PointsDisplay';

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

describe('PointsDisplay Component', () => {
  const mockPointsData = {
    userId: 1,
    totalPoints: 100,
    level: 5
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('1');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    it('should render points display component', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserPoints.mockResolvedValue(mockPointsData);

      render(<PointsDisplay />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('Level 5')).toBeInTheDocument();
      });
    });

    it('should render compact version', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserPoints.mockResolvedValue(mockPointsData);

      render(<PointsDisplay compact />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.queryByText('Level 5')).not.toBeInTheDocument();
      });
    });

    it('should render with details', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserPoints.mockResolvedValue(mockPointsData);

      render(<PointsDisplay showDetails />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('Level 5')).toBeInTheDocument();
        expect(screen.getByText(/Total Points/)).toBeInTheDocument();
      });
    });

    it('should render with custom userId', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserPoints.mockResolvedValue(mockPointsData);

      render(<PointsDisplay userId={2} />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      expect(gamificationAPI.getUserPoints).toHaveBeenCalledWith(2);
    });

    it('should render loading state', () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserPoints.mockImplementation(() => new Promise(() => {}));

      render(<PointsDisplay />);

      expect(screen.getByTestId('points-loading')).toBeInTheDocument();
    });

    it('should render error state', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserPoints.mockRejectedValue(new Error('API Error'));

      render(<PointsDisplay />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load points/)).toBeInTheDocument();
      });
    });

    it('should render zero points correctly', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserPoints.mockResolvedValue({
        userId: 1,
        totalPoints: 0,
        level: 1
      });

      render(<PointsDisplay />);

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByText('Level 1')).toBeInTheDocument();
      });
    });

    it('should render large numbers correctly', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserPoints.mockResolvedValue({
        userId: 1,
        totalPoints: 1000000,
        level: 50
      });

      render(<PointsDisplay />);

      await waitFor(() => {
        expect(screen.getByText('1,000,000')).toBeInTheDocument();
        expect(screen.getByText('Level 50')).toBeInTheDocument();
      });
    });
  });

  describe('Socket Integration', () => {
    it('should connect to socket when not connected', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getUserPoints.mockResolvedValue(mockPointsData);
      socket.connected = false;

      render(<PointsDisplay />);

      await waitFor(() => {
        expect(socket.connect).toHaveBeenCalled();
      });
    });

    it('should not connect to socket when already connected', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getUserPoints.mockResolvedValue(mockPointsData);
      socket.connected = true;

      render(<PointsDisplay />);

      await waitFor(() => {
        expect(socket.connect).not.toHaveBeenCalled();
      });
    });

    it('should handle points update from socket', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getUserPoints.mockResolvedValue(mockPointsData);
      socket.connected = true;

      // Get socket event handler
      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'points_update') {
          socketEventHandler = handler;
        }
      });

      render(<PointsDisplay />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      // Simulate socket event
      const socketData = {
        userId: 1,
        points: 150,
        pointsAwarded: 50,
        activityType: 'POST_CREATED'
      };

      socketEventHandler(socketData);

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
      });
    });

    it('should handle level up from socket', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getUserPoints.mockResolvedValue(mockPointsData);
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'level_up') {
          socketEventHandler = handler;
        }
      });

      render(<PointsDisplay />);

      await waitFor(() => {
        expect(screen.getByText('Level 5')).toBeInTheDocument();
      });

      // Simulate level up event
      const levelUpData = {
        userId: 1,
        oldLevel: 5,
        newLevel: 6,
        experiencePoints: 600
      };

      socketEventHandler(levelUpData);

      await waitFor(() => {
        expect(screen.getByText('Level 6')).toBeInTheDocument();
      });
    });

    it('should clean up socket events on unmount', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getUserPoints.mockResolvedValue(mockPointsData);
      socket.connected = true;

      const { unmount } = render(<PointsDisplay />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      unmount();

      expect(socket.off).toHaveBeenCalledWith('points_update', expect.any(Function));
      expect(socket.off).toHaveBeenCalledWith('level_up', expect.any(Function));
    });
  });

  describe('Animations', () => {
    it('should show animation when points increase', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getUserPoints.mockResolvedValue(mockPointsData);
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'points_update') {
          socketEventHandler = handler;
        }
      });

      render(<PointsDisplay animated />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      // Simulate points increase
      socketEventHandler({
        userId: 1,
        points: 150,
        pointsAwarded: 50
      });

      await waitFor(() => {
        expect(screen.getByTestId('points-animation')).toBeInTheDocument();
      });
    });

    it('should not show animation when animated prop is false', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getUserPoints.mockResolvedValue(mockPointsData);
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'points_update') {
          socketEventHandler = handler;
        }
      });

      render(<PointsDisplay animated={false} />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      socketEventHandler({
        userId: 1,
        points: 150,
        pointsAwarded: 50
      });

      await waitFor(() => {
        expect(screen.queryByTestId('points-animation')).not.toBeInTheDocument();
      });
    });
  });

  describe('User Interaction', () => {
    it('should refresh points when clicked', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserPoints
        .mockResolvedValueOnce(mockPointsData)
        .mockResolvedValueOnce({
          userId: 1,
          totalPoints: 150,
          level: 6
        });

      render(<PointsDisplay />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      // Click to refresh
      fireEvent.click(screen.getByTestId('points-display'));

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('Level 6')).toBeInTheDocument();
      });

      expect(gamificationAPI.getUserPoints).toHaveBeenCalledTimes(2);
    });

    it('should show loading state during refresh', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserPoints
        .mockResolvedValueOnce(mockPointsData)
        .mockImplementation(() => new Promise(() => {}));

      render(<PointsDisplay />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      // Click to refresh
      fireEvent.click(screen.getByTestId('points-display'));

      expect(screen.getByTestId('points-loading')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserPoints.mockResolvedValue(mockPointsData);

      render(<PointsDisplay />);

      await waitFor(() => {
        expect(screen.getByLabelText('User points')).toBeInTheDocument();
        expect(screen.getByLabelText('User level')).toBeInTheDocument();
      });
    });

    it('should be keyboard navigable', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserPoints.mockResolvedValue(mockPointsData);

      render(<PointsDisplay />);

      await waitFor(() => {
        const pointsDisplay = screen.getByTestId('points-display');
        expect(pointsDisplay).toHaveAttribute('tabIndex', '0');
      });
    });

    it('should announce points updates to screen readers', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getUserPoints.mockResolvedValue(mockPointsData);
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'points_update') {
          socketEventHandler = handler;
        }
      });

      render(<PointsDisplay />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      socketEventHandler({
        userId: 1,
        points: 150,
        pointsAwarded: 50
      });

      await waitFor(() => {
        const announcement = screen.getByRole('status');
        expect(announcement).toHaveTextContent(/Points updated to 150/);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserPoints.mockRejectedValue(new Error('Network error'));

      render(<PointsDisplay />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load points/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
      });
    });

    it('should retry on error button click', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserPoints
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockPointsData);

      render(<PointsDisplay />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load points/)).toBeInTheDocument();
      });

      // Click retry button
      fireEvent.click(screen.getByRole('button', { name: /Retry/ }));

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      expect(gamificationAPI.getUserPoints).toHaveBeenCalledTimes(2);
    });

    it('should handle socket errors gracefully', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getUserPoints.mockResolvedValue(mockPointsData);
      socket.connect.mockImplementation(() => {
        throw new Error('Socket connection failed');
      });

      render(<PointsDisplay />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      // Should still render points despite socket error
      expect(screen.queryByText(/Socket error/)).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile screen size', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserPoints.mockResolvedValue(mockPointsData);

      // Mock mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;

      render(<PointsDisplay />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      const container = screen.getByTestId('points-display');
      expect(container).toHaveClass('mobile-optimized');
    });

    it('should adapt to tablet screen size', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserPoints.mockResolvedValue(mockPointsData);

      // Mock tablet viewport
      global.innerWidth = 768;
      global.innerHeight = 1024;

      render(<PointsDisplay />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      const container = screen.getByTestId('points-display');
      expect(container).toHaveClass('tablet-optimized');
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserPoints.mockResolvedValue(mockPointsData);

      const { rerender } = render(<PointsDisplay />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      // Rerender with same props
      rerender(<PointsDisplay />);

      // Should not trigger new API call
      expect(gamificationAPI.getUserPoints).toHaveBeenCalledTimes(1);
    });

    it('should debounce rapid clicks', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserPoints.mockResolvedValue(mockPointsData);

      render(<PointsDisplay />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      // Rapid clicks
      fireEvent.click(screen.getByTestId('points-display'));
      fireEvent.click(screen.getByTestId('points-display'));
      fireEvent.click(screen.getByTestId('points-display'));

      // Should only make one API call due to debouncing
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(gamificationAPI.getUserPoints).toHaveBeenCalledTimes(2); // Initial + 1 debounced
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing userId in localStorage', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserPoints.mockResolvedValue(mockPointsData);
      
      localStorageMock.getItem.mockReturnValue(null);

      render(<PointsDisplay />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      expect(gamificationAPI.getUserPoints).toHaveBeenCalledWith(null);
    });

    it('should handle invalid points data', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserPoints.mockResolvedValue({
        userId: 1,
        totalPoints: 'invalid',
        level: null
      });

      render(<PointsDisplay />);

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByText('Level 1')).toBeInTheDocument();
      });
    });

    it('should handle negative points', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserPoints.mockResolvedValue({
        userId: 1,
        totalPoints: -10,
        level: 1
      });

      render(<PointsDisplay />);

      await waitFor(() => {
        expect(screen.getByText('-10')).toBeInTheDocument();
        expect(screen.getByText('Level 1')).toBeInTheDocument();
      });
    });

    it('should handle very high levels', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserPoints.mockResolvedValue({
        userId: 1,
        totalPoints: 1000000,
        level: 999
      });

      render(<PointsDisplay />);

      await waitFor(() => {
        expect(screen.getByText('1,000,000')).toBeInTheDocument();
        expect(screen.getByText('Level 999')).toBeInTheDocument();
      });
    });
  });
});
