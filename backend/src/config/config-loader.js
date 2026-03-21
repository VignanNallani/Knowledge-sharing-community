import env from './env.js';
import logger from './logger.js';

class ConfigLoader {
  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  loadConfig() {
    const nodeEnv = env.NODE_ENV || 'development';
    
    const baseConfig = {
      // Server
      port: parseInt(env.PORT) || 3000,
      nodeEnv,
      isDevelopment: nodeEnv === 'development',
      isProduction: nodeEnv === 'production',
      isTest: nodeEnv === 'test',

      // Database
      database: {
        url: env.DATABASE_URL,
        ssl: nodeEnv === 'production',
        connectionTimeout: 30000,
        queryTimeout: 10000,
      },

      // JWT
      jwt: {
        secret: env.JWT_SECRET,
        expiresIn: env.JWT_EXPIRES_IN || '7d',
        issuer: 'knowledge-sharing-api',
        audience: 'knowledge-sharing-client',
      },

      // Redis
      redis: {
        url: env.REDIS_URL,
        enabled: !!env.REDIS_URL,
        keyPrefix: 'ks:',
        ttl: 3600,
      },

      // Rate Limiting
      rateLimit: {
        windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        max: parseInt(env.RATE_LIMIT_MAX_REQUESTS) || 100,
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      },

      // CORS
      cors: {
        origin: this.getCorsOrigins(),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      },

      // File Upload
      upload: {
        maxSize: parseInt(env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
        path: env.UPLOAD_PATH || './uploads',
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      },

      // Email
      email: {
        enabled: !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS),
        host: env.SMTP_HOST,
        port: parseInt(env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      },

      // Logging
      logging: {
        level: env.LOG_LEVEL || 'info',
        file: env.LOG_FILE || './logs/app.log',
        maxSize: '10m',
        maxFiles: 5,
      },

      // Security
      security: {
        bcryptRounds: parseInt(env.BCRYPT_ROUNDS) || 12,
        sessionSecret: env.SESSION_SECRET,
        maxRequestSize: '10mb',
        helmet: {
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", "data:", "https:"],
            },
          },
        },
      },

      // API
      api: {
        version: env.API_VERSION || 'v1',
        prefix: env.API_PREFIX || '/api',
        docsPath: '/api/docs',
        healthPath: '/health',
      },

      // Health Check
      health: {
        interval: parseInt(env.HEALTH_CHECK_INTERVAL) || 30000,
        timeout: 5000,
        retries: 3,
      },

      // Development
      development: {
        debugMode: env.DEBUG_MODE === 'true',
        mockExternalApis: env.MOCK_EXTERNAL_APIS === 'true',
        slowQueries: env.NODE_ENV === 'development',
      },
    };

    return baseConfig;
  }

  getCorsOrigins() {
    const frontendUrl = env.FRONTEND_URL;
    if (!frontendUrl) {
      return this.config?.isDevelopment ? ['http://localhost:5173', 'http://localhost:3000'] : [];
    }
    
    return Array.isArray(frontendUrl) ? frontendUrl : [frontendUrl];
  }

  validateConfig() {
    const requiredFields = [
      'database.url',
      'jwt.secret',
    ];

    const missing = requiredFields.filter(field => {
      const value = field.split('.').reduce((obj, key) => obj?.[key], this.config);
      return !value;
    });

    if (missing.length > 0) {
      const error = `Missing required configuration: ${missing.join(', ')}`;
      logger.error(error);
      throw new Error(error);
    }

    // Validate JWT secret strength
    if (this.config.jwt.secret.length < 32) {
      logger.warn('JWT_SECRET should be at least 32 characters long');
    }

    // Validate production settings
    if (this.config.isProduction) {
      const prodWarnings = [];
      
      if (!this.config.redis.enabled) {
        prodWarnings.push('Redis is not enabled - recommended for production');
      }
      
      if (!this.config.email.enabled) {
        prodWarnings.push('Email is not configured');
      }

      if (prodWarnings.length > 0) {
        logger.warn('Production warnings:', prodWarnings.join(', '));
      }
    }
  }

  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.config);
  }

  getAll() {
    return { ...this.config };
  }

  isProduction() {
    return this.config.isProduction;
  }

  isDevelopment() {
    return this.config.isDevelopment;
  }
}

// Singleton instance
const configLoader = new ConfigLoader();

export default configLoader;
