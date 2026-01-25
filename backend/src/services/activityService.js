// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();

// /**
//  * Generic activity logger
//  */
// export const logActivity = async ({
//   type,
//   message,
//   userId,
//   entity,
//   entityId
// }) => {
//   return prisma.activity.create({
//     data: {
//       type,
//       message,
//       userId,
//       entity,
//       entityId
//     }
//   });
// };
import { PrismaClient, ActivityType } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Logs user activity in a safe, enum-validated way
 */
export const logActivity = async ({
  type,
  message,
  userId,
  entity = null,
  entityId = null,
}) => {
  // 🔐 Runtime safety: ensure enum value is valid
  if (!Object.values(ActivityType).includes(type)) {
    throw new Error(`Invalid ActivityType: ${type}`);
  }

  return prisma.activity.create({
    data: {
      type,
      message,
      userId,
      entity,
      entityId,
    },
  });
};
