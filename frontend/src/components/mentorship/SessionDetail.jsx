import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  getSessionDetail, 
  getSessionFeedback, 
  cancelSession, 
  completeSession,
  updateSession 
} from "./mentorshipAPI";
import { socket, connectSocket, joinSessionRoom, leaveSessionRoom } from "./socket";
import FeedbackForm from "./FeedbackForm";
import { format } from "date-fns";
import { 
  Calendar, 
  Clock, 
  Users, 
  Video, 
  Edit, 
  X, 
  CheckCircle, 
  AlertCircle,
  Star,
  MessageCircle
} from "lucide-react";

const SessionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);

    const fetchSession = async () => {
      try {
        setLoading(true);
        const sessionData = await getSessionDetail(id);
        setSession(sessionData);
        setEditForm({
          title: sessionData.title,
          description: sessionData.description || '',
          scheduledAt: sessionData.scheduledAt,
          duration: sessionData.duration
        });

        // Fetch feedback if session is completed
        if (sessionData.status === 'COMPLETED') {
          try {
            const feedbackData = await getSessionFeedback(id);
            setFeedback(feedbackData);
          } catch (err) {
            // No feedback yet
          }
        }

        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load session details");
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    // Setup socket for real-time updates
    connectSocket();
    joinSessionRoom(id);

    socket.on("session_updated", (updatedSession) => {
      if (updatedSession.id === id) {
        setSession(updatedSession);
      }
    });

    socket.on("feedback_submitted", (feedbackData) => {
      if (feedbackData.sessionId === id) {
        setFeedback(feedbackData);
      }
    });

    return () => {
      leaveSessionRoom(id);
      socket.off("session_updated");
      socket.off("feedback_submitted");
    };
  }, [id]);

  const handleCancelSession = async () => {
    const reason = prompt("Please provide a reason for cancellation:");
    if (!reason) return;

    try {
      await cancelSession(id, reason);
      // Socket will handle the update
    } catch (err) {
      setError(err.response?.data?.error || "Failed to cancel session");
    }
  };

  const handleCompleteSession = async () => {
    try {
      await completeSession(id);
      // Socket will handle the update
    } catch (err) {
      setError(err.response?.data?.error || "Failed to complete session");
    }
  };

  const handleUpdateSession = async () => {
    try {
      await updateSession(id, editForm);
      setIsEditing(false);
      // Socket will handle the update
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update session");
    }
  };

  const handleJoinMeeting = () => {
    if (session.meetUrl) {
      window.open(session.meetUrl, '_blank');
    }
  };

  const canEdit = user?.role === 'MENTOR' || user?.role === 'ADMIN';
  const isMentor = user?.id === session?.mentorId;
  const isMentee = user?.id === session?.menteeId;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center text-gray-500">
          Session not found
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
        >
          ← Back to Sessions
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="text-3xl font-bold border-b-2 border-blue-500 outline-none"
                />
              ) : (
                session.title
              )}
            </h1>
            <div className="flex items-center space-x-4 text-gray-600">
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{session.mentor?.name || 'Mentor'} × {session.mentee?.name || 'Mentee'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(session.scheduledAt), 'MMMM dd, yyyy')}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{format(new Date(session.scheduledAt), 'h:mm a')} ({session.duration} min)</span>
              </div>
            </div>
          </div>
          
          {canEdit && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <Edit className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Session Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Details</h2>
            
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={editForm.scheduledAt ? new Date(editForm.scheduledAt).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setEditForm({ ...editForm, scheduledAt: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={editForm.duration}
                      onChange={(e) => setEditForm({ ...editForm, duration: parseInt(e.target.value) })}
                      min="15"
                      max="180"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={handleUpdateSession}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {session.description && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                    <p className="text-gray-600">{session.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Status</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      session.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                      session.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                      session.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {session.status}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Meeting Link</h3>
                    {session.meetUrl ? (
                      <button
                        onClick={handleJoinMeeting}
                        className="text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <Video className="w-4 h-4 mr-1" />
                        Join Meeting
                      </button>
                    ) : (
                      <span className="text-gray-500">Not available</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Participants */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Participants</h2>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Mentor</p>
                  <p className="text-sm text-gray-600">{session.mentor?.name || 'Unknown Mentor'}</p>
                  <p className="text-xs text-gray-500">{session.mentor?.email}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Mentee</p>
                  <p className="text-sm text-gray-600">{session.mentee?.name || 'Unknown Mentee'}</p>
                  <p className="text-xs text-gray-500">{session.mentee?.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Section */}
          {session.status === 'COMPLETED' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Feedback</h2>
              
              {feedback ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < feedback.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">({feedback.rating}/5)</span>
                  </div>
                  
                  {feedback.comment && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Comment</h3>
                      <p className="text-gray-600">{feedback.comment}</p>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    Submitted on {format(new Date(feedback.createdAt), 'MMMM dd, yyyy at h:mm a')}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-4">No feedback submitted yet.</p>
                  {isMentee && <FeedbackForm sessionId={id} onFeedbackSubmitted={setFeedback} />}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            
            <div className="space-y-3">
              {session.status === 'SCHEDULED' && session.meetUrl && (
                <button
                  onClick={handleJoinMeeting}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Join Meeting
                </button>
              )}
              
              {isMentor && session.status === 'SCHEDULED' && (
                <>
                  <button
                    onClick={handleCompleteSession}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete Session
                  </button>
                  
                  <button
                    onClick={handleCancelSession}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel Session
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Session Info Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Info</h2>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Session ID</p>
                <p className="text-sm font-mono text-gray-900">{session.id}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="text-sm text-gray-900">
                  {format(new Date(session.createdAt), 'MMMM dd, yyyy')}
                </p>
              </div>
              
              {session.updatedAt && session.updatedAt !== session.createdAt && (
                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="text-sm text-gray-900">
                    {format(new Date(session.updatedAt), 'MMMM dd, yyyy')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionDetail;
