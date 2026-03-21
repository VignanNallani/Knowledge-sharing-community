# Workflow Automation System Documentation

## Overview

The Workflow Automation System provides comprehensive task scheduling, workflow management, and automation capabilities with real-time updates, self-healing features, and production-ready reliability.

## Architecture

### System Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway    │    │   Workflow       │
│   Components     │    │   (Express)      │    │   Service        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Socket.io      │    │   Authentication │    │   Database       │
│   Client         │    │   & Rate Limiting │    │   (PostgreSQL)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Real-time      │    │   Error Handling  │    │   Self-Healing   │
│   Updates        │    │   & Validation    │    │   & Recovery     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Data Flow

1. **User Interaction**: Frontend components interact with API endpoints
2. **API Processing**: Express routes handle requests with authentication and validation
3. **Workflow Execution**: WorkflowService processes tasks with dependency resolution
4. **Real-time Updates**: Socket.io broadcasts status changes to connected clients
5. **Self-Healing**: Automatic error recovery with intelligent strategies

## Database Schema

### Core Tables

#### Workflow
```sql
CREATE TABLE workflows (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(50) NOT NULL,
  trigger_data TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

#### Task
```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) NOT NULL,
  config TEXT,
  status VARCHAR(50) DEFAULT 'PENDING',
  priority VARCHAR(20) DEFAULT 'MEDIUM',
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  dependencies INTEGER[],
  result TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);
```

#### WorkflowLog
```sql
CREATE TABLE workflow_logs (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL,
  task_id INTEGER,
  level VARCHAR(20) DEFAULT 'INFO',
  message TEXT NOT NULL,
  metadata TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```

#### ScheduledTask
```sql
CREATE TABLE scheduled_tasks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) NOT NULL,
  config TEXT,
  cron_expression VARCHAR(100),
  timezone VARCHAR(50) DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  run_count INTEGER DEFAULT 0,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### Enums

```sql
-- Workflow Trigger Types
CREATE TYPE workflow_trigger_type AS ENUM (
  'MANUAL',
  'EVENT_BASED',
  'SCHEDULED',
  'CONDITIONAL',
  'WEBHOOK'
);

-- Task Types
CREATE TYPE task_type AS ENUM (
  'EMAIL_NOTIFICATION',
  'PUSH_NOTIFICATION',
  'DATA_PROCESSING',
  'REPORT_GENERATION',
  'CLEANUP_TASK',
  'ANALYTICS_UPDATE',
  'GAMIFICATION_UPDATE',
  'USER_ENGAGEMENT',
  'SYSTEM_MAINTENANCE',
  'CUSTOM_ACTION'
);

-- Task Status
CREATE TYPE task_status AS ENUM (
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'RETRYING'
);

-- Task Priority
CREATE TYPE task_priority AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

-- Log Levels
CREATE TYPE log_level AS ENUM (
  'DEBUG',
  'INFO',
  'WARN',
  'ERROR',
  'FATAL'
);
```

## API Documentation

### Authentication

All API endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Workflow Endpoints

#### Get Workflows
```http
GET /api/v1/workflows
```

**Query Parameters:**
- `isActive` (boolean): Filter by active status
- `triggerType` (string): Filter by trigger type
- `search` (string): Search in name and description
- `limit` (integer): Maximum number of results (default: 50)
- `offset` (integer): Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Welcome Sequence",
      "description": "Send welcome emails to new users",
      "triggerType": "EVENT_BASED",
      "triggerData": "{\"eventType\":\"USER_REGISTERED\"}",
      "isActive": true,
      "createdBy": 1,
      "createdAt": "2023-01-01T10:00:00.000Z",
      "updatedAt": "2023-01-01T10:00:00.000Z",
      "tasks": [...],
      "creator": {
        "id": 1,
        "name": "Admin User",
        "email": "admin@example.com"
      }
    }
  ],
  "message": "Workflows retrieved successfully"
}
```

#### Create Workflow
```http
POST /api/v1/workflows
```

**Request Body:**
```json
{
  "name": "Welcome Sequence",
  "description": "Send welcome emails to new users",
  "triggerType": "EVENT_BASED",
  "triggerData": "{\"eventType\":\"USER_REGISTERED\"}",
  "tasks": [
    {
      "name": "Send Welcome Email",
      "description": "Send welcome email to new user",
      "taskType": "EMAIL_NOTIFICATION",
      "config": "{\"recipients\":[\"user@example.com\"],\"subject\":\"Welcome!\"}",
      "priority": "HIGH",
      "maxRetries": 3
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Welcome Sequence",
    "description": "Send welcome emails to new users",
    "triggerType": "EVENT_BASED",
    "triggerData": "{\"eventType\":\"USER_REGISTERED\"}",
    "isActive": true,
    "createdBy": 1,
    "createdAt": "2023-01-01T10:00:00.000Z",
    "updatedAt": "2023-01-01T10:00:00.000Z",
    "tasks": [...],
    "creator": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@example.com"
    }
  },
  "message": "Workflow created successfully"
}
```

#### Execute Workflow
```http
POST /api/v1/workflows/{id}/execute
```

**Request Body:**
```json
{
  "triggerData": {
    "userId": 123,
    "additionalContext": "User registration"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Welcome Sequence",
    "status": "RUNNING",
    "tasks": [...]
  },
  "message": "Workflow execution started"
}
```

### Task Endpoints

#### Get Tasks
```http
GET /api/v1/workflows/tasks
```

**Query Parameters:**
- `status` (string): Filter by task status
- `taskType` (string): Filter by task type
- `limit` (integer): Maximum number of results (default: 50)
- `offset` (integer): Offset for pagination (default: 0)

#### Execute Task
```http
POST /api/v1/workflows/tasks/{id}/execute
```

#### Cancel Task
```http
POST /api/v1/workflows/tasks/{id}/cancel
```

### Scheduled Task Endpoints

#### Get Scheduled Tasks
```http
GET /api/v1/workflows/scheduled
```

**Query Parameters:**
- `isActive` (boolean): Filter by active status
- `limit` (integer): Maximum number of results (default: 50)
- `offset` (integer): Offset for pagination (default: 0)

#### Create Scheduled Task
```http
POST /api/v1/workflows/scheduled
```

**Request Body:**
```json
{
  "name": "Daily Report",
  "description": "Generate daily analytics report",
  "taskType": "REPORT_GENERATION",
  "config": "{\"reportType\":\"USER_ACTIVITY\",\"timeRange\":\"24h\"}",
  "cronExpression": "0 0 * * * *",
  "timezone": "UTC",
  "isActive": true
}
```

#### Execute Scheduled Task
```http
POST /api/v1/workflows/scheduled/{id}/execute
```

### Utility Endpoints

#### Get Workflow Statistics
```http
GET /api/v1/workflows/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalWorkflows": 25,
    "activeWorkflows": 20,
    "completedWorkflows": 15,
    "failedWorkflows": 3,
    "totalTasks": 150,
    "runningTasks": 2,
    "completedTasks": 120,
    "failedTasks": 8,
    "scheduledTasks": 5,
    "successRate": 80.0
  },
  "message": "Workflow statistics retrieved successfully"
}
```

#### Get Workflow Logs
```http
GET /api/v1/workflows/{id}/logs
```

**Query Parameters:**
- `level` (string): Filter by log level (DEBUG, INFO, WARN, ERROR, FATAL)
- `startDate` (string): Filter logs after this date (ISO 8601)
- `endDate` (string): Filter logs before this date (ISO 8601)
- `limit` (integer): Maximum number of results (default: 100)

#### Get Queue Status
```http
GET /api/v1/workflows/queue/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "queueLength": 5,
    "runningTasks": 3,
    "maxConcurrentTasks": 10,
    "isProcessingQueue": false
  },
  "message": "Queue status retrieved successfully"
}
```

## Task Types

### Email Notification
```json
{
  "taskType": "EMAIL_NOTIFICATION",
  "config": {
    "recipients": ["user@example.com"],
    "subject": "Welcome to our platform",
    "template": "welcome",
    "data": {
      "userName": "John Doe",
      "userId": 123
    }
  }
}
```

### Push Notification
```json
{
  "taskType": "PUSH_NOTIFICATION",
  "config": {
    "userIds": [123, 456],
    "title": "New Message",
    "message": "You have a new message",
    "data": {
      "messageId": 789,
      "senderId": 456
    }
  }
}
```

### Report Generation
```json
{
  "taskType": "REPORT_GENERATION",
  "config": {
    "reportType": "USER_ACTIVITY",
    "parameters": {
      "timeRange": "7d",
      "includeCharts": true,
      "format": "pdf"
    }
  }
}
```

### Data Processing
```json
{
  "taskType": "DATA_PROCESSING",
  "config": {
    "operation": "CLEANUP_INACTIVE_USERS",
    "retentionDays": 90,
    "filters": {
      "lastLoginBefore": "2023-01-01"
    }
  }
}
```

### Analytics Update
```json
{
  "taskType": "ANALYTICS_UPDATE",
  "config": {
    "updateType": "DAILY_STATS",
    "metrics": ["userActivity", "contentEngagement", "systemPerformance"]
  }
}
```

### Gamification Update
```json
{
  "taskType": "GAMIFICATION_UPDATE",
  "config": {
    "updateType": "UPDATE_LEADERBOARDS",
    "parameters": {
      "leaderboardTypes": ["GLOBAL", "SKILL_BASED"]
    }
  }
}
```

### User Engagement
```json
{
  "taskType": "USER_ENGAGEMENT",
  "config": {
    "engagementType": "WELCOME_SEQUENCE",
    "parameters": {
      "userId": 123,
      "welcomeSteps": ["email", "push", "tutorial"]
    }
  }
}
```

### System Maintenance
```json
{
  "taskType": "SYSTEM_MAINTENANCE",
  "config": {
    "maintenanceType": "HEALTH_CHECK",
    "parameters": {
      "checkDatabase": true,
      "checkMemory": true,
      "checkDisk": true
    }
  }
}
```

## Self-Healing Strategies

### Error Classification

The system automatically classifies errors and applies appropriate healing strategies:

| Error Type | Description | Healing Strategy |
|------------|-------------|-----------------|
| **TIMEOUT** | Operation timed out | Increase timeout by 50%, retry with backoff |
| **NETWORK** | Network connectivity issues | Add retry delay, reduce batch size |
| **DATABASE** | Database connection issues | Enable connection retry, reduce connections |
| **RATE_LIMIT** | API rate limiting | Exponential backoff, reduce frequency |
| **MEMORY** | Memory pressure | Don't retry, optimize memory usage |
| **DISK** | Disk space issues | Don't retry, use temporary storage |
| **VALIDATION** | Data validation errors | Don't retry, fix data issues |
| **PERMISSION** | Permission errors | Don't retry, fix permissions |
| **UNKNOWN** | Unknown errors | Standard retry with caution |

### Retry Logic

```javascript
// Exponential backoff with jitter
const calculateRetryDelay = (retryCount, backoffMultiplier = 1) => {
  const baseDelay = 1000; // 1 second
  const maxDelay = 300000; // 5 minutes
  const delay = baseDelay * Math.pow(backoffMultiplier, retryCount - 1);
  const jitter = Math.random() * 1000; // Add jitter
  return Math.min(delay + jitter, maxDelay);
};
```

### Recovery Mechanisms

#### Stuck Task Recovery
- **Detection**: Tasks stuck in RUNNING status > 30 minutes
- **Action**: Reset to PENDING status, re-queue for execution
- **Logging**: Log recovery action with context

#### Orphaned Task Cleanup
- **Detection**: Tasks without associated workflows
- **Action**: Delete orphaned tasks
- **Logging**: Log cleanup action with task details

#### Queue Optimization
- **Priority Sorting**: CRITICAL > HIGH > MEDIUM > LOW
- **Duplicate Removal**: Remove duplicate tasks from queue
- **Memory Management**: Optimize queue size under memory pressure

## Real-time Events

### Socket.io Events

#### Workflow Events
- `workflow_created` - New workflow created
- `workflow_updated` - Workflow updated
- `workflow_deleted` - Workflow deleted
- `workflow_execution_started` - Workflow execution started
- `workflow_completed` - Workflow completed
- `workflow_failed` - Workflow failed

#### Task Events
- `task_created` - New task created
- `task_updated` - Task updated
- `task_started` - Task execution started
- `task_completed` - Task completed
- `task_failed` - Task failed
- `task_retrying` - Task retrying
- `task_cancelled` - Task cancelled

#### System Events
- `workflow_log` - Workflow log entry
- `queue_status_update` - Queue status update
- `system_notification` - System notification

### Event Payloads

#### Task Started
```json
{
  "workflowId": 1,
  "taskId": 1,
  "taskName": "Send Welcome Email",
  "taskType": "EMAIL_NOTIFICATION",
  "priority": "HIGH",
  "timestamp": "2023-01-01T10:00:00.000Z"
}
```

#### Task Completed
```json
{
  "workflowId": 1,
  "taskId": 1,
  "taskName": "Send Welcome Email",
  "result": {
    "type": "EMAIL_NOTIFICATION",
    "success": true,
    "result": "Email sent successfully"
  },
  "timestamp": "2023-01-01T10:01:00.000Z"
}
```

#### Task Failed
```json
{
  "workflowId": 1,
  "taskId": 1,
  "taskName": "Send Welcome Email",
  "error": "SMTP server unavailable",
  "retryCount": 2,
  "maxRetries": 3,
  "timestamp": "2023-01-01T10:01:00.000Z"
}
```

## Cron Expressions

### Basic Examples
```
# Every minute
* * * * *

# Every hour at minute 0
0 * * * *

# Every day at midnight
0 0 * * *

# Every Sunday at midnight
0 0 * * SUN

# Every weekday at 9 AM
0 9 * * MON-FRI

# First day of every month at midnight
0 0 1 * *
```

### Advanced Examples
```
# Every 15 minutes
*/15 * * * *

# Every 2 hours on weekdays
0 */2 * * MON-FRI

# Last day of month at 23:59
59 23 L * *

# Every 5 minutes between 9 AM and 5 PM on weekdays
*/5 9-17 * * MON-FRI
```

## Frontend Components

### TaskScheduler Component

**Props:**
- `className` (string): Additional CSS classes
- `compact` (boolean): Compact display mode
- `animated` (boolean): Enable animations
- `maxDisplay` (number): Maximum tasks to display

**Features:**
- Task CRUD operations
- Real-time status updates
- Search and filtering
- Priority management
- Dependency visualization

### WorkflowDashboard Component

**Props:**
- `className` (string): Additional CSS classes
- `timeRange` (string): Time range for analytics
- `refreshInterval` (number): Auto-refresh interval

**Features:**
- Workflow statistics
- Real-time monitoring
- Log viewing
- Health checks
- Performance metrics

## Configuration

### Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Socket.io Configuration
SOCKET_CORS_ORIGIN=http://localhost:3000

# Workflow Configuration
WORKFLOW_MAX_CONCURRENT_TASKS=10
WORKFLOW_RETRY_DELAY_BASE=1000
WORKFLOW_RETRY_DELAY_MAX=300000
WORKFLOW_STUCK_TASK_THRESHOLD=1800000
```

### Service Configuration

```javascript
// workflow.service.js
const config = {
  maxConcurrentTasks: process.env.WORKFLOW_MAX_CONCURRENT_TASKS || 10,
  retryDelay: {
    base: parseInt(process.env.WORKFLOW_RETRY_DELAY_BASE) || 1000,
    max: parseInt(process.env.WORKFLOW_RETRY_DELAY_MAX) || 300000
  },
  stuckTaskThreshold: parseInt(process.env.WORKFLOW_STUCK_TASK_THRESHOLD) || 1800000,
  maintenanceIntervals: {
    stuckTaskRecovery: 5 * 60 * 1000, // 5 minutes
    orphanedTaskCleanup: 60 * 60 * 1000, // 1 hour
    queueOptimization: 10 * 60 * 1000, // 10 minutes
    healthCheck: 60 * 1000 // 1 minute
  }
};
```

## Monitoring & Observability

### Health Checks

#### Database Health
```javascript
const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', message: 'Database connection OK' };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
};
```

#### Memory Health
```javascript
const checkMemoryHealth = () => {
  const memoryUsage = process.memoryUsage();
  const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
  
  return {
    status: memoryUsageMB < 500 ? 'healthy' : 'warning',
    message: `Memory usage: ${memoryUsageMB.toFixed(2)}MB`,
    usage: memoryUsageMB
  };
};
```

#### Queue Health
```javascript
const checkQueueHealth = () => {
  const queueStatus = getTaskQueueStatus();
  
  return {
    status: queueStatus.queueLength < 100 ? 'healthy' : 'warning',
    message: `Queue length: ${queueStatus.queueLength}, Running: ${queueStatus.runningTasks}`,
    ...queueStatus
  };
};
```

### Metrics Collection

#### System Metrics
```javascript
const getSystemMetrics = async () => {
  const [
    totalWorkflows,
    activeWorkflows,
    totalTasks,
    runningTasks,
    completedTasks,
    failedTasks,
    scheduledTasks,
    recentLogs
  ] = await Promise.all([
    prisma.workflow.count(),
    prisma.workflow.count({ where: { isActive: true } }),
    prisma.task.count(),
    prisma.task.count({ where: { status: 'RUNNING' } }),
    prisma.task.count({ where: { status: 'COMPLETED' } }),
    prisma.task.count({ where: { status: 'FAILED' } }),
    prisma.scheduledTask.count({ where: { isActive: true } }),
    prisma.workflowLog.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    })
  ]);

  return {
    timestamp: new Date().toISOString(),
    workflows: {
      total: totalWorkflows,
      active: activeWorkflows
    },
    tasks: {
      total: totalTasks,
      running: runningTasks,
      completed: completedTasks,
      failed: failedTasks,
      successRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    },
    scheduledTasks,
    logs: {
      last24Hours: recentLogs
    },
    system: {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version
    }
  };
};
```

## Troubleshooting

### Common Issues

#### Task Not Starting
1. **Check Dependencies**: Ensure all dependencies are completed
2. **Check Queue Status**: Verify queue isn't at capacity
3. **Check System Health**: Verify system resources are available
4. **Check Logs**: Review error logs for specific issues

#### Tasks Getting Stuck
1. **Check Memory Usage**: High memory usage can cause tasks to hang
2. **Check Database**: Database issues can prevent task completion
3. **Check External Services**: External service failures can block tasks
4. **Review Error Logs**: Look for specific error patterns

#### Performance Issues
1. **Queue Optimization**: Check if queue needs optimization
2. **Resource Limits**: Verify concurrent task limits
3. **Database Performance**: Check query performance and indexing
4. **Memory Usage**: Monitor for memory leaks

### Debug Mode

Enable debug logging:
```javascript
const logger = require('./utils/logger.util');
logger.level = 'debug';
```

### Performance Profiling

Enable performance monitoring:
```javascript
const startTimer = Date.now();
// ... workflow execution
const duration = Date.now() - startTimer;
logger.info(`Workflow execution took ${duration}ms`);
```

## Security Considerations

### Authentication
- JWT-based authentication with refresh tokens
- Role-based access control for admin operations
- Rate limiting to prevent abuse

### Data Protection
- SQL injection prevention through Prisma ORM
- Input validation for all API endpoints
- Sanitization of user-provided data

### Access Control
- User can only access their own workflows
- Admin access required for system operations
- Audit trail for all workflow actions

### Rate Limiting
- 50 requests per minute per IP
- Separate limits for different endpoint types
- Automatic blocking for excessive requests

## Deployment

### Docker Configuration

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 4000

# Start application
CMD ["npm", "start"]
```

### Environment Setup

```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev

# Start production server
npm start
```

### Health Checks

```bash
# Check application health
curl http://localhost:4000/api/v1/workflows/health

# Check database connection
curl http://localhost:4000/api/v1/health

# Check queue status
curl http://localhost:4000/api/v1/workflows/queue/status
```

## API Examples

### Create Welcome Sequence Workflow

```bash
curl -X POST http://localhost:4000/api/v1/workflows \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome Sequence",
    "description": "Send welcome emails to new users",
    "triggerType": "EVENT_BASED",
    "triggerData": "{\"eventType\":\"USER_REGISTERED\"}",
    "tasks": [
      {
        "name": "Send Welcome Email",
        "description": "Send welcome email to new user",
        "taskType": "EMAIL_NOTIFICATION",
        "config": "{\"recipients\":[\"user@example.com\"],\"subject\":\"Welcome!\"}",
        "priority": "HIGH",
        "maxRetries": 3
      },
      {
        "name": "Send Push Notification",
        "description": "Send welcome push notification",
        "taskType": "PUSH_NOTIFICATION",
        "config": "{\"userIds\":[123],\"title\":\"Welcome!\",\"message\":\"Thanks for joining!\"}",
        "priority": "HIGH",
        "maxRetries": 3
      }
    ]
  }'
```

### Create Scheduled Report

```bash
curl -X POST http://localhost:4000/api/v1/workflows/scheduled \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Analytics Report",
    "description": "Generate daily analytics report",
    "taskType": "REPORT_GENERATION",
    "config": "{\"reportType\":\"USER_ACTIVITY\",\"timeRange\":\"24h\"}",
    "cronExpression": "0 9 * * * *",
    "timezone": "UTC",
    "isActive": true
  }'
```

### Execute Workflow

```bash
curl -X POST http://localhost:4000/api/v1/workflows/1/execute \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "triggerData": {
      "userId": 123,
      "additionalContext": "Manual execution"
    }
  }'
```

## Testing

### Unit Tests

Run backend tests:
```bash
npm test -- tests/unit/workflow.service.test.js
npm test -- tests/unit/workflow.routes.test.js
npm test -- tests/unit/workflow.socket.service.test.js
```

Run frontend tests:
```bash
npm test -- src/components/workflow/__tests__/TaskScheduler.test.jsx
npm test -- src/components/workflow/__tests__/WorkflowDashboard.test.jsx
```

### Integration Tests

```bash
npm run test:integration
```

### Load Testing

```bash
npm run test:load
```

## Best Practices

### Workflow Design
- Keep workflows simple and focused
- Use appropriate task priorities
- Set reasonable retry limits
- Include proper error handling
- Add comprehensive logging

### Task Configuration
- Use JSON for task configuration
- Validate configuration before execution
- Include fallback values
- Document configuration options
- Use environment-specific settings

### Error Handling
- Classify errors appropriately
- Implement retry logic with backoff
- Log errors with context
- Provide meaningful error messages
- Monitor error patterns

### Performance
- Use database indexes effectively
- Implement proper caching
- Monitor resource usage
- Optimize queue management
- Profile slow operations

### Security
- Validate all inputs
- Use parameterized queries
- Implement access controls
- Log security events
- Keep secrets secure

---

This documentation provides comprehensive information about the Workflow Automation System, including architecture, API reference, configuration, and best practices for development and deployment.
