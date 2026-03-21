import axios from "axios";

const BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";

// Create axios instance with auth
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      try {
        const refreshResponse = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {}, {
          withCredentials: true
        });
        
        const { accessToken } = refreshResponse.data.data;
        localStorage.setItem('accessToken', accessToken);
        
        // Retry original request
        error.config.headers.Authorization = `Bearer ${accessToken}`;
        return api.request(error.config);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Mentorship Sessions API
export const getMentorSessions = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const res = await api.get(`/api/v1/mentorship/sessions?${params}`);
  return res.data.data;
};

export const getSessionDetail = async (sessionId) => {
  const res = await api.get(`/api/v1/mentorship/sessions/${sessionId}`);
  return res.data.data;
};

export const createSession = async (sessionData) => {
  const res = await api.post('/api/v1/mentorship/sessions', sessionData);
  return res.data.data;
};

export const updateSession = async (sessionId, sessionData) => {
  const res = await api.put(`/api/v1/mentorship/sessions/${sessionId}`, sessionData);
  return res.data.data;
};

export const cancelSession = async (sessionId, reason) => {
  const res = await api.post(`/api/v1/mentorship/sessions/${sessionId}/cancel`, { reason });
  return res.data.data;
};

export const completeSession = async (sessionId) => {
  const res = await api.post(`/api/v1/mentorship/sessions/${sessionId}/complete`);
  return res.data.data;
};

export const getSessionStats = async () => {
  const res = await api.get('/api/v1/mentorship/sessions/stats');
  return res.data.data;
};

// Feedback API
export const submitFeedback = async (feedbackData) => {
  const res = await api.post('/api/v1/feedback', feedbackData);
  return res.data.data;
};

export const getSessionFeedback = async (sessionId) => {
  const res = await api.get(`/api/v1/feedback/session/${sessionId}`);
  return res.data.data;
};

export const getMentorFeedback = async (mentorId, filters = {}) => {
  const params = new URLSearchParams(filters);
  const res = await api.get(`/api/v1/feedback/mentor/${mentorId}?${params}`);
  return res.data.data;
};

export const updateFeedback = async (feedbackId, feedbackData) => {
  const res = await api.put(`/api/v1/feedback/${feedbackId}`, feedbackData);
  return res.data.data;
};

export const deleteFeedback = async (feedbackId) => {
  const res = await api.delete(`/api/v1/feedback/${feedbackId}`);
  return res.data.data;
};

// Availability API
export const getMentorAvailability = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const res = await api.get(`/api/v1/availability?${params}`);
  return res.data.data;
};

export const createAvailability = async (availabilityData) => {
  const res = await api.post('/api/v1/availability', availabilityData);
  return res.data.data;
};

export const updateAvailability = async (availabilityId, availabilityData) => {
  const res = await api.put(`/api/v1/availability/${availabilityId}`, availabilityData);
  return res.data.data;
};

export const deleteAvailability = async (availabilityId) => {
  const res = await api.delete(`/api/v1/availability/${availabilityId}`);
  return res.data.data;
};

export const getAvailableTimeSlots = async (mentorId, startDate, endDate, duration = 60) => {
  const params = new URLSearchParams({ startDate, endDate, duration });
  const res = await api.get(`/api/v1/availability/${mentorId}/slots?${params}`);
  return res.data.data;
};

export const bulkCreateAvailability = async (availabilityList) => {
  const res = await api.post('/api/v1/availability/bulk', { availabilityList });
  return res.data.data;
};

export const getAvailabilitySummary = async () => {
  const res = await api.get('/api/v1/availability/summary');
  return res.data.data;
};

// Booking API
export const createBooking = async (slotId, menteeId) => {
  const res = await api.post('/api/v1/mentorship/sessions', { 
    slotId, 
    menteeId,
    title: 'Mentorship Session',
    description: 'Booked through availability calendar'
  });
  return res.data.data;
};

// Reminders API
export const getUserReminders = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const res = await api.get(`/api/v1/reminders?${params}`);
  return res.data.data;
};
