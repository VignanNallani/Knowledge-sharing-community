import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Users, Award, Star, ChevronUp, ChevronDown, Minus, Filter, RefreshCw, Search } from 'lucide-react';
import { gamificationAPI } from '../../services/gamificationAPI';
import socket from '../../services/socket';

const LeaderboardsPage = ({ className = '' }) => {
  const [leaderboards, setLeaderboards] = useState([]);
  const [selectedLeaderboard, setSelectedLeaderboard] = useState('GLOBAL');
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('all_time');

  const currentUserId = localStorage.getItem('userId');

  const leaderboardTypes = [
    { value: 'GLOBAL', label: 'Global Points', icon: Trophy },
    { value: 'WEEKLY', label: 'Weekly Points', icon: TrendingUp },
    { value: 'MONTHLY', label: 'Monthly Points', icon: Star },
    { value: 'SKILL_BASED', label: 'Skill Based', icon: Users }
  ];

  const skills = ['javascript', 'react', 'nodejs', 'python', 'typescript', 'vue', 'angular', 'docker', 'aws'];

  const timeRanges = [
    { value: 'all_time', label: 'All Time' },
    { value: 'weekly', label: 'This Week' },
    { value: 'monthly', label: 'This Month' }
  ];

  useEffect(() => {
    fetchLeaderboards();
    fetchUserRank();
  }, [selectedLeaderboard, selectedSkill, timeRange]);

  useEffect(() => {
    if (!socket.connected) {
      const token = localStorage.getItem('accessToken');
      socket.connect(token);
    }

    socket.on('leaderboard_updated', handleLeaderboardUpdate);

    return () => {
      socket.off('leaderboard_updated', handleLeaderboardUpdate);
    };
  }, []);

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await gamificationAPI.getLeaderboard(selectedLeaderboard, selectedSkill, 50);
      setLeaderboards(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRank = async () => {
    try {
      const rank = await gamificationAPI.getUserLeaderboardRank(currentUserId, selectedLeaderboard, selectedSkill);
      setUserRank(rank);
    } catch (err) {
      console.error('Error fetching user rank:', err);
    }
  };

  const handleLeaderboardUpdate = (data) => {
    if (data.userId === parseInt(currentUserId) || selectedLeaderboard === 'GLOBAL') {
      fetchLeaderboards();
      fetchUserRank();
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboards();
    await fetchUserRank();
    setRefreshing(false);
  };

  const handleLeaderboardTypeChange = (type) => {
    setSelectedLeaderboard(type);
    if (type !== 'SKILL_BASED') {
      setSelectedSkill(null);
    }
  };

  const handleSkillChange = (skill) => {
    setSelectedSkill(skill);
  };

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
  };

  const getRankChangeIcon = (previousRank, currentRank) => {
    if (previousRank === null) return <Minus className="w-4 h-4 text-gray-400" />;
    if (previousRank > currentRank) return <ChevronUp className="w-4 h-4 text-green-500" />;
    if (previousRank < currentRank) return <ChevronDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getRankChangeColor = (previousRank, currentRank) => {
    if (previousRank === null) return 'text-gray-400';
    if (previousRank > currentRank) return 'text-green-500';
    if (previousRank < currentRank) return 'text-red-500';
    return 'text-gray-400';
  };

  const getMedalColor = (rank) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-gray-600';
  };

  const getMedalIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const filteredLeaderboards = leaderboards.filter(entry => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return entry.user.name.toLowerCase().includes(query);
  });

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-4">
              {[...Array(10)].map((_, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="w-16 h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-red-600" />
          <span className="text-red-800">Error loading leaderboards: {error}</span>
        </div>
        <button
          onClick={fetchLeaderboards}
          className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <h1 className="text-2xl font-bold text-gray-900">Leaderboards</h1>
            <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
              {leaderboards.length} Users
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filters</span>
            </button>

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

        {/* User Rank Card */}
        {userRank && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-lg font-semibold text-gray-900">Your Rank</div>
                <div className="flex items-center space-x-1">
                  <span className="text-2xl font-bold text-blue-600">#{userRank.rankPosition}</span>
                  {getRankChangeIcon(userRank.previousRank, userRank.rankPosition)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Score</div>
                <div className="text-lg font-semibold text-gray-900">{formatNumber(userRank.score)}</div>
              </div>
            </div>
            <div className="text-sm text-gray-600 mt-2">
              You're in the top {Math.round((userRank.rankPosition / userRank.totalUsers) * 100)}% of all users
            </div>
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="space-y-4 border-t border-gray-200 pt-4">
            {/* Leaderboard Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Leaderboard Type</label>
              <div className="flex flex-wrap gap-2">
                {leaderboardTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleLeaderboardTypeChange(type.value)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                      selectedLeaderboard === type.value
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <type.icon className="w-4 h-4" />
                    <span className="text-sm">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Skill Filter */}
            {selectedLeaderboard === 'SKILL_BASED' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skill</label>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => handleSkillChange(skill)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        selectedSkill === skill
                          ? 'bg-purple-100 text-purple-800 border-purple-200'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {skill.charAt(0).toUpperCase() + skill.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Time Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
              <div className="flex flex-wrap gap-2">
                {timeRanges.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => handleTimeRangeChange(range.value)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      timeRange === range.value
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Users</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLeaderboards.map((entry, index) => (
                <tr
                  key={entry.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    parseInt(currentUserId) === entry.userId ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getMedalIcon(entry.rankPosition) && (
                        <span className="text-lg">{getMedalIcon(entry.rankPosition)}</span>
                      )}
                      <span className={`text-lg font-bold ${getMedalColor(entry.rankPosition)}`}>
                        #{entry.rankPosition}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <img
                        src={entry.user.profileImage || '/images/default-avatar.png'}
                        alt={entry.user.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {entry.user.name}
                        </div>
                        {parseInt(currentUserId) === entry.userId && (
                          <div className="text-xs text-blue-600">You</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">
                          {entry.userPoints?.level || 1}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatNumber(entry.score)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {formatNumber(entry.userPoints?.totalPointsEarned || 0)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      {getRankChangeIcon(entry.previousRank, entry.rankPosition)}
                      {entry.previousRank && entry.previousRank !== entry.rankPosition && (
                        <span className={`text-xs ${getRankChangeColor(entry.previousRank, entry.rankPosition)}`}>
                          {Math.abs(entry.previousRank - entry.rankPosition)}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLeaderboards.length === 0 && (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Found</h3>
            <p className="text-gray-600">
              {searchQuery ? 'No users found matching your search.' : 'No users on this leaderboard yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Leaderboard Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Leaderboard Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Trophy className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Total Participants</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {leaderboards.length}
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Average Score</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {leaderboards.length > 0 
                ? formatNumber(Math.round(leaderboards.reduce((sum, entry) => sum + entry.score, 0) / leaderboards.length))
                : 0
              }
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Award className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Top Score</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {leaderboards.length > 0 ? formatNumber(leaderboards[0]?.score || 0) : 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardsPage;
