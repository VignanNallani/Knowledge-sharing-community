import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import dotenv from 'dotenv';
dotenv.config();

// Import app directly from src folder
import { app } from '../src/app.js';
import prisma from '../src/config/prisma.js';

describe('Core API Integration Tests', () => {
  let user1Token, user2Token;
  let user1, user2;
  let post1, post2;
  let comment1, comment2;

  beforeAll(async () => {
    // Clean up test data
    await prisma.refreshToken.deleteMany({});
    await prisma.like.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.post.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { contains: 'test-integration' } }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.refreshToken.deleteMany({});
    await prisma.like.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.post.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { contains: 'test-integration' } }
    });
    await prisma.$disconnect();
  });

  describe('Authentication Flow', () => {
    it('should register user 1', async () => {
      const unique = Date.now();
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Test User 1',
        email: `test-integration-1-${unique}@example.com`,
        password: 'Password@123',
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.email).toBe(`test-integration-1-${unique}@example.com`);
      
      user1Token = res.body.data.accessToken;
      user1 = res.body.data.user;
    });

    it('should register user 2', async () => {
      const unique = Date.now();
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Test User 2',
        email: `test-integration-2-${unique}@example.com`,
        password: 'Password@123',
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      
      user2Token = res.body.data.accessToken;
      user2 = res.body.data.user;
    });

    it('should login user 1', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: user1.email,
        password: 'Password@123',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      
      user1Token = res.body.data.accessToken;
    });

    it('should refresh access token', async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: user1.email,
        password: 'Password@123',
      });

      const refreshToken = loginRes.body.data.refreshToken;
      
      const res = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.accessToken).not.toBe(loginRes.body.data.accessToken);
    });

    it('should logout user', async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: user1.email,
        password: 'Password@123',
      });

      const refreshToken = loginRes.body.data.refreshToken;
      
      const res = await request(app).post('/api/v1/auth/logout').send({
        refreshToken,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.revoked).toBe(true);
    });
  });

  describe('Posts CRUD', () => {
    it('should create post 1', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ 
          title: 'Test Post 1', 
          content: 'This is test post 1 content',
          image: 'https://example.com/image1.jpg'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.title).toBe('Test Post 1');
      expect(res.body.data.authorId).toBe(user1.id);
      
      post1 = res.body.data;
    });

    it('should create post 2', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ 
          title: 'Test Post 2', 
          content: 'This is test post 2 content'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.title).toBe('Test Post 2');
      expect(res.body.data.authorId).toBe(user2.id);
      
      post2 = res.body.data;
    });

    it('should get all posts with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/posts?page=1&limit=10')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
    });

    it('should get post by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/posts/${post1.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.id).toBe(post1.id);
      expect(res.body.data.title).toBe('Test Post 1');
    });

    it('should search posts', async () => {
      const res = await request(app)
        .get('/api/v1/posts/search?q=Test')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(2);
    });

    it('should update post', async () => {
      const res = await request(app)
        .put(`/api/v1/posts/${post1.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ 
          title: 'Updated Test Post 1',
          content: 'Updated content for post 1'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.title).toBe('Updated Test Post 1');
      expect(res.body.data.content).toBe('Updated content for post 1');
    });

    it('should get posts by author', async () => {
      const res = await request(app)
        .get(`/api/v1/posts/author/${user1.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].authorId).toBe(user1.id);
    });
  });

  describe('Comments CRUD', () => {
    it('should create comment on post 1', async () => {
      const res = await request(app)
        .post(`/api/v1/comments/post/${post1.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ content: 'Great post! Very informative.' });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.content).toBe('Great post! Very informative.');
      expect(res.body.data.postId).toBe(post1.id);
      
      comment1 = res.body.data;
    });

    it('should create comment on post 2', async () => {
      const res = await request(app)
        .post(`/api/v1/comments/post/${post2.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ content: 'Interesting perspective!' });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.content).toBe('Interesting perspective!');
      expect(res.body.data.postId).toBe(post2.id);
      
      comment2 = res.body.data;
    });

    it('should get comments for post 1', async () => {
      const res = await request(app)
        .get(`/api/v1/comments/post/${post1.id}?page=1&limit=10`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(comment1.id);
      expect(res.body.pagination).toBeDefined();
    });

    it('should reply to comment', async () => {
      const res = await request(app)
        .post(`/api/v1/comments/reply/${comment1.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ content: 'Thanks for your feedback!' });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.content).toBe('Thanks for your feedback!');
      expect(res.body.data.postId).toBe(post1.id);
    });

    it('should update comment', async () => {
      const res = await request(app)
        .put(`/api/v1/comments/${comment1.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ content: 'Updated: Great post! Very informative.' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.content).toBe('Updated: Great post! Very informative.');
    });

    it('should delete comment', async () => {
      const res = await request(app)
        .delete(`/api/v1/comments/${comment2.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);
    });
  });

  describe('Like System', () => {
    it('should like post 1', async () => {
      const res = await request(app)
        .post(`/api/v1/posts/${post1.id}/like`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.liked).toBe(true);
    });

    it('should unlike post 1', async () => {
      const res = await request(app)
        .post(`/api/v1/posts/${post1.id}/like`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.liked).toBe(false);
    });

    it('should like post 1 again', async () => {
      const res = await request(app)
        .post(`/api/v1/posts/${post1.id}/like`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.liked).toBe(true);
    });

    it('should like comment', async () => {
      const res = await request(app)
        .post(`/api/v1/comments/like/${comment1.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.isLiked).toBe(true);
    });

    it('should unlike comment', async () => {
      const res = await request(app)
        .post(`/api/v1/comments/like/${comment1.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.isLiked).toBe(false);
    });
  });

  describe('Follow System', () => {
    it('should follow user 2', async () => {
      const res = await request(app)
        .post(`/api/v1/follow/${user2.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(201);
      expect(res.body.data.followingId).toBe(user2.id);
      expect(res.body.data.followerId).toBe(user1.id);
    });

    it('should get followers of user 2', async () => {
      const res = await request(app)
        .get(`/api/v1/follow/followers/${user2.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].followerId).toBe(user1.id);
    });

    it('should get following of user 1', async () => {
      const res = await request(app)
        .get(`/api/v1/follow/following/${user1.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].followingId).toBe(user2.id);
    });

    it('should check follow status', async () => {
      const res = await request(app)
        .get(`/api/v1/follow/is-following/${user2.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.isFollowing).toBe(true);
    });

    it('should unfollow user 2', async () => {
      const res = await request(app)
        .delete(`/api/v1/follow/${user2.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.unfollowed).toBe(true);
    });
  });

  describe('Delete Operations', () => {
    it('should delete post 1', async () => {
      const res = await request(app)
        .delete(`/api/v1/posts/${post1.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);
    });

    it('should delete post 2', async () => {
      const res = await request(app)
        .delete(`/api/v1/posts/${post2.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for unauthorized access', async () => {
      const res = await request(app)
        .get('/api/v1/posts');

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 for non-existent post', async () => {
      const res = await request(app)
        .get('/api/v1/posts/99999')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid input', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ title: '' }); // Empty title

      expect(res.statusCode).toBe(400);
    });
  });
});
