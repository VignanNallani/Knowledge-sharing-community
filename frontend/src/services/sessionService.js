import { apiService } from "./api";

// Session Service - Backend Only
class SessionService {
  // Get all sessions for current user
  async getSessions() {
    return await apiService.client.get('/mentorship/relationships');
  }

  // Create new session
  async createSession(relationshipId, sessionData) {
    return await apiService.client.post(`/mentorship/relationships/${relationshipId}/sessions`, sessionData);
  }

  // Update session status
  async updateSessionStatus(sessionId, status) {
    return await apiService.client.patch(`/mentorship/sessions/${sessionId}`, { status });
  }

  // Get upcoming sessions for user
  async getUpcomingSessions(userId) {
    return await apiService.client.get(`/mentorship/relationships`);
  }

  // Cancel session
  async cancelSession(sessionId) {
    return await apiService.client.post(`/mentorship/sessions/${sessionId}/cancel`);
  }

  // Complete session
  async completeSession(sessionId) {
    return await apiService.client.post(`/mentorship/sessions/${sessionId}/end`);
  }
}

// Export singleton instance
export const sessionService = new SessionService();
export default sessionService;
