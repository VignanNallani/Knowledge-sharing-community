import prisma from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { observability } from '../utils/observability.js';

/**
 * Trust Score and Reputation Management Service
 * Handles trust scoring, fraud detection, and reputation calculations
 */
class MentorshipTrustService {
  constructor() {
    this.baseScore = 70;
    this.maxScore = 100;
    this.minScore = 0;
    this.decayRate = 2; // points per month of inactivity
    this.disputePenalty = 10;
    this.noShowPenalty = 5;
    this.cancellationPenalty = 2;
    this.completionBonus = 3;
    this.excellentRatingBonus = 5;
  }

  // ==================== TRUST SCORE CALCULATION ====================

  /**
   * Comprehensive trust score calculation with multiple factors
   */
  async calculateComprehensiveTrustScore(userId) {
    const mentorProfile = await prisma.mentorProfile.findUnique({
      where: { userId },
      include: {
        mentorshipRelationships: {
          include: {
            sessions: true,
            feedback: true
          }
        },
        mentorshipRequests: {
          where: { status: 'PENDING' },
          select: { id: true, requestedAt: true }
        },
        trustScore: true
      }
    });

    if (!mentorProfile) {
      throw new ApiError(404, 'Mentor profile not found');
    }

    // Calculate individual components
    const reliabilityScore = this.calculateReliabilityScore(mentorProfile.mentorshipRelationships);
    const expertiseScore = this.calculateExpertiseScore(mentorProfile.mentorshipRelationships);
    const communicationScore = this.calculateCommunicationScore(mentorProfile.mentorshipRelationships);
    const professionalismScore = this.calculateProfessionalismScore(mentorProfile.mentorshipRelationships);
    const activityScore = this.calculateActivityScore(mentorProfile.mentorshipRequests);
    const consistencyScore = this.calculateConsistencyScore(mentorProfile.mentorshipRelationships);

    // Apply weights
    const weights = {
      reliability: 0.25,
      expertise: 0.25,
      communication: 0.20,
      professionalism: 0.15,
      activity: 0.10,
      consistency: 0.05
    };

    let overallScore = Math.round(
      reliabilityScore * weights.reliability +
      expertiseScore * weights.expertise +
      communicationScore * weights.communication +
      professionalismScore * weights.professionalism +
      activityScore * weights.activity +
      consistencyScore * weights.consistency
    );

    // Apply inactivity decay
    overallScore = this.applyInactivityDecay(overallScore, mentorProfile.updatedAt);

    // Apply bounds
    overallScore = Math.max(this.minScore, Math.min(this.maxScore, overallScore));

    // Calculate trend
    const trendDirection = await this.calculateTrendDirection(userId, overallScore);

    // Update trust score
    const updatedTrustScore = await prisma.mentorshipTrustScore.upsert({
      where: { userId },
      update: {
        overallScore,
        reliabilityScore,
        expertiseScore,
        communicationScore,
        professionalismScore,
        reviewCount: this.getTotalReviewCount(mentorProfile.mentorshipRelationships),
        responseRate: await this.calculateResponseRate(userId),
        completionRate: this.calculateCompletionRate(mentorProfile.mentorshipRelationships),
        onTimeRate: this.calculateOnTimeRate(mentorProfile.mentorshipRelationships),
        disputeCount: this.calculateDisputeCount(mentorProfile.mentorshipRelationships),
        lastCalculatedAt: new Date(),
        trendDirection
      },
      create: {
        userId,
        overallScore,
        reliabilityScore,
        expertiseScore,
        communicationScore,
        professionalismScore,
        reviewCount: this.getTotalReviewCount(mentorProfile.mentorshipRelationships),
        responseRate: await this.calculateResponseRate(userId),
        completionRate: this.calculateCompletionRate(mentorProfile.mentorshipRelationships),
        onTimeRate: this.calculateOnTimeRate(mentorProfile.mentorshipRelationships),
        disputeCount: this.calculateDisputeCount(mentorProfile.mentorshipRelationships),
        lastCalculatedAt: new Date(),
        trendDirection
      }
    });

    observability.trackBusinessEvent('trust_score_comprehensive_calculation', {
      userId,
      overallScore,
      reliabilityScore,
      expertiseScore,
      communicationScore,
      professionalismScore,
      trendDirection
    });

    return updatedTrustScore;
  }

  /**
   * Apply manual trust score adjustment (admin only)
   */
  async adjustTrustScore(userId, adjustment, reason, options = {}) {
    const { temporary = false, expiresAt } = options;

    const currentTrustScore = await prisma.mentorshipTrustScore.findUnique({
      where: { userId }
    });

    if (!currentTrustScore) {
      throw new ApiError(404, 'Trust score not found for user');
    }

    let newScore = currentTrustScore.overallScore + adjustment;
    newScore = Math.max(this.minScore, Math.min(this.maxScore, newScore));

    const updateData = {
      overallScore: newScore,
      lastCalculatedAt: new Date()
    };

    if (temporary && expiresAt) {
      // Store temporary adjustment info
      updateData.temporaryAdjustment = adjustment;
      updateData.temporaryAdjustmentExpires = expiresAt;
      updateData.temporaryAdjustmentReason = reason;
    }

    const updatedScore = await prisma.mentorshipTrustScore.update({
      where: { userId },
      data: updateData
    });

    observability.trackBusinessEvent('trust_score_manual_adjustment', {
      userId,
      adjustment,
      reason,
      temporary,
      previousScore: currentTrustScore.overallScore,
      newScore
    });

    return updatedScore;
  }

  // ==================== FRAUD DETECTION ====================

  /**
   * Detect suspicious patterns and potential fraud
   */
  async detectSuspiciousActivity(userId) {
    const suspiciousPatterns = [];

    // Check for rapid request patterns
    const rapidRequests = await this.detectRapidRequestPatterns(userId);
    if (rapidRequests.suspicious) {
      suspiciousPatterns.push({
        type: 'rapid_requests',
        severity: 'medium',
        details: rapidRequests
      });
    }

    // Check for review manipulation
    const reviewManipulation = await this.detectReviewManipulation(userId);
    if (reviewManipulation.suspicious) {
      suspiciousPatterns.push({
        type: 'review_manipulation',
        severity: 'high',
        details: reviewManipulation
      });
    }

    // Check for session abuse
    const sessionAbuse = await this.detectSessionAbuse(userId);
    if (sessionAbuse.suspicious) {
      suspiciousPatterns.push({
        type: 'session_abuse',
        severity: 'medium',
        details: sessionAbuse
      });
    }

    // Check for identity inconsistencies
    const identityIssues = await this.detectIdentityInconsistencies(userId);
    if (identityIssues.suspicious) {
      suspiciousPatterns.push({
        type: 'identity_inconsistency',
        severity: 'high',
        details: identityIssues
      });
    }

    if (suspiciousPatterns.length > 0) {
      await this.handleSuspiciousActivity(userId, suspiciousPatterns);
    }

    return suspiciousPatterns;
  }

  /**
   * Detect rapid request patterns (potential spam)
   */
  async detectRapidRequestPatterns(userId) {
    const recentRequests = await prisma.mentorshipRequest.findMany({
      where: {
        menteeId: userId,
        requestedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      select: { requestedAt: true, mentorId: true }
    });

    const requestsPerHour = recentRequests.length / 24;
    const uniqueMentors = new Set(recentRequests.map(r => r.mentorId)).size;

    return {
      suspicious: requestsPerHour > 2 || uniqueMentors > 10,
      requestsPerHour,
      uniqueMentors,
      totalRequests: recentRequests.length
    };
  }

  /**
   * Detect review manipulation patterns
   */
  async detectReviewManipulation(userId) {
    const recentFeedback = await prisma.mentorshipFeedback.findMany({
      where: {
        fromUserId: userId,
        submittedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      select: { rating, submittedAt, toUserId: true }
    });

    // Check for unusually high ratings
    const perfectRatings = recentFeedback.filter(f => f.rating === 5).length;
    const ratingDistribution = recentFeedback.reduce((acc, f) => {
      acc[f.rating] = (acc[f.rating] || 0) + 1;
      return acc;
    }, {});

    // Check for reciprocal reviews
    const reciprocalReviews = await this.checkReciprocalReviews(userId);

    return {
      suspicious: perfectRatings / recentFeedback.length > 0.9 || reciprocalReviews.length > 0,
      perfectRatingRatio: perfectRatings / recentFeedback.length,
      ratingDistribution,
      reciprocalReviews
    };
  }

  /**
   * Detect session abuse patterns
   */
  async detectSessionAbuse(userId) {
    const recentSessions = await prisma.mentorshipSession.findMany({
      where: {
        OR: [
          { mentor: { userId } },
          { mentee: { userId } }
        ],
        scheduledStart: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      select: { status: true, scheduledStart: true, actualStart: true, actualEnd: true }
    });

    const cancelledSessions = recentSessions.filter(s => s.status === 'CANCELLED').length;
    const noShowSessions = recentSessions.filter(s => s.status === 'NO_SHOW').length;
    const veryShortSessions = recentSessions.filter(s => {
      if (!s.actualStart || !s.actualEnd) return false;
      const duration = new Date(s.actualEnd) - new Date(s.actualStart);
      return duration < 15 * 60 * 1000; // Less than 15 minutes
    }).length;

    return {
      suspicious: cancelledSessions > 5 || noShowSessions > 3 || veryShortSessions > 2,
      cancelledSessions,
      noShowSessions,
      veryShortSessions,
      totalSessions: recentSessions.length
    };
  }

  /**
   * Detect identity inconsistencies
   */
  async detectIdentityInconsistencies(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        mentorProfile: {
          include: {
            mentorshipRelationships: {
              select: { id: true, mentorId: true, menteeId: true }
            }
          }
        },
        menteeProfile: true
      }
    });

    const inconsistencies = [];

    // Check for conflicting roles
    if (user.mentorProfile && user.menteeProfile) {
      const mentorRelationships = user.mentorProfile.mentorshipRelationships.filter(r => r.mentorId === user.mentorProfile.id);
      const menteeRelationships = user.mentorProfile.mentorshipRelationships.filter(r => r.menteeId === user.menteeProfile?.id);
      
      if (mentorRelationships.length > 0 && menteeRelationships.length > 0) {
        inconsistencies.push('concurrent_mentor_mentee_roles');
      }
    }

    return {
      suspicious: inconsistencies.length > 0,
      inconsistencies
    };
  }

  // ==================== REPUTATION ANALYTICS ====================

  /**
   * Get comprehensive reputation analytics for a mentor
   */
  async getReputationAnalytics(userId) {
    const mentorProfile = await prisma.mentorProfile.findUnique({
      where: { userId },
      include: {
        mentorshipRelationships: {
          include: {
            sessions: true,
            feedback: true
          }
        },
        mentorshipRequests: {
          where: { status: 'PENDING' },
          select: { id: true, requestedAt: true }
        },
        trustScore: true
      }
    });

    if (!mentorProfile) {
      throw new ApiError(404, 'Mentor profile not found');
    }

    const analytics = {
      overview: {
        totalRelationships: mentorProfile.mentorshipRelationships.length,
        activeRelationships: mentorProfile.mentorshipRelationships.filter(r => r.status === 'ACTIVE').length,
        completedRelationships: mentorProfile.mentorshipRelationships.filter(r => r.status === 'COMPLETED').length,
        totalSessions: mentorProfile.mentorshipRelationships.reduce((sum, r) => sum + r.sessions.length, 0),
        averageRating: this.calculateAverageRating(mentorProfile.mentorshipRelationships),
        trustScore: mentorProfile.trustScore?.overallScore || 0
      },
      performance: {
        completionRate: this.calculateCompletionRate(mentorProfile.mentorshipRelationships),
        onTimeRate: this.calculateOnTimeRate(mentorProfile.mentorshipRelationships),
        responseRate: await this.calculateResponseRate(userId),
        cancellationRate: this.calculateCancellationRate(mentorProfile.mentorshipRelationships),
        noShowRate: this.calculateNoShowRate(mentorProfile.mentorshipRelationships)
      },
      feedback: {
        totalReviews: this.getTotalReviewCount(mentorProfile.mentorshipRelationships),
        ratingDistribution: this.getRatingDistribution(mentorProfile.mentorshipRelationships),
        recentReviews: this.getRecentReviews(mentorProfile.mentorshipRelationships, 10),
        helpfulVotes: this.getTotalHelpfulVotes(mentorProfile.mentorshipRelationships)
      },
      trends: {
        monthlyGrowth: await this.calculateMonthlyGrowth(userId),
        skillDemand: await this.calculateSkillDemand(userId),
        popularSessionTypes: this.getPopularSessionTypes(mentorProfile.mentorshipRelationships)
      }
    };

    return analytics;
  }

  // ==================== HELPER METHODS ====================

  calculateReliabilityScore(relationships) {
    const allSessions = relationships.flatMap(r => r.sessions);
    if (allSessions.length === 0) return this.baseScore;

    const completedSessions = allSessions.filter(s => s.status === 'COMPLETED');
    const onTimeSessions = completedSessions.filter(s => {
      if (!s.actualStart || !s.scheduledStart) return false;
      const delay = new Date(s.actualStart) - new Date(s.scheduledStart);
      return delay <= 5 * 60 * 1000; // 5 minutes grace period
    });

    const completionRate = completedSessions.length / allSessions.length;
    const onTimeRate = completedSessions.length > 0 ? onTimeSessions.length / completedSessions.length : 1;

    return Math.round((completionRate * 0.6 + onTimeRate * 0.4) * 100);
  }

  calculateExpertiseScore(relationships) {
    const allFeedback = relationships.flatMap(r => r.feedback);
    const expertiseRatings = allFeedback
      .map(f => f.expertiseRating)
      .filter(r => r !== undefined);

    if (expertiseRatings.length === 0) return this.baseScore;

    const average = expertiseRatings.reduce((sum, rating) => sum + rating, 0) / expertiseRatings.length;
    return Math.round(average * 20);
  }

  calculateCommunicationScore(relationships) {
    const allFeedback = relationships.flatMap(r => r.feedback);
    const communicationRatings = allFeedback
      .map(f => f.communicationRating)
      .filter(r => r !== undefined);

    if (communicationRatings.length === 0) return this.baseScore;

    const average = communicationRatings.reduce((sum, rating) => sum + rating, 0) / communicationRatings.length;
    return Math.round(average * 20);
  }

  calculateProfessionalismScore(relationships) {
    const allFeedback = relationships.flatMap(r => r.feedback);
    const professionalismRatings = allFeedback
      .map(f => f.professionalismRating)
      .filter(r => r !== undefined);

    if (professionalismRatings.length === 0) return this.baseScore;

    const average = professionalismRatings.reduce((sum, rating) => sum + rating, 0) / professionalismRatings.length;
    return Math.round(average * 20);
  }

  calculateActivityScore(pendingRequests) {
    // Score based on recent activity and request volume
    const recentRequests = pendingRequests.filter(r => 
      new Date() - new Date(r.requestedAt) < 7 * 24 * 60 * 60 * 1000
    ).length;

    if (recentRequests === 0) return this.baseScore - 10;
    if (recentRequests <= 2) return this.baseScore;
    if (recentRequests <= 5) return this.baseScore + 5;
    return this.baseScore + 10;
  }

  calculateConsistencyScore(relationships) {
    // Score based on consistency in session quality and feedback
    const ratings = relationships.flatMap(r => r.feedback.map(f => f.rating)).filter(r => r !== undefined);
    
    if (ratings.length < 3) return this.baseScore;

    const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    const variance = ratings.reduce((sum, rating) => sum + Math.pow(rating - average, 2), 0) / ratings.length;
    
    // Lower variance = higher consistency score
    const consistencyScore = Math.max(0, 100 - variance * 20);
    return Math.round(consistencyScore);
  }

  applyInactivityDecay(score, lastActivity) {
    const monthsInactive = (new Date() - new Date(lastActivity)) / (30 * 24 * 60 * 60 * 1000);
    const decayAmount = Math.floor(monthsInactive) * this.decayRate;
    
    return Math.max(this.baseScore - 20, score - decayAmount);
  }

  async calculateTrendDirection(userId, currentScore) {
    const previousScore = await prisma.mentorshipTrustScore.findUnique({
      where: { userId },
      select: { overallScore: true }
    });

    if (!previousScore) return 'stable';

    const difference = currentScore - previousScore.overallScore;
    if (difference > 3) return 'up';
    if (difference < -3) return 'down';
    return 'stable';
  }

  async calculateResponseRate(userId) {
    const requests = await prisma.mentorshipRequest.findMany({
      where: { mentorId: userId },
      select: { status: true, respondedAt: true, requestedAt: true }
    });

    if (requests.length === 0) return 100;

    const respondedRequests = requests.filter(r => r.status !== 'PENDING');
    return Math.round((respondedRequests.length / requests.length) * 100);
  }

  calculateCompletionRate(relationships) {
    if (relationships.length === 0) return 100;

    const completedRelationships = relationships.filter(r => r.status === 'COMPLETED');
    return Math.round((completedRelationships.length / relationships.length) * 100);
  }

  calculateOnTimeRate(relationships) {
    const allSessions = relationships.flatMap(r => r.sessions);
    const completedSessions = allSessions.filter(s => s.status === 'COMPLETED');
    
    if (completedSessions.length === 0) return 100;

    const onTimeSessions = completedSessions.filter(s => {
      if (!s.actualStart || !s.scheduledStart) return false;
      const delay = new Date(s.actualStart) - new Date(s.scheduledStart);
      return delay <= 5 * 60 * 1000;
    });

    return Math.round((onTimeSessions.length / completedSessions.length) * 100);
  }

  calculateDisputeCount(relationships) {
    // This would be implemented when dispute system is added
    return 0;
  }

  getTotalReviewCount(relationships) {
    return relationships.reduce((total, r) => total + r.feedback.length, 0);
  }

  calculateAverageRating(relationships) {
    const allRatings = relationships.flatMap(r => r.feedback.map(f => f.rating)).filter(r => r !== undefined);
    
    if (allRatings.length === 0) return 0;
    
    const sum = allRatings.reduce((total, rating) => total + rating, 0);
    return Math.round((sum / allRatings.length) * 10) / 10;
  }

  calculateCancellationRate(relationships) {
    const allSessions = relationships.flatMap(r => r.sessions);
    if (allSessions.length === 0) return 0;

    const cancelledSessions = allSessions.filter(s => s.status === 'CANCELLED');
    return Math.round((cancelledSessions.length / allSessions.length) * 100);
  }

  calculateNoShowRate(relationships) {
    const allSessions = relationships.flatMap(r => r.sessions);
    if (allSessions.length === 0) return 0;

    const noShowSessions = allSessions.filter(s => s.status === 'NO_SHOW');
    return Math.round((noShowSessions.length / allSessions.length) * 100);
  }

  getRatingDistribution(relationships) {
    const allRatings = relationships.flatMap(r => r.feedback.map(f => f.rating)).filter(r => r !== undefined);
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    allRatings.forEach(rating => {
      distribution[rating]++;
    });

    return distribution;
  }

  getRecentReviews(relationships, limit = 10) {
    const allFeedback = relationships.flatMap(r => r.feedback);
    return allFeedback
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, limit)
      .map(f => ({
        id: f.id,
        rating: f.rating,
        comments: f.comments,
        submittedAt: f.submittedAt,
        isPublic: f.isPublic,
        helpfulVotes: f.helpfulVotes
      }));
  }

  getTotalHelpfulVotes(relationships) {
    return relationships.reduce((total, r) => 
      total + r.feedback.reduce((sum, f) => sum + f.helpfulVotes, 0), 0
    );
  }

  async calculateMonthlyGrowth(userId) {
    // Implementation for monthly growth calculation
    return {
      newRelationships: 0,
      completedSessions: 0,
      revenue: 0
    };
  }

  async calculateSkillDemand(userId) {
    // Implementation for skill demand calculation
    return [];
  }

  getPopularSessionTypes(relationships) {
    const sessionTypes = relationships.flatMap(r => r.sessions.map(s => s.type));
    const typeCounts = sessionTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([type, count]) => ({ type, count }));
  }

  async checkReciprocalReviews(userId) {
    // Check for reciprocal review patterns
    const userFeedback = await prisma.mentorshipFeedback.findMany({
      where: { fromUserId: userId },
      select: { toUserId: true, rating: true }
    });

    const reciprocalReviews = [];
    
    for (const feedback of userFeedback) {
      const reciprocal = await prisma.mentorshipFeedback.findFirst({
        where: {
          fromUserId: feedback.toUserId,
          toUserId: userId
        },
        select: { rating: true, submittedAt: true }
      });

      if (reciprocal && Math.abs(feedback.rating - reciprocal.rating) <= 1) {
        reciprocalReviews.push({
          userId: feedback.toUserId,
          userRating: feedback.rating,
          reciprocalRating: reciprocal.rating
        });
      }
    }

    return reciprocalReviews;
  }

  async handleSuspiciousActivity(userId, patterns) {
    // Log suspicious activity
    observability.trackBusinessEvent('suspicious_activity_detected', {
      userId,
      patterns: patterns.map(p => ({
        type: p.type,
        severity: p.severity
      }))
    });

    // Apply automatic penalties for high-severity patterns
    const highSeverityPatterns = patterns.filter(p => p.severity === 'high');
    if (highSeverityPatterns.length > 0) {
      await this.adjustTrustScore(userId, -10, 'Suspicious activity detected', {
        temporary: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });
    }
  }
}

export const mentorshipTrustService = new MentorshipTrustService();
export default mentorshipTrustService;
