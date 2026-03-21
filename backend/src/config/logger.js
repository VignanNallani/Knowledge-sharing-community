import pino from 'pino';

// Create clean Pino logger
export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  formatters: {
    level: (label) => ({ level: label }),
    log: (object) => {
      // Add service context
      return {
        ...object,
        service: 'knowledge-sharing-backend',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

export default logger;
