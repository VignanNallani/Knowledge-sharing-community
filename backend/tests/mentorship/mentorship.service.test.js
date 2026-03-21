import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import app from '../../index.js';
import prisma from '../../src/config/prisma.js';
import { mentorshipService } from '../../src/services/mentorship.service.js';
import { mentorshipTrustService } from '../../src/services/mentorship.trust.service.js';
import { mentorshipMatchingService } from '../../src/services/mentorship.matching.service.js';
import { mentorshipSecurityService } from '../../src/services/mentorship.security.service.js';
import bcrypt from 'bcrypt';

describe('Mentorship Service Tests', () => {
  let testUser, testMentor, testMentee, testMentorProfile, testMenteeProfile;
  let authToken, mentorAuthToken, menteeAuthToken;

  beforeEach(async () => {
    // Clean up test data
    await prisma.mentorshipFeedback.deleteMany();
    await prisma.mentorshipSession.deleteMany();
    await prisma.mentorshipRelationship.deleteMany();
    await prisma.mentorshipRequest.deleteMany();
    await prisma.requestSkill.deleteMany();
    await prisma.mentorSkill.deleteMany();
    await prisma.mentorAvailability.deleteMany();
    await prisma.mentorshipPackage.deleteMany();
    await prisma.menteeProfile.deleteMany();
    await prisma.mentorProfile.deleteMany();
    await prisma.skillTag.deleteMany();
    await prisma.user.deleteMany({
      where: { email: { contains: 'test-mentorship' } }
    });

    // Create test users
    const hashedPassword = await bcrypt.hash('test123', 10);

    testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test-mentorship@example.com',
        password: hashedPassword,
        role: 'USER'
      }
    });

    testMentor = await prisma.user.create({
      data: {
        name: 'Test Mentor',
        email: 'mentor-mentorship@example.com',
        password: hashedPassword,
        role: 'MENTOR'
      }
    });

    testMentee = await prisma.user.create({
      data: {
        name: 'Test Mentee',
        email: 'mentee-mentorship@example.com',
        password: hashedPassword,
        role: 'USER'
      }
    });

    // Create test skills
    await prisma.skillTag.createMany({
      data: [
        { name: 'JavaScript', category: 'Programming', level: 'INTERMEDIATE' },
        { name: 'React', category: 'Frontend', level: 'ADVANCED' },
        { name: 'Node.js', category: 'Backend', level: 'INTERMEDIATE' }
      ]
    });

    // Create mentor profile
    testMentorProfile = await prisma.mentorProfile.create({
      data: {
        userId: testMentor.id,
        professionalTitle: 'Senior Software Engineer',
        yearsOfExperience: 8,
        company: 'Test Company',
        industry: 'Technology',
        bio: 'Experienced software engineer passionate about mentoring',
        hourlyRate: 100,
        mentorshipTypes: ['technical', 'career'],
        maxMentees: 5,
        languagesSpoken: ['English'],
        timezone: 'UTC',
        verificationStatus: 'VERIFIED'
      }
    });

    // Create mentee profile
    testMenteeProfile = await prisma.menteeProfile.create({
      data: {
        userId: testMentee.id,
        careerLevel: 'Junior',
        goals: ['Learn React', 'Career guidance'],
        preferredTopics: ['JavaScript', 'React'],
        budgetRange: '$50-100',
        learningStyle: 'Hands-on',
        background: 'CS graduate, 1 year experience',
        expectations: 'Looking for regular guidance'
      }
    });

    // Get auth tokens
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'mentor-mentorship@example.com',
        password: 'test123'
      });

    mentorAuthToken = loginResponse.body.data.token;

    const menteeLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'mentee-mentorship@example.com',
        password: 'test123'
      });

    menteeAuthToken = menteeLoginResponse.body.data.token;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.mentorshipFeedback.deleteMany();
    await prisma.mentorshipSession.deleteMany();
    await prisma.mentorshipRelationship.deleteMany();
    await prisma.mentorshipRequest.deleteMany();
    await prisma.requestSkill.deleteMany();
    await prisma.mentorSkill.deleteMany();
    await prisma.mentorAvailability.deleteMany();
    await prisma.mentorshipPackage.deleteMany();
    await prisma.menteeProfile.deleteMany();
    await prisma.mentorProfile.deleteMany();
    await prisma.skillTag.deleteMany();
    await prisma.user.deleteMany({
      where: { email: { contains: 'test-mentorship' } }
    });
  });

  describe('Mentor Discovery', () => {
    it('should discover mentors with filters', async () => {
      const response = await request(app)
        .get('/api/v1/mentorship/mentors')
        .query({
          industry: 'Technology',
          minExperience: 5,
          maxRate: 150
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.mentors).toBeDefined();
      expect(response.body.data.mentors.length).toBeGreaterThan(0);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should get mentor profile by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/mentorship/mentors/${testMentorProfile.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testMentorProfile.id);
      expect(response.body.data.name).toBe('Test Mentor');
      expect(response.body.data.trustScore).toBeDefined();
    });

    it('should return 404 for non-existent mentor', async () => {
      const response = await request(app)
        .get('/api/v1/mentorship/mentors/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Profile Management', () => {
    it('should create mentor profile', async () => {
      const newMentor = await prisma.user.create({
        data: {
          name: 'New Mentor',
          email: 'new-mentor@example.com',
          password: await bcrypt.hash('test123', 10),
          role: 'MENTOR'
        }
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'new-mentor@example.com',
          password: 'test123'
        });

      const token = loginResponse.body.data.token;

      const response = await request(app)
        .put('/api/v1/mentorship/profile/mentor')
        .set('Authorization', `Bearer ${token}`)
        .send({
          professionalTitle: 'Senior Developer',
          yearsOfExperience: 6,
          company: 'New Company',
          industry: 'Technology',
          bio: 'Passionate about teaching',
          hourlyRate: 80,
          mentorshipTypes: ['technical'],
          maxMentees: 3,
          languagesSpoken: ['English'],
          timezone: 'UTC'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.professionalTitle).toBe('Senior Developer');
      expect(response.body.data.verificationStatus).toBe('PENDING');
    });

    it('should update existing mentor profile', async () => {
      const response = await request(app)
        .put('/api/v1/mentorship/profile/mentor')
        .set('Authorization', `Bearer ${mentorAuthToken}`)
        .send({
          professionalTitle: 'Lead Software Engineer',
          yearsOfExperience: 10,
          hourlyRate: 120
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.professionalTitle).toBe('Lead Software Engineer');
      expect(response.body.data.yearsOfExperience).toBe(10);
      expect(response.body.data.hourlyRate).toBe(120);
    });

    it('should create mentee profile', async () => {
      const newMentee = await prisma.user.create({
        data: {
          name: 'New Mentee',
          email: 'new-mentee@example.com',
          password: await bcrypt.hash('test123', 10),
          role: 'USER'
        }
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'new-mentee@example.com',
          password: 'test123'
        });

      const token = loginResponse.body.data.token;

      const response = await request(app)
        .put('/api/v1/mentorship/profile/mentee')
        .set('Authorization', `Bearer ${token}`)
        .send({
          careerLevel: 'Mid-level',
          goals: ['Advance career', 'Learn leadership'],
          preferredTopics: ['Management', 'Architecture'],
          budgetRange: '$100-200',
          learningStyle: 'Discussion-based',
          background: '3 years experience',
          expectations: 'Looking for leadership guidance'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.careerLevel).toBe('Mid-level');
      expect(response.body.data.goals).toContain('Advance career');
    });

    it('should require MENTOR role for mentor profile', async () => {
      const response = await request(app)
        .put('/api/v1/mentorship/profile/mentor')
        .set('Authorization', `Bearer ${menteeAuthToken}`)
        .send({
          professionalTitle: 'Developer',
          yearsOfExperience: 2
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Skills Management', () => {
    it('should add skill to mentor profile', async () => {
      const javascriptSkill = await prisma.skillTag.findFirst({
        where: { name: 'JavaScript' }
      });

      const response = await request(app)
        .post('/api/v1/mentorship/skills')
        .set('Authorization', `Bearer ${mentorAuthToken}`)
        .send({
          skillId: javascriptSkill.id,
          proficiencyLevel: 'EXPERT',
          yearsOfExperience: 6
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.skillId).toBe(javascriptSkill.id);
      expect(response.body.data.proficiencyLevel).toBe('EXPERT');
    });

    it('should prevent duplicate skills', async () => {
      const reactSkill = await prisma.skillTag.findFirst({
        where: { name: 'React' }
      });

      // Add skill first time
      await request(app)
        .post('/api/v1/mentorship/skills')
        .set('Authorization', `Bearer ${mentorAuthToken}`)
        .send({
          skillId: reactSkill.id,
          proficiencyLevel: 'ADVANCED',
          yearsOfExperience: 4
        })
        .expect(200);

      // Try to add same skill again
      const response = await request(app)
        .post('/api/v1/mentorship/skills')
        .set('Authorization', `Bearer ${mentorAuthToken}`)
        .send({
          skillId: reactSkill.id,
          proficiencyLevel: 'EXPERT',
          yearsOfExperience: 5
        })
        .expect(409);

      expect(response.body.success).toBe(false);
    });

    it('should validate skill experience against total experience', async () => {
      const nodeSkill = await prisma.skillTag.findFirst({
        where: { name: 'Node.js' }
      });

      const response = await request(app)
        .post('/api/v1/mentorship/skills')
        .set('Authorization', `Bearer ${mentorAuthToken}`)
        .send({
          skillId: nodeSkill.id,
          proficiencyLevel: 'EXPERT',
          yearsOfExperience: 15 // More than mentor's total experience (8)
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Mentorship Requests', () => {
    it('should create mentorship request', async () => {
      const javascriptSkill = await prisma.skillTag.findFirst({
        where: { name: 'JavaScript' }
      });

      const response = await request(app)
        .post('/api/v1/mentorship/requests')
        .set('Authorization', `Bearer ${menteeAuthToken}`)
        .send({
          mentorId: testMentorProfile.id,
          requestType: 'ongoing',
          topicDescription: 'Looking for guidance on advanced JavaScript concepts',
          goals: ['Master JavaScript', 'Career advice'],
          expectedDuration: '3 months',
          budget: 100,
          message: 'Hi! I would love to learn from your experience',
          skills: [
            { skillId: javascriptSkill.id, priority: 1 }
          ]
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('PENDING');
      expect(response.body.data.mentorId).toBe(testMentorProfile.id);
      expect(response.body.data.expiresAt).toBeDefined();
    });

    it('should prevent duplicate requests to same mentor', async () => {
      const javascriptSkill = await prisma.skillTag.findFirst({
        where: { name: 'JavaScript' }
      });

      // Create first request
      await request(app)
        .post('/api/v1/mentorship/requests')
        .set('Authorization', `Bearer ${menteeAuthToken}`)
        .send({
          mentorId: testMentorProfile.id,
          requestType: 'ongoing',
          topicDescription: 'First request',
          goals: ['Learn JavaScript'],
          message: 'First request message',
          skills: [
            { skillId: javascriptSkill.id, priority: 1 }
          ]
        })
        .expect(201);

      // Try to create second request
      const response = await request(app)
        .post('/api/v1/mentorship/requests')
        .set('Authorization', `Bearer ${menteeAuthToken}`)
        .send({
          mentorId: testMentorProfile.id,
          requestType: 'ongoing',
          topicDescription: 'Second request',
          goals: ['Learn React'],
          message: 'Second request message',
          skills: [
            { skillId: javascriptSkill.id, priority: 1 }
          ]
        })
        .expect(409);

      expect(response.body.success).toBe(false);
    });

    it('should enforce rate limiting on requests', async () => {
      const javascriptSkill = await prisma.skillTag.findFirst({
        where: { name: 'JavaScript' }
      });

      // Create multiple mentors to test rate limiting
      const mentors = [];
      for (let i = 0; i < 6; i++) {
        const mentor = await prisma.user.create({
          data: {
            name: `Mentor ${i}`,
            email: `mentor${i}@example.com`,
            password: await bcrypt.hash('test123', 10),
            role: 'MENTOR'
          }
        });

        const mentorProfile = await prisma.mentorProfile.create({
          data: {
            userId: mentor.id,
            professionalTitle: 'Senior Developer',
            yearsOfExperience: 5,
            verificationStatus: 'VERIFIED'
          }
        });

        mentors.push(mentorProfile);
      }

      // Create requests up to the limit
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/mentorship/requests')
          .set('Authorization', `Bearer ${menteeAuthToken}`)
          .send({
            mentorId: mentors[i].id,
            requestType: 'ongoing',
            topicDescription: `Request ${i}`,
            goals: ['Learn'],
            message: `Message ${i}`,
            skills: [
              { skillId: javascriptSkill.id, priority: 1 }
            ]
          })
          .expect(201);
      }

      // Next request should be rate limited
      const response = await request(app)
        .post('/api/v1/mentorship/requests')
        .set('Authorization', `Bearer ${menteeAuthToken}`)
        .send({
          mentorId: mentors[5].id,
          requestType: 'ongoing',
          topicDescription: 'Rate limited request',
          goals: ['Learn'],
          message: 'Should be rate limited',
          skills: [
            { skillId: javascriptSkill.id, priority: 1 }
          ]
        })
        .expect(429);

      expect(response.body.success).toBe(false);
    });

    it('should respond to mentorship request', async () => {
      const javascriptSkill = await prisma.skillTag.findFirst({
        where: { name: 'JavaScript' }
      });

      // Create request
      const requestResponse = await request(app)
        .post('/api/v1/mentorship/requests')
        .set('Authorization', `Bearer ${menteeAuthToken}`)
        .send({
          mentorId: testMentorProfile.id,
          requestType: 'ongoing',
          topicDescription: 'Test request',
          goals: ['Learn JavaScript'],
          message: 'Test message',
          skills: [
            { skillId: javascriptSkill.id, priority: 1 }
          ]
        })
        .expect(201);

      const requestId = requestResponse.body.data.id;

      // Accept request
      const response = await request(app)
        .put(`/api/v1/mentorship/requests/${requestId}/respond`)
        .set('Authorization', `Bearer ${mentorAuthToken}`)
        .send({
          action: 'accept',
          message: 'I would be happy to mentor you!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ACCEPTED');

      // Check that relationship was created
      const relationships = await prisma.mentorshipRelationship.findMany({
        where: {
          mentorId: testMentorProfile.id,
          menteeId: testMenteeProfile.id
        }
      });

      expect(relationships.length).toBe(1);
      expect(relationships[0].status).toBe('ACTIVE');
    });

    it('should reject request with reason', async () => {
      const javascriptSkill = await prisma.skillTag.findFirst({
        where: { name: 'JavaScript' }
      });

      // Create request
      const requestResponse = await request(app)
        .post('/api/v1/mentorship/requests')
        .set('Authorization', `Bearer ${menteeAuthToken}`)
        .send({
          mentorId: testMentorProfile.id,
          requestType: 'ongoing',
          topicDescription: 'Test request',
          goals: ['Learn JavaScript'],
          message: 'Test message',
          skills: [
            { skillId: javascriptSkill.id, priority: 1 }
          ]
        })
        .expect(201);

      const requestId = requestResponse.body.data.id;

      // Reject request
      const response = await request(app)
        .put(`/api/v1/mentorship/requests/${requestId}/respond`)
        .set('Authorization', `Bearer ${mentorAuthToken}`)
        .send({
          action: 'reject',
          reason: 'Currently at capacity'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('REJECTED');
      expect(response.body.data.rejectionReason).toBe('Currently at capacity');
    });
  });

  describe('Trust Score Calculation', () => {
    it('should calculate trust score for mentor', async () => {
      const trustScore = await mentorshipTrustService.calculateComprehensiveTrustScore(testMentor.id);

      expect(trustScore).toBeDefined();
      expect(trustScore.overallScore).toBeGreaterThanOrEqual(0);
      expect(trustScore.overallScore).toBeLessThanOrEqual(100);
      expect(trustScore.reliabilityScore).toBeDefined();
      expect(trustScore.expertiseScore).toBeDefined();
      expect(trustScore.communicationScore).toBeDefined();
      expect(trustScore.professionalismScore).toBeDefined();
    });

    it('should adjust trust score manually', async () => {
      const initialScore = await mentorshipTrustService.calculateComprehensiveTrustScore(testMentor.id);

      const adjustedScore = await mentorshipTrustService.adjustTrustScore(
        testMentor.id,
        -5,
        'Test adjustment',
        { temporary: true, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }
      );

      expect(adjustedScore.overallScore).toBe(initialScore.overallScore - 5);
    });

    it('should detect suspicious activity', async () => {
      // Simulate suspicious activity
      await mentorshipSecurityService.analyzeUserBehavior(testMentee.id, 'mentorship_request');
      await mentorshipSecurityService.analyzeUserBehavior(testMentee.id, 'mentorship_request');
      await mentorshipSecurityService.analyzeUserBehavior(testMentee.id, 'mentorship_request');
      await mentorshipSecurityService.analyzeUserBehavior(testMentee.id, 'mentorship_request');
      await mentorshipSecurityService.analyzeUserBehavior(testMentee.id, 'mentorship_request');
      await mentorshipSecurityService.analyzeUserBehavior(testMentee.id, 'mentorship_request');
      await mentorshipSecurityService.analyzeUserBehavior(testMentee.id, 'mentorship_request');
      await mentorshipSecurityService.analyzeUserBehavior(testMentee.id, 'mentorship_request');
      await mentorshipSecurityService.analyzeUserBehavior(testMentee.id, 'mentorship_request');
      await mentorshipSecurityService.analyzeUserBehavior(testMentee.id, 'mentorship_request');
      await mentorshipSecurityService.analyzeUserBehavior(testMentee.id, 'mentorship_request');
      await mentorshipSecurityService.analyzeUserBehavior(testMentee.id, 'mentorship_request');

      const analysis = await mentorshipSecurityService.analyzeUserBehavior(testMentee.id, 'profile_creation');

      expect(analysis.riskScore).toBeGreaterThan(0);
      expect(analysis.flags).toBeDefined();
    });
  });

  describe('Matching Service', () => {
    it('should get mentor recommendations', async () => {
      const recommendations = await mentorshipMatchingService.getMentorRecommendations(testMentee.id, {
        limit: 5
      });

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeLessThanOrEqual(5);

      if (recommendations.length > 0) {
        expect(recommendations[0].matchScore).toBeDefined();
        expect(recommendations[0].matchScore.total).toBeGreaterThanOrEqual(0);
        expect(recommendations[0].matchScore.total).toBeLessThanOrEqual(100);
      }
    });

    it('should calculate match score components', async () => {
      const score = await mentorshipMatchingService.calculateMatchScore(testMenteeProfile, testMentorProfile);

      expect(score).toBeDefined();
      expect(score.skill).toBeGreaterThanOrEqual(0);
      expect(score.experience).toBeGreaterThanOrEqual(0);
      expect(score.availability).toBeGreaterThanOrEqual(0);
      expect(score.trust).toBeGreaterThanOrEqual(0);
      expect(score.rate).toBeGreaterThanOrEqual(0);
      expect(score.language).toBeGreaterThanOrEqual(0);
      expect(score.total).toBeGreaterThanOrEqual(0);
      expect(score.total).toBeLessThanOrEqual(100);
    });

    it('should find mentors for specific skills', async () => {
      const javascriptSkill = await prisma.skillTag.findFirst({
        where: { name: 'JavaScript' }
      });

      // Add skill to mentor
      await prisma.mentorSkill.create({
        data: {
          mentorId: testMentorProfile.id,
          skillId: javascriptSkill.id,
          proficiencyLevel: 'EXPERT',
          verified: true
        }
      });

      const mentors = await mentorshipMatchingService.findMentorsForSkills([javascriptSkill.id], {
        limit: 5,
        minTrustScore: 70
      });

      expect(mentors).toBeDefined();
      expect(Array.isArray(mentors)).toBe(true);
    });
  });

  describe('Security Service', () => {
    it('should encrypt and decrypt sensitive data', async () => {
      const sensitiveData = {
        email: 'test@example.com',
        phone: '+1234567890',
        ssn: '123-45-6789'
      };

      const encrypted = mentorshipSecurityService.encryptSensitiveData(sensitiveData);
      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();

      const decrypted = mentorshipSecurityService.decryptSensitiveData(encrypted);
      expect(decrypted).toEqual(sensitiveData);
    });

    it('should anonymize user data', async () => {
      const userData = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        role: 'USER'
      };

      const anonymized = mentorshipSecurityService.anonymizeUserData(userData);

      expect(anonymized.emailHash).toBeDefined();
      expect(anonymized.email).toBeUndefined();
      expect(anonymized.nameInitial).toBe('J***');
      expect(anonymized.name).toBeUndefined();
      expect(anonymized.phoneHash).toBeDefined();
      expect(anonymized.phoneNumber).toBeUndefined();
    });

    it('should moderate inappropriate content', async () => {
      const inappropriateContent = 'This is HATE speech and VIOLENCE content with spam@example.com';
      
      const moderation = await mentorshipSecurityService.moderateContent(inappropriateContent);

      expect(moderation.approved).toBe(false);
      expect(moderation.score).toBeGreaterThan(0);
      expect(moderation.flags).toContain('inappropriate_content');
      expect(moderation.flags).toContain('personal_information');
    });

    it('should check rate limits', async () => {
      const userId = testMentee.id;
      const action = 'test_action';

      // First few requests should be allowed
      for (let i = 0; i < 5; i++) {
        const result = mentorshipSecurityService.checkRateLimit(userId, action, {
          windowMs: 60000, // 1 minute
          max: 5
        });
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBeGreaterThan(0);
      }

      // Next request should be rate limited
      const result = mentorshipSecurityService.checkRateLimit(userId, action, {
        windowMs: 60000,
        max: 5
      });
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should generate and verify secure tokens', async () => {
      const payload = {
        userId: testMentor.id,
        role: 'MENTOR',
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
      };

      const token = mentorshipSecurityService.generateSecureToken(payload);
      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3);

      const verified = mentorshipSecurityService.verifySecureToken(token);
      expect(verified.userId).toBe(payload.userId);
      expect(verified.role).toBe(payload.role);
    });

    it('should handle expired tokens', async () => {
      const payload = {
        userId: testMentor.id,
        role: 'MENTOR',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };

      const token = mentorshipSecurityService.generateSecureToken(payload);

      expect(() => {
        mentorshipSecurityService.verifySecureToken(token);
      }).toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete mentorship flow', async () => {
      // 1. Mentee discovers mentor
      const mentorsResponse = await request(app)
        .get('/api/v1/mentorship/mentors')
        .query({ industry: 'Technology' })
        .expect(200);

      expect(mentorsResponse.body.data.mentors.length).toBeGreaterThan(0);

      // 2. Mentee creates request
      const javascriptSkill = await prisma.skillTag.findFirst({
        where: { name: 'JavaScript' }
      });

      const requestResponse = await request(app)
        .post('/api/v1/mentorship/requests')
        .set('Authorization', `Bearer ${menteeAuthToken}`)
        .send({
          mentorId: testMentorProfile.id,
          requestType: 'ongoing',
          topicDescription: 'Complete flow test request',
          goals: ['Learn JavaScript'],
          message: 'Testing complete flow',
          skills: [
            { skillId: javascriptSkill.id, priority: 1 }
          ]
        })
        .expect(201);

      // 3. Mentor accepts request
      const acceptResponse = await request(app)
        .put(`/api/v1/mentorship/requests/${requestResponse.body.data.id}/respond`)
        .set('Authorization', `Bearer ${mentorAuthToken}`)
        .send({
          action: 'accept',
          message: 'Happy to help!'
        })
        .expect(200);

      // 4. Verify relationship exists
      const relationshipsResponse = await request(app)
        .get('/api/v1/mentorship/relationships')
        .set('Authorization', `Bearer ${menteeAuthToken}`)
        .expect(200);

      expect(relationshipsResponse.body.data.relationships.length).toBe(1);
      expect(relationshipsResponse.body.data.relationships[0].status).toBe('active');

      // 5. Schedule session
      const relationshipId = relationshipsResponse.body.data.relationships[0].id;
      const sessionResponse = await request(app)
        .post(`/api/v1/mentorship/relationships/${relationshipId}/sessions`)
        .set('Authorization', `Bearer ${menteeAuthToken}`)
        .send({
          scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          scheduledEnd: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
          type: 'video',
          topic: 'Introduction to JavaScript',
          agenda: 'Basic JavaScript concepts and best practices'
        })
        .expect(200);

      expect(sessionResponse.body.data.status).toBe('scheduled');

      // 6. Submit feedback
      const sessionId = sessionResponse.body.data.id;
      
      // First complete the session
      await request(app)
        .post(`/api/v1/mentorship/sessions/${sessionId}/end`)
        .set('Authorization', `Bearer ${mentorAuthToken}`)
        .send({
          notes: 'Great session! Covered basics well.',
          recordingUrl: 'https://example.com/recording'
        })
        .expect(200);

      const feedbackResponse = await request(app)
        .post(`/api/v1/mentorship/sessions/${sessionId}/feedback`)
        .set('Authorization', `Bearer ${menteeAuthToken}`)
        .send({
          rating: 5,
          communicationRating: 5,
          expertiseRating: 5,
          helpfulnessRating: 5,
          professionalismRating: 5,
          comments: 'Excellent mentor! Very knowledgeable and patient.',
          isPublic: true
        })
        .expect(200);

      expect(feedbackResponse.body.data.rating).toBe(5);

      // 7. Check trust score updated
      const trustScore = await mentorshipTrustService.calculateComprehensiveTrustScore(testMentor.id);
      expect(trustScore.reviewCount).toBe(1);
    });
  });
});
