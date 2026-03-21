import prisma from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { observability } from '../utils/observability.js';
import { cacheService } from '../cache/cache.service.js';
import { CACHE_KEYS, CACHE_TTL } from '../cache/cache.keys.js';
import { logger } from '../config/index.js';

/**
 * Mentorship Business Logic Service
 * Handles all core business logic for the mentorship system
 */
class MentorshipService {
  constructor() {
    this.requestExpiryHours = 48;
    this.maxPendingRequests = 5;
    this.minSessionHours = 0.5;
    this.maxSessionHours = 8;
    this.cancellationPolicyHours = 24;
  }

  // ==================== MENTOR DISCOVERY ====================

  /**
   * Search and filter mentors with business rules
   */
  async discoverMentors(filters = {}) {
    const {
      page = 1,
      limit = 20,
      industry,
      skills,
      minExperience,
      maxRate,
      featured,
      search
    } = filters;

    // Create cache key based on filters
    const filterString = JSON.stringify({ page, limit, industry, skills, minExperience, maxRate, featured, search });
    const cacheKey = `mentors:discover:${Buffer.from(filterString).toString('base64')}`;
    
    // Try cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      logger.debug(`[CACHE HIT] ${cacheKey}`);
      return cached;
    }
    logger.debug(`[CACHE MISS] ${cacheKey}`);

    const skip = (page - 1) * limit;
    const where = {
      verificationStatus: 'VERIFIED',
      user: {
        role: 'MENTOR'
      }
    };

    // Apply filters
    if (industry) where.industry = { contains: industry, mode: 'insensitive' };
    if (minExperience) where.yearsOfExperience = { gte: minExperience };
    if (maxRate) where.hourlyRate = { lte: maxRate };
    if (featured !== undefined) where.featuredMentor = featured;
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { professionalTitle: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Skills filter
    if (skills) {
      const skillNames = Array.isArray(skills) ? skills : skills.split(',');
      where.mentorSkills = {
        some: {
          skill: {
            name: { in: skillNames, mode: 'insensitive' }
          },
          verified: true
        }
      };
    }

    const [mentors, total] = await Promise.all([
      prisma.mentorProfile.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          mentorSkills: {
            where: { verified: true },
            include: {
              skill: {
                select: { id: true, name: true, category: true }
              }
            }
          },
          mentorshipRelationships: {
            where: { status: 'active' },
            select: { id: true }
          },
          mentorshipRequests: {
            where: { status: 'pending' },
            select: { id: true }
          },
          trustScore: true
        },
        orderBy: [
          { featuredMentor: 'desc' },
          { trustScore: { overallScore: 'desc' } },
          { yearsOfExperience: 'desc' }
        ]
      }),
      prisma.mentorProfile.count({ where })
    ]);

    // Transform data for API response
    const transformedMentors = mentors.map(mentor => ({
      id: mentor.id,
      name: mentor.user.name,
      professionalTitle: mentor.professionalTitle,
      yearsOfExperience: mentor.yearsOfExperience,
      company: mentor.company,
      industry: mentor.industry,
      bio: mentor.bio,
      hourlyRate: mentor.hourlyRate,
      languagesSpoken: mentor.languagesSpoken,
      trustScore: mentor.trustScore,
      skills: mentor.mentorSkills.map(ms => ({
        id: ms.skill.id,
        name: ms.skill.name,
        category: ms.skill.category,
        proficiencyLevel: ms.proficiencyLevel,
        verified: ms.verified
      })),
      activeRelationshipsCount: mentor.mentorshipRelationships.length,
      pendingRequestsCount: mentor.mentorshipRequests.length,
      featuredMentor: mentor.featuredMentor
    }));

    const result = {
      mentors: transformedMentors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
    
    // Cache for 15 minutes (mentor discovery is expensive)
    await cacheService.set(cacheKey, result, CACHE_TTL.MEDIUM);
    logger.debug(`[CACHE SET] ${cacheKey}`);
    
    return result;
  }

  // ==================== PROFILE MANAGEMENT ====================

  /**
   * Create or update mentor profile with business validation
   */
  async upsertMentorProfile(userId, profileData) {
    // Validate user has MENTOR role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || user.role !== 'MENTOR') {
      throw new ApiError(403, 'User must have MENTOR role to create mentor profile');
    }

    // Business validations
    if (profileData.yearsOfExperience && profileData.yearsOfExperience < 1) {
      throw new ApiError(400, 'Mentors must have at least 1 year of experience');
    }

    if (profileData.hourlyRate && profileData.hourlyRate < 10) {
      throw new ApiError(400, 'Hourly rate must be at least $10');
    }

    if (profileData.maxMentees && profileData.maxMentees > 20) {
      throw new ApiError(400, 'Maximum mentees cannot exceed 20');
    }

    const profile = await prisma.mentorProfile.upsert({
      where: { userId },
      update: profileData,
      create: {
        userId,
        ...profileData,
        verificationStatus: 'PENDING'
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        mentorSkills: {
          include: {
            skill: true
          }
        }
      }
    });

    // Invalidate mentor-related caches
    await cacheService.invalidatePattern('mentors:discover:*');
    await cacheService.invalidatePattern(`mentor:*:${userId}*`);
    await cacheService.invalidatePattern(`*mentor*${userId}*`);
    logger.debug(`[CACHE INVALIDATE] mentor profile for ${userId}`);

    observability.trackBusinessEvent('mentor_profile_updated', {
      userId,
      profileId: profile.id,
      action: profile.id ? 'updated' : 'created'
    });

    return profile;
  }

  /**
   * Create or update mentee profile
   */
  async upsertMenteeProfile(userId, profileData) {
    const profile = await prisma.menteeProfile.upsert({
      where: { userId },
      update: profileData,
      create: { userId, ...profileData },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    observability.trackBusinessEvent('mentee_profile_updated', {
      userId,
      profileId: profile.id,
      action: profile.id ? 'updated' : 'created'
    });

    return profile;
  }

  // ==================== SKILLS MANAGEMENT ====================

  /**
   * Add skill to mentor profile with validation
   */
  async addMentorSkill(mentorId, skillData) {
    // Verify mentor profile exists and belongs to user
    const mentor = await prisma.mentorProfile.findUnique({
      where: { id: mentorId },
      select: { userId: true }
    });

    if (!mentor) {
      throw new ApiError(404, 'Mentor profile not found');
    }

    // Validate skill exists
    const skill = await prisma.skillTag.findUnique({
      where: { id: skillData.skillId }
    });

    if (!skill) {
      throw new ApiError(404, 'Skill not found');
    }

    // Check if skill already exists
    const existingSkill = await prisma.mentorSkill.findUnique({
      where: {
        mentorId_skillId: {
          mentorId,
          skillId: skillData.skillId
        }
      }
    });

    if (existingSkill) {
      throw new ApiError(409, 'Skill already added to mentor profile');
    }

    // Business validation: experience years should not exceed mentor's total experience
    const mentorProfile = await prisma.mentorProfile.findUnique({
      where: { id: mentorId },
      select: { yearsOfExperience: true }
    });

    if (skillData.yearsOfExperience > mentorProfile.yearsOfExperience) {
      throw new ApiError(400, 'Skill experience cannot exceed total years of experience');
    }

    const mentorSkill = await prisma.mentorSkill.create({
      data: {
        mentorId,
        skillId: skillData.skillId,
        proficiencyLevel: skillData.proficiencyLevel,
        yearsOfExperience: skillData.yearsOfExperience
      },
      include: {
        skill: true
      }
    });

    // Invalidate mentor-related caches
    await cacheService.invalidatePattern('mentors:discover:*');
    await cacheService.invalidatePattern(`mentor:*:${mentorId}*`);
    logger.debug(`[CACHE INVALIDATE] mentor skills for ${mentorId}`);

    observability.trackBusinessEvent('mentor_skill_added', {
      mentorId,
      skillId: skillData.skillId,
      proficiencyLevel: skillData.proficiencyLevel
    });

    return mentorSkill;
  }

  // ==================== MENTORSHIP REQUESTS ====================

  /**
   * Create mentorship request with business rules
   */
  async createMentorshipRequest(menteeId, requestData) {
    // Validate mentee profile exists
    const menteeProfile = await prisma.menteeProfile.findUnique({
      where: { userId: menteeId }
    });

    if (!menteeProfile) {
      throw new ApiError(400, 'Mentee profile required to send requests');
    }

    // Validate mentor exists and is verified
    const mentor = await prisma.mentorProfile.findUnique({
      where: { id: requestData.mentorId },
      include: {
        user: { select: { role: true } },
        mentorshipRelationships: {
          where: { status: 'active' },
          select: { id: true }
        }
      }
    });

    if (!mentor) {
      throw new ApiError(404, 'Mentor not found');
    }

    if (mentor.verificationStatus !== 'VERIFIED') {
      throw new ApiError(400, 'Cannot request mentorship from unverified mentor');
    }

    // Check if mentor has reached max mentees
    if (mentor.mentorshipRelationships.length >= mentor.maxMentees) {
      throw new ApiError(400, 'Mentor has reached maximum number of active mentees');
    }

    // Check for existing active relationship
    const existingRelationship = await prisma.mentorshipRelationship.findFirst({
      where: {
        mentorId: requestData.mentorId,
        menteeId,
        status: 'active'
      }
    });

    if (existingRelationship) {
      throw new ApiError(409, 'Active mentorship relationship already exists');
    }

    // Check for pending requests to same mentor
    const pendingRequest = await prisma.mentorshipRequest.findFirst({
      where: {
        mentorId: requestData.mentorId,
        menteeId,
        status: 'pending'
      }
    });

    if (pendingRequest) {
      throw new ApiError(409, 'Pending request already exists with this mentor');
    }

    // Rate limiting: check pending requests count
    const pendingCount = await prisma.mentorshipRequest.count({
      where: {
        menteeId,
        status: 'pending'
      }
    });

    if (pendingCount >= this.maxPendingRequests) {
      throw new ApiError(429, `Maximum pending requests (${this.maxPendingRequests}) reached`);
    }

    // Validate skills exist
    if (requestData.skills && requestData.skills.length > 0) {
      const skillIds = requestData.skills.map(s => s.skillId);
      const skills = await prisma.skillTag.findMany({
        where: { id: { in: skillIds } }
      });

      if (skills.length !== skillIds.length) {
        throw new ApiError(400, 'One or more skills not found');
      }
    }

    // Create request with expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.requestExpiryHours);

    const request = await prisma.mentorshipRequest.create({
      data: {
        mentorId: requestData.mentorId,
        menteeId,
        status: 'PENDING',
        requestType: requestData.requestType,
        topicDescription: requestData.topicDescription,
        goals: requestData.goals,
        expectedDuration: requestData.expectedDuration,
        proposedSchedule: requestData.proposedSchedule,
        budget: requestData.budget,
        urgency: requestData.urgency,
        message: requestData.message,
        expiresAt,
        skills: requestData.skills ? {
          create: requestData.skills.map(skill => ({
            skillId: skill.skillId,
            priority: skill.priority
          }))
        } : undefined
      },
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
      }
    });

    observability.trackBusinessEvent('mentorship_request_created', {
      requestId: request.id,
      mentorId: requestData.mentorId,
      menteeId,
      requestType: requestData.requestType
    });

    return request;
  }

  /**
   * Respond to mentorship request
   */
  async respondToRequest(requestId, mentorId, responseData) {
    return await prisma.$transaction(async (tx) => {
      const request = await tx.mentorshipRequest.findUnique({
        where: { id: requestId },
        include: {
          mentor: { select: { userId: true } },
          mentee: { select: { userId: true } }
        }
      });

      if (!request) {
        throw new ApiError(404, 'Request not found');
      }

      if (request.mentor.userId !== mentorId) {
        throw new ApiError(403, 'Only the mentor can respond to this request');
      }

      if (request.status !== 'PENDING') {
        throw new ApiError(400, 'Request is no longer pending');
      }

      if (new Date() > request.expiresAt) {
        throw new ApiError(400, 'Request has expired');
      }

      const updateData = {
        respondedAt: new Date()
      };

      if (responseData.action === 'accept') {
        updateData.status = 'ACCEPTED';
        
        // Atomic operations: update request and create relationship in same transaction
        const [updatedRequest, relationship] = await Promise.all([
          tx.mentorshipRequest.update({
            where: { id: requestId },
            data: updateData
          }),
          tx.mentorshipRelationship.create({
            data: {
              mentorId: request.mentorId,
              menteeId: request.menteeId,
              type: this.inferRelationshipType(request),
              goals: request.goals,
              frequency: this.extractFrequency(request.proposedSchedule),
              duration: request.expectedDuration
            }
          })
        ]);

        observability.trackBusinessEvent('mentorship_relationship_started', {
          relationshipId: relationship.id,
          mentorId: request.mentorId,
          menteeId: request.menteeId
        });

        // Return full updated request with relationships
        return await tx.mentorshipRequest.findUnique({
          where: { id: requestId },
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
            }
          }
        });

      } else if (responseData.action === 'reject') {
        updateData.status = 'REJECTED';
        updateData.rejectionReason = responseData.reason;

        const updatedRequest = await tx.mentorshipRequest.update({
          where: { id: requestId },
          data: updateData,
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
            }
          }
        });

        return updatedRequest;
      }
    }, {
      isolationLevel: 'ReadCommitted',
      timeout: 10000 // 10 second timeout
    });
  }

  // ==================== RELATIONSHIP MANAGEMENT ====================

  /**
   * Get user's mentorship relationships
   */
  async getUserRelationships(userId, filters = {}) {
    const { status, type, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where = {};

    if (type === 'mentor') {
      where.mentor = { userId };
    } else if (type === 'mentee') {
      where.mentee = { userId };
    } else {
      where.OR = [
        { mentor: { userId } },
        { mentee: { userId } }
      ];
    }

    if (status) {
      where.status = status.toUpperCase();
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
              scheduledStart: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.mentorshipRelationship.count({ where })
    ]);

    const transformedRelationships = relationships.map(rel => ({
      id: rel.id,
      mentor: {
        id: rel.mentor.id,
        name: rel.mentor.user.name,
        professionalTitle: rel.mentor.professionalTitle
      },
      mentee: {
        id: rel.mentee.id,
        name: rel.mentee.user.name
      },
      status: rel.status.toLowerCase(),
      type: rel.type,
      frequency: rel.frequency,
      duration: rel.duration,
      goals: rel.goals,
      startDate: rel.startDate,
      endDate: rel.endDate,
      nextSessionDate: rel.nextSessionDate,
      stats: {
        totalSessions: rel.sessions.length,
        completedSessions: rel.sessions.filter(s => s.status === 'COMPLETED').length,
        upcomingSessions: rel.sessions.filter(s => s.status === 'SCHEDULED').length
      }
    }));

    return {
      relationships: transformedRelationships,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // ==================== SESSION MANAGEMENT ====================

  /**
   * Schedule session with business validations
   */
  async scheduleSession(relationshipId, userId, sessionData) {
    // Verify relationship exists and user is participant
    const relationship = await prisma.mentorshipRelationship.findUnique({
      where: { id: relationshipId },
      include: {
        mentor: { select: { userId: true } },
        mentee: { select: { userId: true } }
      }
    });

    if (!relationship) {
      throw new ApiError(404, 'Relationship not found');
    }

    if (relationship.mentor.userId !== userId && relationship.mentee.userId !== userId) {
      throw new ApiError(403, 'Only relationship participants can schedule sessions');
    }

    if (relationship.status !== 'ACTIVE') {
      throw new ApiError(400, 'Cannot schedule sessions for inactive relationships');
    }

    // Validate session duration
    const startTime = new Date(sessionData.scheduledStart);
    const endTime = new Date(sessionData.scheduledEnd);
    const durationHours = (endTime - startTime) / (1000 * 60 * 60);

    if (durationHours < this.minSessionHours || durationHours > this.maxSessionHours) {
      throw new ApiError(400, `Session duration must be between ${this.minSessionHours} and ${this.maxSessionHours} hours`);
    }

    // Check for scheduling conflicts
    const conflicts = await this.checkSessionConflicts(
      relationship.mentor.userId,
      relationship.mentee.userId,
      startTime,
      endTime,
      null // exclude current session
    );

    if (conflicts.length > 0) {
      throw new ApiError(409, 'Scheduling conflict detected with existing session');
    }

    // Validate future scheduling
    if (startTime < new Date()) {
      throw new ApiError(400, 'Cannot schedule sessions in the past');
    }

    // Create session
    const session = await prisma.mentorshipSession.create({
      data: {
        relationshipId,
        mentorId: relationship.mentorId,
        menteeId: relationship.menteeId,
        scheduledStart: startTime,
        scheduledEnd: endTime,
        type: sessionData.type,
        topic: sessionData.topic,
        agenda: sessionData.agenda,
        topics: sessionData.topics ? {
          create: sessionData.topics.map(topic => ({
            skillId: topic.skillId
          }))
        } : undefined
      },
      include: {
        topics: {
          include: {
            skill: true
          }
        }
      }
    });

    // Update relationship's next session date
    await prisma.mentorshipRelationship.update({
      where: { id: relationshipId },
      data: {
        nextSessionDate: startTime
      }
    });

    observability.trackBusinessEvent('session_scheduled', {
      sessionId: session.id,
      relationshipId,
      mentorId: relationship.mentorId,
      menteeId: relationship.menteeId,
      scheduledStart: startTime
    });

    return session;
  }

  /**
   * Check for session conflicts
   */
  async checkSessionConflicts(mentorId, menteeId, startTime, endTime, excludeSessionId) {
    const where = {
      OR: [
        { mentorId },
        { menteeId }
      ],
      status: 'SCHEDULED',
      scheduledStart: { lt: endTime },
      scheduledEnd: { gt: startTime }
    };

    if (excludeSessionId) {
      where.id = { not: excludeSessionId };
    }

    return prisma.mentorshipSession.findMany({
      where,
      select: { id: true, scheduledStart: true, scheduledEnd: true }
    });
  }

  // ==================== TRUST SCORE CALCULATION ====================

  /**
   * Calculate and update trust score for a user
   */
  async calculateTrustScore(userId) {
    // Get user's mentorship data
    const [mentorProfile, mentorRelationships, mentorSessions, feedbackReceived] = await Promise.all([
      prisma.mentorProfile.findUnique({
        where: { userId },
        select: { id: true }
      }),
      prisma.mentorshipRelationship.findMany({
        where: { mentor: { userId } },
        select: { id: true, status, startDate, endDate }
      }),
      prisma.mentorshipSession.findMany({
        where: { mentor: { userId } },
        select: { id: true, status, scheduledStart, actualStart, actualEnd }
      }),
      prisma.mentorshipFeedback.findMany({
        where: { toUserId: userId },
        select: { rating, communicationRating, expertiseRating, helpfulnessRating, professionalismRating }
      })
    ]);

    if (!mentorProfile) {
      throw new ApiError(404, 'Mentor profile not found');
    }

    // Calculate components
    const reliabilityScore = this.calculateReliabilityScore(mentorSessions);
    const expertiseScore = this.calculateExpertiseScore(feedbackReceived);
    const communicationScore = this.calculateCommunicationScore(feedbackReceived);
    const professionalismScore = this.calculateProfessionalismScore(feedbackReceived);

    // Calculate overall score (weighted average)
    const weights = {
      reliability: 0.3,
      expertise: 0.25,
      communication: 0.25,
      professionalism: 0.2
    };

    const overallScore = Math.round(
      reliabilityScore * weights.reliability +
      expertiseScore * weights.expertise +
      communicationScore * weights.communication +
      professionalismScore * weights.professionalism
    );

    // Additional metrics
    const responseRate = await this.calculateResponseRate(userId);
    const completionRate = this.calculateCompletionRate(mentorRelationships);
    const onTimeRate = this.calculateOnTimeRate(mentorSessions);

    // Update or create trust score
    const trustScore = await prisma.mentorshipTrustScore.upsert({
      where: { userId },
      update: {
        overallScore,
        reliabilityScore,
        expertiseScore,
        communicationScore,
        professionalismScore,
        reviewCount: feedbackReceived.length,
        responseRate,
        completionRate,
        onTimeRate,
        lastCalculatedAt: new Date(),
        trendDirection: this.calculateTrendDirection(userId, overallScore)
      },
      create: {
        userId,
        overallScore,
        reliabilityScore,
        expertiseScore,
        communicationScore,
        professionalismScore,
        reviewCount: feedbackReceived.length,
        responseRate,
        completionRate,
        onTimeRate,
        lastCalculatedAt: new Date(),
        trendDirection: 'stable'
      }
    });

    observability.trackBusinessEvent('trust_score_calculated', {
      userId,
      overallScore,
      reliabilityScore,
      expertiseScore,
      communicationScore,
      professionalismScore
    });

    return trustScore;
  }

  // ==================== HELPER METHODS ====================

  inferRelationshipType(request) {
    const goals = request.goals || [];
    const hasCareerGoals = goals.some(goal => 
      goal.toLowerCase().includes('career') || 
      goal.toLowerCase().includes('job') || 
      goal.toLowerCase().includes('promotion')
    );
    const hasTechnicalGoals = goals.some(goal => 
      goal.toLowerCase().includes('code') || 
      goal.toLowerCase().includes('programming') || 
      goal.toLowerCase().includes('technical')
    );
    const hasLeadershipGoals = goals.some(goal => 
      goal.toLowerCase().includes('leadership') || 
      goal.toLowerCase().includes('management') || 
      goal.toLowerCase().includes('team')
    );

    const types = [];
    if (hasCareerGoals) types.push('career');
    if (hasTechnicalGoals) types.push('technical');
    if (hasLeadershipGoals) types.push('leadership');

    if (types.length === 0) return 'mixed';
    if (types.length === 1) return types[0];
    return 'mixed';
  }

  extractFrequency(proposedSchedule) {
    if (!proposedSchedule) return null;
    return proposedSchedule.frequency || null;
  }

  calculateReliabilityScore(sessions) {
    if (sessions.length === 0) return 70;

    const completedSessions = sessions.filter(s => s.status === 'COMPLETED');
    const onTimeSessions = completedSessions.filter(s => {
      if (!s.actualStart || !s.scheduledStart) return false;
      const delay = new Date(s.actualStart) - new Date(s.scheduledStart);
      return delay <= 5 * 60 * 1000; // 5 minutes grace period
    });

    const completionRate = completedSessions.length / sessions.length;
    const onTimeRate = completedSessions.length > 0 ? onTimeSessions.length / completedSessions.length : 1;

    return Math.round((completionRate * 0.6 + onTimeRate * 0.4) * 100);
  }

  calculateExpertiseScore(feedback) {
    if (feedback.length === 0) return 70;

    const expertiseRatings = feedback
      .map(f => f.expertiseRating)
      .filter(r => r !== undefined);

    if (expertiseRatings.length === 0) return 70;

    const average = expertiseRatings.reduce((sum, rating) => sum + rating, 0) / expertiseRatings.length;
    return Math.round(average * 20); // Convert 1-5 scale to 0-100
  }

  calculateCommunicationScore(feedback) {
    if (feedback.length === 0) return 70;

    const communicationRatings = feedback
      .map(f => f.communicationRating)
      .filter(r => r !== undefined);

    if (communicationRatings.length === 0) return 70;

    const average = communicationRatings.reduce((sum, rating) => sum + rating, 0) / communicationRatings.length;
    return Math.round(average * 20);
  }

  calculateProfessionalismScore(feedback) {
    if (feedback.length === 0) return 70;

    const professionalismRatings = feedback
      .map(f => f.professionalismRating)
      .filter(r => r !== undefined);

    if (professionalismRatings.length === 0) return 70;

    const average = professionalismRatings.reduce((sum, rating) => sum + rating, 0) / professionalismRatings.length;
    return Math.round(average * 20);
  }

  async calculateResponseRate(userId) {
    // This would be implemented with request/response tracking
    // For now, return a default value
    return 85.0;
  }

  calculateCompletionRate(relationships) {
    if (relationships.length === 0) return 100;

    const completedRelationships = relationships.filter(r => r.status === 'COMPLETED');
    return Math.round((completedRelationships.length / relationships.length) * 100);
  }

  calculateOnTimeRate(sessions) {
    if (sessions.length === 0) return 100;

    const completedSessions = sessions.filter(s => s.status === 'COMPLETED');
    const onTimeSessions = completedSessions.filter(s => {
      if (!s.actualStart || !s.scheduledStart) return false;
      const delay = new Date(s.actualStart) - new Date(s.scheduledStart);
      return delay <= 5 * 60 * 1000;
    });

    return completedSessions.length > 0 
      ? Math.round((onTimeSessions.length / completedSessions.length) * 100)
      : 100;
  }

  async calculateTrendDirection(userId, currentScore) {
    // Get previous trust score to calculate trend
    const previousScore = await prisma.mentorshipTrustScore.findUnique({
      where: { userId },
      select: { overallScore: true }
    });

    if (!previousScore) return 'stable';

    const difference = currentScore - previousScore.overallScore;
    if (difference > 2) return 'up';
    if (difference < -2) return 'down';
    return 'stable';
  }
}

export const mentorshipService = new MentorshipService();
export default mentorshipService;
