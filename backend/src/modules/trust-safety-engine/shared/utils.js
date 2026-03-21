/**
 * Trust & Safety Engine Utilities
 * Week-3 Ownership Feature Build
 * Shared utility functions for all engines
 */

import { DECAY_FUNCTIONS, RECOVERY_MODELS, SYSTEM_CONFIG } from './constants.js';

// ========================================
// MATHEMATICAL UTILITIES
// ========================================

/**
 * Calculate exponential decay
 * @param {number} value - Initial value
 * @param {number} time - Time elapsed
 * @param {number} halfLife - Half-life period
 * @returns {number} Decayed value
 */
export function calculateExponentialDecay(value, time, halfLife = 90) {
  const decayFactor = Math.pow(0.5, time / halfLife);
  return value * decayFactor;
}

/**
 * Calculate linear decay
 * @param {number} value - Initial value
 * @param {number} time - Time elapsed
 * @param {number} totalTime - Total time to reach zero
 * @returns {number} Decayed value
 */
export function calculateLinearDecay(value, time, totalTime = 365) {
  const decayRate = value / totalTime;
  return Math.max(0, value - (decayRate * time));
}

/**
 * Calculate logarithmic decay
 * @param {number} value - Initial value
 * @param {number} time - Time elapsed
 * @param {number} scaleFactor - Scale factor for decay
 * @returns {number} Decayed value
 */
export function calculateLogarithmicDecay(value, time, scaleFactor = 100) {
  return value / (1 + Math.log(1 + time / scaleFactor));
}

/**
 * Normalize value to 0-1 range
 * @param {number} value - Value to normalize
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Normalized value
 */
export function normalizeValue(value, min, max) {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Calculate weighted average
 * @param {Array} values - Array of values
 * @param {Array} weights - Array of weights
 * @returns {number} Weighted average
 */
export function calculateWeightedAverage(values, weights) {
  if (values.length !== weights.length) {
    throw new Error('Values and weights arrays must have the same length');
  }

  const weightedSum = values.reduce((sum, value, index) => sum + value * weights[index], 0);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  return totalWeight === 0 ? 0 : weightedSum / totalWeight;
}

/**
 * Calculate moving average
 * @param {Array} data - Array of data points
 * @param {number} windowSize - Window size for moving average
 * @returns {Array} Array of moving averages
 */
export function calculateMovingAverage(data, windowSize) {
  const result = [];
  
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = data.slice(start, i + 1);
    const average = window.reduce((sum, val) => sum + val, 0) / window.length;
    result.push(average);
  }

  return result;
}

/**
 * Calculate standard deviation
 * @param {Array} data - Array of data points
 * @returns {number} Standard deviation
 */
export function calculateStandardDeviation(data) {
  if (data.length === 0) return 0;

  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  
  return Math.sqrt(variance);
}

// ========================================
// TIME UTILITIES
// ========================================

/**
 * Calculate time difference in human-readable format
 * @param {Date|string} startTime - Start time
 * @param {Date|string} endTime - End time (default: now)
 * @returns {Object} Time difference object
 */
export function calculateTimeDifference(startTime, endTime = new Date()) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = Math.abs(end - start);

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  return {
    milliseconds: diffMs,
    seconds: seconds % 60,
    minutes: minutes % 60,
    hours: hours % 24,
    days: days % 30,
    weeks: weeks % 4,
    months: months % 12,
    years,
    totalSeconds: seconds,
    totalMinutes: minutes,
    totalHours: hours,
    totalDays: days,
    totalWeeks: weeks,
    totalMonths: months,
    totalYears: years,
    humanReadable: formatTimeDifference(diffMs)
  };
}

/**
 * Format time difference in human-readable string
 * @param {number} diffMs - Time difference in milliseconds
 * @returns {string} Human-readable time difference
 */
function formatTimeDifference(diffMs) {
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
}

/**
 * Check if a date is within a specified range
 * @param {Date|string} date - Date to check
 * @param {number} daysAgo - Number of days ago
 * @returns {boolean} True if within range
 */
export function isWithinDays(date, daysAgo) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - daysAgo);
  const checkDate = new Date(date);
  return checkDate >= targetDate;
}

/**
 * Get start of day timestamp
 * @param {Date|string} date - Date (default: today)
 * @returns {Date} Start of day
 */
export function getStartOfDay(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Get end of day timestamp
 * @param {Date|string} date - Date (default: today)
 * @returns {Date} End of day
 */
export function getEndOfDay(date = new Date()) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

// ========================================
// DATA PROCESSING UTILITIES
// ========================================

/**
 * Chunk array into smaller arrays
 * @param {Array} array - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array} Array of chunks
 */
export function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Remove duplicates from array
 * @param {Array} array - Array with duplicates
 * @param {string|Function} key - Key or function for comparison
 * @returns {Array} Array without duplicates
 */
export function removeDuplicates(array, key) {
  if (!key) return [...new Set(array)];

  const seen = new Set();
  return array.filter(item => {
    const identifier = typeof key === 'function' ? key(item) : item[key];
    if (seen.has(identifier)) return false;
    seen.add(identifier);
    return true;
  });
}

/**
 * Group array items by key
 * @param {Array} array - Array to group
 * @param {string|Function} key - Key or function for grouping
 * @returns {Object} Grouped object
 */
export function groupBy(array, key) {
  return array.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(item);
    return groups;
  }, {});
}

/**
 * Sort array by key
 * @param {Array} array - Array to sort
 * @param {string|Function} key - Key or function for sorting
 * @param {string} order - Sort order ('asc' or 'desc')
 * @returns {Array} Sorted array
 */
export function sortBy(array, key, order = 'asc') {
  return [...array].sort((a, b) => {
    const aVal = typeof key === 'function' ? key(a) : a[key];
    const bVal = typeof key === 'function' ? key(b) : b[key];
    
    let comparison = 0;
    if (aVal > bVal) comparison = 1;
    if (aVal < bVal) comparison = -1;
    
    return order === 'desc' ? comparison * -1 : comparison;
  });
}

/**
 * Filter array by multiple conditions
 * @param {Array} array - Array to filter
 * @param {Object} conditions - Filter conditions
 * @returns {Array} Filtered array
 */
export function filterBy(array, conditions) {
  return array.filter(item => {
    return Object.entries(conditions).every(([key, value]) => {
      if (typeof value === 'function') return value(item[key]);
      if (Array.isArray(value)) return value.includes(item[key]);
      return item[key] === value;
    });
  });
}

// ========================================
// VALIDATION UTILITIES
// ========================================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate UUID format
 * @param {string} uuid - UUID to validate
 * @returns {boolean} True if valid
 */
export function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitize string input
 * @param {string} input - Input to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized string
 */
export function sanitizeString(input, options = {}) {
  if (typeof input !== 'string') return '';

  const {
    trim = true,
    removeHTML = true,
    escapeSQL = true,
    maxLength = null
  } = options;

  let sanitized = input;

  if (trim) sanitized = sanitized.trim();

  if (removeHTML) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  if (escapeSQL) {
    sanitized = sanitized.replace(/['"\\]/g, '\\$&');
  }

  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

// ========================================
// CRYPTOGRAPHIC UTILITIES
// ========================================

/**
 * Generate random string
 * @param {number} length - String length
 * @param {string} charset - Character set
 * @returns {string} Random string
 */
export function generateRandomString(length = 32, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

/**
 * Generate hash of data
 * @param {string} data - Data to hash
 * @returns {string} Hash string
 */
export async function generateHash(data) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compare two hash values
 * @param {string} hash1 - First hash
 * @param {string} hash2 - Second hash
 * @returns {boolean} True if hashes match
 */
export function compareHashes(hash1, hash2) {
  return hash1 === hash2;
}

// ========================================
// ERROR HANDLING UTILITIES
// ========================================

/**
 * Create standardized error object
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {Object} details - Additional error details
 * @returns {Error} Error object
 */
export function createError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  error.timestamp = new Date().toISOString();
  return error;
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxAttempts - Maximum retry attempts
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Function result
 */
export async function retryWithBackoff(fn, maxAttempts = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) break;
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ========================================
// PERFORMANCE UTILITIES
// ========================================

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Measure function execution time
 * @param {Function} func - Function to measure
 * @returns {Object} Result with execution time
 */
export async function measureExecutionTime(func) {
  const startTime = performance.now();
  const result = await func();
  const endTime = performance.now();
  
  return {
    result,
    executionTime: endTime - startTime,
    timestamp: new Date().toISOString()
  };
}

// ========================================
// CACHE UTILITIES
// ========================================

/**
 * Simple in-memory cache
 */
export class SimpleCache {
  constructor(ttl = SYSTEM_CONFIG.CACHE_TTL) {
    this.cache = new Map();
    this.ttl = ttl * 1000; // Convert to milliseconds
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// ========================================
// EVENT UTILITIES
// ========================================

/**
 * Simple event emitter
 */
export class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  on(event, listener) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(listener);
  }

  off(event, listener) {
    if (!this.events.has(event)) return;
    const listeners = this.events.get(event);
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  emit(event, ...args) {
    if (!this.events.has(event)) return;
    this.events.get(event).forEach(listener => {
      listener(...args);
    });
  }

  once(event, listener) {
    const onceWrapper = (...args) => {
      listener(...args);
      this.off(event, onceWrapper);
    };
    this.on(event, onceWrapper);
  }
}

// ========================================
// RATE LIMITING UTILITIES
// ========================================

/**
 * Simple rate limiter
 */
export class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  isAllowed(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const userRequests = this.requests.get(key);
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
    this.requests.set(key, validRequests);

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    return true;
  }

  getRemainingRequests(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(key)) return this.maxRequests;

    const userRequests = this.requests.get(key);
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  getResetTime(key) {
    if (!this.requests.has(key)) return 0;

    const userRequests = this.requests.get(key);
    if (userRequests.length === 0) return 0;

    const oldestRequest = Math.min(...userRequests);
    return oldestRequest + this.windowMs;
  }
}
