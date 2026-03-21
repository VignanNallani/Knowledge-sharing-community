import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';

// Global Offline Awareness - Network resilience for premium feel
const OfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showMessage, setShowMessage] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowMessage(true);
      setRetryCount(0);
      
      // Hide success message after 3 seconds
      setTimeout(() => setShowMessage(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowMessage(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    // Trigger a soft refresh or retry failed requests
    window.location.reload();
  };

  if (isOnline && !showMessage) {
    return null; // Don't show anything when online and no message to display
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isOnline 
        ? 'bg-green-500 text-white' 
        : 'bg-orange-500 text-white'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Wifi className="w-5 h-5" />
            ) : (
              <WifiOff className="w-5 h-5" />
            )}
            
            <div>
              <p className="font-medium text-sm">
                {isOnline 
                  ? 'Connection restored' 
                  : 'You are offline'
                }
              </p>
              {!isOnline && (
                <p className="text-xs opacity-90">
                  Some features may not work properly
                </p>
              )}
            </div>
          </div>

          {!isOnline && (
            <div className="flex items-center gap-3">
              {retryCount > 0 && (
                <span className="text-xs opacity-90">
                  Attempts: {retryCount}
                </span>
              )}
              
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          )}

          {isOnline && (
            <button
              onClick={() => setShowMessage(false)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Push content down when banner is shown */}
      <div className="h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
    </div>
  );
};

export default OfflineBanner;
