console.log('🔍 ENTRY POINT: src/index.js executed');
console.log('Starting server initialization...');

try {
  import './config/env.js';
  console.log('✅ env.js imported successfully');
} catch (error) {
  console.error('❌ Error importing env.js:', error);
}

console.log('🔍 About to import express-async-errors');
import 'express-async-errors';
console.log('✅ express-async-errors imported');
import morgan from 'morgan';
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { Router } from "express";

// Import database connection
import { connectDatabase } from './config/database.js';
import healthChecker from './utils/health-checker.js';

// Import queue service
import queueService from './queues/index.js';

// Import Swagger documentation
import { specs, swaggerUi, swaggerUiOptions } from './docs/swagger.js';

// Import configurations and middleware
import { 
  env, 
  logger, 
  structuredLogger,
  validateConfig 
} from './config/index.js';
import { 
  errorHandler, 
  handleUnhandledRejection, 
  handleUncaughtException,
  securityHeaders,
  corsOptions,
  xssProtection,
  sqlInjectionProtection,
  requestId,
  apiSecurityHeaders,
  rateLimiter,
  authRateLimiter,
  commentRateLimiter,
  followRateLimiter,
  searchRateLimiter,
  suspiciousActivityMiddleware,
  requestSizeLimit,
  requestTrackingMiddleware,
  businessEventTrackingMiddleware,
  errorTrackingMiddleware,
  tracingMiddleware,
  databaseTracingMiddleware,
  externalServiceTracingMiddleware,
  cacheTracingMiddleware,
  businessLogicTracingMiddleware,
  performanceTracingMiddleware,
  errorTracingMiddleware,
  asyncContextTracingMiddleware,
  traceAggregationMiddleware,
  correlationMiddleware,
  errorContextEnrichmentMiddleware,
  errorRateMonitoringMiddleware
} from './middleware/index.js';

// Import routes
import authRoutes from "./routes/auth.js";
import postRoutes from "./routes/posts.js";
import userRoutes from "./routes/user.js";
import commentRoutes from "./routes/comments.js";
import likeRoutes from "./routes/likes.js";
import observabilityRoutes from "./routes/observability.routes.js";
import healthRoutes, { metricsMiddleware } from "./routes/health.routes.js";
import gamificationRoutes from "./routes/gamification.routes.js";
import workflowRoutes from "./routes/workflow.routes.js";
import aiAnalyticsRoutes from "./routes/ai.analytics.routes.js";
import learningPathsRoutes from "./routes/learningPaths.routes.js";
import skillGapRecommendationRoutes from "./routes/skillGapRecommendation.routes.js";
import emailVerificationRoutes from "./routes/emailVerification.routes.js";
import testRoutes from "./routes/test.routes.js";
let passwordResetRoutes;
try {
  passwordResetRoutes = require("./routes/passwordReset.routes.js");
  console.log('Imported password reset routes:', passwordResetRoutes);
} catch (error) {
  console.error('Error importing password reset routes:', error);
  passwordResetRoutes = Router(); // fallback empty router
}

// Import gamification socket service
const GamificationSocketService = require("./services/gamification.socket.service.js");
import WorkflowSocketService from "./services/workflow.socket.service.js";
const AIAnalyticsSocketService = require("./services/ai.analytics.socket.service.js");
import LearningPathsSocketService from "./services/learningPaths.socket.service.js";

// Global process handlers for stability
process.on("unhandledRejection", (reason, promise) => {
  structuredLogger.logErrorWithContext(
    new Error(`Unhandled Rejection: ${reason}`),
    { 
      type: 'unhandled_rejection',
      promise: promise.toString(),
      stack: reason?.stack
    }
  );
});

process.on("uncaughtException", (error) => {
  structuredLogger.logErrorWithContext(
    error,
    { 
      type: 'uncaught_exception',
      fatal: true
    }
  );
});

process.on("SIGTERM", async () => {
  structuredLogger.info('SIGTERM received - shutting down gracefully', { 
    type: 'shutdown',
    signal: 'SIGTERM'
  });
  
  try {
    await queueService.shutdown();
    process.exit(0);
  } catch (error) {
    structuredLogger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on("SIGINT", async () => {
  structuredLogger.info('SIGINT received - shutting down gracefully', { 
    type: 'shutdown',
    signal: 'SIGINT'
  });
  
  try {
    await queueService.shutdown();
    process.exit(0);
  } catch (error) {
    structuredLogger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Setup global error handlers
handleUnhandledRejection();
handleUncaughtException();

const app = express();

/* ================== PURE HEALTH CHECK (must be first) ================== */
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Debug test route
app.get("/debug-test", (req, res) => {
  res.json({ 
    message: "Debug test working", 
    timestamp: new Date().toISOString(),
    routes: app._router.stack.filter(layer => layer.route).map(layer => layer.route.path)
  });
});

/* ================== CORE MIDDLEWARE ================== */
app.use(express.json());

/* ================== CORRELATION & OBSERVABILITY ================== */
app.use(correlationMiddleware);
app.use(errorContextEnrichmentMiddleware);
app.use(errorRateMonitoringMiddleware());
app.use(tracingMiddleware);
app.use(asyncContextTracingMiddleware);
app.use(databaseTracingMiddleware);
app.use(externalServiceTracingMiddleware);
app.use(cacheTracingMiddleware);
app.use(businessLogicTracingMiddleware);
app.use(performanceTracingMiddleware);
app.use(traceAggregationMiddleware);
app.use(requestTrackingMiddleware);
app.use(businessEventTrackingMiddleware);

/* ================== SECURITY MIDDLEWARE ================== */
app.use(securityHeaders);
app.use(requestId);
app.use(apiSecurityHeaders);
app.use(xssProtection);
app.use(sqlInjectionProtection);
app.use(requestSizeLimit('10mb'));

/* ================== RATE LIMITING ================== */
app.use(suspiciousActivityMiddleware);
app.use(rateLimiter);

/* ================== METRICS ================== */
app.use(metricsMiddleware);

/* ================== CORS ================== */
app.use(cors(corsOptions));

/* Request logging */
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, { requestId: req.id });
  next();
});

/* morgan -> winston */
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

/* ================== ERROR TRACKING ================== */
app.use(errorTrackingMiddleware);

/* ================== READINESS CHECK (after middleware) ================== */
app.use("/readiness", healthRoutes);

/* ================== ROUTES ================== */
// PUBLIC (versioned) with rate limiting
app.use("/api/v1/auth", authRateLimiter, authRoutes);
app.use("/api/v1/email-verification", authRateLimiter, emailVerificationRoutes);
app.use("/api/v1/password-reset", authRateLimiter, passwordResetRoutes);
app.use("/api/v1/test", testRoutes);
app.use("/api/v1/posts", rateLimiter, postRoutes);

// PROTECTED (versioned) with rate limiting
app.use("/api/v1/comments", commentRateLimiter, commentRoutes);
app.use("/api/v1/likes", rateLimiter, likeRoutes);
app.use("/api/v1/users", rateLimiter, userRoutes);

// OBSERVABILITY (versioned)
app.use("/api/v1/observability", observabilityRoutes);

// GAMIFICATION (versioned) with rate limiting
app.use("/api/v1/gamification", rateLimiter, gamificationRoutes);

// WORKFLOW (versioned) with rate limiting
app.use("/api/v1/workflows", rateLimiter, workflowRoutes);

// AI ANALYTICS (versioned) with rate limiting
app.use("/api/v1/ai-analytics", rateLimiter, aiAnalyticsRoutes);

// LEARNING PATHS & MENTOR RECOMMENDATIONS (versioned) with rate limiting
app.use("/api/v1", rateLimiter, learningPathsRoutes);

// SKILL GAP ANALYSIS & CONTENT RECOMMENDATIONS (versioned) with rate limiting
app.use("/api/v1", rateLimiter, skillGapRecommendationRoutes);

/* ================== API DOCUMENTATION ================== */
app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

// API specification in JSON format
app.get("/api/v1/docs.json", (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

/* ================== GLOBAL ERROR HANDLER ================== */
app.use(errorHandler);

/* ================== SERVER & SOCKET.IO ================== */
const PORT = env?.PORT || process.env.PORT || 4000;
const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Initialize gamification socket service
const gamificationSocketService = new GamificationSocketService(io);

// Initialize workflow socket service
const workflowSocketService = new WorkflowSocketService(io);

// Initialize AI analytics socket service
const aiAnalyticsSocketService = new AIAnalyticsSocketService(io);

// Initialize learning paths socket service
const learningPathsSocketService = new LearningPathsSocketService(io);

io.on("connection", (socket) => {
  structuredLogger.info('Socket connected', { 
    type: 'socket_event',
    event: 'connection',
    socketId: socket.id,
    ip: socket.handshake.address
  });

  // Handle authentication for socket
  socket.on('authenticate', (userData) => {
    if (userData && userData.userId) {
      socket.userId = userData.userId;
      gamificationSocketService.handleUserConnection(socket);
      workflowSocketService.handleUserConnection(socket);
      aiAnalyticsSocketService.handleUserConnection(socket);
      learningPathsSocketService.handleUserConnection(socket);
    }
  });

  socket.on("join-room", (room) => {
    socket.join(room);
    structuredLogger.info('Joined room', { 
      type: 'socket_event',
      event: 'join_room',
      socketId: socket.id,
      room
    });
  });

  socket.on("disconnect", () => {
    structuredLogger.info('Socket disconnected', { 
      type: 'socket_event',
      event: 'disconnect',
      socketId: socket.id
    });
  });
});

// Server startup with resilient database connection
if (process.env.NODE_ENV !== 'test') {
  console.time('startup');
  
  server.listen(PORT, () => {
    console.timeEnd('startup');
    
    structuredLogger.info('Server started successfully', {
      type: 'server_event',
      event: 'startup',
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      pid: process.pid
    });
    
    structuredLogger.info('API endpoints available', {
      type: 'server_info',
      baseUrl: `http://localhost:${PORT}`,
      docsUrl: `http://localhost:${PORT}/api/v1/docs`,
      healthUrl: `http://localhost:${PORT}/health`
    });
    
    // Initialize dependencies asynchronously (non-blocking)
    initializeDependencies();
  });
}

// Separate async function for dependency initialization
async function initializeDependencies() {
  try {
    // Validate configuration
    validateConfig();
    
    // Initialize database connection (non-blocking)
    await connectDatabase();
    structuredLogger.info('Database connected successfully', {
      type: 'database_event',
      event: 'connected'
    });
    
    // Initialize queue service
    await queueService.initialize();
    structuredLogger.info('Queue service initialized successfully', {
      type: 'queue_event',
      event: 'initialized'
    });
    
  } catch (error) {
    structuredLogger.logErrorWithContext(
      error,
      { 
        type: 'dependency_initialization_error',
        nonFatal: true
      }
    );
    // Don't exit - server remains running, readiness will report not ready
  }
}
