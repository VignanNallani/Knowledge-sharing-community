import React, { useState, useEffect } from 'react';
import { Trophy, Star, TrendingUp, Award, Target, Zap } from 'lucide-react';
import { gamificationAPI } from '../../services/gamificationAPI';
import socket from '../../services/socket';

const PointsDisplay = ({ 
  userId = null, 
  showDetails = false, 
  compact = false, 
  animated = true,
  className = '' 
}) => {
  const [points, setPoints] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const currentUserId = userId || localStorage.getItem('userId');

  useEffect(() => {
    fetchPoints();
  }, [currentUserId]);

  useEffect(() => {
    if (!socket.connected) {
      const token = localStorage.getItem('accessToken');
      socket.connect(token);
    }

    socket.on('points_awarded', handlePointsUpdate);
    socket.on('level_up', handleLevelUp);

    return () => {
      socket.off('points_awarded', handlePointsUpdate);
      socket.off('level_up', handleLevelUp);
    };
  }, [currentUserId]);

  const fetchPoints = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await gamificationAPI.getUserPoints(currentUserId);
      setPoints(data);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePointsUpdate = (data) => {
    if (data.userId === parseInt(currentUserId)) {
      setPoints(prev => ({
        ...prev,
        currentPoints: data.currentPoints,
        totalPointsEarned: data.totalPointsEarned,
        level: data.level,
        experiencePoints: data.experiencePoints
      }));
      
      if (animated) {
        setShowAnimation(true);
        setTimeout(() => setShowAnimation(false), 2000);
      }
    }
  };

  const handleLevelUp = (data) => {
    if (data.userId === parseInt(currentUserId)) {
      setShowAnimation(true);
      setTimeout(() => setShowAnimation(false), 3000);
    }
  };

  const getLevelColor = (level) => {
    if (level >= 50) return 'text-purple-600';
    if (level >= 40) return 'text-red-600';
    if (level >= 30) return 'text-orange-600';
    if (level >= 20) return 'text-yellow-600';
    if (level >= 10) return 'text-green-600';
    return 'text-blue-600';
  };

  const getLevelIcon = (level) => {
    if (level >= 50) return <Trophy className="w-4 h-4" />;
    if (level >= 40) return <Award className="w-4 h-4" />;
    if (level >= 30) return <Star className="w-4 h-4" />;
    if (level >= 20) return <Target className="w-4 h-4" />;
    if (level >= 10) return <Zap className="w-4 h-4" />;
    return <Star className="w-4 h-4" />;
  };

  const getProgressPercentage = (currentLevel, experiencePoints) => {
    // Calculate XP needed for current level and next level
    const currentLevelXP = Math.floor((currentLevel - 1) * currentLevel * 50);
    const nextLevelXP = Math.floor(currentLevel * (currentLevel + 1) * 50);
    const progressXP = experiencePoints - currentLevelXP;
    const totalXP = nextLevelXP - currentLevelXP;
    
    return Math.min(100, Math.max(0, (progressXP / totalXP) * 100));
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="space-y-1">
          <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-12 h-3 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
        <Trophy className="w-5 h-5" />
        <span className="text-sm">Error loading points</span>
      </div>
    );
  }

  if (!points) {
    return (
      <div className={`flex items-center space-x-2 text-gray-500 ${className}`}>
        <Trophy className="w-5 h-5" />
        <span className="text-sm">No points data</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`flex items-center space-x-1 ${getLevelColor(points.level)}`}>
          {getLevelIcon(points.level)}
          <span className="font-semibold">{points.level}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="font-medium">{formatNumber(points.currentPoints)}</span>
        </div>
        {showAnimation && (
          <div className="animate-bounce">
            <Zap className="w-4 h-4 text-green-500" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {showAnimation && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-green-500 text-white px-3 py-1 rounded-full animate-pulse">
            <span className="text-sm font-medium">+{lastUpdate ? points.currentPoints - lastUpdate.currentPoints : 0}</span>
          </div>
        </div>
      )}
      
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${showAnimation ? 'animate-pulse' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 ${getLevelColor(points.level)}`}>
              {getLevelIcon(points.level)}
              <span className="text-lg font-bold">Level {points.level}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="text-xl font-bold">{formatNumber(points.currentPoints)}</span>
            </div>
          </div>
          
          {showDetails && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <TrendingUp className="w-4 h-4" />
              <span>{formatNumber(points.totalPointsEarned)} total</span>
            </div>
          )}
        </div>

        {showDetails && (
          <div className="space-y-2">
            {/* Level Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Level Progress</span>
                <span>{getProgressPercentage(points.level, points.experiencePoints).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${getProgressPercentage(points.level, points.experiencePoints)}%` }}
                ></div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-blue-50 rounded-lg p-2">
                <div className="text-xs text-gray-600">Current</div>
                <div className="text-sm font-semibold text-blue-600">{formatNumber(points.currentPoints)}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-2">
                <div className="text-xs text-gray-600">Earned</div>
                <div className="text-sm font-semibold text-green-600">{formatNumber(points.totalPointsEarned)}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-2">
                <div className="text-xs text-gray-600">XP</div>
                <div className="text-sm font-semibold text-purple-600">{formatNumber(points.experiencePoints)}</div>
              </div>
            </div>

            {/* Next Level Info */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Next Level</span>
                <span className="text-sm font-medium">Level {points.level + 1}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {Math.floor(points.level * (points.level + 1) * 50) - points.experiencePoints} XP to go
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PointsDisplay;
