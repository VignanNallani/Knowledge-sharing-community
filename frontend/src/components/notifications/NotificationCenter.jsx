import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Bell, 
  X, 
  Check, 
  Clock, 
  User, 
  Calendar,
  Heart,
  MessageCircle,
  TrendingUp,
  Users,
  Settings,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { socket } from '../services/socket';
import { notificationService } from '../services/notificationAPI';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filter, setFilter] = useState('all');
  const [isExpanded, setIsExpanded] = useState(false);
  
  const navigate = useNavigate();
  const notificationRef = useRef(null);

  // Fetch notifications on component mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Set up Socket.io listeners
  useEffect(() => {
    if (socket.connected) {
      socket.on('notification', handleNewNotification);
      socket.on('notification_read', handleNotificationRead);
    }

    return () => {
      if (socket.connected) {
        socket.off('notification', handleNewNotification);
        socket.off('notification_read', handleNotificationRead);
      }
    };
  }, [socket.connected]);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await notificationService.getUserNotifications({
        isRead: filter === 'read' ? true : filter === 'unread' ? false : undefined
      });
      
      setNotifications(response.notifications || []);
      setUnreadCount(response.pagination?.total || 0);
      
      // Update unread count in socket service
      if (socket.connected) {
        socket.emit('unread_count', response.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const handleNewNotification = useCallback((notification) => {
    setNotifications(prev => {
      // Add new notification to the top
      const newNotifications = [notification, ...prev];
      
      // Keep only the latest 50 notifications
      const trimmedNotifications = newNotifications.slice(0, 50);
      
      setNotifications(trimmedNotifications);
      
      // Update unread count
      const newUnreadCount = trimmedNotifications.filter(n => !n.isRead).length;
      setUnreadCount(newUnreadCount);
      
      // Update unread count in socket service
      if (socket.connected) {
        socket.emit('unread_count', newUnreadCount);
      }
      
      // Show browser notification if user is not active
      if (!document.hasFocus()) {
        showBrowserNotification(notification);
      }
    }, []);

  const handleNotificationRead = useCallback((data) => {
    const { notificationId } = data;
    
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, isRead: true, readAt: new Date() }
          : notification
      )
    );
      
      // Update unread count
      const newUnreadCount = notifications.filter(n => !n.isRead).length;
      setUnreadCount(newUnreadCount);
      
      // Update unread count in socket service
      if (socket.connected) {
        socket.emit('unread_count', newUnreadCount);
      }
    }, [notifications]);

  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markNotificationAsRead(notificationId, 1);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllNotificationsAsRead(1);
      
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true, readAt: new Date() }))
      
      setUnreadCount(0);
      
      if (socket.connected) {
        socket.emit('unread_count', 0);
      }
    } catch (const error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId, 1);
      
      setNotifications(prev => 
        prev.filter(n => n.id !== notificationId)
      );
      
      // Update unread count
      const newUnreadCount = notifications.filter(n => !n.isRead).length;
      setUnreadCount(newUnreadCount);
      
      if (socket.connected) {
        socket.emit('unread_count', newUnreadCount);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const showBrowserNotification = (notification) => {
    if (!('Notification' in window)) {
      return;
    }

    const notificationTitle = notification.title;
    const notificationOptions = {
      body: notification.message,
      icon: notification.data?.icon || '/icons/notification-icon.png',
      badge: notification.data?.badge || '/icons/badge-icon.png',
      tag: notification.data?.tag || 'general',
      data: notification.data,
      requireInteraction: notification.data?.requireInteraction || false,
      url: notification.data?.url
    };

    if ('serviceWorker' in navigator && 'showNotification' in window.ServiceWorkerRegistration) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(notificationTitle, notificationOptions);
      });
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'session_update':
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'post_liked':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment_added':
        return <MessageCircle className="w-4 h-4 text-green-500" />;
      case 'new_follower':
        return <Users className="w-4 h-4 text-purple-500" />;
      case 'system_announcement':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'session_update':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'post_liked':
        'text-red-600 bg-red-50 border-red-200';
      case 'comment_added':
        'text-green-600 bg-green-50 border-green-200';
      case 'new_follower':
        'text-purple-600 bg-purple-50 border-purple-200';
      case 'system_announcement':
        'text-orange-600 bg-orange-50 border-orange-200';
      default:
        'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - new Date(date)) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 43200) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  const formatNotificationData = (notification) => {
    const data = notification.data || {};
    return {
      ...data,
      type: notification.type,
      timestamp: notification.createdAt,
      url: notification.data?.url,
      notificationId: notification.id
    };
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'read') return notification.isRead;
      if (filter === 'unread') return !notification.isRead;
      return true;
    });

  return filteredNotifications;

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    fetchNotifications();
  };

  const handleExpandToggle = () => {
    setIsExpanded(!isExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading notifications...</span>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExpandToggle}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex space-x-2">
              <button
                onClick={() => handleFilterChange('all')}
                className={`px-3 py-1 text-sm rounded ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => handleFilterChange('unread')}
                className={`px-3 py-1 text-sm rounded ${
                  filter === 'unread'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => handleFilterChange('read')}
                className={`px-3 py-1 text-sm rounded ${
                  filter === 'read'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Read
              </button>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    notification.isRead ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${getNotificationColor(notification.type)} text-white`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-1">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimeAgo(notification.createdAt)}</span>
                      </div>
                    </div>
                    
                    {!notification.isRead && (
                      <div className="flex items-center space-x-2">
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-xs text-red-600 hover:text-red-800 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {filteredNotifications.length > 0 && (
          <div className="p-4 border-t border-gray-200 text-center">
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              Mark all as read
            </button>
          </div>
        )}

        {/* Expand/Collapse */}
        {filteredNotifications.length > 0 && (
          <div className="px-4 pb-4 border-t border-gray-200 text-center">
            <button
              onClick={handleExpandToggle}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
