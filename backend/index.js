// Load environment variables FIRST - before any other imports
import dotenv from 'dotenv';
dotenv.config();

import './src/config/env.js';
import 'express-async-errors';
import morgan from 'morgan';
import ApiResponse from './src/utils/ApiResponse.js';

import { connectDatabase } from './src/config/database.js';

// Import event subscribers to auto-initialize
import './src/core/events/subscribers/index.js';

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import http from "http";
import cluster from 'cluster';
import os from 'os';
import { performance } from 'perf_hooks';

// Import event-loop-lag for performance monitoring
import eventLoopLag from 'event-loop-lag';

// Import process handlers for production stability
import processHandlers from './src/utils/processHandlers.js';

// Import socket service
import socketService from './src/config/socket.js';

// Import production resilience middleware (temporarily disabled for debugging)
// import AbortableRequestTimeout from './src/middleware/abortableRequestTimeout.js';
// import ConcurrencyGuard from './src/middleware/concurrencyGuard.js';
// import LoadShedder from './src/monitoring/loadShedder.js';
// import SlowQueryLogger from './src/monitoring/slowQueryLogger.js';
// import MemoryGuard from './src/monitoring/memoryGuard.js';
// import GracefulShutdown from './src/monitoring/gracefulShutdown.js';
// import DistributedRateLimiter from './src/middleware/distributedRateLimiter.js';
// import MetricsCollector from './src/monitoring/metricsCollector.js';
// import productionMetrics from './src/utils/productionMetrics.js';
// import AdmissionControl from './src/middleware/admissionControl.js';
// import RequestProfiler from './src/monitoring/requestProfiler.js';
import OptimizedPostController from './src/controllers/optimizedPostController.js';
import PostController from './src/controllers/postController.js';
import { 
  loginRateLimit, 
  registerRateLimit, 
  refreshTokenRateLimit,
  createPostRateLimit,
  createCommentRateLimit,
  readRateLimit
} from './src/middleware/rateLimitMiddleware.js';

// Swagger
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger.js";

// Middleware
import { 
  securityHeaders, 
  corsOptions, 
  xssProtection, 
  sqlInjectionProtection, 
  requestId,
  apiSecurityHeaders 
} from "./src/middleware/security.middleware.js";
import {
  rateLimiter,
  authRateLimiter,
  commentRateLimiter,
  followRateLimiter,
  searchRateLimiter,
  suspiciousActivityMiddleware,
  requestSizeLimit
} from "./src/middleware/rateLimit.middleware.js";
import { authenticate } from "./src/middleware/authMiddleware.js";
import { errorHandler } from "./src/middleware/error.middleware.js";
import { requestTracking } from "./src/utils/observability.js";
import { correlationMiddleware } from "./src/middleware/correlation.middleware.js";
import { requestTrackingMiddleware, businessEventTrackingMiddleware, errorTrackingMiddleware } from "./src/middleware/request-tracking.middleware.js";
import { errorTrackingMiddleware as intelligentErrorTracking, errorRateMonitoringMiddleware, errorContextEnrichmentMiddleware } from "./src/middleware/error-tracking.middleware.js";
import { 
  tracingMiddleware, 
  databaseTracingMiddleware, 
  externalServiceTracingMiddleware, 
  cacheTracingMiddleware,
  businessLogicTracingMiddleware,
  performanceTracingMiddleware,
  errorTracingMiddleware as tracingErrorMiddleware,
  asyncContextTracingMiddleware,
  traceAggregationMiddleware 
} from "./src/middleware/tracing.middleware.js";

// Routes (MVP ONLY)
import authRoutes from "./src/routes/auth.js";
import postRoutes from "./src/routes/posts.js";
import userRoutes from "./src/routes/user.js";
import commentRoutes from "./src/routes/comments.js";
import likeRoutes from "./src/routes/likes.js";
import followRoutes from "./src/routes/follow.js";
import feedRoutes from "./src/routes/feed.js";
import notificationRoutes from "./src/routes/notifications.routes.js";
import internalRoutes from "./src/routes/internal.js";
import eventRoutes from "./src/routes/events.js";
import chatRoutes from "./src/routes/chat.js";
import bookingRoutes from "./src/routes/booking.routes.js";
// import mentorshipRoutes from "./src/routes/mentorship.js";
import mentorshipRoutes from "./src/routes/mentorship.routes.simple.js";
import adminRoutes from "./src/routes/admin.js";
import observabilityRoutes from "./src/routes/observability.routes.js";
import emailVerificationRoutes from "./src/routes/emailVerification.routes.js";
import passwordResetRoutes from "./src/routes/passwordReset.routes.js";

// Config
import { env, logger } from "./src/config/index.js";
import getPrisma from './src/config/prisma.js';

let io; // Declare io at module level for export

const app = express();

// Trust proxy for production deployments (Render/Railway)
app.set('trust proxy', 1);

async function startServer() {
  // Initialize production resilience components (temporarily disabled)
  // const memoryGuard = new MemoryGuard({
  //   maxHeapThreshold: 500 * 1024 * 1024, // 500MB
  //   maxHeapUsedThreshold: 400 * 1024 * 1024, // 400MB
  //   checkInterval: 30000 // 30 seconds
  // });

  // const loadShedder = new LoadShedder({
  //   warningThreshold: 0.7,    // 70%
  //   loadShedThreshold: 0.8,   // 80%
  //   criticalThreshold: 0.9,   // 90%
  //   emergencyThreshold: 0.95, // 95%
  //   checkInterval: 30000,     // 30 seconds
  //   memoryGuard,
  //   logger
  // });

  // const concurrencyGuard = new ConcurrencyGuard({
  //   maxConcurrent: 100,
  //   loadShedThreshold: 0.8,    // 80%
  //   circuitBreakerThreshold: 0.9, // 90%
  //   circuitResetTimeout: 30000 // 30 seconds
  // });

  // Initialize metrics collector
  // const metricsCollector = new MetricsCollector();

  // Initialize admission control (mathematical capacity enforcement)
  // const admissionControl = new AdmissionControl({
  //   poolSize: 50,  // Further increased based on 32x optimization and measured capacity
  //   targetUtilization: 0.7  // Allows 35 concurrent requests
  // });

  // Initialize request profiler for performance analysis
  // const requestProfiler = new RequestProfiler();

  const optimizedPostController = new OptimizedPostController();

  // Initialize distributed rate limiters (fallback to in-memory if Redis unavailable)
  const createRateLimiter = async (config) => {
    try {
      // const distributedRateLimiter = new DistributedRateLimiter({
      //   redis: {
      //     host: process.env.REDIS_HOST || 'localhost',
      //     port: process.env.REDIS_PORT || 6379,
      //     password: process.env.REDIS_PASSWORD
      //   },
      //   logger
      // });
      // return distributedRateLimiter;
    } catch (error) {
      logger.warn('Redis not available, falling back to in-memory rate limiting', { error: error.message });
      // Fallback to in-memory rate limiter
      const rateLimiterModule = await import('./src/middleware/rateLimiter.js');
      return new rateLimiterModule.default(config);
    }
  };

  const loginRateLimiter = await createRateLimiter({ windowMs: 60000, maxRequests: 5 });
  const registerRateLimiter = await createRateLimiter({ windowMs: 60000, maxRequests: 3 });
  const writeRateLimiter = await createRateLimiter({ windowMs: 60000, maxRequests: 20 });
  const readRateLimiter = await createRateLimiter({ windowMs: 60000, maxRequests: 5000 }); // Temporarily disable for testing

  // Start monitoring components (temporarily disabled)
  // memoryGuard.start();
  // loadShedder.start();

  // Setup Prisma slow query logging - DISABLED FOR TESTING
  const prisma = getPrisma();
  // if (prisma.$use) {
  //   prisma.$use(slowQueryLogger.createPrismaMiddleware());
  // }

  // Initialize metrics collection - DISABLED FOR TESTING
  // metricsCollector.databaseMetrics(prisma);
  // metricsCollector.setPrisma(prisma); // Set prisma for pool monitoring
  // metricsCollector.instrumentPrisma(prisma); // Add in-memory query tracking
  // metricsCollector.startProcessMetrics();

  // Don't connect to database at startup - make it lazy
  // await connectDatabase();

  /* ================== CORE MIDDLEWARE ================== */
  app.use(express.json());
  app.use(cookieParser());

  /* ================== METRICS COLLECTION ================== */
  // Request profiler for detailed latency analysis (first) - PROPERLY GATED (temporarily disabled)
  // app.use(requestProfiler.middleware());

  // HTTP metrics collection (before other middleware for accurate timing) - DISABLED FOR TESTING
  // app.use(metricsCollector.httpRequestMetrics());

  /* ================== RESILIENCE MIDDLEWARE ================== */
  // Apply admission control FIRST (mathematical capacity enforcement) - RE-ENABLED FOR TESTING (temporarily disabled)
  // app.use(admissionControl.middleware(metricsCollector));

  // Apply concurrency guard (request-level protection) (temporarily disabled)
  // app.use(concurrencyGuard.middleware());

  // Apply load shedding (memory-based protection) (temporarily disabled)
  // app.use(loadShedder.middleware());

  // Apply abortable timeout (request cancellation) (temporarily disabled)
  // app.use(abortableTimeout.middleware());

  /* ================== OBSERVABILITY ================== */
  // Note: HTTP metrics are now handled by metricsCollector.httpRequestMetrics() above

  /* ================== CORRELATION & OBSERVABILITY ================== */
  app.use(correlationMiddleware);
  // app.use(errorContextEnrichmentMiddleware()); // Temporarily disabled due to error
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
  // Force CORS headers for all requests (before security middleware)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,X-Request-ID');
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });
  
  app.use(securityHeaders);
  app.use(requestId);
  app.use(apiSecurityHeaders);
  app.use(xssProtection);
  app.use(sqlInjectionProtection);
  app.use(requestSizeLimit('10mb'));

  /* ================== RATE LIMITING ================== */
  app.use(suspiciousActivityMiddleware);
  app.use(rateLimiter);

  /* ================== CORS ================== */
  app.use(cors(corsOptions));

  /* request logging */
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`, { requestId: req.id });
    next();
  });

  /* morgan -> winston with sensitive data redaction */
  app.use(morgan('combined', {
    stream: { 
      write: (message) => {
        // Redact sensitive data
        const redactedMessage = message
          .replace(/password=[^&\s]*/gi, 'password=***REDACTED***')
          .replace(/authorization=[^&\s]*/gi, 'authorization=***REDACTED***')
          .replace(/token=[^&\s]*/gi, 'token=***REDACTED***');
        logger.info(redactedMessage.trim());
      }
    }
  }));

  /* ================== OBSERVABILITY ================== */
  app.use(requestTracking);

  // Request metrics collection
  app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const route = req.route?.path || req.path;
      
      // Simple metrics recording
      logger.debug(`Request: ${req.method} ${route} - ${res.statusCode} - ${duration}ms`);
    });
    
    next();
  });

  /* ================== ERROR TRACKING ================== */
  app.use(errorTrackingMiddleware);
  app.use(intelligentErrorTracking);
  app.use(tracingErrorMiddleware);

  /* ================== METRICS ENDPOINT ================== */
  // Expose Prometheus metrics
  app.get('/metrics', async (req, res) => {
    try {
      // Update Redis metrics if available (pool metrics are updated continuously)
      if (loginRateLimiter && loginRateLimiter.redis) {
        await metricsCollector.updateRedisMetrics(loginRateLimiter.redis);
      }
      
      // Get metrics from Prometheus registry
      const { register } = await import('./src/utils/metrics.js');
      const metrics = await register.metrics();
      res.set('Content-Type', register.contentType);
      res.end(metrics);
    } catch (error) {
      logger.error('Error serving metrics', { error: error.message });
      res.status(500).end('Error collecting metrics');
    }
  });

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Readiness probe - enhanced with DB status
  app.get("/readiness", async (req, res) => {
    const checks = {
      server: true,
      database: false,
      memory: true
    };

    let dbStatus = 'disconnected';
    let dbError = null;

    // Check database connectivity
    try {
      const db = await import('./src/config/database.js');
      const databaseService = db.default;
      const healthResult = await databaseService.healthCheck();
      checks.database = healthResult.status === 'healthy';
      dbStatus = healthResult.status;
    } catch (error) {
      dbError = error.message;
      checks.database = false;
    }

    // Get memory usage
    const memUsage = process.memoryUsage();
    const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    const isReady = checks.server && checks.database && memoryUsagePercent < 90;
    const statusCode = isReady ? 200 : 503;

    res.status(statusCode).json({
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
      database: {
        status: dbStatus,
        error: dbError
      },
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
        usagePercent: Math.round(memoryUsagePercent * 100) / 100
      }
    });
  });

  // Prometheus metrics endpoint
  app.get("/metrics", async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      // Trigger restart - users endpoint fixed:', error);
      logger.error('Metrics endpoint failed:', error);
      res.status(500).end('Error generating metrics');
    }
  });

  // Alerting health check - simple response
  app.get("/alerting/health", (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Test registration endpoint - NO VALIDATION
  app.post("/api/v1/auth/register-test", async (req, res) => {
    try {
      console.log('🧪 Test endpoint - Received data:', req.body);
      const { name, email, password, role } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }
      
      // Simple success response for testing
      return res.status(201).json({ 
        success: true, 
        message: "Test registration successful",
        data: { name, email, role: role || 'USER' }
      });
    } catch (error) {
      console.error('🧪 Test endpoint error:', error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  });

  /* ================== ROUTES ================== */
  // Create rate limiting middleware factory
  const rateLimitMiddleware = (limiter) => {
    return async (req, res, next) => {
      try {
        const key = `${req.ip}_${req.user?.id || 'anonymous'}`;
        const result = await limiter.isAllowed(key);
        
        if (!result.allowed) {
          logger.warn('Rate limit exceeded', {
            ip: req.ip,
            userId: req.user?.id,
            userAgent: req.headers['user-agent']
          });

          return res.status(429).json({
            success: false,
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many requests. Please try again later.',
            timestamp: new Date().toISOString(),
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
          });
        }

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': limiter.maxRequests,
          'X-RateLimit-Remaining': result.remaining,
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
        });

        next();
      } catch (error) {
        logger.error('Rate limiting error', { error, ip: req.ip });
        next(); // Fail open
      }
    };
  };

  // PUBLIC (versioned) with specific rate limiting
  // Authentication routes with updated validation
  // eslint-disable-next-line no-undef
  console.log('Trigger nodemon restart');
  app.use("/api/v1/auth", rateLimitMiddleware(loginRateLimiter), authRoutes);
  app.use("/api/v1/email-verification", rateLimitMiddleware(loginRateLimiter), emailVerificationRoutes);
  app.use("/api/v1/password-reset", rateLimitMiddleware(loginRateLimiter), passwordResetRoutes);
  
  // REAL posts route with rate limiting
  app.use("/api/v1/posts", rateLimitMiddleware(readRateLimiter), postRoutes);
  
  // Search endpoint (public)
  app.get("/api/v1/search", PostController.search);
  
  // TEMPORARY notifications endpoint (fix 404 error)
  app.get('/api/v1/notifications/unread/count', (req, res) => {
    res.json({ success: true, data: { count: 0 } });
  });

  // PROTECTED (versioned) with specific rate limiting

  // PROTECTED (versioned) with specific rate limiting
  app.use("/api/v1/comments", authenticate, rateLimitMiddleware(writeRateLimiter), commentRoutes);
  app.use("/api/v1/likes", authenticate, rateLimitMiddleware(readRateLimiter), likeRoutes);
  app.use("/api/v1/users", rateLimitMiddleware(readRateLimiter), userRoutes);
  app.use("/api/v1/follow", authenticate, rateLimitMiddleware(readRateLimiter), followRoutes);
  app.use("/api/v1/feed", rateLimitMiddleware(readRateLimiter), feedRoutes);
  app.use("/api/v1/notifications", authenticate, rateLimitMiddleware(readRateLimiter), notificationRoutes);

  // INTERNAL (admin only) with stricter rate limiting
  app.use("/internal", authenticate, rateLimiter, internalRoutes);

  // EVENTS (versioned) with rate limiting
  app.use("/api/v1/events", rateLimiter, eventRoutes);

  // CHAT (versioned) with rate limiting
  app.use("/api/v1/chat", authenticate, rateLimiter, chatRoutes);

  // BOOKING (versioned) with rate limiting (auth handled per-route)
  app.use("/api/v1/bookings", rateLimitMiddleware(readRateLimiter), bookingRoutes);

  // ADMIN (versioned) with rate limiting
  app.use("/api/v1/admin", authenticate, rateLimiter, adminRoutes);

  // MENTORSHIP (versioned) - public endpoints first, then protected
  app.use("/api/v1/mentorship", rateLimiter, mentorshipRoutes);

  // OBSERVABILITY (versioned)
  app.use("/api/v1/observability", observabilityRoutes);

  // PERFORMANCE TESTING ENDPOINTS
  app.get("/api/v1/posts-optimized", optimizedPostController.getPostsOptimized.bind(optimizedPostController));
  app.get("/api/v1/performance-compare", optimizedPostController.comparePerformance.bind(optimizedPostController));

  /* ================== GLOBAL ERROR HANDLER ================== */
  app.use(errorHandler);

  /* ================== SERVER & SOCKET.IO ================== */
  const PORT = env?.PORT || process.env.PORT || 4000;
  const server = http.createServer(app);

  // Initialize graceful shutdown
  // const gracefulShutdown = new GracefulShutdown({
  //   shutdownTimeout: 10000 // 10 seconds
  // });

  // Initialize graceful shutdown handler (temporarily disabled)
  // gracefulShutdown.initialize(server, memoryGuard);

  // Add request tracking middleware (temporarily disabled)
  // app.use((req, res, next) => {
  //   if (!gracefulShutdown.trackRequest(req, res)) {
  //     return; // Request rejected during shutdown
  //   }
  //   next();
  // });

  // Register server with process handlers for graceful shutdown (temporarily disabled)
  // processHandlers.setServer(server);

  // Initialize socket service
  socketService.initialize(server);

  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Server running on http://localhost:${PORT}`);
    logger.info(`📘 Swagger Docs: http://localhost:${PORT}/api/docs`);
    
    // Memory monitoring during load test
    setInterval(() => {
      const mem = process.memoryUsage();
      console.log("Memory MB:", {
        rss: (mem.rss / 1024 / 1024).toFixed(2),
        heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(2),
        heapTotal: (mem.heapTotal / 1024 / 1024).toFixed(2),
        external: (mem.external / 1024 / 1024).toFixed(2)
      });
    }, 10000);
    
    // Event loop lag monitoring
    const lag = eventLoopLag(1000);
    setInterval(() => {
      const currentLag = lag();
      console.log("Event loop lag:", currentLag.toFixed(2), "ms");
      
      // Log warnings for high lag
      if (currentLag > 100) {
        console.log("⚠️ HIGH EVENT LOOP LAG DETECTED:", currentLag.toFixed(2), "ms");
      }
    }, 5000);
  });
}

startServer();

export {};
