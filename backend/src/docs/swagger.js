import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Knowledge Sharing Community API',
      version: '1.0.0',
      description: 'A comprehensive platform for knowledge sharing, mentorship, and community collaboration',
      contact: {
        name: 'API Support',
        email: 'support@knowledgesharing.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.knowledgesharing.com/api/v1'
          : 'http://localhost:4000/api/v1',
        description: process.env.NODE_ENV === 'production' 
          ? 'Production server'
          : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'username', 'name'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User unique identifier',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 30,
              description: 'Unique username',
            },
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              description: 'Full name',
            },
            bio: {
              type: 'string',
              maxLength: 500,
              description: 'User biography',
            },
            avatar: {
              type: 'string',
              format: 'uri',
              description: 'Avatar image URL',
            },
            role: {
              type: 'string',
              enum: ['user', 'mentor', 'admin'],
              description: 'User role',
            },
            isVerified: {
              type: 'boolean',
              description: 'Email verification status',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Post: {
          type: 'object',
          required: ['title', 'content'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Post unique identifier',
            },
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              description: 'Post title',
            },
            content: {
              type: 'string',
              minLength: 1,
              description: 'Post content (Markdown supported)',
            },
            authorId: {
              type: 'string',
              format: 'uuid',
              description: 'Author user ID',
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Post tags',
            },
            isPublished: {
              type: 'boolean',
              description: 'Publication status',
            },
            likesCount: {
              type: 'integer',
              minimum: 0,
              description: 'Number of likes',
            },
            commentsCount: {
              type: 'integer',
              minimum: 0,
              description: 'Number of comments',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Post creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Comment: {
          type: 'object',
          required: ['content', 'postId'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Comment unique identifier',
            },
            content: {
              type: 'string',
              minLength: 1,
              maxLength: 1000,
              description: 'Comment content',
            },
            postId: {
              type: 'string',
              format: 'uuid',
              description: 'Post ID',
            },
            authorId: {
              type: 'string',
              format: 'uuid',
              description: 'Comment author ID',
            },
            parentId: {
              type: 'string',
              format: 'uuid',
              description: 'Parent comment ID (for replies)',
            },
            likesCount: {
              type: 'integer',
              minimum: 0,
              description: 'Number of likes',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Comment creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Mentorship: {
          type: 'object',
          required: ['mentorId', 'menteeId', 'title'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Mentorship unique identifier',
            },
            mentorId: {
              type: 'string',
              format: 'uuid',
              description: 'Mentor user ID',
            },
            menteeId: {
              type: 'string',
              format: 'uuid',
              description: 'Mentee user ID',
            },
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              description: 'Mentorship title',
            },
            description: {
              type: 'string',
              maxLength: 1000,
              description: 'Mentorship description',
            },
            status: {
              type: 'string',
              enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
              description: 'Mentorship status',
            },
            startDate: {
              type: 'string',
              format: 'date',
              description: 'Mentorship start date',
            },
            endDate: {
              type: 'string',
              format: 'date',
              description: 'Mentorship end date',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Mentorship creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Error: {
          type: 'object',
          required: ['success', 'message'],
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
            error: {
              type: 'string',
              description: 'Detailed error information',
            },
            code: {
              type: 'string',
              description: 'Error code',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp',
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  minimum: 1,
                  description: 'Current page number',
                },
                limit: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 100,
                  description: 'Items per page',
                },
                total: {
                  type: 'integer',
                  minimum: 0,
                  description: 'Total number of items',
                },
                totalPages: {
                  type: 'integer',
                  minimum: 0,
                  description: 'Total number of pages',
                },
                hasNext: {
                  type: 'boolean',
                  description: 'Has next page',
                },
                hasPrev: {
                  type: 'boolean',
                  description: 'Has previous page',
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js',
  ],
};

export const specs = swaggerJsdoc(options);

export const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .scheme-container { margin: 20px 0 }
  `,
  customSiteTitle: 'Knowledge Sharing Community API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'none',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
  },
};

export { swaggerUi };
