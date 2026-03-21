// Middleware timing instrument
function timedMiddleware(name, middleware) {
  return async (req, res, next) => {
    const start = process.hrtime.bigint()
    
    // Capture original next to ensure we time the actual middleware execution
    const originalNext = next;
    const wrappedNext = () => {
      const end = process.hrtime.bigint()
      const duration = Number(end - start) / 1e6
      console.log(`🔍 ${name}: ${duration.toFixed(2)}ms`)
      originalNext();
    };
    
    try {
      await middleware(req, res, wrappedNext);
    } catch (error) {
      const end = process.hrtime.bigint()
      const duration = Number(end - start) / 1e6
      console.log(`🔍 ${name} (ERROR): ${duration.toFixed(2)}ms`)
      originalNext();
    }
  }
}

export default timedMiddleware;
