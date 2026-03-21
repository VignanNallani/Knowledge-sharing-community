import React, { useState, useEffect } from 'react';
import { AlertTriangle, MessageSquare, Send, Paperclip, CheckCircle, XCircle, Clock } from 'lucide-react';
import apiService from '../../services/api';

const AppealForm = ({ moderationCaseId, originalAction, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    appealReason: '',
    appealDescription: '',
    evidenceUrls: ['']
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await apiService.client.post('/moderation/appeals', {
        moderationCaseId,
        originalActionId: originalAction?.id,
        appealReason: formData.appealReason,
        appealDescription: formData.appealDescription,
        evidenceUrls: formData.evidenceUrls.filter(url => url.trim() !== '')
      });

      const data = response.data;
      
      if (data.success) {
        onSubmit(data.data.appeal);
      } else {
        setError(data.message || 'Failed to submit appeal');
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
          <h2 className="text-2xl font-bold text-gray-900">Submit Appeal</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Original Action Info */}
          {originalAction && (
            <div className="p-4 bg-gray-50 rounded-md">
              <h3 className="font-medium text-gray-900 mb-2">Original Action</h3>
              <p className="text-sm text-gray-600">
                <span className="font-medium">{originalAction.actionType.replace('_', ' ')}</span>
                {originalAction.actionDetails && `: ${originalAction.actionDetails}`}
              </p>
              {originalAction.durationDays && (
                <p className="text-sm text-gray-600">Duration: {originalAction.durationDays} days</p>
              )}
            </div>
          )}

          {/* Appeal Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Appeal Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.appealReason}
              onChange={(e) => setFormData(prev => ({ ...prev, appealReason: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a reason</option>
              <option value="Unfair action">Unfair action</option>
              <option value="Misunderstanding">Misunderstanding</option>
              <option value="Insufficient evidence">Insufficient evidence</option>
              <option value="Wrong target">Wrong target</option>
              <option value="Excessive punishment">Excessive punishment</option>
              <option value="Procedural error">Procedural error</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Appeal Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Detailed Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.appealDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, appealDescription: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={6}
              placeholder="Please provide a detailed explanation of why you believe this action was unfair or incorrect..."
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Minimum 10 characters, maximum 2000 characters
            </p>
          </div>

          {/* Evidence URLs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supporting Evidence
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Add links to screenshots, documents, or other evidence that supports your appeal (optional)
            </p>
            
            {formData.evidenceUrls.map((url, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <div className="flex-1 relative">
                  <Paperclip className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handleEvidenceUrlChange(index, e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/evidence.jpg"
                  />
                </div>
                {formData.evidenceUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEvidenceUrl(index)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <XCircle className="w-4 h-4" />
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
            
            <p className="text-sm text-gray-500 mt-2">
              Maximum 5 URLs allowed
            </p>
          </div>

          {/* Guidelines */}
          <div className="p-4 bg-blue-50 rounded-md">
            <h3 className="font-medium text-blue-900 mb-2">Appeal Guidelines</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Be specific and provide clear reasons for your appeal</li>
              <li>• Include any relevant context that may have been overlooked</li>
              <li>• Provide evidence to support your claims</li>
              <li>• Be respectful and professional in your language</li>
              <li>• Appeals are typically reviewed within 3-5 business days</li>
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
              disabled={isSubmitting || !formData.appealReason || !formData.appealDescription}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Send className="w-4 h-4" />
                  <span>Submit Appeal</span>
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AppealStatusTracker = ({ appeal }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-gray-100 text-gray-700';
      case 'UNDER_REVIEW': return 'bg-blue-100 text-blue-700';
      case 'APPROVED': return 'bg-green-100 text-green-700';
      case 'DENIED': return 'bg-red-100 text-red-700';
      case 'ESCALATED': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SUBMITTED': return <Clock className="w-4 h-4" />;
      case 'UNDER_REVIEW': return <MessageSquare className="w-4 h-4" />;
      case 'APPROVED': return <CheckCircle className="w-4 h-4" />;
      case 'DENIED': return <XCircle className="w-4 h-4" />;
      case 'ESCALATED': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Appeal Status</h3>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getStatusColor(appeal.status)}`}>
          {getStatusIcon(appeal.status)}
          <span className="text-sm font-medium">{appeal.status.replace('_', ' ')}</span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600">Appeal Reason</p>
          <p className="text-gray-900 font-medium">{appeal.appealReason}</p>
        </div>

        <div>
          <p className="text-sm text-gray-600">Description</p>
          <p className="text-gray-900">{appeal.appealDescription}</p>
        </div>

        {appeal.evidenceUrls && appeal.evidenceUrls.length > 0 && (
          <div>
            <p className="text-sm text-gray-600 mb-2">Evidence</p>
            <div className="flex flex-wrap gap-2">
              {appeal.evidenceUrls.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Evidence {index + 1}
                </a>
              ))}
            </div>
          </div>
        )}

        {appeal.reviewNotes && (
          <div>
            <p className="text-sm text-gray-600">Review Notes</p>
            <p className="text-gray-900 bg-gray-50 p-3 rounded-md">{appeal.reviewNotes}</p>
          </div>
        )}

        {appeal.finalDecision && (
          <div>
            <p className="text-sm text-gray-600">Final Decision</p>
            <p className="text-gray-900 font-medium capitalize">{appeal.finalDecision}</p>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-200">
          <span>Submitted: {new Date(appeal.createdAt).toLocaleDateString()}</span>
          {appeal.resolvedAt && (
            <span>Resolved: {new Date(appeal.resolvedAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  );
};

const AppealsList = ({ appeals, userRole }) => {
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [filter, setFilter] = useState('all');

  const filteredAppeals = appeals.filter(appeal => {
    if (filter === 'all') return true;
    return appeal.status === filter;
  });

  const handleAppealSubmit = (newAppeal) => {
    setShowAppealForm(false);
    // Refresh appeals list
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Appeals</h2>
        {userRole === 'USER' && (
          <button
            onClick={() => setShowAppealForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Submit Appeal
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-600">Filter:</span>
        {['all', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DENIED', 'ESCALATED'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Appeals List */}
      <div className="grid grid-cols-1 gap-6">
        {filteredAppeals.map((appeal) => (
          <AppealStatusTracker key={appeal.id} appeal={appeal} />
        ))}
      </div>

      {filteredAppeals.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No appeals found</h3>
          <p className="text-gray-500">
            {filter === 'all' ? 'No appeals have been submitted yet.' : `No ${filter} appeals found.`}
          </p>
        </div>
      )}

      {/* Appeal Form Modal */}
      {showAppealForm && (
        <AppealForm
          moderationCaseId={1} // This would come from the case context
          originalAction={null} // This would come from the case context
          onSubmit={handleAppealSubmit}
          onCancel={() => setShowAppealForm(false)}
        />
      )}
    </div>
  );
};

export { AppealForm, AppealStatusTracker, AppealsList };
