import React, { useState, useEffect } from 'react';
import { AlertTriangle, User, MessageSquare, Clock, CheckCircle, XCircle, Shield, Ban, AlertCircle } from 'lucide-react';
import apiService from '../../services/api';

const ModerationCaseDetail = ({ caseId, onBack }) => {
  const [case_, setCase] = useState(null);
  const [reports, setReports] = useState([]);
  const [actions, setActions] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionForm, setActionForm] = useState({
    actionType: 'WARNING',
    actionDetails: '',
    targetUserId: '',
    targetContentType: '',
    targetContentId: '',
    durationDays: '',
    trustScoreChange: ''
  });

  useEffect(() => {
    fetchCaseDetails();
  }, [caseId]);

  const fetchCaseDetails = async () => {
    try {
      const [caseRes, reportsRes, actionsRes, appealsRes] = await Promise.all([
        apiService.client.get(`/moderation/cases/${caseId}`),
        apiService.client.get(`/moderation/reports?moderationCaseId=${caseId}`),
        apiService.client.get(`/moderation/cases/${caseId}/actions`),
        apiService.client.get(`/moderation/appeals?moderationCaseId=${caseId}`)
      ]);

      const caseData = caseRes.data;
      const reportsData = reportsRes.data;
      const actionsData = actionsRes.data;
      const appealsData = appealsRes.data;

      if (caseData.success) setCase(caseData.data.moderationCase);
      if (reportsData.success) setReports(reportsData.data.reports);
      if (actionsData.success) setActions(actionsData.data.actions);
      if (appealsData.success) setAppeals(appealsData.data.appeals);
    } catch (error) {
      console.error('Error fetching case details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeAction = async () => {
    try {
      const response = await apiService.client.post(`/moderation/cases/${caseId}/action`, actionForm);

      if (response.data.success) {
        setShowActionModal(false);
        setActionForm({
          actionType: 'WARNING',
          actionDetails: '',
          targetUserId: '',
          targetContentType: '',
          targetContentId: '',
          durationDays: '',
          trustScoreChange: ''
        });
        fetchCaseDetails(); // Refresh data
      }
    } catch (error) {
      console.error('Error taking action:', error);
    }
  };

  const handleResolveCase = async (resolutionNotes) => {
    try {
      const response = await apiService.client.post(`/moderation/cases/${caseId}/resolve`, { resolutionNotes });

      if (response.data.success) {
        fetchCaseDetails(); // Refresh data
      }
    } catch (error) {
      console.error('Error resolving case:', error);
    }
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'WARNING': return <AlertCircle className="w-4 h-4" />;
      case 'CONTENT_REMOVAL': return <XCircle className="w-4 h-4" />;
      case 'USER_SUSPENSION': return <Ban className="w-4 h-4" />;
      case 'USER_BAN': return <Shield className="w-4 h-4" />;
      case 'TRUST_DEDUCTION': return <AlertTriangle className="w-4 h-4" />;
      case 'ESCALATE': return <AlertTriangle className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getStateColor = (state) => {
    switch (state) {
      case 'OPEN': return 'bg-gray-100 text-gray-700';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-700';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-700';
      case 'PENDING_REVIEW': return 'bg-orange-100 text-orange-700';
      case 'RESOLVED': return 'bg-green-100 text-green-700';
      case 'CLOSED': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!case_) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Case not found</h3>
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800"
          >
            Go back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{case_.title}</h1>
                <p className="text-sm text-gray-500">{case_.caseNumber}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStateColor(case_.state)}`}>
                {case_.state.replace('_', ' ')}
              </span>
              {case_.state !== 'RESOLVED' && case_.state !== 'CLOSED' && (
                <>
                  <button
                    onClick={() => setShowActionModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Take Action
                  </button>
                  <button
                    onClick={() => {
                      const notes = prompt('Enter resolution notes:');
                      if (notes) handleResolveCase(notes);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Resolve Case
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Case Details */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Case Details</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Description</p>
                  <p className="text-gray-900">{case_.description || 'No description provided'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Priority</p>
                    <p className="text-gray-900 font-medium">{case_.priority}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="text-gray-900">{new Date(case_.createdAt).toLocaleDateString()}</p>
                  </div>
                  {case_.assignedModerator && (
                    <div>
                      <p className="text-sm text-gray-600">Assigned Moderator</p>
                      <p className="text-gray-900">{case_.assignedModerator.name}</p>
                    </div>
                  )}
                  {case_.resolvedAt && (
                    <div>
                      <p className="text-sm text-gray-600">Resolved</p>
                      <p className="text-gray-900">{new Date(case_.resolvedAt).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reports */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Reports ({reports.length})</h2>
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{report.flagType.replace('_', ' ')}</p>
                        <p className="text-sm text-gray-600">{report.reason}</p>
                        {report.description && (
                          <p className="text-sm text-gray-700 mt-1">{report.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">{report.severity}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions Taken ({actions.length})</h2>
              <div className="space-y-4">
                {actions.map((action) => (
                  <div key={action.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
                    <div className="p-2 bg-white rounded-full border border-gray-200">
                      {getActionIcon(action.actionType)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{action.actionType.replace('_', ' ')}</p>
                      <p className="text-sm text-gray-600">{action.actionDetails}</p>
                      {action.durationDays && (
                        <p className="text-sm text-gray-500">Duration: {action.durationDays} days</p>
                      )}
                      {action.trustScoreChange && (
                        <p className="text-sm text-gray-500">Trust change: {action.trustScoreChange} points</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{action.moderator?.name}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(action.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Appeals */}
            {appeals.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Appeals ({appeals.length})</h2>
                <div className="space-y-4">
                  {appeals.map((appeal) => (
                    <div key={appeal.id} className="border-l-4 border-orange-500 pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{appeal.appealReason}</p>
                          <p className="text-sm text-gray-600">{appeal.appealDescription}</p>
                          {appeal.reviewNotes && (
                            <p className="text-sm text-gray-700 mt-1">Review: {appeal.reviewNotes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">{appeal.status}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(appeal.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowActionModal(true)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Take Action
                </button>
                <button
                  onClick={() => {
                    const notes = prompt('Enter resolution notes:');
                    if (notes) handleResolveCase(notes);
                  }}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Resolve Case
                </button>
                <button className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
                  Escalate
                </button>
              </div>
            </div>

            {/* Case Info */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Case Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Case Number</p>
                  <p className="text-gray-900 font-mono">{case_.caseNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStateColor(case_.state)}`}>
                    {case_.state.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Priority</p>
                  <p className="text-gray-900">{case_.priority}</p>
                </div>
                {case_.autoGenerated && (
                  <div>
                    <p className="text-sm text-gray-600">Type</p>
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                      Auto-generated
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Modal */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Take Action</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
                <select
                  value={actionForm.actionType}
                  onChange={(e) => setActionForm(prev => ({ ...prev, actionType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="WARNING">Warning</option>
                  <option value="CONTENT_REMOVAL">Content Removal</option>
                  <option value="USER_SUSPENSION">User Suspension</option>
                  <option value="USER_BAN">User Ban</option>
                  <option value="TRUST_DEDUCTION">Trust Deduction</option>
                  <option value="ESCALATE">Escalate</option>
                  <option value="NOTES_ONLY">Notes Only</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action Details</label>
                <textarea
                  value={actionForm.actionDetails}
                  onChange={(e) => setActionForm(prev => ({ ...prev, actionDetails: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe the action being taken..."
                />
              </div>

              {(actionForm.actionType === 'USER_SUSPENSION' || actionForm.actionType === 'USER_BAN') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
                  <input
                    type="number"
                    value={actionForm.durationDays}
                    onChange={(e) => setActionForm(prev => ({ ...prev, durationDays: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Number of days"
                  />
                </div>
              )}

              {actionForm.actionType === 'TRUST_DEDUCTION' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trust Score Change</label>
                  <input
                    type="number"
                    value={actionForm.trustScoreChange}
                    onChange={(e) => setActionForm(prev => ({ ...prev, trustScoreChange: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Negative number for deduction"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowActionModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTakeAction}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Submit Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModerationCaseDetail;
