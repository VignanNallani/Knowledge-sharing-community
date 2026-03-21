# Moderation & Trust System - Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing, deploying, and maintaining the Moderation & Trust System. It covers database setup, API configuration, testing procedures, and operational best practices.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Database Setup](#database-setup)
- [API Configuration](#api-configuration)
- [Testing & Validation](#testing--validation)
- [Deployment Guide](#deployment-guide)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Prerequisites

### System Requirements

#### Minimum Requirements
- **Node.js**: 18.x or higher
- **PostgreSQL**: 14.x or higher
- **Redis**: 6.x or higher
- **Memory**: 4GB RAM
- **Storage**: 50GB SSD
- **CPU**: 2 cores

#### Recommended Production Requirements
- **Node.js**: 18.x LTS
- **PostgreSQL**: 15.x with replication
- **Redis**: 7.x cluster
- **Memory**: 16GB RAM
- **Storage**: 500GB SSD
- **CPU**: 8 cores
- **Load Balancer**: Nginx or AWS ALB

### Software Dependencies

```json
{
  "dependencies": {
    "@prisma/client": "^5.0.0",
    "express": "^4.18.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "joi": "^17.9.0",
    "redis": "^4.6.0",
    "winston": "^3.10.0",
    "prometheus-client": "^14.2.0"
  },
  "devDependencies": {
    "jest": "^29.6.0",
    "supertest": "^6.3.0",
    "eslint": "^8.45.0",
    "prettier": "^3.0.0"
  }
}
```

---

## Database Setup

### 1. PostgreSQL Installation

#### Ubuntu/Debian
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE moderation_db;
CREATE USER moderation_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE moderation_db TO moderation_user;
\q
```

#### Docker
```bash
# Using Docker Compose
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: moderation_db
      POSTGRES_USER: moderation_user
      POSTGRES_PASSWORD: secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql

volumes:
  postgres_data:
```

### 2. Schema Migration

#### Apply Schema
```bash
# Connect to database
psql -h localhost -U moderation_user -d moderation_db

# Apply moderation schema
\i db/moderation_schema.sql

# Verify tables
\dt
```

#### Prisma Setup
```bash
# Install Prisma CLI
npm install prisma --save-dev

# Generate client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database (optional)
npx prisma db seed
```

### 3. Redis Configuration

#### Basic Setup
```bash
# Install Redis
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set these configurations:
# bind 127.0.0.1
# requirepass your_redis_password
# maxmemory 2gb
# maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis-server
```

#### Redis Cluster (Production)
```bash
# Create Redis cluster configuration
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 \
  127.0.0.1:7002 127.0.0.1:7003 \
  127.0.0.1:7004 127.0.0.1:7005 \
  --cluster-replicas 1
```

---

## API Configuration

### 1. Environment Setup

#### Environment Variables
```bash
# .env file
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://moderation_user:secure_password@localhost:5432/moderation_db

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=your_super_secure_jwt_secret_here
JWT_EXPIRES_IN=24h

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/moderation/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=100

# External Services
WEBHOOK_SECRET=your_webhook_secret
EMAIL_SERVICE_API_KEY=your_email_api_key
```

#### Configuration File
```javascript
// config/index.js
module.exports = {
  development: {
    database: {
      url: process.env.DATABASE_URL,
      ssl: false
    },
    redis: {
      host: 'localhost',
      port: 6379,
      password: process.env.REDIS_PASSWORD
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: '24h'
    },
    logging: {
      level: 'debug',
      file: './logs/app.log'
    }
  },
  production: {
    database: {
      url: process.env.DATABASE_URL,
      ssl: true,
      pool: {
        min: 5,
        max: 20
      }
    },
    redis: {
      url: process.env.REDIS_URL,
      tls: true
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: '24h'
    },
    logging: {
      level: 'info',
      file: '/var/log/moderation/app.log'
    }
  }
};
```

### 2. API Server Setup

#### Main Application File
```javascript
// app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const config = require('./config');
const moderationRoutes = require('./src/modules/moderation/routes');
const authMiddleware = require('./src/middleware/authMiddleware');
const errorHandler = require('./src/middleware/errorHandler');
const logger = require('./src/utils/logger');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP'
});
app.use(limiter);

// General middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Routes
app.use('/api/moderation', authMiddleware, moderationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Moderation API server running on port ${PORT}`);
});

module.exports = app;
```

### 3. Database Connection

#### Prisma Client Setup
```javascript
// src/config/prisma.js
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

class PrismaClientExtended extends PrismaClient {
  constructor() {
    super({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' }
      ]
    });

    this.$on('query', (e) => {
      logger.debug('Query: ' + e.query);
      logger.debug('Params: ' + e.params);
      logger.debug('Duration: ' + e.duration + 'ms');
    });

    this.$on('error', (e) => {
      logger.error('Database error:', e);
    });
  }
}

const prisma = new PrismaClientExtended();

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('Prisma client disconnected');
});

module.exports = prisma;
```

---

## Testing & Validation

### 1. Unit Testing

#### Test Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

#### Example Test
```javascript
// tests/moderation/reports.test.js
const request = require('supertest');
const app = require('../../app');
const { createTestUser, createTestPost } = require('../helpers');

describe('Reports API', () => {
  let userToken, moderatorToken, testPost;

  beforeEach(async () => {
    const user = await createTestUser({ role: 'USER' });
    const moderator = await createTestUser({ role: 'MODERATOR' });
    testPost = await createTestPost({ authorId: user.id });
    
    userToken = generateToken(user);
    moderatorToken = generateToken(moderator);
  });

  it('should create a report', async () => {
    const reportData = {
      reportedPostId: testPost.id,
      flagType: 'SPAM',
      reason: 'This is spam content',
      severity: 'MEDIUM'
    };

    const response = await request(app)
      .post('/api/moderation/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .send(reportData)
      .expect(201);

    expect(response.body.report).toBeDefined();
    expect(response.body.report.flagType).toBe('SPAM');
  });

  it('should reject invalid report data', async () => {
    const invalidData = {
      // Missing required fields
    };

    await request(app)
      .post('/api/moderation/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .send(invalidData)
      .expect(400);
  });
});
```

### 2. Integration Testing

#### Database Integration Tests
```javascript
// tests/integration/database.test.js
const prisma = require('../../src/config/prisma');
const ModerationService = require('../../src/modules/moderation/service');

describe('Database Integration', () => {
  let moderationService;

  beforeAll(async () => {
    moderationService = new ModerationService(prisma);
  });

  it('should create and retrieve reports', async () => {
    const reportData = {
      reporterId: 1,
      reportedPostId: 1,
      flagType: 'SPAM',
      reason: 'Test report'
    };

    const created = await moderationService.createReport(reportData, 1);
    expect(created.id).toBeDefined();

    const retrieved = await moderationService.getReportById(created.id);
    expect(retrieved.id).toBe(created.id);
  });

  it('should handle trust score calculations', async () => {
    const trustScore = await moderationService.calculateTrustScore(1);
    expect(trustScore.overallScore).toBeGreaterThanOrEqual(0);
    expect(trustScore.overallScore).toBeLessThanOrEqual(100);
  });
});
```

### 3. Load Testing

#### Artillery Configuration
```yaml
# artillery-config.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 20
    - duration: 60
      arrivalRate: 5

scenarios:
  - name: "Create Reports"
    weight: 70
    flow:
      - post:
          url: "/api/moderation/reports"
          headers:
            Authorization: "Bearer {{ $randomUserToken() }}"
          json:
            reportedPostId: "{{ $randomPostId() }}"
            flagType: "SPAM"
            reason: "Load test report"

  - name: "Get Dashboard"
    weight: 30
    flow:
      - get:
          url: "/api/moderation/dashboard"
          headers:
            Authorization: "Bearer {{ $moderatorToken() }}"
```

#### Run Load Tests
```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery run artillery-config.yml

# Generate report
artillery report --output report.html artillery-results.json
```

### 4. Security Testing

#### OWASP ZAP Integration
```bash
# Install OWASP ZAP
docker pull owasp/zap2docker-stable

# Run security scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:3000/api/moderation \
  -J zap-report.json
```

#### Custom Security Tests
```javascript
// tests/security/input-validation.test.js
describe('Security Tests', () => {
  it('should prevent SQL injection', async () => {
    const maliciousInput = "'; DROP TABLE reports; --";
    
    await request(app)
      .post('/api/moderation/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        reportedPostId: 1,
        flagType: 'SPAM',
        reason: maliciousInput
      })
      .expect(400); // Should be caught by validation
  });

  it('should prevent XSS attacks', async () => {
    const xssPayload = '<script>alert("xss")</script>';
    
    const response = await request(app)
      .post('/api/moderation/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        reportedPostId: 1,
        flagType: 'SPAM',
        reason: 'Test',
        description: xssPayload
      })
      .expect(201);

    // Verify XSS is sanitized
    expect(response.body.report.description).not.toContain('<script>');
  });
});
```

---

## Deployment Guide

### 1. Docker Deployment

#### Dockerfile
```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS runtime

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Create logs directory
RUN mkdir -p /var/log/moderation && chown nodejs:nodejs /var/log/moderation

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "app.js"]
```

#### Docker Compose
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://moderation_user:${DB_PASSWORD}@postgres:5432/moderation_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./logs:/var/log/moderation
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=moderation_db
      - POSTGRES_USER=moderation_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 2. Kubernetes Deployment

#### Namespace and ConfigMaps
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: moderation

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: moderation-config
  namespace: moderation
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  RATE_LIMIT_WINDOW_MS: "3600000"
  RATE_LIMIT_MAX_REQUESTS: "100"
```

#### Secrets
```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: moderation-secrets
  namespace: moderation
type: Opaque
data:
  DATABASE_URL: <base64-encoded-database-url>
  JWT_SECRET: <base64-encoded-jwt-secret>
  REDIS_PASSWORD: <base64-encoded-redis-password>
```

#### Deployment
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: moderation-api
  namespace: moderation
spec:
  replicas: 3
  selector:
    matchLabels:
      app: moderation-api
  template:
    metadata:
      labels:
        app: moderation-api
    spec:
      containers:
      - name: moderation-api
        image: moderation-api:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: moderation-config
        - secretRef:
            name: moderation-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### Service and Ingress
```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: moderation-api-service
  namespace: moderation
spec:
  selector:
    app: moderation-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP

---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: moderation-ingress
  namespace: moderation
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.moderation.example.com
    secretName: moderation-tls
  rules:
  - host: api.moderation.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: moderation-api-service
            port:
              number: 80
```

### 3. CI/CD Pipeline

#### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy Moderation System

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Security audit
      run: npm audit --audit-level high

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    
    - name: Build Docker image
      run: |
        docker build -t moderation-api:${{ github.sha }} .
        docker tag moderation-api:${{ github.sha }} moderation-api:latest
    
    - name: Push to registry
      run: |
        echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
        docker push moderation-api:${{ github.sha }}
        docker push moderation-api:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Kubernetes
      run: |
        echo ${{ secrets.KUBE_CONFIG }} | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig
        
        # Update image in deployment
        kubectl set image deployment/moderation-api \
          moderation-api=moderation-api:${{ github.sha }} \
          -n moderation
        
        # Wait for rollout
        kubectl rollout status deployment/moderation-api -n moderation
```

---

## Monitoring & Maintenance

### 1. Application Monitoring

#### Prometheus Metrics
```javascript
// src/metrics.js
const client = require('prom-client');

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const reportsCreated = new client.Counter({
  name: 'reports_created_total',
  help: 'Total number of reports created',
  labelNames: ['flag_type', 'severity']
});

const trustScoreCalculations = new client.Counter({
  name: 'trust_score_calculations_total',
  help: 'Total number of trust score calculations'
});

register.registerMetric(httpRequestDuration);
register.registerMetric(reportsCreated);
register.registerMetric(trustScoreCalculations);

module.exports = {
  register,
  httpRequestDuration,
  reportsCreated,
  trustScoreCalculations
};
```

#### Metrics Middleware
```javascript
// src/middleware/metrics.js
const { httpRequestDuration } = require('../metrics');

const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
};

module.exports = metricsMiddleware;
```

### 2. Logging Strategy

#### Winston Configuration
```javascript
// src/utils/logger.js
const winston = require('winston');
const path = require('path');

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'moderation-api' },
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log')
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

#### Audit Logging
```javascript
// src/utils/auditLogger.js
const logger = require('./logger');

class AuditLogger {
  static log(action, userId, details = {}) {
    logger.info('AUDIT_LOG', {
      action,
      userId,
      details,
      timestamp: new Date().toISOString(),
      ip: details.ip,
      userAgent: details.userAgent
    });
  }

  static logModerationAction(action, moderatorId, caseId, targetUserId, details) {
    this.log('MODERATION_ACTION', moderatorId, {
      actionType: action,
      caseId,
      targetUserId,
      details
    });
  }

  static logTrustScoreUpdate(userId, oldScore, newScore, reason) {
    this.log('TRUST_SCORE_UPDATE', userId, {
      oldScore,
      newScore,
      scoreChange: newScore - oldScore,
      reason
    });
  }
}

module.exports = AuditLogger;
```

### 3. Health Checks

#### Comprehensive Health Check
```javascript
// src/health.js
const prisma = require('./config/prisma');
const redis = require('./config/redis');
const logger = require('./utils/logger');

class HealthChecker {
  static async checkDatabase() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', latency: Date.now() - start };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return { status: 'unhealthy', error: error.message };
    }
  }

  static async checkRedis() {
    try {
      const start = Date.now();
      await redis.ping();
      return { status: 'healthy', latency: Date.now() - start };
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return { status: 'unhealthy', error: error.message };
    }
  }

  static async checkMemory() {
    const usage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const freeMemory = require('os').freemem();
    
    return {
      status: 'healthy',
      usage: {
        rss: Math.round(usage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
        external: Math.round(usage.external / 1024 / 1024) // MB
      },
      system: {
        total: Math.round(totalMemory / 1024 / 1024), // MB
        free: Math.round(freeMemory / 1024 / 1024) // MB
      }
    };
  }

  static async overallHealth() {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      memory: await this.checkMemory()
    };

    const healthy = Object.values(checks).every(check => check.status === 'healthy');

    return {
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks
    };
  }
}

module.exports = HealthChecker;
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U moderation_user -d moderation_db

# View active connections
SELECT * FROM pg_stat_activity WHERE datname = 'moderation_db';

# Reset connections
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'moderation_db';
```

#### 2. Redis Connection Issues
```bash
# Check Redis status
sudo systemctl status redis-server

# Test connection
redis-cli ping

# Monitor Redis
redis-cli monitor

# Check memory usage
redis-cli info memory
```

#### 3. High Memory Usage
```bash
# Check Node.js process memory
ps aux | grep node

# Monitor memory usage
top -p $(pgrep node)

# Check for memory leaks
node --inspect app.js
# Then use Chrome DevTools to analyze memory
```

#### 4. Slow Database Queries
```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- Analyze slow queries
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY tablename, attname;
```

### Debug Mode

#### Enable Debug Logging
```bash
# Set debug environment
export LOG_LEVEL=debug
export NODE_ENV=development

# Run with debugging
node --inspect-brk app.js
```

#### Database Debugging
```javascript
// Enable Prisma query logging
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' }
  ],
});

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Params: ' + e.params);
  console.log('Duration: ' + e.duration + 'ms');
});
```

---

## Best Practices

### 1. Code Quality

#### ESLint Configuration
```json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error",
    "prefer-const": "error",
    "no-var": "error"
  },
  "env": {
    "node": true,
    "es2022": true
  }
}
```

#### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

### 2. Security Best Practices

#### Input Validation
```javascript
// Always validate inputs
const reportSchema = Joi.object({
  reportedPostId: Joi.number().integer().positive(),
  flagType: Joi.string().valid('SPAM', 'INAPPROPRIATE', 'HARASSMENT'),
  reason: Joi.string().min(10).max(500).required(),
  evidenceUrls: Joi.array().items(Joi.string().uri()).max(5)
});

// Validate before processing
const { error, value } = reportSchema.validate(req.body);
if (error) {
  return res.status(400).json({ error: error.details[0].message });
}
```

#### SQL Injection Prevention
```javascript
// Use parameterized queries (Prisma handles this automatically)
const reports = await prisma.report.findMany({
  where: {
    status: 'PENDING',
    severity: 'HIGH'
  }
});

// Never concatenate user input into queries
// BAD: const query = `SELECT * FROM reports WHERE status = '${userInput}'`;
// GOOD: Use parameterized queries or ORM
```

### 3. Performance Best Practices

#### Database Optimization
```javascript
// Use transactions for multiple operations
await prisma.$transaction(async (tx) => {
  await tx.report.create({ data: reportData });
  await tx.moderationCase.create({ data: caseData });
  await tx.moderationLog.create({ data: logData });
});

// Use select to limit returned fields
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    name: true,
    role: true
    // Don't select sensitive fields unless needed
  }
});
```

#### Caching Strategy
```javascript
// Cache frequently accessed data
const getCachedTrustScore = async (userId) => {
  const cacheKey = `trust_score:${userId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const trustScore = await calculateTrustScore(userId);
  await redis.setex(cacheKey, 3600, JSON.stringify(trustScore));
  
  return trustScore;
};
```

### 4. Monitoring Best Practices

#### Alert Configuration
```yaml
# Set up meaningful alerts
groups:
  - name: moderation_system
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_errors_total[5m]) > 0.05
        for: 2m
        annotations:
          summary: "Error rate is above 5%"
          
      - alert: DatabaseSlowQueries
        expr: avg(pg_stat_statements_mean_exec_time) > 1000
        for: 5m
        annotations:
          summary: "Database queries are slow"
```

#### Log Analysis
```bash
# Monitor error logs
tail -f logs/error.log | grep "ERROR"

# Analyze request patterns
grep "POST /api/moderation/reports" logs/combined.log | wc -l

# Find slow requests
grep "duration" logs/combined.log | awk '$8 > 1000' | sort -nr
```

---

## Conclusion

This implementation guide provides comprehensive instructions for deploying and maintaining the Moderation & Trust System. Following these best practices ensures:

- **Reliability**: Robust error handling and monitoring
- **Security**: Multi-layered security approach
- **Performance**: Optimized database queries and caching
- **Scalability**: Horizontal scaling capabilities
- **Maintainability**: Clean code and comprehensive testing

Regular maintenance and monitoring are essential for keeping the system running smoothly and securely.

---

*Guide version: 1.0*  
*Last updated: February 12, 2026*  
*Maintainer: DevOps Team*
