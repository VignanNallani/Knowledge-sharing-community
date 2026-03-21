import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mentorshipSecurityService } from '../../src/services/mentorship.security.service.js';
import { mentorshipAuth } from '../../src/middleware/mentorship.auth.middleware.js';
import prisma from '../../src/config/prisma.js';
import bcrypt from 'bcrypt';

describe('Mentorship Security Tests', () => {
  let testUser, testMentor, testMentee;

  beforeEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { contains: 'security-test' } }
    });

    // Create test users
    const hashedPassword = await bcrypt.hash('test123', 10);

    testUser = await prisma.user.create({
      data: {
        name: 'Security Test User',
        email: 'security-test@example.com',
        password: hashedPassword,
        role: 'USER'
      }
    });

    testMentor = await prisma.user.create({
      data: {
        name: 'Security Test Mentor',
        email: 'security-mentor@example.com',
        password: hashedPassword,
        role: 'MENTOR'
      }
    });

    testMentee = await prisma.user.create({
      data: {
        name: 'Security Test Mentee',
        email: 'security-mentee@example.com',
        password: hashedPassword,
        role: 'USER'
      }
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { contains: 'security-test' } }
    });
  });

  describe('Data Protection', () => {
    it('should encrypt and decrypt sensitive data correctly', () => {
      const sensitiveData = {
        email: 'test@example.com',
        phone: '+1234567890',
        ssn: '123-45-6789',
        creditCard: '4111-1111-1111-1111'
      };

      const encrypted = mentorshipSecurityService.encryptSensitiveData(sensitiveData);
      
      expect(encrypted).toBeDefined();
      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.encrypted).not.toBe(sensitiveData);

      const decrypted = mentorshipSecurityService.decryptSensitiveData(encrypted);
      
      expect(decrypted).toEqual(sensitiveData);
    });

    it('should handle decryption errors gracefully', () => {
      const invalidEncryptedData = {
        encrypted: 'invalid',
        iv: 'invalid',
        authTag: 'invalid'
      };

      expect(() => {
        mentorshipSecurityService.decryptSensitiveData(invalidEncryptedData);
      }).toThrow();
    });

    it('should anonymize user data properly', () => {
      const userData = {
        id: 123,
        name: 'John Michael Doe',
        email: 'john.doe@example.com',
        phoneNumber: '+1-555-123-4567',
        address: '123 Main St, Anytown, USA',
        role: 'USER'
      };

      const anonymized = mentorshipSecurityService.anonymizeUserData(userData);

      expect(anonymized.emailHash).toBeDefined();
      expect(anonymized.email).toBeUndefined();
      expect(anonymized.nameInitial).toBe('J***');
      expect(anonymized.name).toBeUndefined();
      expect(anonymized.phoneHash).toBeDefined();
      expect(anonymized.phoneNumber).toBeUndefined();
      expect(anonymized.address).toBeUndefined(); // Should be removed as sensitive
      expect(anonymized.id).toBe(123); // Non-sensitive data should remain
      expect(anonymized.role).toBe('USER');
    });

    it('should hash emails consistently', () => {
      const email1 = 'test@example.com';
      const email2 = 'test@example.com';
      const email3 = 'different@example.com';

      const hash1 = mentorshipSecurityService.hashEmail(email1);
      const hash2 = mentorshipSecurityService.hashEmail(email2);
      const hash3 = mentorshipSecurityService.hashEmail(email3);

      expect(hash1).toBe(hash2); // Same email should produce same hash
      expect(hash1).not.toBe(hash3); // Different emails should produce different hashes
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // Should be SHA-256 hash
    });

    it('should hash phone numbers consistently', () => {
      const phone1 = '+1-555-123-4567';
      const phone2 = '(555) 123-4567';
      const phone3 = '555.123.4567';

      const hash1 = mentorshipSecurityService.hashPhone(phone1);
      const hash2 = mentorshipSecurityService.hashPhone(phone2);
      const hash3 = mentorshipSecurityService.hashPhone(phone3);

      // All should hash to the same value after cleaning
      expect(hash1).toBe(hash2).toBe(hash3);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // Should be SHA-256 hash
    });
  });

  describe('Fraud Detection', () => {
    it('should detect rapid request patterns', async () => {
      const userId = testMentee.id;

      // Simulate rapid requests
      for (let i = 0; i < 12; i++) {
        await mentorshipSecurityService.analyzeUserBehavior(userId, 'mentorship_request', {
          timestamp: new Date(),
          ip: '127.0.0.1'
        });
      }

      const analysis = await mentorshipSecurityService.analyzeUserBehavior(userId, 'profile_creation');

      expect(analysis.riskScore).toBeGreaterThan(0);
      expect(analysis.flags).toContain('rapid_requests');
      expect(analysis.patterns.rapidRequests).toBeGreaterThan(10);
    });

    it('should detect multiple profile creation attempts', async () => {
      const userId = testUser.id;

      // Simulate multiple profile creations
      for (let i = 0; i < 3; i++) {
        await mentorshipSecurityService.analyzeUserBehavior(userId, 'profile_creation');
      }

      const analysis = await mentorshipSecurityService.analyzeUserBehavior(userId, 'mentorship_request');

      expect(analysis.riskScore).toBeGreaterThan(0);
      expect(analysis.flags).toContain('multiple_profiles');
    });

    it('should detect unusual timing patterns', async () => {
      const userId = testMentee.id;

      // Simulate actions at unusual hours (2-5 AM)
      const unusualHours = [2, 3, 4, 5];
      for (const hour of unusualHours) {
        const date = new Date();
        date.setHours(hour, 0, 0, 0);
        
        await mentorshipSecurityService.analyzeUserBehavior(userId, 'mentorship_request', {
          timestamp: date
        });
      }

      // Add some normal hours
      for (let i = 0; i < 3; i++) {
        const date = new Date();
        date.setHours(14, 0, 0, 0); // 2 PM
        
        await mentorshipSecurityService.analyzeUserBehavior(userId, 'mentorship_request', {
          timestamp: date
        });
      }

      const analysis = await mentorshipSecurityService.analyzeUserBehavior(userId, 'feedback_submission');

      expect(analysis.riskScore).toBeGreaterThan(0);
      expect(analysis.flags).toContain('unusual_timing');
    });

    it('should detect geographic anomalies', async () => {
      const userId = testMentor.id;

      // Simulate actions from different locations
      const locations = ['New York', 'London', 'Tokyo', 'San Francisco', 'Berlin'];
      for (const location of locations) {
        await mentorshipSecurityService.analyzeUserBehavior(userId, 'mentorship_request', {
          location,
          timestamp: new Date()
        });
      }

      const analysis = await mentorshipSecurityService.analyzeUserBehavior(userId, 'session_scheduled');

      expect(analysis.riskScore).toBeGreaterThan(0);
      expect(analysis.flags).toContain('geographic_anomaly');
      expect(analysis.patterns.geographicAnomaly).toBeGreaterThan(3);
    });

    it('should block high-risk users', async () => {
      const userId = testUser.id;

      // Simulate high-risk behavior
      for (let i = 0; i < 15; i++) {
        await mentorshipSecurityService.analyzeUserBehavior(userId, 'mentorship_request');
      }
      for (let i = 0; i < 4; i++) {
        await mentorshipSecurityService.analyzeUserBehavior(userId, 'profile_creation');
      }

      const analysis = await mentorshipSecurityService.analyzeUserBehavior(userId, 'feedback_submission');

      expect(analysis.riskScore).toBeGreaterThanOrEqual(80);
      expect(mentorshipSecurityService.isUserBlocked(userId)).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits correctly', () => {
      const userId = testMentee.id;
      const action = 'test_action';

      // First 5 requests should be allowed
      for (let i = 0; i < 5; i++) {
        const result = mentorshipSecurityService.checkRateLimit(userId, action, {
          windowMs: 60000, // 1 minute
          max: 5
        });

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }

      // 6th request should be blocked
      const result = mentorshipSecurityService.checkRateLimit(userId, action, {
        windowMs: 60000,
        max: 5
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should handle different rate limits for different actions', () => {
      const userId = testMentor.id;

      // Test action 1 with limit 3
      for (let i = 0; i < 3; i++) {
        const result1 = mentorshipSecurityService.checkRateLimit(userId, 'action1', {
          windowMs: 60000,
          max: 3
        });
        expect(result1.allowed).toBe(true);
      }

      const result1Blocked = mentorshipSecurityService.checkRateLimit(userId, 'action1', {
        windowMs: 60000,
        max: 3
      });
      expect(result1Blocked.allowed).toBe(false);

      // Action 2 should still be allowed (different bucket)
      const result2 = mentorshipSecurityService.checkRateLimit(userId, 'action2', {
        windowMs: 60000,
        max: 3
      });
      expect(result2.allowed).toBe(true);
    });

    it('should reset rate limits after window expires', async () => {
      const userId = testUser.id;
      const action = 'test_action';

      // Use a very short window for testing
      const shortWindow = 100; // 100ms

      // Exhaust the limit
      for (let i = 0; i < 3; i++) {
        const result = mentorshipSecurityService.checkRateLimit(userId, action, {
          windowMs: shortWindow,
          max: 3
        });
        expect(result.allowed).toBe(true);
      }

      // Should be blocked
      const blockedResult = mentorshipSecurityService.checkRateLimit(userId, action, {
        windowMs: shortWindow,
        max: 3
      });
      expect(blockedResult.allowed).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, shortWindow + 10));

      // Should be allowed again
      const allowedResult = mentorshipSecurityService.checkRateLimit(userId, action, {
        windowMs: shortWindow,
        max: 3
      });
      expect(allowedResult.allowed).toBe(true);
    });

    it('should get rate limit status', () => {
      const userId = testMentee.id;
      const action = 'status_test';

      // Make some requests
      for (let i = 0; i < 2; i++) {
        mentorshipSecurityService.checkRateLimit(userId, action, {
          windowMs: 60000,
          max: 5
        });
      }

      const status = mentorshipSecurityService.getRateLimitStatus(userId, action);

      expect(status.allowed).toBe(true);
      expect(status.remaining).toBe(3);
      expect(status.resetTime).toBeGreaterThan(Date.now());
    });
  });

  describe('Content Moderation', () => {
    it('should detect inappropriate content', async () => {
      const inappropriateContent = 'This content contains HATE speech and promotes VIOLENCE against others. It is also a SCAM and FRAUD attempt.';

      const moderation = await mentorshipSecurityService.moderateContent(inappropriateContent);

      expect(moderation.approved).toBe(false);
      expect(moderation.score).toBeGreaterThan(50);
      expect(moderation.flags).toContain('inappropriate_content');
    });

    it('should detect personal information', async () => {
      const contentWithPII = 'My email is john.doe@example.com and my phone is 555-123-4567. My credit card is 4111-1111-1111-1111.';

      const moderation = await mentorshipSecurityService.moderateContent(contentWithPII);

      expect(moderation.flags).toContain('personal_information');
      expect(moderation.filteredContent).toContain('[REDACTED]');
      expect(moderation.filteredContent).not.toContain('john.doe@example.com');
      expect(moderation.filteredContent).not.toContain('555-123-4567');
      expect(moderation.filteredContent).not.toContain('4111-1111-1111-1111');
    });

    it('should detect excessive capitalization', async () => {
      const shoutingContent = 'THIS IS ALL CAPS AND I AM SHOUTING VERY LOUDLY!!!';

      const moderation = await mentorshipSecurityService.moderateContent(shoutingContent);

      expect(moderation.flags).toContain('excessive_capitalization');
      expect(moderation.score).toBeGreaterThan(0);
    });

    it('should detect repetitive content', async () => {
      const repetitiveContent = 'spam spam spam spam spam spam spam spam spam spam spam spam';

      const moderation = await mentorshipSecurityService.moderateContent(repetitiveContent);

      expect(moderation.flags).toContain('repetitive_content');
      expect(moderation.score).toBeGreaterThan(0);
    });

    it('should approve clean content', async () => {
      const cleanContent = 'This is a normal message with appropriate language and no personal information. I would like to learn about JavaScript programming.';

      const moderation = await mentorshipSecurityService.moderateContent(cleanContent);

      expect(moderation.approved).toBe(true);
      expect(moderation.score).toBe(0);
      expect(moderation.flags).toHaveLength(0);
      expect(moderation.filteredContent).toBe(cleanContent);
    });

    it('should sanitize HTML content', () => {
      const maliciousHTML = `
        <div>
          <script>alert('xss')</script>
          <iframe src="malicious.com"></iframe>
          <object data="virus.exe"></object>
          <embed src="malware.swf"></embed>
          <p onclick="javascript:alert('click')">Normal content</p>
          <a href="javascript:alert('link')">Link</a>
        </div>
      `;

      const sanitized = mentorshipSecurityService.sanitizeHtml(maliciousHTML);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('<iframe>');
      expect(sanitized).not.toContain('<object>');
      expect(sanitized).not.toContain('<embed>');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('onclick=');
      expect(sanitized).toContain('<p>Normal content</p>');
    });
  });

  describe('Access Control', () => {
    it('should check data access permissions correctly', () => {
      // Test valid permissions
      const mentorReadAccess = mentorshipSecurityService.checkDataAccess(
        testMentor.id,
        'mentor_profile',
        testMentor.id,
        'read'
      );
      expect(mentorReadAccess.allowed).toBe(true);

      // Test invalid resource type
      const invalidResource = mentorshipSecurityService.checkDataAccess(
        testUser.id,
        'invalid_resource',
        1,
        'read'
      );
      expect(invalidResource.allowed).toBe(false);
      expect(invalidResource.reason).toBe('Invalid resource type or action');
    });

    it('should generate and verify secure tokens', () => {
      const payload = {
        userId: testMentor.id,
        role: 'MENTOR',
        permissions: ['read', 'write']
      };

      const token = mentorshipSecurityService.generateSecureToken(payload);

      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3);

      const verified = mentorshipSecurityService.verifySecureToken(token);

      expect(verified.userId).toBe(payload.userId);
      expect(verified.role).toBe(payload.role);
      expect(verified.permissions).toEqual(payload.permissions);
    });

    it('should reject expired tokens', () => {
      const payload = {
        userId: testUser.id,
        role: 'USER',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };

      const token = mentorshipSecurityService.generateSecureToken(payload);

      expect(() => {
        mentorshipSecurityService.verifySecureToken(token);
      }).toThrow();
    });

    it('should reject tokens with invalid signatures', () => {
      const payload = {
        userId: testMentee.id,
        role: 'USER'
      };

      const token = mentorshipSecurityService.generateSecureToken(payload);
      const tamperedToken = token.slice(0, -1) + 'X'; // Tamper with signature

      expect(() => {
        mentorshipSecurityService.verifySecureToken(tamperedToken);
      }).toThrow();
    });
  });

  describe('Privacy Controls', () => {
    it('should apply privacy settings to user data', () => {
      const userData = {
        id: 123,
        name: 'John Doe',
        email: 'john@example.com',
        location: 'New York, USA',
        timezone: 'America/New_York',
        yearsOfExperience: 5,
        company: 'Tech Corp'
      };

      const privacySettings = {
        hideRealName: true,
        hideEmail: true,
        hideLocation: true,
        hideExperience: true
      };

      const filtered = mentorshipSecurityService.applyPrivacySettings(userData, privacySettings);

      expect(filtered.displayName).toBe('J*** D***');
      expect(filtered.name).toBeUndefined();
      expect(filtered.email).toBeUndefined();
      expect(filtered.location).toBeUndefined();
      expect(filtered.timezone).toBeUndefined();
      expect(filtered.yearsOfExperience).toBeUndefined();
      expect(filtered.company).toBeUndefined();
      expect(filtered.id).toBe(123); // Non-private data should remain
    });

    it('should generate display names correctly', () => {
      expect(mentorshipSecurityService.generateDisplayName('John Doe')).toBe('J*** D***');
      expect(mentorshipSecurityService.generateDisplayName('Jane')).toBe('J***');
      expect(mentorshipSecurityService.generateDisplayName('')).toBe('Anonymous User');
      expect(mentorshipSecurityService.generateDisplayName(null)).toBe('Anonymous User');
    });
  });

  describe('Authorization Middleware', () => {
    it('should check role permissions correctly', () => {
      expect(mentorshipAuth.hasPermission('USER', 'create_mentee_profile')).toBe(true);
      expect(mentorshipAuth.hasPermission('USER', 'create_mentor_profile')).toBe(false);
      expect(mentorshipAuth.hasPermission('MENTOR', 'create_mentor_profile')).toBe(true);
      expect(mentorshipAuth.hasPermission('MENTOR', 'verify_mentors')).toBe(false);
      expect(mentorshipAuth.hasPermission('ADMIN', 'verify_mentors')).toBe(true);
    });

    it('should handle multiple role requirements', () => {
      const allowedRoles = ['USER', 'MENTOR', 'ADMIN'];
      
      expect(mentorshipAuth.hasPermission('USER', 'view_public_mentors')).toBe(true);
      expect(mentorshipAuth.hasPermission('MENTOR', 'view_public_mentors')).toBe(true);
      expect(mentorshipAuth.hasPermission('ADMIN', 'view_public_mentors')).toBe(true);
    });

    it('should reject invalid permissions', () => {
      expect(mentorshipAuth.hasPermission('USER', 'invalid_permission')).toBe(false);
      expect(mentorshipAuth.hasPermission('INVALID_ROLE', 'view_public_mentors')).toBe(false);
    });
  });

  describe('Audit Logging', () => {
    it('should log security events with proper severity', () => {
      const highRiskEvent = mentorshipSecurityService.logSecurityEvent('account_takeover_attempt', {
        userId: testUser.id,
        ip: '127.0.0.1',
        userAgent: 'Test Agent'
      });

      expect(highRiskEvent.severity).toBe('HIGH');
      expect(highRiskEvent.event).toBe('account_takeover_attempt');
      expect(highRiskEvent.timestamp).toBeDefined();
      expect(highRiskEvent.id).toBeDefined();

      const mediumRiskEvent = mentorshipSecurityService.logSecurityEvent('rate_limit_exceeded', {
        userId: testMentor.id,
        action: 'mentorship_request'
      });

      expect(mediumRiskEvent.severity).toBe('MEDIUM');

      const lowRiskEvent = mentorshipSecurityService.logSecurityEvent('content_moderated', {
        userId: testMentee.id,
        contentType: 'text'
      });

      expect(lowRiskEvent.severity).toBe('LOW');
    });

    it('should anonymize data in audit logs', () => {
      const sensitiveData = {
        userId: testUser.id,
        email: 'user@example.com',
        name: 'John Doe',
        phoneNumber: '+1234567890'
      };

      const auditLog = mentorshipSecurityService.logSecurityEvent('test_event', sensitiveData);

      expect(auditLog.data.email).toBeUndefined();
      expect(auditLog.data.name).toBeUndefined();
      expect(auditLog.data.phoneNumber).toBeUndefined();
      expect(auditLog.data.emailHash).toBeDefined();
      expect(auditLog.data.nameInitial).toBeDefined();
    });
  });
});
