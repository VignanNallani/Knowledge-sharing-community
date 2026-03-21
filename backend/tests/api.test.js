import request from 'supertest';
import { describe, it, expect } from '@jest/globals';
import dotenv from 'dotenv';
dotenv.config();

// Test the server directly
const app = 'http://localhost:4000';

describe('Basic API Health Check', () => {
  it('should respond to health check', async () => {
    const res = await request(app).get('/health');
    
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success');
    expect(res.body).toHaveProperty('data');
  });

  it('should return 404 for non-existent route', async () => {
    const res = await request(app).get('/non-existent-route');
    
    expect(res.statusCode).toBe(404);
  });
});

describe('Authentication Endpoints', () => {
  let userToken;
  const testUser = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'Password@123'
  };

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user.email).toBe(testUser.email);
    
    userToken = res.body.data.accessToken;
  });

  it('should login the user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
  });

  it('should refresh token', async () => {
    // First login to get refresh token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    const refreshToken = loginRes.body.data.refreshToken;
    
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
  });

  it('should require authentication for protected routes', async () => {
    const res = await request(app)
      .get('/api/v1/posts');

    expect(res.statusCode).toBe(401);
  });

  it('should access protected route with valid token', async () => {
    const res = await request(app)
      .get('/api/v1/posts')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
  });

  it('should create a post', async () => {
    const res = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Test Post',
        content: 'This is a test post content'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.title).toBe('Test Post');
    expect(res.body.data.content).toBe('This is a test post content');
  });

  it('should search posts', async () => {
    const res = await request(app)
      .get('/api/v1/posts/search?q=Test')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should logout user', async () => {
    // First login to get refresh token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    const refreshToken = loginRes.body.data.refreshToken;
    
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.revoked).toBe(true);
  });
});
