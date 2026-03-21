/**
 * Log Schemas and Validation
 * 
 * This file defines the schemas for different types of logs and provides
 * validation functions to ensure log entries conform to the expected structure.
 */

// Base log entry schema
export const BASE_LOG_SCHEMA = {
  required: ['timestamp', 'level', 'service', 'version', 'environment', 'message'],
  properties: {
    timestamp: { type: 'string', format: 'date-time' },
    level: { type: 'string', enum: ['CRITICAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG', 'TRACE'] },
    service: { type: 'string' },
    version: { type: 'string' },
    environment: { type: 'string', enum: ['development', 'staging', 'production'] },
    message: { type: 'string' },
    requestId: { type: 'string' },
    traceId: { type: 'string' },
    spanId: { type: 'string' },
    userId: { type: 'string' },
    sessionId: { type: 'string' },
    context: { type: 'object' },
    tags: { type: 'array', items: { type: 'string' } },
    correlation: { type: 'object' }
  }
};

// HTTP Request log schema
export const HTTP_REQUEST_SCHEMA = {
  allOf: [BASE_LOG_SCHEMA],
  required: ['type', 'method', 'url', 'statusCode', 'responseTime'],
  properties: {
    type: { type: 'string', enum: ['http_request'] },
    method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] },
    url: { type: 'string' },
    statusCode: { type: 'number', minimum: 100, maximum: 599 },
    responseTime: { type: 'number', minimum: 0 },
    userAgent: { type: 'string' },
    ip: { type: 'string' },
    contentLength: { type: 'number', minimum: 0 },
    context: {
      type: 'object',
      properties: {
        component: { type: 'string' },
        operation: { type: 'string' }
      }
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      contains: { const: 'http' }
    }
  }
};

// Error log schema
export const ERROR_SCHEMA = {
  allOf: [BASE_LOG_SCHEMA],
  required: ['type', 'message'],
  properties: {
    type: { type: 'string', enum: ['error'] },
    stack: { type: 'string' },
    errorCode: { type: 'string' },
    errorType: { type: 'string' },
    context: {
      type: 'object',
      required: ['component', 'operation'],
      properties: {
        component: { type: 'string' },
        operation: { type: 'string' },
        statusCode: { type: 'number' },
        requestBody: { type: 'object' },
        requestParams: { type: 'object' },
        requestQuery: { type: 'object' },
        headers: { type: 'object' }
      }
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      contains: { const: 'error' }
    }
  }
};

// Business event log schema
export const BUSINESS_EVENT_SCHEMA = {
  allOf: [BASE_LOG_SCHEMA],
  required: ['type', 'event'],
  properties: {
    type: { type: 'string', enum: ['business_event'] },
    event: { type: 'string' },
    data: { type: 'object' },
    timestamp: { type: 'string', format: 'date-time' },
    context: {
      type: 'object',
      required: ['component', 'operation'],
      properties: {
        component: { type: 'string', const: 'Business' },
        operation: { type: 'string' }
      }
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      contains: { const: 'business' }
    }
  }
};

// Performance log schema
export const PERFORMANCE_SCHEMA = {
  allOf: [BASE_LOG_SCHEMA],
  required: ['type', 'operation', 'duration', 'unit'],
  properties: {
    type: { type: 'string', enum: ['performance'] },
    operation: { type: 'string' },
    duration: { type: 'number', minimum: 0 },
    unit: { type: 'string', enum: ['milliseconds', 'seconds', 'nanoseconds'] },
    preciseResponseTime: { type: 'number' },
    threshold: { type: 'number' },
    context: {
      type: 'object',
      required: ['component', 'operation'],
      properties: {
        component: { type: 'string', const: 'Performance' },
        operation: { type: 'string' }
      }
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      contains: { const: 'performance' }
    }
  }
};

// Security event log schema
export const SECURITY_SCHEMA = {
  allOf: [BASE_LOG_SCHEMA],
  required: ['type', 'event', 'severity'],
  properties: {
    type: { type: 'string', enum: ['security'] },
    event: { type: 'string' },
    severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] },
    context: {
      type: 'object',
      required: ['component', 'operation'],
      properties: {
        component: { type: 'string', const: 'Security' },
        operation: { type: 'string' }
      }
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      contains: { const: 'security' }
    }
  }
};

// Dependency call log schema
export const DEPENDENCY_SCHEMA = {
  allOf: [BASE_LOG_SCHEMA],
  required: ['type', 'service', 'operation', 'success', 'duration'],
  properties: {
    type: { type: 'string', enum: ['dependency'] },
    service: { type: 'string' },
    operation: { type: 'string' },
    success: { type: 'boolean' },
    duration: { type: 'number', minimum: 0 },
    error: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'string' },
        type: { type: 'string' }
      }
    },
    context: {
      type: 'object',
      required: ['component', 'operation'],
      properties: {
        component: { type: 'string', const: 'Dependency' },
        operation: { type: 'string' }
      }
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      contains: { const: 'dependency' }
    }
  }
};

// Log level definitions with severity
export const LOG_LEVELS = {
  CRITICAL: { value: 50, severity: 'critical', color: 'red' },
  ERROR: { value: 40, severity: 'error', color: 'red' },
  WARNING: { value: 30, severity: 'warning', color: 'yellow' },
  INFO: { value: 20, severity: 'info', color: 'green' },
  DEBUG: { value: 10, severity: 'debug', color: 'blue' },
  TRACE: { value: 5, severity: 'trace', color: 'purple' }
};

// Log type to schema mapping
export const LOG_SCHEMAS = {
  http_request: HTTP_REQUEST_SCHEMA,
  error: ERROR_SCHEMA,
  business_event: BUSINESS_EVENT_SCHEMA,
  performance: PERFORMANCE_SCHEMA,
  security: SECURITY_SCHEMA,
  dependency: DEPENDENCY_SCHEMA
};

/**
 * Validate log entry against schema
 */
export const validateLogEntry = (logEntry, schema) => {
  const errors = [];

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in logEntry)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  // Check properties
  if (schema.properties) {
    for (const [field, fieldSchema] of Object.entries(schema.properties)) {
      if (field in logEntry) {
        const value = logEntry[field];
        const fieldErrors = validateField(value, fieldSchema, field);
        errors.push(...fieldErrors);
      }
    }
  }

  // Check allOf schemas
  if (schema.allOf) {
    for (const subSchema of schema.allOf) {
      const subErrors = validateLogEntry(logEntry, subSchema);
      errors.push(...subErrors);
    }
  }

  return errors;
};

/**
 * Validate individual field against schema
 */
const validateField = (value, fieldSchema, fieldName) => {
  const errors = [];

  // Type validation
  if (fieldSchema.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== fieldSchema.type) {
      errors.push(`${fieldName}: expected ${fieldSchema.type}, got ${actualType}`);
    }
  }

  // Enum validation
  if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
    errors.push(`${fieldName}: invalid value "${value}", expected one of ${fieldSchema.enum.join(', ')}`);
  }

  // Number validation
  if (fieldSchema.type === 'number') {
    if (fieldSchema.minimum !== undefined && value < fieldSchema.minimum) {
      errors.push(`${fieldName}: value ${value} is below minimum ${fieldSchema.minimum}`);
    }
    if (fieldSchema.maximum !== undefined && value > fieldSchema.maximum) {
      errors.push(`${fieldName}: value ${value} is above maximum ${fieldSchema.maximum}`);
    }
  }

  // String validation
  if (fieldSchema.type === 'string') {
    if (fieldSchema.format === 'date-time') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        errors.push(`${fieldName}: invalid date-time format "${value}"`);
      }
    }
  }

  // Array validation
  if (fieldSchema.type === 'array') {
    if (fieldSchema.contains && !value.includes(fieldSchema.contains.const)) {
      errors.push(`${fieldName}: array must contain "${fieldSchema.contains.const}"`);
    }
  }

  // Object validation
  if (fieldSchema.type === 'object' && fieldSchema.properties) {
    for (const [subField, subSchema] of Object.entries(fieldSchema.properties)) {
      if (subField in value) {
        const subErrors = validateField(value[subField], subSchema, `${fieldName}.${subField}`);
        errors.push(...subErrors);
      } else if (fieldSchema.required && fieldSchema.required.includes(subField)) {
        errors.push(`${fieldName}.${subField}: missing required field`);
      }
    }
  }

  return errors;
};

/**
 * Get schema for log type
 */
export const getSchemaForLogType = (logType) => {
  return LOG_SCHEMAS[logType] || BASE_LOG_SCHEMA;
};

/**
 * Validate log entry by type
 */
export const validateLogByType = (logEntry) => {
  const logType = logEntry.type;
  const schema = getSchemaForLogType(logType);
  return validateLogEntry(logEntry, schema);
};

/**
 * Log entry sanitizer
 */
export const sanitizeLogEntry = (logEntry) => {
  const sanitized = { ...logEntry };

  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'authorization', 'cookie'];
  
  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const result = Array.isArray(obj) ? [...obj] : { ...obj };
    
    for (const [key, value] of Object.entries(result)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        result[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        result[key] = sanitizeObject(value);
      }
    }
    
    return result;
  };

  // Sanitize nested objects
  if (sanitized.context) {
    sanitized.context = sanitizeObject(sanitized.context);
  }
  
  if (sanitized.data) {
    sanitized.data = sanitizeObject(sanitized.data);
  }

  return sanitized;
};

/**
 * Log entry enricher
 */
export const enrichLogEntry = (logEntry, additionalContext = {}) => {
  return {
    ...logEntry,
    ...additionalContext,
    context: {
      ...logEntry.context,
      ...additionalContext.context
    }
  };
};

export default {
  BASE_LOG_SCHEMA,
  HTTP_REQUEST_SCHEMA,
  ERROR_SCHEMA,
  BUSINESS_EVENT_SCHEMA,
  PERFORMANCE_SCHEMA,
  SECURITY_SCHEMA,
  DEPENDENCY_SCHEMA,
  LOG_LEVELS,
  LOG_SCHEMAS,
  validateLogEntry,
  validateLogByType,
  getSchemaForLogType,
  sanitizeLogEntry,
  enrichLogEntry
};
