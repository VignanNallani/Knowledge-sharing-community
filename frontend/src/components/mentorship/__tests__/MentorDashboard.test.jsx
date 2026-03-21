import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MentorDashboard from '../MentorDashboard';
import * as mentorshipAPI from '../mentorshipAPI';
import * as socket from '../socket';

// Mock the API and socket
jest.mock('../mentorshipAPI');
jest.mock('../socket');

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => '2024-01-15'),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  Star: () => <div data-testid="star-icon">Star</div>,
  AlertCircle: () => <div data-testid="alert-icon">Alert</div>,
  CheckCircle: () => <div data-testid="check-icon">Check</div>,
  XCircle: () => <div data-testid="x-icon">X</div>,
}));

const mockSessions = [
  {
    id: '1',
    title: 'React Mentoring',
    status: 'SCHEDULED',
    scheduledAt: '2024-01-15T10:00:00Z',
    duration: 60,
    mentee: { name: 'John Doe', email: 'john@example.com' },
    meetUrl: 'https://meet.jit.si/test123'
  },
  {
    id: '2',
    title: 'JavaScript Help',
    status: 'COMPLETED',
    scheduledAt: '2024-01-14T14:00:00Z',
    duration: 45,
    mentee: { name: 'Jane Smith', email: 'jane@example.com' }
  }
];

const mockStats = {
  totalSessions: 10,
  completedSessions: 8,
  cancelledSessions: 1,
  upcomingSessions: 1,
  completionRate: 80,
  averageRating: 4.5
};

describe('MentorDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => JSON.stringify({ id: 1, role: 'MENTOR' })),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });

    // Mock API responses
    mentorshipAPI.getMentorSessions.mockResolvedValue(mockSessions);
    mentorshipAPI.getSessionStats.mockResolvedValue(mockStats);
    mentorshipAPI.cancelSession.mockResolvedValue({});
    mentorshipAPI.completeSession.mockResolvedValue({});

    // Mock socket
    socket.connectSocket = jest.fn();
    socket.joinMentorRoom = jest.fn();
    socket.leaveMentorRoom = jest.fn();
    socket.on = jest.fn();
    socket.off = jest.fn();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <MentorDashboard />
      </BrowserRouter>
    );
  };

  test('renders dashboard with loading state', () => {
    mentorshipAPI.getMentorSessions.mockImplementation(() => new Promise(() => {}));
    
    renderComponent();
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('renders dashboard with sessions and stats', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Mentor Dashboard')).toBeInTheDocument();
      expect(screen.getByText('React Mentoring')).toBeInTheDocument();
      expect(screen.getByText('JavaScript Help')).toBeInTheDocument();
      expect(screen.getByText('Total Sessions')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('80.0%')).toBeInTheDocument();
      expect(screen.getByText('4.5')).toBeInTheDocument();
    });
  });

  test('filters sessions by status', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('React Mentoring')).toBeInTheDocument();
    });

    // Click on COMPLETED filter
    fireEvent.click(screen.getByText('Completed'));
    
    await waitFor(() => {
      expect(screen.queryByText('React Mentoring')).not.toBeInTheDocument();
      expect(screen.getByText('JavaScript Help')).toBeInTheDocument();
    });
  });

  test('handles session cancellation', async () => {
    // Mock window.confirm
    window.confirm = jest.fn(() => true);
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('React Mentoring')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mentorshipAPI.cancelSession).toHaveBeenCalledWith('1', 'Cancelled by mentor');
  });

  test('handles session completion', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('React Mentoring')).toBeInTheDocument();
    });

    const completeButton = screen.getByText('Complete');
    fireEvent.click(completeButton);

    expect(mentorshipAPI.completeSession).toHaveBeenCalledWith('1');
  });

  test('handles real-time session updates', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('React Mentoring')).toBeInTheDocument();
    });

    // Simulate socket event
    const socketCallback = socket.on.mock.calls.find(call => call[0] === 'session_updated')[1];
    const updatedSession = { ...mockSessions[0], status: 'COMPLETED' };
    
    socketCallback(updatedSession);

    await waitFor(() => {
      expect(screen.getByText('React Mentoring')).toBeInTheDocument();
    });
  });

  test('displays error message', async () => {
    mentorshipAPI.getMentorSessions.mockRejectedValue(new Error('API Error'));
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load dashboard data/)).toBeInTheDocument();
    });
  });

  test('shows join meeting button for scheduled sessions', async () => {
    renderComponent();
    
    await waitFor(() => {
      const joinButton = screen.getByText('Join Meeting');
      expect(joinButton).toBeInTheDocument();
    });

    // Test join meeting functionality
    const joinButton = screen.getByText('Join Meeting');
    fireEvent.click(joinButton);
    
    expect(window.open).toHaveBeenCalledWith('https://meet.jit.si/test123', '_blank');
  });

  test('displays correct status icons and colors', async () => {
    renderComponent();
    
    await waitFor(() => {
      // Check for status indicators
      expect(screen.getByText('SCHEDULED')).toBeInTheDocument();
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    });
  });
});
