import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { mentorshipAuth } from '../middleware/mentorship.auth.middleware.js';
import {
  mentorSearchSchema,
  mentorProfileSchema,
  menteeProfileSchema,
  mentorSkillSchema,
  mentorshipRequestSchema,
  requestResponseSchema,
  relationshipQuerySchema,
  sessionSchema,
  sessionUpdateSchema,
  sessionEndSchema,
  sessionCancelSchema,
  availabilitySchema,
  availabilityUpdateSchema,
  packageSchema,
  feedbackSchema,
  feedbackQuerySchema,
  mentorVerificationSchema,
  trustScoreAdjustmentSchema
} from '../validators/mentorship.schema.js';

// Import controllers (will be created)
import {
  discoverMentors,
  getMentorProfile,
  getSkillsTaxonomy,
  getMyMentorProfile,
  upsertMentorProfile,
  getMyMenteeProfile,
  upsertMenteeProfile,
  addMentorSkill,
  updateMentorSkill,
  removeMentorSkill,
  createMentorshipRequest,
  getMyRequests,
  respondToRequest,
  withdrawRequest,
  getUserRelationships,
  getRelationshipDetails,
  updateRelationship,
  updateRelationshipStatus,
  endRelationship,
  getRelationshipSessions,
  scheduleSession,
  updateSession,
  startSession,
  endSession,
  cancelSession,
  getMyAvailability,
  setAvailability,
  updateAvailability,
  deleteAvailability,
  getMyPackages,
  createPackage,
  updatePackage,
  deletePackage,
  submitSessionFeedback,
  submitRelationshipFeedback,
  getFeedbackReceived,
  getFeedbackGiven,
  updateFeedbackHelpfulness,
  getMyTrustScore,
  getReputationAnalytics
} from '../controllers/mentorship.controller.js';

// Admin controllers
import {
  getAllRequests,
  getAllRelationships,
  getSystemStatistics,
  verifyMentor,
  handleDispute,
  adjustTrustScore,
  getMatchingAnalytics
} from '../controllers/mentorship.admin.controller.js';

const router = express.Router();

// ==================== PUBLIC ENDPOINTS ====================

/**
 * GET /api/v1/mentorship/find
 * Simple mentor discovery endpoint (alias for /mentors)
 */
router.get('/find', 
  validate(mentorSearchSchema), 
  discoverMentors
);

/**
 * GET /api/v1/mentorship/mentors
 * Discover and search mentors
 */
router.get('/mentors', 
  validate(mentorSearchSchema), 
  discoverMentors
);

/**
 * GET /api/v1/mentorship/mentors/:mentorId
 * Get public mentor profile
 */
router.get('/mentors/:mentorId', 
  getMentorProfile
);

/**
 * GET /api/v1/mentorship/skills
 * Get skills taxonomy
 */
router.get('/skills', 
  getSkillsTaxonomy
);

// ==================== PROTECTED ENDPOINTS ====================

// All protected routes require authentication
router.use(authenticate);

// ==================== PROFILE MANAGEMENT ====================

/**
 * GET /api/v1/mentorship/profile/mentor
 * Get my mentor profile
 */
router.get('/profile/mentor',
  mentorshipAuth.requirePermission('view_own_mentor_profile'),
  getMyMentorProfile
);

/**
 * PUT /api/v1/mentorship/profile/mentor
 * Create or update mentor profile
 */
router.put('/profile/mentor',
  mentorshipAuth.requirePermission('create_mentor_profile'),
  validate(mentorProfileSchema),
  upsertMentorProfile
);

/**
 * GET /api/v1/mentorship/profile/mentee
 * Get my mentee profile
 */
router.get('/profile/mentee',
  mentorshipAuth.requirePermission('view_own_mentee_profile'),
  getMyMenteeProfile
);

/**
 * PUT /api/v1/mentorship/profile/mentee
 * Create or update mentee profile
 */
router.put('/profile/mentee',
  mentorshipAuth.requirePermission('create_mentee_profile'),
  validate(menteeProfileSchema),
  upsertMenteeProfile
);

// ==================== SKILLS MANAGEMENT ====================

/**
 * POST /api/v1/mentorship/skills
 * Add skill to mentor profile
 */
router.post('/skills',
  mentorshipAuth.requirePermission('add_mentor_skills'),
  validate(mentorSkillSchema),
  addMentorSkill
);

/**
 * PUT /api/v1/mentorship/skills/:skillId
 * Update mentor skill
 */
router.put('/skills/:skillId',
  mentorshipAuth.requireOwnership('mentorSkill'),
  validate(mentorSkillSchema),
  updateMentorSkill
);

/**
 * DELETE /api/v1/mentorship/skills/:skillId
 * Remove mentor skill
 */
router.delete('/skills/:skillId',
  mentorshipAuth.requireOwnership('mentorSkill'),
  removeMentorSkill
);

// ==================== MENTORSHIP REQUESTS ====================

/**
 * POST /api/v1/mentorship/request
 * Create mentorship request (simple booking endpoint)
 */
router.post('/request',
  authenticate, // Add authentication here since it's a public route
  mentorshipAuth.requirePermission('create_mentorship_request'),
  mentorshipAuth.mentorshipRateLimit({ windowMs: 15 * 60 * 1000, max: 5 }),
  validate(mentorshipRequestSchema),
  createMentorshipRequest
);

/**
 * POST /api/v1/mentorship/requests
 * Create mentorship request
 */
router.post('/requests',
  mentorshipAuth.requirePermission('create_mentorship_request'),
  mentorshipAuth.mentorshipRateLimit({ windowMs: 15 * 60 * 1000, max: 5 }),
  validate(mentorshipRequestSchema),
  createMentorshipRequest
);

/**
 * GET /api/v1/mentorship/requests
 * Get my mentorship requests
 */
router.get('/requests',
  mentorshipAuth.requirePermission('view_own_requests'),
  getMyRequests
);

/**
 * PUT /api/v1/mentorship/requests/:requestId/respond
 * Respond to mentorship request
 */
router.put('/requests/:requestId/respond',
  mentorshipAuth.requireOwnership('mentorshipRequest'),
  validate(requestResponseSchema),
  respondToRequest
);

/**
 * DELETE /api/v1/mentorship/requests/:requestId
 * Withdraw mentorship request
 */
router.delete('/requests/:requestId',
  mentorshipAuth.requireOwnership('mentorshipRequest'),
  withdrawRequest
);

// ==================== MENTORSHIP RELATIONSHIPS ====================

/**
 * GET /api/v1/mentorship/relationships
 * Get my mentorship relationships
 */
router.get('/relationships',
  mentorshipAuth.requirePermission('view_own_relationships'),
  validate(relationshipQuerySchema),
  getUserRelationships
);

/**
 * GET /api/v1/mentorship/relationships/:relationshipId
 * Get relationship details
 */
router.get('/relationships/:relationshipId',
  mentorshipAuth.requireRelationshipParticipant(),
  getRelationshipDetails
);

/**
 * PUT /api/v1/mentorship/relationships/:relationshipId
 * Update relationship
 */
router.put('/relationships/:relationshipId',
  mentorshipAuth.requireRelationshipParticipant(),
  updateRelationship
);

/**
 * PUT /api/v1/mentorship/relationships/:relationshipId/status
 * Update relationship status
 */
router.put('/relationships/:relationshipId/status',
  mentorshipAuth.requireRelationshipParticipant(),
  validate(relationshipQuerySchema),
  updateRelationshipStatus
);

/**
 * POST /api/v1/mentorship/relationships/:relationshipId/end
 * End relationship
 */
router.post('/relationships/:relationshipId/end',
  mentorshipAuth.requireRelationshipParticipant(),
  endRelationship
);

// ==================== SESSIONS ====================

/**
 * GET /api/v1/mentorship/relationships/:relationshipId/sessions
 * Get relationship sessions
 */
router.get('/relationships/:relationshipId/sessions',
  mentorshipAuth.requireRelationshipParticipant(),
  getRelationshipSessions
);

/**
 * POST /api/v1/mentorship/relationships/:relationshipId/sessions
 * Schedule session
 */
router.post('/relationships/:relationshipId/sessions',
  mentorshipAuth.requireRelationshipParticipant(),
  mentorshipAuth.validateSessionConstraints(),
  validate(sessionSchema),
  scheduleSession
);

/**
 * PUT /api/v1/mentorship/sessions/:sessionId
 * Update session
 */
router.put('/sessions/:sessionId',
  mentorshipAuth.requireOwnership('mentorshipSession'),
  validate(sessionUpdateSchema),
  updateSession
);

/**
 * POST /api/v1/mentorship/sessions/:sessionId/start
 * Start session
 */
router.post('/sessions/:sessionId/start',
  mentorshipAuth.requireOwnership('mentorshipSession'),
  startSession
);

/**
 * POST /api/v1/mentorship/sessions/:sessionId/end
 * End session
 */
router.post('/sessions/:sessionId/end',
  mentorshipAuth.requireOwnership('mentorshipSession'),
  validate(sessionEndSchema),
  endSession
);

/**
 * POST /api/v1/mentorship/sessions/:sessionId/cancel
 * Cancel session
 */
router.post('/sessions/:sessionId/cancel',
  mentorshipAuth.requireOwnership('mentorshipSession'),
  validate(sessionCancelSchema),
  cancelSession
);

// ==================== AVAILABILITY MANAGEMENT ====================

/**
 * GET /api/v1/mentorship/availability
 * Get my availability
 */
router.get('/availability',
  mentorshipAuth.requirePermission('manage_availability'),
  getMyAvailability
);

/**
 * POST /api/v1/mentorship/availability
 * Set availability
 */
router.post('/availability',
  mentorshipAuth.requirePermission('manage_availability'),
  validate(availabilitySchema),
  setAvailability
);

/**
 * PUT /api/v1/mentorship/availability/:availabilityId
 * Update availability
 */
router.put('/availability/:availabilityId',
  mentorshipAuth.requireOwnership('mentorAvailability'),
  validate(availabilityUpdateSchema),
  updateAvailability
);

/**
 * DELETE /api/v1/mentorship/availability/:availabilityId
 * Delete availability
 */
router.delete('/availability/:availabilityId',
  mentorshipAuth.requireOwnership('mentorAvailability'),
  deleteAvailability
);

// ==================== PACKAGES ====================

/**
 * GET /api/v1/mentorship/packages
 * Get my packages
 */
router.get('/packages',
  mentorshipAuth.requirePermission('create_packages'),
  getMyPackages
);

/**
 * POST /api/v1/mentorship/packages
 * Create package
 */
router.post('/packages',
  mentorshipAuth.requirePermission('create_packages'),
  validate(packageSchema),
  createPackage
);

/**
 * PUT /api/v1/mentorship/packages/:packageId
 * Update package
 */
router.put('/packages/:packageId',
  mentorshipAuth.requireOwnership('mentorshipPackage'),
  validate(packageSchema),
  updatePackage
);

/**
 * DELETE /api/v1/mentorship/packages/:packageId
 * Delete package
 */
router.delete('/packages/:packageId',
  mentorshipAuth.requireOwnership('mentorshipPackage'),
  deletePackage
);

// ==================== FEEDBACK ====================

/**
 * POST /api/v1/mentorship/sessions/:sessionId/feedback
 * Submit session feedback
 */
router.post('/sessions/:sessionId/feedback',
  mentorshipAuth.requireOwnership('mentorshipSession'),
  validate(feedbackSchema),
  submitSessionFeedback
);

/**
 * POST /api/v1/mentorship/relationships/:relationshipId/feedback
 * Submit relationship feedback
 */
router.post('/relationships/:relationshipId/feedback',
  mentorshipAuth.requireRelationshipParticipant(),
  validate(feedbackSchema),
  submitRelationshipFeedback
);

/**
 * GET /api/v1/mentorship/feedback/received
 * Get feedback received
 */
router.get('/feedback/received',
  mentorshipAuth.requirePermission('view_own_feedback'),
  validate(feedbackQuerySchema),
  getFeedbackReceived
);

/**
 * GET /api/v1/mentorship/feedback/given
 * Get feedback given
 */
router.get('/feedback/given',
  mentorshipAuth.requirePermission('view_own_feedback'),
  validate(feedbackQuerySchema),
  getFeedbackGiven
);

/**
 * POST /api/v1/mentorship/feedback/:feedbackId/helpful
 * Update feedback helpfulness
 */
router.post('/feedback/:feedbackId/helpful',
  mentorshipAuth.requirePermission('vote_on_feedback'),
  updateFeedbackHelpfulness
);

// ==================== TRUST SCORE ====================

/**
 * GET /api/v1/mentorship/trust-score
 * Get my trust score
 */
router.get('/trust-score',
  mentorshipAuth.requirePermission('view_own_trust_score'),
  getMyTrustScore
);

/**
 * GET /api/v1/mentorship/reputation-analytics
 * Get reputation analytics
 */
router.get('/reputation-analytics',
  mentorshipAuth.requirePermission('view_own_trust_score'),
  getReputationAnalytics
);

// ==================== ADMIN ENDPOINTS ====================

// Admin routes require ADMIN role
router.use('/admin', mentorshipAuth.requireRole('ADMIN'));

/**
 * GET /api/v1/mentorship/admin/requests
 * Get all mentorship requests
 */
router.get('/admin/requests',
  getAllRequests
);

/**
 * GET /api/v1/mentorship/admin/relationships
 * Get all mentorship relationships
 */
router.get('/admin/relationships',
  getAllRelationships
);

/**
 * GET /api/v1/mentorship/admin/stats
 * Get system statistics
 */
router.get('/admin/stats',
  getSystemStatistics
);

/**
 * POST /api/v1/mentorship/admin/mentors/:mentorId/verify
 * Verify mentor
 */
router.post('/admin/mentors/:mentorId/verify',
  validate(mentorVerificationSchema),
  verifyMentor
);

/**
 * POST /api/v1/mentorship/admin/disputes/:disputeId/resolve
 * Handle dispute
 */
router.post('/admin/disputes/:disputeId/resolve',
  handleDispute
);

/**
 * POST /api/v1/mentorship/admin/trust-scores/:userId/adjust
 * Adjust trust score
 */
router.post('/admin/trust-scores/:userId/adjust',
  validate(trustScoreAdjustmentSchema),
  adjustTrustScore
);

/**
 * GET /api/v1/mentorship/admin/analytics
 * Get matching analytics
 */
router.get('/admin/analytics',
  getMatchingAnalytics
);

export default router;
