import React, { useState, useEffect } from 'react';
import { Users, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { followingService } from '../../services/notificationAPI';
import socket from '../../services/socket';

const FollowButton = ({ userId, isFollowing: initialIsFollowing = false, onToggle, size = 'md' }) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  useEffect(() => {
    if (!socket.connected) {
      const token = localStorage.getItem('accessToken');
      socket.connect(token);
    }

    // Listen for follow updates
    socket.on('follow_update', handleFollowUpdate);

    return () => {
      socket.off('follow_update', handleFollowUpdate);
    };
  }, [userId]);

  const handleFollowUpdate = (data) => {
    if (data.type === 'follow' && data.data.followingId === userId) {
      setIsFollowing(true);
    } else if (data.type === 'unfollow' && data.data.followingId === userId) {
      setIsFollowing(false);
    }
  };

  const handleFollowToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      if (isFollowing) {
        await followingService.unfollowUser(userId);
        setIsFollowing(false);
      } else {
        await followingService.followUser(userId);
        setIsFollowing(true);
      }

      // Call parent callback if provided
      if (onToggle) {
        onToggle(!isFollowing);
      }
    } catch (error) {
      console.error('Follow/unfollow error:', error);
      setError(error.message);
      
      // Revert state on error
      setIsFollowing(isFollowing);
    } finally {
      setLoading(false);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1 text-sm';
      case 'lg':
        return 'px-6 py-3 text-base';
      default:
        return 'px-4 py-2 text-sm';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'lg':
        return 'w-5 h-5';
      default:
        return 'w-4 h-4';
    }
  };

  if (loading) {
    return (
      <button
        className={`flex items-center justify-center space-x-2 rounded-lg border ${getSizeClasses()} bg-gray-100 text-gray-600 border-gray-300`}
        disabled
      >
        <Loader2 className={`${getIconSize()} animate-spin`} />
        <span>{isFollowing ? 'Unfollowing...' : 'Following...'}</span>
      </button>
    );
  }

  if (isFollowing) {
    return (
      <button
        onClick={handleFollowToggle}
        className={`flex items-center justify-center space-x-2 rounded-lg border ${getSizeClasses()} bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 transition-colors`}
        title="Unfollow"
      >
        <UserMinus className={getIconSize()} />
        <span>Following</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleFollowToggle}
      className={`flex items-center justify-center space-x-2 rounded-lg border ${getSizeClasses()} bg-blue-600 text-white border-blue-600 hover:bg-blue-700 transition-colors`}
      title="Follow"
    >
      <UserPlus className={getIconSize()} />
      <span>Follow</span>
    </button>
  );
};

// Compact version for use in lists
export const FollowButtonCompact = ({ userId, isFollowing: initialIsFollowing = false, onToggle }) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  const handleFollowToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;

    setLoading(true);

    try {
      if (isFollowing) {
        await followingService.unfollowUser(userId);
        setIsFollowing(false);
      } else {
        await followingService.followUser(userId);
        setIsFollowing(true);
      }

      if (onToggle) {
        onToggle(!isFollowing);
      }
    } catch (error) {
      console.error('Follow/unfollow error:', error);
      setIsFollowing(isFollowing);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <button
        className="p-1 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
        disabled
      >
        <Loader2 className="w-4 h-4 animate-spin" />
      </button>
    );
  }

  if (isFollowing) {
    return (
      <button
        onClick={handleFollowToggle}
        className="p-1 rounded-full text-blue-600 hover:text-blue-800 transition-colors"
        title="Unfollow"
      >
        <UserMinus className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={handleFollowToggle}
      className="p-1 rounded-full text-gray-400 hover:text-blue-600 transition-colors"
      title="Follow"
    >
      <UserPlus className="w-4 h-4" />
    </button>
  );
};

// Stats version showing follower count
export const FollowButtonWithStats = ({ 
  userId, 
  isFollowing: initialIsFollowing = false, 
  followerCount = 0, 
  onToggle,
  showCount = true 
}) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  const handleFollowToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;

    setLoading(true);

    try {
      if (isFollowing) {
        await followingService.unfollowUser(userId);
        setIsFollowing(false);
      } else {
        await followingService.followUser(userId);
        setIsFollowing(true);
      }

      if (onToggle) {
        onToggle(!isFollowing);
      }
    } catch (error) {
      console.error('Follow/unfollow error:', error);
      setIsFollowing(isFollowing);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {showCount && (
        <div className="flex items-center space-x-1">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">{followerCount}</span>
        </div>
      )}
      
      <button
        onClick={handleFollowToggle}
        disabled={loading}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
          loading
            ? 'bg-gray-100 text-gray-600 border-gray-300 cursor-not-allowed'
            : isFollowing
            ? 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
            : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{isFollowing ? 'Unfollowing...' : 'Following...'}</span>
          </>
        ) : isFollowing ? (
          <>
            <UserMinus className="w-4 h-4" />
            <span>Following</span>
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            <span>Follow</span>
          </>
        )}
      </button>
    </div>
  );
};

export default FollowButton;
