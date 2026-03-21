import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Calendar, Clock, Play, Pause, Trash2, Edit, Plus, AlertCircle, CheckCircle, XCircle, RefreshCw, Filter, Search } from 'lucide-react';
import TaskScheduler from '../TaskScheduler';
import { workflowAPI } from '../../../services/workflowAPI';
import socket from '../../../services/socket';

// Mock dependencies
jest.mock('../../../services/workflowAPI');
jest.mock('../../../services/socket', () => ({
  connected: false,
  connect: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

describe('TaskScheduler Component', () => {
  const mockTasks = [
    {
      id: 1,
      name: 'Test Task 1',
      description: 'Test Description 1',
      taskType: 'EMAIL_NOTIFICATION',
      status: 'PENDING',
      priority: 'MEDIUM',
      scheduledAt: null,
      retryCount: 0,
      maxRetries: 3,
      dependencies: [],
      createdAt: new Date('2023-01-01T10:00:00.000Z'),
      updatedAt: new Date('2023-01-01T10:00:00.000Z')
    },
    {
      id: 2,
      name: 'Test Task 2',
      description: 'Test Description 2',
      taskType: 'PUSH_NOTIFICATION',
      status: 'RUNNING',
      priority: 'HIGH',
      scheduledAt: new Date('2023-01-01T10:00:00.000Z'),
      retryCount: 1,
      maxRetries: 3,
      dependencies: [],
      createdAt: new Date('2023-01-01T10:00:00.000Z'),
      updatedAt: new Date('2023-01-01T10:00:00.000Z')
    },
    {
      id: 3,
      name: 'Test Task 3',
      description: 'Test Description 3',
      taskType: 'DATA_PROCESSING',
      status: 'COMPLETED',
      priority: 'LOW',
      scheduledAt: new Date('2023-01-01T10:00:00.000Z'),
      retryCount: 0,
      maxRetries: 3,
      dependencies: [1, 2],
      createdAt: new Date('2023-01-01T10:00:00.000Z'),
      updatedAt: new Date('2023-01-01T10:00:00.000Z')
    }
  ];

  const mockScheduledTasks = [
    {
      id: 1,
      name: 'Scheduled Task 1',
      description: 'Scheduled Description 1',
      taskType: 'EMAIL_NOTIFICATION',
      cronExpression: '0 9 * * * *',
      timezone: 'UTC',
      isActive: true,
      lastRunAt: new Date('2023-01-01T09:00:00.000Z'),
      nextRunAt: new Date('2023-01-02T09:00:00.000Z'),
      runCount: 5,
      createdBy: 1,
      createdAt: new Date('2023-01-01T10:00:00.000Z'),
      updatedAt: new Date('2023-01-01T10:00:00.000Z')
    },
    {
      id: 2,
      name: 'Scheduled Task 2',
      description: 'Scheduled Description 2',
      taskType: 'REPORT_GENERATION',
      cronExpression: '0 0 * * SUN',
      timezone: 'UTC',
      isActive: false,
      lastRunAt: new Date('2023-01-01T08:00:00.000Z'),
      nextRunAt: null,
      runCount: 2,
      createdBy: 1,
      createdAt: new Date('2023-01-01T10:00:00.000Z'),
      updatedAt: new Date('2023-01-01T10:00.000Z')
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('1');
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    it('should render task scheduler component', () => {
      render(<TaskScheduler />);
      
      expect(screen.getByTestId('task-scheduler')).toBeInTheDocument();
    });

    it('render loading state', () => {
      render(<TaskScheduler />);
      
      expect(screen.getByTestId('tasks-loading')).toBeInTheDocument();
      expect(screen.getByText(/Loading tasks.../)).toBeInTheDocument();
    });

    it('render error state', () => {
      render(<TaskScheduler />);
      
      localStorageMock.getItem.mockReturnValue(null);
      render(<TaskScheduler />);
      
      expect(screen.getByText(/Failed to load tasks/)).toBeInTheDocument();
      expect(screen.getByText(/Please try again/)).toBeInTheDocument();
    });

    it('render empty state', () => {
      render(<TaskScheduler />);
      
      render(<TaskScheduler />);
      
      expect(screen.getByText(/No tasks found/)).toBeInTheDocument();
      expect(screen.getByText(/Create your first task/)).toBeInTheDocument();
    });
  });

    it('render with custom className', () => {
      render(<TaskScheduler className="custom-class" />));
      
      expect(screen.getByTestId('task-scheduler')).toHaveClass('custom-class');
    });

    it('render compact mode', () => {
      render(<TaskScheduler compact />);
      
      expect(screen.getByTestId('task-scheduler')).toHaveClass('compact'));
      expect(screen.queryByText(/Create Task/)).not.toBeInTheDocument());
      expect(screen.queryByText(/Description/)).not.toBeInTheDocument());
    });

    it('render with animations enabled', () => {
      render(<TaskScheduler animated />);
      
      expect(screen.getByTestId('task-scheduler')).toHaveClass('animated'));
      expect(screen.getByTestId('task-animation')).toBeInTheDocument();
    });
  });

    it('render with search and filters', () => {
      render(<TaskScheduler />);
      
      expect(screen.getByPlaceholderText(/Search tasks/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Filter/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Filter/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Refresh/ })).toBeInTheDocument();
    });
  });

    it('display task statistics', () => {
      render(<TaskScheduler />);
      
      expect(screen.getByText(/Total Tasks:/)).toBeInTheDocument();
      expect(screen.getByText(/Running:/)).toBeInTheDocument());
      expect(screen.getByText(/Completed:/)).toBeInTheDocument());
      expect(screen.getByText(/Failed:/)).toBeInTheDocument());
    });
  });

  describe('Task Actions', () => {
    it('should open create modal', () => {
      render(<TaskScheduler />);
      
      const createButton = screen.getByRole('button', { name: /Create Task/ });
      fireEvent.click(createButton);
      
      expect(screen.getByTestId('create-task-modal')).toBeInTheDocument();
      expect(screen.getByText(/Create New Task/)).toBeInTheDocument();
    });

    it('should close create modal', () => {
      render(<TaskScheduler />);
      
      const createButton = screen.getByRole('button', { name: /Create Task/ });
      fireEvent.click(createButton);
      
      const closeButton = screen.getByRole('button', { name: /Close/ });
      fireEvent.click(closeButton);
      
      expect(screen.queryByTestId('create-task-modal')).not.toBeInTheDocument();
    });

    it('should open edit modal', () => {
      render(<TaskScheduler />);
      
      const task = mockTasks[0];
      const editButton = screen.getByRole('button', { name: /Edit/ });
      
      // Mock getting task for editing
      jest.spy(workflowAPI, 'getTask').mockResolvedValue(task);
      
      fireEvent.click(editButton);
      
      expect(screen.getByTestId('edit-task-modal')).toBeInTheDocument();
      expect(screen.getByText(/Edit Task/)).toBeInTheDocument();
    });

    it('should delete task', async () => {
      render(<TaskScheduler />);
      
      const task = mockTasks[0];
      const deleteButton = screen.getByRole('button', { name: /Delete/ });
      
      // Mock confirmation
      window.confirm = jest.fn(() => true);
      
      fireEvent.click(deleteButton);
      
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this task?');
      expect(window.confirm).toHaveBeenCalled();
      
      await waitFor(() => {
        expect(screen.getByText(/Task deleted successfully/)).toBeInTheDocument();
      });
    });

    it('should execute task', async () => {
      render(<TaskScheduler />);
      
      const task = mockTasks[0];
      const executeButton = screen.getByRole('button', { name: /Execute/ });
      
      // Mock task execution
      jest.spy(workflowAPI, 'executeTask').mockResolvedValue({
        type: 'EMAIL_NOTIFICATION',
        success: true,
        result: 'Task executed successfully'
      }));
      
      fireEvent.click(executeButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Task executed successfully/)).toBeInTheDocument();
      });
    });

    it('should cancel running task', async () => {
      const runningTask = mockTasks[1]; // RUNNING task
      render(<TaskScheduler />);
      
      const cancelButton = screen.getByRole('button', { name: /Cancel/ });
      
      // Mock task cancellation
      jest.spy(workflowAPI, 'cancelTask').mockResolvedValue());
      
      fireEvent.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Task cancelled/)).toBeInTheDocument();
      });
    });

    it('should refresh tasks', async () => {
      render(<TaskScheduler />);
      
      const refreshButton = screen.getByRole('button', { name: /Refresh/ });
      
      // Mock refresh
      jest.spy(workflowAPI, 'getTasks').mockResolvedValue(mockTasks));
      jest.spy(workflowAPI, 'getScheduledTasks').mockResolvedValue(mockScheduledTasks));
      
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Tasks refreshed/)).toBeInTheDocument();
      });
    });
  });

  describe('Task Filtering', () => {
    it('should filter by status', async () => {
      render(<TaskScheduler />);
      
      const statusFilter = screen.getByRole('select', { name: /Status/ });
      fireEvent.change(statusFilter, { target: { value: 'COMPLETED' } });
      
      await waitFor(() => {
        const completedTasks = screen.queryAll('[data-status="COMPLETED"]');
        expect(completedTasks).toHaveLength(1);
      });
    });

    it('should filter by task type', async () => {
      render(<TaskScheduler />);
      
      const typeFilter = screen.getByRole('select', { name: /Type/ });
      fireEvent.change(typeFilter, { target: { value: 'EMAIL_NOTIFICATION' } });
      
      await waitFor(() => {
        const emailTasks = screen.queryAll('[data-taskType="EMAIL_NOTIFICATION"]');
        expect(emailTasks).toHaveLength(1);
      });
    });

    it('search tasks by name', async () => {
      render(<TaskScheduler />);
      
      const searchInput = screen.getByPlaceholderText(/Search tasks/));
      fireEvent.change(searchInput, { target: { value: 'Test Task 1' } });
      
      await waitFor(() => {
        const searchResults = screen.queryAll('[data-name*="Test Task"]');
        expect(searchResults).toHaveLength(1);
        expect(searchResults[0].name).toContain('Test Task 1');
      });
    });

    it('filter by priority', async () => {
      render(<TaskScheduler />);
      
      const priorityFilter = screen.getByRole('select', { name: /Priority/ });
      fireEvent.change(priorityFilter, { target: { value: 'HIGH' } });
      
      await waitFor(() => {
        const highPriorityTasks = screen.queryAll('[data-priority="HIGH"]');
        expect(highPriorityTasks).toHaveLength(1);
      });
    });

    it('show all filters option', async () => {
      render(<TaskScheduler />);
      
      const filtersButton = screen.getByRole('button', { name: /Filters/ });
      fireEvent.click(filtersButton);
      
      expect(screen.getByText(/Show All Filters/)).toBeInTheDocument();
      expect(screen.getByText(/Hide Filters/)).not.toBeInTheDocument());
      
      // Show all filters
      fireEvent.click(screen.getByText(/Show All Filters/));
      
      expect(screen.getByText(/Hide Filters/)).toBeInTheDocument();
      expect(screen.getByText(/Status:/)).toBeInTheDocument());
      expect(screen.getByText(/Type:/)).toBeInTheDocument());
    });
  });

  describe('Scheduled Tasks Section', () => {
    it('should display scheduled tasks', async () => {
      render(<TaskScheduler />);
      
      expect(screen.getByText(/Scheduled Tasks/)).toBeInTheDocument();
      expect(screen.getByText(/Active: 2/)).toBeInTheDocument();
      expect(screen.getByText(/Inactive: 1/)).toBeInTheDocument());
    });

    it('show cron expressions', async () => {
      render(<TaskScheduler />);
      
      const cronTask = mockScheduledTasks[0];
      
      expect(screen.getByText(/Next: 0 9 * * * \*/)).toBeInTheDocument());
      expect(screen.getByText(/Next: Not scheduled/)).toBeInTheDocument());
      
      const cronTask2 = mockScheduledTasks[1];
      expect(screen.getByText(/Next: Every Sunday at 9:00 AM/)).toBeInTheDocument());
    });

    it('execute scheduled task manually', async () => {
      render(<TaskScheduler />);
      
      const scheduledTask = mockScheduledTasks[0];
      const executeButton = screen.getByRole('button', { name: /Execute Now/ });
      
      // Mock task execution
      jest.spy(workflowAPI, 'executeScheduledTask').mockResolvedValue({
        type: 'EMAIL_NOTIFICATION',
        success: true,
        result: 'Task executed successfully'
      }));
      
      fireEvent.click(executeButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Task executed successfully/)).toBeInTheDocument();
      });
    });

    it('show inactive scheduled tasks', async () => {
      render(<TaskScheduler />);
      
      const inactiveTask = mockScheduledTasks[1];
      
      expect(screen.getByText(/Inactive/)).toBeInTheDocument();
      expect(screen.getByText(/Active:/).not.toBeInTheDocument());
    });

    it('show timezone information', async () => {
      render(<TaskScheduler />);
      
      const scheduledTask = mockScheduledTasks[0];
      
      expect(screen.getByText(/UTC/)).toBeInTheDocument());
      expect(screen.getByText(/America/New York/)).not.toBeInTheDocument());
    });
  });

  describe('Real-time Updates', () => {
    it('should receive task updates via socket', async () => {
      render(<TaskScheduler />);
      
      const task = mockTasks[0];
      
      // Mock socket connection
      socket.connected = true;
      localStorage.setItem('accessToken', 'test-token');
      
      // Mock socket event listeners
      const socketEventHandler = jest.fn();
      socket.on.mockImplementation((event, handler) => {
        if (event === 'taskCreated') {
          handler({ userId: 1, task });
        }
      });

      // Mock socket service
      const mockSocketService = require('../../services/workflow.socket.service');
      jest.mock('../../services/workflow.socket.service').mockImplementation(() => ({
        handleUserConnection: jest.fn(),
        broadcastTaskStarted: jest.fn(),
        broadcastTaskCompleted: jest.fn(),
        broadcastTaskFailed: jest.fn(),
        broadcastTaskRetrying: jest.fn()
      }));

      // Replace the socket service instance
      const originalModule = require('../../services/workflow.socket.service');
      Object.defineProperty(originalModule, 'default', {
        value: mockSocketService,
        writable: true
      });

      // Create service instance to trigger socket events
      const service = require('../../services/workflow.service');
      const socketService = new mockSocketService(service.io);

      // Trigger task created event
      socketEventHandler({ userId: 1, task });

      await waitFor(() => {
        expect(screen.getByText(/Task created/)).toBeInTheDocument();
      });
    });

    it('receive task status updates', async () => {
      render(<TaskScheduler />);
      
      const task = mockTasks[0];
      
      // Mock socket connection
      socket.connected = true;
      localStorage.setItem('accessToken', 'test-token');
      
      // Mock socket event listeners
      const socketEventHandler = jest.fn();
      socket.on.mockImplementation((event, handler) => {
        if (event === 'taskUpdated') {
          handler({ userId: 1, task: { ...task, status: 'COMPLETED' } });
        }
      });

      // Replace the socket service instance
      const originalModule = require('../../services/workflow.socket.service');
      Object.defineProperty(originalModule, 'default', {
        value: mockSocketService,
        writable: true
      });

      // Trigger task updated event
      socketEventHandler({ userId: 1, task: { ...task, status: 'COMPLETED' } });

      await waitFor(() => {
        expect(screen.getByText(/Task completed/)).toBeInTheDocument();
      });
    });

    it('receive task failure notifications', async () => {
      render(<TaskScheduler />);
      
      const task = mockTasks[1]; // FAILED task
      
      // Mock socket connection
      socket.connected = true;
      localStorage.setItem('accessToken', 'test-token');
      
      // Mock socket event listeners
      const socketEventHandler = jest.fn();
      socket.on.mockImplementation((event, handler) => {
        if (event === 'taskFailed') {
          handler({ userId: 1, task: { ...task, error: 'Task failed' } });
        }
      });

      // Replace the socket service instance
      const originalModule = require('../../services/workflow.socket.service');
      Object.defineProperty(originalModule, 'default', {
        value: mockSocketService,
        writable: true
      });

      // Trigger task failed event
      socketEventHandler({ userId: 1, task: { ...task, error: 'Task failed' } });

      await waitFor(() => {
        expect(screen.getByText(/Task failed/)).toBeInTheDocument());
        expect(screen.getByText(/Task failed: Task failed/)).toBeInTheDocument();
      });
    });

    it('handle connection errors gracefully', async () => {
      render(<TaskScheduler />);
      
      // Mock socket connection failure
      socket.connected = false;
      localStorage.setItem('accessToken', 'test-token');
      
      const service = require('../../services/workflow.service');
      
      await service.handleUserConnection({
        userId: null
      });

      expect(logger.warn).toHaveBeenCalledWith('Socket connection without userId'));
    });

    it('handle socket disconnection gracefully', async () => {
      render(<TaskScheduler />);
      
      const service = require('../../services/workflow.service');
      
      const socketEventHandler = jest.fn();
      socket.on.mockImplementation((event, handler) => {
        if (event === 'disconnect') {
          handler();
        }
      });

      const originalModule = require('../../services/workflow.socket.service');
      Object.defineProperty(originalModule, 'default', {
        value: mockSocketService,
        writable: true
      });

      // Trigger disconnect
      socket.emit('disconnect');

      expect(logger.info).toHaveBeenCalledWith('User disconnected from workflow socket service');
    });
  });

  describe('Performance', () => {
    it('should handle large number of tasks efficiently', async () => {
      const service = require('../../services/workflow.service');
      
      // Add many tasks to queue
      for (let i = 0; i < 1000; i++) {
        service.taskQueue.push({
          workflowId: 1,
          taskId: i + 1,
          taskData: { priority: 'MEDIUM' }
        });
      }

      const initialQueueLength = service.taskQueue.length;
      const startTime = Date.now();

      // Process all tasks
      while (service.taskQueue.length > 0 && service.runningTasks.size < service.maxConcurrentTasks) {
        service.processTaskQueue();
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(processingTime).toBeGreaterThan(0); // Should take some time
    });

    it('should handle memory pressure', async () => {
      const service = require('../../services/workflow.service');
      
      // Simulate memory pressure
      const memoryUsage = {
        heapUsed: 600 * 1024 * 1024, // 600MB
        heapTotal: 500 * 1024 * 1024, // 500MB
        external: 50 * 1024 * 1024 // 50MB
      };
      process.memoryUsage = memoryUsage;

      // Optimize task queue for memory pressure
      service.optimizeTaskQueue();

      // Check that batch sizes are reduced
      const tasks = service.taskQueue.map(task => ({
        ...task,
        taskData: {
          ...JSON.parse(task.taskData.config || '{}'),
          batchSize: 1
        }
      }));

      expect(tasks.every(task => {
        const config = JSON.parse(task.taskData.config || '{}');
        return config.batchSize === 1;
      }));
    });
  });

  describe('Accessibility', () => {
    it('have proper ARIA labels', () => {
      render(<TaskScheduler />);
      
      expect(screen.getByLabelText(/User points/)).toBeInTheDocument());
      expect(screen.getByLabelText(/User level/)).toBeInTheDocument());
      expect(screen.getByLabelText(/User rank/)).toBeInTheDocument());
      expect(screen.getByLabelText(/User engagement/)).toBeInTheDocument());
    });

    it('be keyboard navigable', () => {
      render(<TaskScheduler />);
      
      const task = mockTasks[0];
      const taskElement = screen.getByTestId(`task-${task.id}`);
      
      expect(taskElement).toHaveAttribute('tabIndex', '0');
      expect(taskElement).toHaveAttribute('aria-label', expect.stringContaining(task.name));
    });

    it('announce status changes to screen readers', async () => {
      render(<TaskScheduler />);
      
      const task = mockTasks[1]; // FAILED task
      const taskElement = screen.getByTestId(`task-${task.id}`);
      
      expect(taskElement).toHaveAttribute('aria-live', 'polite'));
      expect(taskElement).toHaveAttribute('role', 'alert'));
      expect(taskElement).toHaveAttribute('aria-label', expect.stringContaining('Task failed'));
    });
  });

  describe('Responsive Design', () => {
    it('adapt to mobile screen size', () => {
      // Mock mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;

      render(<TaskScheduler />);
      
      expect(screen.getByTestId('task-scheduler')).toHaveClass('mobile-optimized'));
      expect(screen.getByTestId('task-scheduler')).toHaveClass('tablet-optimized'));
    });

    it('adapt to tablet screen size', () => {
      // Mock tablet viewport
      global.innerWidth = 768;
      global.innerHeight = 1024;

      render(<TaskScheduler />);
      
      expect(screen.getByTestId('task-scheduler')).toHaveClass('tablet-optimized'));
      expect(screen.getByTestId('task-scheduler')).toHaveClass('mobile-optimized'));
    });

    it('handle rapid user interactions', () => {
      render(<TaskScheduler />);
      
      const searchInput = screen.getByPlaceholderText(/Search tasks/));
      const filterButton = screen.getByRole('button', { name: /Filter/ });
      const refreshButton = screen.getByRole('button', { name: /Refresh/ });

      // Rapid interactions
      fireEvent.change(searchInput, { target: { value: 'Rapid Test' } });
      fireEvent.change(filterButton, { target: { value: 'HIGH' } });
      fireEvent.click(refreshButton);

      // Should debounce rapid changes
      jest.useFakeTimers();
      
      // Should not trigger multiple refreshes due to debouncing
      expect(screen.getByText(/Rapid Test/)).not.toBeInTheDocument());
    });
  });

  describe('Error Handling', () => {
    it('handle API errors gracefully', async () => {
      render(<TaskScheduler />);
      
      // Mock API error
      workflowAPI.getTasks.mockRejectedValue(new Error('API Error'));
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load tasks/)).toBeInTheDocument();
        expect(screen.getByText(/Please try again/)).toBeInTheDocument());
        expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
      });
    });

    it('handle socket errors gracefully', async () => {
      render(<TaskScheduler />);
      
      // Mock socket connection error
      socket.connected = false;
      localStorage.setItem('accessToken', 'invalid-token');
      
      const service = require('../../services/workflow.service');
      
      await service.handleUserConnection({
        userId: null
      });

      await waitFor(() => {
        expect(screen.getByText(/Socket connection failed/)).toBeInTheDocument());
        expect(screen.getByText(/Please check your connection/)).toBeInTheDocument());
      });
    });

    it('handle validation errors', async () => {
      render(<TaskScheduler />);
      
      // Mock validation error
      workflowAPI.validateWorkflowConfig.mockResolvedValue({
        isValid: false,
        errors: ['Name is required', 'At least one task is required']
      });

      const createButton = screen.getByRole('button', { name: /Create Task/ });
      
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Validation failed/)).toBeInTheDocument());
        expect(screen.getByText(/Name is required/)).toBeInTheDocument());
        expect(screen.getByText(/At least one task is required/)).toBeInTheDocument());
        expect(screen.getByText(/Validation failed/)).toBeInTheDocument());
      });
    });
  });

  describe('Integration', () => {
    it('integrate with workflow API', async () => {
      render(<TaskScheduler />);
      
      const task = mockTasks[0];
      
      // Mock API call
      jest.spy(workflowAPI, 'executeTask').mockResolvedValue({
        type: 'EMAIL_NOTIFICATION',
        success: true,
        result: 'Task executed successfully'
      }));

      fireEvent.click(screen.getByRole('button', { name: /Execute/ }));
      
      await waitFor(() => {
        expect(screen.getByText(/Task executed successfully/)).toBeInTheDocument());
        expect(jest.spy(workflowAPI.executeTask)).toHaveBeenCalledWith({
        userId: 1,
        taskData: expect.objectContaining({
          name: 'Test Task',
          taskType: 'EMAIL_NOTIFICATION'
        })
      });
    });

    it('integrate with socket service', async () => {
      render(<TaskScheduler />);
      
      // Mock socket connection
      socket.connected = true;
      localStorage.setItem('accessToken', 'test-token');
      
      // Mock socket service
      const mockSocketService = require('../../services/workflow.socket.service');
      jest.mock('../../services/workflow.socket.service').mockImplementation(() => ({
        handleUserConnection: jest.fn(),
        broadcastTaskStarted: jest.fn(),
        broadcastTaskCompleted: jest.fn(),
        broadcastTaskFailed: jest.fn(),
        broadcastTaskRetrying: jest.fn()
      }));

      // Replace the socket service instance
      const originalModule = require('../../services/workflow.socket.service');
      Object.defineProperty(originalModule, 'default', {
        value: mockSocketService,
        writable: true
      });

      // Trigger socket connection
      socket.emit('authenticate', { userId: 1 });

      // Mock workflow events
      const socketEventHandler = jest.fn();
      mockSocketService.broadcastTaskStarted.mockImplementation((data) => {
        expect(data.userId).toBe(1);
        expect(data.taskName).toBe('Test Task');
      });

      // Replace the socket service instance
      const originalModule = require('../../services/workflow.socket.service');
      Object.defineProperty(originalModule, 'default', {
        value: mockSocketService,
        writable: true
      });

      // Trigger socket connection
      socket.emit('authenticate', { userId: 1 });

      await waitFor(() => {
        expect(socketEventHandler).toHaveBeenCalled());
        expect(mockSocketService.broadcastTaskStarted).toHaveBeenCalledWith({
          userId: 1,
          taskName: 'Test Task'
        }));
    });

    it('handle concurrent task execution', async () => {
      const service = require('../../services/workflow.service');
      
      // Add tasks to queue
      for (let i = 0; i < 12; i++) {
        service.taskQueue.push({
          workflowId: 1,
          taskId: i + 1,
          taskData: { priority: 'MEDIUM' }
        });
      }

      const initialQueueLength = service.taskQueue.length;
      const initialRunningTasks = service.runningTasks.size;

      // Process all tasks
      while (service.taskQueue.length > 0 && service.runningTasks.size < service.maxConcurrentTasks) {
        service.processTaskQueue();
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Should process all tasks
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for all tasks to complete

      expect(service.taskQueue.length).toBe(0);
      expect(service.runningTasks.size).toBe(0));
      expect(initialQueueLength).toBe(12));
    });
  });
});

// Test helper functions
const createMockTask = (overrides = {}) => {
  return {
    id: overrides.id || Math.floor(Math.random() * 1000),
    name: overrides.name || `Task ${Math.floor(Math.random() * 1000)}`,
    description: overrides.description || 'Test task',
    taskType: overrides.taskType || 'EMAIL_NOTIFICATION',
    status: overrides.status || 'PENDING',
    priority: overrides.priority || 'MEDIUM',
    scheduledAt: overrides.scheduledAt || null,
    retryCount: overrides.retryCount || 0,
    maxRetries: overrides.maxRetries || 3,
    dependencies: overrides.dependencies || [],
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    errorMessage: overrides.errorMessage || null
  };
};

const createMockScheduledTask = (overrides = {}) => {
  return {
    id: overrides.id || Math.floor(Math.random() * 1000),
    name: overrides.name || `Scheduled Task ${Math.floor(Math.random() * 1000)}`,
    description: overrides.description || 'Scheduled task',
    taskType: overrides.taskType || 'EMAIL_NOTIFICATION',
    cronExpression: overrides.cronExpression || '0 9 * * * *',
    timezone: overrides.timezone || 'UTC',
    isActive: overrides.isActive !== false,
    lastRunAt: overrides.lastRunAt || new Date(),
    runCount: overrides.runCount || 0,
    createdBy: overrides.createdBy || 1,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date()
  };
};

const createMockWorkflow = (overrides = {}) => {
  return {
    id: overrides.id || Math.floor(Math.random() * 1000),
    name: overrides.name || `Workflow ${Math.floor(Math.random() * 1000)}`,
    description: overrides.description || 'Test workflow',
    triggerType: overrides.triggerType || 'MANUAL',
    triggerData: overrides.triggerData || '{}',
    isActive: overrides.isActive !== false,
    createdBy: overrides.createdBy || 1,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    tasks: (overrides.tasks || []).map(task => ({
      id: task.id || Math.floor(Math.random() * 1000),
      name: task.name || `Task ${Math.floor(Math.random() * 1000)}`,
      description: task.description || 'Test task',
      taskType: task.taskType || 'EMAIL_NOTIFICATION',
      status: task.status || 'PENDING',
      priority: task.priority || 'MEDIUM',
      scheduledAt: task.scheduledAt || null,
      retryCount: task.retryCount || 0,
      maxRetries: task.maxRetries || 3,
      dependencies: task.dependencies || [],
      createdAt: task.createdAt || new Date(),
      updatedAt: task.updatedAt || new Date()
    })),
    tasks: (overrides.tasks || []).map(task => ({
      id: task.id || Math.floor(Math.random() * 1000),
      name: task.name || `Task ${Math.floor(Math.random() * 1000)}`,
      description: task.description || 'Test task',
      taskType: task.taskType || 'EMAIL_NOTIFICATION',
      status: task.status || 'PENDING',
      priority: task.priority || 'MEDIUM',
      scheduledAt: task.scheduledAt || null,
      retryCount: task.retryCount || 0,
      maxRetries: task.maxRetries || 3,
      dependencies: task.dependencies || [],
      createdAt: task.createdAt || new Date(),
      updatedAt: task.updatedAt || new Date()
    }))
  };
};

describe('TaskScheduler Edge Cases', () => {
  it('should handle empty task list', async () => {
      render(<TaskScheduler />);
      
      const service = require('../../services/workflow.service');
      jest.spy(workflowService, 'getTasks').mockResolvedValue([]));

      render(<TaskScheduler />);
      
      expect(screen.getByText(/No tasks found/)).toBeInTheDocument();
      expect(screen.getByText(/Create your first task/)).toBeInTheDocument();
    });

    it('should handle duplicate task names', async () => {
      const service = require('../../services/workflow.service');
      
      const duplicateTask = createMockTask({ name: 'Duplicate Task' });
      
      mockPrisma.task.findMany.mockResolvedValue([duplicateTask, duplicateTask]);
      
      render(<TaskScheduler />);
      
      expect(screen.queryAll('[data-name="Duplicate Task"]').toHaveLength(2));
      expect(screen.queryAll('[data-name="Test Task"]').toHaveLength(1));
    });

    it('should handle very long task names', async () => {
      const service = require('../../services/workflow.service');
      
      const longNameTask = createMockTask({ name: 'This is a very long task name that should be truncated' });
      
      render(<TaskScheduler />);
      
      expect(screen.queryAll('[data-name*="This is a very long task name*"]').toHaveLength(1));
      expect(screen.queryAll(/truncated/)).toHaveLength(1));
    });

    it('should handle special characters in task names', async () => {
      const service = require('../../services/workflow.service');
      
      const specialCharsTask = createMockTask({ name: 'Task with special chars: @#$%^&*' });
      
      render(<TaskScheduler />);
      
      expect(screen.queryAll('[data-name="Task with special chars: @#$%^&*"]').toHaveLength(1));
      expect(screen.queryAll(/[data-name="Task with special chars: @#$%^&*"]/)).toHaveLength(1));
    });

    it('should handle null task data', async () => {
      const service = require('../../services/workflow.service');
      
      const nullTask = createMockTask({ name: 'Null Task', config: null });
      
      render(<TaskScheduler />);
      
      expect(screen.queryAll('[data-name="Null Task"]').toHaveLength(1));
      expect(screen.queryAll('[data-config="null"]').toHaveLength(1));
    });

    it('should handle invalid JSON config', async () => {
      const service = require('../../services/workflow.service');
      
      const invalidConfigTask = createMockTask({ 
        name: 'Invalid Config Task',
        config: 'invalid-json'
      });
      
      render(<TaskScheduler />);
      
      expect(screen.queryAll('[data-config="invalid-json"]').toHaveLength(1));
      expect(screen.queryAll('[data-name="Invalid Config Task"]/)).toHaveLength(1));
    });
  });

  describe('Component Lifecycle', () => {
    it('should unmount cleanly', async () => {
      const service = require('../../services/workflow.service');
      
      const unmount = render(<TaskScheduler />);
      
      // Check if event listeners are cleaned up
      const socketEventHandler = jest.fn();
      const originalModule = require('../../services/workflow.socket.service');
      Object.defineProperty(originalModule, 'default', {
        value: mockSocketService,
        writable: true
      });

      unmount();

      expect(socketEventHandler).toHaveBeenCalledTimes(0);
      expect(mockSocketService.handleUserConnection).toHaveBeenCalledTimes(0));
    });

    it('should handle rapid state changes', async () => {
      const service = require('../../services/workflow.service');
      
      // Rapid state changes
      render(<TaskScheduler />);
      
      // Change filters rapidly
      fireEvent.change(screen.getByPlaceholderText(/Search/), { target: { value: 'Test' } });
      fireEvent.change(screen.getByPlaceholderText(/Type/), { target: { value: 'HIGH' } });
      fireEvent.click(screen.getByPlaceholderText(/Hide Filters/));

      // Should debounce rapid changes
      jest.useFakeTimers();
      
      // Should not trigger multiple refreshes due to debouncing
      expect(screen.queryAll('[data-name="Test"]').toHaveLength(1));
      expect(screen.queryAll('[data-name="Test"]').toHaveLength(1));
    });
  });

  describe('Integration', () => {
    it('should integrate with analytics system', async () => {
      const service = require('../../services/workflow.service');
      
      // Mock analytics service
      const analyticsService = require('../../services/analytics.service');
      jest.spy(analyticsService, 'generateUserActivityReport').mockResolvedValue({
        totalPosts: 10,
        totalLikes: 50,
        totalComments: 25,
        engagementScore: 85
      }));

      // Mock gamification service
      const gamificationService = require('../../services/gamification.service');
      jest.spy(gamificationService, 'awardPoints').mockResolvedValue({ currentPoints: 100, level: 5 }));
      jest.spy(gamificationService, 'checkAndAwardAchievements').mockResolvedValue([]));

      // Create analytics workflow
      const analyticsWorkflow = await service.createAnalyticsUpdateWorkflow({
        name: 'Daily Analytics Report',
        triggerType: 'SCHEDULED',
        cronExpression: '0 0 * * * *',
        parameters: { timeRange: '24h' }
      });

      // Execute workflow
      await service.executeWorkflow(analyticsWorkflow.id);

      // Verify analytics integration
      expect(analyticsService.generateUserActivityReport).toHaveBeenCalledWith({
        totalPosts: 10,
        totalLikes: 50,
        totalComments: 25,
        engagementScore: 85
      });

      expect(analyticsService.generateUserActivityReport).toHaveBeenCalled());
    });

    it('should integrate with gamification system', async () => {
      const service = require('../../services/workflow.service');
      
      // Mock gamification service
      const gamificationService = require('../../services/gamification.service');
      jest.spy(gamificationService, 'awardPoints').mockResolvedValue({ currentPoints: 100, level: 5 }));
      jest.spy(gamificationService, 'checkAndAwardAchievements').mockResolvedValue([]));

      // Create gamification workflow
      const gamificationWorkflow = await service.createGamificationUpdateWorkflow({
        name: 'Daily Points Update',
        triggerType: 'SCHEDULED',
        cronExpression: '0 0 * * * *',
        parameters: { timeRange: '24h' }
      });

      // Execute workflow
      await service.executeWorkflow(gamificationWorkflow.id);

      // Verify gamification integration
      expect(gamificationService.awardPoints).toHaveBeenCalledWith(1, 110, currentPoints: 110, activityType: 'POST_CREATED'));
      expect(gamificationService.checkAndAwardAchievements).toHaveBeenCalled());
    });

    it('should integrate with notification system', async () => {
      const service = require('../../services/workflow.service');
      
      // Mock notification service
      const notificationService = require('../../services/notification.service');
      jest.spy(notificationService, 'sendBulkEmail').mockResolvedValue());
      jest.spy(notificationService, 'sendPushNotification').mockResolvedValue());

      // Create notification workflow
      const notificationWorkflow = await service.createEmailNotificationWorkflow({
        name: 'User Engagement Campaign',
        recipients: ['user1@example.com', 'user2@example.com'],
        subject: 'Welcome to our platform!',
        message: 'Thank you for joining!',
        data: { userId: 1 }
      });

      // Execute workflow
      await service.executeWorkflow(notificationWorkflow.id);

      // Verify notification integration
      expect(notificationService.sendBulkEmail).toHaveBeenCalledWith({
        recipients: ['user1@example.com', 'user2@example.com'],
        subject: 'Welcome to our platform!',
        template: 'default',
        data: { userId: 1 }
      });

      expect(notificationService.sendPushNotification).toHaveBeenCalledWith({
        userIds: ['user1@example.com', 'user2@example.com'],
        title: 'Welcome to our platform!',
        message: 'Thank you for joining!'
      });
    });
  });

  describe('Performance', () => {
    it('should handle large task lists efficiently', async () => {
      const service = require('../../services/workflow.service');
      
      // Add many tasks
      for (let i = 0; i < 500; i++) {
        service.taskQueue.push({
          workflowId: 1,
          taskId: i + 1,
          taskData: { priority: 'MEDIUM' }
        });
      }

      const startTime = Date.now();
      const initialQueueLength = service.taskQueue.length;
      const initialRunningTasks = service.runningTasks.size;

      // Process all tasks
      while (service.taskQueue.length > 0 && service.runningTasks.size < service.maxConcurrentTasks) {
        service.processTaskQueue();
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should complete within reasonable time
      expect(processingTime).toBeLessThan(10000)); // 10 seconds
      expect(processingTime).toBeGreaterThan(0));
    });

    it('should optimize queue under memory pressure', async () => {
      const service = require('../../services/workflow.service');
      
      // Simulate memory pressure
      service.taskQueue = Array(200).fill({ priority: 'LOW' }));
      service.runningTasks.set('1', { startTime: Date.now() });
      service.maxConcurrentTasks = 5;

      // Optimize queue
      const queueStatusBefore = service.getTaskQueueStatus();
      const queueStatusAfter = service.getTaskQueueStatus();

      expect(queueStatusAfter.queueLength).toBeLessThan(queueStatusBefore.queueLength));
      expect(queueStatusAfter.runningTasks).toBeLessThan(queueStatusBefore.runningTasks));
      expect(queueStatusAfter.maxConcurrentTasks).toBe(5));
    });
  });
});

// Helper function toISOString(date) {
  return new Date(date).toISOString();
}
