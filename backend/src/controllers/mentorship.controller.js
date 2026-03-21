import ApiResponse from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { mentorshipService } from '../services/mentorship.service.js';
import { mentorshipTrustService } from '../services/mentorship.trust.service.js';
import { mentorshipMatchingService } from '../services/mentorship.matching.service.js';
import { mentorshipSecurityService } from '../services/mentorship.security.service.js';
import { paginate } from '../utils/pagination.js';
import mentorshipRepository from '../repositories/mentorship.repo.js';
import { observability } from '../utils/observability.js';
import getPrisma from '../config/prisma.js';

const prisma = getPrisma();

// ==================== PUBLIC ENDPOINTS ====================

/**
 * GET /api/v1/mentorship/mentors
 * Discover and search mentors
 */
export const discoverMentors = asyncHandler(async (req, res) => {
  const { skip, limit, page } = paginate(req.query);
  
  const mentors = await mentorshipService.discoverMentors({
    ...req.query,
    skip,
    limit
  });

  return ApiResponse.success(res, {
    message: 'Mentors discovered successfully',
    data: mentors
  });
});

/**
 * GET /api/v1/mentorship/mentors/:mentorId
 * Get public mentor profile
 */
export const getMentorProfile = asyncHandler(async (req, res) => {
  const { mentorId } = req.params;

  const mentor = await mentorshipRepository.findMentorProfileById(mentorId, {
    include: {
      user: {
        select: { id: true, name: true }
      },
      mentorSkills: {
        where: { verified: true },
        include: {
          skill: {
            select: { id: true, name: true, category: true }
          }
        }
      },
      trustScore: true,
      packages: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          type: true,
          duration: true,
          sessionCount: true,
          price: true,
          currency: true
        }
      },
      availability: {
        where: { status: 'available' },
        select: {
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          timezone: true
        }
      },
      feedback: {
        where: { isPublic: true },
        select: {
          id: true,
          rating: true,
          comments: true,
          submittedAt: true,
          helpfulVotes: true
        },
        orderBy: { submittedAt: 'desc' },
        take: 10
      }
    }
  });

  if (!mentor) {
    throw new ApiError(404, 'Mentor not found');
  }

  // Transform data for public consumption
  const publicMentor = {
    id: mentor.id,
    name: mentor.user.name,
    professionalTitle: mentor.professionalTitle,
    yearsOfExperience: mentor.yearsOfExperience,
    company: mentor.company,
    industry: mentor.industry,
    bio: mentor.bio,
    hourlyRate: mentor.hourlyRate,
    mentorshipTypes: mentor.mentorshipTypes,
    languagesSpoken: mentor.languagesSpoken,
    timezone: mentor.timezone,
    verificationStatus: mentor.verificationStatus,
    featuredMentor: mentor.featuredMentor,
    trustScore: mentor.trustScore,
    skills: mentor.mentorSkills.map(ms => ({
      id: ms.skill.id,
      name: ms.skill.name,
      category: ms.skill.category,
      proficiencyLevel: ms.proficiencyLevel
    })),
    packages: mentor.packages,
    availability: mentor.availability,
    publicReviews: mentor.feedback
  };

  return ApiResponse.success(res, {
    message: 'Mentor profile fetched successfully',
    data: publicMentor
  });
});

/**
 * GET /api/v1/mentorship/skills
 * Get skills taxonomy
 */
export const getSkillsTaxonomy = asyncHandler(async (req, res) => {
  const { category, level } = req.query;

  const where = { isActive: true };
  if (category) where.category = category;
  if (level) where.level = level.toUpperCase();

  const skills = await mentorshipRepository.findSkills(where, {
    select: {
      id: true,
      name: true,
      category: true,
      level: true,
      demandScore: true
    },
    orderBy: [
      { category: 'asc' },
      { name: 'asc' }
    ]
  });

  return ApiResponse.success(res, {
    message: 'Skills taxonomy fetched successfully',
    data: { skills }
  });
});

// ==================== PROFILE MANAGEMENT ====================

/**
 * GET /api/v1/mentorship/profile/mentor
 * Get my mentor profile
 */
export const getMyMentorProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const mentorProfile = await mentorshipRepository.findMentorProfileByUserId(userId, {
    include: {
      user: {
        select: { id: true, name: true, email: true }
      },
      mentorSkills: {
        include: {
          skill: true
        }
      },
      mentorshipRelationships: {
        where: { status: 'ACTIVE' },
        select: { id: true }
      },
      mentorshipRequests: {
        where: { status: 'PENDING' },
        select: { id: true }
      },
      trustScore: true,
      availability: true,
      packages: {
        where: { isActive: true }
      }
    }
  });

  if (!mentorProfile) {
    throw new ApiError(404, 'Mentor profile not found');
  }

  const stats = {
    activeRelationships: mentorProfile.mentorshipRelationships.length,
    totalSessions: await mentorshipRepository.countMentorshipSessions({
      where: { mentorId: mentorProfile.id }
    }),
    pendingRequests: mentorProfile.mentorshipRequests.length,
    averageRating: await calculateAverageRating(mentorProfile.id)
  };

  return ApiResponse.success(res, {
    message: 'Mentor profile fetched successfully',
    data: { ...mentorProfile, stats }
  });
});

/**
 * PUT /api/v1/mentorship/profile/mentor
 * Create or update mentor profile
 */
export const upsertMentorProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const profileData = req.body;

  const mentorProfile = await mentorshipService.upsertMentorProfile(userId, profileData);

  observability.trackBusinessEvent('mentor_profile_updated', {
    userId,
    profileId: mentorProfile.id,
    action: mentorProfile.id ? 'updated' : 'created'
  });

  return ApiResponse.success(res, {
    message: 'Mentor profile updated successfully',
    data: mentorProfile
  });
});

/**
 * GET /api/v1/mentorship/profile/mentee
 * Get my mentee profile
 */
export const getMyMenteeProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const menteeProfile = await mentorshipRepository.findMenteeProfileByUserId(userId, {
    include: {
      user: {
        select: { id: true, name: true, email: true }
      },
      mentorshipRelationships: {
        where: { status: 'ACTIVE' },
        select: { id: true }
      },
      mentorshipRequests: {
        where: { status: 'PENDING' },
        select: { id: true }
      }
    }
  });

  if (!menteeProfile) {
    throw new ApiError(404, 'Mentee profile not found');
  }

  const stats = {
    activeRelationships: menteeProfile.mentorshipRelationships.length,
    totalSessions: await mentorshipRepository.countMentorshipSessions({
      where: { menteeId: menteeProfile.id }
    }),
    pendingRequests: menteeProfile.mentorshipRequests.length,
    averageRating: await calculateAverageRating(menteeProfile.id)
  };

  return ApiResponse.success(res, {
    message: 'Mentee profile fetched successfully',
    data: { ...menteeProfile, stats }
  });
});

/**
 * PUT /api/v1/mentorship/profile/mentee
 * Create or update mentee profile
 */
export const upsertMenteeProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const profileData = req.body;

  const menteeProfile = await mentorshipService.upsertMenteeProfile(userId, profileData);

  observability.trackBusinessEvent('mentee_profile_updated', {
    userId,
    profileId: menteeProfile.id,
    action: menteeProfile.id ? 'updated' : 'created'
  });

  return ApiResponse.success(res, {
    message: 'Mentee profile updated successfully',
    data: menteeProfile
  });
});

// ==================== SKILLS MANAGEMENT ====================

/**
 * POST /api/v1/mentorship/skills
 * Add skill to mentor profile
 */
export const addMentorSkill = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { skillId, proficiencyLevel, yearsOfExperience } = req.body;

  const mentorProfile = await mentorshipRepository.findMentorProfileByUserId(userId, {
    select: { id: true }
  });

  if (!mentorProfile) {
    throw new ApiError(404, 'Mentor profile not found');
  }

  const mentorSkill = await mentorshipService.addMentorSkill(mentorProfile.id, {
    skillId,
    proficiencyLevel,
    yearsOfExperience
  });

  return ApiResponse.created(res, {
    message: 'Skill added successfully',
    data: mentorSkill
  });
});

/**
 * PUT /api/v1/mentorship/skills/:skillId
 * Update mentor skill
 */
export const updateMentorSkill = asyncHandler(async (req, res) => {
  const { skillId } = req.params;
  const { proficiencyLevel, yearsOfExperience } = req.body;

  const updatedSkill = await mentorshipRepository.updateMentorSkill(skillId, {
    proficiencyLevel,
    yearsOfExperience,
    updatedAt: new Date()
  }, {
    include: {
      skill: true
    }
  });

  return ApiResponse.success(res, {
    message: 'Skill updated successfully',
    data: updatedSkill
  });
});

/**
 * DELETE /api/v1/mentorship/skills/:skillId
 * Remove mentor skill
 */
export const removeMentorSkill = asyncHandler(async (req, res) => {
  const { skillId } = req.params;

  await mentorshipRepository.deleteMentorSkill(skillId);

  return ApiResponse.success(res, {
    message: 'Skill removed successfully'
  });
});

// ==================== MENTORSHIP REQUESTS ====================

/**
 * POST /api/v1/mentorship/requests
 * Create mentorship request
 */
export const createMentorshipRequest = asyncHandler(async (req, res) => {
  const menteeId = req.user.id;
  const requestData = req.body;

  const request = await mentorshipService.createMentorshipRequest(menteeId, requestData);

  // Send notification to mentor (would integrate with notification service)
  observability.trackBusinessEvent('mentorship_request_created', {
    requestId: request.id,
    mentorId: requestData.mentorId,
    menteeId
  });

  return ApiResponse.created(res, {
    message: 'Mentorship request created successfully',
    data: request
  });
});

/**
 * GET /api/v1/mentorship/requests
 * Get my mentorship requests
 */
export const getMyRequests = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { status, type } = req.query;

  const where = {};
  
  if (type === 'sent') {
    where.mentee = { userId };
  } else if (type === 'received') {
    where.mentor = { userId };
  } else {
    where.OR = [
      { mentee: { userId } },
      { mentor: { userId } }
    ];
  }

  if (status) {
    where.status = status.toUpperCase();
  }

  const requests = await mentorshipRepository.findMentorshipRequests(where, {
    include: {
      mentor: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
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
  });

  return ApiResponse.success(res, {
    message: 'Requests fetched successfully',
    data: { requests }
  });
});

/**
 * PUT /api/v1/mentorship/requests/:requestId/respond
 * Respond to mentorship request
 */
export const respondToRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { action, message, reason } = req.body;
  const mentorId = req.user.id;

  const updatedRequest = await mentorshipService.respondToRequest(
    parseInt(requestId),
    mentorId,
    { action, message, reason }
  );

  // Send notification to mentee
  observability.trackBusinessEvent('mentorship_request_responded', {
    requestId: parseInt(requestId),
    action,
    mentorId
  });

  return ApiResponse.success(res, {
    message: `Request ${action}ed successfully`,
    data: updatedRequest
  });
});

/**
 * DELETE /api/v1/mentorship/requests/:requestId
 * Withdraw mentorship request
 */
export const withdrawRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const menteeId = req.user.id;

  const request = await mentorshipRepository.findMentorshipRequestById(requestId);

  if (!request) {
    throw new ApiError(404, 'Request not found');
  }

  if (request.menteeId !== menteeId) {
    throw new ApiError(403, 'Can only withdraw your own requests');
  }

  if (request.status !== 'PENDING') {
    throw new ApiError(400, 'Can only withdraw pending requests');
  }

  await mentorshipRepository.updateMentorshipRequest(requestId, {
    status: 'WITHDRAWN',
    updatedAt: new Date()
  });

  return ApiResponse.success(res, {
    message: 'Request withdrawn successfully'
  });
});

// ==================== MENTORSHIP RELATIONSHIPS ====================

/**
 * GET /api/v1/mentorship/relationships
 * Get my mentorship relationships
 */
export const getUserRelationships = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { status, type } = req.query;

  const relationships = await mentorshipService.getUserRelationships(userId, {
    status,
    type
  });

  return ApiResponse.success(res, {
    message: 'Relationships fetched successfully',
    data: relationships
  });
});

/**
 * GET /api/v1/mentorship/relationships/:relationshipId
 * Get relationship details
 */
export const getRelationshipDetails = asyncHandler(async (req, res) => {
  const { relationshipId } = req.params;

  const relationship = await mentorshipRepository.findMentorshipRelationshipById(relationshipId, {
    include: {
      mentor: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
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
          scheduledStart: true,
          topic: true
        },
        orderBy: { scheduledStart: 'desc' },
        take: 10
      },
      feedback: {
        select: {
          id: true,
          rating: true,
          comments: true,
          submittedAt: true
        },
        orderBy: { submittedAt: 'desc' },
        take: 5
      }
    }
  });

  if (!relationship) {
    throw new ApiError(404, 'Relationship not found');
  }

  return ApiResponse.success(res, {
    message: 'Relationship details fetched successfully',
    data: relationship
  });
});

/**
 * PUT /api/v1/mentorship/relationships/:relationshipId
 * Update relationship
 */
export const updateRelationship = asyncHandler(async (req, res) => {
  const { relationshipId } = req.params;
  const updateData = req.body;

  const relationship = await mentorshipRepository.updateMentorshipRelationship(relationshipId, {
    ...updateData,
    updatedAt: new Date()
  });

  return ApiResponse.success(res, {
    message: 'Relationship updated successfully',
    data: relationship
  });
});

/**
 * PUT /api/v1/mentorship/relationships/:relationshipId/status
 * Update relationship status
 */
export const updateRelationshipStatus = asyncHandler(async (req, res) => {
  const { relationshipId } = req.params;
  const { status, reason } = req.body;

  const relationship = await mentorshipRepository.updateMentorshipRelationship(relationshipId, {
    status: status.toUpperCase(),
    terminationReason: reason,
    updatedAt: new Date()
  });

  return ApiResponse.success(res, {
    message: 'Relationship status updated successfully',
    data: relationship
  });
});

/**
 * POST /api/v1/mentorship/relationships/:relationshipId/end
 * End relationship
 */
export const endRelationship = asyncHandler(async (req, res) => {
  const { relationshipId } = req.params;
  const { reason, satisfactionScore } = req.body;

  const relationship = await mentorshipRepository.updateMentorshipRelationship(relationshipId, {
    status: 'COMPLETED',
    endDate: new Date(),
    terminationReason: reason,
    satisfactionScore,
    updatedAt: new Date()
  });

  // Update trust scores for both parties
  await mentorshipTrustService.calculateComprehensiveTrustScore(relationship.mentorId);
  await mentorshipTrustService.calculateComprehensiveTrustScore(relationship.menteeId);

  return ApiResponse.success(res, {
    message: 'Relationship ended successfully',
    data: relationship
  });
});

// ==================== SESSIONS ====================

/**
 * GET /api/v1/mentorship/relationships/:relationshipId/sessions
 * Get relationship sessions
 */
export const getRelationshipSessions = asyncHandler(async (req, res) => {
  const { relationshipId } = req.params;
  const { status, fromDate, toDate } = req.query;

  const where = { relationshipId: parseInt(relationshipId) };
  if (status) where.status = status.toUpperCase();
  if (fromDate || toDate) {
    where.scheduledStart = {};
    if (fromDate) where.scheduledStart.gte = new Date(fromDate);
    if (toDate) where.scheduledStart.lte = new Date(toDate);
  }

  const sessions = await mentorshipRepository.findMentorshipSessions(where, {
    include: {
      topics: {
        include: {
          skill: true
        }
      }
    },
    orderBy: { scheduledStart: 'desc' }
  });

  return ApiResponse.success(res, {
    message: 'Sessions fetched successfully',
    data: { sessions }
  });
});

/**
 * POST /api/v1/mentorship/relationships/:relationshipId/sessions
 * Schedule session
 */
export const scheduleSession = asyncHandler(async (req, res) => {
  const { relationshipId } = req.params;
  const sessionData = req.body;

  const session = await mentorshipService.scheduleSession(
    parseInt(relationshipId),
    req.user.id,
    sessionData
  );

  // Send notifications to both parties
  observability.trackBusinessEvent('session_scheduled', {
    sessionId: session.id,
    relationshipId: parseInt(relationshipId)
  });

  return ApiResponse.created(res, {
    message: 'Session scheduled successfully',
    data: session
  });
});

/**
 * PUT /api/v1/mentorship/sessions/:sessionId
 * Update session
 */
export const updateSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const updateData = req.body;

  const session = await mentorshipRepository.updateMentorshipSession(sessionId, {
    ...updateData,
    updatedAt: new Date()
  });

  return ApiResponse.success(res, {
    message: 'Session updated successfully',
    data: session
  });
});

/**
 * POST /api/v1/mentorship/sessions/:sessionId/start
 * Start session
 */
export const startSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await mentorshipRepository.updateMentorshipSession(sessionId, {
    status: 'IN_PROGRESS',
    actualStart: new Date(),
    updatedAt: new Date()
  });

  return ApiResponse.success(res, {
    message: 'Session started successfully',
    data: session
  });
});

/**
 * POST /api/v1/mentorship/sessions/:sessionId/end
 * End session
 */
export const endSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { notes, recordingUrl } = req.body;

  const session = await mentorshipRepository.updateMentorshipSession(sessionId, {
    status: 'COMPLETED',
    actualEnd: new Date(),
    notes,
    recordingUrl,
    updatedAt: new Date()
  });

  // Update trust scores
  await mentorshipTrustService.calculateComprehensiveTrustScore(session.mentorId);

  return ApiResponse.success(res, {
    message: 'Session ended successfully',
    data: session
  });
});

/**
 * POST /api/v1/mentorship/sessions/:sessionId/cancel
 * Cancel session
 */
export const cancelSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { reason, refundPolicy } = req.body;

  const session = await mentorshipRepository.updateMentorshipSession(sessionId, {
    status: 'CANCELLED',
    cancellationReason: reason,
    cancelledById: req.user.id,
    cancelledAt: new Date(),
    updatedAt: new Date()
  });

  // Apply trust score penalty for cancellation
  await mentorshipTrustService.calculateComprehensiveTrustScore(req.user.id);

  return ApiResponse.success(res, {
    message: 'Session cancelled successfully',
    data: session
  });
});

// ==================== AVAILABILITY MANAGEMENT ====================

/**
 * GET /api/v1/mentorship/availability
 * Get my availability
 */
export const getMyAvailability = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const mentorProfile = await mentorshipRepository.findMentorProfileByUserId(userId, {
    select: { id: true }
  });

  if (!mentorProfile) {
    throw new ApiError(404, 'Mentor profile not found');
  }

  const availability = await mentorshipRepository.findMentorAvailability({ mentorId: mentorProfile.id }, {
    orderBy: [
      { recurring: 'desc' },
      { dayOfWeek: 'asc' },
      { startTime: 'asc' }
    ]
  });

  return ApiResponse.success(res, {
    message: 'Availability fetched successfully',
    data: { availability }
  });
});

/**
 * POST /api/v1/mentorship/availability
 * Set availability
 */
export const setAvailability = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const availabilityData = req.body;

  const mentorProfile = await mentorshipRepository.findMentorProfileByUserId(userId, {
    select: { id: true }
  });

  if (!mentorProfile) {
    throw new ApiError(404, 'Mentor profile not found');
  }

  const availability = await mentorshipRepository.createMentorAvailability({
    mentorId: mentorProfile.id,
    startTime: availabilityData.startTime,
    endTime: availabilityData.endTime,
    dayOfWeek: availabilityData.dayOfWeek,
    timezone: availabilityData.timezone,
    isActive: availabilityData.isActive ?? true
  });

  return ApiResponse.created(res, {
    message: 'Availability set successfully',
    data: availability
  });
};

/**
 * PUT /api/v1/mentorship/availability/:availabilityId
 * Update availability
 */
export const updateAvailability = asyncHandler(async (req, res) => {
  const { availabilityId } = req.params;
  const updateData = req.body;

  const availability = await mentorshipRepository.updateMentorAvailability(availabilityId, {
    ...updateData,
    updatedAt: new Date()
  });

  return ApiResponse.success(res, {
    message: 'Availability updated successfully',
    data: availability
  });
});

/**
 * DELETE /api/v1/mentorship/availability/:availabilityId
 * Delete availability
 */
export const deleteAvailability = asyncHandler(async (req, res) => {
  const { availabilityId } = req.params;

  await mentorshipRepository.deleteMentorAvailability(availabilityId);

  return ApiResponse.success(res, {
    message: 'Availability deleted successfully'
  });
});

// ==================== PACKAGES ====================

/**
 * GET /api/v1/mentorship/packages
 * Get my packages
 */
export const getMyPackages = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const mentorProfile = await prisma.mentorProfile.findUnique({
    where: { userId },
    select: { id: true }
  });

  if (!mentorProfile) {
    throw new ApiError(404, 'Mentor profile not found');
  }

  const packages = await prisma.mentorshipPackage.findMany({
    where: { 
      mentorId: mentorProfile.id,
      isActive: true 
    },
    orderBy: { createdAt: 'desc' }
  });

  return ApiResponse.success(res, {
    message: 'Packages fetched successfully',
    data: { packages }
  });
};

/**
 * POST /api/v1/mentorship/packages
 * Create package
 */
export const createPackage = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const packageData = req.body;

  const mentorProfile = await prisma.mentorProfile.findUnique({
    where: { userId },
    select: { id: true }
  });

  if (!mentorProfile) {
    throw new ApiError(404, 'Mentor profile not found');
  }

  const package = await prisma.mentorshipPackage.create({
    data: {
      mentorId: mentorProfile.id,
      title: packageData.title,
      description: packageData.description,
      price: packageData.price,
      duration: packageData.duration,
      sessionCount: packageData.sessionCount,
      isActive: packageData.isActive ?? true
    }
  });

  return ApiResponse.created(res, {
    message: 'Package created successfully',
    data: package
  });
};

/**
 * PUT /api/v1/mentorship/packages/:packageId
 * Update package
 */
export const updatePackage = asyncHandler(async (req, res) => {
  const { packageId } = req.params;
  const updateData = req.body;

  const package = await prisma.mentorshipPackage.update({
    where: { id: parseInt(packageId) },
    data: {
      title: updateData.title,
      description: updateData.description,
      price: updateData.price,
      duration: updateData.duration,
      sessionCount: updateData.sessionCount,
      isActive: updateData.isActive,
      updatedAt: new Date()
    }
  });

  return ApiResponse.success(res, {
    message: 'Package updated successfully',
    data: package
  });
});

/**
 * DELETE /api/v1/mentorship/packages/:packageId
 * Delete package
 */
export const deletePackage = asyncHandler(async (req, res) => {
  const { packageId } = req.params;

  await prisma.mentorshipPackage.update({
    where: { id: parseInt(packageId) },
    data: { isActive: false }
  });

  return ApiResponse.success(res, {
    message: 'Package deleted successfully'
  });
};

// ==================== FEEDBACK ====================

/**
 * POST /api/v1/mentorship/sessions/:sessionId/feedback
 * Submit session feedback
 */
export const submitSessionFeedback = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const feedbackData = req.body;
  const userId = req.user.id;

  const session = await prisma.mentorshipSession.findUnique({
    where: { id: parseInt(sessionId) }
  });

  if (!session) {
    throw new ApiError(404, 'Session not found');
  }

  if (session.mentorId !== userId && session.menteeId !== userId) {
    throw new ApiError(403, 'Can only submit feedback for sessions you participated in');
  }

  if (session.status !== 'COMPLETED') {
    throw new ApiError(400, 'Can only submit feedback for completed sessions');
  }

  const feedback = await prisma.mentorshipFeedback.create({
    data: {
      fromUserId: userId,
      toUserId: session.mentorId === userId ? session.menteeId : session.mentorId,
      sessionId: parseInt(sessionId),
      relationshipId: session.relationshipId,
      type: 'session_feedback',
      rating: feedbackData.rating,
      comment: feedbackData.comment,
      helpfulVotes: 0
    }
  });

  // Update trust scores
  await mentorshipTrustService.calculateComprehensiveTrustScore(feedback.toUserId);

  return ApiResponse.created(res, {
    message: 'Feedback submitted successfully',
    data: feedback
  });
};

/**
 * POST /api/v1/mentorship/relationships/:relationshipId/feedback
 * Submit relationship feedback
 */
export const submitRelationshipFeedback = asyncHandler(async (req, res) => {
  const { relationshipId } = req.params;
  const feedbackData = req.body;
  const userId = req.user.id;

  const relationship = await prisma.mentorshipRelationship.findUnique({
    where: { id: parseInt(relationshipId) }
  });

  if (!relationship) {
    throw new ApiError(404, 'Relationship not found');
  }

  if (relationship.mentorId !== userId && relationship.menteeId !== userId) {
    throw new ApiError(403, 'Can only submit feedback for relationships you participated in');
  }

  const feedback = await prisma.mentorshipFeedback.create({
    data: {
      fromUserId: userId,
      toUserId: relationship.mentorId === userId ? relationship.menteeId : relationship.mentorId,
      relationshipId: parseInt(relationshipId),
      type: 'relationship_feedback',
      ...feedbackData
    }
  });

  // Update trust scores
  await mentorshipTrustService.calculateComprehensiveTrustScore(feedback.toUserId);

  return ApiResponse.created(res, {
    message: 'Feedback submitted successfully',
    data: feedback
  });
});

/**
 * GET /api/v1/mentorship/feedback/received
 * Get feedback received
 */
export const getFeedbackReceived = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { type, public: isPublic } = req.query;

  const where = { toUserId: userId };
  if (type) where.type = type;
  if (isPublic !== undefined) where.isPublic = isPublic === 'true';

  const feedback = await prisma.mentorshipFeedback.findMany({
    where,
    include: {
      fromUser: {
        select: { id: true, name: true }
      },
      session: {
        select: { id: true, topic: true, scheduledStart: true }
      }
    },
    orderBy: { submittedAt: 'desc' }
  });

  return ApiResponse.success(res, {
    message: 'Feedback received fetched successfully',
    data: { feedback }
  });
});

/**
 * GET /api/v1/mentorship/feedback/given
 * Get feedback given
 */
export const getFeedbackGiven = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { type } = req.query;

  const where = { fromUserId: userId };
  if (type) where.type = type;

  const feedback = await prisma.mentorshipFeedback.findMany({
    where,
    include: {
      toUser: {
        select: { id: true, name: true }
      },
      session: {
        select: { id: true, topic: true, scheduledStart: true }
      }
    },
    orderBy: { submittedAt: 'desc' }
  });

  return ApiResponse.success(res, {
    message: 'Feedback given fetched successfully',
    data: { feedback }
  });
};

/**
 * POST /api/v1/mentorship/feedback/:feedbackId/helpful
 * Update feedback helpfulness
 */
export const updateFeedbackHelpfulness = asyncHandler(async (req, res) => {
  const { feedbackId } = req.params;
  const userId = req.user.id;

  // Check if user already voted
  const existingVote = await prisma.feedbackVote.findUnique({
    where: {
      feedbackId_userId: {
        feedbackId: parseInt(feedbackId),
        userId
      }
    }
  });

  if (existingVote) {
    throw new ApiError(409, 'You have already voted on this feedback');
  }

  // Record the vote
  await prisma.feedbackVote.create({
    data: {
      feedbackId: parseInt(feedbackId),
      userId
    }
  });

  // Update helpful votes count
  const feedback = await prisma.mentorshipFeedback.update({
    where: { id: parseInt(feedbackId) },
    data: {
      helpfulVotes: {
        increment: 1
      }
    }
  });

  return ApiResponse.success(res, {
    message: 'Vote recorded successfully',
    data: { helpfulVotes: feedback.helpfulVotes }
  });
});

// ==================== TRUST SCORE ====================

/**
 * GET /api/v1/mentorship/trust-score
 * Get my trust score
 */
export const getMyTrustScore = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  let trustScore = await prisma.mentorshipTrustScore.findUnique({
    where: { userId }
  });

  if (!trustScore) {
    // Create initial trust score if it doesn't exist
    trustScore = await mentorshipTrustService.calculateComprehensiveTrustScore(userId);
  }

  return ApiResponse.success(res, {
    message: 'Trust score fetched successfully',
    data: trustScore
  });
});

/**
 * GET /api/v1/mentorship/reputation-analytics
 * Get reputation analytics
 */
export const getReputationAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const analytics = await mentorshipTrustService.getReputationAnalytics(userId);

  return ApiResponse.success(res, {
    message: 'Reputation analytics fetched successfully',
    data: analytics
  });
});

async function calculateAverageRating(mentorId) {
  const feedback = await prisma.mentorshipFeedback.findMany({
    where: { toUserId: mentorId },
    select: { rating: true }
  });

  if (feedback.length === 0) return 0;

  const sum = feedback.reduce((total, f) => total + f.rating, 0);
  return Math.round((sum / feedback.length) * 10) / 10;
}
