import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import redisManager from '../src/config/redis.js';
import { cleanupPrismaMetrics } from '../src/config/prisma.js';

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
});

afterAll(async () => {
  // Cleanup after all tests
  
  // Clear Prisma metrics interval
  cleanupPrismaMetrics();
  
  // Close Prisma connection
  await prisma.$disconnect();
  
  // Close Redis connections
  try {
    if (redisManager?.client?.isOpen) {
      await redisManager.client.quit();
    }
  } catch (error) {
    // Ignore cleanup errors
  }
});
