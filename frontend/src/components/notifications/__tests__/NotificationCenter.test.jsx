import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationCenter from '../NotificationCenter';
import { notificationService } from '../../../services/notificationAPI';
import socket from '../../../services/socket';

// Mock the API and socket
jest.mock('../../../services/notificationAPI');
jest.mock('../../../services/socket');

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Bell: () => <div data-testid="bell-icon">Bell</div>,
  X: () => <div data-testid="x-icon">X</div>,
  Check: () => <div data-testid="check-icon">Check</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  User: () => <div data-testid="user-icon">User</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  Heart: () => <div data-testid="heart-icon">Heart</div>,
  MessageCircle: () => <div data-testid="message-icon">Message</div>,
  TrendingUp: () => <div data-testid="trending-icon">Trending</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  Settings: () => <div data-testid="settings-icon">Settings</div>,
  ChevronDown: () => <div data-testid="chevron-down">Down</div>,
  ChevronUp: () => <div data-testid="chevron-up">Up</div>,
  AlertCircle: () => <div data-testid="alert-icon">Alert</div>,
}));

describe('NotificationCenter', () => {
  const mockNotifications = [
    {
      id: 1,
      type: 'session_update',
      title: 'Session Completed',
      message: 'Your mentorship session has been completed',
      isRead: false,
      createdAt: new Date('2024-01-15T10:00:00Z'),
      data: {
        sessionId: 1,
        status: 'COMPLETED',
        title: 'React Mentoring',
        mentorName: 'John Doe'
      }
    },
    {
      id: 2,
      type: 'post_liked',
      title: 'Post Liked',
      message: 'Jane Smith liked your post',
      isRead: true,
      createdAt: new Date('2024-01-14T15:30:00Z'),
      data: {
        postId: 1,
        postTitle: 'React Tutorial',
        actorId: 2,
        actorName: 'Jane Smith'
      }
    },
    {
      id: 3,
      type: 'comment_added',
      title: 'New Comment',
      message: 'Bob Johnson commented on your post',
      isRead: false,
      createdAt: new Date('2024-01-13T12:00:00Z'),
      data: {
        commentId: 1,
        postId: 1,
        postTitle: 'React Tutorial',
        actorId: 3,
        actorName: 'Bob Johnson'
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses
    notificationService.getUserNotifications.mockResolvedValue({
      notifications: mockNotifications,
      pagination: { total: 3, page: 1, pages: 1 }
    });

    // Mock socket
    socket.connected = true;
    socket.on = jest.fn();
    socket.off = jest.fn();
    socket.emit = jest.fn();
  });

  const renderComponent = () => {
    return render(<NotificationCenter />);
  };

  test('renders notification center with header', () => {
    renderComponent();
    
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
    expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
  });

  test('displays unread count badge', () => {
    renderComponent();
    
    const unreadBadge = screen.getByText('2'); // 2 unread notifications
    expect(unreadBadge).toBeInTheDocument();
    expect(unreadBadge).toHaveClass('bg-blue-600');
  });

  test('displays notifications list', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Session Completed')).toBeInTheDocument();
      expect(screen.getByText('Post Liked')).toBeInTheDocument();
      expect(screen.getByText('New Comment')).toBeInTheDocument();
    });
  });

  test('shows loading state', () => {
    notificationService.getUserNotifications.mockImplementation(() => new Promise(() => {}));
    
    renderComponent();
    
    expect(screen.getByText('Loading notifications...')).toBeInTheDocument();
  });

  test('shows empty state when no notifications', async () => {
    notificationService.getUserNotifications.mockResolvedValue({
      notifications: [],
      pagination: { total: 0, page: 1, pages: 1 }
    });
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });
  });

  test('filters notifications by type', async () => {
    renderComponent();
    
    // Click on filter button
    fireEvent.click(screen.getByTestId('settings-icon'));
    
    // Click on unread filter
    const unreadFilter = screen.getByText('Unread');
    fireEvent.click(unreadFilter);
    
    await waitFor(() => {
      expect(notificationService.getUserNotifications).toHaveBeenCalledWith({
        isRead: false
      });
    });
  });

  test('marks notification as read', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Session Completed')).toBeInTheDocument();
    });
    
    const markAsReadButton = screen.getByTestId('check-icon');
    fireEvent.click(markAsReadButton);
    
    expect(notificationService.markNotificationAsRead).toHaveBeenCalledWith(1, 1);
  });

  test('marks all notifications as read', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Mark all as read')).toBeInTheDocument();
    });
    
    const markAllAsReadButton = screen.getByText('Mark all as read');
    fireEvent.click(markAllAsReadButton);
    
    expect(notificationService.markAllNotificationsAsRead).toHaveBeenCalledWith(1);
  });

  test('deletes notification', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Session Completed')).toBeInTheDocument();
    });
    
    const deleteButton = screen.getByTestId('x-icon');
    fireEvent.click(deleteButton);
    
    expect(notificationService.deleteNotification).toHaveBeenCalledWith(1, 1);
  });

  test('toggles filters visibility', async () => {
    renderComponent();
    
    // Initially filters should be hidden
    expect(screen.queryByText('All')).not.toBeInTheDocument();
    
    // Click on settings button to show filters
    fireEvent.click(screen.getByTestId('settings-icon'));
    
    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Unread')).toBeInTheDocument();
      expect(screen.getByText('Read')).toBeInTheDocument();
    });
  });

  test('handles new notification from socket', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Session Completed')).toBeInTheDocument();
    });
    
    const newNotification = {
      id: 4,
      type: 'new_follower',
      title: 'New Follower',
      message: 'Alice is now following you',
      isRead: false,
      createdAt: new Date(),
      data: {
        followerId: 4,
        followerName: 'Alice'
      }
    };
    
    // Simulate socket event
    const socketCallback = socket.on.mock.calls.find(call => call[0] === 'notification')[1];
    socketCallback(newNotification);
    
    await waitFor(() => {
      expect(screen.getByText('New Follower')).toBeInTheDocument();
    });
  });

  test('handles notification read from socket', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Session Completed')).toBeInTheDocument();
    });
    
    // Simulate socket event
    const socketCallback = socket.on.mock.calls.find(call => call[0] === 'notification_read')[1];
    socketCallback({ notificationId: 1 });
    
    // Should update the notification to read
    await waitFor(() => {
      // The component should update the notification state
      expect(notificationService.markNotificationAsRead).toHaveBeenCalled();
    });
  });

  test('shows correct notification icons', async () => {
    renderComponent();
    
    await waitFor(() => {
      // Session update should show calendar icon
      expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
      
      // Post liked should show heart icon
      expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
      
      // Comment added should show message icon
      expect(screen.getByTestId('message-icon')).toBeInTheDocument();
    });
  });

  test('formats time ago correctly', async () => {
    renderComponent();
    
    await waitFor(() => {
      // Should show time ago for recent notifications
      expect(screen.getByText(/ago$/)).toBeInTheDocument();
    });
  });

  test('handles expand/collapse', async () => {
    renderComponent();
    
    const expandButton = screen.getByTestId('chevron-down');
    fireEvent.click(expandButton);
    
    // Should toggle expand state
    expect(screen.getByTestId('chevron-up')).toBeInTheDocument();
  });

  test('shows browser notification when not focused', async () => {
    // Mock document.hasFocus
    Object.defineProperty(document, 'hasFocus', {
      value: false,
      writable: true
    });
    
    // Mock Notification API
    global.Notification = jest.fn(() => ({
      close: jest.fn(),
      onclick: jest.fn()
    }));
    global.Notification.requestPermission = jest.fn(() => Promise.resolve('granted'));
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Session Completed')).toBeInTheDocument();
    });
    
    const newNotification = {
      id: 4,
      type: 'session_update',
      title: 'New Session',
      message: 'A new session is available',
      isRead: false,
      createdAt: new Date(),
      data: { url: '/session/4' }
    };
    
    // Simulate socket event
    const socketCallback = socket.on.mock.calls.find(call => call[0] === 'notification')[1];
    socketCallback(newNotification);
    
    // Should create browser notification
    expect(global.Notification).toHaveBeenCalled();
  });

  test('handles API errors gracefully', async () => {
    notificationService.getUserNotifications.mockRejectedValue(new Error('API Error'));
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.queryByText('Session Completed')).not.toBeInTheDocument();
      expect(screen.queryByText('No notifications yet')).not.toBeInTheDocument();
    });
  });

  test('handles socket disconnection', async () => {
    socket.connected = false;
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Session Completed')).toBeInTheDocument();
    });
    
    // Should not set up socket listeners when disconnected
    expect(socket.on).not.toHaveBeenCalled();
  });

  test('shows correct notification count', async () => {
    renderComponent();
    
    await waitFor(() => {
      const unreadBadge = screen.getByText('2');
      expect(unreadBadge).toBeInTheDocument();
    });
  });

  test('handles filter changes', async () => {
    renderComponent();
    
    // Show filters
    fireEvent.click(screen.getByTestId('settings-icon'));
    
    // Click read filter
    fireEvent.click(screen.getByText('Read'));
    
    await waitFor(() => {
      expect(notificationService.getUserNotifications).toHaveBeenCalledWith({
        isRead: true
      });
    });
  });

  test('shows expand/collapse button when notifications exist', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Show more')).toBeInTheDocument();
    });
    
    const expandButton = screen.getByText('Show more');
    fireEvent.click(expandButton);
    
    expect(screen.getByText('Show less')).toBeInTheDocument();
  });
});
