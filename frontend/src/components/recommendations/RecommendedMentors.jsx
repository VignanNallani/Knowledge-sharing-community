import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Star,
  Calendar,
  Clock,
  Award,
  TrendingUp,
  Filter,
  RefreshCw,
  Loader2,
  ChevronRight,
  MessageCircle,
  Heart,
  BookOpen
} from 'lucide-react';
import { recommendationService } from '../../services/recommendationAPI';
import socket from '../../services/socket';

const RecommendedMentors = ({ 
  limit = 6, 
  showFilters = true, 
  showActions = true,
  className = '' 
}) => {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    skills: [],
    experienceLevel: '',
    availability: '',
    rating: 0,
    timeRange: '30d'
  });
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  useEffect(() => {
    fetchMentors();
  }, [limit, JSON.stringify(filters)]);

  useEffect(() => {
    if (!socket.connected) {
      const token = localStorage.getItem('accessToken');
      socket.connect(token);
    }

    socket.on('mentor_recommendation_updated', handleMentorUpdate);
    socket.on('recommendation_dismissed', handleRecommendationDismissed);

    return () => {
      socket.off('mentor_recommendation_updated', handleMentorUpdate);
      socket.off('recommendation_dismissed', handleRecommendationDismissed);
    };
  }, []);

  const fetchMentors = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await recommendationService.getMentorRecommendations(limit, filters);
      setMentors(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMentorUpdate = (data) => {
    setMentors(prev => {
      const existingIndex = prev.findIndex(mentor => mentor.id === data.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...data };
        return updated;
      }
      return prev;
    });
  };

  const handleRecommendationDismissed = (data) => {
    setMentors(prev => prev.filter(mentor => mentor.id !== data.id));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMentors();
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

  const handleDismiss = async (mentorId) => {
    try {
      await recommendationService.dismissRecommendation(mentorId);
      setMentors(prev => prev.filter(mentor => mentor.id !== mentorId));
    } catch (error) {
      console.error('Error dismissing mentor:', error);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
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

  const getAvailabilityColor = (availability) => {
    return availability
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-yellow-500';
    if (rating >= 4.0) return 'text-green-500';
    if (rating >= 3.5) return 'text-blue-500';
    return 'text-gray-400';
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
              <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse"></div>
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
          <Users className="w-5 h-5 text-red-600" />
          <span className="text-red-800">Error loading mentor recommendations: {error}</span>
        </div>
        <button
          onClick={fetchMentors}
          className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (mentors.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-8 text-center ${className}`}>
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Mentor Recommendations</h3>
        <p className="text-gray-600">
          Start following mentors and engaging with content to get personalized mentor recommendations
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Users className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Recommended Mentors</h2>
          <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
            {mentors.length}
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
                  timeRange: '30d'
                })}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mentor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mentors.map((mentor) => (
          <div
            key={mentor.id}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <img
                  src={mentor.profileImage || '/images/default-avatar.png'}
                  alt={mentor.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <Link
                    to={`/profile/${mentor.id}`}
                    className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {mentor.name}
                  </Link>
                  <div className="flex items-center space-x-1 mt-1">
                    {mentor.experienceLevel && (
                      <span className={`px-2 py-1 text-xs rounded-full ${getExperienceLevelColor(mentor.experienceLevel)}`}>
                        {mentor.experienceLevel}
                      </span>
                    )}
                    {mentor.availability !== undefined && (
                      <span className={`px-2 py-1 text-xs rounded-full ${getAvailabilityColor(mentor.availability)}`}>
                        {mentor.availability ? 'Available' : 'Not Available'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {showActions && (
                <button
                  onClick={() => handleDismiss(mentor.id)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                  title="Dismiss recommendation"
                >
                  <Users className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Bio */}
            {mentor.bio && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                {mentor.bio}
              </p>
            )}

            {/* Skills */}
            {mentor.skills && mentor.skills.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {mentor.skills.slice(0, 4).map((skill, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                  {mentor.skills.length > 4 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                      +{mentor.skills.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {formatNumber(mentor._count?.followers || 0)} followers
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {formatNumber(mentor._count?.posts || 0)} posts
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {formatNumber(mentor._count?.mentorshipsAsMentor || 0)} sessions
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {mentor.averageRating ? mentor.averageRating.toFixed(1) : 'N/A'}
                </span>
              </div>
            </div>

            {/* Recommendation Score */}
            {mentor.recommendationScore && (
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600">
                    Match Score: {Math.round(mentor.recommendationScore * 100)}%
                  </span>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  {mentor.algorithm?.replace('_', ' ')}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Link
                to={`/profile/${mentor.id}`}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
              >
                <span className="text-sm font-medium">View Profile</span>
                <ChevronRight className="w-4 h-4" />
              </Link>

              {showActions && (
                <div className="flex items-center space-x-2">
                  <button
                    className="p-2 rounded-full text-gray-400 hover:text-blue-600 transition-colors"
                    title="Send Message"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 rounded-full text-gray-400 hover:text-red-600 transition-colors"
                    title="Follow"
                  >
                    <Heart className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      {mentors.length >= limit && (
        <div className="text-center mt-6">
          <button
            onClick={() => {
              setFilters(prev => ({ ...prev, limit: prev.limit + 6 }));
              fetchMentors();
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Load More Mentors
          </button>
        </div>
      )}
    </div>
  );
};

export default RecommendedMentors;
