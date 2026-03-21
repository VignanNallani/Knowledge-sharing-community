import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import dotenv from 'dotenv';
dotenv.config();

import { app } from '../../index.js';
import { REPORT_SEVERITY, CASE_STATE, ACTION_TYPE, TRUST_LEVEL, APPEAL_STATUS, FLAG_TYPE } from '../../src/modules/moderation/constants.js';

describe('Moderation Security & RBAC', () => {
  let userToken;
  let moderatorToken;
  let adminToken;
  let superAdminToken;
  let userId;
  let moderatorId;
  let adminId;
  let superAdminId;
  let postId;
  let caseId;

  beforeEach(async () => {
    const unique = Date.now();

    // Create users with different roles
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

    const superAdminRes = await request(app).post('/api/auth/register').send({
      name: 'Test Super Admin',
      email: `superadmin+${unique}@example.com`,
      password: 'password123',
    });
    superAdminToken = superAdminRes.body.token;
    superAdminId = superAdminRes.body.user.id;

    // Update roles
    await request(app)
      .patch(`/api/users/${moderatorId}/role`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ role: 'MODERATOR' });

    await request(app)
      .patch(`/api/users/${adminId}/role`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ role: 'ADMIN' });

    await request(app)
      .patch(`/api/users/${superAdminId}/role`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ role: 'SUPER_ADMIN' });

    // Create test post
    const postRes = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ 
        title: 'Test Post for Security', 
        content: 'This is a test post content for security testing', 
        tags: ['test'] 
      });
    postId = postRes.body.post.id;

    // Create moderation case for testing
    const caseRes = await request(app)
      .post('/api/moderation/cases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Security Test Case',
        description: 'Case for testing security and RBAC'
      });
    caseId = caseRes.body.moderationCase.id;
  });

  describe('Role-Based Access Control (RBAC)', () => {
    describe('User Access Level', () => {
      it('should allow users to create reports', async () => {
        const reportData = {
          reportedPostId: postId,
          flagType: FLAG_TYPE.SPAM,
          reason: 'User creating report'
        };

        const res = await request(app)
          .post('/api/moderation/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send(reportData);

        expect(res.statusCode).toBe(201);
      });

      it('should allow users to create appeals', async () => {
        const appealData = {
          moderationCaseId: caseId,
          appealReason: 'User appealing decision',
          appealDescription: 'This is an appeal from a regular user'
        };

        const res = await request(app)
          .post('/api/moderation/appeals')
          .set('Authorization', `Bearer ${userToken}`)
          .send(appealData);

        expect(res.statusCode).toBe(201);
      });

      it('should reject users from accessing moderation dashboard', async () => {
        const res = await request(app)
          .get('/api/moderation/dashboard')
          .set('Authorization', `Bearer ${userToken}`);

        expect(res.statusCode).toBe(403);
      });

      it('should reject users from viewing all reports', async () => {
        const res = await request(app)
          .get('/api/moderation/reports')
          .set('Authorization', `Bearer ${userToken}`);

        expect(res.statusCode).toBe(403);
      });

      it('should reject users from creating moderation cases', async () => {
        const caseData = {
          title: 'Unauthorized Case',
          description: 'User trying to create case'
        };

        const res = await request(app)
          .post('/api/moderation/cases')
          .set('Authorization', `Bearer ${userToken}`)
          .send(caseData);

        expect(res.statusCode).toBe(403);
      });

      it('should reject users from taking moderation actions', async () => {
        const actionData = {
          actionType: ACTION_TYPE.WARNING,
          actionDetails: 'User trying to take action'
        };

        const res = await request(app)
          .post(`/api/moderation/cases/${caseId}/action`)
          .set('Authorization', `Bearer ${userToken}`)
          .send(actionData);

        expect(res.statusCode).toBe(403);
      });

      it('should reject users from accessing trust scores', async () => {
        const res = await request(app)
          .get(`/api/moderation/trust-scores/${userId}`)
          .set('Authorization', `Bearer ${userToken}`);

        expect(res.statusCode).toBe(403);
      });
    });

    describe('Moderator Access Level', () => {
      beforeEach(async () => {
        // Assign case to moderator for testing
        await request(app)
          .post(`/api/moderation/cases/${caseId}/assign`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ assignedModeratorId: moderatorId });
      });

      it('should allow moderators to access dashboard', async () => {
        const res = await request(app)
          .get('/api/moderation/dashboard')
          .set('Authorization', `Bearer ${moderatorToken}`);

        expect(res.statusCode).toBe(200);
      });

      it('should allow moderators to view all reports', async () => {
        const res = await request(app)
          .get('/api/moderation/reports')
          .set('Authorization', `Bearer ${moderatorToken}`);

        expect(res.statusCode).toBe(200);
      });

      it('should allow moderators to view assigned cases', async () => {
        const res = await request(app)
          .get('/api/moderation/cases')
          .set('Authorization', `Bearer ${moderatorToken}`);

        expect(res.statusCode).toBe(200);
      });

      it('should allow moderators to take actions on assigned cases', async () => {
        const actionData = {
          actionType: ACTION_TYPE.WARNING,
          actionDetails: 'Moderator taking action',
          targetUserId: userId
        };

        const res = await request(app)
          .post(`/api/moderation/cases/${caseId}/action`)
          .set('Authorization', `Bearer ${moderatorToken}`)
          .send(actionData);

        expect(res.statusCode).toBe(200);
      });

      it('should allow moderators to review appeals', async () => {
        // First create an appeal
        const appealRes = await request(app)
          .post('/api/moderation/appeals')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            moderationCaseId: caseId,
            appealReason: 'Test appeal for moderator review',
            appealDescription: 'Appeal to be reviewed by moderator'
          });

        const updateData = {
          status: APPEAL_STATUS.UNDER_REVIEW,
          reviewNotes: 'Moderator reviewing appeal'
        };

        const res = await request(app)
          .patch(`/api/moderation/appeals/${appealRes.body.appeal.id}`)
          .set('Authorization', `Bearer ${moderatorToken}`)
          .send(updateData);

        expect(res.statusCode).toBe(200);
      });

      it('should reject moderators from creating cases', async () => {
        const caseData = {
          title: 'Moderator Creating Case',
          description: 'Should be rejected'
        };

        const res = await request(app)
          .post('/api/moderation/cases')
          .set('Authorization', `Bearer ${moderatorToken}`)
          .send(caseData);

        expect(res.statusCode).toBe(403);
      });

      it('should reject moderators from suspending users', async () => {
        const actionData = {
          actionType: ACTION_TYPE.USER_SUSPENSION,
          actionDetails: 'Moderator trying to suspend',
          targetUserId: userId,
          durationDays: 7
        };

        const res = await request(app)
          .post(`/api/moderation/cases/${caseId}/action`)
          .set('Authorization', `Bearer ${moderatorToken}`)
          .send(actionData);

        expect(res.statusCode).toBe(403);
      });

      it('should reject moderators from banning users', async () => {
        const actionData = {
          actionType: ACTION_TYPE.USER_BAN,
          actionDetails: 'Moderator trying to ban',
          targetUserId: userId
        };

        const res = await request(app)
          .post(`/api/moderation/cases/${caseId}/action`)
          .set('Authorization', `Bearer ${moderatorToken}`)
          .send(actionData);

        expect(res.statusCode).toBe(403);
      });

      it('should reject moderators from modifying trust scores', async () => {
        const updateData = {
          contentQualityScore: 80
        };

        const res = await request(app)
          .patch(`/api/moderation/trust-scores/${userId}`)
          .set('Authorization', `Bearer ${moderatorToken}`)
          .send(updateData);

        expect(res.statusCode).toBe(403);
      });

      it('should reject moderators from accessing trust scores', async () => {
        const res = await request(app)
          .get(`/api/moderation/trust-scores/${userId}`)
          .set('Authorization', `Bearer ${moderatorToken}`);

        expect(res.statusCode).toBe(403);
      });
    });

    describe('Admin Access Level', () => {
      it('should allow admins to create moderation cases', async () => {
        const caseData = {
          title: 'Admin Created Case',
          description: 'Admin creating case'
        };

        const res = await request(app)
          .post('/api/moderation/cases')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(caseData);

        expect(res.statusCode).toBe(201);
      });

      it('should allow admins to assign cases', async () => {
        const res = await request(app)
          .post(`/api/moderation/cases/${caseId}/assign`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ assignedModeratorId: moderatorId });

        expect(res.statusCode).toBe(200);
      });

      it('should allow admins to take any action', async () => {
        const actionData = {
          actionType: ACTION_TYPE.USER_SUSPENSION,
          actionDetails: 'Admin suspending user',
          targetUserId: userId,
          durationDays: 7
        };

        const res = await request(app)
          .post(`/api/moderation/cases/${caseId}/action`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(actionData);

        expect(res.statusCode).toBe(200);
      });

      it('should allow admins to access trust scores', async () => {
        const res = await request(app)
          .get(`/api/moderation/trust-scores/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
      });

      it('should allow admins to modify trust scores', async () => {
        const updateData = {
          contentQualityScore: 85
        };

        const res = await request(app)
          .patch(`/api/moderation/trust-scores/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData);

        expect(res.statusCode).toBe(200);
      });

      it('should reject admins from banning users', async () => {
        const actionData = {
          actionType: ACTION_TYPE.USER_BAN,
          actionDetails: 'Admin trying to ban',
          targetUserId: userId
        };

        const res = await request(app)
          .post(`/api/moderation/cases/${caseId}/action`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(actionData);

        expect(res.statusCode).toBe(403);
      });
    });

    describe('Super Admin Access Level', () => {
      it('should allow super admins to ban users', async () => {
        const actionData = {
          actionType: ACTION_TYPE.USER_BAN,
          actionDetails: 'Super admin banning user',
          targetUserId: userId
        };

        const res = await request(app)
          .post(`/api/moderation/cases/${caseId}/action`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send(actionData);

        expect(res.statusCode).toBe(200);
      });

      it('should allow super admins to access all admin features', async () => {
        // Test creating case
        const caseRes = await request(app)
          .post('/api/moderation/cases')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({
            title: 'Super Admin Case',
            description: 'Super admin creating case'
          });
        expect(caseRes.statusCode).toBe(201);

        // Test accessing trust scores
        const trustRes = await request(app)
          .get(`/api/moderation/trust-scores/${userId}`)
          .set('Authorization', `Bearer ${superAdminToken}`);
        expect(trustRes.statusCode).toBe(200);

        // Test dashboard access
        const dashboardRes = await request(app)
          .get('/api/moderation/dashboard')
          .set('Authorization', `Bearer ${superAdminToken}`);
        expect(dashboardRes.statusCode).toBe(200);
      });
    });
  });

  describe('Cross-Role Security', () => {
    it('should prevent users from accessing other users reports', async () => {
      // Create a report as user1
      const reportRes = await request(app)
        .post('/api/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reportedPostId: postId,
          flagType: FLAG_TYPE.SPAM,
          reason: 'User 1 report'
        });

      // Create another user
      const unique = Date.now();
      const otherUserRes = await request(app).post('/api/auth/register').send({
        name: 'Other User',
        email: `other+${unique}@example.com`,
        password: 'password123',
      });
      const otherUserToken = otherUserRes.body.token;

      // Try to access the report as other user
      const res = await request(app)
        .get(`/api/moderation/reports/${reportRes.body.report.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should prevent moderators from accessing unassigned cases', async () => {
      // Create another moderator
      const unique = Date.now();
      const otherModRes = await request(app).post('/api/auth/register').send({
        name: 'Other Moderator',
        email: `othermod+${unique}@example.com`,
        password: 'password123',
      });
      const otherModToken = otherModRes.body.token;
      const otherModId = otherModRes.body.user.id;

      await request(app)
        .patch(`/api/users/${otherModId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'MODERATOR' });

      // Create a case but don't assign it
      const caseRes = await request(app)
        .post('/api/moderation/cases')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Unassigned Case',
          description: 'Not assigned to anyone'
        });

      // Try to take action on unassigned case
      const actionData = {
        actionType: ACTION_TYPE.WARNING,
        actionDetails: 'Trying action on unassigned case'
      };

      const res = await request(app)
        .post(`/api/moderation/cases/${caseRes.body.moderationCase.id}/action`)
        .set('Authorization', `Bearer ${otherModToken}`)
        .send(actionData);

      expect(res.statusCode).toBe(403);
    });

    it('should prevent targeting higher-level users', async () => {
      // Assign case to moderator
      await request(app)
        .post(`/api/moderation/cases/${caseId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedModeratorId: moderatorId });

      // Try moderator targeting admin
      const actionData = {
        actionType: ACTION_TYPE.WARNING,
        actionDetails: 'Moderator targeting admin',
        targetUserId: adminId
      };

      const res = await request(app)
        .post(`/api/moderation/cases/${caseId}/action`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send(actionData);

      expect(res.statusCode).toBe(400); // Should be rejected by policy
    });

    it('should prevent self-targeting', async () => {
      // Assign case to moderator
      await request(app)
        .post(`/api/moderation/cases/${caseId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedModeratorId: moderatorId });

      // Try moderator targeting themselves
      const actionData = {
        actionType: ACTION_TYPE.WARNING,
        actionDetails: 'Self-targeting attempt',
        targetUserId: moderatorId
      };

      const res = await request(app)
        .post(`/api/moderation/cases/${caseId}/action`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send(actionData);

      expect(res.statusCode).toBe(400); // Should be rejected by policy
    });
  });

  describe('Input Validation & Sanitization', () => {
    it('should prevent SQL injection in report reasons', async () => {
      const maliciousInput = "'; DROP TABLE reports; --";
      
      const reportData = {
        reportedPostId: postId,
        flagType: FLAG_TYPE.SPAM,
        reason: maliciousInput
      };

      const res = await request(app)
        .post('/api/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reportData);

      // Should either succeed (sanitized) or fail validation, but not crash
      expect([201, 400]).toContain(res.statusCode);
    });

    it('should prevent XSS in appeal descriptions', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      
      const appealData = {
        moderationCaseId: caseId,
        appealReason: 'XSS test',
        appealDescription: xssPayload
      };

      const res = await request(app)
        .post('/api/moderation/appeals')
        .set('Authorization', `Bearer ${userToken}`)
        .send(appealData);

      expect([201, 400]).toContain(res.statusCode);
      
      if (res.statusCode === 201) {
        // If successful, check that XSS is sanitized
        expect(res.body.appeal.appealDescription).not.toContain('<script>');
      }
    });

    it('should validate and sanitize evidence URLs', async () => {
      const maliciousUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'ftp://malicious.com/file'
      ];

      for (const url of maliciousUrls) {
        const reportData = {
          reportedPostId: postId,
          flagType: FLAG_TYPE.SPAM,
          reason: 'Malicious URL test',
          evidenceUrls: [url]
        };

        const res = await request(app)
          .post('/api/moderation/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send(reportData);

        expect(res.statusCode).toBe(400);
      }
    });

    it('should prevent large payload attacks', async () => {
      const largePayload = 'a'.repeat(100000); // 100KB string
      
      const reportData = {
        reportedPostId: postId,
        flagType: FLAG_TYPE.SPAM,
        reason: 'Large payload test',
        description: largePayload
      };

      const res = await request(app)
        .post('/api/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reportData);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Authentication Security', () => {
    it('should reject requests without authentication', async () => {
      const endpoints = [
        { method: 'get', path: '/api/moderation/dashboard' },
        { method: 'get', path: '/api/moderation/reports' },
        { method: 'post', path: '/api/moderation/reports' },
        { method: 'get', path: '/api/moderation/cases' },
        { method: 'post', path: '/api/moderation/cases' },
        { method: 'get', path: '/api/moderation/appeals' },
        { method: 'post', path: '/api/moderation/appeals' }
      ];

      for (const endpoint of endpoints) {
        const res = await request(app)[endpoint.method](endpoint.path);
        expect(res.statusCode).toBe(401);
      }
    });

    it('should reject requests with invalid tokens', async () => {
      const res = await request(app)
        .get('/api/moderation/dashboard')
        .set('Authorization', 'Bearer invalid_token_here');

      expect(res.statusCode).toBe(401);
    });

    it('should reject requests with malformed authorization headers', async () => {
      const malformedHeaders = [
        'InvalidHeader token123',
        'Bearer',
        'bearer token123', // lowercase
        'Bearer token123 extra_data'
      ];

      for (const header of malformedHeaders) {
        const res = await request(app)
          .get('/api/moderation/dashboard')
          .set('Authorization', header);

        expect(res.statusCode).toBe(401);
      }
    });
  });

  describe('Rate Limiting Security', () => {
    it('should prevent brute force attacks on report creation', async () => {
      const reportData = {
        reportedPostId: postId,
        flagType: FLAG_TYPE.SPAM,
        reason: 'Brute force test'
      };

      // Rapid fire requests
      const promises = Array(20).fill().map(() =>
        request(app)
          .post('/api/moderation/reports')
          .set('Authorization', `Bearer ${userToken}`)
          .send(reportData)
      );

      const results = await Promise.all(promises);
      
      // Most should be rate limited
      const rateLimitedCount = results.filter(res => res.statusCode === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(10);
    });

    it('should prevent brute force attacks on appeal creation', async () => {
      const appealData = {
        moderationCaseId: caseId,
        appealReason: 'Brute force appeal test',
        appealDescription: 'Testing rate limits'
      };

      const promises = Array(10).fill().map(() =>
        request(app)
          .post('/api/moderation/appeals')
          .set('Authorization', `Bearer ${userToken}`)
          .send(appealData)
      );

      const results = await Promise.all(promises);
      
      const rateLimitedCount = results.filter(res => res.statusCode === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('Data Exposure Prevention', () => {
    it('should not expose internal system information', async () => {
      const res = await request(app)
        .get('/api/moderation/reports/99999')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body).not.toHaveProperty('stack');
      expect(res.body).not.toHaveProperty('error');
    });

    it('should not expose user passwords in any response', async () => {
      const res = await request(app)
        .get('/api/moderation/dashboard')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      const responseString = JSON.stringify(res.body);
      expect(responseString).not.toMatch(/password/i);
    });

    it('should not expose other users personal information', async () => {
      // Create report as user
      await request(app)
        .post('/api/moderation/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reportedPostId: postId,
          flagType: FLAG_TYPE.SPAM,
          reason: 'Privacy test report'
        });

      // Try to access reports as moderator
      const res = await request(app)
        .get('/api/moderation/reports')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      
      // Should not expose email addresses or other PII unnecessarily
      if (res.body.reports.length > 0) {
        const report = res.body.reports[0];
        // Should only expose necessary user information
        if (report.reporter) {
          expect(report.reporter).not.toHaveProperty('email');
          expect(report.reporter).not.toHaveProperty('password');
        }
      }
    });
  });
});
