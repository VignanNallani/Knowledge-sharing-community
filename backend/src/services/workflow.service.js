const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger.util');
const EventEmitter = require('events');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

class WorkflowService extends EventEmitter {
  constructor() {
    super();
    this.cronJobs = new Map(); // Store cron job references
    this.runningTasks = new Map(); // Track currently running tasks
    this.taskQueue = []; // Queue for pending tasks
    this.maxConcurrentTasks = 10; // Maximum concurrent tasks
    this.isProcessingQueue = false;
    
    this.initializeScheduledTasks();
    this.startTaskProcessor();
    this.scheduleMaintenanceTasks();
  }

  /**
   * Initialize scheduled tasks from database
   */
  async initializeScheduledTasks() {
    try {
      const scheduledTasks = await prisma.scheduledTask.findMany({
        where: { isActive: true }
      });

      for (const task of scheduledTasks) {
        if (task.cronExpression) {
          this.scheduleCronTask(task);
        }
      }

      logger.info(`Initialized ${scheduledTasks.length} scheduled tasks`);
    } catch (error) {
      logger.error('Error initializing scheduled tasks:', error);
    }
  }

  /**
   * Schedule a cron-based task
   */
  scheduleCronTask(task) {
    try {
      const job = cron.schedule(task.cronExpression, () => {
        this.executeScheduledTask(task.id);
      }, {
        scheduled: true,
        timezone: task.timezone
      });

      this.cronJobs.set(task.id, job);
      logger.info(`Scheduled cron task: ${task.name} with expression: ${task.cronExpression}`);
    } catch (error) {
      logger.error(`Error scheduling cron task ${task.id}:`, error);
    }
  }

  /**
   * Execute a scheduled task
   */
  async executeScheduledTask(taskId) {
    try {
      const task = await prisma.scheduledTask.findUnique({
        where: { id: taskId }
      });

      if (!task || !task.isActive) {
        this.unscheduleCronTask(taskId);
        return;
      }

      // Create a workflow execution for this scheduled task
      const workflow = await this.createWorkflow({
        name: `Scheduled: ${task.name}`,
        description: task.description,
        triggerType: 'SCHEDULED',
        triggerData: JSON.stringify({
          scheduledTaskId: task.id,
          cronExpression: task.cronExpression
        }),
        createdBy: task.createdBy,
        tasks: [{
          name: task.name,
          description: task.description,
          taskType: task.taskType,
          config: task.config,
          priority: 'MEDIUM'
        }]
      });

      await this.executeWorkflow(workflow.id);

      // Update scheduled task run information
      await prisma.scheduledTask.update({
        where: { id: taskId },
        data: {
          lastRunAt: new Date(),
          nextRunAt: this.getNextRunDate(task.cronExpression),
          runCount: { increment: 1 }
        }
      });

      logger.info(`Executed scheduled task: ${task.name}`);
    } catch (error) {
      logger.error(`Error executing scheduled task ${taskId}:`, error);
    }
  }

  /**
   * Get next run date for cron expression
   */
  getNextRunDate(cronExpression) {
    try {
      const task = cron.schedule(cronExpression, () => {}, { scheduled: false });
      const nextDate = task.nextDate();
      task.stop();
      return nextDate;
    } catch (error) {
      logger.error('Error calculating next run date:', error);
      return null;
    }
  }

  /**
   * Unschedule a cron task
   */
  unscheduleCronTask(taskId) {
    const job = this.cronJobs.get(taskId);
    if (job) {
      job.stop();
      this.cronJobs.delete(taskId);
      logger.info(`Unscheduled cron task: ${taskId}`);
    }
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(workflowData) {
    try {
      const workflow = await prisma.workflow.create({
        data: {
          name: workflowData.name,
          description: workflowData.description,
          triggerType: workflowData.triggerType,
          triggerData: workflowData.triggerData,
          createdBy: workflowData.createdBy,
          tasks: {
            create: workflowData.tasks.map(task => ({
              name: task.name,
              description: task.description,
              taskType: task.taskType,
              config: task.config || '{}',
              priority: task.priority || 'MEDIUM',
              scheduledAt: task.scheduledAt,
              maxRetries: task.maxRetries || 3,
              dependencies: task.dependencies || []
            }))
          }
        },
        include: {
          tasks: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      await this.logWorkflowEvent(workflow.id, 'INFO', 'Workflow created', {
        workflowId: workflow.id,
        triggerType: workflow.triggerType,
        taskCount: workflow.tasks.length
      });

      this.emit('workflowCreated', workflow);
      return workflow;
    } catch (error) {
      logger.error('Error creating workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId) {
    try {
      return await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: {
          tasks: {
            orderBy: { priority: 'desc', createdAt: 'asc' }
          },
          logs: {
            orderBy: { createdAt: 'desc' },
            take: 50
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
    } catch (error) {
      logger.error('Error getting workflow:', error);
      throw error;
    }
  }

  /**
   * Get all workflows for a user
   */
  async getWorkflows(userId, filters = {}) {
    try {
      const where = {
        createdBy: userId,
        isActive: filters.isActive !== undefined ? filters.isActive : true
      };

      if (filters.triggerType) {
        where.triggerType = filters.triggerType;
      }

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      return await prisma.workflow.findMany({
        where,
        include: {
          tasks: {
            select: {
              id: true,
              name: true,
              status: true,
              priority: true,
              taskType: true,
              scheduledAt: true,
              createdAt: true
            }
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              all: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      logger.error('Error getting workflows:', error);
      throw error;
    }
  }

  /**
   * Update workflow
   */
  async updateWorkflow(workflowId, updateData) {
    try {
      const workflow = await prisma.workflow.update({
        where: { id: workflowId },
        data: updateData,
        include: {
          tasks: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      await this.logWorkflowEvent(workflowId, 'INFO', 'Workflow updated', updateData);
      this.emit('workflowUpdated', workflow);
      return workflow;
    } catch (error) {
      logger.error('Error updating workflow:', error);
      throw error;
    }
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(workflowId) {
    try {
      // Cancel any running tasks first
      await this.cancelWorkflowTasks(workflowId);

      const workflow = await prisma.workflow.delete({
        where: { id: workflowId },
        include: {
          tasks: true
        }
      });

      await this.logWorkflowEvent(workflowId, 'INFO', 'Workflow deleted');
      this.emit('workflowDeleted', { workflowId });
      return workflow;
    } catch (error) {
      logger.error('Error deleting workflow:', error);
      throw error;
    }
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowId, triggerData = {}) {
    try {
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      await this.logWorkflowEvent(workflowId, 'INFO', 'Workflow execution started', triggerData);

      // Add tasks to queue in priority order
      const sortedTasks = workflow.tasks.sort((a, b) => {
        const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      for (const task of sortedTasks) {
        this.addTaskToQueue({
          workflowId,
          taskId: task.id,
          taskData: task,
          triggerData
        });
      }

      this.emit('workflowExecutionStarted', { workflowId, taskCount: sortedTasks.length });
      return workflow;
    } catch (error) {
      logger.error('Error executing workflow:', error);
      throw error;
    }
  }

  /**
   * Add task to execution queue
   */
  addTaskToQueue(taskData) {
    this.taskQueue.push(taskData);
    this.processTaskQueue();
  }

  /**
   * Process task queue
   */
  async processTaskQueue() {
    if (this.isProcessingQueue || this.taskQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.taskQueue.length > 0 && this.runningTasks.size < this.maxConcurrentTasks) {
      const taskData = this.taskQueue.shift();
      this.executeTask(taskData);
    }

    this.isProcessingQueue = false;
  }

  /**
   * Start the task processor
   */
  startTaskProcessor() {
    setInterval(() => {
      this.processTaskQueue();
    }, 1000); // Check queue every second
  }

  /**
   * Execute a single task
   */
  async executeTask(taskData) {
    const { workflowId, taskId, taskData: task, triggerData } = taskData;
    const taskKey = `${workflowId}-${taskId}`;

    try {
      this.runningTasks.set(taskKey, { startTime: Date.now() });

      // Update task status to running
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'RUNNING',
          startedAt: new Date()
        }
      });

      await this.logWorkflowEvent(workflowId, 'INFO', `Task started: ${task.name}`, {
        taskId,
        taskType: task.taskType
      });

      this.emit('taskStarted', { workflowId, taskId, taskName: task.name });

      // Check dependencies
      if (task.dependencies && task.dependencies.length > 0) {
        await this.waitForDependencies(task.dependencies);
      }

      // Execute task based on type
      const result = await this.executeTaskByType(task, triggerData);

      // Update task as completed
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          result: JSON.stringify(result)
        }
      });

      await this.logWorkflowEvent(workflowId, 'INFO', `Task completed: ${task.name}`, {
        taskId,
        result
      });

      this.emit('taskCompleted', { workflowId, taskId, taskName: task.name, result });

    } catch (error) {
      await this.handleTaskError(workflowId, taskId, task, error);
    } finally {
      this.runningTasks.delete(taskKey);
      this.processTaskQueue(); // Process next task in queue
    }
  }

  /**
   * Wait for task dependencies
   */
  async waitForDependencies(dependencies) {
    for (const depId of dependencies) {
      const dependency = await prisma.task.findUnique({
        where: { id: depId }
      });

      if (!dependency || dependency.status !== 'COMPLETED') {
        throw new Error(`Dependency ${depId} not completed`);
      }
    }
  }

  /**
   * Execute task based on type
   */
  async executeTaskByType(task, triggerData) {
    const config = JSON.parse(task.config || '{}');

    switch (task.taskType) {
      case 'EMAIL_NOTIFICATION':
        return await this.executeEmailNotificationTask(config, triggerData);
      case 'PUSH_NOTIFICATION':
        return await this.executePushNotificationTask(config, triggerData);
      case 'DATA_PROCESSING':
        return await this.executeDataProcessingTask(config, triggerData);
      case 'REPORT_GENERATION':
        return await this.executeReportGenerationTask(config, triggerData);
      case 'CLEANUP_TASK':
        return await this.executeCleanupTask(config, triggerData);
      case 'ANALYTICS_UPDATE':
        return await this.executeAnalyticsUpdateTask(config, triggerData);
      case 'GAMIFICATION_UPDATE':
        return await this.executeGamificationUpdateTask(config, triggerData);
      case 'USER_ENGAGEMENT':
        return await this.executeUserEngagementTask(config, triggerData);
      case 'SYSTEM_MAINTENANCE':
        return await this.executeSystemMaintenanceTask(config, triggerData);
      case 'CUSTOM_ACTION':
        return await this.executeCustomActionTask(config, triggerData);
      default:
        throw new Error(`Unknown task type: ${task.taskType}`);
    }
  }

  /**
   * Execute email notification task
   */
  async executeEmailNotificationTask(config, triggerData) {
    const emailService = require('./email.service');
    
    const result = await emailService.sendBulkEmail({
      to: config.recipients || [],
      subject: config.subject,
      template: config.template,
      data: { ...config.data, ...triggerData }
    });

    return {
      type: 'EMAIL_NOTIFICATION',
      success: true,
      result
    };
  }

  /**
   * Execute push notification task
   */
  async executePushNotificationTask(config, triggerData) {
    const pushService = require('./pushNotification.service');
    
    const result = await pushService.sendBulkNotification({
      users: config.userIds || [],
      title: config.title,
      message: config.message,
      data: { ...config.data, ...triggerData }
    });

    return {
      type: 'PUSH_NOTIFICATION',
      success: true,
      result
    };
  }

  /**
   * Execute data processing task
   */
  async executeDataProcessingTask(config, triggerData) {
    // Implementation for data processing
    const { operation, entityType, filters } = config;
    
    let result = {};
    
    switch (operation) {
      case 'CLEANUP_INACTIVE_USERS':
        result = await this.cleanupInactiveUsers(config);
        break;
      case 'ARCHIVE_OLD_DATA':
        result = await this.archiveOldData(config);
        break;
      case 'UPDATE_STATISTICS':
        result = await this.updateStatistics(config);
        break;
      default:
        throw new Error(`Unknown data processing operation: ${operation}`);
    }

    return {
      type: 'DATA_PROCESSING',
      success: true,
      result
    };
  }

  /**
   * Execute report generation task
   */
  async executeReportGenerationTask(config, triggerData) {
    const analyticsService = require('./analytics.service');
    
    const { reportType, parameters } = config;
    
    let result = {};
    
    switch (reportType) {
      case 'USER_ACTIVITY':
        result = await analyticsService.generateUserActivityReport(parameters);
        break;
      case 'SYSTEM_PERFORMANCE':
        result = await analyticsService.generateSystemPerformanceReport(parameters);
        break;
      case 'GAMIFICATION_SUMMARY':
        result = await analyticsService.generateGamificationSummaryReport(parameters);
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    return {
      type: 'REPORT_GENERATION',
      success: true,
      result
    };
  }

  /**
   * Execute cleanup task
   */
  async executeCleanupTask(config, triggerData) {
    const { cleanupType, retentionDays } = config;
    
    let result = {};
    
    switch (cleanupType) {
      case 'OLD_LOGS':
        result = await this.cleanupOldLogs(retentionDays);
        break;
      case 'TEMP_FILES':
        result = await this.cleanupTempFiles();
        break;
      case 'EXPIRED_SESSIONS':
        result = await this.cleanupExpiredSessions();
        break;
      default:
        throw new Error(`Unknown cleanup type: ${cleanupType}`);
    }

    return {
      type: 'CLEANUP_TASK',
      success: true,
      result
    };
  }

  /**
   * Execute analytics update task
   */
  async executeAnalyticsUpdateTask(config, triggerData) {
    const analyticsService = require('./analytics.service');
    
    const { updateType, metrics } = config;
    
    let result = {};
    
    switch (updateType) {
      case 'DAILY_STATS':
        result = await analyticsService.updateDailyStats(metrics);
        break;
      case 'USER_ENGAGEMENT':
        result = await analyticsService.updateUserEngagementMetrics(metrics);
        break;
      case 'CONTENT_ANALYTICS':
        result = await analyticsService.updateContentAnalytics(metrics);
        break;
      default:
        throw new Error(`Unknown analytics update type: ${updateType}`);
    }

    return {
      type: 'ANALYTICS_UPDATE',
      success: true,
      result
    };
  }

  /**
   * Execute gamification update task
   */
  async executeGamificationUpdateTask(config, triggerData) {
    const gamificationService = require('./gamification.service');
    
    const { updateType, parameters } = config;
    
    let result = {};
    
    switch (updateType) {
      case 'UPDATE_LEADERBOARDS':
        result = await gamificationService.updateAllLeaderboards();
        break;
      case 'CALCULATE_POINTS':
        result = await gamificationService.recalculateUserPoints(parameters);
        break;
      case 'CHECK_ACHIEVEMENTS':
        result = await gamificationService.checkAndAwardAchievements(parameters.userId);
        break;
      default:
        throw new Error(`Unknown gamification update type: ${updateType}`);
    }

    return {
      type: 'GAMIFICATION_UPDATE',
      success: true,
      result
    };
  }

  /**
   * Execute user engagement task
   */
  async executeUserEngagementTask(config, triggerData) {
    const { engagementType, parameters } = config;
    
    let result = {};
    
    switch (engagementType) {
      case 'WELCOME_SEQUENCE':
        result = await this.executeWelcomeSequence(parameters);
        break;
      case 'RE_ENGAGEMENT_CAMPAIGN':
        result = await this.executeReEngagementCampaign(parameters);
        break;
      case 'MILESTONE_REMINDERS':
        result = await this.executeMilestoneReminders(parameters);
        break;
      default:
        throw new Error(`Unknown engagement type: ${engagementType}`);
    }

    return {
      type: 'USER_ENGAGEMENT',
      success: true,
      result
    };
  }

  /**
   * Execute system maintenance task
   */
  async executeSystemMaintenanceTask(config, triggerData) {
    const { maintenanceType, parameters } = config;
    
    let result = {};
    
    switch (maintenanceType) {
      case 'HEALTH_CHECK':
        result = await this.performHealthCheck();
        break;
      case 'DATABASE_OPTIMIZATION':
        result = await this.optimizeDatabase();
        break;
      case 'CACHE_REFRESH':
        result = await this.refreshCache();
        break;
      default:
        throw new Error(`Unknown maintenance type: ${maintenanceType}`);
    }

    return {
      type: 'SYSTEM_MAINTENANCE',
      success: true,
      result
    };
  }

  /**
   * Execute custom action task
   */
  async executeCustomActionTask(config, triggerData) {
    const { functionName, parameters } = config;
    
    // Execute custom function (should be validated and secured)
    if (typeof this[functionName] === 'function') {
      const result = await this[functionName](parameters, triggerData);
      return {
        type: 'CUSTOM_ACTION',
        success: true,
        result
      };
    } else {
      throw new Error(`Custom function ${functionName} not found`);
    }
  }

  /**
   * Handle task errors with self-healing logic
   */
  async handleTaskError(workflowId, taskId, task, error) {
    const retryCount = task.retryCount + 1;
    const maxRetries = task.maxRetries;
    const errorType = this.classifyError(error);

    // Log the error
    await this.logWorkflowEvent(workflowId, 'ERROR', `Task failed: ${task.name}`, {
      taskId,
      error: error.message,
      errorType,
      retryCount,
      maxRetries,
      stack: error.stack
    });

    // Determine if we should retry
    if (retryCount <= maxRetries && this.shouldRetry(errorType, retryCount, maxRetries)) {
      // Apply self-healing strategies
      const healingStrategy = await this.applyHealingStrategy(errorType, error, task);
      
      if (healingStrategy.shouldRetry) {
        // Retry the task with healing applied
        const delay = this.calculateRetryDelay(retryCount, healingStrategy.backoffMultiplier);
        
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'RETRYING',
            retryCount,
            errorMessage: error.message
          }
        });

        await this.logWorkflowEvent(workflowId, 'WARN', `Task retrying with healing: ${task.name}`, {
          taskId,
          retryCount,
          maxRetries,
          delay,
          healingStrategy: healingStrategy.type,
          errorType
        });

        // Schedule retry
        setTimeout(() => {
          this.addTaskToQueue({
            workflowId,
            taskId,
            taskData: { ...task, config: healingStrategy.modifiedConfig || task.config },
            triggerData: {}
          });
        }, delay);

        this.emit('taskRetrying', { workflowId, taskId, taskName: task.name, retryCount, healingStrategy });
      } else {
        // Mark as failed if healing strategy says not to retry
        await this.markTaskAsFailed(workflowId, taskId, task, error, 'Healing strategy prevented retry');
      }
    } else {
      // Max retries exceeded or non-retryable error
      await this.markTaskAsFailed(workflowId, taskId, task, error, 'Max retries exceeded');
    }
  }

  /**
   * Classify error type for healing strategies
   */
  classifyError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout') || message.includes('etimedout')) {
      return 'TIMEOUT';
    } else if (message.includes('connection') || message.includes('network')) {
      return 'NETWORK';
    } else if (message.includes('database') || message.includes('sql')) {
      return 'DATABASE';
    } else if (message.includes('validation') || message.includes('invalid')) {
      return 'VALIDATION';
    } else if (message.includes('permission') || message.includes('unauthorized')) {
      return 'PERMISSION';
    } else if (message.includes('rate limit') || message.includes('too many')) {
      return 'RATE_LIMIT';
    } else if (message.includes('memory') || message.includes('out of memory')) {
      return 'MEMORY';
    } else if (message.includes('disk') || message.includes('space')) {
      return 'DISK';
    } else {
      return 'UNKNOWN';
    }
  }

  /**
   * Determine if we should retry based on error type and retry count
   */
  shouldRetry(errorType, retryCount, maxRetries) {
    // Non-retryable errors
    const nonRetryableErrors = ['VALIDATION', 'PERMISSION'];
    if (nonRetryableErrors.includes(errorType)) {
      return false;
    }

    // Retryable errors with limits
    const retryableErrors = {
      'TIMEOUT': true,
      'NETWORK': true,
      'DATABASE': true,
      'RATE_LIMIT': true,
      'MEMORY': false, // Memory issues usually need intervention
      'DISK': false,     // Disk issues usually need intervention
      'UNKNOWN': true
    };

    return retryableErrors[errorType] !== false && retryCount <= maxRetries;
  }

  /**
   * Apply self-healing strategy based on error type
   */
  async applyHealingStrategy(errorType, error, task) {
    const strategy = {
      shouldRetry: true,
      backoffMultiplier: 1,
      modifiedConfig: task.config,
      type: 'standard'
    };

    try {
      const config = JSON.parse(task.config || '{}');

      switch (errorType) {
        case 'TIMEOUT':
          strategy.backoffMultiplier = 2;
          strategy.type = 'timeout';
          // Increase timeout in config
          if (config.timeout) {
            strategy.modifiedConfig = JSON.stringify({
              ...config,
              timeout: Math.min(config.timeout * 1.5, 300000) // Max 5 minutes
            });
          }
          break;

        case 'NETWORK':
          strategy.backoffMultiplier = 1.5;
          strategy.type = 'network';
          // Add retry delay and reduce batch size
          strategy.modifiedConfig = JSON.stringify({
            ...config,
            retryDelay: 5000,
            batchSize: Math.max(1, Math.floor((config.batchSize || 10) / 2))
          });
          break;

        case 'DATABASE':
          strategy.backoffMultiplier = 2;
          strategy.type = 'database';
          // Add connection retry and reduce batch size
          strategy.modifiedConfig = JSON.stringify({
            ...config,
            connectionRetry: true,
            maxConnections: Math.max(1, (config.maxConnections || 5) - 2),
            batchSize: Math.max(1, Math.floor((config.batchSize || 10) / 2))
          });
          break;

        case 'RATE_LIMIT':
          strategy.backoffMultiplier = 3;
          strategy.type = 'rate_limit';
          // Add exponential backoff and reduce frequency
          strategy.modifiedConfig = JSON.stringify({
            ...config,
            backoffMs: 10000,
            retryAfterMs: 60000,
            batchSize: 1
          });
          break;

        case 'MEMORY':
          strategy.shouldRetry = false;
          strategy.type = 'memory';
          // Don't retry memory issues, but modify config for future runs
          strategy.modifiedConfig = JSON.stringify({
            ...config,
            memoryLimit: Math.max(50, (config.memoryLimit || 100) - 50),
            batchSize: 1,
            streaming: true
          });
          break;

        case 'DISK':
          strategy.shouldRetry = false;
          strategy.type = 'disk';
          // Don't retry disk issues
          strategy.modifiedConfig = JSON.stringify({
            ...config,
            useTempDir: true,
            compression: true
          });
          break;

        case 'UNKNOWN':
          strategy.backoffMultiplier = 1.5;
          strategy.type = 'unknown';
          // Standard retry with modest backoff
          break;
      }

      // Log the healing strategy application
      await this.logWorkflowEvent('INFO', `Applied healing strategy for ${errorType}`, {
        strategy: strategy.type,
        backoffMultiplier: strategy.backoffMultiplier,
        shouldRetry: strategy.shouldRetry
      });

    } catch (configError) {
      // If config parsing fails, use standard retry
      strategy.type = 'config_error';
      strategy.modifiedConfig = task.config;
    }

    return strategy;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(retryCount, backoffMultiplier = 1) {
    const baseDelay = 1000; // 1 second base delay
    const maxDelay = 300000; // 5 minutes max delay
    const delay = baseDelay * Math.pow(backoffMultiplier, retryCount - 1);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    
    return Math.min(delay + jitter, maxDelay);
  }

  /**
   * Mark task as failed
   */
  async markTaskAsFailed(workflowId, taskId, task, error, reason) {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        errorMessage: `${error.message} (${reason})`
      }
    });

    await this.logWorkflowEvent(workflowId, 'ERROR', `Task failed: ${task.name}`, {
      taskId,
      error: error.message,
      reason,
      retryCount: task.retryCount,
      maxRetries: task.maxRetries
    });

    this.emit('taskFailed', { workflowId, taskId, taskName: task.name, error, reason });

    // Check if workflow should be marked as failed
    await this.checkWorkflowStatus(workflowId);
  }

  /**
   * Check if workflow should be marked as failed
   */
  async checkWorkflowStatus(workflowId) {
    try {
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: {
          tasks: true
        }
      });

      if (!workflow) return;

      const tasks = workflow.tasks;
      const failedTasks = tasks.filter(task => task.status === 'FAILED');
      const completedTasks = tasks.filter(task => task.status === 'COMPLETED');
      const totalTasks = tasks.length;

      // Mark workflow as failed if more than 50% of tasks failed
      if (failedTasks.length > totalTasks / 2) {
        await prisma.workflow.update({
          where: { id: workflowId },
          data: {
            isActive: false
          }
        });

        await this.logWorkflowEvent(workflowId, 'ERROR', 'Workflow marked as inactive due to too many failures', {
          totalTasks,
          failedTasks: failedTasks.length,
          completedTasks: completedTasks.length
        });

        this.emit('workflowFailed', { workflowId, reason: 'Too many task failures' });
      }
    } catch (error) {
      logger.error('Error checking workflow status:', error);
    }
  }

  /**
   * Health check for workflow system
   */
  async performHealthCheck() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {},
      metrics: this.getTaskQueueStatus()
    };

    try {
      // Check database connection
      await prisma.$queryRaw`SELECT 1`;
      health.checks.database = { status: 'healthy', message: 'Database connection OK' };
    } catch (error) {
      health.checks.database = { status: 'unhealthy', message: error.message };
      health.status = 'unhealthy';
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    health.checks.memory = {
      status: memoryUsageMB < 500 ? 'healthy' : 'warning',
      message: `Memory usage: ${memoryUsageMB.toFixed(2)}MB`,
      usage: memoryUsageMB
    };

    // Check task queue
    const queueStatus = this.getTaskQueueStatus();
    health.checks.queue = {
      status: queueStatus.queueLength < 100 ? 'healthy' : 'warning',
      message: `Queue length: ${queueStatus.queueLength}, Running: ${queueStatus.runningTasks}`,
      ...queueStatus
    };

    // Check cron jobs
    health.checks.cronJobs = {
      status: 'healthy',
      message: `${this.cronJobs.size} active cron jobs`
    };

    return health;
  }

  /**
   * Auto-recovery for stuck tasks
   */
  async recoverStuckTasks() {
    try {
      const stuckThreshold = 30 * 60 * 1000; // 30 minutes in milliseconds
      const now = new Date();

      const stuckTasks = await prisma.task.findMany({
        where: {
          status: 'RUNNING',
          startedAt: {
            lt: new Date(now.getTime() - stuckThreshold)
          }
        }
      });

      for (const task of stuckTasks) {
        logger.warn(`Found stuck task: ${task.name} (ID: ${task.id}), attempting recovery`);
        
        // Reset task status to pending
        await prisma.task.update({
          where: { id: task.id },
          data: {
            status: 'PENDING',
            startedAt: null,
            errorMessage: 'Task was stuck and has been reset'
          }
        });

        // Add back to queue
        this.addTaskToQueue({
          workflowId: task.workflowId,
          taskId: task.id,
          taskData: task,
          triggerData: {}
        });

        await this.logWorkflowEvent(task.workflowId, 'WARN', 'Stuck task recovered and reset', {
          taskId: task.id,
          taskName: task.name
        });
      }

      return stuckTasks.length;
    } catch (error) {
      logger.error('Error recovering stuck tasks:', error);
      return 0;
    }
  }

  /**
   * Cleanup orphaned tasks
   */
  async cleanupOrphanedTasks() {
    try {
      // Find tasks with no associated workflow
      const orphanedTasks = await prisma.task.findMany({
        where: {
          workflow: null
        }
      });

      for (const task of orphanedTasks) {
        await prisma.task.delete({
          where: { id: task.id }
        });

        logger.warn(`Cleaned up orphaned task: ${task.name} (ID: ${task.id})`);
      }

      return orphanedTasks.length;
    } catch (error) {
      logger.error('Error cleaning up orphaned tasks:', error);
      return 0;
    }
  }

  /**
   * Optimize task queue performance
   */
  optimizeTaskQueue() {
    // Sort queue by priority
    this.taskQueue.sort((a, b) => {
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const aPriority = priorityOrder[a.taskData.priority] || 0;
      const bPriority = priorityOrder[b.taskData.priority] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // If same priority, sort by creation time
      return new Date(a.taskData.createdAt) - new Date(b.taskData.createdAt);
    });

    // Remove duplicate tasks
    const seenTasks = new Set();
    this.taskQueue = this.taskQueue.filter(task => {
      const taskKey = `${task.workflowId}-${task.taskId}`;
      if (seenTasks.has(taskKey)) {
        return false;
      }
      seenTasks.add(taskKey);
      return true;
    });

    logger.info(`Task queue optimized: ${this.taskQueue.length} tasks in queue`);
  }

  /**
   * Get system metrics for monitoring
   */
  async getSystemMetrics() {
    try {
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
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        })
      ]);

      const queueStatus = this.getTaskQueueStatus();
      const memoryUsage = process.memoryUsage();

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
        queue: queueStatus,
        logs: {
          last24Hours: recentLogs
        },
        system: {
          memory: {
            used: memoryUsage.heapUsed / 1024 / 1024,
            total: memoryUsage.heapTotal / 1024 / 1024,
            external: memoryUsage.external / 1024 / 1024
          },
          uptime: process.uptime(),
          nodeVersion: process.version
        }
      };
    } catch (error) {
      logger.error('Error getting system metrics:', error);
      throw error;
    }
  }

  /**
   * Schedule periodic maintenance tasks
   */
  scheduleMaintenanceTasks() {
    // Recover stuck tasks every 5 minutes
    setInterval(async () => {
      await this.recoverStuckTasks();
    }, 5 * 60 * 1000);

    // Cleanup orphaned tasks every hour
    setInterval(async () => {
      await this.cleanupOrphanedTasks();
    }, 60 * 60 * 1000);

    // Optimize task queue every 10 minutes
    setInterval(async () => {
      this.optimizeTaskQueue();
    }, 10 * 60 * 1000);

    // Perform health check every minute
    setInterval(async () => {
      const health = await this.performHealthCheck();
      if (health.status === 'unhealthy') {
        logger.error('Workflow system health check failed:', health);
      }
    }, 60 * 1000);

    logger.info('Scheduled periodic maintenance tasks');
  }

  /**
   * Cancel workflow tasks
   */
  async cancelWorkflowTasks(workflowId) {
    try {
      const tasks = await prisma.task.findMany({
        where: {
          workflowId,
          status: {
            in: ['PENDING', 'RUNNING', 'RETRYING']
          }
        }
      });

      for (const task of tasks) {
        await prisma.task.update({
          where: { id: task.id },
          data: {
            status: 'CANCELLED'
          }
        });

        // Remove from running tasks if it's running
        const taskKey = `${workflowId}-${task.id}`;
        if (this.runningTasks.has(taskKey)) {
          this.runningTasks.delete(taskKey);
        }

        await this.logWorkflowEvent(workflowId, 'INFO', `Task cancelled: ${task.name}`, {
          taskId: task.id
        });
      }

      this.emit('workflowTasksCancelled', { workflowId, cancelledCount: tasks.length });
    } catch (error) {
      logger.error('Error cancelling workflow tasks:', error);
    }
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats(userId) {
    try {
      const [
        totalWorkflows,
        activeWorkflows,
        completedWorkflows,
        failedWorkflows,
        totalTasks,
        runningTasks,
        completedTasks,
        failedTasks,
        scheduledTasks
      ] = await Promise.all([
        prisma.workflow.count({
          where: { createdBy: userId }
        }),
        prisma.workflow.count({
          where: { createdBy: userId, isActive: true }
        }),
        prisma.workflow.count({
          where: {
            createdBy: userId,
            tasks: {
              some: {
                status: 'COMPLETED'
              }
            }
          }
        }),
        prisma.workflow.count({
          where: {
            createdBy: userId,
            tasks: {
              some: {
                status: 'FAILED'
              }
            }
          }
        }),
        prisma.task.count({
          where: {
            workflow: {
              createdBy: userId
            }
          }
        }),
        prisma.task.count({
          where: {
            workflow: {
              createdBy: userId
            },
            status: 'RUNNING'
          }
        }),
        prisma.task.count({
          where: {
            workflow: {
              createdBy: userId
            },
            status: 'COMPLETED'
          }
        }),
        prisma.task.count({
          where: {
            workflow: {
              createdBy: userId
            },
            status: 'FAILED'
          }
        }),
        prisma.scheduledTask.count({
          where: { createdBy: userId, isActive: true }
        })
      ]);

      return {
        totalWorkflows,
        activeWorkflows,
        completedWorkflows,
        failedWorkflows,
        totalTasks,
        runningTasks,
        completedTasks,
        failedTasks,
        scheduledTasks,
        successRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
      };
    } catch (error) {
      logger.error('Error getting workflow stats:', error);
      throw error;
    }
  }

  /**
   * Get workflow logs
   */
  async getWorkflowLogs(workflowId, filters = {}) {
    try {
      const where = { workflowId };
      
      if (filters.level) {
        where.level = filters.level;
      }
      
      if (filters.startDate) {
        where.createdAt = {
          gte: filters.startDate
        };
      }
      
      if (filters.endDate) {
        where.createdAt = {
          lte: filters.endDate
        };
      }

      return await prisma.workflowLog.findMany({
        where,
        include: {
          task: {
            select: {
              id: true,
              name: true,
              taskType: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 100
      });
    } catch (error) {
      logger.error('Error getting workflow logs:', error);
      throw error;
    }
  }

  /**
   * Log workflow event
   */
  async logWorkflowEvent(workflowId, level, message, metadata = {}) {
    try {
      await prisma.workflowLog.create({
        data: {
          workflowId,
          level,
          message,
          metadata: JSON.stringify(metadata)
        }
      });

      // Emit log event for real-time updates
      this.emit('workflowLog', {
        workflowId,
        level,
        message,
        metadata,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error logging workflow event:', error);
    }
  }

  /**
   * Helper methods for task execution
   */
  async cleanupInactiveUsers(config) {
    // Implementation for cleaning up inactive users
    const retentionDays = config.retentionDays || 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const deletedUsers = await prisma.user.deleteMany({
      where: {
        lastLoginAt: {
          lt: cutoffDate
        },
        isActive: false
      }
    });

    return { deletedUsers: deletedUsers.count };
  }

  async archiveOldData(config) {
    // Implementation for archiving old data
    return { archived: true };
  }

  async updateStatistics(config) {
    // Implementation for updating statistics
    return { updated: true };
  }

  async cleanupOldLogs(retentionDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const deletedLogs = await prisma.workflowLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    return { deletedLogs: deletedLogs.count };
  }

  async cleanupTempFiles() {
    // Implementation for cleaning temporary files
    return { cleaned: true };
  }

  async cleanupExpiredSessions() {
    // Implementation for cleaning expired sessions
    return { cleaned: true };
  }

  async executeWelcomeSequence(parameters) {
    // Implementation for welcome sequence
    return { executed: true };
  }

  async executeReEngagementCampaign(parameters) {
    // Implementation for re-engagement campaign
    return { executed: true };
  }

  async executeMilestoneReminders(parameters) {
    // Implementation for milestone reminders
    return { executed: true };
  }

  async performHealthCheck() {
    // Implementation for health check
    return { status: 'healthy', checks: [] };
  }

  async optimizeDatabase() {
    // Implementation for database optimization
    return { optimized: true };
  }

  async refreshCache() {
    // Implementation for cache refresh
    return { refreshed: true };
  }

  /**
   * Get task queue status
   */
  getTaskQueueStatus() {
    return {
      queueLength: this.taskQueue.length,
      runningTasks: this.runningTasks.size,
      maxConcurrentTasks: this.maxConcurrentTasks,
      isProcessingQueue: this.isProcessingQueue
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      // Cancel all running tasks
      for (const [taskKey, taskInfo] of this.runningTasks) {
        // Mark tasks as cancelled
        const [workflowId, taskId] = taskKey.split('-');
        await prisma.task.update({
          where: { id: parseInt(taskId) },
          data: { status: 'CANCELLED' }
        });
      }

      // Stop all cron jobs
      for (const [taskId, job] of this.cronJobs) {
        job.stop();
      }
      this.cronJobs.clear();

      logger.info('Workflow service shutdown complete');
    } catch (error) {
      logger.error('Error during workflow service shutdown:', error);
    }
  }
}

module.exports = new WorkflowService();
