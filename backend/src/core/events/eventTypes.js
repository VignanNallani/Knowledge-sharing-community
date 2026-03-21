/**
 * Event type constants for the internal event system
 * Frozen object to prevent modifications at runtime
 */

const EVENT_TYPES = Object.freeze({
  // Post events
  POST_CREATED: 'POST_CREATED',
  POST_UPDATED: 'POST_UPDATED',
  POST_DELETED: 'POST_DELETED',
  
  // Like events
  POST_LIKED: 'POST_LIKED',
  POST_UNLIKED: 'POST_UNLIKED',
  
  // Comment events
  POST_COMMENTED: 'POST_COMMENTED',
  COMMENT_UPDATED: 'COMMENT_UPDATED',
  COMMENT_DELETED: 'COMMENT_DELETED',
  
  // Follow events
  USER_FOLLOWED: 'USER_FOLLOWED',
  USER_UNFOLLOWED: 'USER_UNFOLLOWED',
  
  // User events
  USER_REGISTERED: 'USER_REGISTERED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  
  // System events
  CACHE_INVALIDATED: 'CACHE_INVALIDATED',
  NOTIFICATION_SENT: 'NOTIFICATION_SENT',
  ACTIVITY_LOGGED: 'ACTIVITY_LOGGED'
});

export default EVENT_TYPES;
