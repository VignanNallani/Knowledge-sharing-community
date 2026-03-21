import React from 'react';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';

// Unified Content State System - Eliminates UI Inconsistency
const ContentState = ({ 
  loading, 
  error, 
  empty, 
  children, 
  loadingComponent,
  errorComponent,
  emptyComponent,
  className = ''
}) => {
  // Loading state - always show skeleton, never blank
  if (loading) {
    if (loadingComponent) {
      return loadingComponent;
    }
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-sm text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  // Error state - always show feedback, never silent fail
  if (error) {
    if (errorComponent) {
      return errorComponent;
    }
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex flex-col items-center space-y-3 text-center max-w-md">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <div>
            <h3 className="font-medium text-gray-900">Something went wrong</h3>
            <p className="text-sm text-gray-500 mt-1">
              {error?.message || 'Please try again or refresh the page'}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state - always show guidance, never blank
  if (empty) {
    if (emptyComponent) {
      return emptyComponent;
    }
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex flex-col items-center space-y-3 text-center max-w-md">
          <Inbox className="w-12 h-12 text-gray-400" />
          <div>
            <h3 className="font-medium text-gray-900">Nothing here yet</h3>
            <p className="text-sm text-gray-500 mt-1">
              This section is empty. Check back later or create something new.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state - render children
  return <>{children}</>;
};

export default ContentState;
