module.exports = {
  apps: [{
    name: 'knowledge-sharing-backend',
    script: 'index.js',
    instances: 'max', // Use all available CPU cores
    exec_mode: 'cluster', // Enable cluster mode
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Production optimizations
    max_memory_restart: '512M', // Restart if memory exceeds 512MB
    min_uptime: '10s', // Minimum uptime before considering restart
    max_restarts: 10, // Maximum restarts per time window
    restart_delay: 4000, // Delay between restarts
    
    // Monitoring
    watch: false, // Don't watch files in production
    ignore_watch: ['node_modules', 'logs'],
    
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Health checks
    health_check_grace_period: 3000,
    health_check_fatal_exceptions: true,
    
    // Process management
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 3000
  }]
};
