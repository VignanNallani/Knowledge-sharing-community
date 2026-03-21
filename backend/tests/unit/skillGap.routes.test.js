const request = require('supertest');
const express = require('express');
const skillGapRecommendationRoutes = require('../../src/routes/skillGapRecommendation.routes');
const skillGapService = require('../../src/services/skillGap.service');
const contentRecommendationService = require('../../src/services/contentRecommendation.service');

jest.mock('../../src/services/skillGap.service');
jest.mock('../../src/services/contentRecommendation.service');
jest.mock('../../src/middleware/auth.middleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 1, role: 'USER' };
    next();
  }
}));
jest.mock('../../src/middleware/rateLimit.middleware', () => ({
  rateLimiter: () => (req, res, next) => next()
}));
jest.mock('../../src/middleware/validation.middleware', () => ({
  validateRequest: (req, res, next) => next()
}));

describe('Skill Gap Recommendation Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1', skillGapRecommendationRoutes);
    jest.clearAllMocks();
  });

  describe('POST /api/v1/skill-gaps/:userId/analyze', () => {
    it('should analyze skill gaps successfully', async () => {
      const userId = 1;
      const analysisData = {
        userId,
        gaps: [],
        insights: {},
        summary: { totalGaps: 0 },
        recommendations: []
      };

      skillGapService.analyzeUserSkillGaps.mockResolvedValue(analysisData);

      const response = await request(app)
        .post(`/api/v1/skill-gaps/${userId}/analyze`)
        .send({ includeHistorical: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(analysisData);
      expect(skillGapService.analyzeUserSkillGaps).toHaveBeenCalledWith(userId, { includeHistorical: true });
    });

    it('should handle unauthorized access', async () => {
      const userId = 2; // Different from authenticated user

      const response = await request(app)
        .post(`/api/v1/skill-gaps/${userId}/analyze`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Unauthorized');
    });

    it('should handle admin access', async () => {
      // Mock admin user
      jest.mock('../../src/middleware/auth.middleware', () => ({
        authenticateToken: (req, res, next) => {
          req.user = { id: 1, role: 'ADMIN' };
          next();
        }
      }));

      const userId = 2;
      const analysisData = { userId, gaps: [] };
      skillGapService.analyzeUserSkillGaps.mockResolvedValue(analysisData);

      const response = await request(app)
        .post(`/api/v1/skill-gaps/${userId}/analyze`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle validation errors', async () => {
      const userId = 1;

      const response = await request(app)
        .post(`/api/v1/skill-gaps/${userId}/analyze`)
        .send({ includeHistorical: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle service errors', async () => {
      const userId = 1;
      skillGapService.analyzeUserSkillGaps.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post(`/api/v1/skill-gaps/${userId}/analyze`)
        .send({});

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Failed to analyze skill gaps');
    });
  });

  describe('GET /api/v1/skill-gaps/:userId', () => {
    it('should get skill gaps successfully', async () => {
      const userId = 1;
      const gaps = [
        { id: 'gap-1', skillName: 'JavaScript', gapSeverity: 'HIGH' },
        { id: 'gap-2', skillName: 'React', gapSeverity: 'MEDIUM' }
      ];

      skillGapService.getUserSkillGaps.mockResolvedValue(gaps);

      const response = await request(app)
        .get(`/api/v1/skill-gaps/${userId}`)
        .query({ status: 'ACTIVE', limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(gaps);
      expect(response.body.count).toBe(2);
    });

    it('should handle filtering parameters', async () => {
      const userId = 1;
      const gaps = [{ id: 'gap-1', gapSeverity: 'CRITICAL' }];
      skillGapService.getUserSkillGaps.mockResolvedValue(gaps);

      const response = await request(app)
        .get(`/api/v1/skill-gaps/${userId}`)
        .query({ severity: 'CRITICAL', gapType: 'MISSING_SKILL' });

      expect(response.status).toBe(200);
      expect(skillGapService.getUserSkillGaps).toHaveBeenCalledWith(userId, {
        severity: 'CRITICAL',
        gapType: 'MISSING_SKILL'
      });
    });

    it('should handle pagination', async () => {
      const userId = 1;
      const gaps = Array.from({ length: 5 }, (_, i) => ({ id: `gap-${i}` }));
      skillGapService.getUserSkillGaps.mockResolvedValue(gaps);

      const response = await request(app)
        .get(`/api/v1/skill-gaps/${userId}`)
        .query({ limit: 5, offset: 10 });

      expect(response.status).toBe(200);
      expect(skillGapService.getUserSkillGaps).toHaveBeenCalledWith(userId, {
        limit: 5,
        offset: 10
      });
    });

    it('should handle unauthorized access', async () => {
      const userId = 2;

      const response = await request(app)
        .get(`/api/v1/skill-gaps/${userId}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/skill-gaps/:userId/:gapId/progress', () => {
    it('should update gap progress successfully', async () => {
      const userId = 1;
      const gapId = 'gap-1';
      const progressData = { progressValue: 0.7, status: 'ADDRESSING' };
      const updatedGap = { id: gapId, progressTracker: 0.7, status: 'ADDRESSING' };

      skillGapService.updateSkillGapProgress.mockResolvedValue(updatedGap);

      const response = await request(app)
        .put(`/api/v1/skill-gaps/${userId}/${gapId}/progress`)
        .send(progressData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedGap);
    });

    it('should validate progress value', async () => {
      const userId = 1;
      const gapId = 'gap-1';

      const response = await request(app)
        .put(`/api/v1/skill-gaps/${userId}/${gapId}/progress`)
        .send({ progressValue: 1.5 }); // Invalid value > 1

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle unauthorized access', async () => {
      const userId = 2;
      const gapId = 'gap-1';

      const response = await request(app)
        .put(`/api/v1/skill-gaps/${userId}/${gapId}/progress`)
        .send({ progressValue: 0.5 });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/skill-gaps/:userId/:gapId/close', () => {
    it('should close gap successfully', async () => {
      const userId = 1;
      const gapId = 'gap-1';
      const closureData = { reason: 'COMPLETED', finalLevel: 0.8 };
      const closedGap = { id: gapId, status: 'CLOSED', reason: 'COMPLETED' };

      skillGapService.closeSkillGap.mockResolvedValue(closedGap);

      const response = await request(app)
        .post(`/api/v1/skill-gaps/${userId}/${gapId}/close`)
        .send(closureData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(closedGap);
    });

    it('should validate closure reason', async () => {
      const userId = 1;
      const gapId = 'gap-1';

      const response = await request(app)
        .post(`/api/v1/skill-gaps/${userId}/${gapId}/close`)
        .send({ reason: 'INVALID_REASON' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle unauthorized access', async () => {
      const userId = 2;
      const gapId = 'gap-1';

      const response = await request(app)
        .post(`/api/v1/skill-gaps/${userId}/${gapId}/close`)
        .send({ reason: 'COMPLETED' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/skill-gaps/:userId/analytics', () => {
    it('should get analytics successfully', async () => {
      const userId = 1;
      const analytics = {
        totalGaps: 5,
        closureRate: 0.8,
        averageTimeToClose: 45,
        gapsBySeverity: { CRITICAL: 2, HIGH: 2, MEDIUM: 1 }
      };

      skillGapService.getSkillGapAnalytics.mockResolvedValue(analytics);

      const response = await request(app)
        .get(`/api/v1/skill-gaps/${userId}/analytics`)
        .query({ timeRange: '30d' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(analytics);
    });

    it('should validate time range', async () => {
      const userId = 1;

      const response = await request(app)
        .get(`/api/v1/skill-gaps/${userId}/analytics`)
        .query({ timeRange: 'invalid-range' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle unauthorized access', async () => {
      const userId = 2;

      const response = await request(app)
        .get(`/api/v1/skill-gaps/${userId}/analytics`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/recommendations/content/:userId/generate', () => {
    it('should generate recommendations successfully', async () => {
      const userId = 1;
      const options = { contentTypes: ['COURSE'], limit: 10 };
      const recommendations = {
        userId,
        recommendations: [
          { id: 'rec-1', contentType: 'COURSE', recommendationScore: 0.8 }
        ],
        metadata: { totalGenerated: 1 }
      };

      contentRecommendationService.generateContentRecommendations.mockResolvedValue(recommendations);

      const response = await request(app)
        .post(`/api/v1/recommendations/content/${userId}/generate`)
        .send(options);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(recommendations);
    });

    it('should handle unauthorized access', async () => {
      const userId = 2;

      const response = await request(app)
        .post(`/api/v1/recommendations/content/${userId}/generate`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/recommendations/content/:userId', () => {
    it('should get recommendations successfully', async () => {
      const userId = 1;
      const recommendations = [
        { id: 'rec-1', contentType: 'COURSE', status: 'ACTIVE' },
        { id: 'rec-2', contentType: 'TUTORIAL', status: 'ACTIVE' }
      ];

      contentRecommendationService.getUserRecommendations.mockResolvedValue(recommendations);

      const response = await request(app)
        .get(`/api/v1/recommendations/content/${userId}`)
        .query({ status: 'ACTIVE', limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(recommendations);
      expect(response.body.count).toBe(2);
    });

    it('should handle filtering parameters', async () => {
      const userId = 1;
      const recommendations = [{ id: 'rec-1', contentType: 'COURSE' }];
      contentRecommendationService.getUserRecommendations.mockResolvedValue(recommendations);

      const response = await request(app)
        .get(`/api/v1/recommendations/content/${userId}`)
        .query({ contentType: 'COURSE', algorithm: 'HYBRID' });

      expect(response.status).toBe(200);
      expect(contentRecommendationService.getUserRecommendations).toHaveBeenCalledWith(userId, {
        contentType: 'COURSE',
        algorithm: 'HYBRID'
      });
    });

    it('should handle unauthorized access', async () => {
      const userId = 2;

      const response = await request(app)
        .get(`/api/v1/recommendations/content/${userId}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/recommendations/content/:userId/:recommendationId/status', () => {
    it('should update recommendation status successfully', async () => {
      const userId = 1;
      const recommendationId = 'rec-1';
      const statusData = { status: 'COMPLETED', rating: 5, feedback: 'Great!' };
      const updatedRecommendation = { id: recommendationId, status: 'COMPLETED', rating: 5 };

      contentRecommendationService.updateRecommendationStatus.mockResolvedValue(updatedRecommendation);

      const response = await request(app)
        .put(`/api/v1/recommendations/content/${userId}/${recommendationId}/status`)
        .send(statusData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedRecommendation);
    });

    it('should validate rating', async () => {
      const userId = 1;
      const recommendationId = 'rec-1';

      const response = await request(app)
        .put(`/api/v1/recommendations/content/${userId}/${recommendationId}/status`)
        .send({ status: 'COMPLETED', rating: 6 }); // Invalid rating > 5

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle unauthorized access', async () => {
      const userId = 2;
      const recommendationId = 'rec-1';

      const response = await request(app)
        .put(`/api/v1/recommendations/content/${userId}/${recommendationId}/status`)
        .send({ status: 'COMPLETED' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/recommendations/content/:userId/analytics', () => {
    it('should get recommendation analytics successfully', async () => {
      const userId = 1;
      const analytics = {
        totalRecommendations: 10,
        engagementRate: 0.8,
        completionRate: 0.6,
        averageRating: 4.2
      };

      contentRecommendationService.getRecommendationAnalytics.mockResolvedValue(analytics);

      const response = await request(app)
        .get(`/api/v1/recommendations/content/${userId}/analytics`)
        .query({ timeRange: '30d' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(analytics);
    });

    it('should handle unauthorized access', async () => {
      const userId = 2;

      const response = await request(app)
        .get(`/api/v1/recommendations/content/${userId}/analytics`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Health Check Routes', () => {
    describe('GET /api/v1/skill-gaps/health', () => {
      it('should return skill gap service health', async () => {
        const health = { status: 'healthy', timestamp: new Date() };
        skillGapService.getHealthStatus.mockResolvedValue(health);

        const response = await request(app)
          .get('/api/v1/skill-gaps/health');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(health);
      });

      it('should handle service error', async () => {
        skillGapService.getHealthStatus.mockRejectedValue(new Error('Service error'));

        const response = await request(app)
          .get('/api/v1/skill-gaps/health');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/v1/recommendations/content/health', () => {
      it('should return content recommendation service health', async () => {
        const health = { status: 'healthy', timestamp: new Date() };
        contentRecommendationService.getHealthStatus.mockResolvedValue(health);

        const response = await request(app)
          .get('/api/v1/recommendations/content/health');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(health);
      });

      it('should handle service error', async () => {
        contentRecommendationService.getHealthStatus.mockRejectedValue(new Error('Service error'));

        const response = await request(app)
          .get('/api/v1/recommendations/content/health');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const userId = 1;

      const response = await request(app)
        .post(`/api/v1/skill-gaps/${userId}/analyze`)
        .send('invalid json')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle missing request body', async () => {
      const userId = 1;

      const response = await request(app)
        .post(`/api/v1/skill-gaps/${userId}/analyze`)
        .send();

      expect(response.status).toBe(200); // Should work with empty body
    });

    it('should handle service timeouts', async () => {
      const userId = 1;
      skillGapService.analyzeUserSkillGaps.mockImplementation(() => {
        return new Promise((resolve) => setTimeout(resolve, 11000)); // 11 seconds timeout
      });

      const response = await request(app)
        .post(`/api/v1/skill-gaps/${userId}/analyze`)
        .send({});

      expect(response.status).toBe(408); // Request timeout
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      const userId = 1;
      skillGapService.analyzeUserSkillGaps.mockResolvedValue({ gaps: [] });

      // Make multiple requests rapidly
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .post(`/api/v1/skill-gaps/${userId}/analyze`)
          .send({})
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    it('should validate user ID format', async () => {
      const response = await request(app)
        .post('/api/v1/skill-gaps/invalid-user-id/analyze')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate gap ID format', async () => {
      const userId = 1;
      const response = await request(app)
        .put(`/api/v1/skill-gaps/${userId}/invalid-gap-id/progress`)
        .send({ progressValue: 0.5 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate recommendation ID format', async () => {
      const userId = 1;
      const response = await request(app)
        .put(`/api/v1/recommendations/content/${userId}/invalid-rec-id/status`)
        .send({ status: 'COMPLETED' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
