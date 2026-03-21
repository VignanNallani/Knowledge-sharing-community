import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';
import path from 'path';

// Force load the .env file from the current directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Debug: Log what was loaded
console.log('ENV.JS DEBUG:');
console.log('JWT_SECRET loaded:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);
console.log('NODE_ENV:', process.env.NODE_ENV);

const required = [
  'PORT',
  'DATABASE_URL',
  'JWT_SECRET',
  'NODE_ENV',
];

const optional = [
  'REDIS_URL',
  'RATE_LIMIT_WINDOW',
  'RATE_LIMIT_MAX',
];

required.forEach((key) => {
  if (!process.env[key]) {
    logger.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

const env = {
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  REDIS_URL: process.env.REDIS_URL,
  RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || 15,
  RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX || 100,
};

export default env;

