import dotenv from 'dotenv';
import dotenv from 'dotenv';
import { jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { cacheService } from '../src/cache/cache.service.js';
import redisManager from '../src/config/redis.js';

dotenv.config();

// Set test environment
process.env.NODE_ENV = 'test';

// Global test instances
const prisma = new PrismaClient();

// Global test setup
beforeAll(async () => {
  // Initialize database connection for tests
  try {
    await prisma.$connect();
  } catch (error) {
    console.error('Failed to connect to database for tests:', error);
  }
  // Disable console logs during tests unless explicitly needed
  if (process.env.VERBOSE_TESTS !== 'true') {
    global.console = {
      ...console,
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  }
});

afterAll(async () => {
  // Cleanup after all tests
  
  // Close Prisma connection
  await prisma.$disconnect();
  
  // Close Redis connections
  try {
    if (redisManager && redisManager.client && redisManager.client.isOpen) {
      await redisManager.client.quit();
    }
  } catch (error) {
    // Ignore cleanup errors
  }
  jest.clearAllMocks();
});

beforeEach(async () => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

afterEach(async () => {
  // Cleanup after each test
  // Note: Individual test files handle their own cleanup
});
