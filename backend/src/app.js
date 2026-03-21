import './config/env.js';
import 'express-async-errors';
import morgan from 'morgan';
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

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
import { slowRequestLogger } from './middleware/slowRequest.middleware.js';

// Import routes
import authRoutes from "./routes/auth.js";
import postRoutes from "./routes/posts.js";
import userRoutes from "./routes/user.js";
import commentRoutes from "./routes/comments.js";
import likeRoutes from "./routes/likes.js";
import observabilityRoutes from "./routes/observability.routes.js";
import healthRoutes, { metricsMiddleware } from "./routes/health.routes.js";
import adminRoutes from "./routes/admin.js";
import metricsRoutes from "./routes/metrics.js";

// Setup global error handlers
handleUnhandledRejection();
handleUncaughtException();

const app = express();

/* ================== PURE HEALTH CHECK (must be first) ================== */
app.get("/health", (req, res) => {
  res.status(200).json({ status: 'ok' });
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

/* ================== SLOW REQUEST LOGGING ================== */
app.use(slowRequestLogger);

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
app.use("/api/v1/posts", rateLimiter, postRoutes);

// PROTECTED (versioned) with rate limiting
app.use("/api/v1/comments", commentRateLimiter, commentRoutes);
app.use("/api/v1/likes", rateLimiter, likeRoutes);
app.use("/api/v1/users", rateLimiter, userRoutes);
app.use("/api/v1/admin", rateLimiter, adminRoutes);

// OBSERVABILITY (versioned)
app.use("/api/v1/observability", observabilityRoutes);

// METRICS (versioned)
app.use("/api/v1/metrics", metricsRoutes);

/* ================== API DOCUMENTATION ================== */
app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

// API specification in JSON format
app.get("/api/v1/docs.json", (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

/* ================== GLOBAL ERROR HANDLER ================== */
app.use(errorHandler);

/* ================== EXPORTS ================== */
export { app };

// Export server creation function for tests
export const createServer = () => {
  const PORT = env?.PORT || process.env.PORT || 4000;
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://localhost:5174', 
        'http://localhost:4173',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:55384',
        'http://localhost:55384'
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    structuredLogger.info('Socket connected', { 
      type: 'socket_event',
      event: 'connection',
      socketId: socket.id,
      ip: socket.handshake.address
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

  return { server, io };
};
