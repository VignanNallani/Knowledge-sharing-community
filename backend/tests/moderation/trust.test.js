import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import dotenv from 'dotenv';
dotenv.config();

import { app } from '../../index.js';
import { REPORT_SEVERITY, CASE_STATE, ACTION_TYPE, TRUST_LEVEL, APPEAL_STATUS, FLAG_TYPE } from '../../src/modules/moderation/constants.js';

describe('Trust Score System', () => {
  let moderatorToken;
  let adminToken;
  let userToken;
  let userId;
  let moderatorId;
  let adminId;

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
  });

  describe('Trust Score Calculation', () => {
    it('should calculate initial trust score for new user', async () => {
      const res = await request(app)
        .get(`/api/moderation/trust-scores/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.trustScore).toBeDefined();
      expect(res.body.trustScore.overallScore).toBeGreaterThanOrEqual(0);
      expect(res.body.trustScore.overallScore).toBeLessThanOrEqual(100);
      expect(res.body.trustScore.trustLevel).toBeDefined();
      expect(Object.values(TRUST_LEVEL)).toContain(res.body.trustScore.trustLevel);
    });

    it('should reject non-admins from accessing trust scores', async () => {
      const res = await request(app)
        .get(`/api/moderation/trust-scores/${userId}`)
        .set('Authorization', `Bearer ${moderatorToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should reject regular users from accessing trust scores', async () => {
      const res = await request(app)
        .get(`/api/moderation/trust-scores/${userId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return 404 for non-existent user trust score', async () => {
      const res = await request(app)
        .get('/api/moderation/trust-scores/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('Trust Score Updates', () => {
    it('should allow admins to update trust scores', async () => {
      const updateData = {
        contentQualityScore: 80,
        communityEngagementScore: 75,
        reliabilityScore: 85
      };

      const res = await request(app)
        .patch(`/api/moderation/trust-scores/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.trustScore.contentQualityScore).toBe(80);
      expect(res.body.trustScore.communityEngagementScore).toBe(75);
      expect(res.body.trustScore.reliabilityScore).toBe(85);
    });

    it('should reject moderators from updating trust scores', async () => {
      const updateData = {
        contentQualityScore: 80
      };

      const res = await request(app)
        .patch(`/api/moderation/trust-scores/${userId}`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(403);
    });

    it('should validate trust score ranges', async () => {
      const updateData = {
        contentQualityScore: 150 // Invalid: exceeds 100
      };

      const res = await request(app)
        .patch(`/api/moderation/trust-scores/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(400);
    });

    it('should allow updating trust level directly', async () => {
      const updateData = {
        trustLevel: TRUST_LEVEL.TRUSTED
      };

      const res = await request(app)
        .patch(`/api/moderation/trust-scores/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.trustScore.trustLevel).toBe(TRUST_LEVEL.TRUSTED);
    });

    it('should require at least one field to update', async () => {
      const res = await request(app)
        .patch(`/api/moderation/trust-scores/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Trust Score Integration with Actions', () => {
    let postId;
    let caseId;

    beforeEach(async () => {
      // Create post for testing
      const postRes = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ 
          title: 'Test Post for Trust', 
          content: 'This is a test post for trust score testing', 
          tags: ['test'] 
        });
      postId = postRes.body.post.id;

      // Create moderation case
      const caseRes = await request(app)
        .post('/api/moderation/cases')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Trust Test Case',
          description: 'Case for testing trust score integration'
        });
      caseId = caseRes.body.moderationCase.id;

      // Assign case to moderator
      await request(app)
        .post(`/api/moderation/cases/${caseId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedModeratorId: moderatorId });
    });

    it('should adjust trust score when trust deduction action is taken', async () => {
      const actionData = {
        actionType: ACTION_TYPE.TRUST_DEDUCTION,
        actionDetails: 'Deducting trust for policy violation',
        targetUserId: userId,
        trustScoreChange: -15
      };

      const res = await request(app)
        .post(`/api/moderation/cases/${caseId}/action`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send(actionData);

      expect(res.statusCode).toBe(200);
      expect(res.body.action.trustScoreChange).toBe(-15);

      // Verify trust score was updated
      const trustRes = await request(app)
        .get(`/api/moderation/trust-scores/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(trustRes.statusCode).toBe(200);
      // The trust score should be lower than initial (which was 50)
      expect(trustRes.body.trustScore.overallScore).toBeLessThan(50);
    });

    it('should handle positive trust score changes', async () => {
      const actionData = {
        actionType: ACTION_TYPE.TRUST_DEDUCTION,
        actionDetails: 'Adding trust for good behavior',
        targetUserId: userId,
        trustScoreChange: 10
      };

      const res = await request(app)
        .post(`/api/moderation/cases/${caseId}/action`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send(actionData);

      expect(res.statusCode).toBe(200);
      expect(res.body.action.trustScoreChange).toBe(10);
    });

    it('should validate trust score change limits', async () => {
      const actionData = {
        actionType: ACTION_TYPE.TRUST_DEDUCTION,
        actionDetails: 'Excessive trust deduction',
        targetUserId: userId,
        trustScoreChange: -100 // Invalid: exceeds -50 limit
      };

      const res = await request(app)
        .post(`/api/moderation/cases/${caseId}/action`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send(actionData);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Trust Level Determination', () => {
    it('should assign VIP level for high scores', async () => {
      const updateData = {
        contentQualityScore: 95,
        communityEngagementScore: 95,
        reliabilityScore: 95
      };

      const res = await request(app)
        .patch(`/api/moderation/trust-scores/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.trustScore.trustLevel).toBe(TRUST_LEVEL.VIP);
    });

    it('should assign TRUSTED level for good scores', async () => {
      const updateData = {
        contentQualityScore: 80,
        communityEngagementScore: 80,
        reliabilityScore: 80
      };

      const res = await request(app)
        .patch(`/api/moderation/trust-scores/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.trustScore.trustLevel).toBe(TRUST_LEVEL.TRUSTED);
    });

    it('should assign ESTABLISHED level for average scores', async () => {
      const updateData = {
        contentQualityScore: 65,
        communityEngagementScore: 65,
        reliabilityScore: 65
      };

      const res = await request(app)
        .patch(`/api/moderation/trust-scores/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.trustScore.trustLevel).toBe(TRUST_LEVEL.ESTABLISHED);
    });

    it('should assign NEW level for default scores', async () => {
      // New user should have NEW level by default
      const res = await request(app)
        .get(`/api/moderation/trust-scores/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.trustScore.trustLevel).toBe(TRUST_LEVEL.NEW);
    });

    it('should assign RESTRICTED level for low scores', async () => {
      const updateData = {
        contentQualityScore: 25,
        communityEngagementScore: 25,
        reliabilityScore: 25
      };

      const res = await request(app)
        .patch(`/api/moderation/trust-scores/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.trustScore.trustLevel).toBe(TRUST_LEVEL.RESTRICTED);
    });

    it('should assign SUSPENDED level for very low scores', async () => {
      const updateData = {
        contentQualityScore: 5,
        communityEngagementScore: 5,
        reliabilityScore: 5
      };

      const res = await request(app)
        .patch(`/api/moderation/trust-scores/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.trustScore.trustLevel).toBe(TRUST_LEVEL.SUSPENDED);
    });
  });

  describe('Trust Score Recalculation', () => {
    beforeEach(async () => {
      // Create some content and activity for the user
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/posts')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ 
            title: `Test Post ${i + 1}`, 
            content: `This is test post content ${i + 1} with some length to test quality scoring`, 
            tags: ['test'] 
          });
      }
    });

    it('should recalculate trust score based on user activity', async () => {
      // Force recalculation by triggering the service
      const res = await request(app)
        .get(`/api/moderation/trust-scores/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.trustScore.lastCalculatedAt).toBeDefined();
      
      // User with posts should have higher than baseline score
      expect(res.body.trustScore.overallScore).toBeGreaterThan(50);
    });

    it('should update last calculated timestamp', async () => {
      const initialRes = await request(app)
        .get(`/api/moderation/trust-scores/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const initialTimestamp = new Date(initialRes.body.trustScore.lastCalculatedAt);

      // Wait a bit and update
      await new Promise(resolve => setTimeout(resolve, 100));

      await request(app)
        .patch(`/api/moderation/trust-scores/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ contentQualityScore: 75 });

      const updatedRes = await request(app)
        .get(`/api/moderation/trust-scores/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const updatedTimestamp = new Date(updatedRes.body.trustScore.lastCalculatedAt);
      
      expect(updatedTimestamp.getTime()).toBeGreaterThanOrEqual(initialTimestamp.getTime());
    });
  });

  describe('Trust Score Security', () => {
    it('should prevent trust score manipulation by non-admins', async () => {
      const res = await request(app)
        .patch(`/api/moderation/trust-scores/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ contentQualityScore: 100 });

      expect(res.statusCode).toBe(403);
    });

    it('should prevent trust score manipulation by moderators', async () => {
      const res = await request(app)
        .patch(`/api/moderation/trust-scores/${userId}`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({ contentQualityScore: 100 });

      expect(res.statusCode).toBe(403);
    });

    it('should prevent unauthorized access to trust scores', async () => {
      // Create another user
      const unique = Date.now();
      const otherUserRes = await request(app).post('/api/auth/register').send({
        name: 'Other User',
        email: `other+${unique}@example.com`,
        password: 'password123',
      });
      const otherUserToken = otherUserRes.body.token;

      const res = await request(app)
        .get(`/api/moderation/trust-scores/${userId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should validate user exists when accessing trust score', async () => {
      const res = await request(app)
        .get('/api/moderation/trust-scores/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });
  });
});
