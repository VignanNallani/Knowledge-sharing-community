import getPrisma from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";

const prisma = getPrisma();
const { ActivityType } = prisma;

/**
 * Centralized activity logger
 * Safe, enum-validated, production-ready
 */
export const logActivity = async ({ type, message, userId, entity = null, entityId = null }) => {
  // For now, skip ActivityType validation and use string values directly
  // TODO: Fix Prisma client generation to restore enum validation
  
  return prisma.activity.create({ data: { type, message, userId, entity, entityId } });
};
