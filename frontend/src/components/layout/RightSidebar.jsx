import { sessionService } from "../../services/sessionService";
import { useState, useEffect } from "react";
import { apiService } from "../../services/api";

export default function RightSidebar({ openBooking }) {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const response = await apiService.getMentors();
        // Transform API response to match our component structure
        const transformedMentors = (response.mentors || response.data || []).map(mentor => ({
          id: mentor.id,
          name: mentor.name || mentor.fullName,
          role: mentor.role || mentor.title,
          company: mentor.company || mentor.organization,
          sessions: mentor.sessions || mentor.sessionCount || 0,
          rating: mentor.rating || 4.5,
          expertise: mentor.expertise || mentor.skills || [],
          hourlyRate: mentor.hourlyRate || mentor.rate || 100,
          available: mentor.available !== false,
          avatar: mentor.name ? mentor.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'M'
        }));
        setMentors(transformedMentors);
      } catch (error) {
        console.error('Failed to fetch mentors:', error);
        setMentors([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchUpcomingSessions = async () => {
      try {
        const response = await sessionService.getUpcomingSessions();
        const sessions = response.data?.relationships || [];
        const upcoming = sessions
          .filter(rel => rel.status === 'ACTIVE')
          .flatMap(rel => rel.sessions || [])
          .filter(session => session.status === 'SCHEDULED' && new Date(session.scheduledStart) > new Date())
          .sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart))
          .slice(0, 2);
        setUpcomingSessions(upcoming);
      } catch (error) {
        console.error('Failed to fetch upcoming sessions:', error);
        setUpcomingSessions([]);
      } finally {
        setSessionsLoading(false);
      }
    };

    fetchMentors();
    fetchUpcomingSessions();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Mentors */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v-1m0 0V6a6 6 0 00-12 0v6m0 0v1m0 0h9" />
          </svg>
          Top Mentors
        </h3>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {mentors.map((mentor) => (
              <div key={mentor.id} className="border-b border-slate-100 pb-4 last:border-0">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      mentor.available ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-slate-400 to-slate-600'
                    }`}>
                      {mentor.avatar}
                    </div>
                    {mentor.available && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-semibold text-slate-900 text-sm">{mentor.name}</div>
                      {mentor.available && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Available</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 mb-1">{mentor.role}</div>
                    <div className="text-xs text-slate-500 mb-2">{mentor.company}</div>
                    
                    {/* Expertise Tags */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {mentor.expertise.slice(0, 2).map((skill) => (
                        <span key={skill} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {skill}
                        </span>
                      ))}
                      {mentor.expertise.length > 2 && (
                        <span className="text-xs text-slate-500">+{mentor.expertise.length - 2}</span>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-3">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className={`w-3 h-3 ${i < Math.floor(mentor.rating) ? 'text-yellow-400' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 1.071.921.192 1.603.921.921.192 1.603-.921l1.07-1.071a1 1 0 00-1.414-1.414l-1.071 1.071a1 1 0 00-1.414 0z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-xs text-slate-600 ml-1">{mentor.rating}</span>
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-sm font-bold text-slate-900">${mentor.hourlyRate}</div>
                    <div className="text-xs text-slate-500">/hour</div>
                    <div className="text-xs text-slate-400 mt-1">{mentor.sessions} sessions</div>
                  </div>
                </div>
                
                <button
                  onClick={() => openBooking(mentor)}
                  disabled={!mentor.available}
                  className={`w-full mt-3 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    mentor.available
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 shadow-sm"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {mentor.available ? 'Book Session' : 'Unavailable'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Your Stats */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4">
        <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wide mb-4 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Your Stats
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-blue-700">Posts</span>
            <span className="text-sm font-bold text-blue-900">12</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-blue-700">Followers</span>
            <span className="text-sm font-bold text-blue-900">84</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-blue-700">Mentorships</span>
            <span className="text-sm font-bold text-blue-900">{upcomingSessions.length}</span>
          </div>
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Upcoming Sessions
        </h3>
        {sessionsLoading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : upcomingSessions.length > 0 ? (
          <div className="space-y-3">
            {upcomingSessions.map((session) => (
              <div key={session.id} className="border-l-2 border-blue-500 pl-3 py-2">
                <div className="text-sm">
                  <div className="font-medium text-slate-900">
                    {new Date(session.scheduledStart).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="text-slate-600">
                    {new Date(session.scheduledStart).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="text-slate-500 text-xs mt-1">Session</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500">No upcoming sessions</p>
            <p className="text-xs text-slate-400 mt-1">Book a mentor to get started</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-4">
        <h3 className="text-sm font-semibold text-purple-900 uppercase tracking-wide mb-4 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Quick Actions
        </h3>
        <div className="space-y-2">
          <button className="w-full text-left px-3 py-2 text-sm text-purple-700 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Post
          </button>
          <button className="w-full text-left px-3 py-2 text-sm text-purple-700 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Find Mentor
          </button>
        </div>
      </div>
    </div>
  );
}
