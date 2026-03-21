import axios from "axios";
import { ENV } from '../utils/env';

const BASE_URL = ENV.API_URL;

// Create axios instance with auth
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      try {
        const refreshResponse = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {}, {
          withCredentials: true
        });
        
        const { accessToken } = refreshResponse.data.data;
        localStorage.setItem('accessToken', accessToken);
        
        // Retry original request
        error.config.headers.Authorization = `Bearer ${accessToken}`;
        return api.request(error.config);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Workflow API methods
export const workflowAPI = {
  // Workflow CRUD operations
  async createWorkflow(workflowData) {
    const response = await api.post('/api/v1/workflows', workflowData);
    return response.data.data;
  },

  async getWorkflows(userId, filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive);
    if (filters.triggerType) params.append('triggerType', filters.triggerType);
    if (filters.search) params.append('search', filters.search);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const response = await api.get(`/api/v1/workflows?${params}`);
    return response.data.data;
  },

  async getWorkflow(workflowId) {
    const response = await api.get(`/api/v1/workflows/${workflowId}`);
    return response.data.data;
  },

  async updateWorkflow(workflowId, updateData) {
    const response = await api.put(`/api/v1/workflows/${workflowId}`, updateData);
    return response.data.data;
  },

  async deleteWorkflow(workflowId) {
    const response = await api.delete(`/api/v1/workflows/${workflowId}`);
    return response.data.data;
  },

  // Workflow execution
  async executeWorkflow(workflowId, triggerData = {}) {
    const response = await api.post(`/api/v1/workflows/${workflowId}/execute`, triggerData);
    return response.data.data;
  },

  async cancelWorkflow(workflowId) {
    const response = await api.post(`/api/v1/workflows/${workflowId}/cancel`);
    return response.data.data;
  },

  // Workflow statistics
  async getWorkflowStats(userId) {
    const response = await api.get('/api/v1/workflows/stats');
    return response.data.data;
  },

  // Workflow logs
  async getWorkflowLogs(workflowId, filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.level) params.append('level', filters.level);
    if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
    if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
    if (filters.limit) params.append('limit', filters.limit);

    const response = await api.get(`/api/v1/workflows/${workflowId}/logs?${params}`);
    return response.data.data;
  },

  // Task operations
  async getTasks(userId, filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.taskType) params.append('taskType', filters.taskType);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const response = await api.get(`/api/v1/workflows/tasks?${params}`);
    return response.data.data;
  },

  async getTask(taskId) {
    const response = await api.get(`/api/v1/workflows/tasks/${taskId}`);
    return response.data.data;
  },

  async updateTask(taskId, updateData) {
    const response = await api.put(`/api/v1/workflows/tasks/${taskId}`, updateData);
    return response.data.data;
  },

  async deleteTask(taskId) {
    const response = await api.delete(`/api/v1/workflows/tasks/${taskId}`);
    return response.data.data;
  },

  async executeTask(taskId) {
    const response = await api.post(`/api/v1/workflows/tasks/${taskId}/execute`);
    return response.data.data;
  },

  async cancelTask(taskId) {
    const response = await api.post(`/api/v1/workflows/tasks/${taskId}/cancel`);
    return response.data.data;
  },

  // Scheduled tasks
  async getScheduledTasks(userId, filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const response = await api.get(`/api/v1/workflows/scheduled?${params}`);
    return response.data.data;
  },

  async createScheduledTask(taskData) {
    const response = await api.post('/api/v1/workflows/scheduled', taskData);
    return response.data.data;
  },

  async updateScheduledTask(taskId, updateData) {
    const response = await api.put(`/api/v1/workflows/scheduled/${taskId}`, updateData);
    return response.data.data;
  },

  async deleteScheduledTask(taskId) {
    const response = await api.delete(`/api/v1/workflows/scheduled/${taskId}`);
    return response.data.data;
  },

  async executeScheduledTask(taskId) {
    const response = await api.post(`/api/v1/workflows/scheduled/${taskId}/execute`);
    return response.data.data;
  },

  // Workflow triggers
  async triggerWorkflow(workflowId, triggerData = {}) {
    const response = await api.post('/api/v1/workflows/trigger', {
      workflowId,
      triggerData
    });
    return response.data.data;
  },

  // Queue status
  async getTaskQueueStatus() {
    const response = await api.get('/api/v1/workflows/queue/status');
    return response.data.data;
  },

  // System information
  async getTaskTypes() {
    const response = await api.get('/api/v1/workflows/task-types');
    return response.data.data;
  },

  async getTriggerTypes() {
    const response = await api.get('/api/v1/workflows/trigger-types');
    return response.data.data;
  },

  async getPriorityLevels() {
    const response = await api.get('/api/v1/workflows/priority-levels');
    return response.data.data;
  },

  async getLogLevels() {
    const response = await api.get('/api/v1/workflows/log-levels');
    return response.data.data;
  },

  // Health check
  async getHealthStatus() {
    const response = await api.get('/api/v1/workflows/health');
    return response.data.data;
  },

  // Email notification helpers
  async createEmailNotificationWorkflow(config) {
    const workflowData = {
      name: config.name || 'Email Notification',
      description: config.description || 'Send email notifications',
      triggerType: 'MANUAL',
      triggerData: JSON.stringify({}),
      tasks: [{
        name: config.name || 'Send Email',
        description: config.description || 'Send email to recipients',
        taskType: 'EMAIL_NOTIFICATION',
        config: JSON.stringify({
          recipients: config.recipients || [],
          subject: config.subject || 'Notification',
          template: config.template || 'default',
          data: config.data || {}
        }),
        priority: config.priority || 'MEDIUM',
        maxRetries: config.maxRetries || 3
      }]
    };

    return await this.createWorkflow(workflowData);
  },

  async createPushNotificationWorkflow(config) {
    const workflowData = {
      name: config.name || 'Push Notification',
      description: config.description || 'Send push notifications',
      triggerType: 'MANUAL',
      triggerData: JSON.stringify({}),
      tasks: [{
        name: config.name || 'Send Push Notification',
        description: config.description || 'Send push notification to users',
        taskType: 'PUSH_NOTIFICATION',
        config: JSON.stringify({
          userIds: config.userIds || [],
          title: config.title || 'Notification',
          message: config.message || 'You have a new notification',
          data: config.data || {}
        }),
        priority: config.priority || 'MEDIUM',
        maxRetries: config.maxRetries || 3
      }]
    };

    return await this.createWorkflow(workflowData);
  },

  // Scheduled workflow helpers
  async createScheduledEmailWorkflow(config) {
    const scheduledTaskData = {
      name: config.name || 'Scheduled Email',
      description: config.description || 'Send scheduled email notifications',
      taskType: 'EMAIL_NOTIFICATION',
      config: JSON.stringify({
        recipients: config.recipients || [],
        subject: config.subject || 'Scheduled Notification',
        template: config.template || 'default',
        data: config.data || {}
      }),
      cronExpression: config.cronExpression,
      timezone: config.timezone || 'UTC',
      isActive: config.isActive !== false
    };

    return await this.createScheduledTask(scheduledTaskData);
  },

  async createScheduledPushWorkflow(config) {
    const scheduledTaskData = {
      name: config.name || 'Scheduled Push Notification',
      description: config.description || 'Send scheduled push notifications',
      taskType: 'PUSH_NOTIFICATION',
      config: JSON.stringify({
        userIds: config.userIds || [],
        title: config.title || 'Scheduled Notification',
        message: config.message || 'You have a scheduled notification',
        data: config.data || {}
      }),
      cronExpression: config.cronExpression,
      timezone: config.timezone || 'UTC',
      isActive: config.isActive !== false
    };

    return await this.createScheduledTask(scheduledTaskData);
  },

  // Analytics workflow helpers
  async createReportGenerationWorkflow(config) {
    const workflowData = {
      name: config.name || 'Report Generation',
      description: config.description || 'Generate analytics reports',
      triggerType: config.triggerType || 'SCHEDULED',
      triggerData: JSON.stringify(config.triggerData || {}),
      tasks: [{
        name: config.name || 'Generate Report',
        description: config.description || 'Generate analytics report',
        taskType: 'REPORT_GENERATION',
        config: JSON.stringify({
          reportType: config.reportType || 'USER_ACTIVITY',
          parameters: config.parameters || {}
        }),
        priority: config.priority || 'MEDIUM',
        scheduledAt: config.scheduledAt,
        maxRetries: config.maxRetries || 3
      }]
    };

    return await this.createWorkflow(workflowData);
  },

  async createDataProcessingWorkflow(config) {
    const workflowData = {
      name: config.name || 'Data Processing',
      description: config.description || 'Process and clean data',
      triggerType: config.triggerType || 'SCHEDULED',
      triggerData: JSON.stringify(config.triggerData || {}),
      tasks: [{
        name: config.name || 'Process Data',
        description: config.description || 'Process and clean data',
        taskType: 'DATA_PROCESSING',
        config: JSON.stringify({
          operation: config.operation || 'CLEANUP_INACTIVE_USERS',
          retentionDays: config.retentionDays || 90,
          filters: config.filters || {}
        }),
        priority: config.priority || 'LOW',
        scheduledAt: config.scheduledAt,
        maxRetries: config.maxRetries || 1
      }]
    };

    return await this.createWorkflow(workflowData);
  },

  // Gamification workflow helpers
  async createGamificationUpdateWorkflow(config) {
    const workflowData = {
      name: config.name || 'Gamification Update',
      description: config.description || 'Update gamification data',
      triggerType: config.triggerType || 'SCHEDULED',
      triggerData: JSON.stringify(config.triggerData || {}),
      tasks: [{
        name: config.name || 'Update Gamification',
        description: config.description || 'Update leaderboards and points',
        taskType: 'GAMIFICATION_UPDATE',
        config: JSON.stringify({
          updateType: config.updateType || 'UPDATE_LEADERBOARDS',
          parameters: config.parameters || {}
        }),
        priority: config.priority || 'MEDIUM',
        scheduledAt: config.scheduledAt,
        maxRetries: config.maxRetries || 3
      }]
    };

    return await this.createWorkflow(workflowData);
  },

  // User engagement workflow helpers
  async createUserEngagementWorkflow(config) {
    const workflowData = {
      name: config.name || 'User Engagement',
      description: config.description || 'Engage users with notifications',
      triggerType: config.triggerType || 'EVENT_BASED',
      triggerData: JSON.stringify(config.triggerData || {}),
      tasks: [{
        name: config.name || 'Engage Users',
        description: config.description || 'Send engagement notifications',
        taskType: 'USER_ENGAGEMENT',
        config: JSON.stringify({
          engagementType: config.engagementType || 'WELCOME_SEQUENCE',
          parameters: config.parameters || {}
        }),
        priority: config.priority || 'MEDIUM',
        maxRetries: config.maxRetries || 3
      }]
    };

    return await this.createWorkflow(workflowData);
  },

  // System maintenance workflow helpers
  async createSystemMaintenanceWorkflow(config) {
    const workflowData = {
      name: config.name || 'System Maintenance',
      description: config.description || 'Perform system maintenance tasks',
      triggerType: config.triggerType || 'SCHEDULED',
      triggerData: JSON.stringify(config.triggerData || {}),
      tasks: [{
        name: config.name || 'System Maintenance',
        description: config.description || 'Perform health checks and optimizations',
        taskType: 'SYSTEM_MAINTENANCE',
        config: JSON.stringify({
          maintenanceType: config.maintenanceType || 'HEALTH_CHECK',
          parameters: config.parameters || {}
        }),
        priority: config.priority || 'LOW',
        scheduledAt: config.scheduledAt,
        maxRetries: config.maxRetries || 1
      }]
    };

    return await this.createWorkflow(workflowData);
  },

  // Utility methods
  async validateWorkflowConfig(workflowData) {
    const errors = [];

    // Validate basic workflow data
    if (!workflowData.name || workflowData.name.trim() === '') {
      errors.push('Workflow name is required');
    }

    if (!workflowData.triggerType) {
      errors.push('Trigger type is required');
    }

    if (!workflowData.tasks || workflowData.tasks.length === 0) {
      errors.push('At least one task is required');
    }

    // Validate tasks
    if (workflowData.tasks) {
      workflowData.tasks.forEach((task, index) => {
        if (!task.name || task.name.trim() === '') {
          errors.push(`Task ${index + 1}: Task name is required`);
        }

        if (!task.taskType) {
          errors.push(`Task ${index + 1}: Task type is required`);
        }

        // Validate task config based on type
        if (task.config) {
          try {
            JSON.parse(task.config);
          } catch (e) {
            errors.push(`Task ${index + 1}: Invalid JSON in config`);
          }
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  async validateScheduledTaskConfig(taskData) {
    const errors = [];

    if (!taskData.name || taskData.name.trim() === '') {
      errors.push('Task name is required');
    }

    if (!taskData.taskType) {
      errors.push('Task type is required');
    }

    if (taskData.cronExpression) {
      // Basic cron expression validation
      const cronParts = taskData.cronExpression.split(' ');
      if (cronParts.length !== 5) {
        errors.push('Invalid cron expression format');
      }
    }

    if (taskData.config) {
      try {
        JSON.parse(taskData.config);
      } catch (e) {
        errors.push('Invalid JSON in config');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Helper methods for common workflow patterns
  async createWelcomeSequenceWorkflow(userId) {
    const workflowData = {
      name: 'Welcome Sequence',
      description: 'Send welcome emails to new users',
      triggerType: 'EVENT_BASED',
      triggerData: JSON.stringify({
        eventType: 'USER_REGISTERED',
        userId: userId
      }),
      tasks: [
        {
          name: 'Send Welcome Email',
          description: 'Send welcome email to new user',
          taskType: 'EMAIL_NOTIFICATION',
          config: JSON.stringify({
            recipients: [userId],
            subject: 'Welcome to our platform!',
            template: 'welcome',
            data: {
              userId: userId
            }
          }),
          priority: 'HIGH',
          maxRetries: 3
        },
        {
          name: 'Send Push Notification',
          description: 'Send welcome push notification',
          taskType: 'PUSH_NOTIFICATION',
          config: JSON.stringify({
            userIds: [userId],
            title: 'Welcome!',
            message: 'Welcome to our platform! Check your email for more information.',
            data: {
              userId: userId
            }
          }),
          priority: 'HIGH',
          maxRetries: 3
        }
      ]
    };

    return await this.createWorkflow(workflowData);
  },

  async createWeeklyReportWorkflow() {
    const scheduledTaskData = {
      name: 'Weekly Analytics Report',
      description: 'Generate and send weekly analytics report',
      taskType: 'REPORT_GENERATION',
      config: JSON.stringify({
        reportType: 'USER_ACTIVITY',
        parameters: {
          timeRange: '7d',
          includeCharts: true
        }
      }),
      cronExpression: '0 9 * * 1', // Every Monday at 9 AM
      timezone: 'UTC',
      isActive: true
    };

    return await this.createScheduledTask(scheduledTaskData);
  },

  async createDailyCleanupWorkflow() {
    const scheduledTaskData = {
      name: 'Daily Cleanup',
      description: 'Clean up old logs and temporary data',
      taskType: 'CLEANUP_TASK',
      config: JSON.stringify({
        cleanupType: 'OLD_LOGS',
        retentionDays: 30
      }),
      cronExpression: '0 2 * * *', // Every day at 2 AM
      timezone: 'UTC',
      isActive: true
    };

    return await this.createScheduledTask(scheduledTaskData);
  }
};

export default workflowAPI;
