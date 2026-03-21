import helmet from 'helmet';
import cors from 'cors';
import ApiError from '../utils/ApiError.js';

// Helmet configuration for security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: false,
  impliedNoReferrerPolicy: true,
  hidePoweredBy: true,
});

// CORS configuration
export const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = process.env.FRONTEND_URL 
      ? [process.env.FRONTEND_URL, 'http://localhost:5173']
      : ['http://localhost:5173'];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Log the origin for debugging
    console.log('CORS check for origin:', origin);

    if (allowedOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      // For development, be more permissive
      if (process.env.NODE_ENV !== 'production' && origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        console.log('Allowing development origin:', origin);
        callback(null, true);
      } else {
        callback(new ApiError(403, 'Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'X-Request-ID'
  ],
  optionsSuccessStatus: 200
};

// XSS Protection middleware
export const xssProtection = (req, res, next) => {
  // Skip validation for safe paths
  if (["/health", "/api/docs", "/favicon.ico"].includes(req.path)) {
    return next();
  }

  // Sanitize request body
  if (req.body && typeof req.body === 'object' && req.body !== null) {
    req.body = sanitizeInput(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object' && req.query !== null) {
    req.query = sanitizeInput(req.query);
  }

  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object' && req.params !== null) {
    req.params = sanitizeInput(req.params);
  }

  next();
};

// Input sanitization function
function sanitizeInput(obj) {
  const SKIP_FIELDS = [
    'password', 'confirmPassword', 
    'currentPassword', 'newPassword',
    'token', 'refreshToken'
  ];

  if (!obj || typeof obj !== 'object' || obj === null || obj === undefined) {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeInput);
  }

  const sanitized = {};
  const safeObject = obj && typeof obj === 'object' ? obj : {};
  for (const [key, value] of Object.entries(safeObject)) {
    if (SKIP_FIELDS.includes(key)) {
      sanitized[key] = value;
      continue;
    }
    sanitized[sanitizeString(key)] = sanitizeInput(value);
  }
  return sanitized;
}

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

// SQL Injection protection (basic)
export const sqlInjectionProtection = (req, res, next) => {
  // Skip validation for GET requests and safe paths
  if (req.method === "GET" || ["/health", "/api/docs", "/favicon.ico"].includes(req.path)) {
    return next();
  }

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(--|\*|;|<|>|\/\*|\*\/)/gi,
    /(\bOR\b.*=.*\bOR\b)/gi,
    /(\bAND\b.*=.*\bAND\b)/gi,
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };

  const checkObject = (obj) => {
    if (!obj || typeof obj !== 'object') return false;
    try {
      const safeObject = obj && typeof obj === 'object' ? obj : {};
      for (const [key, value] of Object.entries(safeObject)) {
        // Skip SQL injection check for password fields - passwords need special characters
        if (key === 'password' || key.includes('password')) {
          continue;
        }
        
        if (typeof value === 'object' && value !== null) {
          if (checkObject(value)) return true;
        } else if (checkValue(value)) {
          return true;
        }
      }
    } catch (error) {
      return false;
    }
    return false;
  };

  const safeBody = req.body && typeof req.body === 'object' ? req.body : {};
  const safeQuery = req.query && typeof req.query === 'object' ? req.query : {};
  const safeParams = req.params && typeof req.params === 'object' ? req.params : {};

  if (checkObject(safeBody) || checkObject(safeQuery) || checkObject(safeParams)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid input detected',
    });
  }

  next();
};

// Request ID middleware for tracing
export const requestId = (req, res, next) => {
  req.id = req.id || generateRequestId();
  res.set('X-Request-ID', req.id);
  next();
};

function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Content type validation
export const validateContentType = (allowedTypes = ['application/json']) => {
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'DELETE' || req.method === 'OPTIONS') {
      return next();
    }

    const contentType = req.get('Content-Type');
    if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
      return res.status(415).json({
        success: false,
        error: `Unsupported content type. Expected: ${allowedTypes.join(', ')}`,
      });
    }

    next();
  };
};

// IP whitelist middleware
export const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) return next();

    const clientIP = req.ip || req.connection.remoteAddress;
    if (!allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied from this IP address',
      });
    }

    next();
  };
};

// Security headers for API responses
export const apiSecurityHeaders = (req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  });
  next();
};

export default {
  securityHeaders,
  corsOptions,
  xssProtection,
  sqlInjectionProtection,
  requestId,
  validateContentType,
  ipWhitelist,
  apiSecurityHeaders,
};
