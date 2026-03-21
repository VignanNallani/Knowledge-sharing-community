const { PrismaClient } = require('@prisma/client');
const workflowService = require('../../src/services/workflow.service');
const logger = require('../../src/utils/logger.util');

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../src/utils/logger.util');
jest.mock('node-cron');

describe('WorkflowService', () => {
  let mockPrisma;
  let mockCache;
  let mockCron;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock Prisma client
    mockPrisma = {
      workflow: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn()
      },
      task: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn()
      },
      workflowLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn()
      },
      scheduledTask: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn()
      },
      $queryRaw: jest.fn()
    };

    // Mock Prisma constructor
    PrismaClient.mockImplementation(() => mockPrisma);

    // Mock NodeCache
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      flushAll: jest.fn(),
      getStats: jest.fn()
    };

    // Mock node-cron
    mockCron = {
      schedule: jest.fn(() => ({
        stop: jest.fn(),
        nextDate: jest.fn(() => new Date(Date.now() + 60000))
      }))
    };

    // Mock logger
    logger.info = jest.fn();
    logger.error = jest.fn();
    logger.warn = jest.fn();

    // Mock NodeCache
    jest.doMock('node-cache', () => {
      return jest.fn().mockImplementation(() => mockCache);
    });

    // Mock node-cron
    jest.doMock('node-cron', () => {
      return jest.fn().mockImplementation(() => mockCron);
    });

    // Reset workflow service instance
    jest.resetModules();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      const service = require('../../src/services/workflow.service');
      
      expect(service.cronJobs).toBeInstanceOf(Map);
      expect(service.runningTasks).toBeInstanceOf(Map);
      expect(service.taskQueue).toEqual([]);
      expect(service.maxConcurrentTasks).toBe(10);
      expect(service.isProcessingQueue).toBe(false);
    });

    it('should initialize scheduled tasks on startup', async () => {
      const service = require('../../src/services/workflow.service');
      
      mockPrisma.scheduledTask.findMany.mockResolvedValue([
        { id: 1, name: 'Test Task', isActive: true }
      ]);

      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async initialization

      expect(mockPrisma.scheduledTask.findMany).toHaveBeenCalledWith({
        where: { isActive: true }
      });
      expect(mockCron.schedule).toHaveBeenCalled();
    });

    it('should start task processor', async () => {
      const service = require('../../src/services/workflow.service');
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(service.isProcessingQueue).toBe(false);
      
      // Simulate task in queue
      service.taskQueue = [{ workflowId: 1, taskId: 1 }];
      
      service.processTaskQueue();
      
      expect(service.isProcessingQueue).toBe(true);
    });

    it('should schedule maintenance tasks', async () => {
      const service = require('../../src/services/workflow.service');
      
      // Mock setInterval
      const mockSetInterval = jest.fn();
      global.setInterval = mockSetInterval;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 300000); // 5 minutes
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 3600000); // 1 hour
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 600000); // 10 minutes
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 60000); // 1 minute
    });
  });

  describe('createWorkflow', () => {
    it('should create a new workflow with tasks', async () => {
      const workflowData = {
        name: 'Test Workflow',
        description: 'Test Description',
        triggerType: 'MANUAL',
        triggerData: '{}',
        createdBy: 1,
        tasks: [
          {
            name: 'Test Task',
            description: 'Test Task Description',
            taskType: 'EMAIL_NOTIFICATION',
            config: '{"recipients": ["test@example.com"]}',
            priority: 'MEDIUM'
          }
        ]
      };

      const expectedWorkflow = {
        id: 1,
        name: 'Test Workflow',
        description: 'Test Description',
        triggerType: 'MANUAL',
        triggerData: '{}',
        isActive: true,
        createdBy: 1,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        tasks: expect.any(Array),
        logs: expect.any(Array)
      };

      mockPrisma.workflow.create.mockResolvedValue(expectedWorkflow);
      mockPrisma.workflowLog.create.mockResolvedValue({});

      const service = require('../../src/services/workflow.service');
      const result = await service.createWorkflow(workflowData);

      expect(mockPrisma.workflow.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Workflow',
          triggerType: 'MANUAL',
          createdBy: 1
        })
      });

      expect(result).toEqual(expectedWorkflow);
      expect(logger.info).toHaveBeenCalledWith('Workflow created:', expect.any(Object));
    });

    it('should handle errors during workflow creation', async () => {
      const workflowData = {
        name: 'Test Workflow',
        createdBy: 1,
        tasks: []
      };

      mockPrisma.workflow.create.mockRejectedValue(new Error('Database error'));

      const service = require('../../src/services/workflow.service');
      
      await expect(service.createWorkflow(workflowData)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('Error creating workflow:', expect.any(Error));
    });

    it('should validate required fields', async () => {
      const service = require('../../src/services/workflow.service');
      
      await expect(service.createWorkflow({})).rejects.toThrow();
      await expect(service.createWorkflow({ name: 'Test', createdBy: 1, tasks: [] })).rejects.toThrow();
    });
  });

  describe('getWorkflow', () => {
    it('should get workflow by ID', async () => {
      const workflowId = 1;
      const expectedWorkflow = {
        id: workflowId,
        name: 'Test Workflow',
        tasks: [],
        logs: []
      };

      mockPrisma.workflow.findUnique.mockResolvedValue(expectedWorkflow);

      const service = require('../../src/services/workflow.service');
      const result = await service.getWorkflow(workflowId);

      expect(mockPrisma.workflow.findUnique).toHaveBeenCalledWith({
        where: { id: workflowId },
        include: expect.any(Object)
      });

      expect(result).toEqual(expectedWorkflow);
    });

    it('should return null for non-existent workflow', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(null);

      const service = require('../../src/services/workflow.service');
      const result = await service.getWorkflow(999);

      expect(result).toBeNull();
    });

    it('should handle errors during workflow retrieval', async () => {
      mockPrisma.workflow.findUnique.mockRejectedValue(new Error('Database error'));

      const service = require('../../src/services/workflow.service');
      
      await expect(service.getWorkflow(1)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('Error getting workflow:', expect.any(Error));
    });
  });

  describe('getWorkflows', () => {
    it('should get workflows for user with filters', async () => {
      const userId = 1;
      const filters = {
        isActive: true,
        triggerType: 'MANUAL',
        search: 'test',
        limit: 10,
        offset: 0
      };

      const expectedWorkflows = [
        { id: 1, name: 'Test Workflow 1', createdBy: userId },
        { id: 2, name: 'Test Workflow 2', createdBy: userId }
      ];

      mockPrisma.workflow.findMany.mockResolvedValue(expectedWorkflows);

      const service = require('../../src/services/workflow.service');
      const result = await service.getWorkflows(userId, filters);

      expect(mockPrisma.workflow.findMany).toHaveBeenCalledWith({
        where: {
          createdBy: userId,
          isActive: true,
          triggerType: 'MANUAL',
          OR: [
            { name: { contains: 'test', mode: 'insensitive' }
          ]
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 10,
        offset: 0
      });

      expect(result).toEqual(expectedWorkflows);
    });

    it('should handle errors during workflows retrieval', async () => {
      mockPrisma.workflow.findMany.mockRejectedValue(new Error('Database error'));

      const service = require('../../src/services/workflow.service');
      
      await expect(service.getWorkflows(1)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('Error getting workflows:', expect.any(Error));
    });
  });

  describe('updateWorkflow', () => {
    it('should update workflow successfully', async () => {
      const workflowId = 1;
      const updateData = {
        name: 'Updated Workflow',
        description: 'Updated Description',
        isActive: false
      };

      const expectedWorkflow = {
        id: workflowId,
        name: 'Updated Workflow',
        description: 'Updated Description',
        isActive: false,
        updatedAt: expect.any(Date)
      };

      mockPrisma.workflow.update.mockResolvedValue(expectedWorkflow);

      const service = require('../../src/services/workflow.service');
      const result = await service.updateWorkflow(workflowId, updateData);

      expect(mockPrisma.workflow.update).toHaveBeenCalledWith({
        where: { id: workflowId },
        data: updateData
      });

      expect(result).toEqual(expectedWorkflow);
      expect(logger.info).toHaveBeenCalledWith('Workflow updated:', expect.any(Object));
    });

    it('should handle errors during workflow update', async () => {
      mockPrisma.workflow.update.mockRejectedValue(new Error('Database error'));

      const service = require('../../src/services/workflow.service');
      
      await expect(service.updateWorkflow(1, {})).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('Error updating workflow:', expect.any(Error));
    });

    it('should return null for non-existent workflow', async () => {
      mockPrisma.workflow.update.mockResolvedValue(null);

      const service = require('../../src/services/workflow.service');
      const result = await service.updateWorkflow(999, {});

      expect(result).toBeNull();
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete workflow successfully', async () => {
      const workflowId = 1;
      const expectedWorkflow = { id: workflowId, name: 'Test Workflow' };

      mockPrisma.workflow.findUnique.mockResolvedValue(expectedWorkflow);
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.workflow.delete.mockResolvedValue(expectedWorkflow);

      const service = require('../../src/services/workflow.service');
      const result = await service.deleteWorkflow(workflowId);

      expect(mockPrisma.workflow.findUnique).toHaveBeenCalledWith({
        where: { id: workflowId }
      });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: { workflowId }
      });

      expect(mockPrisma.workflow.delete).toHaveBeenCalledWith({
        where: { id: workflowId }
      });

      expect(result).toEqual(expectedWorkflow);
      expect(logger.info).toHaveBeenCalledWith('Workflow deleted:', expect.any(Object));
    });

    it('should handle errors during workflow deletion', async () => {
      mockPrisma.workflow.findUnique.mockRejectedValue(new Error('Database error'));

      const service = require('../../src/services/workflow.service');
      
      await expect(service.deleteWorkflow(1)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('Error deleting workflow:', expect.any(Error));
    });

    it('should return null for non-existent workflow', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(null);

      const service = require('../../src/services/workflow.service');
      const result = await service.deleteWorkflow(999);

      expect(result).toBeNull();
    });
  });

  describe('executeWorkflow', () => {
    it('should execute workflow successfully', async () => {
      const workflowId = 1;
      const expectedWorkflow = {
        id: workflowId,
        name: 'Test Workflow',
        tasks: []
      };

      mockPrisma.workflow.findUnique.mockResolvedValue(expectedWorkflow);
      mockPrisma.task.findMany.mockResolvedValue([
        { id: 1, workflowId: 1, name: 'Task 1', status: 'PENDING' },
        { id: 2, workflowId: 1, name: 'Task 2', status: 'PENDING' }
      ]);

      const service = require('../../src/services/workflow.service');
      const result = await service.executeWorkflow(workflowId);

      expect(mockPrisma.workflow.findUnique).toHaveBeenCalledWith({
        where: { id: workflowId },
        include: expect.any(Object)
      });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: { workflowId }
      });

      expect(result).toEqual(expectedWorkflow);
      expect(logger.info).toHaveBeenCalledWith('Workflow execution started:', expect.any(Object));
    });

    it('should handle non-existent workflow', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(null);

      const service = require('../../src/services/workflow.service');
      
      await expect(service.executeWorkflow(999)).rejects.toThrow('Workflow 999 not found');
      expect(logger.error).toHaveBeenCalledWith('Error executing workflow:', expect.any(Error));
    });

    it('should handle errors during workflow execution', async () => {
      mockPrisma.workflow.findUnique.mockRejectedValue(new Error('Database error'));

      const service = require('../../src/services/workflow.service');
      
      await expect(service.executeWorkflow(1)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('Error executing workflow:', expect.any(Error));
    });

    it('should add tasks to queue in priority order', async () => {
      const workflowId = 1;
      const tasks = [
        { id: 1, priority: 'LOW', createdAt: new Date('2023-01-01') },
        { id: 2, priority: 'HIGH', createdAt: new Date('2023-01-02') },
        { id: 3, priority: 'CRITICAL', createdAt: new Date('2023-01-03') }
      ];

      mockPrisma.workflow.findUnique.mockResolvedValue({
        id: workflowId,
        tasks: tasks
      });

      const service = require('../../services/workflow.service');
      await service.executeWorkflow(workflowId);

      // Check that tasks are added to queue in priority order
      expect(service.taskQueue).toHaveLength(3);
      expect(service.taskQueue[0].taskId).toBe(3); // CRITICAL
      expect(service.taskQueue[1].taskId).toBe(2); // HIGH
      expect(service.taskQueue[2].taskId).toBe(1); // LOW
    });
  });

  describe('executeTask', () => {
    it('should execute task successfully', async () => {
      const workflowId = 1;
      const taskId = 1;
      const taskData = {
        name: 'Test Task',
        taskType: 'EMAIL_NOTIFICATION',
        config: '{"recipients": ["test@example.com"]}',
        priority: 'MEDIUM'
      };

      const expectedTask = {
        id: taskId,
        status: 'COMPLETED',
        completedAt: expect.any(Date),
        result: '{"success": true}'
      };

      mockPrisma.task.update.mockResolvedValue(expectedTask);
      mockPrisma.task.findUnique.mockResolvedValue({
        id: taskId,
        status: 'PENDING'
      });

      const service = require('../../src/services/workflow.service');
      const result = await service.executeTask({
        workflowId,
        taskId,
        taskData,
        triggerData: {}
      });

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: {
          status: 'RUNNING',
          startedAt: expect.any(Date)
        }
      });

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          completedAt: expect.any(Date),
          result: '{"success": true}'
        }
      });

      expect(result).toEqual({
        type: 'EMAIL_NOTIFICATION',
        success: true,
        result: '{"success": true}'
      });
    });

    it('should wait for dependencies before executing', async () => {
      const workflowId = 1;
      const taskId = 1;
      const taskData = {
        name: 'Test Task',
        dependencies: [2, 3],
        priority: 'MEDIUM'
      };

      mockPrisma.task.findUnique.mockResolvedValue({
        id: taskId,
        status: 'PENDING',
        dependencies: [2, 3]
      });

      mockPrisma.task.findUnique.mockResolvedValueOnce(
        { id: 2, status: 'COMPLETED' }
      ).mockResolvedValueOnce(
        { id: 3, status: 'COMPLETED' }
      );

      const service = require('../../src/services/workflow.service');
      const result = await service.executeTask({
        workflowId,
        taskId,
        taskData,
        triggerData: {}
      });

      expect(result).toEqual({
        type: 'EMAIL_NOTIFICATION',
        success: true,
        result: '{"success": true}'
      });
    });

    it('should handle dependency not completed', async () => {
      const workflowId = 1;
      const taskId = 1;
      const taskData = {
        name: 'Test Task',
        dependencies: [2, 3],
        priority: 'MEDIUM'
      };

      mockPrisma.task.findUnique.mockResolvedValue({
        id: taskId,
        status: 'PENDING',
        dependencies: [2, 3]
      });

      mockPrisma.task.findUnique.mockResolvedValueOnce(
        { id: 2, status: 'PENDING' }
      ).mockResolvedValueOnce(
        { id: 3, status: 'PENDING' }
      );

      const service = require('../../src/services/workflow.service');
      
      await expect(service.executeTask({
        workflowId,
        taskId,
        taskData,
        triggerData: {}
      })).rejects.toThrow('Dependency 2 not completed');
    });

    it('should handle task execution errors', async () => {
      const workflowId = 1;
      const taskId = 1;
      const taskData = {
        name: 'Test Task',
        taskType: 'EMAIL_NOTIFICATION',
        config: 'invalid-json'
      };

      mockPrisma.task.update.mockRejectedValue(new Error('Task execution error'));

      const service = require('../../src/services/workflow.service');
      
      await service.executeTask({
        workflowId,
        taskId,
        taskData,
        triggerData: {}
      }).rejects.toThrow('Task execution error');
    });
  });

  describe('cancelWorkflowTasks', () => {
    it('should cancel all running tasks', async () => {
      const workflowId = 1;
      const tasks = [
        { id: 1, status: 'RUNNING' },
        { id: 2, status: 'PENDING' },
        { id: 3, status: 'RETRYING' }
      ];

      mockPrisma.task.findMany.mockResolvedValue(tasks);
      mockPrisma.task.update.mockResolvedValue({}); // Mock updates

      const service = require('../../src/services/workflow.service');
      await service.cancelWorkflowTasks(workflowId);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: {
          workflowId,
          status: {
            in: ['PENDING', 'RUNNING', 'RETRYING']
          }
        }
      });

      expect(mockPrisma.task.update).toHaveBeenCalledTimes(3);
      expect(logger.info).toHaveBeenCalledWith('Workflow tasks cancelled:', expect.any(Object));
    });

    it('should handle errors during task cancellation', async () => {
      mockPrisma.task.findMany.mockRejectedValue(new Error('Database error'));

      const service = require('../../src/services/workflow.service');
      
      await expect(service.cancelWorkflowTasks(1)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('Error cancelling workflow tasks:', expect.any(Error));
    });
  });

  describe('getWorkflowStats', () => {
    it('should get workflow statistics', async () => {
      const userId = 1;
      const expectedStats = {
        totalWorkflows: 10,
        activeWorkflows: 5,
        completedWorkflows: 3,
        failedWorkflows: 2,
        totalTasks: 50,
        runningTasks: 2,
        completedTasks: 40,
        failedTasks: 8,
        scheduledTasks: 3,
        successRate: 80
      };

      mockPrisma.workflow.count.mockResolvedValue(10);
      mockPrisma.workflow.count.mockResolvedValue(5);
      mockPrisma.workflow.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2));
      mockPrisma.task.count.mockResolvedValue(50);
      mockPrisma.task.count.mockResolvedValueOnce(2).mockResolvedValueOnce(40));
      mockPrisma.task.count.mockResolvedValueOnce(8));
      mockPrisma.scheduledTask.count.mockResolvedValue(3);

      const service = require('../../src/services/workflow.service');
      const result = await service.getWorkflowStats(userId);

      expect(result).toEqual(expectedStats);
    });

    it('should handle errors during stats retrieval', async () => {
      mockPrisma.workflow.count.mockRejectedValue(new Error('Database error'));

      const service = require('../../src/services/workflow.service');
      
      await expect(service.getWorkflowStats(1)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('Error getting workflow stats:', expect.any(Error));
    });
  });

  describe('getWorkflowLogs', () => {
    it('should get workflow logs with filters', async () => {
      const workflowId = 1;
      const filters = {
        level: 'ERROR',
        limit: 50,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31')
      };

      const expectedLogs = [
        { id: 1, level: 'ERROR', message: 'Error message', createdAt: new Date('2023-01-01') },
        { id: 2, level: 'INFO', message: 'Info message', createdAt: new Date('2023-01-01') }
      ];

      mockPrisma.workflowLog.findMany.mockResolvedValue(expectedLogs);

      const service = require('../../src/services/workflow.service');
      const result = await service.getWorkflowLogs(workflowId, filters);

      expect(mockPrisma.workflowLog.findMany).toHaveBeenCalledWith({
        where: {
          workflowId,
          level: 'ERROR',
          createdAt: {
            gte: new Date('2023-01-01'),
            lte: new Date('2023-01-31')
        },
        limit: 50
      });

      expect(result).toEqual(expectedLogs);
    });

    it('should handle errors during log retrieval', async () => {
      mockPrisma.workflowLog.findMany.mockRejectedValue(new Error('Database error'));

      const service = require('../../src/services/workflow.service');
      
      await expect(service.getWorkflowLogs(1)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('Error getting workflow logs:', expect.any(Error));
    });
  });

  describe('scheduleCronTask', () => {
    it('should schedule cron task successfully', () => {
      const task = {
        id: 1,
        name: 'Test Scheduled Task',
        cronExpression: '0 9 * * * *',
        timezone: 'UTC',
        isActive: true
      };

      const job = { stop: jest.fn() };

      mockCron.schedule.mockReturnValue(job);

      const service = require('../../src/services/workflow.service');
      service.scheduleCronTask(task);

      expect(mockCron.schedule).toHaveBeenCalledWith('0 9 * * * *', expect.any(Object));
      expect(service.cronJobs.get(1)).toBe(job);
      expect(logger.info).toHaveBeenCalledWith('Scheduled cron task: Test Scheduled Task with expression: 0 9 * * * *');
    });

    it('should handle invalid cron expression', () => {
      const task = {
        id: 1,
        name: 'Test Task',
        cronExpression: 'invalid-cron',
        timezone: 'UTC',
        isActive: true
      };

      const service = require('../../src/services/workflow.service');
      
      expect(() => service.scheduleCronTask(task)).toThrow('Invalid cron expression');
      expect(logger.error).toHaveBeenCalledWith('Error scheduling cron task:', expect.any(Error));
    });

    it('should unschedule cron task', () => {
      const taskId = 1;
      const job = { stop: jest.fn() };

      service.cronJobs.set(taskId, job);

      const service = require('../../src/services/workflow.service');
      service.unscheduleCronTask(taskId);

      expect(job.stop).toHaveBeenCalled();
      expect(service.cronJobs.has(taskId)).toBe(false);
      expect(logger.info).toHaveBeenCalledWith('Unscheduled cron task: 1');
    });
  });

  describe('executeScheduledTask', () => {
    it('should execute scheduled task successfully', async () => {
      const taskId = 1;
      const task = {
        id: taskId,
        name: 'Test Scheduled Task',
        taskType: 'EMAIL_NOTIFICATION',
        config: '{}',
        createdBy: 1
      };

      const expectedWorkflow = {
        id: 1,
        name: 'Scheduled: Test Scheduled Task',
        triggerType: 'SCHEDULED',
        tasks: [{
          name: 'Test Scheduled Task',
          taskType: 'EMAIL_NOTIFICATION',
          config: '{}',
          priority: 'MEDIUM'
        }]
      };

      mockPrisma.scheduledTask.findUnique.mockResolvedValue(task);
      mockPrisma.workflow.create.mockResolvedValue(expectedWorkflow);
      mockPrisma.workflow.findUnique.mockResolvedValue(expectedWorkflow);
      mockPrisma.task.update.mockResolvedValue({});

      const service = require('../../src/services/workflow.service');
      const result = await service.executeScheduledTask(taskId);

      expect(mockPrisma.scheduledTask.findUnique).toHaveBeenCalledWith({
        where: { id: taskId }
      });

      expect(mockPrisma.workflow.create).toHaveBeenCalled();
      expect(mockPrisma.workflow.findUnique).toHaveBeenCalled();
      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          lastRunAt: expect.any(Date),
          nextRunAt: expect.any(Date),
          runCount: { increment: 1 }
        }
      });

      expect(result).toEqual(expectedWorkflow);
      expect(logger.info).toHaveBeenCalledWith('Executed scheduled task: Test Scheduled Task');
    });

    it('should handle non-existent scheduled task', async () => {
      mockPrisma.scheduledTask.findUnique.mockResolvedValue(null);

      const service = require('../../src/services/workflow.service');
      
      await expect(service.executeScheduledTask(999)).rejects.toThrow('Scheduled task 999 not found');
    });

    it('should handle errors during scheduled task execution', async () => {
      mockPrisma.scheduledTask.findUnique.mockRejectedValue(new Error('Database error'));

      const service = require('../../src/services/workflow.service');
      
      await expect(service.executeScheduledTask(1)).rejects.toThrow('Database error');
    });
  });

  describe('getNextRunDate', () => {
    it('should calculate next run date for cron expression', () => {
      const service = require('../../src/services/workflow.service');
      
      const nextRunDate = service.getNextRunDate('0 9 * * *');
      
      expect(nextRunDate).toBeInstanceOf(Date);
    });

    it('should return null for invalid cron expression', () => {
      const service = require('../../src/services/workflow.service');
      
      const nextRunDate = service.getNextRunDate('invalid-cron');
      
      expect(nextRunDate).toBeNull();
    });

    it('should handle cron parsing errors gracefully', () => {
      const service = require('../../src/services/workflow.service');
      
      const job = { stop: jest.fn() };
      mockCron.schedule.mockReturnValue(job);
      
      const nextRunDate = service.getNextRunTask('0 9 * * *');
      
      job.stop();
      
      expect(nextRunDate).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Error calculating next run date:', expect.any(Error));
    });
  });

  describe('logWorkflowEvent', () => {
    it('should log workflow event successfully', async () => {
      const workflowId = 1;
      const level = 'INFO';
      const message = 'Test message';
      const metadata = { test: 'data' };

      mockPrisma.workflowLog.create.mockResolvedValue({});

      const service = require('../../src/services/workflow.service');
      await service.logWorkflowEvent(workflowId, level, message, metadata);

      expect(mockPrisma.workflowLog.create).toHaveBeenCalledWith({
        data: {
          workflowId,
          level,
          message,
          metadata: JSON.stringify(metadata)
        }
      });
    });

    it('should handle errors during logging', async () => {
      mockPrisma.workflowLog.create.mockRejectedValue(new Error('Database error'));

      const service = require('../../src/services/workflow.service');
      
      await service.logWorkflowEvent(1, 'ERROR', 'Test error', {});
      
      expect(logger.error).toHaveBeenCalledWith('Error logging workflow event:', expect.any(Error));
    });
  });

  describe('getTaskQueueStatus', () => {
    it('should return task queue status', () => {
      const service = require('../../src/services/workflow.service');
      
      const status = service.getTaskQueueStatus();

      expect(status).toEqual({
        queueLength: 0,
        runningTasks: 0,
        maxConcurrentTasks: 10,
        isProcessingQueue: false
      });
    });

    it('should return accurate queue metrics', () => {
      const service = require('../../src/services/workflow.service');
      
      // Add some tasks to queue
      service.taskQueue = [
        { workflowId: 1, taskId: 1 },
        { workflowId: 2, taskId: 2 }
      ];
      service.runningTasks.set('1-1', { startTime: Date.now() });
      service.runningTasks.set('2-2', { startTime: Date.now() });

      const status = service.getTaskQueueStatus();

      expect(status.queueLength).toBe(2);
      expect(status.runningTasks).toBe(2);
      expect(status.maxConcurrentTasks).toBe(10);
      expect(status.isProcessingQueue).toBe(false);
    });
  });

  describe('performHealthCheck', () => {
    it('should perform comprehensive health check', async () => {
      const service = require('../../src/services/workflow.service');
      
      // Mock database connection
      mockPrisma.$queryRaw.mockResolvedValue([{ '1' }]);
      
      // Mock memory usage
      const memoryUsage = {
        heapUsed: 100 * 1024 * 1024,
        heapTotal: 500 * 1024 * 1024,
        external: 50 * 1024 * 1024
      };
      process.memoryUsage = memoryUsage;

      const health = await service.performHealthCheck();

      expect(health.status).toBe('healthy');
      expect(health.checks.database.status).toBe('healthy');
      expect(health.checks.memory.status).toBe('healthy');
      expect(health.checks.queue.status).toBe('healthy');
      expect(health.checks.cronJobs.status).toBe('healthy');
      expect(health.metrics).toBeDefined();
    });

    it('should detect unhealthy database connection', async () => {
      const service = require('../../src/services/workflow.service');
      
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection failed'));

      const health = await service.performHealthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.checks.database.status).toBe('unhealthy');
      expect(health.checks.database.message).toBe('Connection failed');
    });

    it('should detect high memory usage', async () => {
      const service = require('../../src/services/workflow.service');
      
      // Mock high memory usage
      const memoryUsage = {
        heapUsed: 600 * 1024 * 1024, // 600MB
        heapTotal: 500 * 1024 * 1024,
        external: 100 * 1024 * 1024
      };
      process.memoryUsage = memoryUsage;

      const health = await service.performHealthCheck();

      expect(health.checks.memory.status).toBe('warning');
      expect(health.checks.memory.usage).toBe(600);
      expect(health.checks.memory.message).toContain('600.00MB');
    });

    it('should detect queue overload', async () => {
      const service = require('../../src/services/workflow.service');
      
      // Mock queue overload
      service.taskQueue = Array(150).fill({}); // 150 tasks in queue
      service.runningTasks.set('test', { startTime: Date.now() });

      const health = await service.performHealthCheck();

      expect(health.checks.queue.status).toBe('warning');
      expect(health.checks.queue.message).toContain('Queue length: 150');
      expect(health.checks.queue.runningTasks).toBe(1);
    });
  });

  describe('recoverStuckTasks', () => {
    it('should recover stuck tasks', async () => {
      const stuckTask = {
        id: 1,
        name: 'Stuck Task',
        status: 'RUNNING',
        startedAt: new Date(Date.now() - 31 * 60 * 1000) // 31 minutes ago
      };

      mockPrisma.task.findMany.mockResolvedValue([stuckTask]);
      mockPrisma.task.update.mockResolvedValue({ status: 'PENDING' });
      mockPrisma.task.update.mockResolvedValue({ errorMessage: 'Task was stuck and has been reset' });

      const service = require('../../services/workflow.service');
      const recoveredCount = await service.recoverStuckTasks();

      expect(recoveredCount).toBe(1);
      expect(mockPrisma.task.findMany).toHaveBeenCalled();
      expect(mockPrisma.task.update).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith('Found stuck task: Stuck Task (ID: 1), attempting recovery');
    });

    it('should handle errors during stuck task recovery', async () => {
      mockPrisma.task.findMany.mockRejectedValue(new Error('Database error'));

      const service = require('../../src/services/workflow.service');
      
      const recoveredCount = await service.recoverStuckTasks();

      expect(recoveredCount).toBe(0);
      expect(logger.error).toHaveBeenCalledWith('Error recovering stuck tasks:', expect.any(Error));
    });
  });

  describe('cleanupOrphanedTasks', () => {
    it('should cleanup orphaned tasks', async () => {
      const orphanedTask = {
        id: 1,
        name: 'Orphaned Task'
      };

      mockPrisma.task.findMany.mockResolvedValue([orphanedTask]);
      mockPrisma.task.delete.mockResolvedValue(orphanedTask);

      const service = require('../../src/services/workflow.service');
      const cleanedCount = await service.cleanupOrphanedTasks();

      expect(cleanedCount).toBe(1);
      expect(mockPrisma.task.findMany).toHaveBeenCalled();
      expect(mockPrisma.task.delete).toHaveBeenCalledWith({
        where: { id: 1 }
      });
      expect(logger.warn).toHaveBeenCalledWith('Cleaned up orphaned task: Orphaned Task (ID: 1)');
    });

    it('should handle errors during cleanup', async () => {
      mockPrisma.task.findMany.mockRejectedValue(new Error('Database error'));

      const service = require('../../src/services/workflow.service');
      
      const cleanedCount = await service.cleanupOrphanedTasks();

      expect(cleanedCount).toBe(0);
      expect(logger.error).toHaveBeenCalledWith('Error cleaning up orphaned tasks:', expect.any(Error));
    });
  });

  describe('optimizeTaskQueue', () => {
    it('should optimize task queue by priority', async () => {
      const service = require('../../src/services/workflow.service');
      
      // Add tasks in random order
      service.taskQueue = [
        { workflowId: 1, taskId: 3, taskData: { priority: 'LOW', createdAt: new Date('2023-01-03') } },
        { workflowId: 1, taskId: 1, taskData: { priority: 'HIGH', createdAt: new Date('2023-01-01') } },
        { workflowId: 1, taskId: 2, taskData: { priority: 'MEDIUM', createdAt: new Date('2023-01-02') }
      ];

      service.optimizeTaskQueue();

      expect(service.taskQueue).toHaveLength(3);
      expect(service.taskQueue[0].taskId).toBe(1); // HIGH
      expect(service.taskQueue[1].taskId).toBe(2); // MEDIUM
      expect(service.taskQueue[2].taskId).toBe(3); // LOW
    });

    it('should remove duplicate tasks', async () => {
      const service = require('../../services/workflow.service');
      
      // Add duplicate tasks
      service.taskQueue = [
        { workflowId: 1, taskId: 1 },
        { workflowId: 1, taskId: 1 }, // Duplicate
        { workflowId: 2, taskId: 2 }
      ];

      service.optimizeTaskQueue();

      expect(service.taskQueue).toHaveLength(2); // Duplicates removed
      expect(service.taskQueue[0].taskId).toBe(2);
      expect(service.taskQueue[1].taskId).toBe(2);
    });

    it('should handle empty queue', async () => {
      const service = require('../../services/workflow.service');
      
      service.taskQueue = [];
      service.optimizeTaskQueue();

      expect(service.taskQueue).toHaveLength(0);
      expect(logger.info).toHaveBeenCalledWith('Task queue optimized: 0 tasks in queue');
    });
  });

  describe('getSystemMetrics', () => {
    it('should get comprehensive system metrics', async () => {
      const service = require('../../src/services/workflow.service');
      
      // Mock all the database queries
      mockPrisma.workflow.count.mockResolvedValue(10);
      mockPrisma.workflow.count.mockResolvedValue(5);
      mockPrisma.task.count.mockResolvedValue(50);
      mockPrisma.task.count.mockResolvedValue(2);
      mockPrisma.task.count.mockResolvedValue(40);
      mockPrisma.task.count.mockResolvedValue(8);
      mockPrisma.scheduledTask.count.mockResolvedValue(3);
      mockPrisma.workflowLog.count.mockResolvedValue(100);

      const memoryUsage = {
        heapUsed: 100 * 1024 * 1024,
        heapTotal: 500 * 1024 * 1024,
        external: 50 * 1024 * 1024
      };
      process.memoryUsage = memoryUsage;

      const metrics = await service.getSystemMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.workflows.total).toBe(10);
      expect(metrics.tasks.total).toBe(50);
      expect(metrics.system.uptime).toBeGreaterThan(0));
      expect(metrics.system.memory.used).toBe(100);
      expect(metrics.system.memory.total).toBe(500);
      expect(metrics.logs.last24Hours).toBe(100);
    });

    it('should handle errors during metrics collection', async () => {
      mockPrisma.workflow.count.mockRejectedValue(new Error('Database error'));

      const service = require('../../src/services/workflow.service');
      
      await expect(service.getSystemMetrics()).rejects.toThrow('Database error');
    });
  });

  describe('scheduleMaintenanceTasks', () => {
    it('should schedule periodic maintenance tasks', () => {
      const service = require('../../src/services/workflow.service');
      
      // Mock setInterval
      const mockSetInterval = jest.fn();
      global.setInterval = mockSetInterval;

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 300000); // 5 minutes
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 3600000); // 1 hour
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 600000); // 10 minutes
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 60000); // 1 minute
      expect(logger.info).toHaveBeenCalledWith('Scheduled periodic maintenance tasks');
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent task execution', async () => {
      const service = require('../../src/services/workflow.service');
      
      // Add more tasks than max concurrent
      for (let i = 0; i < 15; i++) {
        service.taskQueue.push({
          workflowId: 1,
          taskId: i + 1,
          taskData: { priority: 'MEDIUM' }
        });
      }

      const initialQueueLength = service.taskQueue.length;
      const initialRunningTasks = service.runningTasks.size;

      // Start processing
      service.processTaskQueue();

      // Should only process maxConcurrentTasks tasks
      expect(service.taskQueue.length).toBe(initialQueueLength - service.maxConcurrentTasks);
      expect(service.runningTasks.size).toBe(service.maxConcurrentTasks);
    });

    it('should handle empty task queue after processing', async () => {
      const service = require('../../src/services/workflowService');
      
      service.taskQueue = [
        { workflowId: 1, taskId: 1, taskData: { priority: 'MEDIUM' } }
      ];

      service.processTaskQueue();

      // Queue should be empty after processing
      expect(service.taskQueue).toHaveLength(0);
      expect(service.runningTasks.size).toBe(0);
    });

    it('should handle rapid queue additions', async () => {
      const service = require('../../src/services/workflowService');
      
      // Add tasks rapidly
      for (let i = 0; i < 100; i++) {
        service.taskQueue.push({
          workflowId: 1,
          taskId: i + 1,
          taskData: { priority: 'MEDIUM' }
        });
      }

      const initialQueueLength = service.taskQueue.length;
      service.processTaskQueue();

      // Should process some tasks but not all due to concurrency limit
      expect(service.taskQueue.length).toBeGreaterThan(0));
      expect(service.taskQueue.length).toBe(initialQueueLength - service.maxConcurrentTasks);
    });

    it('should handle memory pressure gracefully', async () => {
      const service = require('../../services/workflowService');
      
      // Simulate memory pressure
      const memoryUsage = {
        heapUsed: 600 * 1024 * 1024, // 600MB
        heapTotal: 500 * 1024 * 1024 // 500MB
      };
      process.memoryUsage = memoryUsage;

      // Should optimize queue when memory is high
      service.optimizeTaskQueue();

      // Should reduce batch sizes in tasks
      const tasks = service.taskQueue.map(task => ({
        ...task,
        taskData: {
          ...task.taskData,
          config: JSON.stringify({
            ...JSON.parse(task.taskData.config || '{}'),
            batchSize: 1
          })
        }
      }));

      expect(tasks.every(task => {
        const config = JSON.parse(task.taskData.config);
        return config.batchSize === 1;
      }));
    });
  });
});
