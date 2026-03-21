import Joi from 'joi';

// Common validation schemas
const commonSchemas = {
  id: Joi.number().integer().positive().required(),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
  search: Joi.string().trim().max(100),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  name: Joi.string().trim().min(2).max(50).required(),
  bio: Joi.string().trim().max(500),
  skills: Joi.array().items(Joi.string().trim().max(50)).max(10),
};

// Request contracts
export const requestContracts = {
  // Auth contracts
  register: Joi.object({
    name: commonSchemas.name,
    email: commonSchemas.email,
    password: commonSchemas.password,
    role: Joi.string().valid('USER', 'MENTOR').default('USER'),
  }),

  login: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().required(),
  }),

  // User contracts
  updateProfile: Joi.object({
    name: commonSchemas.name.optional(),
    bio: commonSchemas.bio.optional(),
    skills: commonSchemas.skills.optional(),
    profileImage: Joi.string().uri().optional(),
  }),

  // Post contracts
  createPost: Joi.object({
    title: Joi.string().trim().min(5).max(200).required(),
    content: Joi.string().trim().min(10).max(10000).required(),
    tags: Joi.array().items(Joi.string().trim().max(30)).max(5).optional(),
  }),

  updatePost: Joi.object({
    title: Joi.string().trim().min(5).max(200).optional(),
    content: Joi.string().trim().min(10).max(10000).optional(),
    tags: Joi.array().items(Joi.string().trim().max(30)).max(5).optional(),
  }),

  // Comment contracts
  createComment: Joi.object({
    postId: commonSchemas.id,
    content: Joi.string().trim().min(1).max(1000).required(),
    parentCommentId: Joi.number().integer().positive().optional(),
  }),

  updateComment: Joi.object({
    content: Joi.string().trim().min(1).max(1000).required(),
  }),

  // Follow contracts
  followUser: Joi.object({
    userId: commonSchemas.id,
  }),

  // Report contracts
  createReport: Joi.object({
    type: Joi.string().valid('POST', 'COMMENT', 'USER').required(),
    targetId: commonSchemas.id,
    reason: Joi.string().trim().min(10).max(500).required(),
  }),

  // Mentorship contracts
  createMentorship: Joi.object({
    mentorId: commonSchemas.id,
    message: Joi.string().trim().min(10).max(500).required(),
    goals: Joi.array().items(Joi.string().trim().max(200)).max(5).optional(),
  }),

  updateMentorship: Joi.object({
    status: Joi.string().valid('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED').required(),
    notes: Joi.string().trim().max(1000).optional(),
  }),

  // Slot contracts
  createSlot: Joi.object({
    start: Joi.date().iso().min('now').required(),
    end: Joi.date().iso().min(Joi.ref('start')).required(),
  }),

  updateSlot: Joi.object({
    start: Joi.date().iso().min('now').optional(),
    end: Joi.date().iso().min(Joi.ref('start')).optional(),
  }),

  bookSlot: Joi.object({
    slotId: commonSchemas.id,
  }),

  // Chat contracts
  startConversation: Joi.object({
    otherUserId: commonSchemas.id,
  }),

  sendMessage: Joi.object({
    body: Joi.string().trim().min(1).max(2000).required(),
  }),

  // Admin contracts
  updateUserRole: Joi.object({
    role: Joi.string().valid('USER', 'MENTOR', 'ADMIN', 'SUPERADMIN').required(),
  }),

  updateUserStatus: Joi.object({
    isActive: Joi.boolean().required(),
  }),
};

// Response contracts
export const responseContracts = {
  // Success response wrapper
  success: Joi.object({
    success: Joi.boolean().valid(true).required(),
    message: Joi.string().required(),
    data: Joi.any().optional(),
    meta: Joi.object({
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).optional(),
      total: Joi.number().integer().min(0).optional(),
      totalPages: Joi.number().integer().min(0).optional(),
    }).optional(),
  }),

  // Error response wrapper
  error: Joi.object({
    success: Joi.boolean().valid(false).required(),
    error: Joi.string().required(),
    code: Joi.string().optional(),
    details: Joi.any().optional(),
  }),

  // User responses
  user: Joi.object({
    id: commonSchemas.id,
    name: commonSchemas.name,
    email: commonSchemas.email,
    bio: commonSchemas.bio.optional(),
    skills: commonSchemas.skills.optional(),
    profileImage: Joi.string().uri().optional(),
    role: Joi.string().valid('USER', 'MENTOR', 'ADMIN', 'SUPERADMIN').required(),
    isActive: Joi.boolean().required(),
    createdAt: Joi.date().iso().required(),
    updatedAt: Joi.date().iso().optional(),
  }),

  // Post responses
  post: Joi.object({
    id: commonSchemas.id,
    title: Joi.string().trim().min(5).max(200).required(),
    content: Joi.string().trim().min(10).max(10000).required(),
    status: Joi.string().valid('PENDING', 'APPROVED', 'REJECTED').required(),
    authorId: commonSchemas.id,
    author: Joi.object({
      id: commonSchemas.id,
      name: commonSchemas.name,
      profileImage: Joi.string().uri().optional(),
      role: Joi.string().valid('USER', 'MENTOR', 'ADMIN', 'SUPERADMIN').required(),
    }).required(),
    tags: Joi.array().items(Joi.string().trim().max(30)).required(),
    likeCount: Joi.number().integer().min(0).required(),
    commentCount: Joi.number().integer().min(0).required(),
    isLiked: Joi.boolean().required(),
    createdAt: Joi.date().iso().required(),
    updatedAt: Joi.date().iso().optional(),
  }),

  // Comment responses
  comment: Joi.object({
    id: commonSchemas.id,
    content: Joi.string().trim().min(1).max(1000).required(),
    postId: commonSchemas.id,
    authorId: commonSchemas.id,
    parentCommentId: Joi.number().integer().positive().optional(),
    author: Joi.object({
      id: commonSchemas.id,
      name: commonSchemas.name,
      profileImage: Joi.string().uri().optional(),
      role: Joi.string().valid('USER', 'MENTOR', 'ADMIN', 'SUPERADMIN').required(),
    }).required(),
    likeCount: Joi.number().integer().min(0).required(),
    isLiked: Joi.boolean().required(),
    replies: Joi.array().items(Joi.link('#comment')).optional(),
    createdAt: Joi.date().iso().required(),
    updatedAt: Joi.date().iso().optional(),
  }).id('comment'),

  // Auth responses
  auth: Joi.object({
    token: Joi.string().required(),
    user: Joi.object({
      id: commonSchemas.id,
      name: commonSchemas.name,
      email: commonSchemas.email,
      role: Joi.string().valid('USER', 'MENTOR', 'ADMIN', 'SUPERADMIN').required(),
    }).required(),
  }),

  // Pagination meta
  pagination: Joi.object({
    page: Joi.number().integer().min(1).required(),
    limit: Joi.number().integer().min(1).required(),
    total: Joi.number().integer().min(0).required(),
    totalPages: Joi.number().integer().min(0).required(),
  }),

  // List responses
  userList: Joi.object({
    users: Joi.array().items(Joi.link('#user')).required(),
    meta: Joi.link('#pagination').required(),
  }),

  postList: Joi.object({
    posts: Joi.array().items(Joi.link('#post')).required(),
    meta: Joi.link('#pagination').required(),
  }),

  commentList: Joi.object({
    comments: Joi.array().items(Joi.link('#comment')).required(),
    meta: Joi.link('#pagination').required(),
  }),
};

// Error contracts
export const errorContracts = {
  validation: Joi.object({
    success: Joi.boolean().valid(false).required(),
    error: Joi.string().valid('Validation Error').required(),
    details: Joi.array().items(Joi.object({
      field: Joi.string().required(),
      message: Joi.string().required(),
      value: Joi.any().optional(),
    })).required(),
  }),

  notFound: Joi.object({
    success: Joi.boolean().valid(false).required(),
    error: Joi.string().valid('Not Found').required(),
    code: Joi.string().valid('NOT_FOUND').required(),
  }),

  unauthorized: Joi.object({
    success: Joi.boolean().valid(false).required(),
    error: Joi.string().valid('Unauthorized').required(),
    code: Joi.string().valid('UNAUTHORIZED').required(),
  }),

  forbidden: Joi.object({
    success: Joi.boolean().valid(false).required(),
    error: Joi.string().valid('Forbidden').required(),
    code: Joi.string().valid('FORBIDDEN').required(),
  }),

  rateLimit: Joi.object({
    success: Joi.boolean().valid(false).required(),
    error: Joi.string().valid('Too Many Requests').required(),
    code: Joi.string().valid('RATE_LIMIT_EXCEEDED').required(),
    retryAfter: Joi.number().integer().min(0).required(),
  }),

  serverError: Joi.object({
    success: Joi.boolean().valid(false).required(),
    error: Joi.string().valid('Internal Server Error').required(),
    code: Joi.string().valid('INTERNAL_SERVER_ERROR').required(),
  }),
};

// Contract validation middleware
export const validateRequest = (contract) => {
  return (req, res, next) => {
    const { error, value } = contract.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details,
      });
    }

    req.body = value;
    next();
  };
};

// Response validation utility
export const validateResponse = (contract, data) => {
  const { error } = contract.validate(data);
  if (error) {
    throw new Error(`Response validation failed: ${error.message}`);
  }
  return data;
};

export default {
  requestContracts,
  responseContracts,
  errorContracts,
  validateRequest,
  validateResponse,
  commonSchemas,
};
