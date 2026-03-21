/**
 * Moderation System Routes
 * Week-3 Ownership Feature Build
 * API routing and middleware configuration
 */

import express from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { authorizeRoles } from '../../middleware/authorizeRoles.js';
import validate from '../../middleware/validate.middleware.js';
import ModerationController from './controller.js';
import {
  createReportSchema,
  getReportSchema,
  getReportsSchema,
  createCaseSchema,
  assignCaseSchema,
  takeActionSchema,
  resolveCaseSchema,
  createAppealSchema,
  updateAppealSchema,
  getDashboardSchema,
  getModerationLogsSchema,
  updateTrustScoreSchema,
  escalateCaseSchema
} from './validation.js';

const router = express.Router();
const controller = new ModerationController();

// ========================================
// PUBLIC/USER ENDPOINTS
// ========================================

// ✅ CREATE REPORT (any authenticated user)
router.post(
  '/reports',
  authenticate,
  validate(createReportSchema),
  controller.createReport
);

// ✅ GET OWN REPORT (reporter only)
router.get(
  '/reports/:id',
  authenticate,
  validate(getReportSchema),
  controller.getReportById
);

// ✅ CREATE APPEAL (users who are targets of moderation)
router.post(
  '/appeals',
  authenticate,
  validate(createAppealSchema),
  controller.createAppeal
);

// ✅ GET OWN APPEALS
router.get(
  '/appeals/:id',
  authenticate,
  validate({ params: getReportSchema.params }), // Reuse report schema for ID validation
  controller.getAppealById
);

// ========================================
// MODERATOR ENDPOINTS
// ========================================

// 🔐 GET ALL REPORTS (moderators only)
router.get(
  '/reports',
  authenticate,
  authorizeRoles('MODERATOR', 'ADMIN', 'SUPER_ADMIN'),
  validate(getReportsSchema),
  controller.getReports
);

// 🔐 CREATE MODERATION CASE (admins only)
router.post(
  '/cases',
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  validate(createCaseSchema),
  controller.createModerationCase
);

// 🔐 ASSIGN MODERATION CASE (admins only)
router.post(
  '/cases/:id/assign',
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  validate(assignCaseSchema),
  controller.assignModerationCase
);

// 🔐 TAKE MODERATION ACTION (moderators only)
router.post(
  '/cases/:id/action',
  authenticate,
  authorizeRoles('MODERATOR', 'ADMIN', 'SUPER_ADMIN'),
  validate(takeActionSchema),
  controller.takeModerationAction
);

// 🔐 RESOLVE MODERATION CASE (assigned moderator or admin)
router.post(
  '/cases/:id/resolve',
  authenticate,
  authorizeRoles('MODERATOR', 'ADMIN', 'SUPER_ADMIN'),
  validate(resolveCaseSchema),
  controller.resolveModerationCase
);

// 🔐 ESCALATE CASE (moderators only)
router.post(
  '/cases/:id/escalate',
  authenticate,
  authorizeRoles('MODERATOR', 'ADMIN', 'SUPER_ADMIN'),
  validate(escalateCaseSchema),
  controller.escalateCase
);

// 🔐 UPDATE APPEAL STATUS (moderators only)
router.patch(
  '/appeals/:id',
  authenticate,
  authorizeRoles('MODERATOR', 'ADMIN', 'SUPER_ADMIN'),
  validate(updateAppealSchema),
  controller.updateAppealStatus
);

// 🔐 GET MODERATION DASHBOARD (moderators only)
router.get(
  '/dashboard',
  authenticate,
  authorizeRoles('MODERATOR', 'ADMIN', 'SUPER_ADMIN'),
  validate(getDashboardSchema),
  controller.getModerationDashboard
);

// 🔐 GET MODERATION LOGS (moderators only)
router.get(
  '/logs',
  authenticate,
  authorizeRoles('MODERATOR', 'ADMIN', 'SUPER_ADMIN'),
  validate(getModerationLogsSchema),
  controller.getModerationLogs
);

// 🔐 GET MODERATION STATS (moderators only)
router.get(
  '/stats',
  authenticate,
  authorizeRoles('MODERATOR', 'ADMIN', 'SUPER_ADMIN'),
  controller.getModerationStats
);

// ========================================
// ADMIN ENDPOINTS
// ========================================

// 🔐 GET USER TRUST SCORE (admins only)
router.get(
  '/trust-scores/:userId',
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  validate({ params: { userId: { type: 'integer', minimum: 1 } } }),
  controller.getUserTrustScore
);

// 🔐 UPDATE USER TRUST SCORE (admins only)
router.patch(
  '/trust-scores/:userId',
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  validate(updateTrustScoreSchema),
  controller.updateUserTrustScore
);

// 🔐 BULK ASSIGN CASES (admins only)
router.post(
  '/bulk/assign-cases',
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  validate({
    body: {
      type: 'object',
      required: ['caseIds', 'moderatorId'],
      properties: {
        caseIds: {
          type: 'array',
          items: { type: 'integer', minimum: 1 },
          minItems: 1,
          maxItems: 50
        },
        moderatorId: { type: 'integer', minimum: 1 }
      },
      additionalProperties: false
    }
  }),
  controller.bulkAssignCases
);

// 🔐 BULK RESOLVE REPORTS (moderators only)
router.post(
  '/bulk/resolve-reports',
  authenticate,
  authorizeRoles('MODERATOR', 'ADMIN', 'SUPER_ADMIN'),
  validate({
    body: {
      type: 'object',
      required: ['reportIds', 'resolution'],
      properties: {
        reportIds: {
          type: 'array',
          items: { type: 'integer', minimum: 1 },
          minItems: 1,
          maxItems: 100
        },
        resolution: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['RESOLVED', 'DISMISSED'] },
            notes: { type: 'string', maxLength: 1000 }
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    }
  }),
  controller.bulkResolveReports
);

// ========================================
// UTILITY ENDPOINTS
// ========================================

// 🔐 GET CASE BY ID (moderators only)
router.get(
  '/cases/:id',
  authenticate,
  authorizeRoles('MODERATOR', 'ADMIN', 'SUPER_ADMIN'),
  validate({ params: { id: { type: 'integer', minimum: 1 } } }),
  controller.getModerationCaseById
);

// 🔐 GET ALL CASES (moderators only)
router.get(
  '/cases',
  authenticate,
  authorizeRoles('MODERATOR', 'ADMIN', 'SUPER_ADMIN'),
  validate({
    query: {
      type: 'object',
      properties: {
        state: { type: 'string' },
        priority: { type: 'string' },
        assignedModeratorId: { type: 'integer', minimum: 1 },
        page: { type: 'integer', minimum: 1, default: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
      },
      additionalProperties: false
    }
  }),
  controller.getModerationCases
);

// 🔐 GET APPEALS (moderators only)
router.get(
  '/appeals',
  authenticate,
  authorizeRoles('MODERATOR', 'ADMIN', 'SUPER_ADMIN'),
  validate({
    query: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        appellantUserId: { type: 'integer', minimum: 1 },
        page: { type: 'integer', minimum: 1, default: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
      },
      additionalProperties: false
    }
  }),
  controller.getAppeals
);

// 🔐 GET USER FLAGS (moderators only)
router.get(
  '/user-flags/:userId',
  authenticate,
  authorizeRoles('MODERATOR', 'ADMIN', 'SUPER_ADMIN'),
  validate({ params: { userId: { type: 'integer', minimum: 1 } } }),
  controller.getUserFlags
);

// 🔐 GET CONTENT FLAGS (moderators only)
router.get(
  '/content-flags',
  authenticate,
  authorizeRoles('MODERATOR', 'ADMIN', 'SUPER_ADMIN'),
  validate({
    query: {
      type: 'object',
      properties: {
        contentType: { type: 'string', enum: ['post', 'comment'] },
        flagType: { type: 'string' },
        reviewed: { type: 'boolean' },
        page: { type: 'integer', minimum: 1, default: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
      },
      additionalProperties: false
    }
  }),
  controller.getContentFlags
);

// 🔐 REVIEW CONTENT FLAG (moderators only)
router.patch(
  '/content-flags/:id/review',
  authenticate,
  authorizeRoles('MODERATOR', 'ADMIN', 'SUPER_ADMIN'),
  validate({
    params: { id: { type: 'integer', minimum: 1 } },
    body: {
      type: 'object',
      required: ['action'],
      properties: {
        action: { type: 'string', enum: ['approve', 'dismiss', 'escalate'] },
        notes: { type: 'string', maxLength: 1000 }
      },
      additionalProperties: false
    }
  }),
  controller.reviewContentFlag
);

export default router;
