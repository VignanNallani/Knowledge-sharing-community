import React, { useState, useEffect } from 'react';
import { Award, Star, Trophy, Medal, Crown, Gem } from 'lucide-react';
import { gamificationAPI } from '../../services/gamificationAPI';
import socket from '../../services/socket';

const BadgeShowcase = ({ 
  userId = null, 
  showHidden = false, 
  compact = false, 
  animated = true,
  maxDisplay = 12,
  className = '' 
}) => {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newBadgeAnimation, setNewBadgeAnimation] = useState(null);

  const currentUserId = userId || localStorage.getItem('userId');

  useEffect(() => {
    fetchBadges();
  }, [currentUserId, showHidden]);

  useEffect(() => {
    if (!socket.connected) {
      const token = localStorage.getItem('accessToken');
      socket.connect(token);
    }

    socket.on('badge_earned', handleBadgeEarned);

    return () => {
      socket.off('badge_earned', handleBadgeEarned);
    };
  }, [currentUserId]);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await gamificationAPI.getUserBadges(currentUserId, showHidden);
      setBadges(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBadgeEarned = (data) => {
    if (data.userId === parseInt(currentUserId)) {
      setNewBadgeAnimation(data.badge);
      setTimeout(() => setNewBadgeAnimation(null), 3000);
      
      // Refresh badges
      fetchBadges();
    }
  };

  const getBadgeIcon = (badgeType) => {
    switch (badgeType) {
      case 'BRONZE':
        return <Medal className="w-6 h-6" />;
      case 'SILVER':
        return <Award className="w-6 h-6" />;
      case 'GOLD':
        return <Trophy className="w-6 h-6" />;
      case 'PLATINUM':
        return <Crown className="w-6 h-6" />;
      case 'DIAMOND':
        return <Gem className="w-6 h-6" />;
      default:
        return <Star className="w-6 h-6" />;
    }
  };

  const getBadgeColor = (badgeType) => {
    switch (badgeType) {
      case 'BRONZE':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'SILVER':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'GOLD':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'PLATINUM':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'DIAMOND':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getBadgeGradient = (badgeType) => {
    switch (badgeType) {
      case 'BRONZE':
        return 'from-amber-400 to-amber-600';
      case 'SILVER':
        return 'from-gray-400 to-gray-600';
      case 'GOLD':
        return 'from-yellow-400 to-yellow-600';
      case 'PLATINUM':
        return 'from-purple-400 to-purple-600';
      case 'DIAMOND':
        return 'from-blue-400 to-blue-600';
      default:
        return 'from-gray-400 to-gray-600';
    }
  };

  const getBadgePoints = (badgeType) => {
    switch (badgeType) {
      case 'BRONZE':
        return 10;
      case 'SILVER':
        return 25;
      case 'GOLD':
        return 50;
      case 'PLATINUM':
        return 100;
      case 'DIAMOND':
        return 200;
      default:
        return 10;
    }
  };

  const handleBadgeClick = (badge) => {
    setSelectedBadge(badge);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedBadge(null);
  };

  const formatEarnedDate = (dateString) => {
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

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-2">
          <Award className="w-5 h-5 text-red-600" />
          <span className="text-red-800">Error loading badges: {error}</span>
        </div>
        <button
          onClick={fetchBadges}
          className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-8 text-center ${className}`}>
        <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Badges Yet</h3>
        <p className="text-gray-600">
          Start participating in the community to earn your first badges!
        </p>
      </div>
    );
  }

  const displayBadges = badges.slice(0, maxDisplay);

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {displayBadges.slice(0, 6).map((userBadge) => (
          <div
            key={userBadge.id}
            className={`relative w-8 h-8 rounded-full flex items-center justify-center ${getBadgeColor(userBadge.badge.badgeType)} border cursor-pointer hover:scale-110 transition-transform`}
            onClick={() => handleBadgeClick(userBadge)}
            title={userBadge.badge.name}
          >
            {getBadgeIcon(userBadge.badge.badgeType)}
            {newBadgeAnimation?.id === userBadge.badge.id && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
            )}
          </div>
        ))}
        {badges.length > 6 && (
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
            +{badges.length - 6}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* New Badge Animation */}
      {newBadgeAnimation && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-bounce">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5" />
            <span className="font-medium">New Badge Earned!</span>
          </div>
          <div className="text-sm mt-1">{newBadgeAnimation.name}</div>
        </div>
      )}

      {/* Badge Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayBadges.map((userBadge) => (
          <div
            key={userBadge.id}
            className={`relative bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-all cursor-pointer ${newBadgeAnimation?.id === userBadge.badge.id ? 'animate-pulse ring-2 ring-green-500' : ''}`}
            onClick={() => handleBadgeClick(userBadge)}
          >
            {/* Badge Icon */}
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-gradient-to-br ${getBadgeGradient(userBadge.badge.badgeType)} text-white mb-3`}>
              {getBadgeIcon(userBadge.badge.badgeType)}
            </div>

            {/* Badge Name */}
            <h3 className="text-sm font-semibold text-gray-900 text-center mb-1">
              {userBadge.badge.name}
            </h3>

            {/* Badge Type */}
            <div className="flex items-center justify-center space-x-1 mb-2">
              <span className={`px-2 py-1 text-xs rounded-full ${getBadgeColor(userBadge.badge.badgeType)}`}>
                {userBadge.badge.badgeType}
              </span>
            </div>

            {/* Points Value */}
            <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
              <Trophy className="w-3 h-3" />
              <span>{getBadgePoints(userBadge.badge.badgeType)} pts</span>
            </div>

            {/* Earned Date */}
            <div className="text-xs text-gray-400 text-center mt-2">
              {formatEarnedDate(userBadge.earnedAt)}
            </div>

            {/* New Badge Indicator */}
            {newBadgeAnimation?.id === userBadge.badge.id && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
            )}
          </div>
        ))}

        {/* More Badges Indicator */}
        {badges.length > maxDisplay && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-gray-600 mb-1">+{badges.length - maxDisplay}</div>
            <div className="text-xs text-gray-500">More Badges</div>
          </div>
        )}
      </div>

      {/* Badge Modal */}
      {showModal && selectedBadge && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedBadge.badge.name}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <Award className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Large Badge Icon */}
              <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center bg-gradient-to-br ${getBadgeGradient(selectedBadge.badge.badgeType)} text-white`}>
                {getBadgeIcon(selectedBadge.badge.badgeType)}
              </div>

              {/* Badge Details */}
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <span className={`px-3 py-1 text-sm rounded-full ${getBadgeColor(selectedBadge.badge.badgeType)}`}>
                    {selectedBadge.badge.badgeType}
                  </span>
                </div>
                
                <p className="text-gray-600 mb-4">
                  {selectedBadge.badge.description}
                </p>

                <div className="flex items-center justify-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">{getBadgePoints(selectedBadge.badge.badgeType)} points</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">Earned {formatEarnedDate(selectedBadge.earnedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Requirements */}
              {selectedBadge.badge.requirements && Object.keys(selectedBadge.badge.requirements).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Requirements:</h4>
                  <div className="space-y-1">
                    {Object.entries(selectedBadge.badge.requirements).map(([key, value]) => (
                      <div key={key} className="text-xs text-gray-600">
                        <span className="font-medium">{key}:</span> {value}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Data */}
              {selectedBadge.progressData && Object.keys(selectedBadge.progressData).length > 0 && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Progress:</h4>
                  <div className="space-y-1">
                    {Object.entries(selectedBadge.progressData).map(([key, value]) => (
                      <div key={key} className="text-xs text-gray-600">
                        <span className="font-medium">{key}:</span> {value}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{badges.length}</div>
            <div className="text-sm text-gray-600">Total Badges</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">
              {badges.filter(b => b.badge.badgeType === 'BRONZE').length}
            </div>
            <div className="text-sm text-gray-600">Bronze</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">
              {badges.filter(b => b.badge.badgeType === 'SILVER').length}
            </div>
            <div className="text-sm text-gray-600">Silver</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {badges.filter(b => b.badge.badgeType === 'GOLD').length}
            </div>
            <div className="text-sm text-gray-600">Gold</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BadgeShowcase;
