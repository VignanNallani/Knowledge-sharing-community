import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BookOpen, 
  Target, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Circle, 
  Play, 
  Pause, 
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Plus,
  Settings,
  Filter,
  Search,
  Calendar,
  Award,
  BarChart3,
  Lightbulb,
  User,
  Star,
  MessageSquare,
  ExternalLink,
  RefreshCw,
  Download,
  AlertCircle,
  Info,
  Loader2,
  X
} from 'lucide-react';
import { learningPathsAPI } from '../../services/learningPaths.api';
import socket from '../../services/socket';

const LearningPathDashboard = ({ 
  className = '', 
  compact = false, 
  animated = true,
  userId = null,
  autoRefresh = true,
  showRecommendations = true 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [learningPaths, setLearningPaths] = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);
  const [pathDetails, setPathDetails] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [filters, setFilters] = useState({
    status: null,
    pathType: null,
    difficulty: null,
    search: ''
  });
  const [viewMode, setViewMode] = useState('grid'); // grid, list, timeline
  const [expandedPaths, setExpandedPaths] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingPath, setCreatingPath] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    if (socket.connected) {
      socket.emit('authenticate', { userId: userId || localStorage.getItem('userId') });
    }

    // Listen for real-time learning path updates
    const handlePathUpdate = (data) => {
      setLearningPaths(prev => {
        const updated = prev.map(path => 
          path.id === data.pathId ? { ...path, ...data.updates } : path
        );
        return updated;
      });

      if (selectedPath && selectedPath.id === data.pathId) {
        setPathDetails(prev => ({ ...prev, ...data.updates }));
      }
    };

    const handleProgressUpdate = (data) => {
      setLearningPaths(prev => {
        const updated = prev.map(path => 
          path.id === data.learningPathId 
            ? { ...path, progress: data.overallProgress }
            : path
        );
        return updated;
      });
    };

    const handlePathCreated = (data) => {
      setLearningPaths(prev => [data.learningPath, ...prev]);
    };

    const handlePathDeleted = (data) => {
      setLearningPaths(prev => prev.filter(path => path.id !== data.learningPathId));
    };

    socket.on('learningPathUpdate', handlePathUpdate);
    socket.on('progressUpdated', handleProgressUpdate);
    socket.on('learningPathCreated', handlePathCreated);
    socket.on('learningPathDeleted', handlePathDeleted);

    return () => {
      socket.off('learningPathUpdate', handlePathUpdate);
      socket.off('progressUpdated', handleProgressUpdate);
      socket.off('learningPathCreated', handlePathCreated);
      socket.off('learningPathDeleted', handlePathDeleted);
    };
  }, [userId, selectedPath]);

  // Load learning paths
  useEffect(() => {
    loadLearningPaths();
  }, [filters]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadLearningPaths();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, filters]);

  const loadLearningPaths = useCallback(async () => {
    try {
      setLoading(true);
      const data = await learningPathsAPI.getUserLearningPaths(userId || localStorage.getItem('userId'), filters);
      setLearningPaths(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load learning paths');
      console.error('Error loading learning paths:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, filters]);

  const loadPathDetails = useCallback(async (pathId) => {
    try {
      const details = await learningPathsAPI.getPathDetails(pathId);
      setPathDetails(details);
      setSelectedPath(details);
    } catch (err) {
      console.error('Error loading path details:', err);
    }
  }, []);

  const loadRecommendations = useCallback(async (pathId) => {
    try {
      const data = await learningPathsAPI.getPathRecommendations(pathId);
      setRecommendations(data);
    } catch (err) {
      console.error('Error loading recommendations:', err);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadLearningPaths();
      if (selectedPath) {
        await loadPathDetails(selectedPath.id);
      }
    } finally {
      setRefreshing(false);
    }
  }, [loadLearningPaths, selectedPath, loadPathDetails]);

  const handlePathSelect = useCallback(async (path) => {
    setSelectedPath(path);
    await loadPathDetails(path.id);
    await loadRecommendations(path.id);
  }, [loadPathDetails, loadRecommendations]);

  const handleProgressUpdate = useCallback(async (pathId, stepId, progressData) => {
    try {
      await learningPathsAPI.updateProgress(pathId, stepId, progressData);
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  }, []);

  const handlePathDelete = useCallback(async (pathId) => {
    try {
      await learningPathsAPI.deletePath(pathId);
      if (selectedPath && selectedPath.id === pathId) {
        setSelectedPath(null);
        setPathDetails(null);
      }
    } catch (err) {
      console.error('Error deleting path:', err);
    }
  }, [selectedPath]);

  const togglePathExpansion = useCallback((pathId) => {
    setExpandedPaths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pathId)) {
        newSet.delete(pathId);
      } else {
        newSet.add(pathId);
      }
      return newSet;
    });
  }, []);

  const filteredPaths = useMemo(() => {
    return learningPaths.filter(path => {
      if (filters.status && path.status !== filters.status) return false;
      if (filters.pathType && path.pathType !== filters.pathType) return false;
      if (filters.difficulty && path.difficulty !== filters.difficulty) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          path.name.toLowerCase().includes(searchLower) ||
          path.description?.toLowerCase().includes(searchLower) ||
          path.skills.some(skill => skill.toLowerCase().includes(searchLower))
        );
      }
      return true;
    });
  }, [learningPaths, filters]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleCreatePath = useCallback(async (pathData) => {
    try {
      setCreatingPath(true);
      const newPath = await learningPathsAPI.createPath(pathData);
      setShowCreateModal(false);
      await handleRefresh();
      return newPath;
    } catch (err) {
      console.error('Error creating path:', err);
      throw err;
    } finally {
      setCreatingPath(false);
    }
  }, [handleRefresh]);

  const getProgressColor = (progress) => {
    if (progress >= 0.8) return 'text-green-600';
    if (progress >= 0.5) return 'text-yellow-600';
    if (progress >= 0.3) return 'text-orange-600';
    return 'text-red-600';
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'BEGINNER': return 'bg-green-100 text-green-800';
      case 'INTERMEDIATE': return 'bg-yellow-100 text-yellow-800';
      case 'ADVANCED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && learningPaths.length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Learning Paths...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`learning-path-dashboard ${className} ${compact ? 'compact' : ''} ${animated ? 'animated' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Learning Paths</h1>
          <span className="text-sm text-gray-500">({filteredPaths.length} paths)</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Path</span>
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Filters"
          >
            <Filter className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          
          <div className="flex items-center bg-gray-100 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-l-lg ${viewMode === 'grid' ? 'bg-white text-blue-600' : 'text-gray-600'}`}
              title="Grid View"
            >
              <div className="grid grid-cols-2 gap-1 w-4 h-4">
                <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
              </div>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-white text-blue-600' : 'text-gray-600'}`}
              title="List View"
            >
              <div className="w-4 h-4 flex flex-col justify-center space-y-0.5">
                <div className="w-full h-0.5 bg-current rounded"></div>
                <div className="w-full h-0.5 bg-current rounded"></div>
                <div className="w-full h-0.5 bg-current rounded"></div>
              </div>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-2 rounded-r-lg ${viewMode === 'timeline' ? 'bg-white text-blue-600' : 'text-gray-600'}`}
              title="Timeline View"
            >
              <Clock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4">Filters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || null)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Path Type</label>
              <select
                value={filters.pathType || ''}
                onChange={(e) => handleFilterChange('pathType', e.target.value || null)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="SKILL_BASED">Skill Based</option>
                <option value="CAREER_BASED">Career Based</option>
                <option value="PERSONALIZED">Personalized</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
              <select
                value={filters.difficulty || ''}
                onChange={(e) => handleFilterChange('difficulty', e.target.value || null)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Levels</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search paths..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Learning Paths Grid/List */}
      {filteredPaths.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Learning Paths Found</h3>
          <p className="text-gray-600 mb-4">
            {filters.search || filters.status || filters.pathType || filters.difficulty 
              ? 'Try adjusting your filters or search terms.' 
              : 'Start your learning journey by creating your first path.'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Path
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {filteredPaths.map((path) => (
            <LearningPathCard
              key={path.id}
              path={path}
              viewMode={viewMode}
              expanded={expandedPaths.has(path.id)}
              selected={selectedPath?.id === path.id}
              onSelect={() => handlePathSelect(path)}
              onToggleExpansion={() => togglePathExpansion(path.id)}
              onDelete={() => handlePathDelete(path.id)}
              onProgressUpdate={handleProgressUpdate}
              getProgressColor={getProgressColor}
              getDifficultyColor={getDifficultyColor}
              getStatusColor={getStatusColor}
            />
          ))}
        </div>
      )}

      {/* Path Details Panel */}
      {selectedPath && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-screen overflow-y-auto mx-4">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{selectedPath.name}</h2>
                <button
                  onClick={() => setSelectedPath(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {pathDetails ? (
                <PathDetailsContent
                  path={selectedPath}
                  details={pathDetails}
                  recommendations={recommendations}
                  onProgressUpdate={handleProgressUpdate}
                  getProgressColor={getProgressColor}
                  getDifficultyColor={getDifficultyColor}
                />
              ) : (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading path details...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Path Modal */}
      {showCreateModal && (
        <CreatePathModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreatePath}
          creating={creatingPath}
        />
      )}
    </div>
  );
};

// Learning Path Card Component
const LearningPathCard = ({ 
  path, 
  viewMode, 
  expanded, 
  selected, 
  onSelect, 
  onToggleExpansion, 
  onDelete, 
  onProgressUpdate,
  getProgressColor,
  getDifficultyColor,
  getStatusColor 
}) => {
  const [updatingProgress, setUpdatingProgress] = useState(false);

  const handleStepComplete = async (stepId) => {
    setUpdatingProgress(true);
    try {
      await onProgressUpdate(path.id, stepId, {
        progressValue: 1.0,
        timeSpent: 30,
        completed: true
      });
    } finally {
      setUpdatingProgress(false);
    }
  };

  const renderCardContent = () => (
    <>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{path.name}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{path.description}</p>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(path.difficulty)}`}>
            {path.difficulty}
          </span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(path.status)}`}>
            {path.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <Target className="w-4 h-4" />
            <span>{path.steps?.length || 0} steps</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{path.estimatedDuration || 0}h</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="w-4 h-4" />
            <span>{new Date(path.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className={`text-sm font-medium ${getProgressColor(path.progress)}`}>
            {Math.round(path.progress * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${path.progress * 100}%` }}
          ></div>
        </div>
      </div>

      {path.skills && path.skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {path.skills.slice(0, 3).map((skill, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md"
            >
              {skill}
            </span>
          ))}
          {path.skills.length > 3 && (
            <span className="px-2 py-1 bg-gray-50 text-gray-700 text-xs rounded-md">
              +{path.skills.length - 3} more
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={onSelect}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            View Details
          </button>
          {viewMode !== 'timeline' && (
            <button
              onClick={onToggleExpansion}
              className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
        <button
          onClick={onDelete}
          className="p-1 text-red-600 hover:text-red-700 transition-colors"
          title="Delete Path"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded Content */}
      {expanded && path.steps && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Next Steps</h4>
          <div className="space-y-2">
            {path.steps
              .filter(step => !step.completed)
              .slice(0, 3)
              .map((step) => (
                <div key={step.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-2">
                    <Circle className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{step.title}</p>
                      <p className="text-xs text-gray-500">{step.stepType} • {step.estimatedTime || 0}min</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStepComplete(step.id)}
                    disabled={updatingProgress}
                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {updatingProgress ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Complete'}
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </>
  );

  if (viewMode === 'list') {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow ${selected ? 'ring-2 ring-blue-500' : ''}`}>
        {renderCardContent()}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      {renderCardContent()}
    </div>
  );
};

// Path Details Content Component
const PathDetailsContent = ({ 
  path, 
  details, 
  recommendations, 
  onProgressUpdate,
  getProgressColor,
  getDifficultyColor 
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const renderOverview = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
        <p className="text-gray-600">{path.description}</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Skills</h3>
        <div className="flex flex-wrap gap-2">
          {path.skills.map((skill, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-md"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Progress Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{Math.round(path.progress * 100)}%</div>
            <div className="text-sm text-gray-600">Complete</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{details.progressSummary?.completedSteps || 0}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{details.progressSummary?.inProgressSteps || 0}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{details.progressSummary?.notStartedSteps || 0}</div>
            <div className="text-sm text-gray-600">Not Started</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">Time Spent</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {Math.floor((details.analytics?.totalTimeSpent || 0) / 60)}h {(details.analytics?.totalTimeSpent || 0) % 60}m
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-900">Streak</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {details.analytics?.streakDays || 0} days
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Award className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-gray-900">Completion Rate</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {Math.round((details.analytics?.completionRate || 0) * 100)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSteps = () => (
    <div className="space-y-4">
      {details.steps?.map((step, index) => (
        <div key={step.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex-shrink-0">
            {step.completed ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <Circle className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900">{step.title}</h4>
            <p className="text-sm text-gray-600 mb-2">{step.description}</p>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span className={`px-2 py-1 rounded-full ${getDifficultyColor(step.difficulty)}`}>
                {step.difficulty}
              </span>
              <span>{step.stepType}</span>
              <span>{step.estimatedTime || 0}min</span>
            </div>
          </div>
          {!step.completed && (
            <button
              onClick={() => onProgressUpdate(path.id, step.id, {
                progressValue: 1.0,
                timeSpent: step.estimatedTime || 30,
                completed: true
              })}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Complete
            </button>
          )}
        </div>
      ))}
    </div>
  );

  const renderRecommendations = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Steps</h3>
        <div className="space-y-3">
          {recommendations
            .filter(rec => rec.type === 'NEXT_STEP')
            .map((rec, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{rec.title}</h4>
                  <p className="text-sm text-gray-600">{rec.description}</p>
                  <div className="flex items-center space-x-2 mt-2 text-sm text-gray-500">
                    <span>{rec.stepType}</span>
                    <span>•</span>
                    <span>{rec.estimatedTime || 0}min</span>
                  </div>
                </div>
                <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                  Start
                </button>
              </div>
            ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Mentor Recommendations</h3>
        <div className="space-y-3">
          {recommendations
            .filter(rec => rec.type === 'MENTOR_RECOMMENDATION')
            .map((rec, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{rec.title}</h4>
                  <p className="text-sm text-gray-600">{rec.description}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm text-gray-500">{rec.rating || 4.5}</span>
                    <span>•</span>
                    <span className="text-sm text-gray-500">{rec.experience || 0} sessions</span>
                  </div>
                </div>
                <button className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors">
                  Book Session
                </button>
              </div>
            ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Recommendations</h3>
        <div className="space-y-3">
          {recommendations
            .filter(rec => rec.type === 'CONTENT_RECOMMENDATION')
            .map((rec, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{rec.title}</h4>
                  <p className="text-sm text-gray-600 line-clamp-2">{rec.description}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{rec.author}</span>
                    <span>•</span>
                    <span className="text-sm text-gray-500">{rec.engagement || 0} interactions</span>
                  </div>
                </div>
                <button className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors">
                  View
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex space-x-1 mb-6 border-b border-gray-200">
        {['overview', 'steps', 'recommendations'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'steps' && renderSteps()}
        {activeTab === 'recommendations' && renderRecommendations()}
      </div>
    </div>
  );
};

// Create Path Modal Component
const CreatePathModal = ({ onClose, onCreate, creating }) => {
  const [formData, setFormData] = useState({
    targetSkills: [],
    difficulty: 'INTERMEDIATE',
    pathType: 'PERSONALIZED',
    estimatedDuration: 40,
    careerGoals: [],
    currentSkills: [],
    learningStyle: 'VISUAL'
  });

  const [skillInput, setSkillInput] = useState('');
  const [careerGoalInput, setCareerGoalInput] = useState('');
  const [currentSkillInput, setCurrentSkillInput] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onCreate(formData);
      onClose();
    } catch (error) {
      console.error('Error creating path:', error);
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.targetSkills.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        targetSkills: [...prev.targetSkills, skillInput.trim()]
      }));
      setSkillInput('');
    }
  };

  const addCareerGoal = () => {
    if (careerGoalInput.trim() && !formData.careerGoals.includes(careerGoalInput.trim())) {
      setFormData(prev => ({
        ...prev,
        careerGoals: [...prev.careerGoals, careerGoalInput.trim()]
      }));
      setCareerGoalInput('');
    }
  };

  const addCurrentSkill = () => {
    if (currentSkillInput.trim() && !formData.currentSkills.includes(currentSkillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        currentSkills: [...prev.currentSkills, currentSkillInput.trim()]
      }));
      setCurrentSkillInput('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-screen overflow-y-auto mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create Learning Path</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Skills</label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="Add a skill..."
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.targetSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-md flex items-center space-x-1"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        targetSkills: prev.targetSkills.filter((_, i) => i !== index)
                      }))}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Path Type</label>
                <select
                  value={formData.pathType}
                  onChange={(e) => setFormData(prev => ({ ...prev, pathType: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="SKILL_BASED">Skill Based</option>
                  <option value="CAREER_BASED">Career Based</option>
                  <option value="PERSONALIZED">Personalized</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Duration (hours)</label>
              <input
                type="number"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) }))}
                min="1"
                max="200"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Career Goals</label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={careerGoalInput}
                  onChange={(e) => setCareerGoalInput(e.target.value)}
                  placeholder="Add a career goal..."
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={addCareerGoal}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.careerGoals.map((goal, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-md flex items-center space-x-1"
                  >
                    <span>{goal}</span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        careerGoals: prev.careerGoals.filter((_, i) => i !== index)
                      }))}
                      className="text-green-500 hover:text-green-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Skills</label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={currentSkillInput}
                  onChange={(e) => setCurrentSkillInput(e.target.value)}
                  placeholder="Add a current skill..."
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={addCurrentSkill}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.currentSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded-md flex items-center space-x-1"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        currentSkills: prev.currentSkills.filter((_, i) => i !== index)
                      }))}
                      className="text-purple-500 hover:text-purple-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Learning Style</label>
              <select
                value={formData.learningStyle}
                onChange={(e) => setFormData(prev => ({ ...prev, learningStyle: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="VISUAL">Visual</option>
                <option value="AUDITORY">Auditory</option>
                <option value="KINESTHETIC">Kinesthetic</option>
                <option value="READING">Reading</option>
                <option value="INTERACTIVE">Interactive</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || formData.targetSkills.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Path'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LearningPathDashboard;
