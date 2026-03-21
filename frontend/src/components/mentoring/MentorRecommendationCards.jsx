import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  User, 
  Star, 
  MessageSquare, 
  Calendar, 
  Clock, 
  Award, 
  TrendingUp, 
  Filter, 
  Search, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight, 
  ChevronLeft, 
  Heart, 
  BookOpen, 
  Target, 
  Users, 
  BarChart3, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Loader2, 
  X, 
  ThumbsUp, 
  ThumbsDown, 
  Video, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Shield, 
  Zap
} from 'lucide-react';
import { mentorRecommendationsAPI } from '../../services/mentorRecommendations.api';
import socket from '../../services/socket';

const MentorRecommendationCards = ({ 
  className = '', 
  compact = false, 
  animated = true,
  userId = null,
  autoRefresh = true,
  showFilters = true,
  maxRecommendations = 10,
  enableFeedback = true 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [filteredRecommendations, setFilteredRecommendations] = useState([]);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [mentorDetails, setMentorDetails] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [filters, setFilters] = useState({
    skills: [],
    experience: 'INTERMEDIATE',
    minRating: 4.0,
    maxSessions: null,
    sortBy: 'overallScore',
    sortOrder: 'desc'
  });
  const [viewMode, setViewMode] = useState('grid'); // grid, list, carousel
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [bookingModal, setBookingModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize socket connection
  useEffect(() => {
    if (socket.connected) {
      socket.emit('authenticate', { userId: userId || localStorage.getItem('userId') });
    }

    // Listen for real-time mentor recommendation updates
    const handleMentorRecommendationUpdate = (data) => {
      setRecommendations(prev => {
        const updated = prev.map(rec => 
          rec.mentorId === data.mentorId ? { ...rec, ...data.updates } : rec
        );
        return updated;
      });

      if (selectedMentor && selectedMentor.mentorId === data.mentorId) {
        setMentorDetails(prev => ({ ...prev, ...data.updates }));
      }
    };

    const handleMentorFeedbackUpdated = (data) => {
      setRecommendations(prev => {
        const updated = prev.map(rec => 
          rec.mentorId === data.mentorId 
            ? { ...rec, feedbackScore: data.feedbackScore, feedbackComment: data.feedbackComment }
            : rec
        );
        return updated;
      });
    };

    socket.on('mentorRecommendationUpdate', handleMentorRecommendationUpdate);
    socket.on('mentorFeedbackUpdated', handleMentorFeedbackUpdated);

    return () => {
      socket.off('mentorRecommendationUpdate', handleMentorRecommendationUpdate);
      socket.off('mentorFeedbackUpdated', handleMentorFeedbackUpdated);
    };
  }, [userId, selectedMentor]);

  // Load mentor recommendations
  useEffect(() => {
    loadRecommendations();
  }, [filters]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadRecommendations();
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [autoRefresh, filters]);

  // Filter recommendations
  useEffect(() => {
    const filtered = recommendations.filter(rec => {
      if (filters.minRating && rec.overallScore < filters.minRating) return false;
      if (filters.maxSessions && rec.sessionStats?.totalSessions > filters.maxSessions) return false;
      if (searchTerm && !rec.mentorName.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !rec.mentorSkills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))) {
        return false;
      }
      return true;
    });

    // Sort recommendations
    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[filters.sortBy] || 0;
      const bValue = b[filters.sortBy] || 0;
      
      if (filters.sortOrder === 'desc') {
        return bValue - aValue;
      } else {
        return aValue - bValue;
      }
    });

    setFilteredRecommendations(sorted);
  }, [recommendations, filters, searchTerm]);

  const loadRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await mentorRecommendationsAPI.getRecommendations(userId || localStorage.getItem('userId'), {
        skills: filters.skills,
        experience: filters.experience,
        limit: maxRecommendations,
        minRating: filters.minRating,
        maxSessions: filters.maxSessions
      });
      setRecommendations(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load mentor recommendations');
      console.error('Error loading mentor recommendations:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, filters, maxRecommendations]);

  const loadMentorDetails = useCallback(async (mentorId) => {
    try {
      // This would load detailed mentor information
      // For now, we'll use the recommendation data
      const mentor = recommendations.find(rec => rec.mentorId === mentorId);
      if (mentor) {
        setMentorDetails(mentor);
        setSelectedMentor(mentor);
        await loadMentorAvailability(mentorId);
      }
    } catch (err) {
      console.error('Error loading mentor details:', err);
    }
  }, [recommendations]);

  const loadMentorAvailability = useCallback(async (mentorId) => {
    try {
      const data = await mentorRecommendationsAPI.getMentorAvailability(mentorId, {
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: 'AVAILABLE'
      });
      setAvailability(data);
    } catch (err) {
      console.error('Error loading mentor availability:', err);
      setAvailability([]);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadRecommendations();
    } finally {
      setRefreshing(false);
    }
  }, [loadRecommendations]);

  const handleMentorSelect = useCallback(async (mentor) => {
    await loadMentorDetails(mentor.mentorId);
  }, [loadMentorDetails]);

  const handleFeedback = useCallback(async (mentorId, feedback) => {
    try {
      await mentorRecommendationsAPI.updateFeedback(mentorId, feedback);
      setFeedbackModal(null);
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  }, []);

  const handleBooking = useCallback(async (mentorId, slotId) => {
    try {
      // This would handle the booking process
      console.log('Booking mentor:', mentorId, 'slot:', slotId);
      setBookingModal(null);
    } catch (err) {
      console.error('Error booking mentor:', err);
    }
  }, []);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    if (score >= 0.4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score) => {
    if (score >= 0.8) return 'bg-green-100';
    if (score >= 0.6) return 'bg-yellow-100';
    if (score >= 0.4) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const paginatedRecommendations = useMemo(() => {
    const itemsPerPage = viewMode === 'carousel' ? 1 : 6;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecommendations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecommendations, currentPage, viewMode]);

  const totalPages = Math.ceil(filteredRecommendations.length / (viewMode === 'carousel' ? 1 : 6));

  if (loading && recommendations.length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Mentor Recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`mentor-recommendation-cards ${className} ${compact ? 'compact' : ''} ${animated ? 'animated' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Users className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Mentor Recommendations</h1>
          <span className="text-sm text-gray-500">({filteredRecommendations.length} mentors)</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {showFilters && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Filters"
            >
              <Filter className="w-5 h-5" />
            </button>
          )}
          
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
              onClick={() => setViewMode('carousel')}
              className={`p-2 rounded-r-lg ${viewMode === 'carousel' ? 'bg-white text-blue-600' : 'text-gray-600'}`}
              title="Carousel View"
            >
              <ChevronRight className="w-4 h-4" />
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

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search mentors by name or skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Filters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
              <div className="flex flex-wrap gap-2">
                {['JavaScript', 'React', 'Python', 'Machine Learning', 'Data Science', 'Web Development'].map(skill => (
                  <button
                    key={skill}
                    onClick={() => {
                      const newSkills = filters.skills.includes(skill)
                        ? filters.skills.filter(s => s !== skill)
                        : [...filters.skills, skill];
                      handleFilterChange('skills', newSkills);
                    }}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      filters.skills.includes(skill)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
              <select
                value={filters.experience}
                onChange={(e) => handleFilterChange('experience', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Rating</label>
              <select
                value={filters.minRating}
                onChange={(e) => handleFilterChange('minRating', parseFloat(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="3.0">3.0+</option>
                <option value="3.5">3.5+</option>
                <option value="4.0">4.0+</option>
                <option value="4.5">4.5+</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="overallScore">Overall Score</option>
                <option value="skillMatch">Skill Match</option>
                <option value="performance">Performance</option>
                <option value="availability">Availability</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Mentor Recommendations */}
      {filteredRecommendations.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Mentor Recommendations Found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filters.skills.length > 0 
              ? 'Try adjusting your filters or search terms.' 
              : 'Check back later for new mentor recommendations.'}
          </p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Recommendations
          </button>
        </div>
      ) : (
        <>
          {/* Grid/List/Carousel View */}
          {viewMode === 'carousel' ? (
            <div className="relative">
              <div className="overflow-hidden">
                <div className="flex transition-transform duration-300 ease-in-out">
                  {paginatedRecommendations.map((mentor) => (
                    <div key={mentor.mentorId} className="w-full flex-shrink-0 px-2">
                      <MentorCard
                        mentor={mentor}
                        onSelect={() => handleMentorSelect(mentor)}
                        onFeedback={() => setFeedbackModal(mentor)}
                        onBooking={() => setBookingModal(mentor)}
                        enableFeedback={enableFeedback}
                        getScoreColor={getScoreColor}
                        getScoreBgColor={getScoreBgColor}
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Carousel Controls */}
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center space-x-2">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-2 h-2 rounded-full ${
                        currentPage === i + 1 ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
              {paginatedRecommendations.map((mentor) => (
                <MentorCard
                  key={mentor.mentorId}
                  mentor={mentor}
                  onSelect={() => handleMentorSelect(mentor)}
                  onFeedback={() => setFeedbackModal(mentor)}
                  onBooking={() => setBookingModal(mentor)}
                  enableFeedback={enableFeedback}
                  getScoreColor={getScoreColor}
                  getScoreBgColor={getScoreBgColor}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {viewMode !== 'carousel' && totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-6">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                if (totalPages > 5) {
                  // Show first 2, current, and last 2
                  if (pageNum === 3 && currentPage > 3) {
                    return <span key={pageNum} className="px-2">...</span>;
                  }
                  if (pageNum === 4 && currentPage < totalPages - 2) {
                    return <span key={pageNum} className="px-2">...</span>;
                  }
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded-md ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Mentor Details Modal */}
      {selectedMentor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-screen overflow-y-auto mx-4">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{selectedMentor.mentorName}</h2>
                <button
                  onClick={() => setSelectedMentor(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <MentorDetailsContent
                mentor={selectedMentor}
                details={mentorDetails}
                availability={availability}
                onFeedback={handleFeedback}
                onBooking={handleBooking}
                enableFeedback={enableFeedback}
                getScoreColor={getScoreColor}
                getScoreBgColor={getScoreBgColor}
              />
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModal && (
        <FeedbackModal
          mentor={feedbackModal}
          onClose={() => setFeedbackModal(null)}
          onSubmit={handleFeedback}
        />
      )}

      {/* Booking Modal */}
      {bookingModal && (
        <BookingModal
          mentor={bookingModal}
          availability={availability}
          onClose={() => setBookingModal(null)}
          onBooking={handleBooking}
        />
      )}
    </div>
  );
};

// Mentor Card Component
const MentorCard = ({ 
  mentor, 
  onSelect, 
  onFeedback, 
  onBooking, 
  enableFeedback,
  getScoreColor,
  getScoreBgColor 
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleCardClick = () => {
    if (!expanded) {
      setExpanded(true);
    }
    onSelect();
  };

  return (
    <div 
      className={`bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 cursor-pointer ${expanded ? 'ring-2 ring-blue-500' : ''}`}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-gray-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{mentor.mentorName}</h3>
            <p className="text-sm text-gray-600">{mentor.mentorRole}</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${getScoreColor(mentor.overallScore)}`}>
            {Math.round(mentor.overallScore * 100)}%
          </div>
          <div className="text-xs text-gray-500">Match Score</div>
        </div>
      </div>

      {/* Bio */}
      {mentor.mentorBio && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{mentor.mentorBio}</p>
      )}

      {/* Skills */}
      {mentor.mentorSkills && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {mentor.mentorSkills.slice(0, 3).map((skill, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md"
              >
                {skill}
              </span>
            ))}
            {mentor.mentorSkills.length > 3 && (
              <span className="px-2 py-1 bg-gray-50 text-gray-700 text-xs rounded-md">
                +{mentor.mentorSkills.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Score Breakdown */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
          <span className="text-xs text-gray-600">Skill Match</span>
          <span className={`text-xs font-medium ${getScoreColor(mentor.skillMatch)}`}>
            {Math.round(mentor.skillMatch * 100)}%
          </span>
        </div>
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
          <span className="text-xs text-gray-600">Performance</span>
          <span className={`text-xs font-medium ${getScoreColor(mentor.performance)}`}>
            {Math.round(mentor.performance * 100)}%
          </span>
        </div>
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
          <span className="text-xs text-gray-600">Availability</span>
          <span className={`text-xs font-medium ${getScoreColor(mentor.availability)}`}>
            {Math.round(mentor.availability * 100)}%
          </span>
        </div>
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
          <span className="text-xs text-gray-600">Compatibility</span>
          <span className={`text-xs font-medium ${getScoreColor(mentor.compatibility)}`}>
            {Math.round(mentor.compatibility * 100)}%
          </span>
        </div>
      </div>

      {/* Stats */}
      {mentor.sessionStats && (
        <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <Award className="w-4 h-4" />
            <span>{mentor.sessionStats.totalSessions || 0} sessions</span>
          </div>
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4" />
            <span>{mentor.sessionStats.averageRating || 4.5} rating</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          View Profile
        </button>
        
        <div className="flex items-center space-x-2">
          {enableFeedback && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFeedback();
              }}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Leave Feedback"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBooking();
            }}
            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
            title="Book Session"
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && mentor.recommendationReasons && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Why Recommended</h4>
          <ul className="space-y-1">
            {mentor.recommendationReasons.slice(0, 3).map((reason, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Mentor Details Content Component
const MentorDetailsContent = ({ 
  mentor, 
  details, 
  availability, 
  onFeedback, 
  onBooking,
  enableFeedback,
  getScoreColor,
  getScoreBgColor 
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const renderOverview = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">About</h3>
        <p className="text-gray-600">{mentor.mentorBio || 'No bio available'}</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Skills & Expertise</h3>
        <div className="flex flex-wrap gap-2">
          {mentor.mentorSkills.map((skill, index) => (
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
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Match Analysis</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Overall Compatibility</p>
              <p className="text-sm text-gray-600">Combined score across all factors</p>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(mentor.overallScore)}`}>
              {Math.round(mentor.overallScore * 100)}%
            </div>
          </div>
          
          {mentor.scoringFactors && Object.entries(mentor.scoringFactors).map(([key, factor]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="text-sm text-gray-600">
                  Weight: {Math.round(factor.weight * 100)}%
                </p>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${getScoreColor(factor.score)}`}>
                  {Math.round(factor.score * 100)}%
                </div>
                <div className="text-xs text-gray-500">
                  {Math.round(factor.contribution * 100)}% contribution
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {mentor.sessionStats?.totalSessions || 0}
            </div>
            <div className="text-sm text-gray-600">Total Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {mentor.sessionStats?.averageRating?.toFixed(1) || '4.5'}
            </div>
            <div className="text-sm text-gray-600">Average Rating</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {mentor.sessionStats?.completionRate?.toFixed(1) || '95'}%
            </div>
            <div className="text-sm text-gray-600">Completion Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {mentor.sessionStats?.responseTime || '2'}h
            </div>
            <div className="text-sm text-gray-600">Response Time</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAvailability = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Available Sessions</h3>
        <span className="text-sm text-gray-500">
          {availability.length} slots available
        </span>
      </div>
      
      {availability.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No available sessions in the next 7 days</p>
        </div>
      ) : (
        <div className="space-y-3">
          {availability.map((slot, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">
                  {new Date(slot.startTime).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(slot.startTime).toLocaleTimeString()} - {new Date(slot.endTime).toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => onBooking(mentor.mentorId, slot.id)}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
              >
                Book
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderReviews = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Reviews & Feedback</h3>
      
      {/* This would show actual reviews in a real implementation */}
      <div className="text-center py-8">
        <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No reviews available yet</p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex space-x-1 mb-6 border-b border-gray-200">
        {['overview', 'availability', 'reviews'].map((tab) => (
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
        {activeTab === 'availability' && renderAvailability()}
        {activeTab === 'reviews' && renderReviews()}
      </div>
    </div>
  );
};

// Feedback Modal Component
const FeedbackModal = ({ mentor, onClose, onSubmit }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(mentor.mentorId, { score: rating, comment });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Leave Feedback</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= rating
                          ? 'text-yellow-500 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Share your experience..."
              />
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
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Booking Modal Component
const BookingModal = ({ mentor, availability, onClose, onBooking }) => {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [booking, setBooking] = useState(false);

  const handleBooking = async () => {
    if (selectedSlot) {
      setBooking(true);
      try {
        await onBooking(mentor.mentorId, selectedSlot.id);
        onClose();
      } finally {
        setBooking(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Book Session</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Mentor</p>
              <p className="font-medium text-gray-900">{mentor.mentorName}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Select Time Slot</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availability.map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedSlot(slot)}
                    className={`w-full p-3 text-left border rounded-lg transition-colors ${
                      selectedSlot?.id === slot.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium text-gray-900">
                      {new Date(slot.startTime).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(slot.startTime).toLocaleTimeString()} - {new Date(slot.endTime).toLocaleTimeString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBooking}
                disabled={!selectedSlot || booking}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Book Session'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorRecommendationCards;
