import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import './RealTimeNotifications.css';

const RealTimeNotifications = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, clearNotifications } = useSocket();

  const handleNotificationClick = (notification) => {
    // Handle notification click (e.g., navigate to relevant page)
    console.log('Notification clicked:', notification);
    
    // You could implement navigation logic here
    switch (notification.type) {
      case 'comment':
        // Navigate to post with comments
        window.location.href = `/post/${notification.data.postId}`;
        break;
      case 'like':
        // Navigate to liked post
        window.location.href = `/post/${notification.data.postId}`;
        break;
      default:
        break;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'comment':
        return '💬';
      case 'like':
        return '❤️';
      default:
        return '🔔';
    }
  };

  const formatNotificationTime = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffMs = now - notificationTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'just now';
  };

  return (
    <div className="real-time-notifications">
      {/* Notification Bell */}
      <div 
        className="notification-bell"
        onClick={() => setShowNotifications(!showNotifications)}
      >
        <span className="bell-icon">🔔</span>
        {notifications.length > 0 && (
          <span className="notification-badge">{notifications.length}</span>
        )}
      </div>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Notifications</h3>
            <button 
              onClick={clearNotifications}
              className="clear-all-btn"
            >
              Clear All
            </button>
          </div>

          <div className="notifications-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                No new notifications
              </div>
            ) : (
              notifications.map((notification, index) => (
                <div 
                  key={index}
                  className="notification-item"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-message">
                      {notification.message}
                    </div>
                    <div className="notification-time">
                      {formatNotificationTime(notification.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {showNotifications && (
        <div 
          className="notifications-overlay"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </div>
  );
};

export default RealTimeNotifications;
