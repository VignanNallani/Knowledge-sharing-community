import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import dotenv from 'dotenv';
dotenv.config();

import { app } from '../../index.js';
import { REPORT_SEVERITY, REPORT_STATUS, ACTION_TYPE, TRUST_LEVEL, APPEAL_STATUS, FLAG_TYPE } from '../../src/modules/moderation/constants.js';

describe('Moderation Reports API', () => {
  let userToken;
  let moderatorToken;
  let adminToken;
  let postId;
  let commentId;
  let reportId;
  let userId;
  let moderatorId;
  let adminId;

  beforeEach(async () => {
    const unique = Date.now();

    // Create regular user
    const userRes = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: `user+${unique}@example.com`,
      password: 'password123',
    });
    userToken = userRes.body.token;
    userId = userRes.body.user.id;

    // Create moderator
    const moderatorRes = await request(app).post('/api/auth/register').send({
      name: 'Test Moderator',
      email: `moderator+${unique}@example.com`,
      password: 'password123',
    });
    moderatorToken = moderatorRes.body.token;
    moderatorId = moderatorRes.body.user.id;

    // Create admin
    const adminRes = await request(app).post('/api/auth/register').send({
      name: 'Test Admin',
      email: `admin+${unique}@example.com`,
      password: 'password123',
    });
    adminToken = adminRes.body.token;
    adminId = adminRes.body.user.id;

    // Update roles (this would typically be done via admin panel)
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
        title: 'Test Post for Moderation', 
        content: 'This is a test post content for moderation testing', 
        tags: ['test'] 
      });
    postId = postRes.body.post.id;

    // Create test comment
    const commentRes = await request(app)
      .post(`/api/posts/${postId}/comment`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ content: 'This is a test comment for moderation' });
    commentId = commentRes.body.comment.id;
  });

  afterEach(async () => {
    // Cleanup would go here in a real implementation
  });

  describe('POST /moderation/reports', () => {
    it('should create a report against a post', async () => {
      const reportData = {
        reportedPostId: postId,
        flagType: FLAG_TYPE.SPAM,
        reason: 'This post appears to be spam content',
        description: 'The post contains repetitive and low-quality content',
        severity: REPORT_SEVERITY.MEDIUM
      };

      const res = await request(app)
        .post('/api/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reportData);

      expect(res.statusCode).toBe(201);
      expect(res.body.report).toBeDefined();
      expect(res.body.report.flagType).toBe(FLAG_TYPE.SPAM);
      expect(res.body.report.severity).toBe(REPORT_SEVERITY.MEDIUM);
      expect(res.body.report.reporterId).toBe(userId);
      reportId = res.body.report.id;
    });

    it('should create a report against a user', async () => {
      const reportData = {
        reportedUserId: moderatorId,
        flagType: FLAG_TYPE.HARASSMENT,
        reason: 'User is harassing others',
        description: 'The user has been sending threatening messages',
        severity: REPORT_SEVERITY.HIGH
      };

      const res = await request(app)
        .post('/api/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reportData);

      expect(res.statusCode).toBe(201);
      expect(res.body.report.flagType).toBe(FLAG_TYPE.HARASSMENT);
      expect(res.body.report.severity).toBe(REPORT_SEVERITY.HIGH);
    });

    it('should create a report against a comment', async () => {
      const reportData = {
        reportedCommentId: commentId,
        flagType: FLAG_TYPE.INAPPROPRIATE,
        reason: 'Inappropriate comment content',
        severity: REPORT_SEVERITY.LOW
      };

      const res = await request(app)
        .post('/api/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reportData);

      expect(res.statusCode).toBe(201);
      expect(res.body.report.flagType).toBe(FLAG_TYPE.INAPPROPRIATE);
    });

    it('should reject reports without authentication', async () => {
      const reportData = {
        reportedPostId: postId,
        flagType: FLAG_TYPE.SPAM,
        reason: 'This post appears to be spam content'
      };

      const res = await request(app)
        .post('/api/moderation/reports')
        .send(reportData);

      expect(res.statusCode).toBe(401);
    });

    it('should reject reports with missing required fields', async () => {
      const reportData = {
        reportedPostId: postId,
        // Missing flagType and reason
      };

      const res = await request(app)
        .post('/api/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reportData);

      expect(res.statusCode).toBe(400);
    });

    it('should reject reports targeting nothing', async () => {
      const reportData = {
        flagType: FLAG_TYPE.SPAM,
        reason: 'This post appears to be spam content'
        // Missing any target (user, post, or comment)
      };

      const res = await request(app)
        .post('/api/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reportData);

      expect(res.statusCode).toBe(400);
    });

    it('should handle evidence URLs correctly', async () => {
      const reportData = {
        reportedPostId: postId,
        flagType: FLAG_TYPE.COPYRIGHT,
        reason: 'Copyright infringement',
        evidenceUrls: [
          'https://example.com/evidence1.jpg',
          'https://example.com/evidence2.png'
        ]
      };

      const res = await request(app)
        .post('/api/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reportData);

      expect(res.statusCode).toBe(201);
      expect(res.body.report.evidenceUrls).toHaveLength(2);
    });
  });

  describe('GET /moderation/reports/:id', () => {
    beforeEach(async () => {
      // Create a report for testing
      const reportRes = await request(app)
        .post('/api/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reportedPostId: postId,
          flagType: FLAG_TYPE.SPAM,
          reason: 'Test report for GET endpoint'
        });
      reportId = reportRes.body.report.id;
    });

    it('should allow reporter to view their own report', async () => {
      const res = await request(app)
        .get(`/api/moderation/reports/${reportId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.report.id).toBe(reportId);
    });

    it('should allow moderators to view any report', async () => {
      const res = await request(app)
        .get(`/api/moderation/reports/${reportId}`)
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.report.id).toBe(reportId);
    });

    it('should reject non-moderators from viewing others reports', async () => {
      // Create another user
      const unique = Date.now();
      const otherUserRes = await request(app).post('/api/auth/register').send({
        name: 'Other User',
        email: `other+${unique}@example.com`,
        password: 'password123',
      });
      const otherUserToken = otherUserRes.body.token;

      const res = await request(app)
        .get(`/api/moderation/reports/${reportId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return 404 for non-existent report', async () => {
      const res = await request(app)
        .get('/api/moderation/reports/99999')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /moderation/reports', () => {
    beforeEach(async () => {
      // Create multiple reports for testing
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/moderation/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            reportedPostId: postId,
            flagType: FLAG_TYPE.SPAM,
            reason: `Test report ${i + 1}`,
            severity: i % 2 === 0 ? REPORT_SEVERITY.LOW : REPORT_SEVERITY.HIGH
          });
      }
    });

    it('should allow moderators to view all reports', async () => {
      const res = await request(app)
        .get('/api/moderation/reports')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.reports).toBeDefined();
      expect(res.body.reports.length).toBeGreaterThanOrEqual(5);
      expect(res.body.meta).toBeDefined();
    });

    it('should reject non-moderators from viewing all reports', async () => {
      const res = await request(app)
        .get('/api/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should filter reports by severity', async () => {
      const res = await request(app)
        .get('/api/moderation/reports?severity=HIGH')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.reports.every(report => report.severity === REPORT_SEVERITY.HIGH)).toBe(true);
    });

    it('should filter reports by status', async () => {
      const res = await request(app)
        .get('/api/moderation/reports?status=PENDING')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.reports.every(report => report.status === REPORT_STATUS.PENDING)).toBe(true);
    });

    it('should filter reports by flag type', async () => {
      const res = await request(app)
        .get(`/api/moderation/reports?flagType=${FLAG_TYPE.SPAM}`)
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.reports.every(report => report.flagType === FLAG_TYPE.SPAM)).toBe(true);
    });

    it('should paginate results correctly', async () => {
      const res = await request(app)
        .get('/api/moderation/reports?page=1&limit=2')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.reports).toHaveLength(2);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
      expect(res.body.meta.totalPages).toBeGreaterThan(1);
    });
  });

  describe('Rate Limiting', () => {
    it('should prevent excessive report submissions', async () => {
      const reportData = {
        reportedPostId: postId,
        flagType: FLAG_TYPE.SPAM,
        reason: 'Test report for rate limiting'
      };

      // Submit multiple reports rapidly
      const promises = Array(6).fill().map(() =>
        request(app)
          .post('/api/moderation/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send(reportData)
      );

      const results = await Promise.all(promises);
      
      // At least one should be rate limited
      const rateLimited = results.some(res => res.statusCode === 429);
      expect(rateLimited).toBe(true);
    });

    it('should detect duplicate reports', async () => {
      const reportData = {
        reportedPostId: postId,
        flagType: FLAG_TYPE.SPAM,
        reason: 'Duplicate test report'
      };

      // Submit first report
      const firstRes = await request(app)
        .post('/api/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reportData);

      expect(firstRes.statusCode).toBe(201);

      // Submit duplicate report
      const duplicateRes = await request(app)
        .post('/api/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reportData);

      expect(duplicateRes.statusCode).toBe(409);
    });
  });

  describe('Auto-Case Generation', () => {
    it('should auto-generate moderation case for HIGH severity reports', async () => {
      const reportData = {
        reportedPostId: postId,
        flagType: FLAG_TYPE.VIOLENCE,
        reason: 'Violent content detected',
        severity: REPORT_SEVERITY.HIGH
      };

      const res = await request(app)
        .post('/api/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reportData);

      expect(res.statusCode).toBe(201);
      expect(res.body.report.moderationCase).toBeDefined();
      expect(res.body.report.moderationCase.autoGenerated).toBe(true);
    });

    it('should auto-generate moderation case for CRITICAL severity reports', async () => {
      const reportData = {
        reportedUserId: moderatorId,
        flagType: FLAG_TYPE.HARASSMENT,
        reason: 'Critical harassment issue',
        severity: REPORT_SEVERITY.CRITICAL
      };

      const res = await request(app)
        .post('/api/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reportData);

      expect(res.statusCode).toBe(201);
      expect(res.body.report.moderationCase).toBeDefined();
      expect(res.body.report.moderationCase.autoGenerated).toBe(true);
    });

    it('should not auto-generate case for LOW/MEDIUM severity reports', async () => {
      const reportData = {
        reportedPostId: postId,
        flagType: FLAG_TYPE.OTHER,
        reason: 'Minor issue',
        severity: REPORT_SEVERITY.LOW
      };

      const res = await request(app)
        .post('/api/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reportData);

      expect(res.statusCode).toBe(201);
      expect(res.body.report.moderationCase).toBeNull();
    });
  });
});
