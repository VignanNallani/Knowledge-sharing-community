/**
 * Error Handling Test Suite
 * Tests all error types and response formats
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

describe('Error Handling', () => {
  describe('Validation Errors (400)', () => {
    it('should return 400 with validation error format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: '123' // too short
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        timestamp: expect.any(String)
      });
      expect(response.body.errors).toBeDefined();
      expect(Array.isArray(response.body.errors)).toBe(true);

      // Check correlation IDs
      expect(response.body.correlation).toBeDefined();
      expect(response.body.correlation.requestId).toBeDefined();
      expect(response.body.correlation.traceId).toBeDefined();
      expect(response.body.correlation.spanId).toBeDefined();

      // Check debug info in development
      if (process.env.NODE_ENV === 'development') {
        expect(response.body.debug).toBeDefined();
        expect(response.body.debug.stack).toBeDefined();
        expect(response.body.debug.name).toBeDefined();
        expect(response.body.debug.isOperational).toBeDefined();
        expect(response.body.debug.statusCode).toBe(400);
      }
    });
  });

  describe('Authentication Errors (401)', () => {
    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        code: 'UNAUTHORIZED',
        message: expect.any(String),
        timestamp: expect.any(String)
      });

      // Check correlation IDs
      expect(response.body.correlation).toBeDefined();
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        code: 'UNAUTHORIZED',
        message: expect.any(String)
      });
    });
  });

  describe('Authorization Errors (403)', () => {
    it('should return 403 for insufficient permissions', async () => {
      // Create a regular user token (mock for testing)
      const userToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwicm9sZSI6IlVTRVIiLCJpYXQiOjE2MzQ3ODk2MDAsImV4cCI6MjUzNDc5MzIwMH0.mock';

      const response = await request(app)
        .get('/api/v1/admin/pending-posts')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        code: 'FORBIDDEN',
        message: expect.any(String)
      });
    });
  });

  describe('Not Found Errors (404)', () => {
    it('should return 404 for non-existent resource', async () => {
      const response = await request(app)
        .get('/api/v1/posts/999999');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        code: 'NOT_FOUND',
        message: 'Post not found',
        timestamp: expect.any(String)
      });

      // Check correlation IDs
      expect(response.body.correlation).toBeDefined();
    });
  });

  describe('Rate Limiting (429)', () => {
    it('should return 429 with proper headers', async () => {
      // Make multiple requests to trigger rate limit
      const promises = Array(150).fill().map(() =>
        request(app).get('/api/v1/posts')
      );

      const responses = await Promise.all(promises);
      const rateLimitedResponse = responses.find(res => res.status === 429);

      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse.status).toBe(429);
      expect(rateLimitedResponse.body).toMatchObject({
        success: false,
        code: 'RATE_LIMITED',
        message: expect.any(String)
      });

      // Check Retry-After header
      expect(rateLimitedResponse.headers['retry-after']).toBeDefined();

      // Check rate limit info in response
      expect(rateLimitedResponse.body.rateLimit).toBeDefined();
      expect(rateLimitedResponse.body.rateLimit.retryAfter).toBeDefined();
    });
  });

  describe('Internal Server Errors (500)', () => {
    it('should return 500 for unexpected errors', async () => {
      // This would need a test endpoint that throws an error
      // For now, we'll test with a malformed request that might cause internal error
      const response = await request(app)
        .post('/api/v1/observability/error')
        .send({}); // This should trigger our test error endpoint

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        code: 'INTERNAL_ERROR',
        message: expect.any(String)
      });

      // Check correlation IDs
      expect(response.body.correlation).toBeDefined();
    });
  });

  describe('Error Response Format Consistency', () => {
    it('should have consistent format across all error types', async () => {
      const testCases = [
        {
          name: 'Validation Error',
          request: () => request(app)
            .post('/api/v1/auth/register')
            .send({ email: 'invalid' }),
          expectedCode: 'VALIDATION_ERROR'
        },
        {
          name: 'Not Found Error',
          request: () => request(app).get('/api/v1/posts/999999'),
          expectedCode: 'NOT_FOUND'
        }
      ];

      for (const testCase of testCases) {
        const response = await testCase.request();

        // Check base structure
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('code');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('timestamp');

        // Check correlation structure
        if (response.body.correlation) {
          expect(response.body.correlation).toHaveProperty('requestId');
          expect(response.body.correlation).toHaveProperty('traceId');
          expect(response.body.correlation).toHaveProperty('spanId');
        }

        // Check debug structure in development
        if (process.env.NODE_ENV === 'development' && response.body.debug) {
          expect(response.body.debug).toHaveProperty('stack');
          expect(response.body.debug).toHaveProperty('name');
          expect(response.body.debug).toHaveProperty('isOperational');
          expect(response.body.debug).toHaveProperty('statusCode');
        }
      }
    });
  });

  describe('Production Mode Error Sanitization', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should hide stack traces in production', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/v1/posts/999999');

      expect(response.status).toBe(404);
      expect(response.body.debug).toBeUndefined();
    });

    it('should sanitize internal errors in production', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .post('/api/v1/observability/error')
        .send({});

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal Server Error');
      expect(response.body.code).toBe('INTERNAL_ERROR');
      expect(response.body.debug).toBeUndefined();
    });
  });

  describe('Error Code Registry', () => {
    it('should use centralized error codes', async () => {
      const { ERROR_CODES } = await import('../src/errors/errorCodes.js');
      
      // Test that error codes are from the registry
      const response = await request(app)
        .get('/api/v1/posts/999999');

      expect(response.body.code).toBe(ERROR_CODES.NOT_FOUND);
      expect(Object.values(ERROR_CODES)).toContain(response.body.code);
    });
  });
});
