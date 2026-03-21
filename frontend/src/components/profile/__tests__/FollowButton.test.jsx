import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FollowButton, { FollowButtonCompact, FollowButtonWithStats } from '../FollowButton';
import { followingService } from '../../../services/notificationAPI';
import socket from '../../../services/socket';

// Mock services
jest.mock('../../../services/notificationAPI');
jest.mock('../../../services/socket');

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Users: () => <div data-testid="users-icon">Users</div>,
  UserPlus: () => <div data-testid="user-plus-icon">UserPlus</div>,
  UserMinus: () => <div data-testid="user-minus-icon">UserMinus</div>,
  Loader2: () => <div data-testid="loader-icon">Loading</div>,
}));

describe('FollowButton', () => {
  const userId = 1;
  const mockOnToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    socket.connected = true;
    socket.on = jest.fn();
    socket.off = jest.fn();
  });

  const renderComponent = (props = {}) => {
    return render(
      <BrowserRouter>
        <FollowButton userId={userId} onToggle={mockOnToggle} {...props} />
      </BrowserRouter>
    );
  };

  test('renders follow button when not following', () => {
    renderComponent({ isFollowing: false });

    expect(screen.getByText('Follow')).toBeInTheDocument();
    expect(screen.getByTestId('user-plus-icon')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');
  });

  test('renders following button when following', () => {
    renderComponent({ isFollowing: true });

    expect(screen.getByText('Following')).toBeInTheDocument();
    expect(screen.getByTestId('user-minus-icon')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveClass('bg-gray-100');
  });

  test('shows loading state while following', async () => {
    followingService.followUser.mockImplementation(() => new Promise(() => {}));
    
    renderComponent({ isFollowing: false });

    const followButton = screen.getByRole('button');
    fireEvent.click(followButton);

    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    expect(screen.getByText('Following...')).toBeInTheDocument();
    expect(followButton).toBeDisabled();
  });

  test('shows loading state while unfollowing', async () => {
    followingService.unfollowUser.mockImplementation(() => new Promise(() => {}));
    
    renderComponent({ isFollowing: true });

    const unfollowButton = screen.getByRole('button');
    fireEvent.click(unfollowButton);

    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    expect(screen.getByText('Unfollowing...')).toBeInTheDocument();
    expect(unfollowButton).toBeDisabled();
  });

  test('calls follow service when clicking follow', async () => {
    followingService.followUser.mockResolvedValue({ id: 1 });
    
    renderComponent({ isFollowing: false });

    const followButton = screen.getByRole('button');
    fireEvent.click(followButton);

    await waitFor(() => {
      expect(followingService.followUser).toHaveBeenCalledWith(userId);
      expect(mockOnToggle).toHaveBeenCalledWith(true);
    });
  });

  test('calls unfollow service when clicking unfollow', async () => {
    followingService.unfollowUser.mockResolvedValue({ message: 'Successfully unfollowed' });
    
    renderComponent({ isFollowing: true });

    const unfollowButton = screen.getByRole('button');
    fireEvent.click(unfollowButton);

    await waitFor(() => {
      expect(followingService.unfollowUser).toHaveBeenCalledWith(userId);
      expect(mockOnToggle).toHaveBeenCalledWith(false);
    });
  });

  test('handles follow errors gracefully', async () => {
    const errorMessage = 'Follow failed';
    followingService.followUser.mockRejectedValue(new Error(errorMessage));
    
    renderComponent({ isFollowing: false });

    const followButton = screen.getByRole('button');
    fireEvent.click(followButton);

    await waitFor(() => {
      expect(followingService.followUser).toHaveBeenCalledWith(userId);
      expect(mockOnToggle).not.toHaveBeenCalled();
    });

    // Should revert to original state
    expect(screen.getByText('Follow')).toBeInTheDocument();
  });

  test('sets up socket listeners', () => {
    renderComponent();

    expect(socket.on).toHaveBeenCalledWith('follow_update', expect.any(Function));
  });

  test('handles socket follow update', () => {
    renderComponent({ isFollowing: false });

    const socketCallback = socket.on.mock.calls.find(call => call[0] === 'follow_update')[1];
    
    socketCallback({
      type: 'follow',
      data: { followingId: userId }
    });

    expect(screen.getByText('Following')).toBeInTheDocument();
  });

  test('handles socket unfollow update', () => {
    renderComponent({ isFollowing: true });

    const socketCallback = socket.on.mock.calls.find(call => call[0] === 'follow_update')[1];
    
    socketCallback({
      type: 'unfollow',
      data: { followingId: userId }
    });

    expect(screen.getByText('Follow')).toBeInTheDocument();
  });

  test('renders different sizes correctly', () => {
    const { rerender } = renderComponent({ size: 'sm' });
    expect(screen.getByRole('button')).toHaveClass('px-3 py-1 text-sm');

    rerender(<FollowButton userId={userId} size="lg" />);
    expect(screen.getByRole('button')).toHaveClass('px-6 py-3 text-base');
  });

  test('does not call onToggle when not provided', async () => {
    followingService.followUser.mockResolvedValue({ id: 1 });
    
    render({ 
      default: <FollowButton userId={userId} isFollowing={false} /> 
    });

    const followButton = screen.getByRole('button');
    fireEvent.click(followButton);

    await waitFor(() => {
      expect(followingService.followUser).toHaveBeenCalledWith(userId);
    });
  });
});

describe('FollowButtonCompact', () => {
  const userId = 1;
  const mockOnToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <BrowserRouter>
        <FollowButtonCompact userId={userId} onToggle={mockOnToggle} {...props} />
      </BrowserRouter>
    );
  };

  test('renders follow icon when not following', () => {
    renderComponent({ isFollowing: false });

    expect(screen.getByTestId('user-plus-icon')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('title', 'Follow');
  });

  test('renders unfollow icon when following', () => {
    renderComponent({ isFollowing: true });

    expect(screen.getByTestId('user-minus-icon')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('title', 'Unfollow');
  });

  test('handles follow action', async () => {
    followingService.followUser.mockResolvedValue({ id: 1 });
    
    renderComponent({ isFollowing: false });

    const followButton = screen.getByRole('button');
    fireEvent.click(followButton);

    await waitFor(() => {
      expect(followingService.followUser).toHaveBeenCalledWith(userId);
      expect(mockOnToggle).toHaveBeenCalledWith(true);
    });
  });

  test('handles unfollow action', async () => {
    followingService.unfollowUser.mockResolvedValue({ message: 'Successfully unfollowed' });
    
    renderComponent({ isFollowing: true });

    const unfollowButton = screen.getByRole('button');
    fireEvent.click(unfollowButton);

    await waitFor(() => {
      expect(followingService.unfollowUser).toHaveBeenCalledWith(userId);
      expect(mockOnToggle).toHaveBeenCalledWith(false);
    });
  });

  test('shows loading state', async () => {
    followingService.followUser.mockImplementation(() => new Promise(() => {}));
    
    renderComponent({ isFollowing: false });

    const followButton = screen.getByRole('button');
    fireEvent.click(followButton);

    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    expect(followButton).toBeDisabled();
  });
});

describe('FollowButtonWithStats', () => {
  const userId = 1;
  const followerCount = 42;
  const mockOnToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <BrowserRouter>
        <FollowButtonWithStats 
          userId={userId} 
          followerCount={followerCount}
          onToggle={mockOnToggle}
          {...props} 
        />
      </BrowserRouter>
    );
  };

  test('renders follower count when showCount is true', () => {
    renderComponent({ showCount: true });

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByTestId('users-icon')).toBeInTheDocument();
  });

  test('does not render follower count when showCount is false', () => {
    renderComponent({ showCount: false });

    expect(screen.queryByText('42')).not.toBeInTheDocument();
    expect(screen.queryByTestId('users-icon')).not.toBeInTheDocument();
  });

  test('renders follow button with stats', () => {
    renderComponent({ isFollowing: false, showCount: true });

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Follow')).toBeInTheDocument();
    expect(screen.getByTestId('user-plus-icon')).toBeInTheDocument();
  });

  test('renders following button with stats', () => {
    renderComponent({ isFollowing: true, showCount: true });

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Following')).toBeInTheDocument();
    expect(screen.getByTestId('user-minus-icon')).toBeInTheDocument();
  });

  test('handles follow action with stats', async () => {
    followingService.followUser.mockResolvedValue({ id: 1 });
    
    renderComponent({ isFollowing: false, showCount: true });

    const followButton = screen.getByRole('button');
    fireEvent.click(followButton);

    await waitFor(() => {
      expect(followingService.followUser).toHaveBeenCalledWith(userId);
      expect(mockOnToggle).toHaveBeenCalledWith(true);
    });
  });

  test('handles unfollow action with stats', async () => {
    followingService.unfollowUser.mockResolvedValue({ message: 'Successfully unfollowed' });
    
    renderComponent({ isFollowing: true, showCount: true });

    const unfollowButton = screen.getByRole('button');
    fireEvent.click(unfollowButton);

    await waitFor(() => {
      expect(followingService.unfollowUser).toHaveBeenCalledWith(userId);
      expect(mockOnToggle).toHaveBeenCalledWith(false);
    });
  });

  test('shows loading state with stats', async () => {
    followingService.followUser.mockImplementation(() => new Promise(() => {}));
    
    renderComponent({ isFollowing: false, showCount: true });

    const followButton = screen.getByRole('button');
    fireEvent.click(followButton);

    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    expect(screen.getByText('Following...')).toBeInTheDocument();
    expect(followButton).toBeDisabled();
  });

  test('renders correct styling for different states', () => {
    const { rerender } = renderComponent({ 
      isFollowing: false, 
      showCount: true 
    });

    // Not following state
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');

    // Following state
    rerender(<FollowButtonWithStats 
      userId={userId} 
      followerCount={followerCount}
      isFollowing={true}
      showCount={true}
    />);
    expect(screen.getByRole('button')).toHaveClass('bg-gray-100');
  });

  test('handles disabled state correctly', async () => {
    followingService.followUser.mockImplementation(() => new Promise(() => {}));
    
    renderComponent({ isFollowing: false, showCount: true });

    const followButton = screen.getByRole('button');
    fireEvent.click(followButton);

    expect(followButton).toHaveClass('cursor-not-allowed');
    expect(followButton).toBeDisabled();
  });
});
