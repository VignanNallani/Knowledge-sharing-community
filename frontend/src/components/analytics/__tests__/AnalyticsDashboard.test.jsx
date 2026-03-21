import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AnalyticsDashboard from '../AnalyticsDashboard';
import { analyticsService } from '../../../services/analyticsAPI';
import socket from '../../../services/socket';

// Mock Recharts components
jest.mock('recharts', () => ({
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  TrendingUp: () => <div data-testid="trending-up">TrendingUp</div>,
  Users: () => <div data-testid="users">Users</div>,
  Calendar: () => <div data-testid="calendar">Calendar</div>,
  Clock: () => <div data-testid="clock">Clock</div>,
  Eye: () => <div data-testid="eye">Eye</div>,
  MessageCircle: () => <div data-testid="message-circle">MessageCircle</div>,
  Heart: () => <div data-testid="heart">Heart</div>,
  Award: () => <div data-testid="award">Award</div>,
  Target: () => <div data-testid="target">Target</div>,
  Activity: () => <div data-testid="activity">Activity</div>,
  Download: () => <div data-testid="download">Download</div>,
  Filter: () => <div data-testid="filter">Filter</div>,
  RefreshCw: () => <div data-testid="refresh-cw">RefreshCw</div>,
  Loader2: () => <div data-testid="loader2">Loader2</div>
}));

// Mock analytics service
jest.mock('../../../services/analyticsAPI');
jest.mock('../../../services/socket');

describe('AnalyticsDashboard', () => {
  const mockAnalyticsData = {
    users: {
      total: 1000,
      active: 500,
      new: 100,
      retained: 800
    },
    sessions: {
      total: 200,
      completed: 180,
      completionRate: 90,
      averageDuration: 60
    },
    events: {
      PAGE_VIEW: 5000,
      POST_CREATE: 250,
      POST_LIKE: 1000,
      USER_FOLLOW: 150
    },
    engagement: {
      likes: 1000,
      comments: 500,
      shares: 200,
      bookmarks: 100
    },
    timeline: [
      {
        date: '2024-01-01',
        events: 100,
        pageViews: 500,
        sessions: 50,
        interactions: 25
      },
      {
        date: '2024-01-02',
        events: 120,
        pageViews: 600,
        sessions: 60,
        interactions: 30
      }
    ],
    realTime: {
      lastHour: {
        activeUsers: 50,
        pageViews: 200,
        sessions: 25
      },
      lastDay: {
        activeUsers: 200,
        pageViews: 1000,
        sessions: 100
      }
    },
    topContent: {
      posts: [
        {
          id: 1,
          title: 'Test Post',
          author: { id: 1, name: 'John Doe' },
          _count: { likes: 100, comments: 25, bookmarks: 10 }
        }
      ],
      sessions: [
        {
          id: 1,
          title: 'Test Session',
          mentor: { id: 1, name: 'John Doe' },
          feedback: { rating: 5 }
        }
      ]
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock analytics service
    analyticsService.getUserAnalytics.mockResolvedValue(mockAnalyticsData);
    analyticsService.getPlatformAnalytics.mockResolvedValue(mockAnalyticsData);
    analyticsService.getRealTimeMetrics.mockResolvedValue(mockAnalyticsData.realTime);
    analyticsService.getTopMentors.mockResolvedValue([]);
    analyticsService.getTopContent.mockResolvedValue(mockAnalyticsData.topContent);
    
    // Mock socket
    socket.connected = true;
    socket.on = jest.fn();
    socket.off = jest.fn();
    socket.connect = jest.fn();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });
    
    // Mock URL.createObjectURL and revokeObjectURL
    Object.defineProperty(URL, 'createObjectURL', {
      value: jest.fn(() => 'mock-url'),
      writable: true
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: jest.fn(),
      writable: true
    });
    
    // Mock document.createElement and click
    const mockCreateElement = jest.fn(() => ({
      href: '',
      download: '',
      click: jest.fn()
    }));
    Object.defineProperty(document, 'createElement', {
      value: mockCreateElement,
      writable: true
    });
  });

  const renderComponent = (props = {}) => {
    return render(
      <BrowserRouter>
        <AnalyticsDashboard userId={props.userId || 1} isAdmin={props.isAdmin || false} />
      </BrowserRouter>
    );
  };

  test('renders analytics dashboard header', () => {
    renderComponent();

    expect(screen.getByText('Your Analytics')).toBeInTheDocument();
    expect(screen.getByTestId('activity')).toBeInTheDocument();
  });

  test('renders admin dashboard header', () => {
    renderComponent({ isAdmin: true });

    expect(screen.getByText('Platform Analytics')).toBeInTheDocument();
  });

  test('renders time range selector', () => {
    renderComponent();

    expect(screen.getByDisplayValue('Last 30 days')).toBeInTheDocument();
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    expect(screen.getByText('Last 90 days')).toBeInTheDocument();
    expect(screen.getByText('Last year')).toBeInTheDocument();
  });

  test('renders metric tabs', () => {
    renderComponent();

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Engagement')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  test('renders overview metrics', async () => {
    renderComponent({ selectedMetric: 'overview' });

    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('Sessions')).toBeInTheDocument();
      expect(screen.getByText('Page Views')).toBeInTheDocument();
      expect(screen.getByText('Engagement')).toBeInTheDocument();
    });

    expect(screen.getByText('1,000')).toBeInTheDocument(); // Total users
    expect(screen.getByText('200')).toBeInTheDocument(); // Sessions
    expect(screen.getByText('5,000')).toBeInTheDocument(); // Page views
    expect(screen.getByText('1,500')).toBeInTheDocument(); // Engagement
  });

  test('renders engagement charts', async () => {
    renderComponent({ selectedMetric: 'engagement' });

    await waitFor(() => {
      expect(screen.getByText('Engagement Trends')).toBeInTheDocument();
      expect(screen.getByText('Engagement Breakdown')).toBeInTheDocument();
    });

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  test('renders content analytics', async () => {
    renderComponent({ selectedMetric: 'content' });

    await waitFor(() => {
      expect(screen.getByText('Top Posts')).toBeInTheDocument();
      expect(screen.getByText('Top Sessions')).toBeInTheDocument();
    });

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  test('renders user analytics', async () => {
    renderComponent({ selectedMetric: 'users' });

    await waitFor(() => {
      expect(screen.getByText('User Activity')).toBeInTheDocument();
      expect(screen.getByText('New Users')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('Retention Rate')).toBeInTheDocument();
    });

    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  test('renders real-time metrics', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Real-time Activity')).toBeInTheDocument();
    });

    expect(screen.getByText('Active Users (1h)')).toBeInTheDocument();
    expect(screen.getByText('Page Views (1h)')).toBeInTheDocument();
    expect(screen.getByText('Sessions (1h)')).toBeInTheDocument();
    expect(screen.getByText('Active Users (24h)')).toBeInTheDocument();
  });

  test('handles time range change', async () => {
    renderComponent();

    const timeRangeSelect = screen.getByDisplayValue('Last 30 days');
    fireEvent.change(timeRangeSelect, { target: { value: '7d' } });

    await waitFor(() => {
      expect(analyticsService.getUserAnalytics).toHaveBeenCalledWith(1, { timeRange: '7d' });
    });
  });

  test('handles metric tab change', async () => {
    renderComponent();

    const engagementTab = screen.getByText('Engagement');
    fireEvent.click(engagementTab);

    expect(screen.getByText('Engagement Trends')).toBeInTheDocument();
  });

  test('handles refresh', async () => {
    renderComponent();

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(analyticsService.getUserAnalytics).toHaveBeenCalledWith(1, { timeRange: '30d' });
    });
  });

  test('shows loading state', () => {
    analyticsService.getUserAnalytics.mockImplementation(() => new Promise(() => {}));

    renderComponent();

    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
    expect(screen.getByTestId('loader2')).toBeInTheDocument();
  });

  test('shows error state', async () => {
    analyticsService.getUserAnalytics.mockRejectedValue(new Error('API Error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Error loading analytics')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(analyticsService.getUserAnalytics).toHaveBeenCalled();
    });
  });

  test('handles export functionality', async () => {
    renderComponent();

    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Export as JSON')).toBeInTheDocument();
      expect(screen.getByText('Export as CSV')).toBeInTheDocument();
    });
  });

  test('exports as JSON', async () => {
    const mockData = { users: { total: 1000 } };
    analyticsService.exportAnalytics.mockResolvedValue(mockData);

    renderComponent();

    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);
    
    const jsonExportButton = screen.getByText('Export as JSON');
    fireEvent.click(jsonExportButton);

    await waitFor(() => {
      expect(analyticsService.exportAnalytics).toHaveBeenCalledWith('json', { timeRange: '30d' });
    });
  });

  test('exports as CSV', async () => {
    const mockData = 'category,metric,value\nusers,total,1000';
    analyticsService.exportAnalytics.mockResolvedValue(mockData);

    renderComponent();

    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);
    
    const csvExportButton = screen.getByText('Export as CSV');
    fireEvent.click(csvExportButton);

    await waitFor(() => {
      expect(analyticsService.exportAnalytics).toHaveBeenCalledWith('csv', { timeRange: '30d' });
    });
  });

  test('sets up socket listeners', () => {
    renderComponent();

    expect(socket.on).toHaveBeenCalledWith('analytics_event', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('user_activity', expect.any(Function));
  });

  test('handles socket analytics update', async () => {
    renderComponent();

    const socketCallback = socket.on.mock.calls.find(call => call[0] === 'analytics_event')[1];
    
    socketCallback({
      type: 'PAGE_VIEW',
      userId: 1,
      data: { page: '/dashboard' },
      timestamp: new Date()
    });

    // Should update real-time metrics
    await waitFor(() => {
      expect(screen.getByText('Real-time Activity')).toBeInTheDocument();
    });
  });

  test('handles socket user activity update', async () => {
    renderComponent();

    const socketCallback = socket.on.mock.calls.find(call => call[0] === 'user_activity')[1];
    
    socketCallback({
      type: 'POST_CREATE',
      userId: 1,
      data: { title: 'New Post' },
      timestamp: new Date()
    });

    // Should update user activity
    await waitFor(() => {
      expect(screen.getByText('User Activity')).toBeInTheDocument();
    });
  });

  test('connects socket if not connected', () => {
    socket.connected = false;
    
    renderComponent();

    expect(socket.connect).toHaveBeenCalled();
  });

  test('formats numbers correctly', () => {
    renderComponent();

    // Should format large numbers
    expect(screen.getByText('1,000')).toBeInTheDocument(); // 1000 -> 1K
    expect(screen.getByText('5,000')).toBeInTheDocument(); // 5000 -> 5K
  });

  test('handles empty analytics data', async () => {
    analyticsService.getUserAnalytics.mockResolvedValue({
      users: { total: 0, active: 0, new: 0 },
      sessions: { total: 0, completed: 0 },
      events: {},
      engagement: { likes: 0, comments: 0 },
      timeline: []
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  test('handles missing real-time data', async () => {
    analyticsService.getUserAnalytics.mockResolvedValue({
      users: { total: 1000 },
      sessions: { total: 200 },
      events: { PAGE_VIEW: 500 },
      engagement: { likes: 1000 }
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('Real-time Activity')).not.toBeInTheDocument();
    });
  });

  test('handles missing top content data', async () => {
    analyticsService.getTopContent.mockResolvedValue({
      posts: [],
      sessions: []
    });

    renderComponent({ selectedMetric: 'content' });

    await waitFor(() => {
      expect(screen.getByText('Top Posts')).toBeInTheDocument();
      expect(screen.getByText('Top Sessions')).toBeInTheDocument();
    });
  });

  test('handles missing timeline data', async () => {
    analyticsService.getUserAnalytics.mockResolvedValue({
      users: { total: 1000 },
      sessions: { total: 200 },
      events: { PAGE_VIEW: 500 },
      engagement: { likes: 1000 },
      timeline: []
    });

    renderComponent({ selectedMetric: 'engagement' });

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  test('handles admin-specific features', async () => {
    renderComponent({ isAdmin: true });

    await waitFor(() => {
      expect(screen.getByText('Platform Analytics')).toBeInTheDocument();
    });

    // Admin should see platform metrics
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Sessions')).toBeInTheDocument();
  });

  test('handles user-specific features', async () => {
    renderComponent({ userId: 123, isAdmin: false });

    await waitFor(() => {
      expect(screen.getByText('Your Analytics')).toBeInTheDocument();
    });

    // User should see their own metrics
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Sessions')).toBeInTheDocument();
  });

  test('handles refresh button loading state', async () => {
    analyticsService.getUserAnalytics.mockImplementation(() => new Promise(() => {}));
    
    renderComponent();

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    expect(screen.getByTestId('refresh-cw')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('handles metric selection correctly', async () => {
    renderComponent();

    const contentTab = screen.getByText('Content');
    fireEvent.click(contentTab);

    await waitFor(() => {
      expect(screen.getByText('Top Posts')).toBeInTheDocument();
      expect(screen.getByText('Top Sessions')).toBeInTheDocument();
    });

    const userTab = screen.getByText('Users');
    fireEvent.click(userTab);

    await waitFor(() => {
      expect(screen.getByText('User Activity')).toBeInTheDocument();
      expect(screen.getByText('New Users')).toBeInTheDocument();
    });
  });

  test('handles export dropdown correctly', async () => {
    renderComponent();

    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Export as JSON')).toBeInTheDocument();
      expect(screen.getByText('Export as CSV')).toBeInTheDocument();
    });
  });

  test('handles export dropdown closing', async () => {
    renderComponent();

    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);

    // Click outside to close dropdown
    fireEvent.click(document.body);

    await waitFor(() => {
      expect(screen.queryByText('Export as JSON')).not.toBeInTheDocument();
      expect(screen.queryByText('Export as CSV')).not.toBeInTheDocument();
    });
  });
});
