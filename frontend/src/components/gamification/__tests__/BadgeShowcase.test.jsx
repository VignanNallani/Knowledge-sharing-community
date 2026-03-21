import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Award, Star, Trophy } from 'lucide-react';
import BadgeShowcase from '../BadgeShowcase';

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

describe('BadgeShowcase Component', () => {
  const mockBadgesData = [
    {
      id: 1,
      userId: 1,
      badgeId: 1,
      earnedAt: new Date('2023-01-01'),
      progress: 100,
      badge: {
        id: 1,
        name: 'First Steps',
        description: 'Created your first post',
        type: 'CONTRIBUTION',
        tier: 'BRONZE',
        icon: '/badges/first-steps.png'
      }
    },
    {
      id: 2,
      userId: 1,
      badgeId: 2,
      earnedAt: new Date('2023-01-02'),
      progress: 100,
      badge: {
        id: 2,
        name: 'Rising Star',
        description: 'Reached level 5',
        type: 'ACHIEVEMENT',
        tier: 'SILVER',
        icon: '/badges/rising-star.png'
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('1');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    it('should render badge showcase component', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserBadges.mockResolvedValue(mockBadgesData);

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
        expect(screen.getByText('Rising Star')).toBeInTheDocument();
        expect(screen.getByText('Created your first post')).toBeInTheDocument();
        expect(screen.getByText('Reached level 5')).toBeInTheDocument();
      });
    });

    it('should render compact version', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserBadges.mockResolvedValue(mockBadgesData);

      render(<BadgeShowcase compact />);

      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
        expect(screen.queryByText('Created your first post')).not.toBeInTheDocument();
      });
    });

    it('should render with custom userId', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserBadges.mockResolvedValue(mockBadgesData);

      render(<BadgeShowcase userId={2} />);

      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
      });

      expect(gamificationAPI.getUserBadges).toHaveBeenCalledWith(2, false);
    });

    it('should render empty state when no badges', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserBadges.mockResolvedValue([]);

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText(/No badges earned yet/)).toBeInTheDocument();
        expect(screen.getByText(/Start participating to earn your first badge/)).toBeInTheDocument();
      });
    });

    it('should render loading state', () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserBadges.mockImplementation(() => new Promise(() => {}));

      render(<BadgeShowcase />);

      expect(screen.getByTestId('badges-loading')).toBeInTheDocument();
    });

    it('should render error state', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserBadges.mockRejectedValue(new Error('API Error'));

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load badges/)).toBeInTheDocument();
      });
    });

    it('should limit displayed badges with maxDisplay prop', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const manyBadges = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        userId: 1,
        badgeId: i + 1,
        earnedAt: new Date(),
        progress: 100,
        badge: {
          id: i + 1,
          name: `Badge ${i + 1}`,
          description: `Description ${i + 1}`,
          type: 'CONTRIBUTION',
          tier: 'BRONZE'
        }
      }));

      gamificationAPI.getUserBadges.mockResolvedValue(manyBadges);

      render(<BadgeShowcase maxDisplay={5} />);

      await waitFor(() => {
        expect(screen.getByText('Badge 1')).toBeInTheDocument();
        expect(screen.getByText('Badge 5')).toBeInTheDocument();
        expect(screen.queryByText('Badge 6')).not.toBeInTheDocument();
        expect(screen.getByText(/and 15 more/)).toBeInTheDocument();
      });
    });

    it('should render badge tiers with correct colors', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const badgesWithTiers = [
        {
          id: 1,
          userId: 1,
          badgeId: 1,
          earnedAt: new Date(),
          progress: 100,
          badge: {
            id: 1,
            name: 'Bronze Badge',
            description: 'Bronze level',
            type: 'CONTRIBUTION',
            tier: 'BRONZE'
          }
        },
        {
          id: 2,
          userId: 1,
          badgeId: 2,
          earnedAt: new Date(),
          progress: 100,
          badge: {
            id: 2,
            name: 'Silver Badge',
            description: 'Silver level',
            type: 'CONTRIBUTION',
            tier: 'SILVER'
          }
        },
        {
          id: 3,
          userId: 1,
          badgeId: 3,
          earnedAt: new Date(),
          progress: 100,
          badge: {
            id: 3,
            name: 'Gold Badge',
            description: 'Gold level',
            type: 'CONTRIBUTION',
            tier: 'GOLD'
          }
        }
      ];

      gamificationAPI.getUserBadges.mockResolvedValue(badgesWithTiers);

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText('Bronze Badge')).toHaveClass('tier-bronze');
        expect(screen.getByText('Silver Badge')).toHaveClass('tier-silver');
        expect(screen.getByText('Gold Badge')).toHaveClass('tier-gold');
      });
    });
  });

  describe('Socket Integration', () => {
    it('should connect to socket when not connected', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getUserBadges.mockResolvedValue(mockBadgesData);
      socket.connected = false;

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(socket.connect).toHaveBeenCalled();
      });
    });

    it('should not connect to socket when already connected', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getUserBadges.mockResolvedValue(mockBadgesData);
      socket.connected = true;

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(socket.connect).not.toHaveBeenCalled();
      });
    });

    it('should handle new badge earned from socket', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getUserBadges.mockResolvedValue(mockBadgesData);
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'badge_earned') {
          socketEventHandler = handler;
        }
      });

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
      });

      // Simulate new badge earned
      const newBadgeData = {
        userId: 1,
        badge: {
          id: 3,
          name: 'Expert Mentor',
          description: 'Completed 10 mentorship sessions',
          type: 'MENTORSHIP',
          tier: 'GOLD'
        }
      };

      socketEventHandler(newBadgeData);

      await waitFor(() => {
        expect(screen.getByText('Expert Mentor')).toBeInTheDocument();
        expect(screen.getByTestId('new-badge-animation')).toBeInTheDocument();
      });
    });

    it('should clean up socket events on unmount', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getUserBadges.mockResolvedValue(mockBadgesData);
      socket.connected = true;

      const { unmount } = render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
      });

      unmount();

      expect(socket.off).toHaveBeenCalledWith('badge_earned', expect.any(Function));
    });
  });

  describe('Badge Interactions', () => {
    it('should show badge details when clicked', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserBadges.mockResolvedValue(mockBadgesData);

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
      });

      // Click on badge
      fireEvent.click(screen.getByText('First Steps'));

      await waitFor(() => {
        expect(screen.getByText('Badge Details')).toBeInTheDocument();
        expect(screen.getByText('Created your first post')).toBeInTheDocument();
        expect(screen.getByText('CONTRIBUTION')).toBeInTheDocument();
        expect(screen.getByText('BRONZE')).toBeInTheDocument();
      });
    });

    it('should close badge details modal', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserBadges.mockResolvedValue(mockBadgesData);

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
      });

      // Click on badge
      fireEvent.click(screen.getByText('First Steps'));

      await waitFor(() => {
        expect(screen.getByText('Badge Details')).toBeInTheDocument();
      });

      // Close modal
      fireEvent.click(screen.getByRole('button', { name: /Close/ }));

      await waitFor(() => {
        expect(screen.queryByText('Badge Details')).not.toBeInTheDocument();
      });
    });

    it('should show badge progress for incomplete badges', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const badgesWithProgress = [
        {
          id: 1,
          userId: 1,
          badgeId: 1,
          earnedAt: new Date(),
          progress: 75,
          badge: {
            id: 1,
            name: 'In Progress Badge',
            description: 'Almost there',
            type: 'CONTRIBUTION',
            tier: 'BRONZE'
          }
        }
      ];

      gamificationAPI.getUserBadges.mockResolvedValue(badgesWithProgress);

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    it('should filter badges by tier', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserBadges.mockResolvedValue(mockBadgesData);

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
      });

      // Filter by BRONZE tier
      fireEvent.click(screen.getByRole('button', { name: /Filter/ }));
      fireEvent.click(screen.getByText('Bronze'));

      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
        expect(screen.queryByText('Rising Star')).not.toBeInTheDocument();
      });
    });

    it('should sort badges by earned date', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserBadges.mockResolvedValue(mockBadgesData);

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
      });

      // Sort by newest first
      fireEvent.click(screen.getByRole('button', { name: /Sort/ }));
      fireEvent.click(screen.getByText('Newest First'));

      await waitFor(() => {
        const badges = screen.getAllByTestId('badge-item');
        expect(badges[0]).toHaveTextContent('Rising Star'); // Newer badge first
        expect(badges[1]).toHaveTextContent('First Steps');
      });
    });
  });

  describe('Animations', () => {
    it('should show animation for new badges', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getUserBadges.mockResolvedValue(mockBadgesData);
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'badge_earned') {
          socketEventHandler = handler;
        }
      });

      render(<BadgeShowcase animated />);

      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
      });

      const newBadgeData = {
        userId: 1,
        badge: {
          id: 3,
          name: 'New Badge',
          description: 'New achievement',
          type: 'CONTRIBUTION',
          tier: 'SILVER'
        }
      };

      socketEventHandler(newBadgeData);

      await waitFor(() => {
        expect(screen.getByTestId('new-badge-animation')).toBeInTheDocument();
      });
    });

    it('should not show animation when animated prop is false', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getUserBadges.mockResolvedValue(mockBadgesData);
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'badge_earned') {
          socketEventHandler = handler;
        }
      });

      render(<BadgeShowcase animated={false} />);

      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
      });

      const newBadgeData = {
        userId: 1,
        badge: {
          id: 3,
          name: 'New Badge',
          description: 'New achievement',
          type: 'CONTRIBUTION',
          tier: 'SILVER'
        }
      };

      socketEventHandler(newBadgeData);

      await waitFor(() => {
        expect(screen.queryByTestId('new-badge-animation')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserBadges.mockResolvedValue(mockBadgesData);

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByLabelText('Badge showcase')).toBeInTheDocument();
        expect(screen.getByLabelText('Badge: First Steps')).toBeInTheDocument();
        expect(screen.getByLabelText('Badge: Rising Star')).toBeInTheDocument();
      });
    });

    it('should be keyboard navigable', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserBadges.mockResolvedValue(mockBadgesData);

      render(<BadgeShowcase />);

      await waitFor(() => {
        const badges = screen.getAllByTestId('badge-item');
        badges.forEach(badge => {
          expect(badge).toHaveAttribute('tabIndex', '0');
        });
      });
    });

    it('should announce new badges to screen readers', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getUserBadges.mockResolvedValue(mockBadgesData);
      socket.connected = true;

      let socketEventHandler;
      socket.on.mockImplementation((event, handler) => {
        if (event === 'badge_earned') {
          socketEventHandler = handler;
        }
      });

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
      });

      const newBadgeData = {
        userId: 1,
        badge: {
          id: 3,
          name: 'New Badge',
          description: 'New achievement',
          type: 'CONTRIBUTION',
          tier: 'SILVER'
        }
      };

      socketEventHandler(newBadgeData);

      await waitFor(() => {
        const announcement = screen.getByRole('status');
        expect(announcement).toHaveTextContent(/New badge earned: New Badge/);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserBadges.mockRejectedValue(new Error('Network error'));

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load badges/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
      });
    });

    it('should retry on error button click', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserBadges
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockBadgesData);

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load badges/)).toBeInTheDocument();
      });

      // Click retry button
      fireEvent.click(screen.getByRole('button', { name: /Retry/ }));

      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
      });

      expect(gamificationAPI.getUserBadges).toHaveBeenCalledTimes(2);
    });

    it('should handle socket errors gracefully', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const socket = require('../../services/socket').default;
      
      gamificationAPI.getUserBadges.mockResolvedValue(mockBadgesData);
      socket.connect.mockImplementation(() => {
        throw new Error('Socket connection failed');
      });

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
      });

      // Should still render badges despite socket error
      expect(screen.queryByText(/Socket error/)).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile screen size', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserBadges.mockResolvedValue(mockBadgesData);

      // Mock mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
      });

      const container = screen.getByTestId('badge-showcase');
      expect(container).toHaveClass('mobile-optimized');
    });

    it('should adapt to tablet screen size', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserBadges.mockResolvedValue(mockBadgesData);

      // Mock tablet viewport
      global.innerWidth = 768;
      global.innerHeight = 1024;

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
      });

      const container = screen.getByTestId('badge-showcase');
      expect(container).toHaveClass('tablet-optimized');
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserBadges.mockResolvedValue(mockBadgesData);

      const { rerender } = render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
      });

      // Rerender with same props
      rerender(<BadgeShowcase />);

      // Should not trigger new API call
      expect(gamificationAPI.getUserBadges).toHaveBeenCalledTimes(1);
    });

    it('should debounce rapid filter changes', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserBadges.mockResolvedValue(mockBadgesData);

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
      });

      // Rapid filter changes
      fireEvent.click(screen.getByRole('button', { name: /Filter/ }));
      fireEvent.click(screen.getByText('Bronze'));
      fireEvent.click(screen.getByText('Silver'));
      fireEvent.click(screen.getByText('Gold'));

      // Should only apply final filter due to debouncing
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing userId in localStorage', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      gamificationAPI.getUserBadges.mockResolvedValue(mockBadgesData);
      
      localStorageMock.getItem.mockReturnValue(null);

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
      });

      expect(gamificationAPI.getUserBadges).toHaveBeenCalledWith(null, false);
    });

    it('should handle invalid badge data', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const invalidBadges = [
        {
          id: 1,
          userId: 1,
          badgeId: 1,
          earnedAt: new Date(),
          progress: 100,
          badge: {
            id: 1,
            name: null,
            description: undefined,
            type: 'INVALID_TYPE',
            tier: 'INVALID_TIER'
          }
        }
      ];

      gamificationAPI.getUserBadges.mockResolvedValue(invalidBadges);

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText('Unknown Badge')).toBeInTheDocument();
        expect(screen.getByText('No description available')).toBeInTheDocument();
      });
    });

    it('should handle badges without icons', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const badgesWithoutIcons = [
        {
          id: 1,
          userId: 1,
          badgeId: 1,
          earnedAt: new Date(),
          progress: 100,
          badge: {
            id: 1,
            name: 'No Icon Badge',
            description: 'No icon available',
            type: 'CONTRIBUTION',
            tier: 'BRONZE'
          }
        }
      ];

      gamificationAPI.getUserBadges.mockResolvedValue(badgesWithoutIcons);

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText('No Icon Badge')).toBeInTheDocument();
        expect(screen.getByTestId('default-badge-icon')).toBeInTheDocument();
      });
    });

    it('should handle very large number of badges', async () => {
      const { gamificationAPI } = require('../../services/gamificationAPI');
      const manyBadges = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        userId: 1,
        badgeId: i + 1,
        earnedAt: new Date(),
        progress: 100,
        badge: {
          id: i + 1,
          name: `Badge ${i + 1}`,
          description: `Description ${i + 1}`,
          type: 'CONTRIBUTION',
          tier: 'BRONZE'
        }
      }));

      gamificationAPI.getUserBadges.mockResolvedValue(manyBadges);

      render(<BadgeShowcase />);

      await waitFor(() => {
        expect(screen.getByText('Badge 1')).toBeInTheDocument();
        expect(screen.getByText(/and 988 more/)).toBeInTheDocument();
      });
    });
  });
});
