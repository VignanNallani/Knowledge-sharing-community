import fs from 'fs/promises';
import path from 'path';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { LOG_LEVELS } from '../config/log-schemas.js';

/**
 * Log Manager
 * 
 * Handles log rotation, archiving, cleanup, and management operations.
 */
class LogManager {
  constructor(options = {}) {
    this.logDir = options.logDir || path.join(process.cwd(), 'backend', 'src', 'logs');
    this.maxFileSize = options.maxFileSize || 50 * 1024 * 1024; // 50MB
    this.maxFiles = options.maxFiles || 10;
    this.compressionEnabled = options.compressionEnabled !== false;
    this.retentionDays = {
      critical: options.criticalRetentionDays || 90,
      error: options.errorRetentionDays || 30,
      warning: options.warningRetentionDays || 14,
      info: options.infoRetentionDays || 7,
      debug: options.debugRetentionDays || 3,
      trace: options.traceRetentionDays || 1
    };
  }

  /**
   * Initialize log manager
   */
  async initialize() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
      await this.createLogFiles();
      this.startRotationScheduler();
      console.log('Log manager initialized');
    } catch (error) {
      console.error('Failed to initialize log manager:', error);
      throw error;
    }
  }

  /**
   * Create initial log files
   */
  async createLogFiles() {
    const logFiles = [
      'combined.log',
      'error.log',
      'critical.log',
      'performance.log',
      'security.log',
      'business.log'
    ];

    for (const file of logFiles) {
      const filePath = path.join(this.logDir, file);
      try {
        await fs.access(filePath);
      } catch {
        await fs.writeFile(filePath, '');
      }
    }
  }

  /**
   * Start scheduled log rotation
   */
  startRotationScheduler() {
    // Check for rotation every hour
    setInterval(async () => {
      try {
        await this.checkAndRotateLogs();
      } catch (error) {
        console.error('Log rotation failed:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    // Clean up old files daily
    setInterval(async () => {
      try {
        await this.cleanupOldLogs();
      } catch (error) {
        console.error('Log cleanup failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * Check and rotate logs if needed
   */
  async checkAndRotateLogs() {
    const logFiles = await fs.readdir(this.logDir);
    
    for (const file of logFiles) {
      if (file.endsWith('.log')) {
        const filePath = path.join(this.logDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.size > this.maxFileSize) {
          await this.rotateLog(file);
        }
      }
    }
  }

  /**
   * Rotate a specific log file
   */
  async rotateLog(filename) {
    const basePath = path.join(this.logDir, filename);
    
    // Remove oldest file if we've reached max files
    const oldestFile = `${basePath}.${this.maxFiles}.gz`;
    try {
      await fs.unlink(oldestFile);
    } catch {
      // File doesn't exist, that's okay
    }

    // Shift existing files
    for (let i = this.maxFiles - 1; i >= 1; i--) {
      const currentFile = `${basePath}.${i}${this.compressionEnabled ? '.gz' : ''}`;
      const nextFile = `${basePath}.${i + 1}${this.compressionEnabled ? '.gz' : ''}`;
      
      try {
        await fs.rename(currentFile, nextFile);
      } catch {
        // File doesn't exist, that's okay
      }
    }

    // Move current log to .1
    const rotatedFile = `${basePath}.1${this.compressionEnabled ? '.gz' : ''}`;
    await fs.rename(basePath, rotatedFile);

    // Compress if enabled
    if (this.compressionEnabled) {
      await this.compressFile(rotatedFile);
    }

    // Create new empty log file
    await fs.writeFile(basePath, '');
    
    console.log(`Rotated log file: ${filename}`);
  }

  /**
   * Compress a log file
   */
  async compressFile(filePath) {
    const compressedPath = `${filePath}.gz`;
    const readStream = await fs.readFile(filePath);
    
    return new Promise((resolve, reject) => {
      const gzip = createGzip();
      const chunks = [];
      
      gzip.on('data', (chunk) => chunks.push(chunk));
      gzip.on('end', async () => {
        const compressed = Buffer.concat(chunks);
        await fs.writeFile(compressedPath, compressed);
        await fs.unlink(filePath); // Remove uncompressed file
        resolve();
      });
      gzip.on('error', reject);
      
      gzip.write(readStream);
      gzip.end();
    });
  }

  /**
   * Clean up old log files based on retention policy
   */
  async cleanupOldLogs() {
    const logFiles = await fs.readdir(this.logDir);
    const now = Date.now();
    
    for (const file of logFiles) {
      const filePath = path.join(this.logDir, file);
      const stats = await fs.stat(filePath);
      const ageDays = (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
      
      // Determine retention period based on file type
      let retentionDays = this.retentionDays.info; // default
      
      if (file.includes('critical')) {
        retentionDays = this.retentionDays.critical;
      } else if (file.includes('error')) {
        retentionDays = this.retentionDays.error;
      } else if (file.includes('warning')) {
        retentionDays = this.retentionDays.warning;
      } else if (file.includes('debug')) {
        retentionDays = this.retentionDays.debug;
      } else if (file.includes('trace')) {
        retentionDays = this.retentionDays.trace;
      }
      
      if (ageDays > retentionDays) {
        await fs.unlink(filePath);
        console.log(`Deleted old log file: ${file} (${Math.round(ageDays)} days old)`);
      }
    }
  }

  /**
   * Get log statistics
   */
  async getLogStats() {
    const logFiles = await fs.readdir(this.logDir);
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      files: []
    };

    for (const file of logFiles) {
      const filePath = path.join(this.logDir, file);
      const fileStats = await fs.stat(filePath);
      
      stats.totalFiles++;
      stats.totalSize += fileStats.size;
      
      stats.files.push({
        name: file,
        size: fileStats.size,
        modified: fileStats.mtime,
        isCompressed: file.endsWith('.gz')
      });
    }

    return stats;
  }

  /**
   * Search logs for specific patterns
   */
  async searchLogs(pattern, options = {}) {
    const {
      logLevel = null,
      startDate = null,
      endDate = null,
      maxResults = 100
    } = options;

    const results = [];
    const logFiles = await fs.readdir(this.logDir);
    
    for (const file of logFiles) {
      if (!file.endsWith('.log')) continue;
      
      const filePath = path.join(this.logDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const logEntry = JSON.parse(line);
          
          // Apply filters
          if (logLevel && LOG_LEVELS[logEntry.level]?.value > LOG_LEVELS[logLevel]?.value) {
            continue;
          }
          
          if (startDate && new Date(logEntry.timestamp) < new Date(startDate)) {
            continue;
          }
          
          if (endDate && new Date(logEntry.timestamp) > new Date(endDate)) {
            continue;
          }
          
          // Search pattern
          const searchText = JSON.stringify(logEntry).toLowerCase();
          if (searchText.includes(pattern.toLowerCase())) {
            results.push(logEntry);
            
            if (results.length >= maxResults) {
              return results;
            }
          }
        } catch {
          // Skip invalid JSON lines
          continue;
        }
      }
    }
    
    return results;
  }

  /**
   * Export logs to external system
   */
  async exportLogs(format = 'json', options = {}) {
    const {
      startDate = null,
      endDate = null,
      logLevels = null,
      outputDir = path.join(this.logDir, 'exports')
    } = options;

    await fs.mkdir(outputDir, { recursive: true });
    
    const logs = await this.searchLogs('', {
      startDate,
      endDate,
      logLevel: logLevels ? Math.min(...logLevels.map(l => LOG_LEVELS[l]?.value || 999)) : null,
      maxResults: 10000
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `logs-export-${timestamp}.${format}`;
    const outputPath = path.join(outputDir, filename);

    if (format === 'json') {
      await fs.writeFile(outputPath, JSON.stringify(logs, null, 2));
    } else if (format === 'csv') {
      const csv = this.convertToCSV(logs);
      await fs.writeFile(outputPath, csv);
    } else if (format === 'ndjson') {
      const ndjson = logs.map(log => JSON.stringify(log)).join('\n');
      await fs.writeFile(outputPath, ndjson);
    }

    return outputPath;
  }

  /**
   * Convert logs to CSV format
   */
  convertToCSV(logs) {
    if (logs.length === 0) return '';
    
    const headers = ['timestamp', 'level', 'service', 'message', 'requestId', 'userId', 'context'];
    const csvLines = [headers.join(',')];
    
    for (const log of logs) {
      const row = headers.map(header => {
        const value = log[header] || '';
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvLines.push(row.join(','));
    }
    
    return csvLines.join('\n');
  }

  /**
   * Get log health metrics
   */
  async getHealthMetrics() {
    const stats = await this.getLogStats();
    const recentErrors = await this.searchLogs('', {
      logLevel: 'ERROR',
      startDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Last hour
      maxResults: 100
    });

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      logDirectory: this.logDir,
      totalFiles: stats.totalFiles,
      totalSize: stats.totalSize,
      recentErrorCount: recentErrors.length,
      oldestFile: stats.files.reduce((oldest, file) => 
        file.modified < oldest.modified ? file : oldest, stats.files[0]),
      newestFile: stats.files.reduce((newest, file) => 
        file.modified > newest.modified ? file : newest, stats.files[0]),
      retentionPolicy: this.retentionDays,
      maxFileSize: this.maxFileSize,
      compressionEnabled: this.compressionEnabled
    };
  }

  /**
   * Force immediate rotation of all logs
   */
  async forceRotation() {
    const logFiles = await fs.readdir(this.logDir);
    
    for (const file of logFiles) {
      if (file.endsWith('.log')) {
        await this.rotateLog(file);
      }
    }
    
    console.log('Forced rotation of all log files');
  }

  /**
   * Shutdown log manager
   */
  async shutdown() {
    // Clear any scheduled tasks
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    console.log('Log manager shut down');
  }
}

// Create singleton instance
export const logManager = new LogManager();

export default LogManager;
