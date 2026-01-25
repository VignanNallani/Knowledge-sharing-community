import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Knowledge Sharing Tech Community API",
      version: "1.0.0",
      description:
        "Backend APIs for a Knowledge Sharing Platform with Posts, Mentorships, Events, Roles, Users, and File Uploads",
    },
    servers: [
      {
        url: "http://localhost:4000",
        description: "Local server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            email: { type: "string" },
            role: { type: "string" },
            bio: { type: "string" },
            skills: { type: "string" },
          },
        },
        Post: {
          type: "object",
          properties: {
            id: { type: "integer" },
            title: { type: "string" },
            content: { type: "string" },
            authorId: { type: "integer" },
          },
        },
        Comment: {
          type: "object",
          properties: {
            id: { type: "integer" },
            content: { type: "string" },
            authorId: { type: "integer" },
            postId: { type: "integer" },
          },
        },
        Like: {
          type: "object",
          properties: {
            postId: { type: "integer" },
            userId: { type: "integer" },
            liked: { type: "boolean" },
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
  apis: ["./src/routes/*.js"], // auto-read route comments
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
