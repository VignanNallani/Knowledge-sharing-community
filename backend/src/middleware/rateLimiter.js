// Rate Limiter - Sliding Window Algorithm for Production
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // 1 minute default
    this.maxRequests = options.maxRequests || 100;
    this.keyGenerator = options.keyGenerator || this.defaultKeyGenerator;
    this.storage = new Map(); // In-memory storage (for single instance)
    this.cleanupInterval = setInterval(() => this.cleanup(), this.windowMs);
  }

  defaultKeyGenerator(req) {
    // Combine IP and user ID for more granular limiting
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userId = req.user?.id;
    return userId ? `user:${userId}` : `ip:${ip}`;
  }

  isAllowed(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    if (!this.storage.has(key)) {
      this.storage.set(key, []);
    }

    const requests = this.storage.get(key);
    
    // Remove expired requests
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    this.storage.set(key, validRequests);

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    return true;
  }

  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, requests] of this.storage.entries()) {
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      if (validRequests.length === 0) {
        this.storage.delete(key);
      } else {
        this.storage.set(key, validRequests);
      }
    }
  }

  getStats(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const requests = this.storage.get(key) || [];
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    return {
      current: validRequests.length,
      max: this.maxRequests,
      resetTime: Math.min(...validRequests) + this.windowMs
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.storage.clear();
  }
}

export default RateLimiter;
