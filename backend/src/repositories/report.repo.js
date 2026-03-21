import prisma from '../config/prisma.js';

export const findReportById = (reportId, options = {}) =>
  prisma.report.findUnique({
    where: { id: reportId },
    ...options,
  });

export const createReport = (data) =>
  prisma.report.create({
    data,
    include: {
      reporter: { select: { id: true, name: true, email: true } },
    },
  });

export const updateReport = (reportId, data) =>
  prisma.report.update({
    where: { id: reportId },
    data,
    include: {
      reporter: { select: { id: true, name: true, email: true } },
    },
  });

export const deleteReport = (reportId) =>
  prisma.report.delete({
    where: { id: reportId },
  });

export const findReports = (options = {}) =>
  prisma.report.findMany({
    ...options,
  });

export const findExistingReport = ({ type, targetId, reporterId }) =>
  prisma.report.findFirst({
    where: { type, targetId, reporterId },
  });

export const countReports = (where = {}) =>
  prisma.report.count({ where });

export const findReportsByType = (type, options = {}) =>
  prisma.report.findMany({
    where: { type },
    ...options,
  });

export const findReportsByStatus = (status, options = {}) =>
  prisma.report.findMany({
    where: { status },
    ...options,
  });

export const searchReports = ({ where, skip, take, include }) =>
  prisma.report.findMany({
    where,
    skip,
    take,
    include,
    orderBy: { createdAt: "desc" },
  });

export default {
  findReportById,
  createReport,
  updateReport,
  deleteReport,
  findReports,
  findExistingReport,
  countReports,
  findReportsByType,
  findReportsByStatus,
  searchReports,
};
