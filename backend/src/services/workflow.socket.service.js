import logger from '../utils/logger.util.js';
import workflowService from './workflow.service.js';

class WorkflowSocketService {
  constructor(io) {
    this.io = io;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen to workflow service events
    workflowService.on('workflowCreated', (data) => {
      this.broadcastWorkflowCreated(data);
    });

    workflowService.on('workflowUpdated', (data) => {
      this.broadcastWorkflowUpdated(data);
    });

    workflowService.on('workflowDeleted', (data) => {
      this.broadcastWorkflowDeleted(data);
    });

    workflowService.on('workflowExecutionStarted', (data) => {
      this.broadcastWorkflowExecutionStarted(data);
    });

    workflowService.on('workflowCompleted', (data) => {
      this.broadcastWorkflowCompleted(data);
    });

    workflowService.on('workflowFailed', (data) => {
      this.broadcastWorkflowFailed(data);
    });

    workflowService.on('workflowTasksCancelled', (data) => {
      this.broadcastWorkflowTasksCancelled(data);
    });

    workflowService.on('taskStarted', (data) => {
      this.broadcastTaskStarted(data);
    });

    workflowService.on('taskCompleted', (data) => {
      this.broadcastTaskCompleted(data);
    });

    workflowService.on('taskFailed', (data) => {
      this.broadcastTaskFailed(data);
    });

    workflowService.on('taskRetrying', (data) => {
      this.broadcastTaskRetrying(data);
    });

    workflowService.on('workflowLog', (data) => {
      this.broadcastWorkflowLog(data);
    });

    logger.info('Workflow socket service event listeners setup complete');
  }

  // Handle user connection
  handleUserConnection(socket) {
    const userId = socket.userId;
    
    if (!userId) {
      logger.warn('Socket connection without userId');
      return;
    }

    // Join user to their personal room for targeted updates
    socket.join(`user_${userId}`);
    
    // Join workflow global room
    socket.join('workflow_global');
    
    logger.info(`User ${userId} connected to workflow socket service`);

    // Send initial workflow data
    this.sendInitialWorkflowData(socket, userId);

    // Handle socket events
    socket.on('subscribe_workflow', (data) => {
      this.handleWorkflowSubscription(socket, data);
    });

    socket.on('unsubscribe_workflow', (data) => {
      this.handleWorkflowUnsubscription(socket, data);
    });

    socket.on('subscribe_workflow_logs', (data) => {
      this.handleWorkflowLogsSubscription(socket, data);
    });

    socket.on('get_realtime_stats', async () => {
      try {
        const stats = await workflowService.getWorkflowStats(userId);
        socket.emit('workflow_stats_update', {
          userId,
          stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Error getting realtime workflow stats:', error);
        socket.emit('error', { message: 'Failed to get workflow stats' });
      }
    });

    socket.on('get_queue_status', () => {
      try {
        const queueStatus = workflowService.getTaskQueueStatus();
        socket.emit('queue_status_update', {
          queueStatus,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Error getting queue status:', error);
        socket.emit('error', { message: 'Failed to get queue status' });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`User ${userId} disconnected from workflow socket service`);
    });
  }

  async sendInitialWorkflowData(socket, userId) {
    try {
      // Get user's workflow summary
      const stats = await workflowService.getWorkflowStats(userId);
      
      socket.emit('workflow_init', {
        userId,
        stats,
        timestamp: new Date().toISOString()
      });

      // Send queue status
      const queueStatus = workflowService.getTaskQueueStatus();
      socket.emit('queue_status_update', {
        queueStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error sending initial workflow data:', error);
      socket.emit('error', { message: 'Failed to load workflow data' });
    }
  }

  broadcastWorkflowCreated(data) {
    const { createdBy } = data;
    
    // Send to specific user
    this.io.to(`user_${createdBy}`).emit('workflow_created', {
      ...data,
      timestamp: new Date().toISOString()
    });

    // Send to global room for admin notifications
    this.io.to('workflow_global').emit('global_workflow_created', {
      workflowId: data.id,
      workflowName: data.name,
      createdBy,
      timestamp: new Date().toISOString()
    });

    logger.info(`Broadcasted workflow created: ${data.name} by user ${createdBy}`);
  }

  broadcastWorkflowUpdated(data) {
    const { createdBy } = data;
    
    // Send to specific user
    this.io.to(`user_${createdBy}`).emit('workflow_updated', {
      ...data,
      timestamp: new Date().toISOString()
    });

    // Send to global room for admin notifications
    this.io.to('workflow_global').emit('global_workflow_updated', {
      workflowId: data.id,
      workflowName: data.name,
      createdBy,
      timestamp: new Date().toISOString()
    });

    logger.info(`Broadcasted workflow updated: ${data.name} by user ${createdBy}`);
  }

  broadcastWorkflowDeleted(data) {
    const { workflowId } = data;
    
    // Send to global room for admin notifications
    this.io.to('workflow_global').emit('global_workflow_deleted', {
      workflowId,
      timestamp: new Date().toISOString()
    });

    logger.info(`Broadcasted workflow deleted: ${workflowId}`);
  }

  broadcastWorkflowExecutionStarted(data) {
    const { workflowId, taskCount } = data;
    
    // Send to workflow-specific room
    this.io.to(`workflow_${workflowId}`).emit('workflow_execution_started', {
      ...data,
      timestamp: new Date().toISOString()
    });

    // Send to global room for admin notifications
    this.io.to('workflow_global').emit('global_workflow_execution_started', {
      workflowId,
      taskCount,
      timestamp: new Date().toISOString()
    });

    logger.info(`Broadcasted workflow execution started: ${workflowId}`);
  }

  broadcastWorkflowCompleted(data) {
    const { workflowId } = data;
    
    // Send to workflow-specific room
    this.io.to(`workflow_${workflowId}`).emit('workflow_completed', {
      ...data,
      timestamp: new Date().toISOString()
    });

    // Send to global room for admin notifications
    this.io.to('workflow_global').emit('global_workflow_completed', {
      workflowId,
      timestamp: new Date().toISOString()
    });

    logger.info(`Broadcasted workflow completed: ${workflowId}`);
  }

  broadcastWorkflowFailed(data) {
    const { workflowId } = data;
    
    // Send to workflow-specific room
    this.io.to(`workflow_${workflowId}`).emit('workflow_failed', {
      ...data,
      timestamp: new Date().toISOString()
    });

    // Send to global room for admin notifications
    this.io.to('workflow_global').emit('global_workflow_failed', {
      workflowId,
      timestamp: new Date().toISOString()
    });

    logger.info(`Broadcasted workflow failed: ${workflowId}`);
  }

  broadcastWorkflowTasksCancelled(data) {
    const { workflowId, cancelledCount } = data;
    
    // Send to workflow-specific room
    this.io.to(`workflow_${workflowId}`).emit('workflow_tasks_cancelled', {
      ...data,
      timestamp: new Date().toISOString()
    });

    // Send to global room for admin notifications
    this.io.to('workflow_global').emit('global_workflow_tasks_cancelled', {
      workflowId,
      cancelledCount,
      timestamp: new Date().toISOString()
    });

    logger.info(`Broadcasted workflow tasks cancelled: ${workflowId} (${cancelledCount} tasks)`);
  }

  broadcastTaskStarted(data) {
    const { workflowId, taskId, taskName } = data;
    
    // Send to workflow-specific room
    this.io.to(`workflow_${workflowId}`).emit('task_started', {
      ...data,
      timestamp: new Date().toISOString()
    });

    // Send to global room for admin notifications
    this.io.to('workflow_global').emit('global_task_started', {
      workflowId,
      taskId,
      taskName,
      timestamp: new Date().toISOString()
    });

    logger.info(`Broadcasted task started: ${taskName} in workflow ${workflowId}`);
  }

  broadcastTaskCompleted(data) {
    const { workflowId, taskId, taskName, result } = data;
    
    // Send to workflow-specific room
    this.io.to(`workflow_${workflowId}`).emit('task_completed', {
      ...data,
      timestamp: new Date().toISOString()
    });

    // Send to global room for admin notifications
    this.io.to('workflow_global').emit('global_task_completed', {
      workflowId,
      taskId,
      taskName,
      result,
      timestamp: new Date().toISOString()
    });

    logger.info(`Broadcasted task completed: ${taskName} in workflow ${workflowId}`);
  }

  broadcastTaskFailed(data) {
    const { workflowId, taskId, taskName, error } = data;
    
    // Send to workflow-specific room
    this.io.to(`workflow_${workflowId}`).emit('task_failed', {
      ...data,
      timestamp: new Date().toISOString()
    });

    // Send to global room for admin notifications
    this.io.to('workflow_global').emit('global_task_failed', {
      workflowId,
      taskId,
      taskName,
      error,
      timestamp: new Date().toISOString()
    });

    logger.info(`Broadcasted task failed: ${taskName} in workflow ${workflowId}`);
  }

  broadcastTaskRetrying(data) {
    const { workflowId, taskId, taskName, retryCount } = data;
    
    // Send to workflow-specific room
    this.io.to(`workflow_${workflowId}`).emit('task_retrying', {
      ...data,
      timestamp: new Date().toISOString()
    });

    // Send to global room for admin notifications
    this.io.to('workflow_global').emit('global_task_retrying', {
      workflowId,
      taskId,
      taskName,
      retryCount,
      timestamp: new Date().toISOString()
    });

    logger.info(`Broadcasted task retrying: ${taskName} in workflow ${workflowId} (retry ${retryCount})`);
  }

  broadcastWorkflowLog(data) {
    const { workflowId, level, message } = data;
    
    // Send to workflow-specific room
    this.io.to(`workflow_${workflowId}`).emit('workflow_log', {
      ...data,
      timestamp: new Date().toISOString()
    });

    // Send to global room for high-priority logs
    if (level === 'ERROR' || level === 'FATAL') {
      this.io.to('workflow_global').emit('global_workflow_log', {
        ...data,
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`Broadcasted workflow log: ${level} - ${message} in workflow ${workflowId}`);
  }

  handleWorkflowSubscription(socket, data) {
    const { workflowId } = data;
    
    if (!workflowId) {
      socket.emit('error', { message: 'Workflow ID is required' });
      return;
    }

    // Join workflow room
    socket.join(`workflow_${workflowId}`);
    
    // Send current workflow status
    this.sendWorkflowStatus(socket, workflowId);
    
    logger.info(`User ${socket.userId} subscribed to workflow ${workflowId}`);
  }

  handleWorkflowUnsubscription(socket, data) {
    const { workflowId } = data;
    
    if (!workflowId) {
      socket.emit('error', { message: 'Workflow ID is required' });
      return;
    }

    // Leave workflow room
    socket.leave(`workflow_${workflowId}`);
    
    logger.info(`User ${socket.userId} unsubscribed from workflow ${workflowId}`);
  }

  handleWorkflowLogsSubscription(socket, data) {
    const { workflowId } = data;
    
    if (!workflowId) {
      socket.emit('error', { message: 'Workflow ID is required' });
      return;
    }

    // Join workflow logs room
    socket.join(`workflow_logs_${workflowId}`);
    
    // Send recent logs
    this.sendRecentLogs(socket, workflowId);
    
    logger.info(`User ${socket.userId} subscribed to workflow logs ${workflowId}`);
  }

  async sendWorkflowStatus(socket, workflowId) {
    try {
      const workflow = await workflowService.getWorkflow(workflowId);
      
      if (!workflow) {
        socket.emit('error', { message: 'Workflow not found' });
        return;
      }

      socket.emit('workflow_status', {
        workflowId,
        status: this.getWorkflowStatus(workflow),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error sending workflow status:', error);
      socket.emit('error', { message: 'Failed to get workflow status' });
    }
  }

  async sendRecentLogs(socket, workflowId) {
    try {
      const logs = await workflowService.getWorkflowLogs(workflowId, {
        limit: 50
      });

      socket.emit('workflow_logs', {
        workflowId,
        logs,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error sending recent logs:', error);
      socket.emit('error', { message: 'Failed to get workflow logs' });
    }
  }

  getWorkflowStatus(workflow) {
    const tasks = workflow.tasks || [];
    const completedTasks = tasks.filter(task => task.status === 'COMPLETED').length;
    const failedTasks = tasks.filter(task => task.status === 'FAILED').length;
    const runningTasks = tasks.filter(task => task.status === 'RUNNING').length;
    const pendingTasks = tasks.filter(task => task.status === 'PENDING').length;

    return {
      totalTasks: tasks.length,
      completedTasks,
      failedTasks,
      runningTasks,
      pendingTasks,
      progress: tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0,
      status: runningTasks > 0 ? 'RUNNING' : failedTasks > 0 ? 'FAILED' : completedTasks === tasks.length ? 'COMPLETED' : 'PENDING'
    };
  }

  // Public method to trigger manual workflow broadcasts
  async triggerWorkflow(workflowId, triggerData = {}) {
    try {
      const workflow = await workflowService.executeWorkflow(workflowId, triggerData);
      
      // Broadcast to all subscribers
      this.broadcastWorkflowExecutionStarted({
        workflowId,
        taskCount: workflow.tasks?.length || 0
      });

      return workflow;
    } catch (error) {
      logger.error('Error triggering workflow:', error);
      throw error;
    }
  }

  // Get real-time statistics
  async getRealtimeStats() {
    try {
      const stats = await workflowService.getWorkflowStats(null); // Global stats
      
      // Broadcast to admin room if needed
      this.io.to('admin_workflow').emit('workflow_stats', {
        ...stats,
        timestamp: new Date().toISOString()
      });
      
      return stats;
    } catch (error) {
      logger.error('Error getting realtime stats:', error);
      throw error;
    }
  }

  // Get queue status
  getQueueStatus() {
    try {
      const queueStatus = workflowService.getTaskQueueStatus();
      
      // Broadcast to admin room if needed
      this.io.to('admin_workflow').emit('queue_status', {
        queueStatus,
        timestamp: new Date().toISOString()
      });
      
      return queueStatus;
    } catch (error) {
      logger.error('Error getting queue status:', error);
      throw error;
    }
  }

  // Broadcast system-wide notifications
  broadcastSystemNotification(level, message, metadata = {}) {
    this.io.to('workflow_global').emit('system_notification', {
      level,
      message,
      metadata,
      timestamp: new Date().toISOString()
    });

    logger.info(`Broadcasted system notification: ${level} - ${message}`);
  }

  // Handle workflow health checks
  async performHealthCheck() {
    try {
      const queueStatus = workflowService.getTaskQueueStatus();
      const stats = await workflowService.getWorkflowStats(null);
      
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        queue: queueStatus,
        stats,
        runningTasks: this.runningTasks.size,
        cronJobs: workflowService.cronJobs.size
      };

      // Broadcast health status to admin room
      this.io.to('admin_workflow').emit('workflow_health', health);

      return health;
    } catch (error) {
      logger.error('Error performing health check:', error);
      
      const health = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };

      this.io.to('admin_workflow').emit('workflow_health', health);
      return health;
    }
  }

  // Handle workflow analytics updates
  broadcastAnalyticsUpdate(data) {
    this.io.to('workflow_global').emit('analytics_update', {
      ...data,
      timestamp: new Date().toISOString()
    });

    logger.info('Broadcasted analytics update');
  }

  // Handle scheduled task updates
  broadcastScheduledTaskUpdate(data) {
    this.io.to('workflow_global').emit('scheduled_task_update', {
      ...data,
      timestamp: new Date().toISOString()
    });

    logger.info('Broadcasted scheduled task update');
  }

  // Handle workflow performance metrics
  broadcastPerformanceMetrics(data) {
    this.io.to('admin_workflow').emit('performance_metrics', {
      ...data,
      timestamp: new Date().toISOString()
    });

    logger.info('Broadcasted performance metrics');
  }

  // Handle workflow alerts
  broadcastAlert(alert) {
    this.io.to('workflow_global').emit('workflow_alert', {
      ...alert,
      timestamp: new Date().toISOString()
    });

    logger.info(`Broadcasted workflow alert: ${alert.type} - ${alert.message}`);
  }

  // Get connected users count
  getConnectedUsers() {
    const connectedUsers = this.io.sockets.sockets.size;
    
    this.io.to('admin_workflow').emit('connected_users', {
      count: connectedUsers,
      timestamp: new Date().toISOString()
    });

    return connectedUsers;
  }

  // Handle workflow room management
  getWorkflowRoomStats(workflowId) {
    const room = this.io.sockets.adapter.rooms.get(`workflow_${workflowId}`);
    const subscriberCount = room ? room.size : 0;
    
    return {
      workflowId,
      subscriberCount,
      timestamp: new Date().toISOString()
    };
  }

  // Broadcast workflow room stats
  broadcastWorkflowRoomStats(workflowId) {
    const stats = this.getWorkflowRoomStats(workflowId);
    
    this.io.to('admin_workflow').emit('workflow_room_stats', stats);
    
    logger.info(`Broadcasted workflow room stats: ${workflowId} (${stats.subscriberCount} subscribers)`);
  }
}

module.exports = WorkflowSocketService;
