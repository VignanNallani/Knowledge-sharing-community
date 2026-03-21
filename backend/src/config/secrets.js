import crypto from 'crypto';
import logger from './logger.js';

class SecretsManager {
  constructor() {
    this.encryptionKey = this.getOrCreateEncryptionKey();
    this.secrets = new Map();
  }

  getOrCreateEncryptionKey() {
    // In production, this should come from environment variables or a secrets manager
    const key = process.env.ENCRYPTION_KEY;
    if (key) {
      return Buffer.from(key, 'hex');
    }

    // For development, generate a key (but warn about it)
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable is required in production');
    }

    logger.warn('Using auto-generated encryption key for development. Set ENCRYPTION_KEY in production!');
    return crypto.randomBytes(32);
  }

  encrypt(text) {
    if (!text) return null;
    
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  decrypt(encryptedText) {
    if (!encryptedText) return null;
    
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  setSecret(key, value) {
    if (!key || !value) {
      throw new Error('Key and value are required');
    }
    
    const encrypted = this.encrypt(value);
    this.secrets.set(key, encrypted);
    logger.debug(`Secret stored for key: ${key}`);
  }

  getSecret(key) {
    if (!key) {
      throw new Error('Key is required');
    }
    
    const encrypted = this.secrets.get(key);
    if (!encrypted) {
      return null;
    }
    
    return this.decrypt(encrypted);
  }

  deleteSecret(key) {
    const deleted = this.secrets.delete(key);
    if (deleted) {
      logger.debug(`Secret deleted for key: ${key}`);
    }
    return deleted;
  }

  hasSecret(key) {
    return this.secrets.has(key);
  }

  // Utility methods for common secret patterns
  maskSensitiveData(data, fields = ['password', 'secret', 'token', 'key']) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const masked = { ...data };
    
    for (const field of fields) {
      if (masked[field]) {
        masked[field] = this.maskString(masked[field]);
      }
    }

    // Handle nested objects
    for (const key in masked) {
      if (typeof masked[key] === 'object' && masked[key] !== null) {
        masked[key] = this.maskSensitiveData(masked[key], fields);
      }
    }

    return masked;
  }

  maskString(str, visibleChars = 4) {
    if (!str || typeof str !== 'string') {
      return str;
    }
    
    if (str.length <= visibleChars) {
      return '*'.repeat(str.length);
    }
    
    return str.substring(0, visibleChars) + '*'.repeat(str.length - visibleChars);
  }

  // Environment-specific secret loading
  loadFromEnvironment() {
    const envSecrets = {
      'database.password': process.env.DB_PASSWORD,
      'jwt.secret': process.env.JWT_SECRET,
      'email.password': process.env.SMTP_PASS,
      'redis.password': process.env.REDIS_PASSWORD,
      'session.secret': process.env.SESSION_SECRET,
      'encryption.key': process.env.ENCRYPTION_KEY,
    };

    for (const [key, value] of Object.entries(envSecrets)) {
      if (value) {
        this.setSecret(key, value);
      }
    }

    logger.info(`Loaded ${Object.keys(envSecrets).filter(k => envSecrets[k]).length} secrets from environment`);
  }

  // Validate secret strength
  validateSecretStrength(secret, type = 'general') {
    const requirements = {
      'jwt': { minLength: 32, requireComplexity: true },
      'session': { minLength: 24, requireComplexity: true },
      'encryption': { minLength: 64, requireComplexity: false }, // hex encoded
      'general': { minLength: 16, requireComplexity: true },
    };

    const req = requirements[type] || requirements.general;
    
    if (secret.length < req.minLength) {
      throw new Error(`${type} secret must be at least ${req.minLength} characters`);
    }

    if (req.requireComplexity) {
      const hasUpperCase = /[A-Z]/.test(secret);
      const hasLowerCase = /[a-z]/.test(secret);
      const hasNumbers = /\d/.test(secret);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(secret);

      if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar)) {
        logger.warn(`${type} secret should contain uppercase, lowercase, numbers, and special characters`);
      }
    }
  }

  // Rotate secrets (for maintenance)
  rotateSecret(key, newValue) {
    const oldValue = this.getSecret(key);
    this.setSecret(key, newValue);
    logger.info(`Secret rotated for key: ${key}`);
    return oldValue;
  }

  // Export secrets (for backup - use with caution)
  exportSecrets(keys = null) {
    const secretsToExport = keys || Array.from(this.secrets.keys());
    const exported = {};

    for (const key of secretsToExport) {
      exported[key] = this.getSecret(key);
    }

    return exported;
  }

  clearAllSecrets() {
    const count = this.secrets.size;
    this.secrets.clear();
    logger.info(`Cleared ${count} secrets from memory`);
  }
}

// Singleton instance
const secretsManager = new SecretsManager();

// Auto-load from environment on startup
secretsManager.loadFromEnvironment();

export default secretsManager;
