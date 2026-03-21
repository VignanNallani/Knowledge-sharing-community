/**
 * Moderation System Controller
 * Week-3 Ownership Feature Build
 * API endpoints and request handling
 */

import { ApiError } from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import asyncHandler from '../../middleware/asyncHandler.js';
import ModerationService from './service.js';
import ModerationPolicy from './policies.js';
import { LOG_TYPE } from './constants.js';
import prismaService from '../../config/prisma.js';
import activityService from '../services/activityService.js';

class ModerationController {
  constructor() {
    this.service = new ModerationService(
      // These will be injected or imported
      global.prisma || prismaService,
      global.activityService || activityService
    );
  }

  // ========================================
  // REPORT ENDPOINTS
  // ========================================

  createReport = asyncHandler(async (req, res) => {
    const reportData = req.body;
    const reporterId = req.user.id;

    const report = await this.service.createReport(reportData, reporterId);

    return ApiResponse.success(res, {
      message: 'Report submitted successfully',
      data: { report }
    }, 201);
  });

  getReportById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const report = await this.service.getReportById(parseInt(id), req.user);

    return ApiResponse.success(res, {
      message: 'Report fetched successfully',
      data: { report }
    });
  });

  getReports = asyncHandler(async (req, res) => {
    if (!ModerationPolicy.isModerator(req.user)) {
      throw new ApiError(403, 'Moderator access required');
    }

    const filters = req.query;
    const result = await this.service.getReports(filters, req.user);

    return ApiResponse.success(res, {
      message: 'Reports fetched successfully',
      data: result
    });
  });

  // ========================================
  // MODERATION CASE ENDPOINTS
  // ========================================

  createModerationCase = asyncHandler(async (req, res) => {
    if (!ModerationPolicy.canAssignCases(req.user)) {
      throw new ApiError(403, 'Insufficient permissions to create cases');
    }

    const caseData = req.body;
    const moderationCase = await this.service.createModerationCase(caseData, req.user.id);

    return ApiResponse.success(res, {
      message: 'Moderation case created successfully',
      data: { moderationCase }
    }, 201);
  });

  assignModerationCase = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { assignedModeratorId } = req.body;

    const moderationCase = await this.service.assignModerationCase(
      parseInt(id), 
      assignedModeratorId, 
      req.user.id
    );

    return ApiResponse.success(res, {
      message: 'Case assigned successfully',
      data: { moderationCase }
    });
  });

  takeModerationAction = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const actionData = req.body;

    const action = await this.service.takeModerationAction(
      parseInt(id), 
      actionData, 
      req.user.id
    );

    return ApiResponse.success(res, {
      message: 'Action taken successfully',
      data: { action }
    });
  });

  resolveModerationCase = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const resolutionData = req.body;

    const moderationCase = await this.service.resolveModerationCase(
      parseInt(id), 
      resolutionData, 
      req.user.id
    );

    return ApiResponse.success(res, {
      message: 'Case resolved successfully',
      data: { moderationCase }
    });
  });

  // ========================================
  // APPEALS ENDPOINTS
  // ========================================

  createAppeal = asyncHandler(async (req, res) => {
    const appealData = req.body;
    appealData.appellantUserId = req.user.id;

    const appeal = await this.service.createAppeal(appealData, req.user.id);

    return ApiResponse.success(res, {
      message: 'Appeal submitted successfully',
      data: { appeal }
    }, 201);
  });

  updateAppealStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    const appeal = await this.service.updateAppealStatus(
      parseInt(id), 
      updateData, 
      req.user.id
    );

    return ApiResponse.success(res, {
      message: 'Appeal status updated successfully',
      data: { appeal }
    });
  });

  // ========================================
  // TRUST SCORE ENDPOINTS
  // ========================================

  getUserTrustScore = asyncHandler(async (req, res) => {
    if (!ModerationPolicy.canAccessTrustScores(req.user)) {
      throw new ApiError(403, 'Insufficient permissions to access trust scores');
    }

    const { userId } = req.params;
    const trustScore = await this.service.calculateTrustScore(parseInt(userId));

    return ApiResponse.success(res, {
      message: 'Trust score fetched successfully',
      data: { trustScore }
    });
  });

  updateUserTrustScore = asyncHandler(async (req, res) => {
    if (!ModerationPolicy.canModifyTrustScores(req.user)) {
      throw new ApiError(403, 'Insufficient permissions to modify trust scores');
    }

    const { userId } = req.params;
    const updateData = req.body;

    const trustScore = await this.service.updateUserTrustScore(
      parseInt(userId), 
      updateData, 
      req.user.id
    );

    return ApiResponse.success(res, {
      message: 'Trust score updated successfully',
      data: { trustScore }
    });
  });

  // ========================================
  // DASHBOARD ENDPOINTS
  // ========================================

  getModerationDashboard = asyncHandler(async (req, res) => {
    if (!ModerationPolicy.canAccessDashboard(req.user)) {
      throw new ApiError(403, 'Insufficient permissions to access dashboard');
    }

    const filters = req.query;
    const dashboardData = await this.service.getDashboardData(filters);

    return ApiResponse.success(res, {
      message: 'Dashboard data fetched successfully',
      data: dashboardData
    });
  });

  // ========================================
  // LOGS ENDPOINTS
  // ========================================

  getModerationLogs = asyncHandler(async (req, res) => {
    if (!ModerationPolicy.canAccessLogs(req.user)) {
      throw new ApiError(403, 'Insufficient permissions to access logs');
    }

    const filters = req.query;
    const logs = await this.service.getModerationLogs(filters);

    return ApiResponse.success(res, {
      message: 'Moderation logs fetched successfully',
      data: logs
    });
  });

  // ========================================
  // UTILITY ENDPOINTS
  // ========================================

  getModerationStats = asyncHandler(async (req, res) => {
    if (!ModerationPolicy.isModerator(req.user)) {
      throw new ApiError(403, 'Moderator access required');
    }

    const stats = await this.service.getModerationStats(req.query);

    return ApiResponse.success(res, {
      message: 'Moderation stats fetched successfully',
      data: stats
    });
  });

  escalateCase = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { escalationReason, escalatedAdminId } = req.body;

    if (!ModerationPolicy.isModerator(req.user)) {
      throw new ApiError(403, 'Moderator access required');
    }

    const moderationCase = await this.service.escalateCase(
      parseInt(id), 
      escalationReason, 
      escalatedAdminId, 
      req.user.id
    );

    return ApiResponse.success(res, {
      message: 'Case escalated successfully',
      data: { moderationCase }
    });
  });

  // ========================================
  // BULK OPERATIONS
  // ========================================

  bulkAssignCases = asyncHandler(async (req, res) => {
    if (!ModerationPolicy.canAssignCases(req.user)) {
      throw new ApiError(403, 'Insufficient permissions to assign cases');
    }

    const { caseIds, moderatorId } = req.body;
    const results = await this.service.bulkAssignCases(caseIds, moderatorId, req.user.id);

    return ApiResponse.success(res, {
      message: 'Cases assigned successfully',
      data: results
    });
  });

  bulkResolveReports = asyncHandler(async (req, res) => {
    if (!ModerationPolicy.isModerator(req.user)) {
      throw new ApiError(403, 'Moderator access required');
    }

    const { reportIds, resolution } = req.body;
    const results = await this.service.bulkResolveReports(reportIds, resolution, req.user.id);

    return ApiResponse.success(res, {
      message: 'Reports resolved successfully',
      data: results
    });
  });
}

export default ModerationController;
