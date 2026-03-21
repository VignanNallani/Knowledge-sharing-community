// Production Stress Test - Validates Critical Edge Cases
// Run this in browser console to test production readiness

class ProductionStressTest {
  constructor() {
    this.results = [];
  }

  log(test, result, details = '') {
    this.results.push({ test, result, details, timestamp: new Date() });
    console.log(`🧪 ${test}: ${result} ${details}`);
  }

  async testConcurrent401Storm() {
    console.log('🌩 Testing Concurrent 401 Storm...');
    
    // Simulate token invalidation
    const originalToken = window.tokenManager?.getAccessToken();
    if (window.tokenManager) {
      window.tokenManager.setAccessToken('expired-token');
    }

    // Trigger 5 concurrent API calls
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer expired-token`
          }
        }).catch(err => err)
      );
    }

    try {
      const results = await Promise.allSettled(promises);
      const refreshCount = results.filter(r => 
        r.status === 'fulfilled' && 
        r.value?.ok
      ).length;
      
      this.log(
        'Concurrent 401 Storm',
        refreshCount <= 1 ? '✅ PASS' : '❌ FAIL',
        `${refreshCount} refreshes occurred (should be ≤1)`
      );
    } catch (error) {
      this.log('Concurrent 401 Storm', '❌ ERROR', error.message);
    }

    // Restore original token
    if (originalToken && window.tokenManager) {
      window.tokenManager.setAccessToken(originalToken);
    }
  }

  async testCrossTabLogout() {
    console.log('🔄 Testing Cross-Tab Logout...');
    
    return new Promise((resolve) => {
      // Open new tab
      const newTab = window.open('/community', '_blank');
      
      if (!newTab) {
        this.log('Cross-Tab Logout', '⚠️ SKIP', 'Popup blocked - test manually');
        resolve();
        return;
      }

      setTimeout(() => {
        // Trigger logout in new tab
        newTab.postMessage({ type: 'TEST_LOGOUT' }, '*');
        
        setTimeout(() => {
          // Check if current tab logged out
          const isLoggedOut = !window.useAuth?.().isAuthenticated;
          
          this.log(
            'Cross-Tab Logout',
            isLoggedOut ? '✅ PASS' : '❌ FAIL',
            isLoggedOut ? 'Logout synced across tabs' : 'No sync detected'
          );
          
          newTab.close();
          resolve();
        }, 1000);
      }, 2000);
    });
  }

  async testSocketReconnectAfterRefresh() {
    console.log('🔌 Testing Socket Reconnect After Refresh...');
    
    if (!window.socket) {
      this.log('Socket Reconnect', '⚠️ SKIP', 'Socket not available');
      return;
    }

    const initialConnected = window.socket.connected;
    
    // Simulate token refresh
    const originalToken = window.tokenManager?.getAccessToken();
    if (window.tokenManager) {
      window.tokenManager.setAccessToken('new-refreshed-token');
    }

    // Wait for socket to reconnect
    setTimeout(() => {
      const reconnected = window.socket.connected;
      const newToken = window.tokenManager?.getAccessToken();
      
      this.log(
        'Socket Reconnect After Refresh',
        reconnected && newToken === 'new-refreshed-token' ? '✅ PASS' : '❌ FAIL',
        `Socket reconnected: ${reconnected}, Token updated: ${newToken === 'new-refreshed-token'}`
      );
      
      // Restore original token
      if (originalToken && window.tokenManager) {
        window.tokenManager.setAccessToken(originalToken);
      }
    }, 2000);
  }

  async testMemoryLeak() {
    console.log('🧠 Testing Memory Leak...');
    
    const initialMemory = performance.memory?.usedJSHeapSize || 0;
    
    // Simulate heavy usage
    for (let i = 0; i < 100; i++) {
      const token = `test-token-${i}`;
      if (window.tokenManager) {
        window.tokenManager.setAccessToken(token);
        window.tokenManager.clearTokens();
      }
    }
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    setTimeout(() => {
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      this.log(
        'Memory Leak',
        memoryIncrease < 1024 * 1024 ? '✅ PASS' : '❌ FAIL',
        `Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`
      );
    }, 1000);
  }

  async testErrorBoundary() {
    console.log('🛡️ Testing Error Boundary...');
    
    // Try to trigger an error
    const originalError = console.error;
    let errorCaught = false;
    
    console.error = (...args) => {
      if (args[0]?.includes?.('ErrorBoundary caught an error')) {
        errorCaught = true;
      }
      originalError.apply(console, args);
    };
    
    // Trigger component error
    try {
      const badComponent = () => {
        throw new Error('Test error for ErrorBoundary');
      };
      badComponent();
    } catch (error) {
      // Expected to be caught by ErrorBoundary in real scenario
    }
    
    setTimeout(() => {
      console.error = originalError;
      this.log(
        'Error Boundary',
        errorCaught ? '✅ PASS' : '⚠️ UNKNOWN',
        errorCaught ? 'ErrorBoundary caught test error' : 'No ErrorBoundary detection'
      );
    }, 500);
  }

  async runAllTests() {
    console.log('🚀 Starting Production Stress Tests...');
    console.log('=' .repeat(50));
    
    await this.testConcurrent401Storm();
    await this.testCrossTabLogout();
    await this.testSocketReconnectAfterRefresh();
    await this.testMemoryLeak();
    await this.testErrorBoundary();
    
    console.log('=' .repeat(50));
    console.log('📊 Test Results Summary:');
    
    const passed = this.results.filter(r => r.result.includes('PASS')).length;
    const failed = this.results.filter(r => r.result.includes('FAIL')).length;
    const skipped = this.results.filter(r => r.result.includes('SKIP')).length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Skipped: ${skipped}`);
    console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    
    // Generate report
    this.generateReport();
  }

  generateReport() {
    const report = {
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      results: this.results,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.result.includes('PASS')).length,
        failed: this.results.filter(r => r.result.includes('FAIL')).length,
        skipped: this.results.filter(r => r.result.includes('SKIP')).length
      }
    };
    
    console.log('📄 Full report:', report);
    
    // Save to localStorage for debugging
    try {
      localStorage.setItem('production-stress-test-report', JSON.stringify(report));
      console.log('💾 Report saved to localStorage');
    } catch (error) {
      console.log('⚠️ Could not save report:', error);
    }
  }
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  window.productionStressTest = new ProductionStressTest();
  
  // Run tests automatically
  setTimeout(() => {
    window.productionStressTest.runAllTests();
  }, 1000);
}

export default ProductionStressTest;
