// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();

// /**
//  * GET /api/activities
//  * Global activity feed
//  */
// export const getActivities = async (req, res) => {
//   try {
//     const page = Number(req.query.page) || 1;
//     const limit = Number(req.query.limit) || 20;
//     const skip = (page - 1) * limit;

//     const activities = await prisma.activity.findMany({
//       skip,
//       take: limit,
//       orderBy: { createdAt: "desc" },
//       include: {
//         user: {
//           select: {
//             id: true,
//             name: true,
//             role: true
//           }
//         }
//       }
//     });

//     res.json(activities);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };


import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * GET /api/activities
 * Fetch paginated activity feed for the logged-in user
 */
export const getActivities = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [activities, totalCount] = await Promise.all([
      prisma.activity.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        }
      }),
      prisma.activity.count({ where: { userId } })
    ]);

    res.json({
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      activities
    });
  } catch (error) {
    console.error("GET ACTIVITIES ERROR:", error);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
};
