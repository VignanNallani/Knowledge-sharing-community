const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const workflowService = require('../services/workflow.service');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Rate limiting for workflow endpoints
const workflowLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // limit each IP to 50 requests per minute
  message: {
    error: 'Too many workflow requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all workflow routes
router.use(workflowLimiter);

// Validation schemas
const createWorkflowSchema = [
  body('name').notEmpty().withMessage('Workflow name is required'),
  body('description').optional(),
  body('triggerType').isIn(['MANUAL', 'EVENT_BASED', 'SCHEDULED', 'CONDITIONAL', 'WEBHOOK']).withMessage('Invalid trigger type'),
  body('triggerData').optional().isJSON().withMessage('Trigger data must be valid JSON'),
  body('tasks').isArray({ min: 1 }).withMessage('At least one task is required'),
  body('tasks.*.0.name').notEmpty().withMessage('Task name is required'),
  body('tasks.*.0.taskType').isIn(['EMAIL_NOTIFICATION', 'PUSH_NOTIFICATION', 'DATA_PROCESSING', 'REPORT_GENERATION', 'CLEANUP_TASK', 'ANALYTICS_UPDATE', 'GAMIFICATION_UPDATE', 'USER_ENGAGEMENT', 'SYSTEM_MAINTENANCE', 'CUSTOM_ACTION']).withMessage('Invalid task type'),
  body('tasks.*.0.priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Invalid priority'),
  body('tasks.*.0.config').optional().isJSON().withMessage('Task config must be valid JSON'),
  body('tasks.*.0.scheduledAt').optional().isISO8601().withMessage('Scheduled date must be valid ISO8601 date'),
  body('tasks.*.0.dependencies').optional().isArray().withMessage('Dependencies must be an array'),
  body('tasks.*.0.maxRetries').optional().isInt({ min: 0, max: 10 }).withMessage('Max retries must be between 0 and 10')
];

const updateWorkflowSchema = [
  body('name').optional().notEmpty().withMessage('Workflow name is required'),
  body('description').optional(),
  body('triggerType').optional().isIn(['MANUAL', 'EVENT_BASED', 'SCHEDULED', 'CONDITIONAL', 'WEBHOOK']).withMessage('Invalid trigger type'),
  body('triggerData').optional().isJSON().withMessage('Trigger data must be valid JSON'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
];

const executeWorkflowSchema = [
  body('triggerData').optional().isJSON().withMessage('Trigger data must be valid JSON')
];

// Create workflow
router.post('/', authenticate, createWorkflowSchema, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const workflowData = {
      name: req.body.name,
      description: req.body.description,
      triggerType: req.body.triggerType,
      triggerData: req.body.triggerData,
      createdBy: req.user.id,
      tasks: req.body.tasks
    };

    const workflow = await workflowService.createWorkflow(workflowData);

    res.status(201).json({
      success: true,
      data: workflow,
      message: 'Workflow created successfully'
    });
  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all workflows for user
router.get('/', authenticate, async (req, res) => {
  try {
    const filters = {
      isActive: req.query.isActive === 'false' ? false : true,
      triggerType: req.query.triggerType,
      search: req.query.search,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const workflows = await workflowService.getWorkflows(req.user.id, filters);

    res.json({
      success: true,
      data: workflows,
      message: 'Workflows retrieved successfully'
    });
  } catch (error) {
    console.error('Get workflows error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get workflow by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const workflow = await workflowService.getWorkflow(parseInt(req.params.id));

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    // Check if user owns the workflow or is admin
    if (workflow.createdBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: workflow,
      message: 'Workflow retrieved successfully'
    });
  } catch (error) {
    console.error('Get workflow error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update workflow
router.put('/:id', authenticate, updateWorkflowSchema, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const workflowId = parseInt(req.params.id);
    const updateData = {};

    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.triggerType !== undefined) updateData.triggerType = req.body.triggerType;
    if (req.body.triggerData !== undefined) updateData.triggerData = req.body.triggerData;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

    const workflow = await workflowService.updateWorkflow(workflowId, updateData);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    // Check if user owns the workflow or is admin
    if (workflow.createdBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: workflow,
      message: 'Workflow updated successfully'
    });
  } catch (error) {
    console.error('Update workflow error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete workflow
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const workflowId = parseInt(req.params.id);
    const workflow = await workflowService.getWorkflow(workflowId);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    // Check if user owns the workflow or is admin
    if (workflow.createdBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    await workflowService.deleteWorkflow(workflowId);

    res.json({
      success: true,
      message: 'Workflow deleted successfully'
    });
  } catch (error) {
    console.error('Delete workflow error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Execute workflow
router.post('/:id/execute', authenticate, executeWorkflowSchema, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const workflowId = parseInt(req.params.id);
    const triggerData = req.body.triggerData || {};

    const workflow = await workflowService.executeWorkflow(workflowId, triggerData);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    // Check if user owns the workflow or is admin
    if (workflow.createdBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: workflow,
      message: 'Workflow execution started'
    });
  } catch (error) {
    console.error('Execute workflow error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cancel workflow execution
router.post('/:id/cancel', authenticate, async (req, res) => {
  try {
    const workflowId = parseInt(req.params.id);
    const workflow = await workflowService.getWorkflow(workflowId);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    // Check if user owns the workflow or is admin
    if (workflow.createdBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    await workflowService.cancelWorkflowTasks(workflowId);

    res.json({
      success: true,
      message: 'Workflow execution cancelled'
    });
  } catch (error) {
    console.error('Cancel workflow error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get workflow statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await workflowService.getWorkflowStats(req.user.id);

    res.json({
      success: true,
      data: stats,
      message: 'Workflow statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Get workflow stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get workflow logs
router.get('/:id/logs', authenticate, async (req, res) => {
  try {
    const workflowId = parseInt(req.params.id);
    const workflow = await workflowService.getWorkflow(workflowId);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    // Check if user owns the workflow or is admin
    if (workflow.createdBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const filters = {
      level: req.query.level,
      startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
      limit: parseInt(req.query.limit) || 100
    };

    const logs = await workflowService.getWorkflowLogs(workflowId, filters);

    res.json({
      success: true,
      data: logs,
      message: 'Workflow logs retrieved successfully'
    });
  } catch (error) {
    console.error('Get workflow logs error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get task queue status
router.get('/queue/status', authenticate, async (req, res) => {
  try {
    const status = workflowService.getTaskQueueStatus();

    res.json({
      success: true,
      data: status,
      message: 'Task queue status retrieved successfully'
    });
  } catch (error) {
    console.error('Get task queue status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Trigger workflow manually
router.post('/trigger', authenticate, async (req, res) => {
  try {
    const { workflowId, triggerData } = req.body;

    if (!workflowId) {
      return res.status(400).json({
        success: false,
        error: 'Workflow ID is required'
      });
    }

    const workflow = await workflowService.getWorkflow(parseInt(workflowId));

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    // Check if user owns the workflow or is admin
    if (workflow.createdBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const result = await workflowService.executeWorkflow(workflow.id, triggerData);

    res.json({
      success: true,
      data: result,
      message: 'Workflow triggered successfully'
    });
  } catch (error) {
    console.error('Trigger workflow error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get scheduled tasks
router.get('/scheduled', authenticate, async (req, res) => {
  try {
    const scheduledTasks = await prisma.scheduledTask.findMany({
      where: {
        createdBy: req.user.id,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : true
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: scheduledTasks,
      message: 'Scheduled tasks retrieved successfully'
    });
  } catch (error) {
    console.error('Get scheduled tasks error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create scheduled task
router.post('/scheduled', authenticate, async (req, res) => {
  try {
    const {
      name,
      description,
      taskType,
      config,
      cronExpression,
      timezone = 'UTC'
    } = req.body;

    if (!name || !taskType) {
      return res.status(400).json({
        success: false,
        error: 'Name and task type are required'
      });
    }

    const scheduledTask = await prisma.scheduledTask.create({
      data: {
        name,
        description,
        taskType,
        config: config || '{}',
        cronExpression,
        timezone,
        nextRunAt: cronExpression ? workflowService.getNextRunDate(cronExpression) : null,
        createdBy: req.user.id
      }
    });

    // Schedule the task if it has a cron expression
    if (cronExpression) {
      workflowService.scheduleCronTask(scheduledTask);
    }

    res.status(201).json({
      success: true,
      data: scheduledTask,
      message: 'Scheduled task created successfully'
    });
  } catch (error) {
    console.error('Create scheduled task error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update scheduled task
router.put('/scheduled/:id', authenticate, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const updateData = {};

    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.taskType !== undefined) updateData.taskType = req.body.taskType;
    if (req.body.config !== undefined) updateData.config = req.body.config;
    if (req.body.cronExpression !== undefined) updateData.cronExpression = req.body.cronExpression;
    if (req.body.timezone !== undefined) updateData.timezone = req.body.timezone;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

    const scheduledTask = await prisma.scheduledTask.update({
      where: { id: taskId },
      data: updateData
    });

    // Update cron job if expression changed
    if (req.body.cronExpression !== undefined) {
      workflowService.unscheduleCronTask(taskId);
      if (req.body.cronExpression && req.body.isActive) {
        workflowService.scheduleCronTask(scheduledTask);
      }
    }

    // Update next run date if cron expression changed
    if (req.body.cronExpression !== undefined) {
      updateData.nextRunAt = workflowService.getNextRunDate(req.body.cronExpression);
    }

    res.json({
      success: true,
      data: scheduledTask,
      message: 'Scheduled task updated successfully'
    });
  } catch (error) {
    console.error('Update scheduled task error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete scheduled task
router.delete('/scheduled/:id', authenticate, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const scheduledTask = await prisma.scheduledTask.findUnique({
      where: { id: taskId }
    });

    if (!scheduledTask) {
      return res.status(404).json({
        success: false,
      error: 'Scheduled task not found'
      });
    }

    // Check if user owns the task or is admin
    if (scheduledTask.createdBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Unschedule cron job if it exists
    workflowService.unscheduleCronTask(taskId);

    await prisma.scheduledTask.delete({
      where: { id: taskId }
    });

    res.json({
      success: true,
      message: 'Scheduled task deleted successfully'
    });
  } catch (error) {
    console.error('Delete scheduled task error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Execute scheduled task manually
router.post('/scheduled/:id/execute', authenticate, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const scheduledTask = await prisma.scheduledTask.findUnique({
      where: { id: taskId }
    });

    if (!scheduledTask) {
      return res.status(404).json({
        success: false,
        error: 'Scheduled task not found'
      });
    }

    // Check if user owns the task or is admin
    if (scheduledTask.createdBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Create a workflow for this scheduled task execution
    const workflow = await workflowService.createWorkflow({
      name: `Manual: ${scheduledTask.name}`,
      description: scheduledTask.description,
      triggerType: 'MANUAL',
      triggerData: JSON.stringify({
        scheduledTaskId: scheduledTask.id
      }),
      createdBy: req.user.id,
      tasks: [{
        name: scheduledTask.name,
        description: scheduledTask.description,
        taskType: scheduledTask.taskType,
        config: scheduledTask.config,
        priority: 'MEDIUM'
      }]
    });

    const result = await workflowService.executeWorkflow(workflow.id);

    // Update scheduled task run information
    await prisma.scheduledTask.update({
      where: { id: taskId },
      data: {
        lastRunAt: new Date(),
        nextRunAt: scheduledTask.cronExpression ? workflowService.getNextRunDate(scheduledTask.cronExpression) : null,
        runCount: { increment: 1 }
      }
    });

    res.json({
      success: true,
      data: result,
      message: 'Scheduled task executed successfully'
    });
  } catch (error) {
    console.error('Execute scheduled task error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get task types
router.get('/task-types', authenticate, async (req, res) => {
  try {
    const taskTypes = Object.values([
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
    ]);

    res.json({
      success: true,
      data: taskTypes,
      message: 'Task types retrieved successfully'
    });
  } catch (error) {
    console.error('Get task types error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get trigger types
router.get('/trigger-types', authenticate, async (req, res) => {
  try {
    const triggerTypes = Object.values([
      'MANUAL',
      'EVENT_BASED',
      'taskType',
      'SCHEDULED',
      'CONDITIONAL',
      'WEBHOOK'
    ]);

    res.json({
      success: true,
      data: triggerTypes,
      message: 'Trigger types retrieved successfully'
    });
  } catch (error) {
    console.error('Get trigger types error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get priority levels
router.get('/priority-levels', authenticate, async (req, res) => {
  try {
    const priorityLevels = Object.values([
      'LOW',
      'MEDIUM',
      'HIGH',
      'priority'
    ]);

    res.json({
      success: true,
      data: priorityLevels,
      message: 'Priority levels retrieved successfully'
    });
  } catch (error) {
    console.error('Get priority levels error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get log levels
router.get('/log-levels', authenticate, async (req, res) => {
  try {
    const logLevels = Object.values([
      'DEBUG',
      'INFO',
      'WARN',
      'ERROR',
      'FATAL'
    ]);

    res.json({
      success: true,
      data: logLevels,
      message: 'Log levels retrieved successfully'
    });
  } catch (error) {
    console.error('Get log levels error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check for workflow service
router.get('/health', authenticate, async (req, res) => {
  try {
    const queueStatus = workflowService.getTaskQueueStatus();
    const stats = await workflowService.getWorkflowStats(req.user.id);

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      queue: queueStatus,
      stats,
      cronJobs: workflowService.cronJobs.size
    };

    res.json({
      success: true,
      data: health,
      message: 'Workflow service health check completed'
    });
  } catch (error) {
    console.error('Workflow health check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
