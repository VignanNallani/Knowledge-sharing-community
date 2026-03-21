import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Heart,
  MessageCircle,
  Users,
  Calendar,
  Award,
  Bookmark,
  Clock,
  ExternalLink,
  Filter,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { activityFeedService } from '../../services/notificationAPI';
import socket from '../../services/socket';

const ActivityFeed = ({ 
  userId = null, 
  type = 'personalized', 
  showFilters = true,
  className = '' 
}) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('week');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, [type, filter, timeRange, page]);

  useEffect(() => {
    if (!socket.connected) {
      const token = localStorage.getItem('accessToken');
      socket.connect(token);
    }

    socket.on('activity_updated', handleActivityUpdate);
    socket.on('follow_update', handleFollowUpdate);
    socket.on('post_liked', handlePostLike);
    socket.on('comment_added', handleCommentAdded);
    socket.on('session_updated', handleSessionUpdate);

    return () => {
      socket.off('activity_updated', handleActivityUpdate);
      socket.off('follow_update', handleFollowUpdate);
      socket.off('post_liked', handlePostLike);
      socket.off('comment_added', handleCommentAdded);
      socket.off('session_updated', handleSessionUpdate);
    };
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      let data;

      switch (type) {
        case 'personalized':
          data = await activityFeedService.getPersonalizedFeed({ page, limit: 20 });
          break;
        case 'followed':
          data = await activityFeedService.getFollowedUsersFeed({ page, limit: 20 });
          break;
        case 'trending':
          data = await activityFeedService.getTrendingContent({ 
            timeRange, 
            page, 
            limit: 20 
          });
          break;
        case 'bookmarks':
          data = await activityFeedService.getBookmarkedFeed({ page, limit: 20 });
          break;
        default:
          data = await activityFeedService.getUserActivityFeed(userId || 1, { 
            type: filter === 'all' ? undefined : filter,
            page, 
            limit: 20 
          });
      }

      setActivities(data.activities || data.bookmarks || data.users || []);
      setPagination(data.pagination || {});
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [type, filter, timeRange, page, userId]);

  const handleActivityUpdate = (data) => {
    if (type === 'personalized' || type === 'followed') {
      setActivities(prev => [data.data, ...prev].slice(0, 50));
    }
  };

  const handleFollowUpdate = (data) => {
    if (type === 'personalized' || type === 'followed') {
      const activity = {
        id: Date.now(),
        type: 'user_followed',
        data: data.data,
        createdAt: new Date()
      };
      setActivities(prev => [activity, ...prev].slice(0, 50));
    }
  };

  const handlePostLike = (data) => {
    if (type === 'personalized') {
      const activity = {
        id: Date.now(),
        type: 'post_liked',
        data: data.data,
        createdAt: new Date()
      };
      setActivities(prev => [activity, ...prev].slice(0, 50));
    }
  };

  const handleCommentAdded = (data) => {
    if (type === 'personalized') {
      const activity = {
        id: Date.now(),
        type: 'comment_added',
        data: data.data,
        createdAt: new Date()
      };
      setActivities(prev => [activity, ...prev].slice(0, 50));
    }
  };

  const handleSessionUpdate = (data) => {
    if (type === 'personalized') {
      const activity = {
        id: Date.now(),
        type: 'session_updated',
        data: data.data,
        createdAt: new Date()
      };
      setActivities(prev => [activity, ...prev].slice(0, 50));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchActivities();
    setRefreshing(false);
  };

  const getActivityIcon = (activityType) => {
    switch (activityType) {
      case 'post_created':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'post_liked':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'comment_added':
        return <MessageCircle className="w-5 h-5 text-green-500" />;
      case 'user_followed':
        return <Users className="w-5 h-5 text-purple-500" />;
      case 'session_completed':
        return <Calendar className="w-5 h-5 text-orange-500" />;
      case 'achievement_unlocked':
        return <Award className="w-5 h-5 text-yellow-500" />;
      case 'bookmark_added':
        return <Bookmark className="w-5 h-5 text-indigo-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getActivityDescription = (activity) => {
    switch (activity.type) {
      case 'post_created':
        return `created a new post: "${activity.data?.title || 'Untitled'}"`;
      case 'post_liked':
        return `liked ${activity.data?.actorName || 'Someone'}'s post`;
      case 'comment_added':
        return `commented on ${activity.data?.actorName || 'Someone'}'s post`;
      case 'user_followed':
        return `started following ${activity.data?.followingName || 'Someone'}`;
      case 'session_completed':
        return `completed a mentorship session`;
      case 'achievement_unlocked':
        return `unlocked an achievement: ${activity.data?.achievementType || 'New Achievement'}`;
      case 'bookmark_added':
        return `bookmarked ${activity.data?.title || 'content'}`;
      default:
        return activity.description || 'New activity';
    }
  };

  const getActivityLink = (activity) => {
    if (activity.data?.url) {
      return activity.data.url;
    }

    switch (activity.type) {
      case 'post_created':
      case 'post_liked':
      case 'comment_added':
        return activity.data?.postId ? `/post/${activity.data.postId}` : '#';
      case 'user_followed':
        return activity.data?.followingId ? `/profile/${activity.data.followingId}` : '#';
      case 'session_completed':
        return activity.data?.sessionId ? `/session/${activity.data.sessionId}` : '#';
      default:
        return '#';
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 43200) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  const getFilterOptions = () => {
    switch (type) {
      case 'personalized':
        return ['all', 'posts', 'sessions', 'follows', 'achievements'];
      case 'trending':
        return ['all', 'posts', 'users', 'sessions'];
      default:
        return ['all', 'posts', 'comments', 'likes', 'sessions'];
    }
  };

  const getTimeRangeOptions = () => {
    return ['today', 'week', 'month', 'year'];
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading activities...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-red-600 mb-4">Error loading activities</div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Activity className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {type === 'personalized' ? 'Your Feed' :
               type === 'trending' ? 'Trending' :
               type === 'followed' ? 'Followed Users' :
               type === 'bookmarks' ? 'Bookmarked' : 'Activity Feed'}
            </h2>
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
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm">Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && showFilterPanel && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {getFilterOptions().map(option => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {type === 'trending' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Range
                  </label>
                  <select
                    value={timeRange}
                    onChange={(e) => {
                      setTimeRange(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {getTimeRangeOptions().map(option => (
                      <option key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Activities List */}
      {activities.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No activities yet
          </h3>
          <p className="text-gray-600">
            {type === 'personalized' 
              ? 'Start following users and engaging with content to see activities here'
              : 'No activities found for the selected filters'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    {activity.data?.actorName && (
                      <Link
                        to={`/profile/${activity.data.actorId}`}
                        className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        {activity.data.actorName}
                      </Link>
                    )}
                    <span className="text-sm text-gray-600">
                      {getActivityDescription(activity)}
                    </span>
                  </div>

                  {activity.data?.title && (
                    <h4 className="font-medium text-gray-900 mb-2">
                      <Link
                        to={getActivityLink(activity)}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {activity.data.title}
                      </Link>
                    </h4>
                  )}

                  {activity.data?.content && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {activity.data.content}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(activity.createdAt)}</span>
                    </div>

                    {getActivityLink(activity) !== '#' && (
                      <Link
                        to={getActivityLink(activity)}
                        className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-6">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          
          <span className="text-sm text-gray-600">
            Page {page} of {pagination.pages}
          </span>
          
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.pages}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
