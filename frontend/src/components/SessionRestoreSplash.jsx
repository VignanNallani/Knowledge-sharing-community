import React from 'react';
import { Loader2 } from 'lucide-react';

// Session Restore Splash - Eliminates auth flicker on app load
const SessionRestoreSplash = ({ message = 'Restoring your session...' }) => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center z-50">
      <div className="text-center">
        {/* Logo/Branding */}
        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <div className="text-white text-2xl font-bold">KS</div>
        </div>

        {/* Loading Indicator */}
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">
              {message}
            </h2>
            <p className="text-sm text-gray-600">
              Please wait while we get everything ready for you
            </p>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center justify-center space-x-2 mt-6">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-75"></div>
          <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse delay-150"></div>
        </div>
      </div>
    </div>
  );
};

export default SessionRestoreSplash;
