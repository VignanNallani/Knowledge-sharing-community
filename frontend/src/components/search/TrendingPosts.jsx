import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Heart, 
  MessageCircle, 
  Calendar, 
  User, 
  Clock,
  ArrowUp,
  ArrowDown,
  Minus,
  Eye
} from 'lucide-react';
import { getTrendingPosts } from '../../services/searchAPI';

const TrendingPosts = ({ limit = 10, timeRange = 'week' }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFilter, setTimeFilter] = useState(timeRange);
  const [sortBy, setSortBy] = useState('trending'); // 'trending', 'likes', 'comments', 'views'

  useEffect(() => {
    fetchTrendingPosts();
  }, [timeFilter, sortBy]);

  const fetchTrendingPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getTrendingPosts(limit);
      setPosts(data.posts || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load trending posts');
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (score) => {
    if (score > 100) return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (score > 50) return <ArrowUp className="w-4 h-4 text-blue-500" />;
    if (score > 0) return <Minus className="w-4 h-4 text-gray-400" />;
    return <ArrowDown className="w-4 h-4 text-red-500" />;
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInHours = Math.floor((now - postDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return postDate.toLocaleDateString();
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Trending Posts</h2>
          <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="animate-pulse">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Trending Posts</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchTrendingPosts}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-2 mb-4 sm:mb-0">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Trending Posts</h2>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Time Filter */}
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
          
          {/* Sort Filter */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="trending">Trending</option>
            <option value="likes">Most Liked</option>
            <option value="comments">Most Commented</option>
            <option value="views">Most Viewed</option>
          </select>
        </div>
      </div>

      {/* Posts Grid */}
      {posts.length === 0 ? (
        <div className="text-center py-12">
          <TrendingUp className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Trending Posts</h3>
          <p className="text-gray-600">Check back later for trending content</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post, index) => (
            <div key={post.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Trending Badge */}
              <div className="relative">
                {post.image && (
                  <Link to={`/post/${post.id}`}>
                    <div className="aspect-w-16 aspect-h-9 bg-gray-100">
                      <img 
                        src={post.image} 
                        alt={post.title}
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  </Link>
                )}
                
                <div className="absolute top-2 left-2 flex items-center space-x-1 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                  <TrendingUp className="w-3 h-3" />
                  <span>#{index + 1}</span>
                </div>
                
                <div className="absolute top-2 right-2 flex items-center space-x-1 bg-white px-2 py-1 rounded-full text-xs font-medium">
                  {getTrendIcon(post.trendingScore)}
                  <span className="text-gray-600">{Math.round(post.trendingScore)}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <Link to={`/post/${post.id}`}>
                  <h3 className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                    {post.title}
                  </h3>
                </Link>
                
                {post.content && (
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {post.content}
                  </p>
                )}

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {post.tags.slice(0, 3).map((tag, tagIndex) => (
                      <span 
                        key={tagIndex}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                      >
                        {tag.name}
                      </span>
                    ))}
                    {post.tags.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                        +{post.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Author and Date */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <img 
                      src={post.author?.profileImage || `https://ui-avatars.com/api/?name=${post.author?.name}&background=random`} 
                      alt={post.author?.name}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-xs text-gray-600">{post.author?.name}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{getTimeAgo(post.createdAt)}</span>
                  </div>
                </div>

                {/* Engagement Metrics */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Heart className="w-3 h-3" />
                      <span>{formatNumber(post._count?.likes || 0)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="w-3 h-3" />
                      <span>{formatNumber(post._count?.comments || 0)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Eye className="w-3 h-3" />
                      <span>{formatNumber(post.viewCount || 0)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <TrendingUp className="w-3 h-3" />
                    <span>Score: {Math.round(post.trendingScore)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {posts.length > 0 && posts.length >= limit && (
        <div className="text-center mt-8">
          <button
            onClick={() => {/* Implement load more */}}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Load More Trending Posts
          </button>
        </div>
      )}
    </div>
  );
};

export default TrendingPosts;
