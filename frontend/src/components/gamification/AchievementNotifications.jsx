import React, { useState, useEffect } from 'react';
import { Trophy, Star, Award, X, Check, Bell, Sparkles, Target, Zap } from 'lucide-react';
import { gamificationAPI } from '../../services/gamificationAPI';
import socket from '../../services/socket';

const AchievementNotifications = ({ 
  maxNotifications = 5, 
  autoHideDelay = 5000,
  position = 'top-right',
  className = '' 
}) => {
  const [notifications, setNotifications] = useState([]);
  const [visibleNotifications, setVisibleNotifications] = useState(new Set());
  const [showAll, setShowAll] = useState(false);

  const currentUserId = localStorage.getItem('userId');

  useEffect(() => {
    if (!socket.connected) {
      const token = localStorage.getItem('accessToken');
      socket.connect(token);
    }

    socket.on('achievement_unlocked', handleAchievementUnlocked);
    socket.on('badge_earned', handleBadgeEarned);
    socket.on('level_up', handleLevelUp);
    socket.on('streak_milestone', handleStreakMilestone);

    return () => {
      socket.off('achievement_unlocked', handleAchievementUnlocked);
      socket.off('badge_earned', handleBadgeEarned);
      socket.off('level_up', handleLevelUp);
      socket.off('streak_milestone', handleStreakMilestone);
    };
  }, []);

  const handleAchievementUnlocked = (data) => {
    if (data.userId === parseInt(currentUserId)) {
      addNotification({
        id: `achievement_${Date.now()}`,
        type: 'achievement',
        title: 'Achievement Unlocked!',
        message: data.achievement.name,
        description: data.achievement.description,
        points: data.achievement.pointsReward,
        badgeType: data.achievement.badgeType,
        icon: Trophy,
        color: 'purple',
        timestamp: new Date(),
        metadata: data.achievement
      });
    }
  };

  const handleBadgeEarned = (data) => {
    if (data.userId === parseInt(currentUserId)) {
      addNotification({
        id: `badge_${date.now()}`,
        type: 'badge',
        title: 'Badge Earned!',
        message: data.badge.name,
        description: data.badge.description,
        points: data.badge.pointsValue,
        badgeType: data.badge.badgeType,
        icon: Award,
        color: 'yellow',
        timestamp: new Date(),
        metadata: data.badge
      });
    }
  };

  const handleLevelUp = (data) => {
    if (data.userId === parseInt(currentUserId)) {
      addNotification({
        id: `level_${date.now()}`,
        type: 'level',
        title: 'Level Up!',
        message: `Reached Level ${data.newLevel}`,
        description: `Congratulations! You've advanced from level ${data.oldLevel} to ${data.newLevel}`,
        points: (data.newLevel - data.oldLevel) * 10,
        icon: Star,
        color: 'blue',
        timestamp: new Date(),
        metadata: data
      });
    }
  };

  const handleStreakMilestone = (data) => {
    if (data.userId === parseInt(currentUserId)) {
      addNotification({
        id: `streak_${date.now()}`,
        type: 'streak',
        title: 'Streak Milestone!',
        message: `${data.milestone} Day Streak!`,
        description: `Amazing! You've maintained a ${data.streakType} streak for ${data.milestone} days`,
        points: data.milestone * 10,
        icon: Zap,
        color: 'green',
        timestamp: new Date(),
        metadata: data
      });
    }
  };

  const addNotification = (notification) => {
    setNotifications(prev => {
      const newNotifications = [notification, ...prev];
      // Keep only the most recent notifications
      return newNotifications.slice(0, maxNotifications);
    });

    // Auto-hide notification after delay
    if (autoHideDelay > 0) {
      setTimeout(() => {
        removeNotification(notification.id);
      }, autoHideDelay);
    }
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setVisibleNotifications(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const toggleNotificationVisibility = (id) => {
    setVisibleNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setVisibleNotifications(new Set());
  };

  const getNotificationIcon = (type, color) => {
    const iconMap = {
      achievement: Trophy,
      badge: Award,
      level: Star,
      streak: Zap
    };
    
    const Icon = iconMap[type] || Trophy;
    return <Icon className="w-5 h-5" />;
  };

  const getNotificationColor = (color) => {
    const colorMap = {
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      red: 'bg-red-100 text-red-800 border-red-200'
    };
    
    return colorMap[color] || colorMap.purple;
  };

  const getNotificationGradient = (color) => {
    const gradientMap = {
      purple: 'from-purple-500 to-purple-600',
      yellow: 'from-yellow-500 to-yellow-600',
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      red: 'from-red-500 to-red-600'
    };
    
    return gradientMap[color] || gradientMap.purple;
  };

  const getPositionClasses = () => {
    const positionMap = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
      'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
    };
    
    return positionMap[position] || positionMap['top-right'];
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={`fixed z-50 ${getPositionClasses()} ${className}`}>
      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={() => setShowAll(!showAll)}
          className="relative p-2 bg-white rounded-full shadow-lg border border-gray-200 hover:shadow-xl transition-shadow"
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
              {notifications.length}
            </span>
          )}
        </button>
      </div>

      {/* Notification List */}
      {showAll && (
        <div className="absolute right-0 mt-2 w-96 max-h-96 overflow-y-auto bg-white rounded-lg shadow-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <button
                onClick={clearAllNotifications}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear All
              </button>
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getNotificationColor(notification.color)}`}>
                    {getNotificationIcon(notification.type, notification.color)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {notification.title}
                      </h4>
                      <button
                        onClick={() => removeNotification(notification.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    
                    {notification.description && (
                      <p className="text-xs text-gray-500 mt-1">
                        {notification.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2">
                        {notification.points > 0 && (
                          <div className="flex items-center space-x-1">
                            <Trophy className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs font-medium text-gray-600">
                              +{notification.points} pts
                            </span>
                          </div>
                        )}
                        
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(notification.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Individual Notifications */}
      {!showAll && notifications.slice(0, 3).map((notification, index) => (
        <div
          key={notification.id}
          className={`mb-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 transform transition-all duration-300 ease-out ${
            visibleNotifications.has(notification.id) 
              ? 'translate-x-0 opacity-100 scale-100' 
              : 'translate-x-full opacity-0 scale-95'
          }`}
          style={{
            animationDelay: `${index * 100}ms`
          }}
        >
          <div className="flex items-start space-x-3">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${getNotificationGradient(notification.color)} text-white`}>
              {getNotificationIcon(notification.type, notification.color)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">
                  {notification.title}
                </h4>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <p className="text-sm text-gray-600">
                {notification.message}
              </p>
              
              {notification.description && (
                <p className="text-xs text-gray-500 mt-1">
                  {notification.description}
                </p>
              )}
              
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center space-x-2">
                  {notification.points > 0 && (
                    <div className="flex items-center space-x-1">
                      <Trophy className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs font-medium text-gray-600">
                        +{notification.points} pts
                      </span>
                    </div>
                  )}
                  
                  <span className="text-xs text-gray-400">
                    {formatTimeAgo(notification.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Expand/Collapse Indicator */}
      {notifications.length > 3 && !showAll && (
        <div className="mt-2 text-center">
          <button
            onClick={() => setShowAll(true)}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            View All {notifications.length} Notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default AchievementNotifications;
