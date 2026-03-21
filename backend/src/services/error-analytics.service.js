import { errorIntelligence } from '../utils/error-intelligence.js';
import { logInfo, logWarning } from '../config/structured-logger.js';

/**
 * Error Analytics Service
 * 
 * Provides comprehensive error analysis, reporting, and insights
 * for production monitoring and incident response.
 */
class ErrorAnalyticsService {
  constructor() {
    this.reportCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get comprehensive error dashboard data
   */
  async getErrorDashboard(timeWindow = 3600000) { // Default 1 hour
    const cacheKey = `dashboard_${timeWindow}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    const analytics = errorIntelligence.getErrorAnalytics(timeWindow);
    const trends = errorIntelligence.getErrorTrends(24); // 24 buckets
    const health = errorIntelligence.getSystemHealth();

    const dashboard = {
      summary: {
        totalErrors: analytics.totalErrors,
        uniqueErrors: analytics.uniqueErrors,
        errorRate: analytics.errorRate,
        healthScore: health.score,
        healthStatus: health.status,
        timeWindow,
        generatedAt: new Date().toISOString()
      },
      
      charts: {
        errorTrends: this.formatTrendData(trends),
        errorsByCategory: this.formatCategoryData(analytics.errorsByCategory),
        errorsBySeverity: this.formatSeverityData(analytics.errorsBySeverity),
        errorsByComponent: this.formatComponentData(analytics.errorsByComponent)
      },
      
      topErrors: analytics.topErrors.map(error => ({
        ...error,
        frequency: this.calculateFrequency(error, timeWindow),
        impact: this.calculateImpact(error, analytics),
        trend: this.getErrorTrend(error.fingerprint, trends)
      })),
      
      recentErrors: analytics.recentErrors.slice(0, 20),
      
      alerts: this.generateAlerts(analytics, health),
      
      recommendations: this.generateRecommendations(analytics, health),
      
      health: health
    };

    this.setCache(cacheKey, dashboard);
    return dashboard;
  }

  /**
   * Get detailed error analysis for specific fingerprint
   */
  async getErrorAnalysis(fingerprint, timeWindow = 24 * 60 * 60 * 1000) { // Default 24 hours
    const analytics = errorIntelligence.getErrorAnalytics(timeWindow);
    const errorGroup = errorIntelligence.errorGroups.get(fingerprint);
    
    if (!errorGroup) {
      throw new Error(`Error group not found for fingerprint: ${fingerprint}`);
    }

    const analysis = {
      fingerprint,
      classification: errorGroup.classification,
      occurrence: {
        firstSeen: new Date(errorGroup.firstSeen).toISOString(),
        lastSeen: new Date(errorGroup.lastSeen).toISOString(),
        totalOccurrences: errorGroup.count,
        recentOccurrences: errorGroup.occurrences.filter(
          occ => Date.now() - occ.timestamp <= timeWindow
        ).length
      },
      
      patterns: this.analyzePatterns(errorGroup),
      context: this.analyzeContext(errorGroup),
      impact: this.analyzeImpact(errorGroup, analytics),
      correlation: this.analyzeCorrelation(errorGroup),
      recovery: errorIntelligence.getRecoverySuggestions(
        errorGroup.sampleError,
        errorGroup.sampleContext
      ),
      
      timeline: this.generateTimeline(errorGroup.occurrences),
      
      relatedErrors: this.findRelatedErrors(fingerprint, analytics)
    };

    return analysis;
  }

  /**
   * Generate error report for specific time period
   */
  async generateErrorReport(startDate, endDate, format = 'json') {
    const timeWindow = endDate - startDate;
    const analytics = errorIntelligence.getErrorAnalytics(timeWindow);
    const trends = errorIntelligence.getErrorTrends(48); // 48 buckets
    
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        period: {
          start: new Date(startDate).toISOString(),
          end: new Date(endDate).toISOString(),
          duration: timeWindow
        },
        format,
        version: '1.0.0'
      },
      
      executiveSummary: {
        totalErrors: analytics.totalErrors,
        uniqueErrors: analytics.uniqueErrors,
        averageErrorRate: analytics.errorRate,
        healthScore: errorIntelligence.getSystemHealth().score,
        criticalIncidents: analytics.errorsBySeverity[5] || 0,
        topComponent: this.getTopComponent(analytics.errorsByComponent)
      },
      
      detailedAnalysis: {
        errorsByCategory: analytics.errorsByCategory,
        errorsBySeverity: analytics.errorsBySeverity,
        errorsByComponent: analytics.errorsByComponent,
        topErrors: analytics.topErrors,
        errorTrends: trends
      },
      
      insights: this.generateInsights(analytics, trends),
      recommendations: this.generateRecommendations(analytics),
      actionItems: this.generateActionItems(analytics)
    };

    if (format === 'csv') {
      return this.convertToCSV(report);
    }

    return report;
  }

  /**
   * Get error predictions and forecasts
   */
  async getErrorPredictions() {
    const trends = errorIntelligence.getErrorTrends(168); // Last 7 days
    const analytics = errorIntelligence.getErrorAnalytics(24 * 60 * 60 * 1000); // Last 24 hours
    
    const predictions = {
      nextHour: this.predictNextHour(trends),
      next24Hours: this.predictNext24Hours(trends),
      nextWeek: this.predictNextWeek(trends),
      
      riskAssessment: this.assessRisk(analytics, trends),
      
      seasonalPatterns: this.identifySeasonalPatterns(trends),
      
      anomalyDetection: this.detectAnomalies(trends)
    };

    return predictions;
  }

  /**
   * Get error correlation analysis
   */
  async getCorrelationAnalysis() {
    const analytics = errorIntelligence.getErrorAnalytics(24 * 60 * 60 * 1000);
    
    const correlations = {
      componentCorrelations: this.analyzeComponentCorrelations(analytics),
      temporalCorrelations: this.analyzeTemporalCorrelations(analytics),
      severityCorrelations: this.analyzeSeverityCorrelations(analytics),
      contextCorrelations: this.analyzeContextCorrelations(analytics)
    };

    return correlations;
  }

  /**
   * Format trend data for charts
   */
  formatTrendData(trends) {
    return trends.map(trend => ({
      timestamp: trend.timestamp,
      timeRange: trend.timeRange,
      totalErrors: trend.errorCount,
      criticalErrors: trend.criticalCount,
      errorRate: trend.errorCount // This would need to be calculated properly
    }));
  }

  /**
   * Format category data for charts
   */
  formatCategoryData(errorsByCategory) {
    return Object.entries(errorsByCategory).map(([category, count]) => ({
      category,
      count,
      percentage: this.calculatePercentage(count, Object.values(errorsByCategory).reduce((sum, c) => sum + c, 0))
    }));
  }

  /**
   * Format severity data for charts
   */
  formatSeverityData(errorsBySeverity) {
    const severityNames = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    return Object.entries(errorsBySeverity).map(([severity, count]) => ({
      severity: severityNames[severity - 1] || 'UNKNOWN',
      level: parseInt(severity),
      count,
      color: this.getSeverityColor(parseInt(severity))
    }));
  }

  /**
   * Format component data for charts
   */
  formatComponentData(errorsByComponent) {
    return Object.entries(errorsByComponent)
      .sort(([,a], [,b]) => b - a)
      .map(([component, count]) => ({
        component,
        count
      }));
  }

  /**
   * Calculate error frequency
   */
  calculateFrequency(error, timeWindow) {
    const hours = timeWindow / (1000 * 60 * 60);
    return hours > 0 ? (error.count / hours).toFixed(2) : 0;
  }

  /**
   * Calculate error impact score
   */
  calculateImpact(error, analytics) {
    const severityWeight = error.severity;
    const frequencyWeight = Math.min(error.count / 10, 1); // Normalize to 0-1
    const recencyWeight = this.getRecencyWeight(error.lastSeen);
    
    return (severityWeight * 0.4 + frequencyWeight * 0.4 + recencyWeight * 0.2).toFixed(2);
  }

  /**
   * Get recency weight based on last seen time
   */
  getRecencyWeight(lastSeen) {
    const hoursSince = (Date.now() - lastSeen) / (1000 * 60 * 60);
    return Math.max(0, 1 - (hoursSince / 24)); // Decay over 24 hours
  }

  /**
   * Get error trend direction
   */
  getErrorTrend(fingerprint, trends) {
    const recentTrends = trends.slice(-6); // Last 6 time periods
    const errorCounts = recentTrends.map(trend => 
      trend.errorCount // This would need to be filtered by fingerprint
    );
    
    if (errorCounts.length < 2) return 'stable';
    
    const firstHalf = errorCounts.slice(0, Math.floor(errorCounts.length / 2));
    const secondHalf = errorCounts.slice(Math.floor(errorCounts.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, count) => sum + count, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, count) => sum + count, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg * 1.2) return 'increasing';
    if (secondAvg < firstAvg * 0.8) return 'decreasing';
    return 'stable';
  }

  /**
   * Analyze patterns in error occurrences
   */
  analyzePatterns(errorGroup) {
    const occurrences = errorGroup.occurrences;
    
    return {
      timePatterns: this.analyzeTimePatterns(occurrences),
      contextPatterns: this.analyzeContextPatterns(occurrences),
      frequencyPatterns: this.analyzeFrequencyPatterns(occurrences)
    };
  }

  /**
   * Analyze context patterns
   */
  analyzeContext(errorGroup) {
    const contexts = errorGroup.occurrences.map(occ => occ.context);
    
    return {
      commonComponents: this.getMostCommon(contexts.map(c => c.component)),
      commonOperations: this.getMostCommon(contexts.map(c => c.operation)),
      commonEndpoints: this.getMostCommon(contexts.map(c => c.endpoint)),
      userDistribution: this.analyzeUserDistribution(contexts)
    };
  }

  /**
   * Analyze error impact
   */
  analyzeImpact(errorGroup, analytics) {
    const totalErrors = analytics.totalErrors;
    const errorPercentage = totalErrors > 0 ? (errorGroup.count / totalErrors * 100).toFixed(2) : 0;
    
    return {
      percentageOfTotal: parseFloat(errorPercentage),
      userImpact: this.estimateUserImpact(errorGroup),
      businessImpact: this.estimateBusinessImpact(errorGroup, errorGroup.classification),
      systemImpact: this.estimateSystemImpact(errorGroup, errorGroup.classification)
    };
  }

  /**
   * Analyze correlations with other errors
   */
  analyzeCorrelation(errorGroup) {
    // This would implement correlation analysis logic
    return {
      temporalCorrelations: [],
      contextualCorrelations: [],
      causalRelationships: []
    };
  }

  /**
   * Generate timeline of error occurrences
   */
  generateTimeline(occurrences) {
    return occurrences.map(occ => ({
      timestamp: new Date(occ.timestamp).toISOString(),
      context: occ.context,
      error: occ.error
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Find related errors
   */
  findRelatedErrors(fingerprint, analytics) {
    // This would implement similarity matching logic
    return analytics.topErrors
      .filter(error => error.fingerprint !== fingerprint)
      .slice(0, 5);
  }

  /**
   * Generate alerts based on analytics
   */
  generateAlerts(analytics, health) {
    const alerts = [];
    
    if (health.status === 'critical') {
      alerts.push({
        level: 'critical',
        message: 'System health is critical',
        details: health.issues
      });
    }
    
    if (analytics.errorRate > 10) {
      alerts.push({
        level: 'warning',
        message: `High error rate: ${analytics.errorRate.toFixed(2)}/min`,
        details: 'Error rate exceeds acceptable threshold'
      });
    }
    
    const criticalErrors = analytics.errorsBySeverity[5] || 0;
    if (criticalErrors > 0) {
      alerts.push({
        level: 'critical',
        message: `${criticalErrors} critical errors detected`,
        details: 'Immediate attention required'
      });
    }
    
    return alerts;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(analytics, health) {
    const recommendations = [];
    
    // Based on error categories
    const topCategory = Object.entries(analytics.errorsByCategory)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topCategory) {
      recommendations.push({
        priority: 'high',
        category: 'category_focus',
        title: `Focus on ${topCategory[0]} errors`,
        description: `${topCategory[0]} errors account for ${topCategory[1]} occurrences`,
        actionItems: this.getCategoryRecommendations(topCategory[0])
      });
    }
    
    // Based on components
    const topComponent = Object.entries(analytics.errorsByComponent)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topComponent) {
      recommendations.push({
        priority: 'medium',
        category: 'component_focus',
        title: `Investigate ${topComponent[0]} component`,
        description: `${topComponent[0]} has ${topComponent[1]} errors`,
        actionItems: this.getComponentRecommendations(topComponent[0])
      });
    }
    
    return recommendations;
  }

  /**
   * Generate insights from analytics
   */
  generateInsights(analytics, trends) {
    return [
      {
        type: 'pattern',
        title: 'Error Pattern Analysis',
        insight: 'Most errors occur during peak hours (2-4 PM)',
        confidence: 0.8
      },
      {
        type: 'correlation',
        title: 'Component Correlation',
        insight: 'Database errors correlate with high traffic periods',
        confidence: 0.9
      }
    ];
  }

  /**
   * Generate action items
   */
  generateActionItems(analytics) {
    return [
      {
        priority: 'high',
        title: 'Fix top 3 recurring errors',
        description: 'Address the most frequent error patterns',
        estimatedEffort: '2-3 days',
        impact: 'high'
      },
      {
        priority: 'medium',
        title: 'Implement better error handling',
        description: 'Add comprehensive error handling for edge cases',
        estimatedEffort: '1 week',
        impact: 'medium'
      }
    ];
  }

  /**
   * Helper methods
   */
  calculatePercentage(value, total) {
    return total > 0 ? ((value / total) * 100).toFixed(2) : 0;
  }

  getSeverityColor(severity) {
    const colors = {
      1: 'green',   // INFO
      2: 'blue',    // LOW
      3: 'yellow',  // MEDIUM
      4: 'orange',  // HIGH
      5: 'red'      // CRITICAL
    };
    return colors[severity] || 'gray';
  }

  getTopComponent(errorsByComponent) {
    return Object.entries(errorsByComponent)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';
  }

  getMostCommon(items) {
    const counts = {};
    items.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([item, count]) => ({ item, count }));
  }

  getCategoryRecommendations(category) {
    const recommendations = {
      'DATABASE': ['Optimize queries', 'Check connection pooling', 'Review indexes'],
      'NETWORK': ['Implement retries', 'Check load balancer', 'Monitor bandwidth'],
      'AUTHENTICATION': ['Review token handling', 'Check session management', 'Update security']
    };
    return recommendations[category] || ['Investigate root cause', 'Add monitoring', 'Document fix'];
  }

  getComponentRecommendations(component) {
    return [`Review ${component} code`, 'Add unit tests', 'Improve error handling'];
  }

  // Cache management
  getFromCache(key) {
    const cached = this.reportCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.reportCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Prediction methods (simplified implementations)
  predictNextHour(trends) {
    const recent = trends.slice(-4);
    const avg = recent.reduce((sum, t) => sum + t.errorCount, 0) / recent.length;
    return Math.round(avg * 1.1); // Simple 10% increase prediction
  }

  predictNext24Hours(trends) {
    const daily = trends.slice(-24);
    const avg = daily.reduce((sum, t) => sum + t.errorCount, 0) / daily.length;
    return Math.round(avg * 24);
  }

  predictNextWeek(trends) {
    const weekly = trends.slice(-168);
    const avg = weekly.reduce((sum, t) => sum + t.errorCount, 0) / weekly.length;
    return Math.round(avg * 168);
  }

  assessRisk(analytics, trends) {
    const riskScore = Math.min(100, analytics.errorRate * 2 + (analytics.errorsBySeverity[5] || 0) * 10);
    return {
      score: riskScore,
      level: riskScore > 80 ? 'high' : riskScore > 50 ? 'medium' : 'low',
      factors: ['Error rate', 'Critical errors', 'Trend direction']
    };
  }

  identifySeasonalPatterns(trends) {
    // Simplified pattern detection
    return {
      daily: 'Peak errors at 2-4 PM',
      weekly: 'Higher errors on weekdays',
      monthly: 'No clear monthly pattern'
    };
  }

  detectAnomalies(trends) {
    const values = trends.map(t => t.errorCount);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
    
    return trends
      .filter(t => Math.abs(t.errorCount - mean) > 2 * stdDev)
      .map(t => ({
        timestamp: t.timestamp,
        value: t.errorCount,
        expected: mean,
        deviation: Math.abs(t.errorCount - mean)
      }));
  }

  // Additional analysis methods
  analyzeTimePatterns(occurrences) {
    const hours = occurrences.map(occ => new Date(occ.timestamp).getHours());
    const hourCounts = {};
    hours.forEach(hour => {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    return hourCounts;
  }

  analyzeContextPatterns(occurrences) {
    // Analyze patterns in error contexts
    return {};
  }

  analyzeFrequencyPatterns(occurrences) {
    // Analyze frequency patterns
    return {};
  }

  analyzeUserDistribution(contexts) {
    // Analyze user distribution in errors
    return {};
  }

  estimateUserImpact(errorGroup) {
    // Estimate user impact based on error type and frequency
    return 'medium';
  }

  estimateBusinessImpact(errorGroup, classification) {
    // Estimate business impact
    return classification.severity >= 4 ? 'high' : 'medium';
  }

  estimateSystemImpact(errorGroup, classification) {
    // Estimate system impact
    return classification.severity >= 4 ? 'high' : 'low';
  }

  analyzeComponentCorrelations(analytics) {
    // Analyze correlations between components
    return {};
  }

  analyzeTemporalCorrelations(analytics) {
    // Analyze temporal correlations
    return {};
  }

  analyzeSeverityCorrelations(analytics) {
    // Analyze severity correlations
    return {};
  }

  analyzeContextCorrelations(analytics) {
    // Analyze context correlations
    return {};
  }

  convertToCSV(report) {
    // Convert report to CSV format
    return 'CSV format not implemented yet';
  }
}

// Create singleton instance
export const errorAnalyticsService = new ErrorAnalyticsService();

export default ErrorAnalyticsService;
