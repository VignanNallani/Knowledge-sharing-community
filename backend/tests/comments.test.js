import request from 'supertest';
import { describe, it, expect } from '@jest/globals';
import dotenv from 'dotenv';
dotenv.config();

import { app } from '../index.js';

describe('Comments API', () => {
  let token;
  let postId;
  let commentId;

  it('registers and logs in a user', async () => {
    const unique = Date.now();
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: `test+${unique}@example.com`,
      password: 'password123',
    });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
  });

  it('creates a post', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Post', content: 'This is a test post content', tags: ['test'] });

    expect(res.statusCode).toBe(201);
    expect(res.body.post).toBeDefined();
    postId = res.body.post.id;
  });

  it('adds a comment to the post', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/comment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'This is a test comment' });

    expect(res.statusCode).toBe(201);
    expect(res.body.comment).toBeDefined();
    expect(res.body.comment.content).toBe('This is a test comment');
    commentId = res.body.comment.id;
  });

  it('fetches comments for the post', async () => {
    const res = await request(app)
      .get(`/api/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.comments).toBeInstanceOf(Array);
    const found = res.body.comments.find(c => c.id === commentId);
    expect(found).toBeDefined();
  });

  it('updates the comment', async () => {
    const res = await request(app)
      .put(`/api/comments/${commentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Updated comment text' });

    expect(res.statusCode).toBe(200);
    expect(res.body.comment).toBeDefined();
    expect(res.body.comment.content).toBe('Updated comment text');
  });

  it('deletes the comment', async () => {
    const res = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});
