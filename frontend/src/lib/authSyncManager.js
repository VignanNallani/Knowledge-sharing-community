// Cross-tab synchronization for auth events
class AuthSyncManager {
  constructor() {
    this.channel = new BroadcastChannel('auth_sync');
    this.setupListeners();
  }

  setupListeners() {
    // Listen for auth events from other tabs
    this.channel.addEventListener('message', (event) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'LOGOUT':
          this.handleLogoutFromOtherTab();
          break;
        case 'LOGIN':
          this.handleLoginFromOtherTab(data);
          break;
        case 'TOKEN_REFRESH':
          this.handleTokenRefreshFromOtherTab(data);
          break;
      }
    });
  }

  // Broadcast events to other tabs
  broadcastLogout() {
    this.channel.postMessage({
      type: 'LOGOUT',
      timestamp: Date.now()
    });
  }

  broadcastLogin(userData) {
    this.channel.postMessage({
      type: 'LOGIN',
      data: userData,
      timestamp: Date.now()
    });
  }

  broadcastTokenRefresh(newToken) {
    this.channel.postMessage({
      type: 'TOKEN_REFRESH',
      data: { token: newToken },
      timestamp: Date.now()
    });
  }

  handleLogoutFromOtherTab() {
    // Trigger app-wide logout
    window.dispatchEvent(new CustomEvent('auth-logout-from-other-tab'));
  }

  handleLoginFromOtherTab(userData) {
    // Trigger app-wide login update
    window.dispatchEvent(new CustomEvent('auth-login-from-other-tab', { 
      detail: userData 
    }));
  }

  handleTokenRefreshFromOtherTab(data) {
    // Update token in current tab
    window.dispatchEvent(new CustomEvent('auth-token-refreshed', { 
      detail: data.token 
    }));
  }
}

// Export singleton
export const authSyncManager = new AuthSyncManager();
export default authSyncManager;
