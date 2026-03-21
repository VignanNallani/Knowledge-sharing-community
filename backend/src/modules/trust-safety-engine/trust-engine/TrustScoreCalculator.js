/**
 * Trust Score Calculator
 * Week-3 Ownership Feature Build
 * Core trust scoring algorithm with weighted multi-factor approach
 */

import { TRUST_LEVELS, TRUST_SCORE_WEIGHTS, DECAY_FUNCTIONS, RECOVERY_MODELS } from '../shared/constants.js';
import { calculateExponentialDecay, calculateLinearDecay } from '../shared/utils.js';

export class TrustScoreCalculator {
  constructor(options = {}) {
    this.options = {
      baseScore: 50,
      minScore: 0,
      maxScore: 100,
      decayFunction: DECAY_FUNCTIONS.EXPONENTIAL,
      recoveryModel: RECOVERY_MODELS.EXPONENTIAL,
      ...options
    };
  }

  /**
   * Calculate comprehensive trust score for a user
   * @param {Object} userData - User data including activity history
   * @returns {Object} Complete trust score breakdown
   */
  async calculateTrustScore(userData) {
    try {
      const contentQualityScore = await this.calculateContentQualityScore(userData);
      const communityEngagementScore = await this.calculateCommunityEngagementScore(userData);
      const reliabilityScore = await this.calculateReliabilityScore(userData);

      // Apply weights to calculate overall score
      const overallScore = Math.round(
        (contentQualityScore * TRUST_SCORE_WEIGHTS.CONTENT_QUALITY) +
        (communityEngagementScore * TRUST_SCORE_WEIGHTS.COMMUNITY_ENGAGEMENT) +
        (reliabilityScore * TRUST_SCORE_WEIGHTS.RELIABILITY)
      );

      // Apply decay if user has been inactive
      const decayedScore = await this.applyDecay(overallScore, userData.lastActivityAt);

      // Determine trust level
      const trustLevel = this.determineTrustLevel(decayedScore);

      return {
        overall: Math.max(this.options.minScore, Math.min(this.options.maxScore, decayedScore)),
        content_quality: contentQualityScore,
        community_engagement: communityEngagementScore,
        reliability: reliabilityScore,
        trust_level: trustLevel,
        calculated_at: new Date().toISOString(),
        factors: {
          content_quality_weight: TRUST_SCORE_WEIGHTS.CONTENT_QUALITY,
          community_engagement_weight: TRUST_SCORE_WEIGHTS.COMMUNITY_ENGAGEMENT,
          reliability_weight: TRUST_SCORE_WEIGHTS.RELIABILITY
        }
      };
    } catch (error) {
      throw new Error(`Trust score calculation failed: ${error.message}`);
    }
  }

  /**
   * Calculate content quality score based on user's content contributions
   * @param {Object} userData - User data with content metrics
   * @returns {number} Content quality score (0-100)
   */
  async calculateContentQualityScore(userData) {
    let score = this.options.baseScore;

    // Post quality factors
    if (userData.posts && userData.posts.length > 0) {
      const postCount = userData.posts.length;
      score += Math.min(postCount * 2, 20); // Up to 20 points for quantity

      // Average post length analysis
      const avgPostLength = userData.posts.reduce((sum, post) => 
        sum + (post.content?.length || 0), 0) / postCount;
      
      if (avgPostLength > 500) score += 10;
      if (avgPostLength > 1000) score += 10;

      // Originality score (if available)
      const avgOriginality = userData.posts.reduce((sum, post) => 
        sum + (post.originalityScore || 0.5), 0) / postCount;
      score += Math.round((avgOriginality - 0.5) * 40); // -20 to +20 points

      // Engagement quality
      const avgEngagement = userData.posts.reduce((sum, post) => 
        sum + (post.engagementScore || 0.5), 0) / postCount;
      score += Math.round((avgEngagement - 0.5) * 30); // -15 to +15 points
    }

    // Comment quality factors
    if (userData.comments && userData.comments.length > 0) {
      const commentCount = userData.comments.length;
      score += Math.min(commentCount * 0.5, 15); // Up to 15 points for quantity

      // Average comment length and quality
      const avgCommentLength = userData.comments.reduce((sum, comment) => 
        sum + (comment.content?.length || 0), 0) / commentCount;
      
      if (avgCommentLength > 100) score += 5;
      if (avgCommentLength > 200) score += 5;

      // Constructive feedback score
      const constructiveCount = userData.comments.filter(comment => 
        comment.isConstructive === true).length;
      score += Math.min(constructiveCount * 2, 10);
    }

    // Content diversity bonus
    const uniqueTopics = new Set();
    userData.posts?.forEach(post => {
      if (post.topics) post.topics.forEach(topic => uniqueTopics.add(topic));
    });
    score += Math.min(uniqueTopics.size * 2, 10);

    // Content consistency (regular posting patterns)
    if (userData.postingFrequency) {
      const consistencyScore = this.calculatePostingConsistency(userData.postingFrequency);
      score += Math.round(consistencyScore * 10);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate community engagement score
   * @param {Object} userData - User data with engagement metrics
   * @returns {number} Community engagement score (0-100)
   */
  async calculateCommunityEngagementScore(userData) {
    let score = this.options.baseScore;

    // Helpful moderation reports
    if (userData.reportsMade && userData.reportsMade.length > 0) {
      const helpfulReports = userData.reportsMade.filter(report => 
        report.status === 'RESOLVED' && report.wasHelpful === true).length;
      score += Math.min(helpfulReports * 5, 20);
    }

    // Account longevity
    if (userData.createdAt) {
      const accountAge = Date.now() - new Date(userData.createdAt).getTime();
      const daysOld = accountAge / (1000 * 60 * 60 * 24);
      
      if (daysOld > 30) score += 10;
      if (daysOld > 90) score += 10;
      if (daysOld > 365) score += 15;
      if (daysOld > 1825) score += 10; // 5 years bonus
    }

    // Positive interactions
    if (userData.positiveInteractions) {
      score += Math.min(userData.positiveInteractions * 0.5, 15);
    }

    // Community participation
    if (userData.communityActivities) {
      const activities = userData.communityActivities;
      if (activities.eventAttendance) score += Math.min(activities.eventAttendance * 2, 10);
      if (activities.collaborationProjects) score += Math.min(activities.collaborationProjects * 3, 10);
      if (activities.mentorshipHours) score += Math.min(activities.mentorshipHours * 0.5, 10);
    }

    // Peer recognition
    if (userData.peerRecognition) {
      score += Math.min(userData.peerRecognition.vouches * 2, 15);
      score += Math.min(userData.peerRecognition.recommendations * 3, 10);
    }

    // Response rate and timeliness
    if (userData.responseMetrics) {
      const responseRate = userData.responseMetrics.rate || 0;
      const avgResponseTime = userData.responseMetrics.avgTime || Infinity;
      
      score += Math.round(responseRate * 15); // Up to 15 points for response rate
      if (avgResponseTime < 3600000) score += 10; // Within 1 hour
      else if (avgResponseTime < 86400000) score += 5; // Within 24 hours
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate reliability score based on user's behavioral history
   * @param {Object} userData - User data with reliability metrics
   * @returns {number} Reliability score (0-100)
   */
  async calculateReliabilityScore(userData) {
    let score = this.options.baseScore;

    // Reports against user (negative factor)
    if (userData.reportsReceived && userData.reportsReceived.length > 0) {
      const validReports = userData.reportsReceived.filter(report => 
        report.status === 'RESOLVED' && report.wasValid === true).length;
      score -= Math.min(validReports * 8, 40);
    }

    // User flags (behavioral warnings)
    if (userData.userFlags) {
      const activeFlags = userData.userFlags.filter(flag => flag.isActive === true);
      score -= activeFlags.length * 12;
      
      // Weight flags by severity
      activeFlags.forEach(flag => {
        if (flag.severity === 'HIGH') score -= 8;
        if (flag.severity === 'CRITICAL') score -= 15;
      });
    }

    // Suspension history
    if (userData.suspensionHistory) {
      userData.suspensionHistory.forEach(suspension => {
        const daysAgo = (Date.now() - new Date(suspension.startDate).getTime()) / (1000 * 60 * 60 * 24);
        const decayFactor = Math.exp(-daysAgo / 365); // 1-year decay
        score -= Math.round(20 * decayFactor); // Up to 20 points per suspension
      });
    }

    // Appeal success rate (positive factor)
    if (userData.appealHistory && userData.appealHistory.length > 0) {
      const successfulAppeals = userData.appealHistory.filter(appeal => 
        appeal.outcome === 'reverse' || appeal.outcome === 'modify').length;
      const appealSuccessRate = successfulAppeals / userData.appealHistory.length;
      score += Math.round(appealSuccessRate * 15); // Up to 15 points
    }

    // Compliance track record
    if (userData.complianceMetrics) {
      if (userData.complianceMetrics.policyAdherence) {
        score += Math.round(userData.complianceMetrics.policyAdherence * 10);
      }
      if (userData.complianceMetrics.contentGuidelines) {
        score += Math.round(userData.complianceMetrics.contentGuidelines * 10);
      }
    }

    // Warning history
    if (userData.warningHistory) {
      const recentWarnings = userData.warningHistory.filter(warning => {
        const daysAgo = (Date.now() - new Date(warning.date).getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 90; // Last 90 days
      });
      score -= recentWarnings.length * 5;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Determine trust level based on score
   * @param {number} score - Overall trust score
   * @returns {string} Trust level
   */
  determineTrustLevel(score) {
    for (const [level, config] of Object.entries(TRUST_LEVELS)) {
      if (score >= config.min && score <= config.max) {
        return level;
      }
    }
    return 'NEW'; // Default fallback
  }

  /**
   * Apply time-based decay to trust score
   * @param {number} score - Current trust score
   * @param {Date|string} lastActivity - Last activity timestamp
   * @returns {number} Decayed trust score
   */
  async applyDecay(score, lastActivity) {
    if (!lastActivity) return score;

    const now = Date.now();
    const lastActivityTime = new Date(lastActivity).getTime();
    const daysSinceActivity = (now - lastActivityTime) / (1000 * 60 * 60 * 24);

    if (daysSinceActivity <= 7) return score; // No decay for recent activity

    switch (this.options.decayFunction) {
      case DECAY_FUNCTIONS.EXPONENTIAL:
        return calculateExponentialDecay(score, daysSinceActivity, 90); // 90-day half-life
      case DECAY_FUNCTIONS.LINEAR:
        return calculateLinearDecay(score, daysSinceActivity, 365); // 1-year linear decay
      default:
        return score;
    }
  }

  /**
   * Calculate posting consistency score
   * @param {Array} postingFrequency - Array of daily post counts
   * @returns {number} Consistency score (0-1)
   */
  calculatePostingConsistency(postingFrequency) {
    if (!postingFrequency || postingFrequency.length === 0) return 0;

    const mean = postingFrequency.reduce((sum, count) => sum + count, 0) / postingFrequency.length;
    const variance = postingFrequency.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / postingFrequency.length;
    const standardDeviation = Math.sqrt(variance);

    // Lower standard deviation = higher consistency
    const maxPossibleStdDev = mean; // Worst case: all posts on one day
    const consistencyScore = maxPossibleStdDev > 0 ? 1 - (standardDeviation / maxPossibleStdDev) : 1;

    return Math.max(0, Math.min(1, consistencyScore));
  }

  /**
   * Apply recovery model to improve trust score
   * @param {number} currentScore - Current trust score
   * @param {number} targetScore - Target trust score
   * @param {number} recoveryRate - Recovery rate (0-1)
   * @returns {number} Recovered trust score
   */
  async applyRecovery(currentScore, targetScore, recoveryRate = 0.1) {
    switch (this.options.recoveryModel) {
      case RECOVERY_MODELS.LINEAR:
        return Math.min(targetScore, currentScore + (targetScore - currentScore) * recoveryRate);
      case RECOVERY_MODELS.EXPONENTIAL:
        return targetScore - (targetScore - currentScore) * Math.exp(-recoveryRate * 10);
      case RECOVERY_MODELS.STEP_FUNCTION:
        return currentScore < targetScore ? Math.min(currentScore + 10, targetScore) : currentScore;
      default:
        return currentScore;
    }
  }

  /**
   * Batch calculate trust scores for multiple users
   * @param {Array} users - Array of user data objects
   * @returns {Array} Array of trust score results
   */
  async batchCalculateTrustScores(users) {
    const results = [];
    const batchSize = 50;

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const batchPromises = batch.map(user => this.calculateTrustScore(user));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Brief pause to prevent overwhelming the system
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Get trust score trend analysis
   * @param {number} userId - User ID
   * @param {number} days - Number of days to analyze
   * @returns {Object} Trend analysis
   */
  async getTrustScoreTrend(userId, days = 30) {
    // This would typically query historical trust score data
    // For now, return a placeholder structure
    return {
      userId,
      period: `${days} days`,
      trend: 'stable', // 'increasing', 'decreasing', 'stable'
      change: 0,
      volatility: 0,
      data_points: []
    };
  }
}

export default TrustScoreCalculator;
