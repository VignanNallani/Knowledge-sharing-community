import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  TrendingUp,
  Filter,
  RefreshCw,
  Loader2,
  ChevronRight,
  Eye,
  Clock,
  User,
  Calendar,
  Award
} from 'lucide-react';
import { recommendationService } from '../../services/recommendationAPI';
import socket from '../../services/socket';

const RecommendedPosts = ({ 
  limit = 6, 
  showFilters = true, 
  showActions = true,
  className = '' 
}) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    skills: [],
    categories: [],
    timeRange: '30d',
    minEngagement: 0,
    minQuality: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    fetchPosts();
  }, [limit, JSON.stringify(filters)]);

  useEffect(() => {
    if (!socket.connected) {
      const token = localStorage.getItem('accessToken');
      socket.connect(token);
    }

    socket.on('post_recommendation_updated', handlePostUpdate);
    socket.on('recommendation_dismissed', handleRecommendationDismissed);

    return () => {
      socket.off('post_recommendation_updated', handlePostUpdate);
      socket.off('recommendation_dismissed', handleRecommendationDismissed);
    };
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await recommendationService.getPostRecommendations(limit, filters);
      setPosts(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePostUpdate = (data) => {
    setPosts(prev => {
      const existingIndex = prev.findIndex(post => post.id === data.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...data };
        return updated;
      }
      return prev;
    });
  };

  const handleRecommendationDismissed = (data) => {
    setPosts(prev => prev.filter(post => post.id !== data.id));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
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

  const handleCategoryToggle = (category) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleDismiss = async (postId) => {
    try {
      await recommendationService.dismissRecommendation(postId);
      setPosts(prev => prev.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Error dismissing post:', error);
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

  const getQualityColor = (quality) => {
    if (quality >= 0.8) return 'text-green-600';
    if (quality >= 0.6) return 'text-blue-600';
    if (quality >= 0.4) return 'text-yellow-600';
    return 'text-gray-600';
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

  const commonCategories = [
    'Tutorial',
    'Guide',
    'News',
    'Discussion',
    'Question',
    'Showcase',
    'Resources',
    'Tips',
    'Best Practices',
    'Case Study'
  ];

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(limit)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start space-x-4">
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
          <FileText className="w-5 h-5 text-red-600" />
          <span className="text-red-800">Error loading post recommendations: {error}</span>
        </div>
        <button
          onClick={fetchPosts}
          className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-8 text-center ${className}`}>
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Post Recommendations</h3>
        <p className="text-gray-600">
          Start engaging with content to get personalized post recommendations
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <FileText className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Recommended Posts</h2>
          <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
            {posts.length}
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

            {/* Categories Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
              <div className="flex flex-wrap gap-2">
                {commonCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryToggle(category)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      filters.categories.includes(category)
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
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

            {/* Min Engagement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Engagement</label>
              <select
                value={filters.minEngagement}
                onChange={(e) => handleFilterChange('minEngagement', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="0">Any</option>
                <option value="5">5+ likes</option>
                <option value="10">10+ likes</option>
                <option value="25">25+ likes</option>
                <option value="50">50+ likes</option>
              </select>
            </div>

            {/* Min Quality */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Quality</label>
              <select
                value={filters.minQuality}
                onChange={(e) => handleFilterChange('minQuality', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="0">Any</option>
                <option value="0.4">Good</option>
                <option value="0.6">Very Good</option>
                <option value="0.8">Excellent</option>
                <option value="1.0">Perfect</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => setFilters({
                  skills: [],
                  categories: [],
                  timeRange: '30d',
                  minEngagement: 0,
                  minQuality: 0
                })}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Posts Grid/List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
        {posts.map((post) => (
          <div
            key={post.id}
            className={`bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow ${
              viewMode === 'list' ? 'p-6' : 'p-6'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <img
                  src={post.author?.profileImage || '/images/default-avatar.png'}
                  alt={post.author?.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <Link
                    to={`/post/${post.id}`}
                    className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1"
                  >
                    {post.title}
                  </Link>
                  <div className="flex items-center space-x-1 mt-1">
                    <span className="text-sm text-gray-600">by {post.author?.name}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-600">{formatDate(post.createdAt)}</span>
                  </div>
                </div>
              </div>

              {showActions && (
                <button
                  onClick={() => handleDismiss(post.id)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                  title="Dismiss recommendation"
                >
                  <FileText className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Content Preview */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 line-clamp-3">
                {post.content}
              </p>
            </div>

            {/* Image */}
            {post.image && (
              <div className="mb-4">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {post.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
                {post.tags.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                    +{post.tags.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Eye className="w-4 h-4" />
                  <span>{formatNumber(post._count?.views || 0)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Heart className="w-4 h-4" />
                  <span>{formatNumber(post._count?.likes || 0)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageCircle className="w-4 h-4" />
                  <span>{formatNumber(post._count?.comments || 0)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Share2 className="w-4 h-4" />
                  <span>{formatNumber(post._count?.shares || 0)}</span>
                </div>
              </div>

              {/* Recommendation Score */}
              {post.recommendationScore && (
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600">
                    {Math.round(post.recommendationScore * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Quality Score */}
            {post.aiMetadata?.quality_score && (
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Award className="w-4 h-4" />
                  <span className={`text-sm ${getQualityColor(post.aiMetadata.quality_score)}`}>
                    Quality: {Math.round(post.aiMetadata.quality_score * 100)}%
                  </span>
                </div>
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                  {post.algorithm?.replace('_', ' ')}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Link
                to={`/post/${post.id}`}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
              >
                <span className="text-sm font-medium">Read More</span>
                <ChevronRight className="w-4 h-4" />
              </Link>

              {showActions && (
                <div className="flex items-center space-x-2">
                  <button
                    className="p-2 rounded-full text-gray-400 hover:text-blue-600 transition-colors"
                    title="Like"
                  >
                    <Heart className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 rounded-full text-gray-400 hover:text-blue-600 transition-colors"
                    title="Comment"
                  >
                    <MessageCircle className="w-4 h-4" />
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
      {posts.length >= limit && (
        <div className="text-center mt-6">
          <button
            onClick={() => {
              setFilters(prev => ({ ...prev, limit: prev.limit + 6 }));
              fetchPosts();
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Load More Posts
          </button>
        </div>
      )}
    </div>
  );
};

export default RecommendedPosts;
