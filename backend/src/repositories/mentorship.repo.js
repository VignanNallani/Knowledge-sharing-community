import prisma from '../config/prisma.js';

// ==================== MENTOR PROFILE ====================

export const findMentorProfileById = (id, options = {}) =>
  prisma.mentorProfile.findUnique({
    where: { id: parseInt(id) },
    ...options,
  });

export const findMentorProfileByUserId = (userId, options = {}) =>
  prisma.mentorProfile.findUnique({
    where: { userId },
    ...options,
  });

export const createMentorProfile = (data, options = {}) =>
  prisma.mentorProfile.create({
    data,
    ...options,
  });

export const updateMentorProfile = (id, data, options = {}) =>
  prisma.mentorProfile.update({
    where: { id: parseInt(id) },
    data,
    ...options,
  });

export const findMentorProfiles = (where = {}, options = {}) =>
  prisma.mentorProfile.findMany({
    where,
    ...options,
  });

export const countMentorProfiles = (where = {}) =>
  prisma.mentorProfile.count({ where });

// ==================== MENTEE PROFILE ====================

export const findMenteeProfileByUserId = (userId, options = {}) =>
  prisma.menteeProfile.findUnique({
    where: { userId },
    ...options,
  });

export const createMenteeProfile = (data, options = {}) =>
  prisma.menteeProfile.create({
    data,
    ...options,
  });

export const updateMenteeProfile = (id, data, options = {}) =>
  prisma.menteeProfile.update({
    where: { id: parseInt(id) },
    data,
    ...options,
  });

export const countMenteeProfiles = (where = {}) =>
  prisma.menteeProfile.count({ where });

// ==================== SKILLS ====================

export const findSkills = (where = {}, options = {}) =>
  prisma.skillTag.findMany({
    where,
    ...options,
  });

export const createMentorSkill = (data, options = {}) =>
  prisma.mentorSkill.create({
    data,
    ...options,
  });

export const updateMentorSkill = (id, data, options = {}) =>
  prisma.mentorSkill.update({
    where: { id: parseInt(id) },
    data,
    ...options,
  });

export const deleteMentorSkill = (id) =>
  prisma.mentorSkill.delete({
    where: { id: parseInt(id) },
  });

// ==================== MENTORSHIP REQUESTS ====================

export const createMentorshipRequest = (data, options = {}) =>
  prisma.mentorshipRequest.create({
    data,
    ...options,
  });

export const findMentorshipRequests = (where = {}, options = {}) =>
  prisma.mentorshipRequest.findMany({
    where,
    ...options,
  });

export const findMentorshipRequestById = (id, options = {}) =>
  prisma.mentorshipRequest.findUnique({
    where: { id: parseInt(id) },
    ...options,
  });

export const updateMentorshipRequest = (id, data, options = {}) =>
  prisma.mentorshipRequest.update({
    where: { id: parseInt(id) },
    data,
    ...options,
  });

export const countMentorshipRequests = (where = {}) =>
  prisma.mentorshipRequest.count({ where });

// ==================== MENTORSHIP RELATIONSHIPS ====================

export const createMentorshipRelationship = (data, options = {}) =>
  prisma.mentorshipRelationship.create({
    data,
    ...options,
  });

export const findMentorshipRelationships = (where = {}, options = {}) =>
  prisma.mentorshipRelationship.findMany({
    where,
    ...options,
  });

export const findMentorshipRelationshipById = (id, options = {}) =>
  prisma.mentorshipRelationship.findUnique({
    where: { id: parseInt(id) },
    ...options,
  });

export const updateMentorshipRelationship = (id, data, options = {}) =>
  prisma.mentorshipRelationship.update({
    where: { id: parseInt(id) },
    data,
    ...options,
  });

export const countMentorshipRelationships = (where = {}) =>
  prisma.mentorshipRelationship.count({ where });

// ==================== MENTORSHIP SESSIONS ====================

export const createMentorshipSession = (data, options = {}) =>
  prisma.mentorshipSession.create({
    data,
    ...options,
  });

export const findMentorshipSessions = (where = {}, options = {}) =>
  prisma.mentorshipSession.findMany({
    where,
    ...options,
  });

export const findMentorshipSessionById = (id, options = {}) =>
  prisma.mentorshipSession.findUnique({
    where: { id: parseInt(id) },
    ...options,
  });

export const updateMentorshipSession = (id, data, options = {}) =>
  prisma.mentorshipSession.update({
    where: { id: parseInt(id) },
    data,
    ...options,
  });

export const countMentorshipSessions = (where = {}) =>
  prisma.mentorshipSession.count({ where });

// ==================== AVAILABILITY ====================

export const createMentorAvailability = (data, options = {}) =>
  prisma.mentorAvailability.create({
    data,
    ...options,
  });

export const findMentorAvailability = (where = {}, options = {}) =>
  prisma.mentorAvailability.findMany({
    where,
    ...options,
  });

export const updateMentorAvailability = (id, data, options = {}) =>
  prisma.mentorAvailability.update({
    where: { id: parseInt(id) },
    data,
    ...options,
  });

export const deleteMentorAvailability = (id) =>
  prisma.mentorAvailability.delete({
    where: { id: parseInt(id) },
  });

// ==================== PACKAGES ====================

export const createMentorshipPackage = (data, options = {}) =>
  prisma.mentorshipPackage.create({
    data,
    ...options,
  });

export const findMentorshipPackages = (where = {}, options = {}) =>
  prisma.mentorshipPackage.findMany({
    where,
    ...options,
  });

export const updateMentorshipPackage = (id, data, options = {}) =>
  prisma.mentorshipPackage.update({
    where: { id: parseInt(id) },
    data,
    ...options,
  });

export const deleteMentorshipPackage = (id) =>
  prisma.mentorshipPackage.delete({
    where: { id: parseInt(id) },
  });

// ==================== FEEDBACK ====================

export const createMentorshipFeedback = (data, options = {}) =>
  prisma.mentorshipFeedback.create({
    data,
    ...options,
  });

export const findMentorshipFeedback = (where = {}, options = {}) =>
  prisma.mentorshipFeedback.findMany({
    where,
    ...options,
  });

export const countMentorshipFeedback = (where = {}) =>
  prisma.mentorshipFeedback.count({ where });

// ==================== TRUST SCORES ====================

export const findMentorshipTrustScore = (where = {}, options = {}) =>
  prisma.mentorshipTrustScore.findMany({
    where,
    ...options,
  });

export const createOrUpdateTrustScore = (data) =>
  prisma.mentorshipTrustScore.upsert({
    where: { userId: data.userId },
    update: data,
    create: data,
  });

// ==================== REQUEST SKILLS ====================

export const findRequestSkills = (where = {}, options = {}) =>
  prisma.requestSkill.findMany({
    where,
    ...options,
  });

// ==================== RAW QUERIES FOR ANALYTICS ====================

export const getMonthlyStatsRaw = (startDate) =>
  prisma.$queryRaw`
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

export const getSessionMonthlyStatsRaw = (startDate) =>
  prisma.$queryRaw`
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

export default {
  // Mentor Profile
  findMentorProfileById,
  findMentorProfileByUserId,
  createMentorProfile,
  updateMentorProfile,
  findMentorProfiles,
  countMentorProfiles,
  
  // Mentee Profile
  findMenteeProfileByUserId,
  createMenteeProfile,
  updateMenteeProfile,
  countMenteeProfiles,
  
  // Skills
  findSkills,
  createMentorSkill,
  updateMentorSkill,
  deleteMentorSkill,
  
  // Mentorship Requests
  createMentorshipRequest,
  findMentorshipRequests,
  findMentorshipRequestById,
  updateMentorshipRequest,
  countMentorshipRequests,
  
  // Mentorship Relationships
  createMentorshipRelationship,
  findMentorshipRelationships,
  findMentorshipRelationshipById,
  updateMentorshipRelationship,
  countMentorshipRelationships,
  
  // Sessions
  createMentorshipSession,
  findMentorshipSessions,
  findMentorshipSessionById,
  updateMentorshipSession,
  countMentorshipSessions,
  
  // Availability
  createMentorAvailability,
  findMentorAvailability,
  updateMentorAvailability,
  deleteMentorAvailability,
  
  // Packages
  createMentorshipPackage,
  findMentorshipPackages,
  updateMentorshipPackage,
  deleteMentorshipPackage,
  
  // Feedback
  createMentorshipFeedback,
  findMentorshipFeedback,
  countMentorshipFeedback,
  
  // Trust Scores
  findMentorshipTrustScore,
  createOrUpdateTrustScore,
  
  // Request Skills
  findRequestSkills,
  
  // Raw Queries
  getMonthlyStatsRaw,
  getSessionMonthlyStatsRaw,
};
