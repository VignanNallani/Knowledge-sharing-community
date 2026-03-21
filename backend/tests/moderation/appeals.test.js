import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import dotenv from 'dotenv';
dotenv.config();

import { app } from '../../index.js';
import { REPORT_SEVERITY, CASE_STATE, ACTION_TYPE, TRUST_LEVEL, APPEAL_STATUS, FLAG_TYPE } from '../../src/modules/moderation/constants.js';

describe('Appeals System', () => {
  let userToken;
  let moderatorToken;
  let adminToken;
  let userId;
  let moderatorId;
  let adminId;
  let caseId;
  let actionId;
  let appealId;

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

    // Create a moderation case and action for appeals testing
    const caseRes = await request(app)
      .post('/api/moderation/cases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Case for Appeals',
        description: 'Case to test appeal functionality'
      });
    caseId = caseRes.body.moderationCase.id;

    // Assign case to moderator
    await request(app)
      .post(`/api/moderation/cases/${caseId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedModeratorId: moderatorId });

    // Take an action against the user
    const actionRes = await request(app)
      .post(`/api/moderation/cases/${caseId}/action`)
      .set('Authorization', `Bearer ${moderatorToken}`)
      .send({
        actionType: ACTION_TYPE.WARNING,
        actionDetails: 'Warning issued for test purposes',
        targetUserId: userId
      });
    actionId = actionRes.body.action.id;
  });

  describe('POST /moderation/appeals', () => {
    it('should allow users to create appeals against moderation actions', async () => {
      const appealData = {
        moderationCaseId: caseId,
        originalActionId: actionId,
        appealReason: 'Unfair warning',
        appealDescription: 'I believe this warning was unjustified because the context was misunderstood',
        evidenceUrls: [
          'https://example.com/evidence1.jpg',
          'https://example.com/evidence2.png'
        ]
      };

      const res = await request(app)
        .post('/api/moderation/appeals')
        .set('Authorization', `Bearer ${userToken}`)
        .send(appealData);

      expect(res.statusCode).toBe(201);
      expect(res.body.appeal).toBeDefined();
      expect(res.body.appeal.appealReason).toBe(appealData.appealReason);
      expect(res.body.appeal.status).toBe(APPEAL_STATUS.SUBMITTED);
      expect(res.body.appeal.appellantUserId).toBe(userId);
      expect(res.body.appeal.evidenceUrls).toHaveLength(2);
      appealId = res.body.appeal.id;
    });

    it('should require authentication for appeal creation', async () => {
      const appealData = {
        moderationCaseId: caseId,
        appealReason: 'Test appeal'
      };

      const res = await request(app)
        .post('/api/moderation/appeals')
        .send(appealData);

      expect(res.statusCode).toBe(401);
    });

    it('should validate required fields for appeal creation', async () => {
      const appealData = {
        appealDescription: 'Missing appeal reason'
      };

      const res = await request(app)
        .post('/api/moderation/appeals')
        .set('Authorization', `Bearer ${userToken}`)
        .send(appealData);

      expect(res.statusCode).toBe(400);
    });

    it('should validate appeal reason length', async () => {
      const appealData = {
        moderationCaseId: caseId,
        appealReason: 'Too short', // Less than 10 characters
        appealDescription: 'Valid description'
      };

      const res = await request(app)
        .post('/api/moderation/appeals')
        .set('Authorization', `Bearer ${userToken}`)
        .send(appealData);

      expect(res.statusCode).toBe(400);
    });

    it('should handle appeals without evidence URLs', async () => {
      const appealData = {
        moderationCaseId: caseId,
        appealReason: 'Appeal without evidence',
        appealDescription: 'This appeal has no evidence URLs'
      };

      const res = await request(app)
        .post('/api/moderation/appeals')
        .set('Authorization', `Bearer ${userToken}`)
        .send(appealData);

      expect(res.statusCode).toBe(201);
      expect(res.body.appeal.evidenceUrls).toEqual([]);
    });

    it('should limit evidence URLs to maximum allowed', async () => {
      const appealData = {
        moderationCaseId: caseId,
        appealReason: 'Appeal with too many evidence URLs',
        appealDescription: 'This appeal has too many evidence URLs',
        evidenceUrls: [
          'https://example.com/evidence1.jpg',
          'https://example.com/evidence2.png',
          'https://example.com/evidence3.jpg',
          'https://example.com/evidence4.png',
          'https://example.com/evidence5.jpg',
          'https://example.com/evidence6.png' // 6th URL - should exceed limit
        ]
      };

      const res = await request(app)
        .post('/api/moderation/appeals')
        .set('Authorization', `Bearer ${userToken}`)
        .send(appealData);

      expect(res.statusCode).toBe(400);
    });

    it('should validate evidence URL format', async () => {
      const appealData = {
        moderationCaseId: caseId,
        appealReason: 'Appeal with invalid URL',
        appealDescription: 'This appeal has an invalid evidence URL',
        evidenceUrls: [
          'not-a-valid-url',
          'https://example.com/valid.jpg'
        ]
      };

      const res = await request(app)
        .post('/api/moderation/appeals')
        .set('Authorization', `Bearer ${userToken}`)
        .send(appealData);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('PATCH /moderation/appeals/:id', () => {
    beforeEach(async () => {
      // Create an appeal for testing
      const appealRes = await request(app)
        .post('/api/moderation/appeals')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          moderationCaseId: caseId,
          appealReason: 'Test appeal for review',
          appealDescription: 'This is a test appeal for review functionality'
        });
      appealId = appealRes.body.appeal.id;
    });

    it('should allow moderators to update appeal status', async () => {
      const updateData = {
        status: APPEAL_STATUS.UNDER_REVIEW,
        reviewNotes: 'Review started, investigating the circumstances'
      };

      const res = await request(app)
        .patch(`/api/moderation/appeals/${appealId}`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.appeal.status).toBe(APPEAL_STATUS.UNDER_REVIEW);
      expect(res.body.appeal.reviewNotes).toBe(updateData.reviewNotes);
      expect(res.body.appeal.reviewedByModeratorId).toBe(moderatorId);
    });

    it('should allow admins to update appeal status', async () => {
      const updateData = {
        status: APPEAL_STATUS.APPROVED,
        reviewNotes: 'Appeal approved, warning will be reversed',
        finalDecision: 'reverse'
      };

      const res = await request(app)
        .patch(`/api/moderation/appeals/${appealId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.appeal.status).toBe(APPEAL_STATUS.APPROVED);
      expect(res.body.appeal.finalDecision).toBe('reverse');
      expect(res.body.appeal.resolvedAt).toBeDefined();
    });

    it('should reject non-moderators from updating appeal status', async () => {
      // Create another user
      const unique = Date.now();
      const otherUserRes = await request(app).post('/api/auth/register').send({
        name: 'Other User',
        email: `other+${unique}@example.com`,
        password: 'password123',
      });
      const otherUserToken = otherUserRes.body.token;

      const updateData = {
        status: APPEAL_STATUS.DENIED,
        reviewNotes: 'Denying appeal'
      };

      const res = await request(app)
        .patch(`/api/moderation/appeals/${appealId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(403);
    });

    it('should validate required fields for appeal updates', async () => {
      const res = await request(app)
        .patch(`/api/moderation/appeals/${appealId}`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          status: APPEAL_STATUS.DENIED
          // Missing reviewNotes
        });

      expect(res.statusCode).toBe(400);
    });

    it('should validate review notes length', async () => {
      const updateData = {
        status: APPEAL_STATUS.DENIED,
        reviewNotes: 'Too short' // Less than 10 characters
      };

      const res = await request(app)
        .patch(`/api/moderation/appeals/${appealId}`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(400);
    });

    it('should handle different final decisions', async () => {
      const updateData = {
        status: APPEAL_STATUS.DENIED,
        reviewNotes: 'After review, the original action stands',
        finalDecision: 'uphold'
      };

      const res = await request(app)
        .patch(`/api/moderation/appeals/${appealId}`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.appeal.finalDecision).toBe('uphold');
    });

    it('should set resolved timestamp for final decisions', async () => {
      const updateData = {
        status: APPEAL_STATUS.APPROVED,
        reviewNotes: 'Appeal approved',
        finalDecision: 'modify'
      };

      const res = await request(app)
        .patch(`/api/moderation/appeals/${appealId}`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.appeal.resolvedAt).toBeDefined();
      expect(new Date(res.body.appeal.resolvedAt)).toBeInstanceOf(Date);
    });

    it('should not set resolved timestamp for non-final statuses', async () => {
      const updateData = {
        status: APPEAL_STATUS.UNDER_REVIEW,
        reviewNotes: 'Starting review process'
      };

      const res = await request(app)
        .patch(`/api/moderation/appeals/${appealId}`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.appeal.resolvedAt).toBeNull();
    });
  });

  describe('GET /moderation/appeals/:id', () => {
    beforeEach(async () => {
      // Create an appeal for testing
      const appealRes = await request(app)
        .post('/api/moderation/appeals')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          moderationCaseId: caseId,
          appealReason: 'Test appeal for viewing',
          appealDescription: 'This is a test appeal for viewing functionality'
        });
      appealId = appealRes.body.appeal.id;
    });

    it('should allow appellant to view their own appeal', async () => {
      const res = await request(app)
        .get(`/api/moderation/appeals/${appealId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.appeal.id).toBe(appealId);
      expect(res.body.appeal.appellantUserId).toBe(userId);
    });

    it('should allow moderators to view any appeal', async () => {
      const res = await request(app)
        .get(`/api/moderation/appeals/${appealId}`)
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.appeal.id).toBe(appealId);
    });

    it('should allow admins to view any appeal', async () => {
      const res = await request(app)
        .get(`/api/moderation/appeals/${appealId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.appeal.id).toBe(appealId);
    });

    it('should reject non-moderators from viewing others appeals', async () => {
      // Create another user
      const unique = Date.now();
      const otherUserRes = await request(app).post('/api/auth/register').send({
        name: 'Other User',
        email: `other+${unique}@example.com`,
        password: 'password123',
      });
      const otherUserToken = otherUserRes.body.token;

      const res = await request(app)
        .get(`/api/moderation/appeals/${appealId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return 404 for non-existent appeal', async () => {
      const res = await request(app)
        .get('/api/moderation/appeals/99999')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /moderation/appeals', () => {
    beforeEach(async () => {
      // Create multiple appeals for testing
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/moderation/appeals')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            moderationCaseId: caseId,
            appealReason: `Test appeal ${i + 1}`,
            appealDescription: `Description for appeal ${i + 1}`
          });
      }
    });

    it('should allow moderators to view all appeals', async () => {
      const res = await request(app)
        .get('/api/moderation/appeals')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.appeals).toBeDefined();
      expect(res.body.appeals.length).toBeGreaterThanOrEqual(3);
      expect(res.body.meta).toBeDefined();
    });

    it('should allow admins to view all appeals', async () => {
      const res = await request(app)
        .get('/api/moderation/appeals')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.appeals.length).toBeGreaterThanOrEqual(3);
    });

    it('should reject non-moderators from viewing all appeals', async () => {
      const res = await request(app)
        .get('/api/moderation/appeals')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should filter appeals by status', async () => {
      const res = await request(app)
        .get('/api/moderation/appeals?status=SUBMITTED')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.appeals.every(appeal => appeal.status === APPEAL_STATUS.SUBMITTED)).toBe(true);
    });

    it('should filter appeals by appellant user', async () => {
      const res = await request(app)
        .get(`/api/moderation/appeals?appellantUserId=${userId}`)
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.appeals.every(appeal => appeal.appellantUserId === userId)).toBe(true);
    });

    it('should paginate appeal results', async () => {
      const res = await request(app)
        .get('/api/moderation/appeals?page=1&limit=2')
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.appeals.length).toBeLessThanOrEqual(2);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
    });
  });

  describe('Appeal Rate Limiting', () => {
    it('should prevent excessive appeal submissions', async () => {
      const appealData = {
        moderationCaseId: caseId,
        appealReason: 'Rate limit test appeal',
        appealDescription: 'Testing appeal rate limiting'
      };

      // Submit multiple appeals rapidly
      const promises = Array(4).fill().map(() =>
        request(app)
          .post('/api/moderation/appeals')
          .set('Authorization', `Bearer ${userToken}`)
          .send(appealData)
      );

      const results = await Promise.all(promises);
      
      // At least one should be rate limited (limit is 3 per week)
      const rateLimited = results.some(res => res.statusCode === 429);
      expect(rateLimited).toBe(true);
    });

    it('should allow reasonable number of appeals', async () => {
      const appealData = {
        moderationCaseId: caseId,
        appealReason: 'Valid appeal',
        appealDescription: 'This is a valid appeal submission'
      };

      // Submit 2 appeals (should be under the limit)
      const promises = Array(2).fill().map(() =>
        request(app)
          .post('/api/moderation/appeals')
          .set('Authorization', `Bearer ${userToken}`)
          .send(appealData)
      );

      const results = await Promise.all(promises);
      
      // All should succeed
      const allSuccessful = results.every(res => res.statusCode === 201);
      expect(allSuccessful).toBe(true);
    });
  });

  describe('Appeal Workflow Integration', () => {
    let testAppealId;

    beforeEach(async () => {
      // Create an appeal for workflow testing
      const appealRes = await request(app)
        .post('/api/moderation/appeals')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          moderationCaseId: caseId,
          appealReason: 'Workflow test appeal',
          appealDescription: 'Testing appeal workflow integration'
        });
      testAppealId = appealRes.body.appeal.id;
    });

    it('should handle complete appeal workflow', async () => {
      // Step 1: Moderator starts review
      let res = await request(app)
        .patch(`/api/moderation/appeals/${testAppealId}`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          status: APPEAL_STATUS.UNDER_REVIEW,
          reviewNotes: 'Starting appeal review process'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.appeal.status).toBe(APPEAL_STATUS.UNDER_REVIEW);

      // Step 2: Admin makes final decision
      res = await request(app)
        .patch(`/api/moderation/appeals/${testAppealId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: APPEAL_STATUS.APPROVED,
          reviewNotes: 'After thorough review, the appeal is approved',
          finalDecision: 'reverse'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.appeal.status).toBe(APPEAL_STATUS.APPROVED);
      expect(res.body.appeal.finalDecision).toBe('reverse');
      expect(res.body.appeal.resolvedAt).toBeDefined();
    });

    it('should handle appeal denial workflow', async () => {
      const res = await request(app)
        .patch(`/api/moderation/appeals/${testAppealId}`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          status: APPEAL_STATUS.DENIED,
          reviewNotes: 'After review, the original action is upheld',
          finalDecision: 'uphold'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.appeal.status).toBe(APPEAL_STATUS.DENIED);
      expect(res.body.appeal.finalDecision).toBe('uphold');
      expect(res.body.appeal.resolvedAt).toBeDefined();
    });

    it('should handle appeal escalation', async () => {
      const res = await request(app)
        .patch(`/api/moderation/appeals/${testAppealId}`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          status: APPEAL_STATUS.ESCALATED,
          reviewNotes: 'Complex case requiring admin review'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.appeal.status).toBe(APPEAL_STATUS.ESCALATED);
      expect(res.body.appeal.resolvedAt).toBeNull(); // Not resolved yet
    });
  });
});
