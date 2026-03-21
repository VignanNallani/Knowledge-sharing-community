import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Star, 
  Calendar, 
  MessageCircle, 
  User,
  Clock,
  Award,
  TrendingUp,
  BookOpen,
  Target,
  CheckCircle
} from 'lucide-react';
import { getRecommendedMentors } from '../../services/searchAPI';

const RecommendedMentors = ({ limit = 10, showSkillMatch = true }) => {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('recommendation'); // 'recommendation', 'rating', 'experience'

  useEffect(() => {
    fetchRecommendedMentors();
  }, [sortBy]);

  const fetchRecommendedMentors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getRecommendedMentors(limit);
      
      // Sort mentors based on selected criteria
      let sortedMentors = [...(data.mentors || [])];
      
      switch (sortBy) {
        case 'rating':
          sortedMentors.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
          break;
        case 'experience':
          sortedMentors.sort((a, b) => (b.totalSessions || 0) - (a.totalSessions || 0));
          break;
        case 'recommendation':
        default:
          sortedMentors.sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0));
          break;
      }
      
      setMentors(sortedMentors);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load recommended mentors');
    } finally {
      setLoading(false);
    }
  };

  const getSkillMatchColor = (score) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-blue-600 bg-blue-100';
    if (score >= 0.4) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getAvailabilityStatus = (mentor) => {
    if (mentor.availabilitySlots > 0) {
      return {
        text: 'Available',
        color: 'text-green-600 bg-green-100',
        icon: <CheckCircle className="w-3 h-3" />
      };
    }
    return {
      text: 'Busy',
      color: 'text-orange-600 bg-orange-100',
      icon: <Clock className="w-3 h-3" />
    };
  };

  const getRecommendationBadge = (score) => {
    if (score >= 0.8) {
      return {
        text: 'Top Match',
        color: 'bg-purple-600 text-white',
        icon: <Award className="w-3 h-3" />
      };
    }
    if (score >= 0.6) {
      return {
        text: 'Great Match',
        color: 'bg-blue-600 text-white',
        icon: <Star className="w-3 h-3" />
      };
    }
    if (score >= 0.4) {
      return {
        text: 'Good Match',
        color: 'bg-green-600 text-white',
        icon: <TrendingUp className="w-3 h-3" />
      };
    }
    return {
      text: 'Potential Match',
      color: 'bg-gray-600 text-white',
      icon: <Users className="w-3 h-3" />
    };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Recommended Mentors</h2>
          <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="animate-pulse">
                <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2 mx-auto w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded mb-2 mx-auto w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4 mx-auto w-5/6"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
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
        <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Recommendations</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchRecommendedMentors}
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
          <Users className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Recommended Mentors</h2>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="recommendation">Best Match</option>
            <option value="rating">Highest Rated</option>
            <option value="experience">Most Experienced</option>
          </select>
        </div>
      </div>

      {/* Mentors Grid */}
      {mentors.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Recommendations Available</h3>
          <p className="text-gray-600">Update your skills and interests to get personalized recommendations</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mentors.map((mentor) => {
            const availability = getAvailabilityStatus(mentor);
            const recommendationBadge = getRecommendationBadge(mentor.recommendationScore);
            
            return (
              <div key={mentor.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="relative p-6">
                  {/* Recommendation Badge */}
                  <div className="absolute top-4 right-4">
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${recommendationBadge.color}`}>
                      {recommendationBadge.icon}
                      <span>{recommendationBadge.text}</span>
                    </div>
                  </div>
                  
                  {/* Profile */}
                  <div className="text-center">
                    <div className="relative inline-block">
                      <img 
                        src={mentor.profileImage || `https://ui-avatars.com/api/?name=${mentor.name}&background=random`} 
                        alt={mentor.name}
                        className="w-20 h-20 rounded-full mx-auto mb-4"
                      />
                      {availability.text === 'Available' && (
                        <div className="absolute bottom-4 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    
                    <Link to={`/mentor/${mentor.id}`}>
                      <h3 className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors mb-1">
                        {mentor.name}
                      </h3>
                    </Link>
                    
                    {/* Rating */}
                    <div className="flex items-center justify-center space-x-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(mentor.averageRating || 0)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="text-sm text-gray-500 ml-1">
                        ({mentor.averageRating || 0})
                      </span>
                    </div>
                    
                    {/* Availability Status */}
                    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${availability.color}`}>
                      {availability.icon}
                      <span>{availability.text}</span>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {mentor.bio && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-gray-600 line-clamp-2">{mentor.bio}</p>
                  </div>
                )}

                {/* Skills */}
                {mentor.skills && (
                  <div className="px-6 pb-4">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {mentor.skills.split(',').slice(0, 3).map((skill, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                        >
                          {skill.trim()}
                        </span>
                      ))}
                      {mentor.skills.split(',').length > 3 && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                          +{mentor.skills.split(',').length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="px-6 pb-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-gray-900">
                        {mentor.totalSessions || 0}
                      </div>
                      <div className="text-xs text-gray-500">Sessions</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-900">
                        {mentor.totalFollowers || 0}
                      </div>
                      <div className="text-xs text-gray-500">Followers</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-900">
                        {mentor.availabilitySlots || 0}
                      </div>
                      <div className="text-xs text-gray-500">Slots</div>
                    </div>
                  </div>
                </div>

                {/* Skill Match Score */}
                {showSkillMatch && mentor.skillMatch !== undefined && (
                  <div className="px-6 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Skill Match</span>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSkillMatchColor(mentor.skillMatch)}`}>
                        {Math.round(mentor.skillMatch * 100)}%
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="px-6 pb-6">
                  <div className="flex space-x-2">
                    <button className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                      Book Session
                    </button>
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View All Mentors */}
      {mentors.length > 0 && (
        <div className="text-center mt-8">
          <Link
            to="/mentors"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>View All Mentors</span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default RecommendedMentors;
