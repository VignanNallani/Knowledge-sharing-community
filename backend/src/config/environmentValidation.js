import { logger } from './index.js';
import { writeFileSync } from 'fs';

/**
 * Environment Validation for Production Deployment
 * Validates all required environment variables and configurations
 */
export class EnvironmentValidation {
  constructor() {
    this.requiredVars = new Map();
    this.optionalVars = new Map();
    this.validationRules = new Map();
    this.setupValidationRules();
  }

  /**
   * Setup validation rules for environment variables
   */
  setupValidationRules() {
    // Required variables for production
    this.requiredVars.set('NODE_ENV', {
      description: 'Application environment (development, production, test)',
      validator: (value) => ['development', 'production', 'test'].includes(value),
      errorMessage: 'NODE_ENV must be one of: development, production, test'
    });

    this.requiredVars.set('DATABASE_URL', {
      description: 'PostgreSQL database connection string',
      validator: (value) => {
        if (!value) return false;
        try {
          new URL(value);
          return value.includes('postgresql://');
        } catch {
          return false;
        }
      },
      errorMessage: 'DATABASE_URL must be a valid PostgreSQL connection string'
    });

    this.requiredVars.set('JWT_SECRET', {
      description: 'Secret key for JWT token signing',
      validator: (value) => value && typeof value === 'string' && value.length >= 32,
      errorMessage: 'JWT_SECRET must be at least 32 characters long'
    });

    this.requiredVars.set('REDIS_URL', {
      description: 'Redis connection URL',
      validator: (value) => {
        if (!value) return false;
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      errorMessage: 'REDIS_URL must be a valid URL'
    });

    // Optional variables with defaults
    this.optionalVars.set('PORT', {
      description: 'Server port number',
      defaultValue: 4000,
      validator: (value) => {
        const port = parseInt(value, 10);
        return !isNaN(port) && port > 0 && port < 65536;
      },
      errorMessage: 'PORT must be a valid port number (1-65535)'
    });

    this.optionalVars.set('FRONTEND_URL', {
      description: 'Frontend application URL',
      defaultValue: 'http://localhost:5173',
      validator: (value) => {
        if (!value) return true;
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      errorMessage: 'FRONTEND_URL must be a valid URL'
    });

    this.optionalVars.set('LOG_LEVEL', {
      description: 'Logging level',
      defaultValue: 'info',
      validator: (value) => ['error', 'warn', 'info', 'debug'].includes(value),
      errorMessage: 'LOG_LEVEL must be one of: error, warn, info, debug'
    });

    this.optionalVars.set('ENABLE_METRICS', {
      description: 'Enable metrics collection',
      defaultValue: 'true',
      validator: (value) => ['true', 'false'].includes(value),
      errorMessage: 'ENABLE_METRICS must be true or false'
    });

    this.optionalVars.set('ENABLE_CACHE_WARMUP', {
      description: 'Enable cache warmup',
      defaultValue: 'false',
      validator: (value) => ['true', 'false'].includes(value),
      errorMessage: 'ENABLE_CACHE_WARMUP must be true or false'
    });

    // Production-specific variables
    this.optionalVars.set('ENFORCE_HTTPS', {
      description: 'Enforce HTTPS in production',
      defaultValue: 'false',
      validator: (value) => ['true', 'false'].includes(value),
      errorMessage: 'ENFORCE_HTTPS must be true or false',
      productionOnly: true
    });

    this.optionalVars.set('ENABLE_MFA', {
      description: 'Enable multi-factor authentication',
      defaultValue: 'false',
      validator: (value) => ['true', 'false'].includes(value),
      errorMessage: 'ENABLE_MFA must be true or false',
      productionOnly: true
    });

    this.optionalVars.set('RATE_LIMIT_WINDOW_MS', {
      description: 'Rate limiting window in milliseconds',
      defaultValue: '900000',
      validator: (value) => {
        const num = parseInt(value, 10);
        return !isNaN(num) && num > 0;
      },
      errorMessage: 'RATE_LIMIT_WINDOW_MS must be a positive number'
    });

    this.optionalVars.set('RATE_LIMIT_MAX_REQUESTS', {
      description: 'Maximum requests per rate limit window',
      defaultValue: '100',
      validator: (value) => {
        const num = parseInt(value, 10);
        return !isNaN(num) && num > 0 && num <= 1000;
      },
      errorMessage: 'RATE_LIMIT_MAX_REQUESTS must be between 1 and 1000'
    });
  }

  /**
   * Validate all environment variables
   */
  validate() {
    const errors = [];
    const warnings = [];
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    };

    // Validate required variables
    for (const [varName, config] of this.requiredVars.entries()) {
      const value = process.env[varName];
      
      if (!value) {
        errors.push({
          variable: varName,
          message: `Required environment variable ${varName} is missing`,
          description: config.description,
          severity: 'critical'
        });
        continue;
      }

      if (!config.validator(value)) {
        errors.push({
          variable: varName,
          message: config.errorMessage || `Invalid value for ${varName}`,
          description: config.description,
          currentValue: this.maskValue(varName, value),
          severity: 'critical'
        });
      }
    }

    // Validate optional variables
    for (const [varName, config] of this.optionalVars.entries()) {
      const value = process.env[varName];
      
      // Skip production-only variables in non-production environments
      if (config.productionOnly && process.env.NODE_ENV !== 'production') {
        continue;
      }

      if (!value) {
        warnings.push({
          variable: varName,
          message: `Optional environment variable ${varName} not set, using default: ${config.defaultValue}`,
          description: config.description,
          defaultValue: config.defaultValue,
          severity: 'info'
        });
        continue;
      }

      if (!config.validator(value)) {
        errors.push({
          variable: varName,
          message: config.errorMessage || `Invalid value for ${varName}`,
          description: config.description,
          currentValue: this.maskValue(varName, value),
          severity: 'error'
        });
      }
    }

    // Additional security validations
    const securityValidations = this.performSecurityValidations();
    errors.push(...securityValidations.errors);
    warnings.push(...securityValidations.warnings);

    // Set overall validation status
    results.valid = errors.length === 0;
    results.errors = errors;
    results.warnings = warnings;

    // Log validation results
    if (results.valid) {
      logger.info('Environment validation passed', {
        warnings: warnings.length,
        environment: results.environment
      });
    } else {
      logger.error('Environment validation failed', {
        errors: errors.length,
        warnings: warnings.length,
        environment: results.environment
      });
    }

    return results;
  }

  /**
   * Perform security-specific validations
   */
  performSecurityValidations() {
    const errors = [];
    const warnings = [];

    // Check for weak secrets
    if (process.env.JWT_SECRET) {
      const weakSecrets = ['secret', 'password', 'jwt', 'token', 'key'];
      const jwtSecret = process.env.JWT_SECRET.toLowerCase();
      
      if (weakSecrets.some(weak => jwtSecret.includes(weak))) {
        errors.push({
          variable: 'JWT_SECRET',
          message: 'JWT_SECRET contains common weak words',
          severity: 'critical'
        });
      }

      if (jwtSecret.length < 64) {
        warnings.push({
          variable: 'JWT_SECRET',
          message: 'JWT_SECRET should be at least 64 characters for better security',
          severity: 'warning'
        });
      }
    }

    // Check database URL security
    if (process.env.DATABASE_URL) {
      const dbUrl = process.env.DATABASE_URL.toLowerCase();
      
      if (dbUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
        errors.push({
          variable: 'DATABASE_URL',
          message: 'DATABASE_URL should not use localhost in production',
          severity: 'critical'
        });
      }

      if (dbUrl.includes('password') && !dbUrl.includes('ssl')) {
        warnings.push({
          variable: 'DATABASE_URL',
          message: 'DATABASE_URL should use SSL/TLS for secure connections',
          severity: 'warning'
        });
      }
    }

    // Check for development settings in production
    if (process.env.NODE_ENV === 'production') {
      if (process.env.LOG_LEVEL === 'debug') {
        warnings.push({
          variable: 'LOG_LEVEL',
          message: 'Debug logging should not be enabled in production',
          severity: 'warning'
        });
      }

      if (process.env.ENFORCE_HTTPS !== 'true') {
        warnings.push({
          variable: 'ENFORCE_HTTPS',
          message: 'HTTPS should be enforced in production',
          severity: 'warning'
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Mask sensitive values in logs
   */
  maskValue(varName, value) {
    const sensitiveVars = ['JWT_SECRET', 'DATABASE_URL', 'REDIS_URL'];
    
    if (sensitiveVars.includes(varName)) {
      return value ? `${value.substring(0, 4)}${'*'.repeat(Math.min(value.length - 4, 8))}` : 'null';
    }
    
    return value;
  }

  /**
   * Get environment configuration summary
   */
  getEnvironmentSummary() {
    return {
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 4000,
      database: {
        configured: !!process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('ssl') || false
      },
      redis: {
        configured: !!process.env.REDIS_URL
      },
      security: {
        jwtConfigured: !!process.env.JWT_SECRET,
        httpsEnforced: process.env.ENFORCE_HTTPS === 'true',
        mfaEnabled: process.env.ENABLE_MFA === 'true'
      },
      features: {
        metricsEnabled: process.env.ENABLE_METRICS === 'true',
        cacheWarmupEnabled: process.env.ENABLE_CACHE_WARMUP === 'true'
      }
    };
  }

  /**
   * Generate environment configuration file template
   */
  generateTemplate() {
    const template = [
      '# Environment Configuration Template',
      '# Copy this file to .env and fill in your values',
      '',
      '# Application Environment',
      'NODE_ENV=development',
      '',
      '# Server Configuration',
      'PORT=4000',
      'FRONTEND_URL=http://localhost:5173',
      '',
      '# Database Configuration',
      'DATABASE_URL=postgresql://username:password@localhost:5432/database_name',
      '',
      '# Redis Configuration',
      'REDIS_URL=redis://localhost:6379',
      '',
      '# Security Configuration',
      'JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long',
      'ENFORCE_HTTPS=false',
      'ENABLE_MFA=false',
      '',
      '# Rate Limiting',
      'RATE_LIMIT_WINDOW_MS=900000',
      'RATE_LIMIT_MAX_REQUESTS=100',
      '',
      '# Features',
      'LOG_LEVEL=info',
      'ENABLE_METRICS=true',
      'ENABLE_CACHE_WARMUP=false'
    ];

    return template.join('\n');
  }

  /**
   * Export environment configuration
   */
  exportConfiguration(filePath) {
    const config = this.getEnvironmentSummary();
    const configJson = JSON.stringify(config, null, 2);
    
    try {
      writeFileSync(filePath, configJson);
      logger.info(`Environment configuration exported to ${filePath}`);
    } catch (error) {
      logger.error('Failed to export environment configuration:', error);
      throw error;
    }
  }
}

// Singleton instance
const environmentValidation = new EnvironmentValidation();

export default environmentValidation;
