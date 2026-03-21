export const CACHE_KEYS = {
  // User-related cache keys
  USER_PROFILE: (userId) => `user:profile:${userId}`,
  USER_POSTS: (userId) => `user:posts:${userId}`,
  USER_FOLLOWERS: (userId) => `user:followers:${userId}`,
  USER_FOLLOWING: (userId) => `user:following:${userId}`,
  
  // Post-related cache keys
  POST_DETAIL: (postId) => `post:detail:${postId}`,
  POST_COMMENTS: (postId) => `post:comments:${postId}`,
  POST_LIKES: (postId) => `post:likes:${postId}`,
  POSTS_LIST: (page = 1) => `posts:list:${page}`,
  POSTS_SEARCH: (query, page = 1) => `posts:search:${query}:${page}`,
  
  // Comment-related cache keys
  COMMENT_DETAIL: (commentId) => `comment:detail:${commentId}`,
  COMMENT_REPLIES: (commentId) => `comment:replies:${commentId}`,
  
  // Mentorship-related cache keys
  MENTORSHIP_DETAIL: (mentorshipId) => `mentorship:detail:${mentorshipId}`,
  MENTOR_SLOTS: (mentorId) => `mentor:slots:${mentorId}`,
  AVAILABLE_SLOTS: 'slots:available',
  
  // Chat-related cache keys
  CONVERSATION_DETAIL: (conversationId) => `conversation:detail:${conversationId}`,
  CONVERSATION_MESSAGES: (conversationId, page = 1) => `conversation:messages:${conversationId}:${page}`,
  USER_CONVERSATIONS: (userId) => `user:conversations:${userId}`,
  
  // Admin-related cache keys
  ADMIN_STATS: 'admin:stats',
  PENDING_POSTS: 'admin:pending_posts',
  REPORTS_LIST: 'admin:reports',
  
  // Search and filter cache keys
  SEARCH_USERS: (query, page = 1) => `search:users:${query}:${page}`,
  SEARCH_POSTS: (query, page = 1) => `search:posts:${query}:${page}`,
  FILTER_POSTS: (filters, page = 1) => `filter:posts:${JSON.stringify(filters)}:${page}`,
  
  // Rate limiting cache keys
  RATE_LIMIT: (ip, endpoint) => `rate_limit:${ip}:${endpoint}`,
  FAILED_ATTEMPTS: (ip, identifier) => `failed_attempts:${ip}:${identifier}`,
  
  // Session and auth cache keys
  USER_SESSION: (sessionId) => `session:${sessionId}`,
  REFRESH_TOKEN: (tokenId) => `refresh_token:${tokenId}`,
  
  // Analytics and metrics cache keys
  DAILY_STATS: (date) => `stats:daily:${date}`,
  WEEKLY_STATS: (week) => `stats:weekly:${week}`,
  MONTHLY_STATS: (month) => `stats:monthly:${month}`,
  
  // Configuration cache keys
  APP_CONFIG: 'app:config',
  FEATURE_FLAGS: 'app:feature_flags',
};

export const CACHE_PATTERNS = {
  // Invalidation patterns
  USER_RELATED: (userId) => new RegExp(`user:.*:${userId}|.*:user:${userId}`),
  POST_RELATED: (postId) => new RegExp(`post:.*:${postId}|.*:post:${postId}`),
  CONVERSATION_RELATED: (conversationId) => new RegExp(`conversation:.*:${conversationId}`),
  
  // General patterns
  ALL_POSTS: /^posts:/,
  ALL_USERS: /^user:/,
  ALL_COMMENTS: /^comment:/,
  ALL_MENTORSHIPS: /^mentorship:/,
  ALL_SLOTS: /^slots:/,
  ALL_CONVERSATIONS: /^conversation:/,
  ALL_ADMIN: /^admin:/,
  ALL_SEARCH: /^search:/,
  ALL_STATS: /^stats:/,
  ALL_RATE_LIMITS: /^rate_limit:/,
  ALL_SESSIONS: /^session:/,
};

export const CACHE_TTL = {
  // Short TTL (1-5 minutes)
  SHORT: 300000, // 5 minutes
  VERY_SHORT: 60000, // 1 minute
  
  // Medium TTL (15-30 minutes)
  MEDIUM: 900000, // 15 minutes
  DEFAULT: 1800000, // 30 minutes
  
  // Long TTL (1-6 hours)
  LONG: 3600000, // 1 hour
  VERY_LONG: 21600000, // 6 hours
  
  // Extended TTL (24 hours)
  DAILY: 86400000, // 24 hours
  
  // Special TTLs
  SESSION: 86400000, // 24 hours
  RATE_LIMIT: 900000, // 15 minutes
  STATS: 3600000, // 1 hour
  CONFIG: 86400000, // 24 hours
};

export default {
  CACHE_KEYS,
  CACHE_PATTERNS,
  CACHE_TTL,
};
