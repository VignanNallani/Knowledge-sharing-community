import env from './env.js';
import { logger } from './logger.js';
import { structuredLogger } from './structured-logger.js';

// Configuration validation
export const validateConfig = () => {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'NODE_ENV'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate JWT secret in production
  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }

  logger.info('Configuration validated successfully');
};

export { env, logger, structuredLogger };

