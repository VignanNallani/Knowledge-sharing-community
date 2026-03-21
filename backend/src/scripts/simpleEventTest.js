// Simple event test without dependencies
console.log('Starting simple event test...');

// Mock logger for testing
const mockLogger = {
  info: (msg, data) => console.log('INFO:', msg, data || ''),
  error: (msg, data) => console.error('ERROR:', msg, data || ''),
  warn: (msg, data) => console.warn('WARN:', msg, data || '')
};

// Simple event bus test
class SimpleEventBus {
  constructor() {
    this.events = {};
    this.stats = { emitted: 0, errors: 0 };
  }

  emit(eventName, payload = {}) {
    try {
      this.stats.emitted++;
      console.log(`Event emitted: ${eventName}`, { payload });
      
      // Simulate async dispatch
      if (this.events[eventName]) {
        setImmediate(() => {
          this.events[eventName].forEach(handler => {
            try {
              handler(payload);
            } catch (error) {
              this.stats.errors++;
              console.error(`Handler error for ${eventName}:`, error.message);
            }
          });
        });
        return true;
      }
      return false;
    } catch (error) {
      this.stats.errors++;
      console.error(`Emit error for ${eventName}:`, error.message);
      return false;
    }
  }

  on(eventName, handler) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(handler);
  }

  getStats() {
    return {
      ...this.stats,
      listenerCount: Object.keys(this.events).length
    };
  }
}

// Test execution
async function runTest() {
  const eventBus = new SimpleEventBus();
  
  // Add test listener
  eventBus.on('TEST_EVENT', (payload) => {
    console.log('Test event received:', payload);
  });

  console.log('Emitting 100 test events...');
  
  const startTime = Date.now();
  
  // Emit 100 events
  for (let i = 0; i < 100; i++) {
    eventBus.emit('TEST_EVENT', { testId: i, data: `test-data-${i}` });
  }
  
  // Wait for async processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const endTime = Date.now();
  const stats = eventBus.getStats();
  
  console.log('\n=== TEST RESULTS ===');
  console.log('Events emitted:', stats.emitted);
  console.log('Errors:', stats.errors);
  console.log('Execution time:', endTime - startTime, 'ms');
  console.log('Events per second:', Math.round(stats.emitted / ((endTime - startTime) / 1000)));
  console.log('Success rate:', ((stats.emitted - stats.errors) / stats.emitted * 100).toFixed(2) + '%');
  
  if (stats.errors === 0) {
    console.log('\n✅ EVENT SYSTEM TEST PASSED');
  } else {
    console.log('\n❌ EVENT SYSTEM TEST FAILED');
  }
}

runTest().catch(console.error);
