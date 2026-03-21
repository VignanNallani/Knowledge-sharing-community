import { logger } from '../config/index.js';
import environmentValidation from '../config/environmentValidation.js';
import DeploymentReadiness from '../deployment/deploymentReadiness.js';
import APIMaturity from '../api/apiMaturity.js';
import SecurityAudit from '../security/securityAudit.js';
import { PerformanceMonitor } from '../utils/performanceMonitor.js';
import databaseService from '../config/database.js';
import { cacheService } from '../cache/cache.service.js';
import { writeFileSync } from 'fs';

/**
 * Production Readiness Validator
 * Comprehensive final validation for production deployment
 */
export class ProductionReadiness {
  constructor() {
    this.validationResults = {
      environment: null,
      deployment: null,
      api: null,
      security: null,
      performance: null,
      database: null,
      cache: null
    };
    
    this.overallScore = 0;
    this.maxScore = 100;
    this.readinessLevel = 'not_ready';
  }

  /**
   * Perform comprehensive production readiness validation
   */
  async performValidation() {
    logger.info('Starting comprehensive production readiness validation');
    
    try {
      // Run all validation modules
      await Promise.all([
        this.validateEnvironment(),
        this.validateDeployment(),
        this.validateAPI(),
        this.validateSecurity(),
        this.validatePerformance(),
        this.validateDatabase(),
        this.validateCache()
      ]);
      
      // Calculate overall readiness score
      this.calculateOverallScore();
      
      // Generate comprehensive report
      const report = this.generateProductionReadinessReport();
      
      logger.info('Production readiness validation completed', {
        overallScore: this.overallScore,
        readinessLevel: this.readinessLevel,
        isReady: this.overallScore >= 80
      });

      return report;
      
    } catch (error) {
      logger.error('Production readiness validation failed:', error);
      throw error;
    }
  }

  /**
   * Validate environment configuration
   */
  async validateEnvironment() {
    logger.info('Validating environment configuration');
    
    const envValidation = environmentValidation.validate();
    
    this.validationResults.environment = {
      score: envValidation.valid ? 100 : 0,
      status: envValidation.valid ? 'ready' : 'not_ready',
      issues: envValidation.errors,
      warnings: envValidation.warnings,
      details: envValidation
    };
  }

  /**
   * Validate deployment readiness
   */
  async validateDeployment() {
    logger.info('Validating deployment readiness');
    
    const deploymentReadiness = new DeploymentReadiness();
    const deploymentReport = await deploymentReadiness.performReadinessCheck();
    
    this.validationResults.deployment = {
      score: deploymentReport.readinessScore,
      status: deploymentReport.isReady ? 'ready' : 'not_ready',
      issues: deploymentReport.checks.filter(c => c.status === 'fail'),
      warnings: deploymentReport.checks.filter(c => c.status === 'warn'),
      details: deploymentReport
    };
  }

  /**
   * Validate API maturity
   */
  async validateAPI() {
    logger.info('Validating API maturity');
    
    const apiMaturity = new APIMaturity();
    const apiReport = await apiMaturity.performMaturityCheck();
    
    this.validationResults.api = {
      score: apiReport.maturityScore,
      status: apiReport.isMature ? 'ready' : 'not_ready',
      issues: apiReport.issues.filter(i => i.status === 'fail'),
      warnings: apiReport.issues.filter(i => i.severity === 'low'),
      details: apiReport
    };
  }

  /**
   * Validate security implementation
   */
  async validateSecurity() {
    logger.info('Validating security implementation');
    
    const securityAudit = new SecurityAudit();
    const securityReport = await securityAudit.performAudit();
    
    this.validationResults.security = {
      score: securityReport.complianceScore,
      status: securityReport.complianceScore >= 80 ? 'ready' : 'not_ready',
      issues: securityReport.vulnerabilities,
      warnings: securityReport.recommendations.filter(r => r.priority === 'low'),
      details: securityReport
    };
  }

  /**
   * Validate performance characteristics
   */
  async validatePerformance() {
    logger.info('Validating performance characteristics');
    
    const performanceReport = PerformanceMonitor.generateReport();
    const slowOperations = performanceReport.slowOperations || [];
    const highErrorOperations = performanceReport.highErrorOperations || [];
    
    let score = 100;
    let status = 'ready';
    
    if (slowOperations.length > 0) {
      score -= Math.min(slowOperations.length * 10, 30);
    }
    
    if (highErrorOperations.length > 0) {
      score -= Math.min(highErrorOperations.length * 15, 40);
    }
    
    if (score < 70) {
      status = 'not_ready';
    } else if (score < 85) {
      status = 'caution';
    }
    
    this.validationResults.performance = {
      score: Math.max(score, 0),
      status,
      issues: [
        ...slowOperations.map(op => ({ type: 'slow_operation', operation: op.operation, severity: 'medium' })),
        ...highErrorOperations.map(op => ({ type: 'high_error_rate', operation: op.operation, severity: 'high' }))
      ],
      warnings: [],
      details: performanceReport
    };
  }

  /**
   * Validate database connectivity and performance
   */
  async validateDatabase() {
    logger.info('Validating database connectivity and performance');
    
    try {
      const dbHealth = await databaseService.healthCheck();
      const dbStats = await databaseService.getConnectionStats();
      
      let score = 100;
      let status = 'ready';
      const issues = [];
      
      if (dbHealth.status !== 'healthy') {
        score -= 50;
        status = 'not_ready';
        issues.push({
          type: 'connectivity_issue',
          message: 'Database health check failed',
          severity: 'critical'
        });
      }
      
      // Check connection pool
      if (!dbStats || dbStats.total_connections === 0) {
        score -= 20;
        issues.push({
          type: 'no_connections',
          message: 'No active database connections',
          severity: 'high'
        });
      }
      
      // Check for too many connections
      if (dbStats && dbStats.total_connections > 80) {
        score -= 10;
        issues.push({
          type: 'high_connection_count',
          message: 'High number of database connections',
          severity: 'medium'
        });
      }
      
      this.validationResults.database = {
        score: Math.max(score, 0),
        status,
        issues,
        warnings: [],
        details: {
          health: dbHealth,
          connections: dbStats
        }
      };
      
    } catch (error) {
      this.validationResults.database = {
        score: 0,
        status: 'not_ready',
        issues: [{
          type: 'connection_error',
          message: error.message,
          severity: 'critical'
        }],
        warnings: [],
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate cache functionality
   */
  async validateCache() {
    logger.info('Validating cache functionality');
    
    try {
      const cacheStats = await cacheService.getStats();
      const isRedisAvailable = cacheStats && (cacheStats.connected || cacheStats.dbSize !== undefined);
      
      let score = 100;
      let status = 'ready';
      const issues = [];
      
      if (!isRedisAvailable) {
        score -= 30;
        status = 'caution';
        issues.push({
          type: 'redis_unavailable',
          message: 'Redis not available, using memory cache fallback',
          severity: 'medium'
        });
      }
      
      // Test cache operations
      const testKey = 'production_readiness_test';
      await cacheService.set(testKey, { test: true, timestamp: Date.now() }, 5000);
      const retrieved = await cacheService.get(testKey);
      await cacheService.delete(testKey);
      
      if (!retrieved || retrieved.test !== true) {
        score -= 40;
        status = 'not_ready';
        issues.push({
          type: 'cache_operations_failed',
          message: 'Cache read/write operations failed',
          severity: 'high'
        });
      }
      
      this.validationResults.cache = {
        score: Math.max(score, 0),
        status,
        issues,
        warnings: [],
        details: {
          stats: cacheStats,
          type: isRedisAvailable ? 'Redis' : 'Memory',
          operationsWorking: retrieved && retrieved.test === true
        }
      };
      
    } catch (error) {
      this.validationResults.cache = {
        score: 0,
        status: 'not_ready',
        issues: [{
          type: 'cache_error',
          message: error.message,
          severity: 'high'
        }],
        warnings: [],
        details: { error: error.message }
      };
    }
  }

  /**
   * Calculate overall production readiness score
   */
  calculateOverallScore() {
    const weights = {
      environment: 20,
      deployment: 20,
      api: 20,
      security: 25,
      performance: 10,
      database: 10,
      cache: 5
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [category, result] of Object.entries(this.validationResults)) {
      if (result) {
        totalScore += (result.score / 100) * weights[category];
        totalWeight += weights[category];
      }
    }
    
    this.overallScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
    
    // Determine readiness level
    if (this.overallScore >= 95) {
      this.readinessLevel = 'excellent';
    } else if (this.overallScore >= 85) {
      this.readinessLevel = 'production_ready';
    } else if (this.overallScore >= 70) {
      this.readinessLevel = 'ready_with_concerns';
    } else if (this.overallScore >= 50) {
      this.readinessLevel = 'needs_improvements';
    } else {
      this.readinessLevel = 'not_ready';
    }
  }

  /**
   * Generate comprehensive production readiness report
   */
  generateProductionReadinessReport() {
    const criticalIssues = this.getAllCriticalIssues();
    const highIssues = this.getAllHighIssues();
    const allIssues = this.getAllIssues();
    
    return {
      timestamp: new Date().toISOString(),
      overallScore: this.overallScore,
      maxScore: this.maxScore,
      readinessLevel: this.readinessLevel,
      isProductionReady: this.overallScore >= 80,
      summary: {
        totalIssues: allIssues.length,
        criticalIssues: criticalIssues.length,
        highIssues: highIssues.length,
        categoriesWithIssues: this.getCategoriesWithIssues()
      },
      categoryResults: this.validationResults,
      recommendations: this.generateRecommendations(),
      deploymentChecklist: this.generateDeploymentChecklist(),
      nextSteps: this.generateNextSteps(),
      finalAssessment: this.generateFinalAssessment()
    };
  }

  /**
   * Get all critical issues
   */
  getAllCriticalIssues() {
    const criticalIssues = [];
    
    for (const result of Object.values(this.validationResults)) {
      if (result && result.issues) {
        criticalIssues.push(...result.issues.filter(i => i.severity === 'critical'));
      }
    }
    
    return criticalIssues;
  }

  /**
   * Get all high priority issues
   */
  getAllHighIssues() {
    const highIssues = [];
    
    for (const result of Object.values(this.validationResults)) {
      if (result && result.issues) {
        highIssues.push(...result.issues.filter(i => i.severity === 'high'));
      }
    }
    
    return highIssues;
  }

  /**
   * Get all issues
   */
  getAllIssues() {
    const allIssues = [];
    
    for (const result of Object.values(this.validationResults)) {
      if (result && result.issues) {
        allIssues.push(...result.issues);
      }
    }
    
    return allIssues;
  }

  /**
   * Get categories with issues
   */
  getCategoriesWithIssues() {
    const categoriesWithIssues = {};
    
    for (const [category, result] of Object.entries(this.validationResults)) {
      if (result && result.issues && result.issues.length > 0) {
        categoriesWithIssues[category] = {
          score: result.score,
          status: result.status,
          issueCount: result.issues.length
        };
      }
    }
    
    return categoriesWithIssues;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const criticalIssues = this.getAllCriticalIssues();
    const highIssues = this.getAllHighIssues();
    
    if (criticalIssues.length > 0) {
      recommendations.push({
        priority: 'critical',
        message: 'Address all critical issues before production deployment',
        action: 'Block deployment until critical issues are resolved',
        estimatedTime: '2-4 hours'
      });
    }
    
    if (highIssues.length > 0) {
      recommendations.push({
        priority: 'high',
        message: 'Resolve high-priority issues for production readiness',
        action: 'Schedule immediate fix for high-priority issues',
        estimatedTime: '4-8 hours'
      });
    }
    
    // Category-specific recommendations
    for (const [category, result] of Object.entries(this.validationResults)) {
      if (result && result.score < 80) {
        recommendations.push({
          priority: 'medium',
          message: `Improve ${category} configuration`,
          action: `Review and address ${category} issues`,
          category
        });
      }
    }
    
    // General recommendations
    recommendations.push({
      priority: 'low',
      message: 'Set up automated production readiness checks in CI/CD pipeline',
      action: 'Integrate readiness validation into deployment process'
    });
    
    return recommendations;
  }

  /**
   * Generate deployment checklist
   */
  generateDeploymentChecklist() {
    return {
      preDeployment: [
        'All critical issues resolved',
        'Environment variables validated',
        'Database connectivity confirmed',
        'Cache functionality verified',
        'Security audit passed',
        'API maturity achieved',
        'Performance benchmarks met',
        'Backup strategy in place',
        'Monitoring configured',
        'Rollback plan ready'
      ],
      postDeployment: [
        'Health checks passing',
        'Metrics collection active',
        'Error monitoring functional',
        'Performance within acceptable ranges',
        'Security headers present',
        'Rate limiting effective',
        'Database connections stable',
        'Cache hit rate acceptable',
        'API responses consistent',
        'Load balancer configured (if applicable)',
        'SSL certificate valid (if applicable)'
      ]
    };
  }

  /**
   * Generate next steps
   */
  generateNextSteps() {
    const steps = [];
    
    if (this.overallScore < 80) {
      steps.push('Address remaining issues to achieve production readiness');
      steps.push('Re-run validation after fixes are applied');
    } else {
      steps.push('Proceed with production deployment');
      steps.push('Monitor system closely after deployment');
      steps.push('Schedule regular readiness assessments');
    }
    
    steps.push('Implement automated readiness validation in CI/CD');
    steps.push('Document production deployment procedures');
    steps.push('Set up production monitoring and alerting');
    
    return steps;
  }

  /**
   * Generate final assessment
   */
  generateFinalAssessment() {
    const criticalIssues = this.getAllCriticalIssues();
    const highIssues = this.getAllHighIssues();
    
    let assessment = 'NOT_READY';
    let confidence = 'LOW';
    
    if (criticalIssues.length === 0 && highIssues.length === 0 && this.overallScore >= 90) {
      assessment = 'PRODUCTION_READY';
      confidence = 'HIGH';
    } else if (criticalIssues.length === 0 && highIssues.length <= 2 && this.overallScore >= 80) {
      assessment = 'READY_WITH_CAUTIONS';
      confidence = 'MEDIUM';
    } else if (this.overallScore >= 60) {
      assessment = 'NEEDS_IMPROVEMENTS';
      confidence = 'MEDIUM';
    }
    
    return {
      assessment,
      confidence,
      riskLevel: this.calculateRiskLevel(),
      deploymentRecommendation: this.getDeploymentRecommendation()
    };
  }

  /**
   * Calculate risk level
   */
  calculateRiskLevel() {
    const criticalIssues = this.getAllCriticalIssues();
    const highIssues = this.getAllHighIssues();
    
    if (criticalIssues.length > 0) {
      return 'HIGH';
    } else if (highIssues.length > 3) {
      return 'MEDIUM';
    } else if (highIssues.length > 0) {
      return 'LOW';
    }
    
    return 'MINIMAL';
  }

  /**
   * Get deployment recommendation
   */
  getDeploymentRecommendation() {
    if (this.overallScore >= 90) {
      return 'APPROVED_FOR_PRODUCTION';
    } else if (this.overallScore >= 80) {
      return 'PROCEED_WITH_MONITORING';
    } else if (this.overallScore >= 60) {
      return 'ADDRESS_ISSUES_FIRST';
    }
    
    return 'NOT_READY_FOR_PRODUCTION';
  }

  /**
   * Export production readiness report
   */
  async exportReport(filePath) {
    const report = this.generateProductionReadinessReport();
    const reportJson = JSON.stringify(report, null, 2);
    
    try {
      writeFileSync(filePath, reportJson);
      logger.info(`Production readiness report exported to ${filePath}`);
    } catch (error) {
      logger.error('Failed to export production readiness report:', error);
      throw error;
    }
  }
}

export default ProductionReadiness;
