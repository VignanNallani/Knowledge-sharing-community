import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Star,
  Users,
  TrendingUp,
  Filter,
  RefreshCw,
  Loader2,
  ChevronRight,
  MessageCircle,
  Heart,
  Share2,
  Bookmark,
  DollarSign,
  Award,
  Target
} from 'lucide-react';
import { recommendationService } from '../../services/recommendationAPI';
import socket from '../../services/socket';

const RecommendedSessions = ({ 
  limit = 6, 
  showFilters = true, 
  showActions = true,
  className = '' 
}) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    skills: [],
    experienceLevel: '',
    availability: '',
    rating: 0,
    timeRange: '30d',
    priceRange: { min: 0, max: 1000 }
  });
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    fetchSessions();
  }, [limit, JSON.stringify(filters)]);

  useEffect(() => {
    if (!socket.connected) {
      const token = localStorage.getItem('accessToken');
      socket.connect(token);
    }

    socket.on('session_recommendation_updated', handleSessionUpdate);
    socket.on('recommendation_dismissed', handleRecommendationDismissed);

    return () => {
      socket.off('session_recommendation_updated', handleSessionUpdate);
      socket.off('recommendation_dismissed', handleRecommendationDismissed);
    };
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await recommendationService.getSessionRecommendations(limit, filters);
      setSessions(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionUpdate = (data) => {
    setSessions(prev => {
      const existingIndex = prev.findIndex(session => session.id === data.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...data };
        return updated;
      }
      return prev;
    });
  };

  const handleRecommendationDismissed = (data) => {
    setSessions(prev => prev.filter(session => session.id !== data.id));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSessions();
    setRefreshing(false);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSkillToggle = (skill) => {
    setFilters(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const handlePriceRangeChange = (type, value) => {
    setFilters(prev => ({
      ...prev,
      priceRange: {
        ...prev.priceRange,
        [type]: parseInt(value)
      }
    }));
  };

  const handleDismiss = async (sessionId) => {
    try {
      await recommendationService.dismissRecommendation(sessionId);
      setSessions(prev => prev.filter(session => session.id !== sessionId));
    } catch (error) {
      console.error('Error dismissing session:', error);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
  };

  const getExperienceLevelColor = (level) => {
    const colors = {
      'BEGINNER': 'bg-green-100 text-green-800',
      'INTERMEDIATE': 'bg-blue-100 text-blue-800',
      'ADVANCED': 'bg-purple-100 text-purple-800',
      'EXPERT': 'bg-orange-100 text-orange-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-yellow-500';
    if (rating >= 4.0) return 'text-green-500';
    if (rating >= 3.5) return 'text-blue-500';
    return 'text-gray-400';
  };

  const getPriceColor = (price) => {
    if (price === 0) return 'text-green-600';
    if (price <= 50) return 'text-blue-600';
    if (price <= 100) return 'text-purple-600';
    return 'text-orange-600';
  };

  const commonSkills = [
    'JavaScript',
    'React',
    'Node.js',
    'Python',
    'TypeScript',
    'Vue.js',
    'Angular',
    'Docker',
    'AWS',
    'MongoDB',
    'PostgreSQL',
    'GraphQL',
    'DevOps',
    'Machine Learning',
    'Data Science'
  ];

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(limit)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded animate-pulse"></div>
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse"></div>
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-red-600" />
          <span className="text-red-800">Error loading session recommendations: {error}</span>
        </div>
        <button
          onClick={fetchSessions}
          className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-8 text-center ${className}`}>
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Session Recommendations</h3>
        <p className="text-gray-600">
          Start engaging with mentorship sessions to get personalized session recommendations
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Recommended Sessions</h2>
          <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
            {sessions.length}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {showFilters && (
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filters</span>
            </button>
          )}

          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              title="Grid view"
            >
              <div className="grid grid-cols-2 gap-1 w-4 h-4">
                <div className="w-2 h-2 bg-current rounded-sm"></div>
                <div className="w-2 h-2 bg-current rounded-sm"></div>
                <div className="w-2 h-2 bg-current rounded-sm"></div>
                <div className="w-2 h-2 bg-current rounded-sm"></div>
              </div>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              title="List view"
            >
              <div className="space-y-1 w-4 h-4">
                <div className="w-full h-1 bg-current rounded"></div>
                <div className="w-full h-1 bg-current rounded"></div>
                <div className="w-full h-1 bg-current rounded"></div>
              </div>
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm">Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && showFilterPanel && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Skills Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
              <div className="flex flex-wrap gap-2">
                {commonSkills.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => handleSkillToggle(skill)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      filters.skills.includes(skill)
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Experience Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
              <select
                value={filters.experienceLevel}
                onChange={(e) => handleFilterChange('experienceLevel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Levels</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
                <option value="EXPERT">Expert</option>
              </select>
            </div>

            {/* Availability */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
              <select
                value={filters.availability}
                onChange={(e) => handleFilterChange('availability', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All</option>
                <option value="true">Available</option>
                <option value="false">Not Available</option>
              </select>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Rating</label>
              <select
                value={filters.rating}
                onChange={(e) => handleFilterChange('rating', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="0">All Ratings</option>
                <option value="3">3+ Stars</option>
                <option value="4">4+ Stars</option>
                <option value="4.5">4.5+ Stars</option>
                <option value="5">5 Stars</option>
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.priceRange.min}
                  onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.priceRange.max}
                  onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Time Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
              <select
                value={filters.timeRange}
                onChange={(e) => handleFilterChange('timeRange', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => setFilters({
                  skills: [],
                  experienceLevel: '',
                  availability: '',
                  rating: 0,
                  timeRange: '30d',
                  priceRange: { min: 0, max: 1000 }
                })}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Grid/List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow ${
              viewMode === 'list' ? 'p-6' : 'p-6'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <Link
                    to={`/session/${session.id}`}
                    className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1"
                  >
                    {session.title}
                  </Link>
                  <div className="flex items-center space-x-1 mt-1">
                    <span className="text-sm text-gray-600">with {session.mentee?.name}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-600">{formatDate(session.scheduledAt)}</span>
                  </div>
                </div>
              </div>

              {showActions && (
                <button
                  onClick={() => handleDismiss(session.id)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                  title="Dismiss recommendation"
                >
                  <Calendar className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Description */}
            {session.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                {session.description}
              </p>
            )}

            {/* Mentor Info */}
            <div className="flex items-center space-x-3 mb-4">
              <img
                src={session.mentor?.profileImage || '/images/default-avatar.png'}
                alt={session.mentor?.name}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">{session.mentor?.name}</div>
                <div className="flex items-center space-x-1 mt-1">
                  {session.mentor?.experienceLevel && (
                    <span className={`px-2 py-1 text-xs rounded-full ${getExperienceLevelColor(session.mentor.experienceLevel)}`}>
                      {session.mentor.experienceLevel}
                    </span>
                  )}
                  {session.mentor?.skills && session.mentor.skills.length > 0 && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {session.mentor.skills[0]}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Session Details */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">{formatDuration(session.duration)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                <span className={`text-sm font-medium ${getPriceColor(session.price)}`}>
                  {session.price === 0 ? 'Free' : `$${session.price}`}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">{formatDate(session.scheduledAt)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-gray-500" />
                <span className={`text-sm ${getRatingColor(session.feedback?.rating || 0)}`}>
                  {session.feedback?.rating ? session.feedback.rating.toFixed(1) : 'No rating'}
                </span>
              </div>
            </div>

            {/* Recommendation Score */}
            {session.recommendationScore && (
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600">
                    Match Score: {Math.round(session.recommendationScore * 100)}%
                  </span>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  {session.algorithm?.replace('_', ' ')}
                </span>
              </div>
            )}

            {/* Skills */}
            {session.mentor?.skills && session.mentor.skills.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {session.mentor.skills.slice(0, 3).map((skill, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                  {session.mentor.skills.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                      +{session.mentor.skills.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Link
                to={`/session/${session.id}`}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
              >
                <span className="text-sm font-medium">View Details</span>
                <ChevronRight className="w-4 h-4" />
              </Link>

              {showActions && (
                <div className="flex items-center space-x-2">
                  <button
                    className="p-2 rounded-full text-gray-400 hover:text-blue-600 transition-colors"
                    title="Book Session"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 rounded-full text-gray-400 hover:text-blue-600 transition-colors"
                    title="Share"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 rounded-full text-gray-400 hover:text-blue-600 transition-colors"
                    title="Bookmark"
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      {sessions.length >= limit && (
        <div className="text-center mt-6">
          <button
            onClick={() => {
              setFilters(prev => ({ ...prev, limit: prev.limit + 6 }));
              fetchSessions();
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Load More Sessions
          </button>
        </div>
      )}
    </div>
  );
};

export default RecommendedSessions;
