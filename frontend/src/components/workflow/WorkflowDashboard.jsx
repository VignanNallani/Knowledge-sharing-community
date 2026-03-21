import React, { useState, useEffect } from 'react';
import { Activity, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, Calendar, Filter, Search, RefreshCw, Play, Pause, BarChart3, Users, Target, Zap, Settings } from 'lucide-react';
import { workflowAPI } from '../../services/workflowAPI';
import socket from '../../services/socket';

const WorkflowDashboard = ({ className = '' }) => {
  const [workflows, setWorkflows] = useState([]);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTriggerType, setFilterTriggerType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('workflows');
  const [timeRange, setTimeRange] = useState('7d');

  const currentUserId = localStorage.getItem('userId');

  // Time ranges for analytics
  const timeRanges = [
    { value: '1d', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' }
  ];

  const triggerTypes = [
    { value: 'all', label: 'All Triggers' },
    { value: 'MANUAL', label: 'Manual', icon: '👆' },
    { value: 'EVENT_BASED', label: 'Event Based', icon: '⚡' },
    { value: 'SCHEDULED', label: 'Scheduled', icon: '📅' },
    { value: 'CONDITIONAL', label: 'Conditional', icon: '🔀' },
    { value: 'WEBHOOK', label: 'Webhook', icon: '🔗' }
  ];

  const statuses = [
    { value: 'all', label: 'All Status' },
    { value: 'PENDING', label: 'Pending', color: 'text-yellow-500' },
    { value: 'RUNNING', label: 'Running', color: 'text-blue-500' },
    { value: 'COMPLETED', label: 'Completed', color: 'text-green-500' },
    { value: 'FAILED', label: 'Failed', color: 'text-red-500' },
    { value: 'CANCELLED', label: 'Cancelled', color: 'text-gray-500' }
  ];

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  useEffect(() => {
    if (!socket.connected) {
      const token = localStorage.getItem('accessToken');
      socket.connect(token);
    }

    socket.on('workflowCreated', handleWorkflowCreated);
    socket.on('workflowUpdated', handleWorkflowUpdated);
    socket.on('workflowDeleted', handleWorkflowDeleted);
    socket.on('workflowExecutionStarted', handleWorkflowExecutionStarted);
    socket.on('workflowCompleted', handleWorkflowCompleted);
    socket.on('workflowFailed', handleWorkflowFailed);
    socket.on('taskStarted', handleTaskStarted);
    socket.on('taskCompleted', handleTaskCompleted);
    socket.on('taskFailed', handleTaskFailed);
    socket.on('workflowLog', handleWorkflowLog);

    return () => {
      socket.off('workflowCreated', handleWorkflowCreated);
      socket.off('workflowUpdated', handleWorkflowUpdated);
      socket.off('workflowDeleted', handleWorkflowDeleted);
      socket.off('workflowExecutionStarted', handleWorkflowExecutionStarted);
      socket.off('workflowCompleted', handleWorkflowCompleted);
      socket.off('workflowFailed', handleWorkflowFailed);
      socket.off('taskStarted', handleTaskStarted);
      socket.off('taskCompleted', handleTaskCompleted);
      socket.off('taskFailed', handleTaskFailed);
      socket.off('workflowLog', handleWorkflowLog);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [workflowsData, statsData] = await Promise.all([
        workflowAPI.getWorkflows(currentUserId),
        workflowAPI.getWorkflowStats(currentUserId)
      ]);

      setWorkflows(workflowsData);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (workflowId) => {
    try {
      const logsData = await workflowAPI.getWorkflowLogs(workflowId, {
        limit: 100
      });
      setLogs(logsData);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleWorkflowCreated = (data) => {
    setWorkflows(prev => [data, ...prev]);
    if (stats) {
      setStats(prev => ({
        ...prev,
        totalWorkflows: prev.totalWorkflows + 1
      }));
    }
  };

  const handleWorkflowUpdated = (data) => {
    setWorkflows(prev => prev.map(w => w.id === data.id ? data : w));
  };

  const handleWorkflowDeleted = (data) => {
    setWorkflows(prev => prev.filter(w => w.id !== data.workflowId));
    if (stats) {
      setStats(prev => ({
        ...prev,
        totalWorkflows: prev.totalWorkflows - 1
      }));
    }
  };

  const handleWorkflowExecutionStarted = (data) => {
    setWorkflows(prev => prev.map(w => 
      w.id === data.workflowId 
        ? { ...w, status: 'RUNNING', lastExecution: new Date() }
        : w
    ));
  };

  const handleWorkflowCompleted = (data) => {
    setWorkflows(prev => prev.map(w => 
      w.id === data.workflowId 
        ? { ...w, status: 'COMPLETED', lastExecution: new Date() }
        : w
    ));
    if (stats) {
      setStats(prev => ({
        ...prev,
        completedWorkflows: prev.completedWorkflows + 1
      }));
    }
  };

  const handleWorkflowFailed = (data) => {
    setWorkflows(prev => prev.map(w => 
      w.id === data.workflowId 
        ? { ...w, status: 'FAILED', lastExecution: new Date() }
        : w
    ));
    if (stats) {
      setStats(prev => ({
        ...prev,
        failedWorkflows: prev.failedWorkflows + 1
      }));
    }
  };

  const handleTaskStarted = (data) => {
    if (selectedWorkflow && selectedWorkflow.id === data.workflowId) {
      fetchLogs(data.workflowId);
    }
  };

  const handleTaskCompleted = (data) => {
    if (selectedWorkflow && selectedWorkflow.id === data.workflowId) {
      fetchLogs(data.workflowId);
    }
  };

  const handleTaskFailed = (data) => {
    if (selectedWorkflow && selectedWorkflow.id === data.workflowId) {
      fetchLogs(data.workflowId);
    }
  };

  const handleWorkflowLog = (data) => {
    if (selectedWorkflow && selectedWorkflow.id === data.workflowId) {
      setLogs(prev => [data, ...prev].slice(0, 100));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
      if (selectedWorkflow) {
        await fetchLogs(selectedWorkflow.id);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleExecuteWorkflow = async (workflowId) => {
    try {
      await workflowAPI.executeWorkflow(workflowId);
      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelWorkflow = async (workflowId) => {
    try {
      await workflowAPI.cancelWorkflow(workflowId);
      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSelectWorkflow = async (workflow) => {
    setSelectedWorkflow(workflow);
    await fetchLogs(workflow.id);
    setActiveTab('logs');
  };

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         workflow.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTriggerType = filterTriggerType === 'all' || workflow.triggerType === filterTriggerType;
    return matchesSearch && matchesTriggerType;
  });

  const getStatusColor = (status) => {
    const statusObj = statuses.find(s => s.value === status);
    return statusObj ? statusObj.color : 'text-gray-500';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-4 h-4" />;
      case 'RUNNING': return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'COMPLETED': return <CheckCircle className="w-4 h-4" />;
      case 'FAILED': return <XCircle className="w-4 h-4" />;
      case 'CANCELLED': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getLogLevelColor = (level) => {
    switch (level) {
      case 'DEBUG': return 'text-gray-500';
      case 'INFO': return 'text-blue-500';
      case 'WARN': return 'text-yellow-500';
      case 'ERROR': return 'text-red-500';
      case 'FATAL': return 'text-red-700';
      default: return 'text-gray-500';
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.floor((end - start) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  return (
    <div className={`workflow-dashboard ${className}`}>
      <div className="workflow-dashboard-header">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Workflow Dashboard</h1>
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
                  placeholder="Search workflows..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Type</label>
                <select
                  value={filterTriggerType}
                  onChange={(e) => setFilterTriggerType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {triggerTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {timeRanges.map(range => (
                    <option key={range.value} value={range.value}>{range.label}</option>
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

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Workflows</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalWorkflows}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Workflows</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeWorkflows}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.successRate.toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Running Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{stats.runningTasks}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <RefreshCw className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {['workflows', 'logs', 'analytics'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'workflows' && <Activity className="inline w-4 h-4 mr-2" />}
                {tab === 'logs' && <Clock className="inline w-4 h-4 mr-2" />}
                {tab === 'analytics' && <BarChart3 className="inline w-4 h-4 mr-2" />}
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'workflows' && (
            <div>
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredWorkflows.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      No workflows found
                    </div>
                  ) : (
                    filteredWorkflows.map(workflow => (
                      <div key={workflow.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(workflow.status)}
                            <div>
                              <h3 className="font-medium text-gray-900">{workflow.name}</h3>
                              <p className="text-sm text-gray-500">{workflow.description}</p>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-xs text-gray-500">
                                  {triggerTypes.find(t => t.value === workflow.triggerType)?.icon} {workflow.triggerType}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {workflow.tasks?.length || 0} tasks
                                </span>
                                {workflow.lastExecution && (
                                  <span className="text-xs text-gray-500">
                                    Last: {formatDateTime(workflow.lastExecution)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSelectWorkflow(workflow)}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              View Details
                            </button>
                            {workflow.isActive && (
                              <button
                                onClick={() => handleExecuteWorkflow(workflow.id)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                title="Execute"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleCancelWorkflow(workflow.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Cancel"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div>
              {selectedWorkflow ? (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Logs for {selectedWorkflow.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedWorkflow.description}
                    </p>
                  </div>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {logs.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No logs available
                      </div>
                    ) : (
                      logs.map(log => (
                        <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                          <div className={`mt-1 ${getLogLevelColor(log.level)}`}>
                            {log.level === 'ERROR' && <XCircle className="w-4 h-4" />}
                            {log.level === 'WARN' && <AlertCircle className="w-4 h-4" />}
                            {log.level === 'INFO' && <CheckCircle className="w-4 h-4" />}
                            {log.level === 'DEBUG' && <Clock className="w-4 h-4" />}
                            {log.level === 'FATAL' && <XCircle className="w-4 h-4" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${getLogLevelColor(log.level)}`}>
                                {log.level}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDateTime(log.createdAt)}
                              </span>
                              {log.task && (
                                <span className="text-xs text-gray-500">
                                  Task: {log.task.name}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{log.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Select a workflow to view its logs
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              {stats ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Task Distribution</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Completed</span>
                            <span className="text-sm font-medium text-green-600">{stats.completedTasks}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Failed</span>
                            <span className="text-sm font-medium text-red-600">{stats.failedTasks}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Running</span>
                            <span className="text-sm font-medium text-blue-600">{stats.runningTasks}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Workflow Status</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Completed</span>
                            <span className="text-sm font-medium text-green-600">{stats.completedWorkflows}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Failed</span>
                            <span className="text-sm font-medium text-red-600">{stats.failedWorkflows}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Active</span>
                            <span className="text-sm font-medium text-blue-600">{stats.activeWorkflows}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Scheduled Tasks</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Active Scheduled Tasks</span>
                        <span className="text-sm font-medium text-purple-600">{stats.scheduledTasks}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Loading analytics...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowDashboard;
