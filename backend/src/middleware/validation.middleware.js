import Joi from 'joi';
import { ApiError, ErrorFactory } from '../errors/index.js';

class ValidationMiddleware {
  // Common validation schemas
  static schemas = {
    // User validation schemas
    userRegistration: Joi.object({
      name: Joi.string().min(2).max(50).required().messages({
        'string.empty': 'Name is required',
        'string.min': 'Name must be at least 2 characters',
        'string.max': 'Name cannot exceed 50 characters',
        'any.required': 'Name is required'
      }),
      email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
      password: Joi.string().min(8).max(128).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required().messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 8 characters',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
        'any.required': 'Password is required'
      }),
      role: Joi.string().valid('USER', 'MENTOR').optional().default('USER')
    }),

    userLogin: Joi.object({
      email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
      password: Joi.string().required().messages({
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
      })
    }),

    userUpdate: Joi.object({
      name: Joi.string().min(2).max(50).optional(),
      bio: Joi.string().max(500).optional(),
      skills: Joi.string().max(1000).optional(),
      profileImage: Joi.string().uri().optional()
    }),

    // Post validation schemas
    postCreate: Joi.object({
      title: Joi.string().min(5).max(200).required().messages({
        'string.empty': 'Title is required',
        'string.min': 'Title must be at least 5 characters',
        'string.max': 'Title cannot exceed 200 characters',
        'any.required': 'Title is required'
      }),
      content: Joi.string().min(10).max(10000).required().messages({
        'string.empty': 'Content is required',
        'string.min': 'Content must be at least 10 characters',
        'string.max': 'Content cannot exceed 10000 characters',
        'any.required': 'Content is required'
      }),
      image: Joi.string().uri().optional()
    }),

    postUpdate: Joi.object({
      title: Joi.string().min(5).max(200).optional(),
      content: Joi.string().min(10).max(10000).optional(),
      image: Joi.string().uri().optional()
    }),

    // Comment validation schemas
    commentCreate: Joi.object({
      content: Joi.string().min(1).max(2000).required().messages({
        'string.empty': 'Comment content is required',
        'string.min': 'Comment content cannot be empty',
        'string.max': 'Comment cannot exceed 2000 characters',
        'any.required': 'Comment content is required'
      }),
      parentCommentId: Joi.number().integer().positive().optional()
    }),

    commentUpdate: Joi.object({
      content: Joi.string().min(1).max(2000).required().messages({
        'string.empty': 'Comment content is required',
        'string.min': 'Comment content cannot be empty',
        'string.max': 'Comment cannot exceed 2000 characters',
        'any.required': 'Comment content is required'
      })
    }),

    // Pagination schemas
    pagination: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      sortBy: Joi.string().optional(),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc')
    }),

    // ID parameter schema
    id: Joi.object({
      id: Joi.number().integer().positive().required().messages({
        'number.base': 'ID must be a number',
        'number.integer': 'ID must be an integer',
        'number.positive': 'ID must be a positive number',
        'any.required': 'ID is required'
      })
    }),

    // Search schema
    search: Joi.object({
      q: Joi.string().min(1).max(100).required().messages({
        'string.empty': 'Search query is required',
        'string.min': 'Search query cannot be empty',
        'string.max': 'Search query cannot exceed 100 characters',
        'any.required': 'Search query is required'
      }),
      type: Joi.string().valid('posts', 'users', 'all').default('all'),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(20)
    })
  };

  // Joi validation middleware
  static validate(schema, source = 'body') {
    return (req, res, next) => {
      const data = source === 'body' ? req.body : 
                   source === 'query' ? req.query : 
                   source === 'params' ? req.params : req.body;

      const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const errorMessages = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context.value
        }));

        throw ApiError.validation('Validation failed', errorMessages);
      }

      // Replace the request data with validated and sanitized data
      if (source === 'body') req.body = value;
      else if (source === 'query') req.query = value;
      else if (source === 'params') req.params = value;

      next();
    };
  }

  // Custom validation helpers
  static helpers = {
    isValidEmail: (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },

    isValidPassword: (password) => {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
      return passwordRegex.test(password);
    },

    sanitizeHtml: (text) => {
      return text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim();
    },

    isValidUrl: (url) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    }
  };
}

export default ValidationMiddleware;
