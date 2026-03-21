import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  Users,
  Calendar,
  Clock,
  Eye,
  MessageCircle,
  Heart,
  Award,
  Target,
  Activity,
  Download,
  Filter,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { analyticsService } from '../../services/analyticsAPI';
import socket from '../../services/socket';

const AnalyticsDashboard = ({ userId = null, isAdmin = false }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('overview');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, selectedMetric]);

  useEffect(() => {
    if (!socket.connected) {
      const token = localStorage.getItem('accessToken');
      socket.connect(token);
    }

    socket.on('analytics_event', handleAnalyticsUpdate);
    socket.on('user_activity', handleUserActivityUpdate);

    return () => {
      socket.off('analytics_event', handleAnalyticsUpdate);
      socket.off('user_activity', handleUserActivityUpdate);
    };
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      let data;
      if (isAdmin) {
        data = await analyticsService.getPlatformAnalytics({ timeRange });
      } else {
        data = await analyticsService.getUserAnalytics(userId, { timeRange });
      }

      setAnalyticsData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyticsUpdate = (data) => {
    if (isAdmin || data.userId === userId) {
      setAnalyticsData(prev => ({
        ...prev,
        realTime: {
          ...prev.realTime,
          lastEvent: data
        }
      }));
    }
  };

  const handleUserActivityUpdate = (data) => {
    if (!isAdmin && data.userId === userId) {
      setAnalyticsData(prev => ({
        ...prev,
        user: {
          ...prev.user,
          recentActivity: [data, ...(prev.user?.recentActivity || [])].slice(0, 10)
        }
      }));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    setRefreshing(false);
  };

  const handleTimeRangeChange = (newTimeRange) => {
    setTimeRange(newTimeRange);
  };

  const handleExport = async (format = 'json') => {
    try {
      const data = await analyticsService.exportAnalytics(format, { timeRange });
      
      if (format === 'csv') {
        // Create download link for CSV
        const blob = new Blob([data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${timeRange}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Download JSON
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${timeRange}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatPercentage = (value, total) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : '0';
  };

  const COLORS = {
    primary: '#3B82F6',
    secondary: '#10B981',
    accent: '#F59E0B',
    danger: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    success: '#10B981'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 mb-4">Error loading analytics</div>
          <button
            onClick={fetchAnalyticsData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Activity className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              {isAdmin ? 'Platform Analytics' : 'Your Analytics'}
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <div className="relative">
              <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => handleExport('json')}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-50"
                >
                  Export as JSON
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-50"
                >
                  Export as CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Tabs */}
        <div className="flex space-x-1">
          {['overview', 'engagement', 'content', 'users'].map((metric) => (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedMetric === metric
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {metric.charAt(0).toUpperCase() + metric.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Metrics */}
      {selectedMetric === 'overview' && analyticsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-600 font-medium">Total Users</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {formatNumber(analyticsData.users?.total || 0)}
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-600 font-medium">Sessions</span>
            </div>
            <div className="text-2xl font-bold text-green-900">
              {formatNumber(analyticsData.sessions?.total || 0)}
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-purple-600 font-medium">Page Views</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">
              {formatNumber(analyticsData.events?.PAGE_VIEW || 0)}
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <span className="text-sm text-orange-600 font-medium">Engagement</span>
            </div>
            <div className="text-2xl font-bold text-orange-900">
              {formatNumber(analyticsData.engagement?.likes + analyticsData.engagement?.comments || 0)}
            </div>
          </div>
        </div>
      )}

      {/* Engagement Chart */}
      {selectedMetric === 'engagement' && analyticsData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.timeline || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="interactions"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Likes', value: analyticsData.engagement?.likes || 0, color: COLORS.danger },
                    { name: 'Comments', value: analyticsData.engagement?.comments || 0, color: COLORS.info },
                    { name: 'Shares', value: analyticsData.engagement?.shares || 0, color: COLORS.success },
                    { name: 'Bookmarks', value: analyticsData.engagement?.bookmarks || 0, color: COLORS.warning }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                >
                  {Object.entries(COLORS).map(([key, color]) => (
                    <Cell key={`cell-${key}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Content Analytics */}
      {selectedMetric === 'content' && analyticsData && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Posts</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.topContent?.posts || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="title" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="likes" fill={COLORS.primary} />
                <Bar dataKey="comments" fill={COLORS.secondary} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Sessions</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.topContent?.sessions || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="title" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="rating" fill={COLORS.accent} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* User Analytics */}
      {selectedMetric === 'users' && analyticsData && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData.timeline || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="activeUsers"
                  stroke={COLORS.primary}
                  fill={COLORS.primary}
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">New Users</h4>
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(analyticsData.users?.new || 0)}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Active Users</h4>
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(analyticsData.users?.active || 0)}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Retention Rate</h4>
              <div className="text-2xl font-bold text-purple-600">
                {formatPercentage(analyticsData.users?.retained || 0, analyticsData.users?.total || 1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Updates */}
      {analyticsData?.realTime && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Real-time Activity</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {analyticsData.realTime.lastHour?.activeUsers || 0}
              </div>
              <div className="text-sm text-gray-600">Active Users (1h)</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {analyticsData.realTime.lastHour?.pageViews || 0}
              </div>
              <div className="text-sm text-gray-600">Page Views (1h)</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {analyticsData.realTime.lastHour?.sessions || 0}
              </div>
              <div className="text-sm text-gray-600">Sessions (1h)</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {analyticsData.realTime.lastDay?.activeUsers || 0}
              </div>
              <div className="text-sm text-gray-600">Active Users (24h)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
