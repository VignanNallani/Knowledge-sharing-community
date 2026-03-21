import { ApiError } from '../utils/ApiError.js';
import { paginate } from '../utils/pagination.js';
import prisma from '../config/prisma.js';
import reportRepository from '../repositories/report.repo.js';

class ReportService {
  async createReport(reportData, userId) {
    const { type, targetId, reason } = reportData;

    if (!type || !targetId || !reason) {
      throw new ApiError(400, 'type, targetId, and reason are required');
    }

    if (!['POST', 'COMMENT', 'USER'].includes(type.toUpperCase())) {
      throw new ApiError(400, 'Invalid report type');
    }

    const existingReport = await reportRepository.findExistingReport({
      type: type.toUpperCase(),
      targetId,
      reporterId: userId,
    });

    if (existingReport) {
      throw new ApiError(409, 'You have already reported this item');
    }

    const report = await reportRepository.createReport({
      type: type.toUpperCase(),
      targetId,
      reason,
      reporterId: userId,
    });

    return report;
  }

  async getReports(query) {
    const { skip, limit, page } = paginate(query);
    const { status, type } = query;

    const where = {};
    if (status) where.status = status.toUpperCase();
    if (type) where.type = type.toUpperCase();

    const [reports, total] = await Promise.all([
      reportRepository.findReports({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { 
          reporter: { select: { id: true, name: true, email: true } },
        },
      }),
      reportRepository.countReports(where),
    ]);

    return {
      reports,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getReportById(reportId) {
    const report = await reportRepository.findReportById(parseInt(reportId), {
      include: {
        reporter: { select: { id: true, name: true, email: true } },
      },
    });

    if (!report) {
      throw new ApiError(404, 'Report not found');
    }

    return report;
  }

  async updateReportStatus(reportId, status, adminId, resolutionNotes = null) {
    return await prisma.$transaction(async (tx) => {
      const report = await tx.report.findUnique({
        where: { id: parseInt(reportId) }
      });
      
      if (!report) {
        throw new ApiError(404, 'Report not found');
      }

      if (!['PENDING', 'RESOLVED', 'DISMISSED'].includes(status.toUpperCase())) {
        throw new ApiError(400, 'Invalid status');
      }

      const oldStatus = report.status;
      const newStatus = status.toUpperCase();

      // Atomic operations: update report and create audit trail
      const [updatedReport] = await Promise.all([
        tx.report.update({
          where: { id: parseInt(reportId) },
          data: { 
            status: newStatus,
            resolvedBy: adminId,
            resolvedAt: newStatus !== 'PENDING' ? new Date() : null
          }
        }),
        // Create audit trail entry for status change
        ...(oldStatus !== newStatus ? [{
          data: {
            entityType: 'REPORT',
            entityId: parseInt(reportId),
            action: `STATUS_CHANGED_${newStatus}`,
            oldValues: { status: oldStatus },
            newValues: { status: newStatus },
            performedBy: adminId,
            timestamp: new Date(),
            notes: resolutionNotes
          }
        }] : [])
      ]);

      return updatedReport;
    }, {
      isolationLevel: 'ReadCommitted',
      timeout: 5000 // 5 second timeout
    });
  }

  async deleteReport(reportId) {
    const report = await reportRepository.findReportById(parseInt(reportId));
    if (!report) {
      throw new ApiError(404, 'Report not found');
    }

    await reportRepository.deleteReport(parseInt(reportId));
    return { message: 'Report deleted successfully' };
  }

  async getReportStats() {
    const [total, pending, resolved, dismissed] = await Promise.all([
      reportRepository.countReports(),
      reportRepository.countReports({ status: 'PENDING' }),
      reportRepository.countReports({ status: 'RESOLVED' }),
      reportRepository.countReports({ status: 'DISMISSED' }),
    ]);

    return {
      total,
      pending,
      resolved,
      dismissed,
    };
  }

  async getReportsByType(type, query) {
    const { skip, limit, page } = paginate(query);

    if (!['POST', 'COMMENT', 'USER'].includes(type.toUpperCase())) {
      throw new ApiError(400, 'Invalid report type');
    }

    const where = { type: type.toUpperCase() };

    const [reports, total] = await Promise.all([
      reportRepository.findReports({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { 
          reporter: { select: { id: true, name: true, email: true } },
        },
      }),
      reportRepository.countReports(where),
    ]);

    return {
      reports,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

export default new ReportService();
