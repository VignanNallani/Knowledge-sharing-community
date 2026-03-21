import { useEffect, useState, useCallback } from 'react';
import socketService from '../services/socketService';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Connect to socket when component mounts
    socketService.connect();

    // Set up connection status listener
    const handleConnectionChange = (connected) => {
      setIsConnected(connected);
    };

    // Set up notification listener
    const handleNewNotification = (notification) => {
      setNotifications(prev => [notification, ...prev]);
    };

    // Register event listeners
    socketService.on('connect', () => handleConnectionChange(true));
    socketService.on('disconnect', () => handleConnectionChange(false));
    socketService.on('new_notification', handleNewNotification);

    return () => {
      // Cleanup
      socketService.disconnect();
    };
  }, []);

  const joinPost = useCallback((postId) => {
    socketService.joinPost(postId);
  }, []);

  const leavePost = useCallback((postId) => {
    socketService.leavePost(postId);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    isConnected,
    notifications,
    joinPost,
    leavePost,
    clearNotifications,
    socket: socketService.getSocket()
  };
};
