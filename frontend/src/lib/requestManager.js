import axios from 'axios';

// Request Cancellation Manager - Prevents ghost updates
class RequestManager {
  constructor() {
    this.pendingRequests = new Map();
  }

  // Generate unique request key
  generateKey(config) {
    const { method, url, params, data } = config;
    return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
  }

  // Cancel request if it exists
  cancelRequest(key) {
    const controller = this.pendingRequests.get(key);
    if (controller) {
      controller.abort();
      this.pendingRequests.delete(key);
    }
  }

  // Cancel all pending requests
  cancelAllRequests() {
    this.pendingRequests.forEach((controller) => {
      controller.abort();
    });
    this.pendingRequests.clear();
  }

  // Create request with cancellation support
  async request(config) {
    const key = this.generateKey(config);
    
    // Cancel existing request with same key
    this.cancelRequest(key);
    
    // Create new abort controller
    const controller = new AbortController();
    this.pendingRequests.set(key, controller);
    
    try {
      const response = await axios({
        ...config,
        signal: controller.signal
      });
      
      this.pendingRequests.delete(key);
      return response;
    } catch (error) {
      this.pendingRequests.delete(key);
      
      // Don't treat aborted requests as errors
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        return { canceled: true };
      }
      
      throw error;
    }
  }

  // Get pending requests count
  getPendingCount() {
    return this.pendingRequests.size;
  }

  // Check if specific request is pending
  isPending(config) {
    const key = this.generateKey(config);
    return this.pendingRequests.has(key);
  }
}

// Singleton instance
const requestManager = new RequestManager();

// React hook for request cancellation
export const useRequestCancellation = () => {
  const cancelRequest = (config) => {
    requestManager.cancelRequest(requestManager.generateKey(config));
  };

  const cancelAllRequests = () => {
    requestManager.cancelAllRequests();
  };

  const isPending = (config) => {
    return requestManager.isPending(config);
  };

  const getPendingCount = () => {
    return requestManager.getPendingCount();
  };

  return {
    cancelRequest,
    cancelAllRequests,
    isPending,
    getPendingCount
  };
};

// Enhanced axios instance with cancellation
export const createCancelableRequest = (config) => {
  return requestManager.request(config);
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    requestManager.cancelAllRequests();
  });
}

export default requestManager;
