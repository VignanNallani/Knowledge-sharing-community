import React, { useState, useEffect } from 'react';
import { Flag, AlertTriangle, MessageSquare, Search, Filter, Download, RefreshCw } from 'lucide-react';
import apiService from '../../services/api';

const ReportForm = ({ onSubmit, onCancel, initialData = null }) => {
  const [formData, setFormData] = useState({
    reportedUserId: '',
    reportedPostId: '',
    reportedCommentId: '',
    severity: 'MEDIUM',
    flagType: 'SPAM',
    reason: '',
    description: '',
    evidenceUrls: ['']
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [comments, setComments] = useState([]);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
    fetchPosts();
    fetchUsers();
  }, [initialData]);

  const fetchPosts = async () => {
    try {
      const response = await apiService.client.get('/posts');
      const data = response.data;
      setPosts(data.data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await apiService.client.get('/users');
      const data = response.data;
      setUsers(data.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const method = initialData ? 'PATCH' : 'POST';
      const url = initialData ? `/moderation/reports/${initialData.id}` : '/moderation/reports';
      
      const response = await apiService.client[method.toLowerCase()](url, {
        reportedUserId: formData.reportedUserId,
        reportedPostId: formData.reportedPostId,
        reportedCommentId: formData.reportedCommentId,
        severity: formData.severity,
        flagType: formData.flagType,
        reason: formData.reason,
        description: formData.description,
        evidenceUrls: formData.evidenceUrls.filter(url => url.trim() !== '')
      });
      
      const data = response.data;
      if (data.success) {
        onSubmit(data.data.report);
      } else {
        setError(data.message || 'Failed to submit report');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEvidenceUrlChange = (index, value) => {
    const newUrls = [...formData.evidenceUrls];
    newUrls[index] = value;
    setFormData(prev => ({ ...prev, evidenceUrls: newUrls }));
  };

  const addEvidenceUrl = () => {
    setFormData(prev => ({ ...prev, evidenceUrls: [...prev.evidenceUrls, ''] }));
  };

  const removeEvidenceUrl = (index) => {
    const newUrls = formData.evidenceUrls.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, evidenceUrls: newUrls }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {initialData ? 'Edit Report' : 'Create Report'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Target Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What are you reporting? <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">User</label>
                <select
                  value={formData.reportedUserId}
                  onChange={(e) => setFormData(prev => ({ ...prev, reportedUserId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select user...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-gray-600 mb-1">Post</label>
                <select
                  value={formData.reportedPostId}
                  onChange={(e) => setFormData(prev => ({ ...prev, reportedPostId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select post...</option>
                  {posts.map(post => (
                    <option key={post.id} value={post.id}>{post.title}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-gray-600 mb-1">Comment</label>
                <input
                  type="text"
                  value={formData.reportedCommentId}
                  onChange={(e) => setFormData(prev => ({ ...prev, reportedCommentId: e.target.value }))}
                  placeholder="Enter comment ID..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">Select at least one target</p>
          </div>

          {/* Flag Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.flagType}
              onChange={(e) => setFormData(prev => ({ ...prev, flagType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="SPAM">Spam</option>
              <option value="INAPPROPRIATE">Inappropriate Content</option>
              <option value="HARASSMENT">Harassment</option>
              <option value="MISINFORMATION">Misinformation</option>
              <option value="VIOLENCE">Violence</option>
              <option value="COPYRIGHT">Copyright Violation</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(severity => (
                <button
                  key={severity}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, severity }))}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    formData.severity === severity
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {severity}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief reason for reporting..."
              required
              minLength={10}
              maxLength={500}
            />
            <p className="text-xs text-gray-500">10-500 characters</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Detailed Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Provide additional details and context..."
              maxLength={2000}
            />
            <p className="text-xs text-gray-500">Maximum 2000 characters</p>
          </div>

          {/* Evidence URLs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supporting Evidence
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Add links to screenshots, documents, or other evidence (optional)
            </p>
            
            {formData.evidenceUrls.map((url, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <div className="flex-1 relative">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handleEvidenceUrlChange(index, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/evidence.jpg"
                  />
                </div>
                {formData.evidenceUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEvidenceUrl(index)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            
            {formData.evidenceUrls.length < 5 && (
              <button
                type="button"
                onClick={addEvidenceUrl}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Add Evidence URL
              </button>
            )}
          </div>

          {/* Guidelines */}
          <div className="p-4 bg-blue-50 rounded-md">
            <h3 className="font-medium text-blue-900 mb-2">Reporting Guidelines</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Only report genuine violations</li>
              <li>• Provide specific and accurate information</li>
              <li>• Include evidence when possible</li>
              <li>• Avoid submitting duplicate reports</li>
              <li>• Be respectful and professional</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.reason || (!formData.reportedUserId && !formData.reportedPostId && !formData.reportedCommentId)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                'Submit Report'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ReportsList = ({ filters, onFilterChange, onReportSelect }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  useEffect(() => {
    fetchReports();
  }, [filters, pagination.page]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        status: filters.status,
        severity: filters.severity,
        flagType: filters.flagType
      });
      
      const response = await apiService.client.get(`/moderation/reports?${queryParams}`);
      const data = response.data;
      setReports(data.data || []);
      setPagination(prev => ({ ...prev, total: data.total || 0 }));
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'LOW': return 'bg-gray-100 text-gray-700';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
      case 'HIGH': return 'bg-orange-100 text-orange-700';
      case 'CRITICAL': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-blue-100 text-blue-700';
      case 'UNDER_REVIEW': return 'bg-purple-100 text-purple-700';
      case 'RESOLVED': return 'bg-green-100 text-green-700';
      case 'DISMISSED': return 'bg-gray-100 text-gray-700';
      case 'ESCALATED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2 flex-1 min-w-64">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={filters.search || ''}
              onChange={(e) => onFilterChange('search', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filters.status || ''}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
            <option value="ESCALATED">Escalated</option>
          </select>
          
          <select
            value={filters.severity || ''}
            onChange={(e) => onFilterChange('severity', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Severity</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          
          <button
            onClick={fetchReports}
            className="p-2 text-gray-600 hover:text-gray-900"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {reports.map((report) => (
          <div
            key={report.id}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onReportSelect(report)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(report.severity)}`}>
                    {report.severity}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                    {report.status}
                  </span>
                  <span className="text-sm text-gray-600">{report.flagType.replace('_', ' ')}</span>
                </div>
                
                <p className="text-gray-900 font-medium mb-1">{report.reason}</p>
                {report.description && (
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">{report.description}</p>
                )}
                
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  {report.reportedUser && (
                    <span>User: {report.reportedUser.name}</span>
                  )}
                  {report.reportedPost && (
                    <span>Post: {report.reportedPost.title}</span>
                  )}
                  <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                {report.autoGenerated && (
                  <span className="bg-purple-100 text-purple-700 px-2 py-1 text-xs rounded-full">
                    Auto
                  </span>
                )}
                {report.isDuplicate && (
                  <span className="bg-orange-100 text-orange-700 px-2 py-1 text-xs rounded-full">
                    Duplicate
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {reports.length === 0 && (
        <div className="text-center py-12">
          <Flag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
          <p className="text-gray-500">Try adjusting your filters or check back later.</p>
        </div>
      )}

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export { ReportForm, ReportsList };
