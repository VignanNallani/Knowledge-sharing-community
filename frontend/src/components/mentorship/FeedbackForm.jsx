import React, { useState, useEffect } from "react";
import { submitFeedback, updateFeedback, deleteFeedback } from "./mentorshipAPI";
import { Star, MessageSquare, AlertCircle, Check, Trash2, Edit } from "lucide-react";

const FeedbackForm = ({ sessionId, existingFeedback, onFeedbackSubmitted, onFeedbackUpdated, onFeedbackDeleted }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");

  useEffect(() => {
    if (existingFeedback) {
      setRating(existingFeedback.rating);
      setComment(existingFeedback.comment || "");
      setEditRating(existingFeedback.rating);
      setEditComment(existingFeedback.comment || "");
    }
  }, [existingFeedback]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const feedbackData = {
        sessionId,
        rating,
        comment: comment.trim()
      };

      const feedback = await submitFeedback(feedbackData);
      setSuccess("Feedback submitted successfully!");
      
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(feedback);
      }
      
      // Clear form
      setRating(0);
      setComment("");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    if (editRating === 0) {
      setError("Please select a rating");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const feedbackData = {
        rating: editRating,
        comment: editComment.trim()
      };

      const updatedFeedback = await updateFeedback(existingFeedback.id, feedbackData);
      setSuccess("Feedback updated successfully!");
      
      if (onFeedbackUpdated) {
        onFeedbackUpdated(updatedFeedback);
      }
      
      // Update local state
      setRating(editRating);
      setComment(editComment);
      setIsEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this feedback?")) return;

    try {
      setSubmitting(true);
      setError(null);
      
      await deleteFeedback(existingFeedback.id);
      setSuccess("Feedback deleted successfully!");
      
      if (onFeedbackDeleted) {
        onFeedbackDeleted();
      }
      
      // Clear form
      setRating(0);
      setComment("");
      setEditRating(0);
      setEditComment("");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange, disabled = false }) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(star)}
            onMouseEnter={() => !disabled && setHoveredStar(star)}
            onMouseLeave={() => !disabled && setHoveredStar(0)}
            className="transition-colors"
          >
            <Star
              className={`w-6 h-6 ${
                disabled ? 'cursor-not-allowed' : 'cursor-pointer'
              } ${
                star <= (disabled ? value : hoveredStar || value)
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300 hover:text-yellow-200'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (existingFeedback && !isEditing) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Your Feedback</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
              title="Edit feedback"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={submitting}
              className="p-2 text-gray-600 hover:text-red-600 transition-colors"
              title="Delete feedback"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <StarRating value={rating} onChange={() => {}} disabled={true} />
            <p className="text-sm text-gray-600 mt-1">Rating: {rating}/5</p>
          </div>
          
          {comment && (
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                <h4 className="text-sm font-medium text-gray-700">Comment</h4>
              </div>
              <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{comment}</p>
            </div>
          )}
          
          <div className="text-xs text-gray-500">
            Submitted on {new Date(existingFeedback.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {existingFeedback ? 'Edit Your Feedback' : 'Submit Feedback'}
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <Check className="w-4 h-4 text-green-500 mr-2" />
            <span className="text-green-700 text-sm">{success}</span>
          </div>
        </div>
      )}

      <form onSubmit={existingFeedback ? handleUpdate : handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating *
          </label>
          <StarRating 
            value={existingFeedback ? editRating : rating} 
            onChange={existingFeedback ? setEditRating : setRating}
          />
          <p className="text-sm text-gray-600 mt-1">
            {existingFeedback ? editRating || rating : rating} out of 5 stars
          </p>
        </div>

        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
            Comment
          </label>
          <textarea
            id="comment"
            value={existingFeedback ? editComment : comment}
            onChange={(e) => existingFeedback ? setEditComment(e.target.value) : setComment(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Share your experience with this mentorship session..."
          />
          <p className="text-xs text-gray-500 mt-1">
            {existingFeedback ? editComment.length || comment.length : comment.length}/500 characters
          </p>
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-600">
            <span className="text-red-500">*</span> Required field
          </div>
          
          <div className="flex space-x-3">
            {existingFeedback && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditRating(existingFeedback.rating);
                  setEditComment(existingFeedback.comment || "");
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            )}
            
            <button
              type="submit"
              disabled={submitting || (existingFeedback ? editRating === 0 : rating === 0)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {existingFeedback ? 'Updating...' : 'Submitting...'}
                </span>
              ) : (
                existingFeedback ? 'Update Feedback' : 'Submit Feedback'
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Feedback Guidelines */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Feedback Guidelines</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Be specific and constructive in your feedback</li>
          <li>• Focus on the mentorship experience and interaction</li>
          <li>• Mention what was most helpful or could be improved</li>
          <li>• Your feedback helps mentors improve their services</li>
        </ul>
      </div>
    </div>
  );
};

export default FeedbackForm;
