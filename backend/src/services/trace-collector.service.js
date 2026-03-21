import { tracer } from '../utils/distributed-tracing.js';
import { logInfo, logWarning, logError } from '../config/structured-logger.js';
import fs from 'fs/promises';
import path from 'path';
import { hostname } from 'os';

/**
 * Trace Collector Service
 * 
 * Handles collection, aggregation, and export of trace data.
 * Supports multiple backends including file storage, external collectors,
 * and real-time streaming.
 */
class TraceCollectorService {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.exportInterval = options.exportInterval || 60000; // 1 minute
    this.maxTracesInMemory = options.maxTracesInMemory || 10000;
    this.exportFormats = options.exportFormats || ['json', 'jaeger'];
    this.exportPath = options.exportPath || path.join(process.cwd(), 'backend', 'src', 'traces');
    this.remoteCollector = options.remoteCollector || null;
    
    this.traceBuffer = [];
    this.exportTimer = null;
    this.statistics = {
      totalCollected: 0,
      totalExported: 0,
      exportErrors: 0,
      lastExport: null
    };
    
    if (this.enabled) {
      this.initialize();
    }
  }

  /**
   * Initialize the trace collector
   */
  async initialize() {
    try {
      await fs.mkdir(this.exportPath, { recursive: true });
      this.startExportTimer();
      
      logInfo('Trace collector initialized', {
        exportInterval: this.exportInterval,
        exportPath: this.exportPath,
        enabled: this.enabled
      });
    } catch (error) {
      logError('Failed to initialize trace collector', { error: error.message });
      throw error;
    }
  }

  /**
   * Collect a trace
   */
  collectTrace(traceData) {
    if (!this.enabled) return;

    const enrichedTrace = {
      ...traceData,
      collectedAt: Date.now(),
      serviceName: process.env.SERVICE_NAME || 'knowledge-sharing-backend',
      environment: process.env.NODE_ENV || 'development'
    };

    this.traceBuffer.push(enrichedTrace);
    this.statistics.totalCollected++;

    // Maintain buffer size
    if (this.traceBuffer.length > this.maxTracesInMemory) {
      this.traceBuffer = this.traceBuffer.slice(-Math.floor(this.maxTracesInMemory * 0.8));
    }

    // Log collection
    logInfo('Trace collected', {
      traceId: enrichedTrace.traceId,
      operation: enrichedTrace.operation,
      duration: enrichedTrace.duration,
      bufferSize: this.traceBuffer.length
    });
  }

  /**
   * Start the export timer
   */
  startExportTimer() {
    if (this.exportTimer) {
      clearInterval(this.exportTimer);
    }

    this.exportTimer = setInterval(async () => {
      try {
        await this.exportTraces();
      } catch (error) {
        logError('Trace export failed', { error: error.message });
        this.statistics.exportErrors++;
      }
    }, this.exportInterval);
  }

  /**
   * Export traces to configured backends
   */
  async exportTraces() {
    if (this.traceBuffer.length === 0) {
      return;
    }

    const tracesToExport = [...this.traceBuffer];
    this.traceBuffer = [];

    try {
      // Export to file
      if (this.exportFormats.includes('json')) {
        await this.exportToFile(tracesToExport, 'json');
      }

      if (this.exportFormats.includes('jaeger')) {
        await this.exportToJaeger(tracesToExport);
      }

      // Export to remote collector
      if (this.remoteCollector) {
        await this.exportToRemote(tracesToExport);
      }

      this.statistics.totalExported += tracesToExport.length;
      this.statistics.lastExport = new Date().toISOString();

      logInfo('Traces exported successfully', {
        count: tracesToExport.length,
        formats: this.exportFormats,
        totalExported: this.statistics.totalExported
      });

    } catch (error) {
      // Re-add traces to buffer on failure
      this.traceBuffer.unshift(...tracesToExport);
      throw error;
    }
  }

  /**
   * Export traces to JSON file
   */
  async exportToFile(traces, format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `traces-${timestamp}.${format}`;
    const filepath = path.join(this.exportPath, filename);

    let content;
    if (format === 'json') {
      content = JSON.stringify({
        metadata: {
          exportedAt: new Date().toISOString(),
          count: traces.length,
          serviceName: process.env.SERVICE_NAME,
          environment: process.env.NODE_ENV
        },
        traces
      }, null, 2);
    }

    await fs.writeFile(filepath, content);
    
    logInfo('Traces exported to file', {
      filepath,
      format,
      count: traces.length
    });
  }

  /**
   * Export traces in Jaeger format
   */
  async exportToJaeger(traces) {
    const jaegerData = this.convertToJaegerFormat(traces);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `jaeger-${timestamp}.json`;
    const filepath = path.join(this.exportPath, filename);

    await fs.writeFile(filepath, JSON.stringify(jaegerData, null, 2));
    
    logInfo('Traces exported in Jaeger format', {
      filepath,
      count: traces.length
    });
  }

  /**
   * Convert traces to Jaeger format
   */
  convertToJaegerFormat(traces) {
    const spans = traces.map(trace => ({
      traceID: trace.traceId,
      spanID: trace.spanId,
      parentSpanID: trace.parentSpanId || null,
      operationName: trace.operation,
      startTime: trace.startTime * 1000, // Convert to microseconds
      duration: (trace.duration || 0) * 1000, // Convert to microseconds
      tags: Object.entries(trace.tags || {}).map(([key, value]) => ({
        key,
        type: typeof value === 'string' ? 'string' : 'number',
        value: typeof value === 'string' ? value : String(value)
      })),
      logs: (trace.logs || []).map(log => ({
        timestamp: log.timestamp * 1000, // Convert to microseconds
        fields: Object.entries(log.attributes || {}).map(([key, value]) => ({
          key,
          type: typeof value === 'string' ? 'string' : 'number',
          value: typeof value === 'string' ? value : String(value)
        }))
      })),
      process: {
        serviceName: trace.serviceName,
        tags: [
          { key: 'environment', type: 'string', value: trace.environment },
          { key: 'hostname', type: 'string', value: hostname() }
        ]
      }
    }));

    return {
      data: [{
        traceID: traces[0]?.traceId,
        spans
      }]
    };
  }

  /**
   * Export traces to remote collector
   */
  async exportToRemote(traces) {
    if (!this.remoteCollector) {
      return;
    }

    const payload = {
      traces,
      metadata: {
        timestamp: new Date().toISOString(),
        serviceName: process.env.SERVICE_NAME,
        environment: process.env.NODE_ENV,
        count: traces.length
      }
    };

    const response = await fetch(this.remoteCollector, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Remote export failed: ${response.status} ${response.statusText}`);
    }

    logInfo('Traces exported to remote collector', {
      url: this.remoteCollector,
      count: traces.length
    });
  }

  /**
   * Get trace statistics
   */
  getStatistics() {
    return {
      ...this.statistics,
      bufferSize: this.traceBuffer.length,
      enabled: this.enabled,
      exportInterval: this.exportInterval,
      exportFormats: this.exportFormats
    };
  }

  /**
   * Query traces by criteria
   */
  async queryTraces(criteria = {}) {
    const {
      traceId,
      operation,
      serviceName,
      minDuration,
      maxDuration,
      startTime,
      endTime,
      limit = 100
    } = criteria;

    let filteredTraces = [...this.traceBuffer];

    // Apply filters
    if (traceId) {
      filteredTraces = filteredTraces.filter(trace => trace.traceId === traceId);
    }

    if (operation) {
      filteredTraces = filteredTraces.filter(trace => 
        trace.operation?.toLowerCase().includes(operation.toLowerCase())
      );
    }

    if (serviceName) {
      filteredTraces = filteredTraces.filter(trace => 
        trace.serviceName === serviceName
      );
    }

    if (minDuration) {
      filteredTraces = filteredTraces.filter(trace => 
        (trace.duration || 0) >= minDuration
      );
    }

    if (maxDuration) {
      filteredTraces = filteredTraces.filter(trace => 
        (trace.duration || 0) <= maxDuration
      );
    }

    if (startTime) {
      filteredTraces = filteredTraces.filter(trace => 
        trace.collectedAt >= new Date(startTime).getTime()
      );
    }

    if (endTime) {
      filteredTraces = filteredTraces.filter(trace => 
        trace.collectedAt <= new Date(endTime).getTime()
      );
    }

    // Sort by collected time (newest first)
    filteredTraces.sort((a, b) => b.collectedAt - a.collectedAt);

    // Apply limit
    return filteredTraces.slice(0, limit);
  }

  /**
   * Get trace by ID
   */
  async getTrace(traceId) {
    const trace = this.traceBuffer.find(t => t.traceId === traceId);
    if (!trace) {
      return null;
    }

    // Get related spans from the same trace
    const relatedSpans = this.traceBuffer.filter(t => t.traceId === traceId);
    
    return {
      traceId,
      spans: relatedSpans,
      trace: relatedSpans[0] // Main trace
    };
  }

  /**
   * Get trace analytics
   */
  getAnalytics(timeWindow = 3600000) { // Default 1 hour
    const now = Date.now();
    const windowStart = now - timeWindow;
    
    const recentTraces = this.traceBuffer.filter(trace => 
      trace.collectedAt >= windowStart
    );

    const analytics = {
      totalTraces: recentTraces.length,
      averageDuration: 0,
      slowestTrace: null,
      fastestTrace: null,
      operations: {},
      services: {},
      errors: 0,
      timeWindow
    };

    if (recentTraces.length === 0) {
      return analytics;
    }

    // Calculate metrics
    const durations = recentTraces.map(trace => trace.duration || 0);
    analytics.averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    
    const slowest = recentTraces.reduce((max, trace) => 
      (trace.duration || 0) > (max.duration || 0) ? trace : max
    );
    analytics.slowestTrace = slowest;
    
    const fastest = recentTraces.reduce((min, trace) => 
      (trace.duration || 0) < (min.duration || Infinity) ? trace : min
    );
    analytics.fastestTrace = fastest;

    // Operation breakdown
    recentTraces.forEach(trace => {
      const operation = trace.operation || 'unknown';
      analytics.operations[operation] = (analytics.operations[operation] || 0) + 1;
    });

    // Service breakdown
    recentTraces.forEach(trace => {
      const service = trace.serviceName || 'unknown';
      analytics.services[service] = (analytics.services[service] || 0) + 1;
    });

    // Error count
    analytics.errors = recentTraces.filter(trace => 
      trace.statusCode >= 400 || trace.tags?.error === true
    ).length;

    return analytics;
  }

  /**
   * Force immediate export
   */
  async forceExport() {
    if (this.traceBuffer.length === 0) {
      logInfo('No traces to export');
      return;
    }

    await this.exportTraces();
    logInfo('Force export completed');
  }

  /**
   * Clear trace buffer
   */
  clearBuffer() {
    const cleared = this.traceBuffer.length;
    this.traceBuffer = [];
    
    logInfo('Trace buffer cleared', { cleared });
    return cleared;
  }

  /**
   * Shutdown the trace collector
   */
  async shutdown() {
    if (this.exportTimer) {
      clearInterval(this.exportTimer);
      this.exportTimer = null;
    }

    // Export remaining traces
    if (this.traceBuffer.length > 0) {
      try {
        await this.exportTraces();
        logInfo('Final trace export completed on shutdown');
      } catch (error) {
        logError('Final trace export failed', { error: error.message });
      }
    }

    this.enabled = false;
    logInfo('Trace collector shut down');
  }
}

// Create singleton instance
export const traceCollector = new TraceCollectorService({
  enabled: process.env.TRACE_COLLECTOR_ENABLED !== 'false',
  exportInterval: parseInt(process.env.TRACE_EXPORT_INTERVAL) || 60000,
  maxTracesInMemory: parseInt(process.env.TRACE_MAX_MEMORY) || 10000,
  exportFormats: (process.env.TRACE_EXPORT_FORMATS || 'json,jaeger').split(','),
  exportPath: process.env.TRACE_EXPORT_PATH || path.join(process.cwd(), 'backend', 'src', 'traces'),
  remoteCollector: process.env.TRACE_REMOTE_COLLECTOR || null
});

export default TraceCollectorService;
