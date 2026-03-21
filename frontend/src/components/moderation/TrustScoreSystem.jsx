import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Users, AlertTriangle, CheckCircle, Clock, Shield, Star } from 'lucide-react';
import apiService from '../../services/api';

const TrustScoreDisplay = ({ userId, showDetails = false }) => {
  const [trustScore, setTrustScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTrustScore();
  }, [userId]);

  const fetchTrustScore = async () => {
    try {
      const response = await apiService.client.get(`/moderation/trust-scores/${userId}`);
      const data = response.data;
      if (data.success) {
        setTrustScore(data.data.trustScore);
      } else {
        setError('Unable to fetch trust score');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'VIP': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'TRUSTED': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'ESTABLISHED': return 'bg-green-100 text-green-700 border-green-300';
      case 'NEW': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'RESTRICTED': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'SUSPENDED': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 'VIP': return <Star className="w-4 h-4" />;
      case 'TRUSTED': return <Shield className="w-4 h-4" />;
      case 'ESTABLISHED': return <CheckCircle className="w-4 h-4" />;
      case 'NEW': return <Users className="w-4 h-4" />;
      case 'RESTRICTED': return <AlertTriangle className="w-4 h-4" />;
      case 'SUSPENDED': return <AlertTriangle className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !trustScore) {
    return (
      <div className="text-center p-4">
        <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">Trust score unavailable</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Trust Score</h3>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getLevelColor(trustScore.trustLevel)}`}>
          {getLevelIcon(trustScore.trustLevel)}
          <span className="text-sm font-medium">{trustScore.trustLevel}</span>
        </div>
      </div>

      {/* Overall Score */}
      <div className="text-center mb-6">
        <div className={`text-4xl font-bold ${getScoreColor(trustScore.overallScore)}`}>
          {trustScore.overallScore}
        </div>
        <p className="text-sm text-gray-600">Overall Score</p>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className={`h-2 rounded-full ${getScoreColor(trustScore.overallScore).replace('text', 'bg')}`}
            style={{ width: `${trustScore.overallScore}%` }}
          />
        </div>
      </div>

      {showDetails && (
        <div className="space-y-4">
          {/* Component Scores */}
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Content Quality</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-gray-900">{trustScore.contentQualityScore}</span>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Community Engagement</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-gray-900">{trustScore.communityEngagementScore}</span>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Reliability</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-gray-900">{trustScore.reliabilityScore}</span>
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
            </div>
          </div>

          {/* Last Updated */}
          <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-200">
            <span>Last calculated</span>
            <span>{new Date(trustScore.lastCalculatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const TrustScoreAdmin = ({ userId, onUpdate }) => {
  const [trustScore, setTrustScore] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    contentQualityScore: '',
    communityEngagementScore: '',
    reliabilityScore: '',
    trustLevel: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTrustScore();
  }, [userId]);

  const fetchTrustScore = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/moderation/trust-scores/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success) {
        setTrustScore(data.data.trustScore);
        setEditForm({
          contentQualityScore: data.data.trustScore.contentQualityScore,
          communityEngagementScore: data.data.trustScore.communityEngagementScore,
          reliabilityScore: data.data.trustScore.reliabilityScore,
          trustLevel: data.data.trustScore.trustLevel
        });
      }
    } catch (error) {
      console.error('Error fetching trust score:', error);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const response = await apiService.client.patch(`/moderation/trust-scores/${userId}`, {
        contentQualityScore: editForm.contentQualityScore,
        communityEngagementScore: editForm.communityEngagementScore,
        reliabilityScore: editForm.reliabilityScore,
        trustLevel: editForm.trustLevel
      });
      const data = response.data;
      if (data.success) {
        setTrustScore(data.data.trustScore);
        setIsEditing(false);
        onUpdate(data.data.trustScore);
      }
    } catch (error) {
      console.error('Error updating trust score:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setLoading(true);
    try {
      const response = await apiService.client.post(`/moderation/trust-scores/${userId}/recalculate`);
      const data = response.data;
      if (data.success) {
        setTrustScore(data.data.trustScore);
        onUpdate(data.data.trustScore);
      }
    } catch (error) {
      console.error('Error recalculating trust score:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!trustScore) {
    return <div className="text-center p-4">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Trust Score Management</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRecalculate}
            disabled={loading}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Calculating...' : 'Recalculate'}
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content Quality (0-100)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={editForm.contentQualityScore}
                onChange={(e) => setEditForm(prev => ({ ...prev, contentQualityScore: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Community Engagement (0-100)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={editForm.communityEngagementScore}
                onChange={(e) => setEditForm(prev => ({ ...prev, communityEngagementScore: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reliability (0-100)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={editForm.reliabilityScore}
                onChange={(e) => setEditForm(prev => ({ ...prev, reliabilityScore: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trust Level</label>
              <select
                value={editForm.trustLevel}
                onChange={(e) => setEditForm(prev => ({ ...prev, trustLevel: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="NEW">New</option>
                <option value="ESTABLISHED">Established</option>
                <option value="TRUSTED">Trusted</option>
                <option value="VIP">VIP</option>
                <option value="RESTRICTED">Restricted</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </div>
      ) : (
        <TrustScoreDisplay userId={userId} showDetails={true} />
      )}
    </div>
  );
};

const TrustScoreLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');

  useEffect(() => {
    fetchLeaderboard();
  }, [timeRange]);

  const fetchLeaderboard = async () => {
    try {
      const response = await apiService.client.get(`/moderation/trust-scores/leaderboard?range=${timeRange}`);
      const data = response.data;
      if (data.success) {
        setLeaderboard(data.data.leaderboard);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'VIP': return 'text-purple-600';
      case 'TRUSTED': return 'text-blue-600';
      case 'ESTABLISHED': return 'text-green-600';
      case 'NEW': return 'text-gray-600';
      case 'RESTRICTED': return 'text-orange-600';
      case 'SUSPENDED': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading leaderboard...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Trust Score Leaderboard</h3>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
        </select>
      </div>

      <div className="space-y-3">
        {leaderboard.map((user, index) => (
          <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <div className="flex items-center space-x-3">
              <div className="text-lg font-bold text-gray-700 w-8">
                {getRankIcon(index + 1)}
              </div>
              <div>
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className={`text-sm ${getLevelColor(user.trustLevel)}`}>{user.trustLevel}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">{user.overallScore}</p>
              <p className="text-xs text-gray-500">points</p>
            </div>
          </div>
        ))}
      </div>

      {leaderboard.length === 0 && (
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No data available for selected time range</p>
        </div>
      )}
    </div>
  );
};

export { TrustScoreDisplay, TrustScoreAdmin, TrustScoreLeaderboard };
