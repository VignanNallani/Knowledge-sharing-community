import React, { useEffect, useState, useCallback } from "react";
import { getMentorSessions, getSessionStats, cancelSession, completeSession } from "./mentorshipAPI";
import { socket, connectSocket, joinMentorRoom, leaveMentorRoom } from "./socket";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Calendar, Clock, Users, Star, AlertCircle, CheckCircle, XCircle } from "lucide-react";

const MentorDashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get user from localStorage or context
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);

    const fetchData = async () => {
      try {
        setLoading(true);
        const [sessionsData, statsData] = await Promise.all([
          getMentorSessions({ status: filter !== "all" ? filter : undefined }),
          getSessionStats()
        ]);
        
        setSessions(sessionsData);
        setStats(statsData);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Setup socket connection
    connectSocket();
    
    if (userData.id) {
      joinMentorRoom(userData.id);
      
      // Listen for real-time updates
      socket.on("session_updated", (updatedSession) => {
        setSessions(prev => 
          prev.map(s => s.id === updatedSession.id ? updatedSession : s)
        );
      });

      socket.on("session_created", (newSession) => {
        setSessions(prev => [newSession, ...prev]);
      });

      socket.on("session_cancelled", (cancelledSession) => {
        setSessions(prev => 
          prev.map(s => s.id === cancelledSession.id ? cancelledSession : s)
        );
      });
    }

    return () => {
      if (userData.id) {
        leaveMentorRoom(userData.id);
        socket.off("session_updated");
        socket.off("session_created");
        socket.off("session_cancelled");
      }
    };
  }, [filter]);

  const handleCancelSession = async (sessionId) => {
    if (!window.confirm("Are you sure you want to cancel this session?")) return;
    
    try {
      await cancelSession(sessionId, "Cancelled by mentor");
      // Socket will handle the update
    } catch (err) {
      setError(err.response?.data?.error || "Failed to cancel session");
    }
  };

  const handleCompleteSession = async (sessionId) => {
    try {
      await completeSession(sessionId);
      // Socket will handle the update
    } catch (err) {
      setError(err.response?.data?.error || "Failed to complete session");
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SCHEDULED':
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'IN_PROGRESS':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredSessions = sessions.filter(session => {
    if (filter === "all") return true;
    return session.status === filter;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="mentor-dashboard max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mentor Dashboard</h1>
        <p className="text-gray-600">Manage your mentorship sessions and track your impact</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedSessions}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completionRate.toFixed(1)}%</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 text-sm font-bold">%</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageRating.toFixed(1)}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['all', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  filter === status
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Sessions List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Sessions</h2>
        </div>
        
        {filteredSessions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No sessions found
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredSessions.map((session) => (
              <div key={session.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(session.status)}
                      <Link 
                        to={`/session/${session.id}`}
                        className="text-lg font-medium text-blue-600 hover:text-blue-800"
                      >
                        {session.title}
                      </Link>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(session.status)}`}>
                        {session.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{session.mentee?.name || 'Unknown Mentee'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(session.scheduledAt), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{format(new Date(session.scheduledAt), 'h:mm a')} - {session.duration} min</span>
                      </div>
                    </div>
                    
                    {session.description && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                        {session.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {session.status === 'SCHEDULED' && (
                      <>
                        <button
                          onClick={() => handleCompleteSession(session.id)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => handleCancelSession(session.id)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    
                    {session.meetUrl && session.status === 'SCHEDULED' && (
                      <button
                        onClick={() => window.open(session.meetUrl, '_blank')}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        Join Meeting
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorDashboard;
