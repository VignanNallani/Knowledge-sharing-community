import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Trophy, Star, Award, Bell, Sparkles } from 'lucide-react';
import AchievementNotifications from '../AchievementNotifications';

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

describe('AchievementNotifications Component', () => {
  const mockAchievementData = {
    userId: 1,
    achievement: {
      id: 1,
      name: 'First Post',
      description: 'Create your first post',
      pointsReward: 10,
      badgeType: 'BRONZE'
    }
  };

  const mockBadgeData = {
    userId: 1,
    badge: {
      id: 1,
      name: 'Rising Star',
      description: 'Reached level 5',
      type: 'ACHIEVEMENT',
      tier: 'SILVER'
    }
  };

  const mockLevelUpData = {
    userId: 1,
    oldLevel: 4,
    newLevel: 5,
    experiencePoints: 500
  };

  const mockStreakData = {
    userId: 1,
    streakType: 'daily_login',
    currentStreak: 7,
    milestone: 7
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('1');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render notification container', () => {
      render(<AchievementNotifications />);

      expect(screen.getByTestId('achievement-notifications')).toBeInTheDocument();
    });

    it('should render empty state initially', () => {
      render(<AchievementNotifications />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByText(/Achievement/)).not.toBeInTheDocument();
    });

    it('should render with custom max notifications', () => {
      render(<AchievementNotifications maxNotifications={3} />);

      expect(screen.getByTestId('achievement-notifications')).toBeInTheDocument();
    });

    it('should render with custom auto hide delay', () => {
      render(<AchievementNotifications autoHideDelay={3000} />);

      expect(screen.getByTestId('achievement-notifications')).toBeInTheDocument();
    });

    it('should render with custom position', () => {
      render(<AchievementNotifications position="bottom-left" />);

      expect(screen.getByTestId('achievement-notifications')).toBeInTheDocument();
      expect(screen.getByTestId('achievement-notifications')).toHaveClass('position-bottom-left');
    });
  });

  describe('Socket Integration', () => {
    it('should connect to socket when not connected', () => {
      const socket = require('../../services/socket').default;
      socket.connected = false;

      render(<AchievementNotifications />);

      expect(socket.connect).toHaveBeenCalled();
    });

    it('should not connect to socket when already connected', () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      render(<AchievementNotifications />);

      expect(socket.connect).not.toHaveBeenCalled();
    });

    it('should setup socket event listeners', () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      render(<AchievementNotifications />);

      expect(socket.on).toHaveBeenCalledWith('achievement_unlocked', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('badge_earned', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('level_up', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('streak_milestone', expect.any(Function));
    });

    it('should clean up socket events on unmount', () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      const { unmount } = render(<AchievementNotifications />);

      unmount();

      expect(socket.off).toHaveBeenCalledWith('achievement_unlocked', expect.any(Function));
      expect(socket.off).toHaveBeenCalledWith('badge_earned', expect.any(Function));
      expect(socket.off).toHaveBeenCalledWith('level_up', expect.any(Function));
      expect(socket.off).toHaveBeenCalledWith('streak_milestone', expect.any(Function));
    });
  });

  describe('Achievement Notifications', () => {
    it('should display achievement unlocked notification', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      // Trigger achievement unlocked
      socketEventHandler(mockAchievementData);

      await waitFor(() => {
        expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
        expect(screen.getByText('First Post')).toBeInTheDocument();
        expect(screen.getByText('Create your first post')).toBeInTheDocument();
        expect(screen.getByText('+10 points')).toBeInTheDocument();
      });
    });

    it('should display achievement notification with correct icon', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      socketEventHandler(mockAchievementData);

      await waitFor(() => {
        expect(screen.getByTestId('achievement-icon')).toBeInTheDocument();
        expect(screen.getByTestId('achievement-icon')).toContainElement(screen.getByRole('img', { hidden: true }));
      });
    });

    it('should auto-hide achievement notification', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications autoHideDelay={1000} />);

      socketEventHandler(mockAchievementData);

      await waitFor(() => {
        expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
      });

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.queryByText('Achievement Unlocked!')).not.toBeInTheDocument();
      });
    });

    it('should handle multiple achievement notifications', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications maxNotifications={3} />);

      // Trigger multiple achievements
      socketEventHandler({
        ...mockAchievementData,
        achievement: { ...mockAchievementData.achievement, name: 'Achievement 1' }
      });

      socketEventHandler({
        ...mockAchievementData,
        achievement: { ...mockAchievementData.achievement, name: 'Achievement 2' }
      });

      socketEventHandler({
        ...mockAchievementData,
        achievement: { ...mockAchievementData.achievement, name: 'Achievement 3' }
      });

      await waitFor(() => {
        expect(screen.getByText('Achievement 1')).toBeInTheDocument();
        expect(screen.getByText('Achievement 2')).toBeInTheDocument();
        expect(screen.getByText('Achievement 3')).toBeInTheDocument();
      });
    });

    it('should limit displayed notifications', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications maxNotifications={2} />);

      // Trigger more notifications than max
      for (let i = 1; i <= 5; i++) {
        socketEventHandler({
          ...mockAchievementData,
          achievement: { ...mockAchievementData.achievement, name: `Achievement ${i}` }
        });
      }

      await waitFor(() => {
        expect(screen.getByText('Achievement 5')).toBeInTheDocument();
        expect(screen.getByText('Achievement 4')).toBeInTheDocument();
        expect(screen.queryByText('Achievement 3')).not.toBeInTheDocument();
        expect(screen.queryByText('Achievement 2')).not.toBeInTheDocument();
        expect(screen.queryByText('Achievement 1')).not.toBeInTheDocument();
      });
    });
  });

  describe('Badge Notifications', () => {
    it('should display badge earned notification', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'badge_earned') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      socketEventHandler(mockBadgeData);

      await waitFor(() => {
        expect(screen.getByText('Badge Earned!')).toBeInTheDocument();
        expect(screen.getByText('Rising Star')).toBeInTheDocument();
        expect(screen.getByText('Reached level 5')).toBeInTheDocument();
        expect(screen.getByText('SILVER')).toBeInTheDocument();
      });
    });

    it('should display badge notification with tier color', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'badge_earned') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      socketEventHandler(mockBadgeData);

      await waitFor(() => {
        const badgeElement = screen.getByTestId('badge-notification');
        expect(badgeElement).toHaveClass('tier-silver');
      });
    });

    it('should display badge notification with icon', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'badge_earned') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      socketEventHandler(mockBadgeData);

      await waitFor(() => {
        expect(screen.getByTestId('badge-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Level Up Notifications', () => {
    it('should display level up notification', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'level_up') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      socketEventHandler(mockLevelUpData);

      await waitFor(() => {
        expect(screen.getByText('Level Up!')).toBeInTheDocument();
        expect(screen.getByText('Level 4 → Level 5')).toBeInTheDocument();
        expect(screen.getByText('500 XP')).toBeInTheDocument();
      });
    });

    it('should display level up notification with animation', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'level_up') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      socketEventHandler(mockLevelUpData);

      await waitFor(() => {
        expect(screen.getByTestId('level-up-animation')).toBeInTheDocument();
      });
    });

    it('should show level up progress bar', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'level_up') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      socketEventHandler(mockLevelUpData);

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });
  });

  describe('Streak Milestone Notifications', () => {
    it('should display streak milestone notification', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'streak_milestone') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      socketEventHandler(mockStreakData);

      await waitFor(() => {
        expect(screen.getByText('Streak Milestone!')).toBeInTheDocument();
        expect(screen.getByText('7 Day Streak!')).toBeInTheDocument();
        expect(screen.getByText('daily_login')).toBeInTheDocument();
      });
    });

    it('should display streak notification with fire icon', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'streak_milestone') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      socketEventHandler(mockStreakData);

      await waitFor(() => {
        expect(screen.getByTestId('streak-icon')).toBeInTheDocument();
      });
    });

    it('should handle different streak types', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'streak_milestone') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      // Test weekly streak
      socketEventHandler({
        ...mockStreakData,
        streakType: 'weekly_activity',
        currentStreak: 4
      });

      await waitFor(() => {
        expect(screen.getByText('4 Week Streak!')).toBeInTheDocument();
        expect(screen.getByText('weekly_activity')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should allow manual dismissal of notifications', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      socketEventHandler(mockAchievementData);

      await waitFor(() => {
        expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
      });

      // Click close button
      fireEvent.click(screen.getByRole('button', { name: /Close/ }));

      await waitFor(() => {
        expect(screen.queryByText('Achievement Unlocked!')).not.toBeInTheDocument();
      });
    });

    it('should pause auto-hide on hover', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications autoHideDelay={1000} />);

      socketEventHandler(mockAchievementData);

      await waitFor(() => {
        expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
      });

      // Hover over notification
      fireEvent.mouseEnter(screen.getByTestId('notification-item'));

      // Fast-forward time (should not hide due to hover)
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
      });

      // Mouse leave
      fireEvent.mouseLeave(screen.getByTestId('notification-item'));

      // Fast-forward time again
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.queryByText('Achievement Unlocked!')).not.toBeInTheDocument();
      });
    });

    it('should show all notifications when expanded', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications maxNotifications={2} />);

      // Add more notifications than max
      for (let i = 1; i <= 5; i++) {
        socketEventHandler({
          ...mockAchievementData,
          achievement: { ...mockAchievementData.achievement, name: `Achievement ${i}` }
        });
      }

      await waitFor(() => {
        expect(screen.getByText('Achievement 5')).toBeInTheDocument();
        expect(screen.getByText('Achievement 4')).toBeInTheDocument();
        expect(screen.queryByText('Achievement 3')).not.toBeInTheDocument();
      });

      // Click show all button
      fireEvent.click(screen.getByRole('button', { name: /Show All/ }));

      await waitFor(() => {
        expect(screen.getByText('Achievement 1')).toBeInTheDocument();
        expect(screen.getByText('Achievement 2')).toBeInTheDocument();
        expect(screen.getByText('Achievement 3')).toBeInTheDocument();
        expect(screen.getByText('Achievement 4')).toBeInTheDocument();
        expect(screen.getByText('Achievement 5')).toBeInTheDocument();
      });
    });

    it('should collapse notifications when hide all clicked', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications maxNotifications={2} />);

      // Add notifications and expand
      for (let i = 1; i <= 3; i++) {
        socketEventHandler({
          ...mockAchievementData,
          achievement: { ...mockAchievementData.achievement, name: `Achievement ${i}` }
        });
      }

      fireEvent.click(screen.getByRole('button', { name: /Show All/ }));

      await waitFor(() => {
        expect(screen.getByText('Achievement 1')).toBeInTheDocument();
      });

      // Click hide all button
      fireEvent.click(screen.getByRole('button', { name: /Hide All/ }));

      await waitFor(() => {
        expect(screen.queryByText('Achievement 1')).not.toBeInTheDocument();
        expect(screen.getByText('Achievement 3')).toBeInTheDocument();
      });
    });
  });

  describe('Animations', () => {
    it('should show slide-in animation for new notifications', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      socketEventHandler(mockAchievementData);

      await waitFor(() => {
        expect(screen.getByTestId('notification-item')).toHaveClass('slide-in');
      });
    });

    it('should show fade-out animation when dismissing', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      socketEventHandler(mockAchievementData);

      await waitFor(() => {
        expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
      });

      // Click close button
      fireEvent.click(screen.getByRole('button', { name: /Close/ }));

      await waitFor(() => {
        expect(screen.getByTestId('notification-item')).toHaveClass('fade-out');
      });
    });

    it('should show pulse animation for important achievements', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      // Trigger high-value achievement
      socketEventHandler({
        ...mockAchievementData,
        achievement: {
          ...mockAchievementData.achievement,
          pointsReward: 100 // High value achievement
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('notification-item')).toHaveClass('pulse');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      socketEventHandler(mockAchievementData);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
        expect(screen.getByRole('alert')).toHaveTextContent(/Achievement Unlocked/);
      });
    });

    it('should be keyboard navigable', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      socketEventHandler(mockAchievementData);

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /Close/ });
        expect(closeButton).toHaveAttribute('tabIndex', '0');
      });
    });

    it('should announce notifications to screen readers', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      socketEventHandler(mockAchievementData);

      await waitFor(() => {
        const announcement = screen.getByRole('status');
        expect(announcement).toHaveTextContent(/Achievement Unlocked: First Post/);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle socket errors gracefully', async () => {
      const socket = require('../../services/socket').default;
      socket.connect.mockImplementation(() => {
        throw new Error('Socket connection failed');
      });

      render(<AchievementNotifications />);

      // Should still render container despite socket error
      expect(screen.getByTestId('achievement-notifications')).toBeInTheDocument();
      expect(screen.queryByText(/Socket error/)).not.toBeInTheDocument();
    });

    it('should handle malformed socket data', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      // Send malformed data
      socketEventHandler({
        userId: null,
        achievement: {
          name: null,
          description: undefined,
          pointsReward: 'invalid'
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
        expect(screen.getByText('Unknown Achievement')).toBeInTheDocument();
        expect(screen.getByText('No description available')).toBeInTheDocument();
      });
    });

    it('should handle missing user ID in socket data', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      // Send data without userId
      socketEventHandler({
        achievement: mockAchievementData.achievement
      });

      // Should not show notification for different user
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(screen.queryByText('Achievement Unlocked!')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile screen size', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      // Mock mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;

      render(<AchievementNotifications />);

      socketEventHandler(mockAchievementData);

      await waitFor(() => {
        expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
        const container = screen.getByTestId('achievement-notifications');
        expect(container).toHaveClass('mobile-optimized');
      });
    });

    it('should adapt to tablet screen size', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      // Mock tablet viewport
      global.innerWidth = 768;
      global.innerHeight = 1024;

      render(<AchievementNotifications />);

      socketEventHandler(mockAchievementData);

      await waitFor(() => {
        expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
        const container = screen.getByTestId('achievement-notifications');
        expect(container).toHaveClass('tablet-optimized');
      });
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      const { rerender } = render(<AchievementNotifications />);

      // Rerender with same props
      rerender(<AchievementNotifications />);

      // Should not trigger new socket connections
      expect(socket.connect).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid notifications efficiently', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      // Trigger many notifications rapidly
      for (let i = 0; i < 100; i++) {
        socketEventHandler({
          ...mockAchievementData,
          achievement: { ...mockAchievementData.achievement, name: `Achievement ${i}` }
        });
      }

      await waitFor(() => {
        // Should only show max notifications
        expect(screen.queryAllByTestId('notification-item')).toHaveLength(5); // Default max
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing userId in localStorage', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      localStorageMock.getItem.mockReturnValue(null);

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      socketEventHandler(mockAchievementData);

      // Should not show notification for unknown user
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(screen.queryByText('Achievement Unlocked!')).not.toBeInTheDocument();
    });

    it('should handle zero auto hide delay', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications autoHideDelay={0} />);

      socketEventHandler(mockAchievementData);

      await waitFor(() => {
        expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
      });

      // Should not auto-hide with zero delay
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
      });
    });

    it('should handle very long achievement names', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      const longName = 'This is a very long achievement name that should be truncated properly without breaking the layout';
      
      socketEventHandler({
        ...mockAchievementData,
        achievement: {
          ...mockAchievementData.achievement,
          name: longName
        }
      });

      await waitFor(() => {
        expect(screen.getByText(/This is a very long achievement name/)).toBeInTheDocument();
        const nameElement = screen.getByTestId('achievement-name');
        expect(nameElement).toHaveClass('truncate');
      });
    });

    it('should handle negative points', async () => {
      const socket = require('../../services/socket').default;
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'achievement_unlocked') {
          socketEventHandler = handler;
        }
      });

      render(<AchievementNotifications />);

      socketEventHandler({
        ...mockAchievementData,
        achievement: {
          ...mockAchievementData.achievement,
          pointsReward: -10
        }
      });

      await waitFor(() => {
        expect(screen.getByText('-10 points')).toBeInTheDocument();
      });
    });
  });
});
