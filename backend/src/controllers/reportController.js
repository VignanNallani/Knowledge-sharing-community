// src/controllers/reportController.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ✅ Create a report (for post, comment, or user)
export const createReport = async (req, res) => {
  const { type, targetId, reason } = req.body;
  const userId = req.user.id;

  if (!type || !targetId || !reason) {
    return res.status(400).json({ error: "type, targetId, and reason are required" });
  }

  if (!["POST", "COMMENT", "USER"].includes(type.toUpperCase())) {
    return res.status(400).json({ error: "Invalid report type" });
  }

  try {
    const report = await prisma.report.create({
      data: {
        type: type.toUpperCase(),
        targetId,
        reason,
        reporterId: userId,
      },
    });

    res.status(201).json({ message: "Report created successfully", report });
  } catch (err) {
    console.error("Create report error:", err);
    res.status(500).json({ error: "Failed to create report" });
  }
};

// ✅ Get all reports (Admin only)
export const getReports = async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
      },
    });
    res.json(reports);
  } catch (err) {
    console.error("Get reports error:", err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
};

// ✅ Delete a report (Admin only)
export const deleteReport = async (req, res) => {
  const { id } = req.params;

  try {
    const report = await prisma.report.findUnique({ where: { id: parseInt(id) } });
    if (!report) return res.status(404).json({ error: "Report not found" });

    await prisma.report.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Report deleted successfully" });
  } catch (err) {
    console.error("Delete report error:", err);
    res.status(500).json({ error: "Failed to delete report" });
  }
};
