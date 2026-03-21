import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  Clock,
  Users,
  Calendar,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  X,
  ChevronRight,
  TrendingUp,
  Award,
  Target,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Loader2
} from 'lucide-react';
import { recommendationService } from '../../services/recommendationAPI';
import socket from '../../services/socket';

const RecommendationCards = ({ 
  type = 'MENTOR', 
  limit = 10, 
  filters = {}, 
  showActions = true,
  showFeedback = true,
  className = '' 
}) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dismissed, setDismissed] = useState(new Set());
  const [clicked, setClicked] = useState(new Set());
  const [feedback, setFeedback] = useState(new Map());
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);

  useEffect(() => {
    fetchRecommendations();
  }, [type, limit, JSON.stringify(filters)]);

  useEffect(() => {
    if (!socket.connected) {
      const token = localStorage.getItem('accessToken');
      socket.connect(token);
    }

    socket.on('recommendation_updated', handleRecommendationUpdate);
    socket.on('recommendation_dismissed', handleRecommendationDismissed);
    socket.on('recommendation_clicked', handleRecommendationClicked);

    return () => {
      socket.off('recommendation_updated', handleRecommendationUpdate);
      socket.off('recommendation_dismissed', handleRecommendationDismissed);
      socket.off('recommendation_clicked', handleRecommendationClicked);
    };
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      let data;
      switch (type) {
        case 'MENTOR':
          data = await recommendationService.getMentorRecommendations(limit, filters);
          break;
        case 'SESSION':
          data = await recommendationService.getSessionRecommendations(limit, filters);
          break;
        case 'POST':
          data = await recommendationService.getPostRecommendations(limit, filters);
          break;
        case 'CONTENT':
          data = await recommendationService.getContentRecommendations(limit, filters);
          break;
        case 'TRENDING':
          data = await recommendationService.getTrendingRecommendations(limit, filters);
          break;
        default:
          data = await recommendationService.getHybridRecommendations(limit, filters);
          break;
      }

      setRecommendations(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendationUpdate = (data) => {
    if (data.type === type) {
      setRecommendations(prev => {
        const existingIndex = prev.findIndex(rec => rec.id === data.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], ...data };
          return updated;
        }
        return prev;
      });
    }
  };

  const handleRecommendationDismissed = (data) => {
    setDismissed(prev => new Set([...prev, data.id]));
    setRecommendations(prev => prev.filter(rec => rec.id !== data.id));
  };

  const handleRecommendationClicked = (data) => {
    setClicked(prev => new Set([...prev, data.id]));
  };

  const handleDismiss = async (recommendationId) => {
    try {
      await recommendationService.dismissRecommendation(recommendationId);
      setDismissed(prev => new Set([...prev, recommendationId]));
      setRecommendations(prev => prev.filter(rec => rec.id !== recommendationId));
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
    }
  };

  const handleClick = async (recommendation) => {
    try {
      await recommendationService.markRecommendationClicked(recommendation.id);
      setClicked(prev => new Set([...prev, recommendation.id]));
    } catch (error) {
      console.error('Error marking recommendation as clicked:', error);
    }
  };

  const handleFeedback = async (recommendation, feedbackType, rating = null) => {
    try {
      await recommendationService.addFeedback(recommendation.id, feedbackType, rating);
      setFeedback(prev => new Map([...prev, [recommendation.id, { type: feedbackType, rating }]]));
    } catch (error) {
      console.error('Error adding feedback:', error);
    }
  };

  const openFeedbackModal = (recommendation) => {
    setSelectedRecommendation(recommendation);
    setShowFeedbackModal(true);
  };

  const closeFeedbackModal = () => {
    setSelectedRecommendation(null);
    setShowFeedbackModal(false);
  };

  const getRecommendationIcon = (recommendationType) => {
    switch (recommendationType) {
      case 'MENTOR':
        return <Users className="w-5 h-5 text-blue-600" />;
      case 'SESSION':
        return <Calendar className="w-5 h-5 text-green-600" />;
      case 'POST':
        return <MessageCircle className="w-5 h-5 text-purple-600" />;
      case 'CONTENT':
        return <TrendingUp className="w-5 h-5 text-orange-600" />;
      default:
        return <Target className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRecommendationLink = (recommendation) => {
    switch (recommendation.type) {
      case 'MENTOR':
        return `/profile/${recommendation.id}`;
      case 'SESSION':
        return `/session/${recommendation.id}`;
      case 'POST':
        return `/post/${recommendation.id}`;
      case 'CONTENT':
        return `/content/${recommendation.id}`;
      default:
        return '#';
    }
  };

  const formatRecommendationScore = (score) => {
    return (score * 100).toFixed(0);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getAlgorithmBadge = (algorithm) => {
    const algorithmColors = {
      'COLLABORATIVE_FILTERING': 'bg-blue-100 text-blue-800',
      'CONTENT_BASED': 'bg-green-100 text-green-800',
      'SKILL_BASED': 'bg-purple-100 text-purple-800',
      'TRENDING_BASED': 'bg-orange-100 text-orange-800',
      'HYBRID_RECOMMENDATION': 'bg-indigo-100 text-indigo-800',
      'POPULARITY_BASED': 'bg-pink-100 text-pink-800'
    };

    return algorithmColors[algorithm] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
              </div>
              <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <X className="w-5 h-5 text-red-600" />
          <span className="text-red-800">Error loading recommendations: {error}</span>
        </div>
        <button
          onClick={fetchRecommendations}
          className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-8 text-center ${className}`}>
        <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recommendations Yet</h3>
        <p className="text-gray-600">
          {type === 'MENTOR' 
            ? 'Start following mentors and engaging with content to get personalized recommendations'
            : 'Engage more with the platform to get personalized recommendations'
          }
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {recommendations.map((recommendation) => (
        <div
          key={recommendation.id}
          className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow ${
            clicked.has(recommendation.id) ? 'ring-2 ring-blue-500' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              {/* Icon */}
              <div className="flex-shrink-0 mt-1">
                {getRecommendationIcon(recommendation.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <Link
                  to={getRecommendationLink(recommendation)}
                  onClick={() => handleClick(recommendation)}
                  className="block"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 hover:text-blue-600 transition-colors">
                    {recommendation.title || recommendation.name}
                  </h3>
                  
                  {recommendation.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {recommendation.description}
                    </p>
                  )}

                  {recommendation.bio && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {recommendation.bio}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {recommendation.skills && recommendation.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {recommendation.skills.slice(0, 3).map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                        {recommendation.skills.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                            +{recommendation.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {recommendation.author && (
                      <div className="flex items-center space-x-2">
                        <img
                          src={recommendation.author.profileImage || '/images/default-avatar.png'}
                          alt={recommendation.author.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="text-sm text-gray-600">{recommendation.author.name}</span>
                      </div>
                    )}

                    {recommendation.mentor && (
                      <div className="flex items-center space-x-2">
                        <img
                          src={recommendation.mentor.profileImage || '/images/default-avatar.png'}
                          alt={recommendation.mentor.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="text-sm text-gray-600">{recommendation.mentor.name}</span>
                      </div>
                    )}

                    {recommendation._count && (
                      <div className="flex items-center space-x-3 text-sm text-gray-500">
                        {recommendation._count.followers && (
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span>{formatNumber(recommendation._count.followers)}</span>
                          </div>
                        )}
                        {recommendation._count.likes && (
                          <div className="flex items-center space-x-1">
                            <Heart className="w-4 h-4" />
                            <span>{formatNumber(recommendation._count.likes)}</span>
                          </div>
                        )}
                        {recommendation._count.comments && (
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="w-4 h-4" />
                            <span>{formatNumber(recommendation._count.comments)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {recommendation.feedback && (
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-gray-600">
                          {recommendation.feedback.rating?.toFixed(1)}
                        </span>
                      </div>
                    )}

                    {recommendation.duration && (
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{recommendation.duration} min</span>
                      </div>
                    )}

                    {recommendation.price && (
                      <div className="flex items-center space-x-1">
                        <span className="text-sm font-semibold text-green-600">
                          ${recommendation.price}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Algorithm Badge */}
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getAlgorithmBadge(recommendation.algorithm)}`}>
                      {recommendation.algorithm.replace('_', ' ')}
                    </span>
                    {recommendation.recommendationScore && (
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-green-600">
                          {formatRecommendationScore(recommendation.recommendationScore)}%
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            </div>

            {/* Actions */}
            {showActions && (
              <div className="flex items-center space-x-2 ml-4">
                {showFeedback && (
                  <>
                    <button
                      onClick={() => handleFeedback(recommendation, 'LIKE')}
                      className={`p-1 rounded-full transition-colors ${
                        feedback.get(recommendation.id)?.type === 'LIKE'
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-400 hover:text-blue-600'
                      }`}
                      title="Like"
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleFeedback(recommendation, 'DISLIKE')}
                      className={`p-1 rounded-full transition-colors ${
                        feedback.get(recommendation.id)?.type === 'DISLIKE'
                          ? 'text-red-600 bg-red-50'
                          : 'text-gray-400 hover:text-red-600'
                      }`}
                      title="Dislike"
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleFeedback(recommendation, 'BOOKMARK')}
                      className={`p-1 rounded-full transition-colors ${
                        feedback.get(recommendation.id)?.type === 'BOOKMARK'
                          ? 'text-yellow-600 bg-yellow-50'
                          : 'text-gray-400 hover:text-yellow-600'
                      }`}
                      title="Bookmark"
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleFeedback(recommendation, 'SHARE')}
                      className={`p-1 rounded-full transition-colors ${
                        feedback.get(recommendation.id)?.type === 'SHARE'
                          ? 'text-green-600 bg-green-50'
                          : 'text-gray-400 hover:text-green-600'
                      }`}
                      title="Share"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDismiss(recommendation.id)}
                  className="p-1 rounded-full text-gray-400 hover:text-red-600 transition-colors"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Feedback Modal */}
      {showFeedbackModal && selectedRecommendation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Feedback for {selectedRecommendation.title || selectedRecommendation.name}
              </h3>
              <button
                onClick={closeFeedbackModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How would you rate this recommendation?
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => handleFeedback(selectedRecommendation, 'RATING', rating)}
                      className={`w-8 h-8 rounded-full border-2 transition-colors ${
                        feedback.get(selectedRecommendation.id)?.rating === rating
                          ? 'border-blue-500 bg-blue-50 text-blue-600'
                          : 'border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional feedback (optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Share your thoughts..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={closeFeedbackModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={closeFeedbackModal}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecommendationCards;
