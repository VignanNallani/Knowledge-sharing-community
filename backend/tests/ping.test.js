import request from 'supertest';
import { describe, it, expect } from '@jest/globals';
import dotenv from 'dotenv';
dotenv.config();

import { app } from '../index.js';

describe('GET /ping', () => {
  it('responds with alive message', async () => {
    const res = await request(app).get('/ping');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
  });
});
