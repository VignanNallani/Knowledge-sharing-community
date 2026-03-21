import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { aiAnalyticsAPI } from '../../services/ai.analytics.api';
import socket from '../../services/socket';

const AIAnalyticsDashboard = ({ 
  className = '', 
  compact = false, 
  animated = true,
  userId = null,
  timeRange = '30d',
  autoRefresh = true 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [insights, setInsights] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [filters, setFilters] = useState({
    timeRange,
    insightType: 'USER_TREND',
    predictionType: 'ENGAGEMENT',
    recommendationType: 'PERSONALIZED',
    contentType: 'POST'
  });
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    predictions: true,
    insights: true,
    recommendations: true,
    metrics: false
  });
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    if (socket.connected) {
      socket.emit('authenticate', { userId: userId || localStorage.getItem('userId') });
    }

    // Listen for real-time analytics updates
    const handleAnalyticsEvent = (data) => {
      setAnalyticsData(prev => ({
        ...prev,
        realTimeEvents: [...(prev?.realTimeEvents || []), data].slice(-100)
      }));
    };

    const handlePredictionUpdate = (data) => {
      setPredictions(prev => {
        const existing = prev.findIndex(p => p.id === data.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data;
          return updated;
        }
        return [data, ...prev].slice(0, 20);
      });
    };

    const handleInsightUpdate = (data) => {
      setInsights(prev => {
        const existing = prev.findIndex(i => i.id === data.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data;
          return updated;
        }
        return [data, ...prev].slice(0, 50);
      });
    };

    socket.on('analytics_event', handleAnalyticsEvent);
    socket.on('prediction_updated', handlePredictionUpdate);
    socket.on('insight_updated', handleInsightUpdate);

    return () => {
      socket.off('analytics_event', handleAnalyticsEvent);
      socket.off('prediction_updated', handlePredictionUpdate);
      socket.off('insight_updated', handleInsightUpdate);
    };
  }, [userId]);

  // Load initial data
  useEffect(() => {
    loadAnalyticsData();
    loadPredictions();
    loadInsights();
    loadRecommendations();
    loadMetrics();
  }, [filters]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadMetrics();
      loadAnalyticsData();
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [autoRefresh, filters]);

  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await aiAnalyticsAPI.getAnalyticsData(filters);
      setAnalyticsData(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load analytics data');
      console.error('Error loading analytics data:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadPredictions = useCallback(async () => {
    try {
      const data = await aiAnalyticsAPI.getPredictions(userId, filters.predictionType);
      setPredictions(data);
    } catch (err) {
      console.error('Error loading predictions:', err);
    }
  }, [userId, filters.predictionType]);

  const loadInsights = useCallback(async () => {
    try {
      const data = await aiAnalyticsAPI.getInsights(filters.insightType);
      setInsights(data);
    } catch (err) {
      console.error('Error loading insights:', err);
    }
  }, [filters.insightType]);

  const loadRecommendations = useCallback(async () => {
    try {
      const data = await aiAnalyticsAPI.getContentRecommendations(userId, {
        contentType: filters.contentType,
        type: filters.recommendationType,
        limit: 20
      });
      setRecommendations(data);
    } catch (err) {
      console.error('Error loading recommendations:', err);
    }
  }, [userId, filters.contentType, filters.recommendationType]);

  const loadMetrics = useCallback(async () => {
    try {
      const data = await aiAnalyticsAPI.getMetrics(filters.timeRange);
      setMetrics(data);
    } catch (err) {
      console.error('Error loading metrics:', err);
    }
  }, [filters.timeRange]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadAnalyticsData(),
        loadPredictions(),
        loadInsights(),
        loadRecommendations(),
        loadMetrics()
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [loadAnalyticsData, loadPredictions, loadInsights, loadRecommendations, loadMetrics]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleInsightClick = useCallback((insight) => {
    setSelectedInsight(insight);
    // Mark insight as read
    aiAnalyticsAPI.markInsightAsRead(insight.id);
  }, []);

  const handlePredictionFeedback = useCallback(async (prediction, feedback, score) => {
    try {
      await aiAnalyticsAPI.updatePredictionFeedback(prediction.id, {
        feedback,
        feedbackScore: score
      });
      
      setPredictions(prev => 
        prev.map(p => 
          p.id === prediction.id 
            ? { ...p, feedback, feedbackScore: score }
            : p
        )
      );
    } catch (err) {
      console.error('Error updating prediction feedback:', err);
    }
  }, []);

  const handleRecommendationInteraction = useCallback(async (recommendation, type) => {
    try {
      await aiAnalyticsAPI.updateRecommendationInteraction(recommendation.id, type);
      
      setRecommendations(prev => 
        prev.map(r => 
          r.id === recommendation.id 
            ? { ...r, isInteracted: true, isViewed: true }
            : r
        )
      );
    } catch (err) {
      console.error('Error updating recommendation interaction:', err);
    }
  }, []);

  const exportAnalytics = useCallback(async (format = 'json') => {
    try {
      const data = await aiAnalyticsAPI.exportAnalytics(format, filters);
      
      // Create download link
      const blob = new Blob([data], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${filters.timeRange}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting analytics:', err);
    }
  }, [filters]);

  const filteredInsights = useMemo(() => {
    if (!searchTerm) return insights;
    
    const lowerSearch = searchTerm.toLowerCase();
    return insights.filter(insight => 
      insight.title.toLowerCase().includes(lowerSearch) ||
      insight.description.toLowerCase().includes(lowerSearch)
    );
  }, [insights, searchTerm]);

  const filteredPredictions = useMemo(() => {
    if (!searchTerm) return predictions;
    
    const lowerSearch = searchTerm.toLowerCase();
    return predictions.filter(prediction => 
      prediction.predictionType.toLowerCase().includes(lowerSearch) ||
      JSON.parse(prediction.predictionData || '{}').description?.toLowerCase().includes(lowerSearch)
    );
  }, [predictions, searchTerm]);

  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    if (confidence >= 0.4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'HIGH': return 'text-red-600 bg-red-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      case 'LOW': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading && !analyticsData) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading AI Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`ai-analytics-dashboard ${className} ${compact ? 'compact' : ''} ${animated ? 'animated' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Brain className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">AI Analytics Dashboard</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Filters"
          >
            <Filter className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => exportAnalytics()}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Export"
          >
            <Download className="w-5 h-5" />
          </button>
          
          <button
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4">Analytics Filters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
              <select
                value={filters.timeRange}
                onChange={(e) => handleFilterChange('timeRange', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="1d">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Insight Type</label>
              <select
                value={filters.insightType}
                onChange={(e) => handleFilterChange('insightType', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="USER_TREND">User Trends</option>
                <option value="PLATFORM_TREND">Platform Trends</option>
                <option value="CONTENT_TREND">Content Trends</option>
                <option value="PERFORMANCE_ANOMALY">Performance Anomalies</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prediction Type</label>
              <select
                value={filters.predictionType}
                onChange={(e) => handleFilterChange('predictionType', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ENGAGEMENT">Engagement</option>
                <option value="RETENTION">Retention</option>
                <option value="PERFORMANCE">Performance</option>
                <option value="CONTENT_SUCCESS">Content Success</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
              <select
                value={filters.contentType}
                onChange={(e) => handleFilterChange('contentType', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="POST">Posts</option>
                <option value="MENTOR">Mentors</option>
                <option value="SESSION">Sessions</option>
                <option value="SKILL">Skills</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search insights and predictions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Overview Section */}
      <div className="mb-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('overview')}
        >
          <h2 className="text-xl font-semibold text-gray-900">Overview</h2>
          {expandedSections.overview ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
        
        {expandedSections.overview && metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Events</span>
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalEvents?.toLocaleString() || 0}</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Active Users</span>
                <Users className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{metrics.activeUsers?.toLocaleString() || 0}</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Engagement Rate</span>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{metrics.engagementRate ? `${(metrics.engagementRate * 100).toFixed(1)}%` : '0%'}</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Avg. Session Duration</span>
                <Clock className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{metrics.avgSessionDuration ? `${Math.round(metrics.avgSessionDuration / 60)}m` : '0m'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Predictions Section */}
      <div className="mb-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('predictions')}
        >
          <h2 className="text-xl font-semibold text-gray-900">AI Predictions</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{filteredPredictions.length} predictions</span>
            {expandedSections.predictions ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
        
        {expandedSections.predictions && (
          <div className="space-y-4 mt-4">
            {filteredPredictions.slice(0, 5).map(prediction => (
              <div key={prediction.id} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-gray-900">{prediction.predictionType}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(prediction.confidence)}`}>
                        {Math.round(prediction.confidence * 100)}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {JSON.parse(prediction.predictionData || '{}').description || 'No description available'}
                    </p>
                    
                    {!prediction.feedback && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handlePredictionFeedback(prediction, 'accurate', 5)}
                          className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span>Accurate</span>
                        </button>
                        
                        <button
                          onClick={() => handlePredictionFeedback(prediction, 'inaccurate', 1)}
                          className="flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                        >
                          <ThumbsDown className="w-4 h-4" />
                          <span>Inaccurate</span>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {prediction.isExecuted ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(prediction.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredPredictions.length > 5 && (
              <button className="w-full text-center text-blue-600 hover:text-blue-700 font-medium py-2">
                View all predictions
              </button>
            )}
          </div>
        )}
      </div>

      {/* Insights Section */}
      <div className="mb-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('insights')}
        >
          <h2 className="text-xl font-semibold text-gray-900">AI Insights</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{filteredInsights.length} insights</span>
            {expandedSections.insights ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
        
        {expandedSections.insights && (
          <div className="space-y-4 mt-4">
            {filteredInsights.slice(0, 10).map(insight => (
              <div 
                key={insight.id} 
                className={`bg-white p-4 rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-shadow ${
                  selectedInsight?.id === insight.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleInsightClick(insight)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-gray-900">{insight.title}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getImpactColor(insight.impact)}`}>
                        {insight.impact}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                    
                    {insight.isActionable && (
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Take Action
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {insight.isRead ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(insight.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredInsights.length > 10 && (
              <button className="w-full text-center text-blue-600 hover:text-blue-700 font-medium py-2">
                View all insights
              </button>
            )}
          </div>
        )}
      </div>

      {/* Recommendations Section */}
      <div className="mb-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('recommendations')}
        >
          <h2 className="text-xl font-semibold text-gray-900">Recommendations</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{recommendations.length} recommendations</span>
            {expandedSections.recommendations ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
        
        {expandedSections.recommendations && (
          <div className="space-y-4 mt-4">
            {recommendations.slice(0, 10).map(recommendation => (
              <div 
                key={recommendation.id} 
                className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-900">{recommendation.contentType}</span>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {recommendation.recommendationType}
                      </span>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm text-gray-600">
                          {Math.round(recommendation.score * 100)}% match
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{recommendation.reason}</p>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRecommendationInteraction(recommendation, 'view')}
                        className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>
                      
                      <button
                        onClick={() => handleRecommendationInteraction(recommendation, 'interact')}
                        className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Engage</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {recommendation.isInteracted ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                    )}
                    <span className="text-xs text-gray-500">
                      Expires: {new Date(recommendation.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {recommendations.length > 10 && (
              <button className="w-full text-center text-blue-600 hover:text-blue-700 font-medium py-2">
                View all recommendations
              </button>
            )}
          </div>
        )}
      </div>

      {/* Real-time Events */}
      {analyticsData?.realTimeEvents && analyticsData.realTimeEvents.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Real-time Activity</h2>
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="max-h-64 overflow-y-auto">
              {analyticsData.realTimeEvents.slice(-10).reverse().map((event, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 border-b border-gray-100 last:border-b-0">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">{event.type}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{event.data?.description || 'Event occurred'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selected Insight Modal */}
      {selectedInsight && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">{selectedInsight.title}</h3>
              <button
                onClick={() => setSelectedInsight(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-gray-600">{selectedInsight.description}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Impact</h4>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getImpactColor(selectedInsight.impact)}`}>
                  {selectedInsight.impact}
                </span>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Confidence</h4>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${selectedInsight.confidence * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">
                    {Math.round(selectedInsight.confidence * 100)}%
                  </span>
                </div>
              </div>
              
              {JSON.parse(selectedInsight.insightData || '{}') && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Details</h4>
                  <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto">
                    {JSON.stringify(JSON.parse(selectedInsight.insightData || '{}'), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAnalyticsDashboard;
