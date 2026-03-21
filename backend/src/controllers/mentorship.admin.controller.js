import ApiResponse from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { mentorshipTrustService } from '../services/mentorship.trust.service.js';
import { mentorshipMatchingService } from '../services/mentorship.matching.service.js';
import { mentorshipSecurityService } from '../services/mentorship.security.service.js';
import { paginate } from '../utils/pagination.js';
import prisma from '../config/prisma.js';
import { observability } from '../utils/observability.js';

// ==================== ADMIN ENDPOINTS ====================

/**
 * GET /api/v1/mentorship/admin/requests
 * Get all mentorship requests
 */
export const getAllRequests = asyncHandler(async (req, res) => {
  const { skip, limit, page } = paginate(req.query);
  const { status, mentorId, menteeId, fromDate, toDate } = req.query;

  const where = {};
  if (status) where.status = status.toUpperCase();
  if (mentorId) where.mentorId = parseInt(mentorId);
  if (menteeId) where.menteeId = parseInt(menteeId);
  if (fromDate || toDate) {
    where.requestedAt = {};
    if (fromDate) where.requestedAt.gte = new Date(fromDate);
    if (toDate) where.requestedAt.lte = new Date(toDate);
  }

  const [requests, total] = await Promise.all([
    prisma.mentorshipRequest.findMany({
      where,
      skip,
      take: limit,
      include: {
        mentor: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            },
            trustScore: true
          }
        },
        mentee: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        skills: {
          include: {
            skill: true
          }
        }
      },
      orderBy: { requestedAt: 'desc' }
    }),
    prisma.mentorshipRequest.count({ where })
  ]);

  return ApiResponse.success(res, {
    message: 'Admin requests fetched successfully',
    data: {
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * GET /api/v1/mentorship/admin/relationships
 * Get all mentorship relationships
 */
export const getAllRelationships = asyncHandler(async (req, res) => {
  const { skip, limit, page } = paginate(req.query);
  const { status, mentorId, menteeId, fromDate, toDate } = req.query;

  const where = {};
  if (status) where.status = status.toUpperCase();
  if (mentorId) where.mentorId = parseInt(mentorId);
  if (menteeId) where.menteeId = parseInt(menteeId);
  if (fromDate || toDate) {
    where.startDate = {};
    if (fromDate) where.startDate.gte = new Date(fromDate);
    if (toDate) where.startDate.lte = new Date(toDate);
  }

  const [relationships, total] = await Promise.all([
    prisma.mentorshipRelationship.findMany({
      where,
      skip,
      take: limit,
      include: {
        mentor: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            },
            trustScore: true
          }
        },
        mentee: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        sessions: {
          select: {
            id: true,
            status: true,
            scheduledStart: true
          }
        },
        feedback: {
          select: {
            id: true,
            rating: true,
            submittedAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.mentorshipRelationship.count({ where })
  ]);

  return ApiResponse.success(res, {
    message: 'Admin relationships fetched successfully',
    data: {
      relationships,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * GET /api/v1/mentorship/admin/stats
 * Get system statistics
 */
export const getSystemStatistics = asyncHandler(async (req, res) => {
  const timeframe = req.query.timeframe || '30d';
  const days = parseInt(timeframe.replace('d', ''));
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    overview,
    monthlyStats,
    topMentors,
    popularSkills,
    trustDistribution,
    activityMetrics
  ] = await Promise.all([
    getOverviewStats(),
    getMonthlyStats(startDate),
    getTopMentors(startDate),
    getPopularSkills(startDate),
    getTrustDistribution(),
    getActivityMetrics(startDate)
  ]);

  return ApiResponse.success(res, {
    message: 'System statistics fetched successfully',
    data: {
      overview,
      monthlyStats,
      topMentors,
      popularSkills,
      trustDistribution,
      activityMetrics
    }
  });
});

/**
 * POST /api/v1/mentorship/admin/mentors/:mentorId/verify
 * Verify mentor
 */
export const verifyMentor = asyncHandler(async (req, res) => {
  const { mentorId } = req.params;
  const { action, reason } = req.body;

  const mentorProfile = await prisma.mentorProfile.findUnique({
    where: { id: parseInt(mentorId) },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  if (!mentorProfile) {
    throw new ApiError(404, 'Mentor not found');
  }

  const updatedProfile = await prisma.mentorProfile.update({
    where: { id: parseInt(mentorId) },
    data: {
      verificationStatus: action.toUpperCase(),
      updatedAt: new Date()
    }
  });

  // Log verification action
  observability.trackBusinessEvent('mentor_verification_updated', {
    mentorId: parseInt(mentorId),
    action,
    reason,
    adminId: req.user.id
  });

  // Update trust score if verified
  if (action === 'verify') {
    await mentorshipTrustService.calculateComprehensiveTrustScore(mentorProfile.userId);
  }

  return ApiResponse.success(res, {
    message: `Mentor ${action}ed successfully`,
    data: updatedProfile
  });
});

/**
 * POST /api/v1/mentorship/admin/disputes/:disputeId/resolve
 * Handle dispute
 */
export const handleDispute = asyncHandler(async (req, res) => {
  const { disputeId } = req.params;
  const { resolution, action, notes } = req.body;

  // This would integrate with a dispute system
  // For now, we'll log the resolution and update any relevant records

  observability.trackBusinessEvent('dispute_resolved', {
    disputeId: parseInt(disputeId),
    resolution,
    action,
    notes,
    adminId: req.user.id
  });

  return ApiResponse.success(res, {
    message: 'Dispute resolved successfully',
    data: {
      disputeId: parseInt(disputeId),
      resolution,
      action,
      resolvedAt: new Date()
    }
  });
});

/**
 * POST /api/v1/mentorship/admin/trust-scores/:userId/adjust
 * Adjust trust score
 */
export const adjustTrustScore = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { adjustment, reason, temporary, expiresAt } = req.body;

  const adjustedScore = await mentorshipTrustService.adjustTrustScore(
    parseInt(userId),
    adjustment,
    reason,
    { temporary, expiresAt: expiresAt ? new Date(expiresAt) : undefined }
  );

  // Log adjustment
  observability.trackBusinessEvent('trust_score_adjusted', {
    userId: parseInt(userId),
    adjustment,
    reason,
    temporary,
    adminId: req.user.id
  });

  return ApiResponse.success(res, {
    message: 'Trust score adjusted successfully',
    data: adjustedScore
  });
});

/**
 * GET /api/v1/mentorship/admin/analytics
 * Get matching analytics
 */
export const getMatchingAnalytics = asyncHandler(async (req, res) => {
  const timeframe = req.query.timeframe || '30d';

  const analytics = await mentorshipMatchingService.getMatchingAnalytics(timeframe);

  return ApiResponse.success(res, {
    message: 'Matching analytics fetched successfully',
    data: analytics
  });
});

// ==================== HELPER FUNCTIONS ====================

async function getOverviewStats() {
  const [
    totalMentors,
    totalMentees,
    activeRelationships,
    totalSessions,
    totalRequests,
    averageRating
  ] = await Promise.all([
    prisma.mentorProfile.count({
      where: { verificationStatus: 'VERIFIED' }
    }),
    prisma.menteeProfile.count(),
    prisma.mentorshipRelationship.count({
      where: { status: 'ACTIVE' }
    }),
    prisma.mentorshipSession.count(),
    prisma.mentorshipRequest.count(),
    getAverageSystemRating()
  ]);

  return {
    totalMentors,
    totalMentees,
    activeRelationships,
    totalSessions,
    totalRequests,
    averageRating
  };
}

async function getMonthlyStats(startDate) {
  const monthlyData = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) as new_requests,
      COUNT(CASE WHEN status = 'ACCEPTED' THEN 1 END) as accepted_requests,
      COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_relationships
    FROM mentorship_requests
    WHERE created_at >= ${startDate}
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month DESC
  `;

  const sessionData = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', scheduled_start) as month,
      COUNT(*) as completed_sessions,
      COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as revenue_sessions
    FROM mentorship_sessions
    WHERE scheduled_start >= ${startDate}
      AND status = 'COMPLETED'
    GROUP BY DATE_TRUNC('month', scheduled_start)
    ORDER BY month DESC
  `;

  // Combine and format data
  const monthlyStats = monthlyData.map(month => ({
    month: month.month.toISOString(),
    newRequests: parseInt(month.new_requests),
    acceptedRequests: parseInt(month.accepted_requests),
    completedRelationships: parseInt(month.completed_relationships),
    completedSessions: 0,
    revenue: 0
  }));

  // Add session data
  sessionData.forEach(session => {
    const monthData = monthlyStats.find(m => 
      m.month.startsWith(session.month.toISOString().slice(0, 7))
    );
    if (monthData) {
      monthData.completedSessions = parseInt(session.completed_sessions);
      monthData.revenue = parseInt(session.revenue_sessions) * 100; // Assuming $100 per session
    }
  });

  return monthlyStats;
}

async function getTopMentors(startDate) {
  const mentors = await prisma.mentorProfile.findMany({
    where: {
      verificationStatus: 'VERIFIED',
      mentorshipRelationships: {
        some: {
          createdAt: { gte: startDate }
        }
      }
    },
    include: {
      user: {
        select: { name: true }
      },
      mentorshipRelationships: {
        where: { createdAt: { gte: startDate } },
        select: { id: true, status: true }
      },
      trustScore: true
    }
  });

  return mentors
    .map(mentor => ({
      mentorId: mentor.id,
      name: mentor.user.name,
      activeRelationships: mentor.mentorshipRelationships.filter(r => r.status === 'ACTIVE').length,
      totalRelationships: mentor.mentorshipRelationships.length,
      trustScore: mentor.trustScore?.overallScore || 0,
      revenue: mentor.mentorshipRelationships.length * 100 // Simplified revenue calculation
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}

async function getPopularSkills(startDate) {
  const skills = await prisma.requestSkill.findMany({
    where: {
      request: {
        requestedAt: { gte: startDate }
      }
    },
    include: {
      skill: true
    }
  });

  const skillDemand = skills.reduce((acc, rs) => {
    const skillName = rs.skill.name;
    acc[skillName] = (acc[skillName] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(skillDemand)
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

async function getTrustDistribution() {
  const trustScores = await prisma.mentorshipTrustScore.findMany({
    select: { overallScore: true }
  });

  const distribution = {
    '90-100': 0,
    '80-89': 0,
    '70-79': 0,
    '60-69': 0,
    '50-59': 0,
    '0-49': 0
  };

  trustScores.forEach(ts => {
    const score = ts.overallScore;
    if (score >= 90) distribution['90-100']++;
    else if (score >= 80) distribution['80-89']++;
    else if (score >= 70) distribution['70-79']++;
    else if (score >= 60) distribution['60-69']++;
    else if (score >= 50) distribution['50-59']++;
    else distribution['0-49']++;
  });

  return distribution;
}

async function getActivityMetrics(startDate) {
  const [
    dailyActiveUsers,
    weeklyActiveUsers,
    monthlyActiveUsers
  ] = await Promise.all([
    getActiveUsers(startDate, 1),
    getActiveUsers(startDate, 7),
    getActiveUsers(startDate, 30)
  ]);

  return {
    dailyActiveUsers,
    weeklyActiveUsers,
    monthlyActiveUsers
  };
}

async function getActiveUsers(startDate, days) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [activeMentors, activeMentees] = await Promise.all([
    prisma.mentorProfile.count({
      where: {
        mentorshipRelationships: {
          some: {
            createdAt: { gte: cutoffDate }
          }
        }
      }
    }),
    prisma.menteeProfile.count({
      where: {
        mentorshipRelationships: {
          some: {
            createdAt: { gte: cutoffDate }
          }
        }
      }
    })
  ]);

  return activeMentors + activeMentees;
}

async function getAverageSystemRating() {
  const feedback = await prisma.mentorshipFeedback.findMany({
    select: { rating: true }
  });

  if (feedback.length === 0) return 0;

  const sum = feedback.reduce((total, f) => total + f.rating, 0);
  return Math.round((sum / feedback.length) * 10) / 10;
}
