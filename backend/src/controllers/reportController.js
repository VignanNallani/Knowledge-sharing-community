import ApiResponse from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { paginate } from '../utils/pagination.js';
import reportService from '../services/report.service.js';
import { Response } from '../utils/ResponseBuilder.js';

// ✅ Create a report (for post, comment, or user)
export const createReport = asyncHandler(async (req, res) => {
  const { type, targetId, reason } = req.body;
  const userId = req.user.id;
  
  const report = await reportService.createReport({ type, targetId, reason }, userId);
  return Response.created(res, report, 'Report created successfully');
});

// ✅ Get all reports (Admin only)
export const getReports = asyncHandler(async (req, res) => {
  const { skip, limit, page } = paginate(req.query);
  
  const result = await reportService.getReports({ skip, limit, page });
  
  return Response.paginated(res, result.reports, {
    page,
    limit,
    total: result.total
  }, 'Reports fetched successfully');
});

// ✅ Delete a report (Admin only)
export const deleteReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await reportService.deleteReport(parseInt(id));
  return Response.success(res, null, 'Report deleted successfully');
});
