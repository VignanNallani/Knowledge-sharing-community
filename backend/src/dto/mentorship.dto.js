/**
 * Mentorship System Data Transfer Objects
 * Defines standardized data structures for API responses and internal data transfer
 */

// ==================== MENTOR PROFILES ====================

export const MentorProfileDto = {
  public: (mentor) => ({
    id: mentor.id,
    name: mentor.user?.name,
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
    trustScore: mentor.trustScore ? {
      overallScore: mentor.trustScore.overallScore,
      reviewCount: mentor.trustScore.reviewCount,
      responseRate: mentor.trustScore.responseRate
    } : null,
    skills: mentor.mentorSkills?.map(skill => ({
      id: skill.skill.id,
      name: skill.skill.name,
      category: skill.skill.category,
      proficiencyLevel: skill.proficiencyLevel,
      verified: skill.verified
    })) || [],
    stats: {
      activeRelationships: mentor._count?.activeRelationships || 0,
      totalSessions: mentor._count?.totalSessions || 0,
      averageRating: mentor._count?.averageRating || 0
    }
  }),

  private: (mentor) => ({
    ...MentorProfileDto.public(mentor),
    maxMentees: mentor.maxMentees,
    responseRate: mentor.responseRate,
    averageResponseTime: mentor.averageResponseTime,
    verificationDocuments: mentor.verificationDocuments,
    availabilityPreferences: mentor.availabilityPreferences,
    createdAt: mentor.createdAt,
    updatedAt: mentor.updatedAt
  }),

  admin: (mentor) => ({
    ...MentorProfileDto.private(mentor),
    userId: mentor.userId,
    verificationStatus: mentor.verificationStatus,
    verificationHistory: mentor.verificationHistory,
    adminNotes: mentor.adminNotes,
    flaggedForReview: mentor.flaggedForReview
  })
};

// ==================== MENTEE PROFILES ====================

export const MenteeProfileDto = {
  public: (mentee) => ({
    id: mentee.id,
    name: mentee.user?.name,
    careerLevel: mentee.careerLevel,
    goals: mentee.goals,
    preferredTopics: mentee.preferredTopics,
    learningStyle: mentee.learningStyle,
    stats: {
      activeRelationships: mentee._count?.activeRelationships || 0,
      totalSessions: mentee._count?.totalSessions || 0,
      averageRating: mentee._count?.averageRating || 0
    }
  }),

  private: (mentee) => ({
    ...MenteeProfileDto.public(mentee),
    budgetRange: mentee.budgetRange,
    availability: mentee.availability,
    background: mentee.background,
    expectations: mentee.expectations,
    createdAt: mentee.createdAt,
    updatedAt: mentee.updatedAt
  }),

  admin: (mentee) => ({
    ...MenteeProfileDto.private(mentee),
    userId: mentee.userId,
    flaggedForReview: mentee.flaggedForReview,
    adminNotes: mentee.adminNotes
  })
};

// ==================== MENTORSHIP REQUESTS ====================

export const MentorshipRequestDto = {
  create: (request) => ({
    id: request.id,
    mentorId: request.mentorId,
    status: request.status,
    requestType: request.requestType,
    topicDescription: request.topicDescription,
    goals: request.goals,
    expectedDuration: request.expectedDuration,
    budget: request.budget,
    urgency: request.urgency,
    message: request.message,
    requestedAt: request.requestedAt,
    expiresAt: request.expiresAt,
    mentor: request.mentor ? MentorProfileDto.public(request.mentor) : null,
    skills: request.skills?.map(skill => ({
      skillId: skill.skillId,
      skill: skill.skill,
      priority: skill.priority
    })) || []
  }),

  detail: (request) => ({
    ...MentorshipRequestDto.create(request),
    mentee: request.mentee ? MenteeProfileDto.public(request.mentee) : null,
    respondedAt: request.respondedAt,
    rejectionReason: request.rejectionReason,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt
  }),

  list: (request) => ({
    id: request.id,
    mentorId: request.mentorId,
    menteeId: request.menteeId,
    status: request.status,
    requestType: request.requestType,
    topicDescription: request.topicDescription,
    budget: request.budget,
    requestedAt: request.requestedAt,
    expiresAt: request.expiresAt,
    mentor: request.mentor ? {
      id: request.mentor.id,
      name: request.mentor.user?.name,
      professionalTitle: request.mentor.professionalTitle
    } : null,
    mentee: request.mentee ? {
      id: request.mentee.id,
      name: request.mentee.user?.name
    } : null
  }),

  admin: (request) => ({
    ...MentorshipRequestDto.detail(request),
    mentor: request.mentor ? MentorProfileDto.admin(request.mentor) : null,
    mentee: request.mentee ? MenteeProfileDto.admin(request.mentee) : null,
    adminNotes: request.adminNotes,
    flaggedForReview: request.flaggedForReview
  })
};

// ==================== MENTORSHIP RELATIONSHIPS ====================

export const MentorshipRelationshipDto = {
  create: (relationship) => ({
    id: relationship.id,
    mentorId: relationship.mentorId,
    menteeId: relationship.menteeId,
    status: relationship.status,
    type: relationship.type,
    frequency: relationship.frequency,
    duration: relationship.duration,
    goals: relationship.goals,
    startDate: relationship.startDate,
    mentor: relationship.mentor ? MentorProfileDto.public(relationship.mentor) : null,
    mentee: relationship.mentee ? MenteeProfileDto.public(relationship.mentee) : null
  }),

  detail: (relationship) => ({
    ...MentorshipRelationshipDto.create(relationship),
    progressNotes: relationship.progressNotes,
    nextSessionDate: relationship.nextSessionDate,
    endDate: relationship.endDate,
    terminationReason: relationship.terminationReason,
    satisfactionScore: relationship.satisfactionScore,
    createdAt: relationship.createdAt,
    updatedAt: relationship.updatedAt,
    stats: {
      totalSessions: relationship._count?.totalSessions || 0,
      completedSessions: relationship._count?.completedSessions || 0,
      upcomingSessions: relationship._count?.upcomingSessions || 0,
      averageRating: relationship._count?.averageRating || 0
    }
  }),

  list: (relationship) => ({
    id: relationship.id,
    mentorId: relationship.mentorId,
    menteeId: relationship.menteeId,
    status: relationship.status,
    type: relationship.type,
    frequency: relationship.frequency,
    startDate: relationship.startDate,
    mentor: relationship.mentor ? {
      id: relationship.mentor.id,
      name: relationship.mentor.user?.name,
      professionalTitle: relationship.mentor.professionalTitle
    } : null,
    mentee: relationship.mentee ? {
      id: relationship.mentee.id,
      name: relationship.mentee.user?.name
    } : null,
    stats: {
      totalSessions: relationship._count?.totalSessions || 0,
      completedSessions: relationship._count?.completedSessions || 0
    }
  }),

  admin: (relationship) => ({
    ...MentorshipRelationshipDto.detail(relationship),
    mentor: relationship.mentor ? MentorProfileDto.admin(relationship.mentor) : null,
    mentee: relationship.mentee ? MenteeProfileDto.admin(relationship.mentee) : null,
    adminNotes: relationship.adminNotes,
    flaggedForReview: relationship.flaggedForReview
  })
};

// ==================== SESSIONS ====================

export const SessionDto = {
  create: (session) => ({
    id: session.id,
    relationshipId: session.relationshipId,
    mentorId: session.mentorId,
    menteeId: session.menteeId,
    scheduledStart: session.scheduledStart,
    scheduledEnd: session.scheduledEnd,
    status: session.status,
    type: session.type,
    topic: session.topic,
    agenda: session.agenda,
    mentor: session.mentor ? MentorProfileDto.public(session.mentor) : null,
    mentee: session.mentee ? MenteeProfileDto.public(session.mentee) : null
  }),

  detail: (session) => ({
    ...SessionDto.create(session),
    actualStart: session.actualStart,
    actualEnd: session.actualEnd,
    notes: session.notes,
    recordingUrl: session.recordingUrl,
    paymentStatus: session.paymentStatus,
    cancellationReason: session.cancellationReason,
    cancelledAt: session.cancelledAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    topics: session.topics?.map(topic => ({
      skill: topic.skill
    })) || []
  }),

  list: (session) => ({
    id: session.id,
    relationshipId: session.relationshipId,
    scheduledStart: session.scheduledStart,
    scheduledEnd: session.scheduledEnd,
    status: session.status,
    type: session.type,
    topic: session.topic,
    mentor: session.mentor ? {
      id: session.mentor.id,
      name: session.mentor.user?.name
    } : null,
    mentee: session.mentee ? {
      id: session.mentee.id,
      name: session.mentee.user?.name
    } : null
  }),

  admin: (session) => ({
    ...SessionDto.detail(session),
    mentor: session.mentor ? MentorProfileDto.admin(session.mentor) : null,
    mentee: session.mentee ? MenteeProfileDto.admin(session.mentee) : null,
    adminNotes: session.adminNotes,
    flaggedForReview: session.flaggedForReview
  })
};

// ==================== FEEDBACK ====================

export const FeedbackDto = {
  create: (feedback) => ({
    id: feedback.id,
    fromUserId: feedback.fromUserId,
    toUserId: feedback.toUserId,
    type: feedback.type,
    rating: feedback.rating,
    comments: feedback.comments,
    isPublic: feedback.isPublic,
    submittedAt: feedback.submittedAt,
    helpfulVotes: feedback.helpfulVotes
  }),

  detail: (feedback) => ({
    ...FeedbackDto.create(feedback),
    communicationRating: feedback.communicationRating,
    expertiseRating: feedback.expertiseRating,
    helpfulnessRating: feedback.helpfulnessRating,
    professionalismRating: feedback.professionalismRating,
    fromUser: feedback.fromUser ? {
      id: feedback.fromUser.id,
      name: feedback.fromUser.name
    } : null,
    toUser: feedback.toUser ? {
      id: feedback.toUser.id,
      name: feedback.toUser.name
    } : null,
    relationship: feedback.relationship ? {
      id: feedback.relationship.id,
      type: feedback.relationship.type
    } : null,
    session: feedback.session ? {
      id: feedback.session.id,
      topic: feedback.session.topic,
      scheduledStart: feedback.session.scheduledStart
    } : null
  }),

  list: (feedback) => ({
    id: feedback.id,
    rating: feedback.rating,
    comments: feedback.comments,
    isPublic: feedback.isPublic,
    submittedAt: feedback.submittedAt,
    helpfulVotes: feedback.helpfulVotes,
    fromUser: feedback.fromUser ? {
      id: feedback.fromUser.id,
      name: feedback.fromUser.name
    } : null,
    type: feedback.type
  }),

  admin: (feedback) => ({
    ...FeedbackDto.detail(feedback),
    adminNotes: feedback.adminNotes,
    flaggedForReview: feedback.flaggedForReview
  })
};

// ==================== TRUST SCORE ====================

export const TrustScoreDto = {
  public: (trustScore) => ({
    overallScore: trustScore.overallScore,
    reviewCount: trustScore.reviewCount,
    responseRate: trustScore.responseRate,
    completionRate: trustScore.completionRate,
    onTimeRate: trustScore.onTimeRate,
    trendDirection: trustScore.trendDirection
  }),

  private: (trustScore) => ({
    ...TrustScoreDto.public(trustScore),
    reliabilityScore: trustScore.reliabilityScore,
    expertiseScore: trustScore.expertiseScore,
    communicationScore: trustScore.communicationScore,
    professionalismScore: trustScore.professionalismScore,
    disputeCount: trustScore.disputeCount,
    lastCalculatedAt: trustScore.lastCalculatedAt,
    breakdown: trustScore.breakdown || {}
  }),

  admin: (trustScore) => ({
    ...TrustScoreDto.private(trustScore),
    userId: trustScore.userId,
    manualAdjustments: trustScore.manualAdjustments || [],
    auditTrail: trustScore.auditTrail || []
  })
};

// ==================== PACKAGES ====================

export const PackageDto = {
  public: (pkg) => ({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    type: pkg.type,
    duration: pkg.duration,
    sessionCount: pkg.sessionCount,
    price: pkg.price,
    currency: pkg.currency,
    features: pkg.features,
    requirements: pkg.requirements,
    purchaseCount: pkg.purchaseCount
  }),

  admin: (pkg) => ({
    ...PackageDto.public(pkg),
    mentorId: pkg.mentorId,
    isActive: pkg.isActive,
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
    adminNotes: pkg.adminNotes
  })
};

// ==================== ANALYTICS ====================

export const AnalyticsDto = {
  mentorshipStats: (stats) => ({
    overview: {
      totalMentors: stats.totalMentors,
      totalMentees: stats.totalMentees,
      activeRelationships: stats.activeRelationships,
      totalSessions: stats.totalSessions,
      totalRequests: stats.totalRequests,
      averageRating: stats.averageRating
    },
    monthlyStats: stats.monthlyStats || [],
    topMentors: stats.topMentors || [],
    popularSkills: stats.popularSkills || [],
    trustDistribution: stats.trustDistribution || {}
  }),

  reputationAnalytics: (analytics) => ({
    overview: analytics.overview,
    performance: analytics.performance,
    feedback: analytics.feedback,
    trends: analytics.trends
  }),

  matchingAnalytics: (analytics) => ({
    overview: analytics.overview,
    skillDemand: analytics.skillDemand,
    successRates: analytics.successRates,
    popularMentors: analytics.popularMentors,
    matchingTrends: analytics.matchingTrends
  })
};

// ==================== ERROR RESPONSES ====================

export const ErrorDto = {
  validation: (errors) => ({
    success: false,
    message: 'Validation failed',
    data: null,
    meta: {
      code: 'VALIDATION_ERROR',
      details: errors
    }
  }),

  notFound: (resource) => ({
    success: false,
    message: `${resource} not found`,
    data: null,
    meta: {
      code: 'NOT_FOUND'
    }
  }),

  forbidden: (action) => ({
    success: false,
    message: `Access denied: ${action}`,
    data: null,
    meta: {
      code: 'FORBIDDEN'
    }
  }),

  conflict: (reason) => ({
    success: false,
    message: `Conflict: ${reason}`,
    data: null,
    meta: {
      code: 'CONFLICT',
      details: reason
    }
  }),

  rateLimited: (limitInfo) => ({
    success: false,
    message: 'Rate limit exceeded',
    data: null,
    meta: {
      code: 'RATE_LIMITED',
      details: limitInfo
    }
  }),

  internal: (error) => ({
    success: false,
    message: 'Internal server error',
    data: null,
    meta: {
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }
  })
};

// ==================== SUCCESS RESPONSES ====================

export const SuccessDto = {
  created: (data, message = 'Created successfully') => ({
    success: true,
    message,
    data,
    meta: {}
  }),

  updated: (data, message = 'Updated successfully') => ({
    success: true,
    message,
    data,
    meta: {}
  }),

  deleted: (message = 'Deleted successfully') => ({
    success: true,
    message,
    data: null,
    meta: {}
  }),

  fetched: (data, message = 'Fetched successfully') => ({
    success: true,
    message,
    data,
    meta: {}
  }),

  paginated: (data, pagination, message = 'Fetched successfully') => ({
    success: true,
    message,
    data,
    meta: {
      pagination
    }
  })
};

export default {
  MentorProfileDto,
  MenteeProfileDto,
  MentorshipRequestDto,
  MentorshipRelationshipDto,
  SessionDto,
  FeedbackDto,
  TrustScoreDto,
  PackageDto,
  AnalyticsDto,
  ErrorDto,
  SuccessDto
};
