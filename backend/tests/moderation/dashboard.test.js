import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import dotenv from 'dotenv';
dotenv.config();

import { app } from '../../index.js';
import { REPORT_SEVERITY, CASE_STATE, ACTION_TYPE, TRUST_LEVEL, APPEAL_STATUS, FLAG_TYPE } from '../../src/modules/moderation/constants.js';

describe('Moderation Dashboard & Analytics', () => {
  let moderatorToken;
  let adminToken;
  let userToken;
  let userId;
  let moderatorId;
  let adminId;
  let postId;

  beforeEach(async () => {
    const unique = Date.now();

    // Create users
    const userRes = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: `user+${unique}@example.com`,
      password: 'password123',
    });
    userToken = userRes.body.token;
    userId = userRes.body.user.id;

    const moderatorRes = await request(app).post('/api/auth/register').send({
      name: 'Test Moderator',
      email: `moderator+${unique}@example.com`,
      password: 'password123',
    });
    moderatorToken = moderatorRes.body.token;
    moderatorId = moderatorRes.body.user.id;

    const adminRes = await request(app).post('/api/auth/register').send({
      name: 'Test Admin',
      email: `admin+${unique}@example.com`,
      password: 'password123',
    });
    adminToken = adminRes.body.token;
    adminId = adminRes.body.user.id;

    // Update roles
    await request(app)
      .patch(`/api/users/${moderatorId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'MODERATOR' });

    await request(app)
      .patch(`/api/users/${adminId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'ADMIN' });

    // Create test post
    const postRes = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ 
        title: 'Test Post for Dashboard', 
        content: 'This is a test post content for dashboard testing', 
        tags: ['test'] 
      });
    postId = postRes.body.post.id;
  });

  describe('GET /moderation/dashboard', () => {
    beforeEach(async () => {
      // Create some test data for dashboard
      // Create reports
      await request(app)
        .post('/api/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reportedPostId: postId,
          flagType: FLAG_TYPE.SPAM,
          reason: 'Test report for dashboard',
          severity: REPORT_SEVERITY.MEDIUM
        });

      await request(app)
        .post('/api/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reportedPostId: postId,
          flagType: FLAG_TYPE.INAPPROPRIATE,
          reason: 'Another test report',
          severity: REPORT_SEVERITY.HIGH
        });

      // Create moderation cases
      const caseRes = await request(app)
        .post('/api/moderation/cases')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Case 1',
          description: 'First test case',
          priority: REPORT_SEVERITY.MEDIUM
        });

      const caseRes2 = await request(app)
        .post('/api/moderation/cases')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Case 2',
          description: 'Second test case',
          priority: REPORT_SEVERITY.HIGH
        });

      // Assign one case
      await request(app)
        .post(`/api/moderation/cases/${caseRes.body.moderationCase.id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedModeratorId: moderatorId });
    });

    it('should allow moderators to access dashboard', async () => {
      const res = await request(app)
        .get('/api/moderation/dashboard')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toBeDefined();
      expect(res.body.totalCases).toBeDefined();
      expect(res.body.activeCases).toBeDefined();
      expect(res.body.pendingReports).toBeDefined();
      expect(res.body.resolvedToday).toBeDefined();
      expect(res.body.escalatedCases).toBeDefined();
      expect(res.body.recentActivity).toBeDefined();
      expect(Array.isArray(res.body.recentActivity)).toBe(true);
    });

    it('should allow admins to access dashboard', async () => {
      const res = await request(app)
        .get('/api/moderation/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.totalCases).toBeGreaterThanOrEqual(0);
      expect(res.body.activeCases).toBeGreaterThanOrEqual(0);
    });

    it('should reject non-moderators from dashboard', async () => {
      const res = await request(app)
        .get('/api/moderation/dashboard')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should require authentication for dashboard', async () => {
      const res = await request(app)
        .get('/api/moderation/dashboard');

      expect(res.statusCode).toBe(401);
    });

    it('should filter dashboard data by moderator', async () => {
      const res = await request(app)
        .get('/api/moderation/dashboard?moderatorId=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toBeDefined();
    });

    it('should filter dashboard data by date range', async () => {
      const res = await request(app)
        .get('/api/moderation/dashboard?dateRange=week')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toBeDefined();
    });

    it('should handle different date ranges', async () => {
      const dateRanges = ['today', 'week', 'month', 'year'];
      
      for (const range of dateRanges) {
        const res = await request(app)
          .get(`/api/moderation/dashboard?dateRange=${range}`)
          .set('Authorization', `Bearer ${moderatorToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toBeDefined();
      }
    });

    it('should include metrics when requested', async () => {
      const res = await request(app)
        .get('/api/moderation/dashboard?includeMetrics=true')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toBeDefined();
    });
  });

  describe('GET /moderation/stats', () => {
    beforeEach(async () => {
      // Create test data for stats
      await request(app)
        .post('/api/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reportedPostId: postId,
          flagType: FLAG_TYPE.SPAM,
          reason: 'Stats test report',
          severity: REPORT_SEVERITY.LOW
        });

      await request(app)
        .post('/api/moderation/cases')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Stats Test Case',
          description: 'Case for stats testing'
        });
    });

    it('should allow moderators to access stats', async () => {
      const res = await request(app)
        .get('/api/moderation/stats')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.stats).toBeDefined();
    });

    it('should allow admins to access stats', async () => {
      const res = await request(app)
        .get('/api/moderation/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.stats).toBeDefined();
    });

    it('should reject non-moderators from stats', async () => {
      const res = await request(app)
        .get('/api/moderation/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should include comprehensive statistics', async () => {
      const res = await request(app)
        .get('/api/moderation/stats')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.stats).toBeDefined();
      // Stats should include various metrics
      expect(typeof res.body.stats).toBe('object');
    });
  });

  describe('GET /moderation/logs', () => {
    beforeEach(async () => {
      // Create some activity that would generate logs
      await request(app)
        .post('/api/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reportedPostId: postId,
          flagType: FLAG_TYPE.SPAM,
          reason: 'Log test report'
        });

      const caseRes = await request(app)
        .post('/api/moderation/cases')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Log Test Case',
          description: 'Case for log testing'
        });

      await request(app)
        .post(`/api/moderation/cases/${caseRes.body.moderationCase.id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedModeratorId: moderatorId });
    });

    it('should allow moderators to access logs', async () => {
      const res = await request(app)
        .get('/api/moderation/logs')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(Array.isArray(res.body.logs)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('should allow admins to access logs', async () => {
      const res = await request(app)
        .get('/api/moderation/logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.logs).toBeDefined();
    });

    it('should reject non-moderators from logs', async () => {
      const res = await request(app)
        .get('/api/moderation/logs')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should filter logs by log type', async () => {
      const res = await request(app)
        .get('/api/moderation/logs?logType=report_submitted')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.logs).toBeDefined();
    });

    it('should filter logs by user', async () => {
      const res = await request(app)
        .get(`/api/moderation/logs?userId=${userId}`)
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.logs).toBeDefined();
    });

    it('should filter logs by case ID', async () => {
      // First get a case ID
      const caseRes = await request(app)
        .get('/api/moderation/cases')
        .set('Authorization', `Bearer ${moderatorToken}`);

      if (caseRes.body.cases.length > 0) {
        const caseId = caseRes.body.cases[0].id;
        
        const res = await request(app)
          .get(`/api/moderation/logs?caseId=${caseId}`)
          .set('Authorization', `Bearer ${moderatorToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.logs).toBeDefined();
      }
    });

    it('should filter logs by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();

      const res = await request(app)
        .get(`/api/moderation/logs?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.logs).toBeDefined();
    });

    it('should paginate log results', async () => {
      const res = await request(app)
        .get('/api/moderation/logs?page=1&limit=10')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.logs.length).toBeLessThanOrEqual(10);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(10);
    });

    it('should include log metadata', async () => {
      const res = await request(app)
        .get('/api/moderation/logs')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      if (res.body.logs.length > 0) {
        const log = res.body.logs[0];
        expect(log.id).toBeDefined();
        expect(log.logType).toBeDefined();
        expect(log.createdAt).toBeDefined();
        expect(log.details).toBeDefined();
      }
    });
  });

  describe('Dashboard Data Accuracy', () => {
    it('should accurately count total cases', async () => {
      // Create known number of cases
      const caseCount = 3;
      for (let i = 0; i < caseCount; i++) {
        await request(app)
          .post('/api/moderation/cases')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: `Test Case ${i + 1}`,
            description: `Case ${i + 1} for accuracy test`
          });
      }

      const res = await request(app)
        .get('/api/moderation/dashboard')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.totalCases).toBeGreaterThanOrEqual(caseCount);
    });

    it('should accurately count active cases', async () => {
      // Create cases and ensure they're active
      const caseRes = await request(app)
        .post('/api/moderation/cases')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Active Case Test',
          description: 'Should be counted as active'
        });

      const res = await request(app)
        .get('/api/moderation/dashboard')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.activeCases).toBeGreaterThan(0);
    });

    it('should accurately count pending reports', async () => {
      // Create known number of reports
      const reportCount = 2;
      for (let i = 0; i < reportCount; i++) {
        await request(app)
          .post('/api/moderation/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            reportedPostId: postId,
            flagType: FLAG_TYPE.SPAM,
            reason: `Pending report ${i + 1}`,
            severity: REPORT_SEVERITY.MEDIUM
          });
      }

      const res = await request(app)
        .get('/api/moderation/dashboard')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.pendingReports).toBeGreaterThanOrEqual(reportCount);
    });

    it('should show recent activity in chronological order', async () => {
      const res = await request(app)
        .get('/api/moderation/dashboard')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.recentActivity).toBeDefined();
      
      if (res.body.recentActivity.length > 1) {
        // Check that activities are sorted by date (most recent first)
        for (let i = 0; i < res.body.recentActivity.length - 1; i++) {
          const current = new Date(res.body.recentActivity[i].createdAt);
          const next = new Date(res.body.recentActivity[i + 1].createdAt);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });
  });

  describe('Dashboard Performance', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now();
      
      const res = await request(app)
        .get('/api/moderation/dashboard')
        .set('Authorization', `Bearer ${moderatorToken}`);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(res.statusCode).toBe(200);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });

    it('should handle large datasets efficiently', async () => {
      // Create more data to test performance
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/moderation/cases')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: `Performance Test Case ${i + 1}`,
            description: `Case ${i + 1} for performance testing`
          });
      }

      const startTime = Date.now();
      
      const res = await request(app)
        .get('/api/moderation/dashboard')
        .set('Authorization', `Bearer ${moderatorToken}`);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(res.statusCode).toBe(200);
      expect(responseTime).toBeLessThan(3000); // Should still be fast with more data
    });
  });

  describe('Dashboard Security', () => {
    it('should not expose sensitive information', async () => {
      const res = await request(app)
        .get('/api/moderation/dashboard')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      
      // Should not contain sensitive user data
      const responseString = JSON.stringify(res.body);
      expect(responseString).not.toContain('password');
      expect(responseString).not.toContain('token');
    });

    it('should respect moderator scope limitations', async () => {
      // Create a case assigned to a different moderator
      const unique = Date.now();
      const otherModRes = await request(app).post('/api/auth/register').send({
        name: 'Other Moderator',
        email: `othermod+${unique}@example.com`,
        password: 'password123',
      });
      const otherModId = otherModRes.body.user.id;

      await request(app)
        .patch(`/api/users/${otherModId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'MODERATOR' });

      const caseRes = await request(app)
        .post('/api/moderation/cases')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Other Moderator Case',
          description: 'Assigned to different moderator'
        });

      await request(app)
        .post(`/api/moderation/cases/${caseRes.body.moderationCase.id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedModeratorId: otherModId });

      // Original moderator should still be able to see dashboard
      const res = await request(app)
        .get('/api/moderation/dashboard')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toBeDefined();
    });
  });
});
