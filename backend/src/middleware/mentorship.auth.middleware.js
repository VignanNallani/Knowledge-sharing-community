import { ApiError } from '../utils/ApiError.js';
import { observability } from '../utils/observability.js';

/**
 * Mentorship Authorization Middleware
 * Handles role-based access control and permission checks
 */
class MentorshipAuthMiddleware {
  constructor() {
    this.rolePermissions = {
      USER: [
        'view_public_mentors',
        'create_mentee_profile',
        'update_mentee_profile',
        'create_mentorship_request',
        'view_own_requests',
        'withdraw_own_request',
        'view_own_relationships',
        'participate_in_own_relationships',
        'submit_feedback',
        'view_own_trust_score'
      ],
      MENTOR: [
        'view_public_mentors',
        'create_mentor_profile',
        'update_mentor_profile',
        'add_mentor_skills',
        'manage_mentor_skills',
        'view_received_requests',
        'respond_to_requests',
        'view_own_relationships',
        'participate_in_own_relationships',
        'manage_availability',
        'create_packages',
        'manage_packages',
        'submit_feedback',
        'view_own_trust_score'
      ],
      ADMIN: [
        'view_all_mentors',
        'verify_mentors',
        'adjust_trust_scores',
        'view_all_requests',
        'view_all_relationships',
        'handle_disputes',
        'access_analytics',
        'moderate_content',
        'system_override'
      ]
    };
  }

  /**
   * Check if user has required permission
   */
  hasPermission(userRole, permission) {
    return this.rolePermissions[userRole]?.includes(permission) || false;
  }

  /**
   * Require specific role
   */
  requireRole(requiredRole) {
    return (req, res, next) => {
      if (!req.user) {
        return next(new ApiError(401, 'Authentication required'));
      }

      if (req.user.role !== requiredRole) {
        observability.trackSecurityEvent('role_access_denied', {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRole,
          path: req.path,
          method: req.method
        });

        return next(new ApiError(403, `${requiredRole} role required`));
      }

      next();
    };
  }

  /**
   * Require specific permission
   */
  requirePermission(permission) {
    return (req, res, next) => {
      if (!req.user) {
        return next(new ApiError(401, 'Authentication required'));
      }

      if (!this.hasPermission(req.user.role, permission)) {
        observability.trackSecurityEvent('permission_access_denied', {
          userId: req.user.id,
          userRole: req.user.role,
          requiredPermission: permission,
          path: req.path,
          method: req.method
        });

        return next(new ApiError(403, 'Insufficient permissions'));
      }

      next();
    };
  }

  /**
   * Require one of multiple roles
   */
  requireRoles(allowedRoles) {
    return (req, res, next) => {
      if (!req.user) {
        return next(new ApiError(401, 'Authentication required'));
      }

      if (!allowedRoles.includes(req.user.role)) {
        observability.trackSecurityEvent('multi_role_access_denied', {
          userId: req.user.id,
          userRole: req.user.role,
          allowedRoles,
          path: req.path,
          method: req.method
        });

        return next(new ApiError(403, `One of these roles required: ${allowedRoles.join(', ')}`));
      }

      next();
    };
  }

  /**
   * Check resource ownership
   */
  requireOwnership(resourceType, resourceIdParam = 'id') {
    return async (req, res, next) => {
      if (!req.user) {
        return next(new ApiError(401, 'Authentication required'));
      }

      const resourceId = parseInt(req.params[resourceIdParam]);
      if (!resourceId) {
        return next(new ApiError(400, 'Valid resource ID required'));
      }

      try {
        let isOwner = false;
        let resource = null;

        switch (resourceType) {
          case 'mentorProfile':
            resource = await prisma.mentorProfile.findUnique({
              where: { id: resourceId },
              select: { userId: true }
            });
            isOwner = resource?.userId === req.user.id;
            break;

          case 'menteeProfile':
            resource = await prisma.menteeProfile.findUnique({
              where: { id: resourceId },
              select: { userId: true }
            });
            isOwner = resource?.userId === req.user.id;
            break;

          case 'mentorshipRequest':
            resource = await prisma.mentorshipRequest.findUnique({
              where: { id: resourceId },
              select: { mentorId: true, menteeId: true }
            });
            
            if (resource) {
              const mentorProfile = await prisma.mentorProfile.findUnique({
                where: { id: resource.mentorId },
                select: { userId: true }
              });
              const menteeProfile = await prisma.menteeProfile.findUnique({
                where: { id: resource.menteeId },
                select: { userId: true }
              });
              
              isOwner = mentorProfile?.userId === req.user.id || menteeProfile?.userId === req.user.id;
            }
            break;

          case 'mentorshipRelationship':
            resource = await prisma.mentorshipRelationship.findUnique({
              where: { id: resourceId },
              select: { mentorId: true, menteeId: true }
            });
            
            if (resource) {
              const mentorProfile = await prisma.mentorProfile.findUnique({
                where: { id: resource.mentorId },
                select: { userId: true }
              });
              const menteeProfile = await prisma.menteeProfile.findUnique({
                where: { id: resource.menteeId },
                select: { userId: true }
              });
              
              isOwner = mentorProfile?.userId === req.user.id || menteeProfile?.userId === req.user.id;
            }
            break;

          case 'mentorshipSession':
            resource = await prisma.mentorshipSession.findUnique({
              where: { id: resourceId },
              select: { relationshipId: true }
            });
            
            if (resource) {
              const relationship = await prisma.mentorshipRelationship.findUnique({
                where: { id: resource.relationshipId },
                select: { mentorId: true, menteeId: true }
              });
              
              if (relationship) {
                const mentorProfile = await prisma.mentorProfile.findUnique({
                  where: { id: relationship.mentorId },
                  select: { userId: true }
                });
                const menteeProfile = await prisma.menteeProfile.findUnique({
                  where: { id: relationship.menteeId },
                  select: { userId: true }
                });
                
                isOwner = mentorProfile?.userId === req.user.id || menteeProfile?.userId === req.user.id;
              }
            }
            break;

          default:
            return next(new ApiError(400, 'Invalid resource type'));
        }

        if (!resource) {
          return next(new ApiError(404, 'Resource not found'));
        }

        if (!isOwner) {
          observability.trackSecurityEvent('ownership_access_denied', {
            userId: req.user.id,
            resourceType,
            resourceId,
            path: req.path,
            method: req.method
          });

          return next(new ApiError(403, 'Access denied: resource ownership required'));
        }

        // Attach resource to request for use in controllers
        req.resource = resource;
        next();

      } catch (error) {
        observability.trackError(error, req);
        return next(new ApiError(500, 'Error checking resource ownership'));
      }
    };
  }

  /**
   * Check if user is participant in relationship
   */
  requireRelationshipParticipant(relationshipIdParam = 'relationshipId') {
    return async (req, res, next) => {
      if (!req.user) {
        return next(new ApiError(401, 'Authentication required'));
      }

      const relationshipId = parseInt(req.params[relationshipIdParam]);
      if (!relationshipId) {
        return next(new ApiError(400, 'Valid relationship ID required'));
      }

      try {
        const relationship = await prisma.mentorshipRelationship.findUnique({
          where: { id: relationshipId },
          include: {
            mentor: {
              select: { userId: true }
            },
            mentee: {
              select: { userId: true }
            }
          }
        });

        if (!relationship) {
          return next(new ApiError(404, 'Relationship not found'));
        }

        const isParticipant = relationship.mentor.userId === req.user.id || 
                            relationship.mentee.userId === req.user.id;

        if (!isParticipant) {
          observability.trackSecurityEvent('relationship_participant_denied', {
            userId: req.user.id,
            relationshipId,
            path: req.path,
            method: req.method
          });

          return next(new ApiError(403, 'Access denied: relationship participant required'));
        }

        req.relationship = relationship;
        next();

      } catch (error) {
        observability.trackError(error, req);
        return next(new ApiError(500, 'Error checking relationship participation'));
      }
    };
  }

  /**
   * Rate limiting for mentorship actions
   */
  mentorshipRateLimit(options = {}) {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutes
      max = 10,
      message = 'Too many mentorship requests, please try again later'
    } = options;

    const requests = new Map();

    return (req, res, next) => {
      if (!req.user) {
        return next(new ApiError(401, 'Authentication required'));
      }

      const key = `mentorship_${req.user.id}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean up old entries
      for (const [userId, timestamps] of requests.entries()) {
        const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
        if (validTimestamps.length === 0) {
          requests.delete(userId);
        } else {
          requests.set(userId, validTimestamps);
        }
      }

      // Check current user requests
      const userRequests = requests.get(key) || [];
      const recentRequests = userRequests.filter(timestamp => timestamp > windowStart);

      if (recentRequests.length >= max) {
        observability.trackSecurityEvent('mentorship_rate_limit_exceeded', {
          userId: req.user.id,
          requestCount: recentRequests.length,
          path: req.path,
          method: req.method
        });

        return next(new ApiError(429, message));
      }

      // Add current request
      recentRequests.push(now);
      requests.set(key, recentRequests);

      next();
    };
  }

  /**
   * Prevent self-interaction (users can't interact with themselves)
   */
  preventSelfInteraction(targetUserIdParam = 'targetUserId') {
    return (req, res, next) => {
      if (!req.user) {
        return next(new ApiError(401, 'Authentication required'));
      }

      const targetUserId = parseInt(req.params[targetUserIdParam] || req.body[targetUserIdParam]);
      
      if (targetUserId === req.user.id) {
        observability.trackSecurityEvent('self_interaction_attempt', {
          userId: req.user.id,
          path: req.path,
          method: req.method
        });

        return next(new ApiError(400, 'Cannot perform this action on yourself'));
      }

      next();
    };
  }

  /**
   * Validate mentorship status transitions
   */
  validateStatusTransition(allowedTransitions) {
    return (req, res, next) => {
      const { status } = req.body;
      
      if (!status) {
        return next(); // No status change
      }

      // This would need to be implemented based on current status
      // For now, just validate that the status is allowed
      const validStatuses = ['pending', 'accepted', 'rejected', 'expired', 'withdrawn', 
                           'active', 'paused', 'completed', 'terminated',
                           'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'];

      if (!validStatuses.includes(status)) {
        return next(new ApiError(400, `Invalid status: ${status}`));
      }

      next();
    };
  }

  /**
   * Check mentor capacity
   */
  checkMentorCapacity() {
    return async (req, res, next) => {
      if (!req.user || req.user.role !== 'MENTOR') {
        return next();
      }

      try {
        const mentorProfile = await prisma.mentorProfile.findUnique({
          where: { userId: req.user.id },
          select: { id: true, maxMentees: true }
        });

        if (!mentorProfile) {
          return next(); // No mentor profile, skip check
        }

        const activeRelationships = await prisma.mentorshipRelationship.count({
          where: {
            mentorId: mentorProfile.id,
            status: 'ACTIVE'
          }
        });

        if (activeRelationships >= mentorProfile.maxMentees) {
          return next(new ApiError(429, 'Mentor has reached maximum capacity'));
        }

        next();

      } catch (error) {
        observability.trackError(error, req);
        return next(new ApiError(500, 'Error checking mentor capacity'));
      }
    };
  }

  /**
   * Validate session scheduling constraints
   */
  validateSessionConstraints() {
    return async (req, res, next) => {
      const { scheduledStart, scheduledEnd } = req.body;

      if (!scheduledStart || !scheduledEnd) {
        return next(); // No scheduling data
      }

      const startTime = new Date(scheduledStart);
      const endTime = new Date(scheduledEnd);
      const now = new Date();

      // Validate times
      if (startTime <= now) {
        return next(new ApiError(400, 'Cannot schedule sessions in the past'));
      }

      if (endTime <= startTime) {
        return next(new ApiError(400, 'End time must be after start time'));
      }

      const durationHours = (endTime - startTime) / (1000 * 60 * 60);
      if (durationHours < 0.5 || durationHours > 8) {
        return next(new ApiError(400, 'Session duration must be between 30 minutes and 8 hours'));
      }

      // Check for minimum advance booking time
      const advanceHours = (startTime - now) / (1000 * 60 * 60);
      if (advanceHours < 2) {
        return next(new ApiError(400, 'Sessions must be scheduled at least 2 hours in advance'));
      }

      next();
    };
  }

  /**
   * Data privacy filter for public endpoints
   */
  filterPublicData() {
    return (req, res, next) => {
      const originalSend = res.json;

      res.json = function(data) {
        if (data && data.data) {
          data.data = filterSensitiveData(data.data, req.user?.role);
        }
        return originalSend.call(this, data);
      };

      next();
    };
  }
}

/**
 * Filter sensitive data based on user role
 */
function filterSensitiveData(data, userRole) {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map(item => filterSensitiveData(item, userRole));
  }

  if (typeof data === 'object') {
    const filtered = { ...data };

    // Remove sensitive fields for public access
    if (!userRole || userRole === 'USER') {
      const sensitiveFields = [
        'email',
        'phoneNumber',
        'address',
        'verificationDocuments',
        'internalNotes',
        'adminNotes',
        'salary',
        'compensation'
      ];

      sensitiveFields.forEach(field => {
        delete filtered[field];
      });
    }

    // Recursively filter nested objects
    Object.keys(filtered).forEach(key => {
      if (typeof filtered[key] === 'object') {
        filtered[key] = filterSensitiveData(filtered[key], userRole);
      }
    });

    return filtered;
  }

  return data;
}

const mentorshipAuth = new MentorshipAuthMiddleware();

export {
  mentorshipAuth
};

export default mentorshipAuth;
