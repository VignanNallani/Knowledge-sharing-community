// Anomaly Detector - Production Nervous System
import EventEmitter from 'events';

class AnomalyDetector extends EventEmitter {
  constructor() {
    super();
    
    // Sliding window configuration
    this.windowSize = 5 * 60 * 1000; // 5 minutes
    this.baselineWindow = 60 * 60 * 1000; // 1 hour for baseline
    this.samples = [];
    this.baselineSamples = [];
    
    // Anomaly thresholds
    this.thresholds = {
      latency_deviation: 3,      // 3 standard deviations
      error_rate_spike: 5,        // 5x normal error rate
      throughput_drop: 0.5,       // 50% drop in throughput
      memory_spike: 2,           // 2x normal memory
      cpu_spike: 1.5              // 50% CPU spike
    };
    
    // Current state
    this.currentBaseline = {
      p50_latency: 0,
      p95_latency: 0,
      error_rate: 0,
      throughput: 0,
      memory_mb: 0,
      cpu_percent: 0
    };
    
    this.anomalyCount = 0;
    this.lastAnomaly = null;
  }

  // Record a single request measurement
  recordRequest(latency, statusCode, timestamp = Date.now()) {
    const isError = statusCode >= 500;
    const sample = {
      timestamp,
      latency,
      is_error: isError
    };
    
    this.samples.push(sample);
    this.cleanupOldSamples();
    
    // Check for anomalies on every request
    this.detectAnomalies();
  }

  // Remove samples outside window
  cleanupOldSamples() {
    const now = Date.now();
    const cutoff = now - this.windowSize;
    
    this.samples = this.samples.filter(s => s.timestamp > cutoff);
    this.baselineSamples = this.baselineSamples.filter(s => s.timestamp > (now - this.baselineWindow));
  }

  // Core anomaly detection logic
  detectAnomalies() {
    if (this.samples.length < 10) return; // Need minimum samples
    
    const currentMetrics = this.calculateCurrentMetrics();
    const anomalies = [];
    
    // 1. Ratio-based latency anomaly detection (better for long-tailed distributions)
    const latencyAnomaly = this.detectRatioBasedLatencyAnomaly(currentMetrics);
    if (latencyAnomaly) anomalies.push(latencyAnomaly);
    
    // 2. Error rate anomaly detection
    const errorAnomaly = this.detectErrorAnomaly(currentMetrics);
    if (errorAnomaly) anomalies.push(errorAnomaly);
    
    // 3. Throughput anomaly detection
    const throughputAnomaly = this.detectThroughputAnomaly(currentMetrics);
    if (throughputAnomaly) anomalies.push(throughputAnomaly);
    
    // 4. Resource anomaly detection
    const resourceAnomaly = this.detectResourceAnomaly(currentMetrics);
    if (resourceAnomaly) anomalies.push(resourceAnomaly);
    
    if (anomalies.length > 0) {
      this.handleAnomaly(anomalies);
    }
    
    // Update baseline gradually
    this.updateBaseline(currentMetrics);
  }

  detectRatioBasedLatencyAnomaly(metrics) {
    // Use ratio-based detection instead of sigma for long-tailed distributions
    const p95Ratio = metrics.p95_latency / this.currentBaseline.p95_latency;
    const p50Ratio = metrics.p50_latency / this.currentBaseline.p50_latency;
    
    // Thresholds based on ratios (more robust for latency)
    const p95Threshold = 1.4; // 40% increase in p95
    const p50Threshold = 1.6; // 50% increase in p50
    
    if (p95Ratio > p95Threshold) {
      return {
        type: 'latency_spike_p95',
        severity: this.calculateRatioSeverity(p95Ratio, p95Threshold),
        current: metrics.p95_latency,
        baseline: this.currentBaseline.p95_latency,
        ratio: p95Ratio,
        threshold: p95Threshold,
        method: 'ratio_based'
      };
    }
    
    if (p50Ratio > p50Threshold) {
      return {
        type: 'latency_spike_p50',
        severity: this.calculateRatioSeverity(p50Ratio, p50Threshold),
        current: metrics.p50_latency,
        baseline: this.currentBaseline.p50_latency,
        ratio: p50Ratio,
        threshold: p50Threshold,
        method: 'ratio_based'
      };
    }
    
    return null;
  }

  calculateRatioSeverity(currentRatio, threshold) {
    const excessRatio = currentRatio / threshold;
    if (excessRatio > 2.5) return 'critical';
    if (excessRatio > 2.0) return 'high';
    if (excessRatio > 1.5) return 'medium';
    return 'low';
  }

  detectErrorAnomaly(metrics) {
    // Use baseline error rate with minimum threshold
    const baselineErrorRate = Math.max(this.currentBaseline.error_rate, 0.001); // 0.1% minimum
    const errorThreshold = Math.max(baselineErrorRate * 5, 0.05); // 5x baseline or 5% minimum
    
    if (metrics.error_rate > errorThreshold && metrics.error_rate > 0.01) { // At least 1% errors
      return {
        type: 'error_rate_spike',
        severity: this.calculateRatioSeverity(metrics.error_rate / baselineErrorRate, 5),
        current: metrics.error_rate,
        baseline: this.currentBaseline.error_rate,
        ratio: metrics.error_rate / baselineErrorRate,
        threshold: errorThreshold
      };
    }
    
    return null;
  }

  detectThroughputAnomaly(metrics) {
    // Use ratio-based throughput detection
    const throughputRatio = metrics.throughput / this.currentBaseline.throughput;
    const throughputThreshold = 0.6; // 40% drop in throughput
    
    if (throughputRatio < throughputThreshold) {
      return {
        type: 'throughput_drop',
        severity: this.calculateRatioSeverity(1 / throughputRatio, 1 / throughputThreshold),
        current: metrics.throughput,
        baseline: this.currentBaseline.throughput,
        ratio: throughputRatio,
        threshold: throughputThreshold
      };
    }
    
    return null;
  }

  detectResourceAnomaly(metrics) {
    // This would integrate with system resource monitoring
    // For now, placeholder
    return null;
  }

  // Alternative: EWMA-based anomaly detection
  detectEWMABasedAnomaly(metrics) {
    const alpha = 0.1; // Smoothing factor
    const ewmaP95 = this.updateEWMA('p95', metrics.p95_latency, alpha);
    const ewmaP50 = this.updateEWMA('p50', metrics.p50_latency, alpha);
    
    // Compare current against EWMA
    const p95Deviation = Math.abs(metrics.p95_latency - ewmaP95) / ewmaP95;
    const p50Deviation = Math.abs(metrics.p50_latency - ewmaP50) / ewmaP50;
    
    const anomalies = [];
    
    if (p95Deviation > 0.3) { // 30% deviation from EWMA
      anomalies.push({
        type: 'ewma_latency_p95',
        severity: p95Deviation > 0.6 ? 'high' : 'medium',
        current: metrics.p95_latency,
        ewma: ewmaP95,
        deviation: p95Deviation
      });
    }
    
    if (p50Deviation > 0.4) { // 40% deviation from EWMA
      anomalies.push({
        type: 'ewma_latency_p50',
        severity: p50Deviation > 0.8 ? 'high' : 'medium',
        current: metrics.p50_latency,
        ewma: ewmaP50,
        deviation: p50Deviation
      });
    }
    
    return anomalies;
  }

  updateEWMA(metric, value, alpha) {
    const key = `ewma_${metric}`;
    if (!this.ewmaValues) this.ewmaValues = {};
    
    if (!this.ewmaValues[key]) {
      this.ewmaValues[key] = value;
    } else {
      this.ewmaValues[key] = alpha * value + (1 - alpha) * this.ewmaValues[key];
    }
    
    return this.ewmaValues[key];
  }

  // Alternative: Rolling quantile comparison
  detectRollingQuantileAnomaly(metrics) {
    const windowSize = 60; // 1 hour at 1-minute intervals
    const quantileWindow = this.baselineSamples.slice(-windowSize);
    
    if (quantileWindow.length < 30) return null; // Need enough data
    
    const p95History = quantileWindow.map(s => s.p95_latency);
    const p95HistoryMedian = this.percentile(p95History, 0.5);
    
    const ratio = metrics.p95_latency / p95HistoryMedian;
    const threshold = 1.3; // 30% increase over rolling median
    
    if (ratio > threshold) {
      return {
        type: 'rolling_quantile_anomaly',
        severity: this.calculateRatioSeverity(ratio, threshold),
        current: metrics.p95_latency,
        rolling_median: p95HistoryMedian,
        ratio: ratio,
        threshold: threshold,
        window_size: quantileWindow.length
      };
    }
    
    return null;
  }

  handleAnomaly(anomalies) {
    this.anomalyCount++;
    this.lastAnomaly = {
      timestamp: Date.now(),
      anomalies,
      count: this.anomalyCount
    };
    
    console.log('🚨 ANOMALY DETECTED:', anomalies);
    
    // Emit events for auto-healing
    this.emit('anomaly', {
      anomalies,
      severity: this.getOverallSeverity(anomalies),
      timestamp: this.lastAnomaly.timestamp
    });
    
    // Trigger auto-isolation for critical anomalies
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
    if (criticalAnomalies.length > 0) {
      this.emit('critical_anomaly', anomalies);
    }
  }

  getOverallSeverity(anomalies) {
    const severities = anomalies.map(a => a.severity);
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    return 'low';
  }

  updateBaseline(metrics) {
    // Exponential moving average for baseline
    const alpha = 0.1; // Learning rate
    
    Object.keys(metrics).forEach(key => {
      if (typeof metrics[key] === 'number') {
        this.currentBaseline[key] = (this.currentBaseline[key] * (1 - alpha)) + (metrics[key] * alpha);
      }
    });
    
    // Store baseline sample
    this.baselineSamples.push({
      timestamp: Date.now(),
      ...this.currentBaseline
    });
  }

  // Statistics helper
  percentile(arr, p) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  standardDeviation(arr) {
    const mean = arr.reduce((a, b) => a + b) / arr.length;
    const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }

  // Get current status for monitoring
  getStatus() {
    return {
      anomaly_count: this.anomalyCount,
      last_anomaly: this.lastAnomaly,
      current_baseline: this.currentBaseline,
      sample_count: this.samples.length,
      window_size_ms: this.windowSize
    };
  }
}

export default AnomalyDetector;
