import React, { useState, useEffect } from 'react';
import { AlertTriangle, MessageSquare, User, Flag, Clock, CheckCircle, XCircle } from 'lucide-react';

const ReportCard = ({ report, onAction, onView }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'LOW': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getFlagIcon = (flagType) => {
    switch (flagType) {
      case 'SPAM': return <MessageSquare className="w-4 h-4" />;
      case 'HARASSMENT': return <User className="w-4 h-4" />;
      case 'INAPPROPRIATE': return <AlertTriangle className="w-4 h-4" />;
      case 'MISINFORMATION': return <AlertTriangle className="w-4 h-4" />;
      case 'VIOLENCE': return <AlertTriangle className="w-4 h-4" />;
      case 'COPYRIGHT': return <Flag className="w-4 h-4" />;
      default: return <Flag className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'UNDER_REVIEW': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'RESOLVED': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'DISMISSED': return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'ESCALATED': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full border ${getSeverityColor(report.severity)}`}>
              {getFlagIcon(report.flagType)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{report.flagType.replace('_', ' ')}</h3>
              <p className="text-sm text-gray-500">Report #{report.id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(report.status)}
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(report.severity)}`}>
              {report.severity}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="mb-3">
          <p className="text-gray-700 font-medium mb-1">{report.reason}</p>
          {report.description && (
            <p className="text-gray-600 text-sm">
              {isExpanded ? report.description : `${report.description.substring(0, 150)}...`}
              {report.description.length > 150 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-blue-600 hover:text-blue-800 text-sm ml-1"
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </p>
          )}
        </div>

        {/* Target Information */}
        <div className="flex items-center space-x-4 mb-3 text-sm text-gray-500">
          {report.reportedUser && (
            <div className="flex items-center space-x-1">
              <User className="w-4 h-4" />
              <span>User: {report.reportedUser.name}</span>
            </div>
          )}
          {report.reportedPost && (
            <div className="flex items-center space-x-1">
              <MessageSquare className="w-4 h-4" />
              <span>Post: {report.reportedPost.title}</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{new Date(report.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Evidence URLs */}
        {report.evidenceUrls && report.evidenceUrls.length > 0 && (
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-700 mb-1">Evidence:</p>
            <div className="flex flex-wrap gap-2">
              {report.evidenceUrls.map((url, index) => (
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

        {/* Case Information */}
        {report.moderationCase && (
          <div className="mb-3 p-2 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Case:</span> {report.moderationCase.caseNumber} - {report.moderationCase.state}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onView(report)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              View Details
            </button>
            {report.status === 'PENDING' && (
              <button
                onClick={() => onAction(report, 'assign')}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Assign to Me
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            {report.autoGenerated && (
              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                Auto-generated
              </span>
            )}
            {report.isDuplicate && (
              <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                Duplicate
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportCard;
