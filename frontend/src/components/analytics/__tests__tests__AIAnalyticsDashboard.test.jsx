import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { 
  Brain, 
  TrendingUp, 
  Users, 
  Target, 
  Activity, 
  BarChart3, 
  PieChart, 
  LineChart, 
  Eye, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Filter,
  Download,
  Settings,
  Zap,
  Lightbulb,
  UserCheck,
  Calendar,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Star,
  Award,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Search,
  X,
  Info,
  Loader2
} from 'lucide-react';
import AIAnalyticsDashboard from '../AIAnalyticsDashboard';
import { aiAnalyticsAPI } from '../../../services/ai.analytics.api';
import socket from '../../../services/socket';

// Mock dependencies
jest.mock('../../../services/ai.analytics.api');
jest.mock('../../../services/socket', () => ({
  connected: false,
  connect: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn()
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

describe('AIAnalyticsDashboard Component', () => {
  const mockAnalyticsData = {
    totalEvents: 1000,
    activeUsers: 500,
    engagementRate: 0.75,
    avgSessionDuration: 1200,
    realTimeEvents: [
      {
        type: 'PAGE_VIEW',
        userId: 1,
        data: { description: 'Page view event' },
        timestamp: new Date()
      }
    ]
  };

  const mockPredictions = [
    {
      id: 1,
      predictionType: 'ENGAGEMENT',
      predictionData: JSON.stringify({
        description: 'User engagement prediction',
        currentScore: 0.8,
        trend: 0.1,
        projectedScore: 0.9
      }),
      confidence: 0.8,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isExecuted: false,
      feedback: null,
      feedbackScore: null
    },
    {
      id: 2,
      predictionType: 'RETENTION',
      predictionData: JSON.stringify({
        retentionProbability: 0.85,
        riskLevel: 'LOW',
        riskFactors: []
      }),
      confidence: 0.7,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isExecuted: true,
      feedback: 'Accurate',
      feedbackScore: 5
    }
  ];

  const mockInsights = [
    {
      id: 1,
      insightType: 'USER_TREND',
      title: 'Peak Activity Time Identified',
      description: 'Users are most active at 14:00',
      insightData: JSON.stringify({
        peakHour: 14,
        activityCount: 50,
        recommendation: 'Schedule important content releases during peak hours'
      }),
      confidence: 0.8,
      impact: 'MEDIUM',
      isActionable: true,
      isRead: false,
      isArchived: false,
      createdAt: new Date()
    },
    {
      id: 2,
      insightType: 'PLATFORM_TREND',
      title: 'Rapid User Growth Detected',
      description: 'Platform user base growing at 5.0% per week',
      insightData: JSON.stringify({
        growthRate: 0.05,
        newUsers: 150,
        recommendation: 'Ensure infrastructure can handle growth'
      }),
      confidence: 0.9,
      impact: 'HIGH',
      isActionable: true,
      isRead: false,
      isArchived: false,
      createdAt: new Date()
    }
  ];

  const mockRecommendations = [
    {
      id: 1,
      contentType: 'POST',
      contentId: 1,
      recommendationType: 'PERSONALIZED',
      score: 0.85,
      reason: 'Based on your interests and past interactions',
      isViewed: false,
      isInteracted: false,
      feedback: null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date()
    },
    {
      id: 2,
      contentType: 'MENTOR',
      contentId: 2,
      recommendationType: 'TRENDING',
      score: 0.75,
      reason: 'Trending in the community',
      isViewed: true,
      isInteracted: false,
      feedback: null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date()
    }
  ];

  const mockMetrics = {
    timeRange: '30d',
    metrics: [
      {
        metricType: 'USER_ENGAGEMENT',
        metricName: 'daily_engagement',
        metricValue: 0.75,
        metricUnit: 'percentage',
        calculatedAt: new Date()
      }
    ],
    generatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('1');
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    it('should render analytics dashboard component', () => {
      render(<AIAnalyticsDashboard />);
      
      expect(screen.getByTestId('ai-analytics-dashboard')).toBeInTheDocument();
    });

    it('should render loading state initially', () => {
      render(<AIAnalyticsDashboard />);
      
      expect(screen.getByTestId('ai-analytics-dashboard')).toBeInTheDocument();
      expect(screen.getByText(/Loading AI Analytics.../)).toBeInTheDocument();
    });

    it('should render error state when error occurs', () => {
      render(<AIAnalyticsDashboard />);
      
      // Mock API call to return error
      aiAnalyticsAPI.getAnalyticsData.mockRejectedValue(new Error('API Error'));
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load analytics data/)).toBeInTheDocument();
        expect(screen.getByText(/Please try again/)).toBeInTheDocument();
      });
    });

    it('should render with custom className', () => {
      render(<AIAnalyticsDashboard className="custom-class" />);
      
      expect(screen.getByTestId('ai-analytics-dashboard')).toHaveClass('custom-class');
    });

    it('should render compact mode', () => {
      render(<AIAnalyticsDashboard compact />);
      
      expect(screen.getByTestId('ai-analytics-dashboard')).toHaveClass('compact');
    });

    it('should render with animations enabled', () => {
      render(<AIAnalyticsDashboard animated />);
      
      expect(screen.getByTestId('ai-analytics-dashboard')).toHaveClass('animated');
    });

    it('should render with custom time range', () => {
      render(<AIAnalyticsDashboard timeRange="7d" />);
      
      expect(screen.getByText(/7d/)).toBeInTheDocument();
    });

    it('should render with auto-refresh enabled', () => {
      render(<AIAnalyticsDashboard autoRefresh={true} />);
      
      // Auto-refresh indicator should be visible
      expect(screen.getByText(/Auto-refresh enabled/)).toBeInTheDocument();
    });
  });

  describe('Header Section', () => {
    it('should render header with title and actions', () => {
      render(<AIAnalyticsDashboard />);
      
      expect(screen.getByText(/AI Analytics Dashboard/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Filter/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Refresh/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Export/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Settings/ })).toBeInTheDocument();
    });

    it('should toggle filters panel when filter button clicked', async () => {
      render(<AIAnalyticsDashboard />);
      
      const filterButton = screen.getByRole('button', { name: /Filter/ });
      
      fireEvent.click(filterButton);
      
      expect(screen.getByText(/Analytics Filters/)).toBeInTheDocument();
      expect(screen.getByRole('select', { name: /Time Range/ })).toBeInTheDocument();
    });

    it('should refresh data when refresh button clicked', async () => {
      render(<AIAnalyticsDashboard />);
      
      const refreshButton = screen.getByRole('button', { name: /Refresh/ });
      
      // Mock API calls
      aiAnalyticsAPI.getAnalyticsData.mockResolvedValue(mockAnalyticsData);
      aiAnalyticsAPI.getPredictions.mockResolvedValue(mockPredictions);
      aiAnalyticsAPI.getInsights.mockResolvedValue(mockInsights);
      aiAnalyticsAPI.getContentRecommendations.mockResolvedValue(mockRecommendations);
      aiAnalyticsAPI.getMetrics.mockResolvedValue(mockMetrics);

      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText(/Analytics data refreshed/)).toBeInTheDocument();
      });
    });

    it('should export analytics when export button clicked', async () => {
      render(<AIAnalyticsDashboard />);
      
      const exportButton = screen.getByRole('button', { name: /Export/ });
      
      // Mock export API
      aiAnalyticsAPI.exportAnalytics.mockResolvedValue('{"data": "exported"}');
      
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(aiAnalyticsAPI.exportAnalytics).toHaveBeenCalled();
      });
    });
  });

  describe('Filters Panel', () => {
    it('should render filters panel when shown', async () => {
      render(<AIAnalyticsDashboard />);
      
      const filterButton = screen.getByRole('button', { name: /Filter/ });
      fireEvent.click(filterButton);
      
      expect(screen.getByText(/Analytics Filters/)).toBeInTheDocument();
      expect(screen.getByRole('select', { name: /Time Range/ })).toBeInTheDocument();
      expect(screen.getByRole('select', { name: /Insight Type/ })).toBeInTheDocument();
      expect(screen.getByRole('select', { name: /Prediction Type/ })).toBeInTheDocument();
      expect(screen.getByRole('select', { name: /Content Type/ })).toBeInTheDocument();
    });

    it('should update filters when values change', async () => {
      render(<AIAnalyticsDashboard />);
      
      const filterButton = screen.getByRole('button', { name: /Filter/ });
      fireEvent.click(filterButton);
      
      const timeRangeSelect = screen.getByRole('select', { name: /Time Range/ });
      
      fireEvent.change(timeRangeSelect, { target: { value: '7d' } });
      
      expect(timeRangeSelect.value).toBe('7d');
    });

    it('should hide filters panel when close button clicked', async () => {
      render(<AIAnalyticsDashboard />);
      
      const filterButton = screen.getByRole('button', { name: /Filter/ });
      fireEvent.click(filterButton);
      
      // Close button should appear
      expect(screen.getByRole('button', { name: /Close/ })).toBeInTheDocument();
      
      const closeButton = screen.getByRole('button', { name: /Close/ });
      fireEvent.click(closeButton);
      
      expect(screen.queryByText(/Analytics Filters/)).not.toBeInTheDocument();
    });
  });

  describe('Overview Section', () => {
    it('should render overview section with metrics', async () => {
      render(<AIAnalyticsDashboard />);
      
      // Mock metrics
      aiAnalyticsAPI.getMetrics.mockResolvedValue(mockMetrics);
      
      await waitFor(() => {
        expect(screen.getByText(/Overview/)).toBeInTheDocument();
        expect(screen.getByText(/Total Events/)).toBeInTheDocument();
        expect(screen.getByText(/Active Users/)).toBeInTheDocument();
        expect(screen.getByText(/Engagement Rate/)).toBeInTheDocument();
        expect(screen.getByText(/Avg. Session Duration/)).toBeInTheDocument();
      });
    });

    it('should toggle overview section when header clicked', async () => {
      render(<AIAnalyticsDashboard />);
      
      const overviewHeader = screen.getByText(/Overview/);
      
      fireEvent.click(overviewHeader);
      
      // Section should collapse
      expect(screen.queryByText(/Total Events/)).not.toBeInTheDocument();
      
      // Click again to expand
      fireEvent.click(overviewHeader);
      
      expect(screen.getByText(/Total Events/)).toBeInTheDocument();
    });

    it('should display metrics values correctly', async () => {
      render(<AIAnalyticsDashboard />);
      
      aiAnalyticsAPI.getMetrics.mockResolvedValue(mockMetrics);
      
      await waitFor(() => {
        expect(screen.getByText(/1000/)).toBeInTheDocument(); // Total Events
        expect(screen.getByText(/500/)).toBeInTheDocument(); // Active Users
        expect(screen.getByText(/75%/)).toBeInTheDocument(); // Engagement Rate
        expect(screen.getByText(/20m/)).toBeInTheDocument(); // Avg Session Duration
      });
    });
  });

  describe('Predictions Section', () => {
    it('should render predictions section with predictions', async () => {
      render(<AIAnalyticsDashboard />);
      
      // Mock predictions
      aiAnalyticsAPI.getPredictions.mockResolvedValue(mockPredictions);
      
      await waitFor(() => {
        expect(screen.getByText(/AI Predictions/)).toBeInTheDocument();
        expect(screen.getByText(/2 predictions/)).toBeInTheDocument();
        expect(screen.getByText(/ENGAGEMENT/)).toBeInTheDocument();
        expect(screen.getByText(/RETENTION/)).toBeInTheDocument();
      });
    });

    it('should toggle predictions section when header clicked', async () => {
      render(<AIAnalyticsDashboard />);
      
      const predictionsHeader = screen.getByText(/AI Predictions/);
      
      fireEvent.click(predictionsHeader);
      
      // Section should collapse
      expect(screen.queryByText(/ENGAGEMENT/)).not.toBeInTheDocument();
      
      // Click again to expand
      fireEvent.click(predictionsHeader);
      
      expect(screen.getByText(/ENGAGEMENT/)).toBeInTheDocument();
    });

    it('should display prediction details correctly', async () => {
      render(<AIAnalyticsDashboard />);
      
      aiAnalyticsAPI.getPredictions.mockResolvedValue(mockPredictions);
      
      await waitFor(() => {
        expect(screen.getByText(/80% confidence/)).toBeInTheDocument();
        expect(screen.getByText(/User engagement prediction/)).toBeInTheDocument());
        expect(screen.getByText(/85% retention probability/)).toBeInTheDocument());
        expect(screen.getByText(/Low risk level/)).toBeInTheDocument());
      });
    });

    it('should handle prediction feedback', async () => {
      render(<AIAnalyticsDashboard />);
      
      aiAnalyticsAPI.getPredictions.mockResolvedValue(mockPredictions);
      aiAnalyticsAPI.updatePredictionFeedback.mockResolvedValue({});
      
      await waitFor(() => {
        const accurateButton = screen.getByText(/Accurate/);
        const inaccurateButton = screen.getByText(/Inaccurate/);
        
        fireEvent.click(accurateButton);
        
        expect(aiAnalyticsAPI.updatePredictionFeedback).toHaveBeenCalledWith(1, {
          feedback: 'accurate',
          feedbackScore: 5
        });
      });
    });

    it('should show executed status for predictions', async () => {
      render(<AIAnalyticsDashboard />);
      
      aiAnalyticsAPI.getPredictions.mockResolvedValue(mockPredictions);
      
      await waitFor(() => {
        const executedPrediction = screen.getByText(/RETENTION/)).closest('[data-executed="true"]');
        const notExecutedPrediction = screen.getByText(/ENGAGEMENT/).closest('[data-executed="false"]');
        
        expect(executedPrediction).toBeInTheDocument();
        expect(notExecutedPrediction).toBeInTheDocument();
      });
    });
  });

  describe('Insights Section', () => {
    it('should render insights section with insights', async () => {
      render(<AIAnalyticsDashboard />);
      
      // Mock insights
      aiAnalyticsAPI.getInsights.mockResolvedValue(mockInsights);
      
      await waitFor(() => {
        expect(screen.getByText(/AI Insights/)).toBeInTheDocument();
        expect(screen.getByText(/2 insights/)).toBeInTheDocument());
        expect(screen.getByText(/USER_TREND/)).toBeInTheDocument();
        expect(screen.getByText(/PLATFORM_TREND/)).toBeInTheDocument());
      });
    });

    it('should toggle insights section when header clicked', async () => {
      render(<AIAnalyticsDashboard />);
      
      const insightsHeader = screen.getByText(/AI Insights/);
      
      fireEvent.click(insightsHeader);
      
      // Section should collapse
      expect(screen.queryByText(/USER_TREND/)).not.toBeInTheDocument();
      
      // Click again to expand
      fireEvent.click(insightsHeader);
      
      expect(screen.getByText(/USER_TREND/)).toBeInTheDocument();
    });

    it('should display insight details correctly', async () => {
      render(<AIAnalyticsDashboard />);
      
      aiAnalyticsAPI.getInsights.mockResolvedValue(mockInsights);
      
      await waitFor(() => {
        expect(screen.getByText(/Peak Activity Time Identified/)).toBeInTheDocument());
        expect(screen.getByText(/Users are most active at 14:00/)).toBeInTheDocument());
        expect(screen.getByText(/80% confidence/)).toBeInTheDocument());
        expect(screen.getByText(/Medium Impact/)).toBeInTheDocument());
      });
    });

    it('should handle insight click to show details', async () => {
      render(<AIAnalyticsDashboard />);
      
      aiAnalyticsAPI.getInsights.mockResolvedValue(mockInsights);
      aiAnalyticsAPI.markInsightAsRead.mockResolvedValue({});
      
      await waitFor(() => {
        const insightCard = screen.getByText(/Peak Activity Time Identified/);
        fireEvent.click(insightCard);
        
        // Modal should appear
        expect(screen.getByText(/Insight Details/)).toBeInTheDocument();
        expect(screen.getByText(/Description/)).toBeInTheDocument();
        expect(screen.getByText(/Impact/)).toBeInTheDocument());
        expect(screen.getByText(/Confidence/)).toBeInTheDocument());
      });
    });

    it('should mark insight as read when clicked', async () => {
      render(<AIAnalyticsDashboard />);
      
      aiAnalyticsAPI.getInsights.mockResolvedValue(mockInsights);
      
      await waitFor(() => {
        const insightCard = screen.getByText(/Peak Activity Time Identified/);
        fireEvent.click(insightCard);
        
        expect(aiAnalyticsAPI.markInsightAsRead).toHaveBeenCalledWith(1);
      });
    });

    it('should filter insights by search term', async () => {
      render(<AIAnalyticsDashboard />);
      
      aiAnalyticsAPI.getInsights.mockResolvedValue(mockInsights);
      
      const searchInput = screen.getByPlaceholderText(/Search insights and predictions.../);
      
      fireEvent.change(searchInput, { target: { value: 'Peak Activity' } });
      
      await waitFor(() => {
        expect(screen.getByText(/Peak Activity Time Identified/)).toBeInTheDocument();
        expect(screen.queryByText(/Rapid User Growth/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Recommendations Section', () => {
    it('should render recommendations section with recommendations', async () => {
      render(<AIAnalyticsDashboard />);
      
      // Mock recommendations
      aiAnalyticsAPI.getContentRecommendations.mockResolvedValue(mockRecommendations);
      
      await waitFor(() => {
        expect(screen.getByText(/Recommendations/)).toBeInTheDocument());
        expect(screen.getByText(/2 recommendations/)).toBeInTheDocument());
        expect(screen.getByText(/POST/)).toBeInTheDocument());
        expect(screen.getByText(/MENTOR/)).toBeInTheDocument());
      });
    });

    it('should toggle recommendations section when header clicked', async () => {
      render(<AIAnalyticsDashboard />);
      
      const recommendationsHeader = screen.getByText(/Recommendations/);
      
      fireEvent.click(recommendationsHeader);
      
      // Section should collapse
      expect(screen.queryByText(/POST/)).not.toBeInTheDocument();
      
      // Click again to expand
      fireEvent.click(recommendationsHeader);
      
      expect(screen.getByText(/POST/)).toBeInTheDocument();
    });

    it('should display recommendation details correctly', async () => {
      render(<AIAnalyticsDashboard />);
      
      aiAnalyticsAPI.getContentRecommendations.mockResolvedValue(mockRecommendations);
      
      await waitFor(() => {
        expect(screen.getByText(/85% match/)).toBeInTheDocument();
        expect(screen.getByText(/Based on your interests/)).toBeInTheDocument());
        expect(screen.getByText(/Trending in the community/)).toBeInTheDocument());
      });
    });

    it('should handle recommendation interactions', async () => {
      render(<AIAnalyticsDashboard />);
      
      aiAnalyticsAPI.getContentRecommendations.mockResolvedValue(mockRecommendations);
      aiAnalyticsAPI.updateRecommendationInteraction.mockResolvedValue({});
      
      await waitFor(() => {
        const viewButton = screen.getByText(/View/);
        const engageButton = screen.getByText(/Engage/);
        
        fireEvent.click(viewButton);
        expect(aiAnalyticsAPI.updateRecommendationInteraction).toHaveBeenCalledWith(1, 'view');
        
        fireEvent.click(engageButton);
        expect(aiAnalyticsAPI.updateRecommendationInteraction).toHaveBeenCalledWith(1, 'interact');
      });
    });

    it('should show interaction status for recommendations', async () => {
      render(<AIAnalytics />);
      
      aiAnalyticsAPI.getContentRecommendations.mockResolvedValue(mockRecommendations);
      
      await waitFor(() => {
        const viewedRecommendation = screen.getByText(/POST/).closest('[data-interacted="true"]');
        const notViewedRecommendation = screen.getByText(/MENTOR/).closest('[data-interacted="false"]');
        
        expect(viewedRecommendation).toBeInTheDocument();
        expect(notViewedRecommendation).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Events', () => {
    it('should render real-time activity when events exist', async () => {
      render(<AIAnalyticsDashboard />);
      
      // Mock analytics data with real-time events
      aiAnalyticsAPI.getAnalyticsData.mockResolvedValue(mockAnalyticsData);
      
      await waitFor(() => {
        expect(screen.getByText(/Real-time Activity/)).toBeInTheDocument());
        expect(screen.getByText(/Page view event/)).toBeInTheDocument());
      });
    });

    it('should not render real-time activity when no events', async () => {
      render(<AIAnalyticsDashboard />);
      
      // Mock analytics data without real-time events
      const analyticsDataWithoutEvents = { ...mockAnalyticsData, realTimeEvents: [] };
      aiAnalyticsAPI.getAnalyticsData.mockResolvedValue(analyticsDataWithoutEvents);
      
      await waitFor(() => {
        expect(screen.queryByText(/Real-time Activity/)).not.toBeInTheDocument();
      });
    });

    it('should limit real-time events display', async () => {
      render(<AIAnalyticsDashboard />);
      
      // Mock analytics data with many real-time events
      const manyEvents = Array.from({ length: 20 }, (_, i) => ({
        type: 'PAGE_VIEW',
        userId: 1,
        data: { description: `Event ${i + 1}` },
        timestamp: new Date()
      }));
      
      const analyticsDataWithManyEvents = { ...mockAnalyticsData, realTimeEvents: manyEvents };
      aiAnalyticsAPI.getAnalyticsData.mockResolvedValue(analyticsDataWithManyEvents);
      
      await waitFor(() => {
        expect(screen.getByText(/Real-time Activity/)).toBeInTheDocument();
        // Should show last 10 events only
        expect(screen.queryAll('[data-testid="real-time-event"]')).toHaveLength(10);
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter insights and predictions by search term', async () => {
      render(<AIAnalyticsDashboard />);
      
      aiAnalyticsAPI.getInsights.mockResolvedValue(mockInsights);
      aiAnalyticsAPI.getPredictions.mockResolvedValue(mockPredictions);
      
      const searchInput = screen.getByPlaceholderText(/Search insights and predictions.../);
      
      fireEvent.change(searchInput, { target: { value: 'Peak Activity' } });
      
      await waitFor(() => {
        expect(screen.getByText(/Peak Activity Time Identified/)).toBeInTheDocument();
        expect(screen.queryByText(/Rapid User Growth/)).not.toBeInTheDocument();
      });
    });

    it('should clear search when input is cleared', async () => {
      render(<AIAnalyticsDashboard />);
      
      aiAnalyticsAPI.getInsights.mockResolvedValue(mockInsights);
      aiAnalyticsAPI.getPredictions.mockResolvedValue(mockPredictions);
      
      const searchInput = screen.getByPlaceholderText(/Search insights and predictions.../);
      
      fireEvent.change(searchInput, { target: { value: 'test' } });
      fireEvent.change(searchInput, { target: { value: '' } });
      
      await waitFor(() => {
        expect(screen.getByText(/Peak Activity Time Identified/)).toBeInTheDocument());
        expect(screen.getByText(/Rapid User Growth Detected/)).toBeInTheDocument());
      });
    });
  });

  describe('Socket.io Integration', () => {
    it('should authenticate with socket on mount', async () => {
      render(<AIAnalyticsDashboard />);
      
      // Mock socket connection
      socket.connected = true;
      localStorage.setItem('accessToken', 'test-token');
      
      await waitFor(() => {
        expect(socket.emit).toHaveBeenCalledWith('authenticate', { userId: '1' });
      });
    });

    it('should listen for real-time analytics events', async () => {
      render(<AIAnalyticsDashboard />);
      
      // Mock socket connection
      socket.connected = true;
      localStorage.setItem('accessToken', 'test-token');
      
      // Mock socket event listeners
      const socketEventHandler = jest.fn();
      socket.on.mockImplementation((event, handler) => {
        if (event === 'analytics_event') {
          handler({ userId: 1, type: 'PAGE_VIEW', data: {} });
        }
      });

      await waitFor(() => {
        expect(socket.on).toHaveBeenCalledWith('analytics_event', expect.any(Function));
      });
    });

    it('should handle socket disconnection gracefully', async () => {
      render(<AIAnalyticsDashboard />);
      
      // Mock socket disconnection
      socket.connected = false;
      
      await waitFor(() => {
        expect(screen.queryByText(/Socket connection failed/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      render(<AIAnalyticsDashboard />);
      
      // Mock API error
      aiAnalyticsAPI.getAnalyticsData.mockRejectedValue(new Error('API Error'));
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load analytics data/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
      });
    });

    it('should handle socket errors gracefully', async () => {
      render(<AIAnalyticsDashboard />);
      
      // Mock socket error
      socket.connected = false;
      localStorage.setItem('accessToken', 'invalid-token');
      
      await waitFor(() => {
        expect(screen.queryByText(/Socket connection failed/)).not.toBeInTheDocument();
      });
    });

    it('should handle validation errors gracefully', async () => {
      render(<AIAnalyticsDashboard />);
      
      // Mock validation error
      aiAnalyticsAPI.getAnalyticsData.mockRejectedValue(new Error('Validation Error'));
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load analytics data/)).toBeInTheDocument();
        expect(screen.getByText(/Please try again/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('have proper ARIA labels', () => {
      render(<AIAnalyticsDashboard />);
      
      expect(screen.getByLabelText(/Total Events/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Active Users/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Engagement Rate/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Avg. Session Duration/)).toBeInTheDocument();
    });

    it('be keyboard navigable', () => {
      render(<AIAnalyticsDashboard />);
      
      const filterButton = screen.getByRole('button', { name: /Filter/ });
      const refreshButton = screen.getByRole('button', { name: /Refresh/ });
      const exportButton = screen.getByRole('button', { name: /Export/ });
      
      expect(filterButton).toHaveAttribute('tabIndex', '0');
      expect(refreshButton).toHaveAttribute('tabIndex', '1');
      expect(exportButton).toHaveAttribute('tabIndex', '2');
    });

    it('announce status changes to screen readers', async () => {
      render(<AIAnalyticsDashboard />);
      
      // Mock loading completion
      aiAnalyticsAPI.getAnalyticsData.mockResolvedValue(mockAnalyticsData);
      
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      render(<AIAnalyticsDashboard />);
      
      // Mock large dataset
      const largeInsights = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        insightType: 'USER_TREND',
        title: `Insight ${i + 1}`,
        description: `Description ${i + 1}`,
        confidence: 0.8,
        impact: 'MEDIUM',
        isActionable: true,
        isRead: false,
        isArchived: false,
        createdAt: new Date()
      }));
      
      aiAnalyticsAPI.getInsights.mockResolvedValue(largeInsights);
      
      await waitFor(() => {
        expect(screen.getByText(/1000 insights/)).toBeInTheDocument();
        expect(screen.getByText(/View all insights/)).toBeInTheDocument();
      });
    });

    'should handle rapid filter changes', async () => {
      render(<AIAnalyticsDashboard />);
      
      const filterButton = screen.getByRole('button', { name: /Filter/ });
      const searchInput = screen.getByPlaceholderText(/Search insights and predictions.../);
      
      // Rapid filter changes
      fireEvent.click(filterButton);
      fireEvent.change(searchInput, { target: { value: 'test1' } });
      fireEvent.change(searchInput, { target: { value: 'test2' } });
      fireEvent.change(searchInput, { target: { value: 'test3' } });
      
      // Should debounce rapid changes
      jest.useFakeTimers();
      jest.advanceTimersByTime(100);
      
      await waitFor(() => {
        expect(screen.queryByText(/test3/)).not.toBeInTheDocument();
      });
    });

    it('should handle memory pressure gracefully', async () => {
      render(<AIAnalyticsDashboard />);
      
      // Mock memory pressure
      const memoryUsage = {
        heapUsed: 600 * 1024 * 1024,
        heapTotal: 500 * 1024 * 1024
      };
      process.memoryUsage = memoryUsage;
      
      // Should still render correctly
      expect(screen.getByTestId('ai-analytics-dashboard')).toBeInTheDocument();
      expect(screen.getByText(/AI Analytics Dashboard/)).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapt to mobile screen size', () => {
      // Mock mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;

      render(<AIAnalyticsDashboard />);
      
      expect(screen.getByTestId('ai-analytics-dashboard')).toHaveClass('mobile-optimized');
      expect(screen.getByTestId('ai-analytics-dashboard')).toHaveClass('tablet-optimized'));
    });

    it('adapt to tablet screen size', () => {
      // Mock tablet viewport
      global.innerWidth = 768;
      global.innerHeight = 1024;

      render(<AIAnalyticsDashboard />);
      
      expect(screen.getByTestId('ai-analytics-dashboard')).toHaveClass('tablet-optimized');
      expect(screen.getByTestId('ai-analytics-dashboard')).toHaveClass('mobile-optimized'));
    });

    it('handle rapid user interactions', () => {
      render(<AIAnalyticsDashboard />);
      
      const searchInput = screen.getByPlaceholderText(/Search insights and predictions.../);
      const filterButton = screen.getByRole('button', { name: /Filter/ });
      const refreshButton = screen.getByRole('button', { name: /Refresh/ });
      
      // Rapid interactions
      fireEvent.change(searchInput, { target: { value: 'Rapid Test' } });
      fireEvent.click(filterButton);
      fireEvent.click(refreshButton);
      
      // Should debounce rapid changes
      jest.useFakeTimers();
      jest.advanceTimersByTime(100);
      
      await waitFor(() => {
        expect(screen.queryByText(/Rapid Test/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Integration', () => {
    it('should integrate with AI analytics API', async () => {
      render(<AIAnalyticsDashboard />);
      
      // Mock API calls
      aiAnalyticsAPI.getAnalyticsData.mockResolvedValue(mockAnalyticsData);
      aiAnalyticsAPI.getPredictions.mockResolvedValue(mockPredictions);
      aiAnalyticsAPI.getInsights.mockResolvedValue(mockInsights);
      aiAnalyticsAPI.getContentRecommendations.mockResolvedValue(mockRecommendations);
      aiAnalyticsAPI.getMetrics.mockResolvedValue(mockMetrics);
      
      await waitFor(() => {
        expect(screen.getByText(/Total Events/)).toBeInTheDocument();
        expect(screen.getByText(/AI Predictions/)).toBeInTheDocument();
        expect(screen.getByText(/AI Insights/)).toBeInTheDocument();
        expect(screen.getByText(/Recommendations/)).toBeInTheDocument();
      });
    });

    it('should integrate with socket service', async () => {
      render(<AIAnalyticsDashboard />);
      
      // Mock socket connection
      socket.connected = true;
      localStorage.setItem('accessToken', 'test-token');
      
      // Mock socket event listeners
      const socketEventHandler = jest.fn();
      socket.on.mockImplementation((event, handler) => {
        if (event === 'analytics_event') {
          handler({ userId: 1, type: 'PAGE_VIEW', data: {} });
        }
      });

      // Replace the socket service instance
      const originalModule = require('../../services/ai.analytics.socket.service');
      Object.defineProperty(originalModule, 'default', {
        value: jest.fn().mockImplementation(() => ({
          handleUserConnection: jest.fn(),
          broadcastAnalyticsEvent: jest.fn(),
          broadcastPredictionUpdate: jest.fn(),
          broadcastInsightUpdate: jest.fn(),
          broadcastRecommendationUpdate: jest.fn(),
          broadcastMetricsUpdate: jest.fn()
        })),
        writable: true
      });

      await waitFor(() => {
        expect(socket.on).toHaveBeenCalledWith('analytics_event', expect.any(Function));
      });
    });

    it('should handle concurrent API calls', async () => {
      render(<AIAnalyticsDashboard />);
      
      // Mock concurrent API calls
      aiAnalyticsAPI.getAnalyticsData.mockResolvedValue(mockAnalyticsData);
      aiAnalyticsAPI.getPredictions.mockResolvedValue(mockPredictions);
      aiAnalyticsAPI.getInsights.mockResolvedValue(mockInsights);
      aiAnalyticsAPI.getContentRecommendations.mockResolvedValue(mockRecommendations);
      aiAnalyticsAPI.getMetrics.mockResolvedValue(mockMetrics);

      await waitFor(() => {
        expect(screen.getByText(/Total Events/)).toBeInTheDocument();
        expect(screen.getByText(/AI Predictions/)).toBeInTheDocument();
        expect(screen.getByText(/AI Insights/)).toBeInTheDocument();
        expect(screen.getByText(/Recommendations/)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty analytics data', async () => {
      render(<AIAnalyticsDashboard />);
      
      const emptyAnalyticsData = {
        totalEvents: 0,
        activeUsers: 0,
        engagementRate: 0,
        avgSessionDuration: 0,
        realTimeEvents: []
      };
      
      aiAnalyticsAPI.getAnalyticsData.mockResolvedValue(emptyAnalyticsData);
      
      await waitFor(() => {
        expect(screen.getByText(/0/)).toBeInTheDocument()); // Total Events
        expect(screen.getByText(/0/)).toBeInTheDocument(); // Active Users
        expect(screen.getByText(/0%/)).toBeInTheDocument(); // Engagement Rate
        expect(screen.getByText(/0m/)).toBeInTheDocument(); // Avg Session Duration
      });
    });

    it('should handle null analytics data', async () => {
      render(<AIAnalyticsDashboard />);
      
      aiAnalyticsAPI.getAnalyticsData.mockResolvedValue(null);
      
      await waitFor(() => {
        expect(screen.getByText(/No analytics data available/)).toBeInTheDocument();
      });
    });

    'should handle invalid JSON data in predictions', async () => {
      render(<AIAnalyticsDashboard />);
      
      const invalidPredictions = [
        {
          id: 1,
          predictionType: 'ENGAGEMENT',
          predictionData: 'invalid-json',
          confidence: 0.8,
          expiresAt: new Date()
        }
      ];
      
      aiAnalyticsAPI.getPredictions.mockResolvedValue(invalidPredictions);
      
      await waitFor(() => {
        expect(screen.getByText(/ENGAGEMENT/)).toBeInTheDocument();
        expect(screen.queryByText(/invalid-json/)).not.toBeInTheDocument();
      });
    });

    it('should handle expired recommendations', async () => {
      render(<AIAnalyticsDashboard />);
      
      const expiredRecommendations = [
        {
          id: 1,
          contentType: 'POST',
          contentId: 1,
          recommendationType: 'PERSONALIZED',
          score: 0.8,
          reason: 'Based on your interests',
          isViewed: false,
          isInteracted: false,
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
          createdAt: new Date()
        }
      ];
      
      aiAnalyticsAPI.getContentRecommendations.mockResolvedValue(expiredRecommendations);
      
      await waitFor(() => {
        expect(screen.getByText(/POST/)).toBeInTheDocument();
        expect(screen.queryByText(/Based on your interests/)).not.toBeInTheDocument());
      });
    });

    it('should handle missing user ID', async () => {
      render(<AIAnalyticsDashboard userId={null} />);
      
      localStorageMock.getItem.mockReturnValue(null);
      
      await waitFor(() => {
        expect(screen.getByText(/Authentication required/)).toBeInTheDocument();
      });
    });
  });

  describe('Component Lifecycle', () => {
    it('should unmount cleanly', async () => {
      const unmount = render(<AIAnalyticsDashboard />);
      
      // Mock socket cleanup
      const socketEventHandler = jest.fn();
      socket.off.mockImplementation((event, handler) => {
        if (event === 'analytics_event') {
          socketEventHandler.mockClear();
        }
      });

      unmount();

      expect(socketEventHandler).toHaveBeenCalled();
    });

    it('should handle rapid state changes', async () => {
      const { rerender } = render(<AIAnalyticsDashboard />);
      
      // Rapid state changes
      rerender(<AIAnalyticsDashboard timeRange="7d" />);
      rerender(<AIAnalyticsDashboard timeRange="30d" />);
      rerender(<AIAnalyticsDashboard autoRefresh={false} />);
      
      // Should handle all state changes
      expect(screen.getByText(/7d/)).toBeInTheDocument();
      expect(screen.getByText(/30d/)).toBeInTheDocument();
      expect(screen.queryByText(/Auto-refresh enabled/)).not.toBeInTheDocument();
    });
  });
});
