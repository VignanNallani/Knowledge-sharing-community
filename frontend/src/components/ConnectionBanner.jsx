import React from 'react';
import { useSocket } from '../context/SocketProvider';

export default function ConnectionBanner() {
  const { isReconnecting, isConnected } = useSocket();

  if (!isReconnecting && isConnected) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 text-center px-4 py-2 text-sm font-medium ${
      isReconnecting 
        ? 'bg-yellow-50 text-yellow-800 border-b border-yellow-200' 
        : 'bg-green-50 text-green-800 border-b border-green-200'
    }`}>
      {isReconnecting ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-yellow-600 rounded-full animate-pulse"></div>
          Reconnecting to server...
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-green-600 rounded-full"></div>
          Connected
        </div>
      )}
    </div>
  );
}
