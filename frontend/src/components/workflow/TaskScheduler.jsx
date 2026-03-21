import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Play, Pause, Trash2, Edit, Plus, AlertCircle, CheckCircle, XCircle, RefreshCw, Filter, Search } from 'lucide-react';
import { workflowAPI } from '../../services/workflowAPI';
import socket from '../../services/socket';

const TaskScheduler = ({ className = '' }) => {
  const [tasks, setTasks] = useState([]);
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const currentUserId = localStorage.getItem('userId');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    taskType: 'EMAIL_NOTIFICATION',
    config: {},
    priority: 'MEDIUM',
    scheduledAt: null,
    dependencies: [],
    maxRetries: 3
  });

  const [scheduledFormData, setScheduledFormData] = useState({
    name: '',
    description: '',
    taskType: 'EMAIL_NOTIFICATION',
    config: {},
    cronExpression: '',
    timezone: 'UTC',
    isActive: true
  });

  // Task types and options
  const taskTypes = [
    { value: 'EMAIL_NOTIFICATION', label: 'Email Notification', icon: '📧' },
    { value: 'PUSH_NOTIFICATION', label: 'Push Notification', icon: '🔔' },
    { value: 'DATA_PROCESSING', label: 'Data Processing', icon: '🔄' },
    { value: 'REPORT_GENERATION', label: 'Report Generation', icon: '📊' },
    { value: 'CLEANUP_TASK', label: 'Cleanup Task', icon: '🧹' },
    { value: 'ANALYTICS_UPDATE', label: 'Analytics Update', icon: '📈' },
    { value: 'GAMIFICATION_UPDATE', label: 'Gamification Update', icon: '🎮' },
    { value: 'USER_ENGAGEMENT', label: 'User Engagement', icon: '👥' },
    { value: 'SYSTEM_MAINTENANCE', label: 'System Maintenance', icon: '⚙️' },
    { value: 'CUSTOM_ACTION', label: 'Custom Action', icon: '🔧' }
  ];

  const priorities = [
    { value: 'LOW', label: 'Low', color: 'text-gray-500' },
    { value: 'MEDIUM', label: 'Medium', color: 'text-blue-500' },
    { value: 'HIGH', label: 'High', color: 'text-orange-500' },
    { value: 'CRITICAL', label: 'Critical', color: 'text-red-500' }
  ];

  const statuses = [
    { value: 'all', label: 'All' },
    { value: 'PENDING', label: 'Pending', color: 'text-yellow-500' },
    { value: 'RUNNING', label: 'Running', color: 'text-blue-500' },
    { value: 'COMPLETED', label: 'Completed', color: 'text-green-500' },
    { value: 'FAILED', label: 'Failed', color: 'text-red-500' },
    { value: 'CANCELLED', label: 'Cancelled', color: 'text-gray-500' },
    { value: 'RETRYING', label: 'Retrying', color: 'text-orange-500' }
  ];

  useEffect(() => {
    fetchTasks();
    fetchScheduledTasks();
  }, []);

  useEffect(() => {
    if (!socket.connected) {
      const token = localStorage.getItem('accessToken');
      socket.connect(token);
    }

    socket.on('taskCreated', handleTaskCreated);
    socket.on('taskUpdated', handleTaskUpdated);
    socket.on('taskCompleted', handleTaskCompleted);
    socket.on('taskFailed', handleTaskFailed);
    socket.on('taskCancelled', handleTaskCancelled);
    socket.on('taskRetrying', handleTaskRetrying);

    return () => {
      socket.off('taskCreated', handleTaskCreated);
      socket.off('taskUpdated', handleTaskUpdated);
      socket.off('taskCompleted', handleTaskCompleted);
      socket.off('taskFailed', handleTaskFailed);
      socket.off('taskCancelled', handleTaskCancelled);
      socket.off('taskRetrying', handleTaskRetrying);
    };
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await workflowAPI.getTasks(currentUserId);
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduledTasks = async () => {
    try {
      const data = await workflowAPI.getScheduledTasks(currentUserId);
      setScheduledTasks(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTaskCreated = (data) => {
    setTasks(prev => [data, ...prev]);
  };

  const handleTaskUpdated = (data) => {
    setTasks(prev => prev.map(task => task.id === data.id ? data : task));
  };

  const handleTaskCompleted = (data) => {
    setTasks(prev => prev.map(task => task.id === data.taskId ? { ...task, status: 'COMPLETED', completedAt: new Date() } : task));
  };

  const handleTaskFailed = (data) => {
    setTasks(prev => prev.map(task => task.id === data.taskId ? { ...task, status: 'FAILED', failedAt: new Date() } : task));
  };

  const handleTaskCancelled = (data) => {
    setTasks(prev => prev.map(task => task.id === data.taskId ? { ...task, status: 'CANCELLED' } : task));
  };

  const handleTaskRetrying = (data) => {
    setTasks(prev => prev.map(task => task.id === data.taskId ? { ...task, status: 'RETRYING', retryCount: data.retryCount } : task));
  };

  const handleCreateTask = async () => {
    try {
      const workflowData = {
        name: formData.name,
        description: formData.description,
        triggerType: 'MANUAL',
        triggerData: JSON.stringify({}),
        tasks: [{
          name: formData.name,
          description: formData.description,
          taskType: formData.taskType,
          config: JSON.stringify(formData.config),
          priority: formData.priority,
          scheduledAt: formData.scheduledAt,
          dependencies: formData.dependencies,
          maxRetries: formData.maxRetries
        }]
      };

      await workflowAPI.createWorkflow(workflowData);
      setShowCreateModal(false);
      resetFormData();
      await fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateScheduledTask = async () => {
    try {
      await workflowAPI.createScheduledTask(scheduledFormData);
      setShowCreateModal(false);
      resetScheduledFormData();
      await fetchScheduledTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setFormData({
      name: task.name,
      description: task.description,
      taskType: task.taskType,
      config: JSON.parse(task.config || '{}'),
      priority: task.priority,
      scheduledAt: task.scheduledAt,
      dependencies: task.dependencies,
      maxRetries: task.maxRetries
    });
    setShowEditModal(true);
  };

  const handleUpdateTask = async () => {
    try {
      await workflowAPI.updateTask(selectedTask.id, formData);
      setShowEditModal(false);
      setSelectedTask(null);
      resetFormData();
      await fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await workflowAPI.deleteTask(taskId);
        await fetchTasks();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleExecuteTask = async (taskId) => {
    try {
      await workflowAPI.executeTask(taskId);
      await fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelTask = async (taskId) => {
    try {
      await workflowAPI.cancelTask(taskId);
      await fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchTasks(), fetchScheduledTasks()]);
    } finally {
      setRefreshing(false);
    }
  };

  const resetFormData = () => {
    setFormData({
      name: '',
      description: '',
      taskType: 'EMAIL_NOTIFICATION',
      config: {},
      priority: 'MEDIUM',
      scheduledAt: null,
      dependencies: [],
      maxRetries: 3
    });
  };

  const resetScheduledFormData = () => {
    setScheduledFormData({
      name: '',
      description: '',
      taskType: 'EMAIL_NOTIFICATION',
      config: {},
      cronExpression: '',
      timezone: 'UTC',
      isActive: true
    });
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesType = filterType === 'all' || task.taskType === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'RUNNING': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'FAILED': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'CANCELLED': return <AlertCircle className="w-4 h-4 text-gray-500" />;
      case 'RETRYING': return <RefreshCw className="w-4 h-4 text-orange-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    const priorityObj = priorities.find(p => p.value === priority);
    return priorityObj ? priorityObj.color : 'text-gray-500';
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleString();
  };

  const getNextRunTime = (cronExpression) => {
    // Simple cron parsing for display (in production, use a proper cron library)
    if (!cronExpression) return 'Not scheduled';
    return `Next: ${cronExpression}`;
  };

  return (
    <div className={`task-scheduler ${className}`}>
      <div className="task-scheduler-header">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Task Scheduler</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create Task
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {statuses.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  {taskTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Tasks */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Active Tasks</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {filteredTasks.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No tasks found
                </div>
              ) : (
                filteredTasks.map(task => (
                  <div key={task.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(task.status)}
                        <div>
                          <h4 className="font-medium text-gray-900">{task.name}</h4>
                          <p className="text-sm text-gray-500">{task.description}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            <span className="text-xs text-gray-500">
                              {taskTypes.find(t => t.value === task.taskType)?.icon} {task.taskType}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDateTime(task.scheduledAt)}
                            </span>
                            {task.retryCount > 0 && (
                              <span className="text-xs text-orange-500">
                                Retry {task.retryCount}/{task.maxRetries}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.status === 'PENDING' && (
                          <button
                            onClick={() => handleExecuteTask(task.id)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Execute"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {task.status === 'RUNNING' && (
                          <button
                            onClick={() => handleCancelTask(task.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Cancel"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditTask(task)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Scheduled Tasks */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Scheduled Tasks</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {scheduledTasks.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No scheduled tasks found
                </div>
              ) : (
                scheduledTasks.map(task => (
                  <div key={task.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <div>
                          <h4 className="font-medium text-gray-900">{task.name}</h4>
                          <p className="text-sm text-gray-500">{task.description}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-gray-500">
                              {taskTypes.find(t => t.value === task.taskType)?.icon} {task.taskType}
                            </span>
                            <span className="text-xs text-gray-500">
                              {getNextRunTime(task.cronExpression)}
                            </span>
                            <span className="text-xs text-gray-500">
                              Runs: {task.runCount}
                            </span>
                            <span className={`text-xs font-medium ${task.isActive ? 'text-green-500' : 'text-gray-500'}`}>
                              {task.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => workflowAPI.executeScheduledTask(task.id)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Execute Now"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setScheduledFormData({
                              name: task.name,
                              description: task.description,
                              taskType: task.taskType,
                              config: JSON.parse(task.config || '{}'),
                              cronExpression: task.cronExpression,
                              timezone: task.timezone,
                              isActive: task.isActive
                            });
                            setShowEditModal(true);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => workflowAPI.deleteScheduledTask(task.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {showEditModal ? 'Edit Task' : 'Create New Task'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
                <select
                  value={formData.taskType}
                  onChange={(e) => setFormData({...formData, taskType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {taskTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {priorities.map(priority => (
                    <option key={priority.value} value={priority.value}>{priority.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled At</label>
                <input
                  type="datetime-local"
                  value={formData.scheduledAt ? new Date(formData.scheduledAt).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({...formData, scheduledAt: e.target.value ? new Date(e.target.value) : null})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Retries</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.maxRetries}
                  onChange={(e) => setFormData({...formData, maxRetries: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Configuration (JSON)</label>
                <textarea
                  value={JSON.stringify(formData.config, null, 2)}
                  onChange={(e) => {
                    try {
                      const config = JSON.parse(e.target.value);
                      setFormData({...formData, config});
                    } catch (err) {
                      // Invalid JSON, don't update
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={6}
                  placeholder='{"key": "value"}'
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  resetFormData();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={showEditModal ? handleUpdateTask : handleCreateTask}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {showEditModal ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskScheduler;
