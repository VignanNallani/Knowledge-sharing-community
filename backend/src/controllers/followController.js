


// import { PrismaClient } from "@prisma/client";
// import { logActivity } from "../services/activityService.js";

// const prisma = new PrismaClient();

// /* ================= FOLLOW USER ================= */
// export const followUser = async (req, res) => {
//   const followerId = req.user.id;
//   const followingId = Number(req.params.userId);

//   if (followerId === followingId) {
//     return res.status(400).json({ error: "You cannot follow yourself" });
//   }

//   try {
//     const userToFollow = await prisma.user.findUnique({
//       where: { id: followingId },
//     });

//     if (!userToFollow) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     await prisma.follower.create({
//       data: { followerId, followingId },
//     });

//     await logActivity({
//       type: "USER_FOLLOWED",
//       message: `started following ${userToFollow.name}`,
//       userId: followerId,
//       entity: "USER",
//       entityId: followingId,
//     });

//     res.json({ message: "User followed successfully" });
//   } catch (err) {
//     if (err.code === "P2002") {
//       return res.status(400).json({ error: "Already following this user" });
//     }

//     console.error("FOLLOW USER ERROR:", err);
//     res.status(500).json({ error: "Failed to follow user" });
//   }
// };

// /* ================= UNFOLLOW USER ================= */
// export const unfollowUser = async (req, res) => {
//   const followerId = req.user.id;
//   const followingId = Number(req.params.userId);

//   try {
//     await prisma.follower.delete({
//       where: {
//         followerId_followingId: { followerId, followingId },
//       },
//     });

//    await logActivity({
//   type: "USER_FOLLOWED",
//   message: `started following ${userToFollow.name}`,
//   userId: followerId,
// });


//     res.json({ message: "User unfollowed successfully" });
//   } catch (err) {
//     console.error("UNFOLLOW USER ERROR:", err);
//     res.status(400).json({ error: "You are not following this user" });
//   }
// };

// /* ================= GET FOLLOWERS ================= */
// export const getFollowers = async (req, res) => {
//   const userId = Number(req.params.userId);

//   const followers = await prisma.follower.findMany({
//     where: { followingId: userId },
//     include: { follower: true },
//   });

//   res.json({ count: followers.length, followers });
// };

// /* ================= GET FOLLOWING ================= */
// export const getFollowing = async (req, res) => {
//   const userId = Number(req.params.userId);

//   const following = await prisma.follower.findMany({
//     where: { followerId: userId },
//     include: { following: true },
//   });

//   res.json({ count: following.length, following });
// };

// /* ================= IS FOLLOWING ================= */
// export const isFollowing = async (req, res) => {
//   const followerId = req.user.id;
//   const followingId = Number(req.params.userId);

//   const follow = await prisma.follower.findUnique({
//     where: {
//       followerId_followingId: { followerId, followingId },
//     },
//   });

//   res.json({ isFollowing: !!follow });
// };




import { PrismaClient, ActivityType } from "@prisma/client";
import { logActivity } from "../services/activityService.js";

const prisma = new PrismaClient();

/* ================= FOLLOW USER ================= */
export const followUser = async (req, res) => {
  const followerId = req.user.id;
  const followingId = Number(req.params.userId);

  if (followerId === followingId) {
    return res.status(400).json({ error: "You cannot follow yourself" });
  }

  try {
    const userToFollow = await prisma.user.findUnique({
      where: { id: followingId },
      select: { id: true, name: true },
    });

    if (!userToFollow) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create follow relationship
    await prisma.follower.create({
      data: { followerId, followingId },
    });

    // Log activity safely
    try {
      await logActivity({
        type: ActivityType.USER_FOLLOWED,
        message: `started following ${userToFollow.name}`,
        userId: followerId,
        entity: "USER",
        entityId: followingId,
      });
    } catch (err) {
      console.warn("Activity logging failed (follow):", err.message);
    }

    return res.status(200).json({ message: "User followed successfully" });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Already following this user" });
    }

    console.error("FOLLOW USER ERROR:", err);
    return res.status(500).json({ error: "Failed to follow user" });
  }
};

/* ================= UNFOLLOW USER ================= */
export const unfollowUser = async (req, res) => {
  const followerId = req.user.id;
  const followingId = Number(req.params.userId);

  try {
    const existingFollow = await prisma.follower.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
      include: { following: { select: { name: true } } },
    });

    if (!existingFollow) {
      return res.status(400).json({ error: "You are not following this user" });
    }

    await prisma.follower.delete({
      where: { followerId_followingId: { followerId, followingId } },
    });

    // Log activity safely
    try {
      await logActivity({
        type: ActivityType.USER_UNFOLLOWED,
        message: `stopped following ${existingFollow.following.name}`,
        userId: followerId,
        entity: "USER",
        entityId: followingId,
      });
    } catch (err) {
      console.warn("Activity logging failed (unfollow):", err.message);
    }

    return res.status(200).json({ message: "User unfollowed successfully" });
  } catch (err) {
    console.error("UNFOLLOW USER ERROR:", err);
    return res.status(500).json({ error: "Failed to unfollow user" });
  }
};

/* ================= GET FOLLOWERS ================= */
export const getFollowers = async (req, res) => {
  const userId = Number(req.params.userId);
  const followers = await prisma.follower.findMany({
    where: { followingId: userId },
    include: { follower: true },
  });

  return res.json({ count: followers.length, followers });
};

/* ================= GET FOLLOWING ================= */
export const getFollowing = async (req, res) => {
  const userId = Number(req.params.userId);
  const following = await prisma.follower.findMany({
    where: { followerId: userId },
    include: { following: true },
  });

  return res.json({ count: following.length, following });
};

/* ================= IS FOLLOWING ================= */
export const isFollowing = async (req, res) => {
  const followerId = req.user.id;
  const followingId = Number(req.params.userId);

  const follow = await prisma.follower.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });

  return res.json({ isFollowing: Boolean(follow) });
};
