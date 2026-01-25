

// import { PrismaClient, ActivityType } from "@prisma/client";
// import { logActivity } from "../../services/activityService.js";

// const prisma = new PrismaClient();

// /* ================= PENDING POSTS ================= */
// export const getPendingPosts = async (req, res) => {
//   try {
//     const posts = await prisma.post.findMany({
//       where: { status: "PENDING" },
//       include: {
//         author: { select: { id: true, name: true } },
//       },
//       orderBy: { createdAt: "desc" },
//     });

//     res.json(posts);
//   } catch (error) {
//     console.error("GET PENDING POSTS ERROR:", error);
//     res.status(500).json({ error: "Failed to fetch pending posts" });
//   }
// };

// /* ================= APPROVE POST ================= */
// export const approvePost = async (req, res) => {
//   const postId = parseInt(req.params.id);

//   try {
//     const post = await prisma.post.update({
//       where: { id: postId },
//       data: { status: "APPROVED" },
//       include: { author: true },
//     });

//     // Log activity for admin
//     await logActivity({
//       type: ActivityType.POST_APPROVED,
//       message: `approved post "${post.title}"`,
//       userId: req.user.id, // Admin
//       entity: "POST",
//       entityId: post.id,
//     });

//     // Log activity for post author
//     await logActivity({
//       type: ActivityType.POST_APPROVED,
//       message: `your post "${post.title}" was approved by admin`,
//       userId: post.authorId, // Author
//       entity: "POST",
//       entityId: post.id,
//     });

//     res.json({ message: "Post approved" });
//   } catch (error) {
//     console.error("APPROVE POST ERROR:", error);
//     res.status(500).json({ error: "Failed to approve post" });
//   }
// };

// /* ================= REJECT POST ================= */
// export const rejectPost = async (req, res) => {
//   const postId = parseInt(req.params.id);

//   try {
//     const post = await prisma.post.update({
//       where: { id: postId },
//       data: { status: "REJECTED" },
//       include: { author: true },
//     });

//     // Log activity for admin
//     await logActivity({
//       type: ActivityType.POST_REJECTED,
//       message: `rejected post "${post.title}"`,
//       userId: req.user.id, // Admin
//       entity: "POST",
//       entityId: post.id,
//     });

//     // Log activity for post author
//     await logActivity({
//       type: ActivityType.POST_REJECTED,
//       message: `your post "${post.title}" was rejected by admin`,
//       userId: post.authorId, // Author
//       entity: "POST",
//       entityId: post.id,
//     });

//     res.json({ message: "Post rejected" });
//   } catch (error) {
//     console.error("REJECT POST ERROR:", error);
//     res.status(500).json({ error: "Failed to reject post" });
//   }
// };


import { PrismaClient, ActivityType } from "@prisma/client";
import { logActivity } from "../../services/activityService.js";

const prisma = new PrismaClient();

/* ================= PENDING POSTS ================= */
export const getPendingPosts = async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { status: "PENDING" },
      include: {
        author: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(posts);
  } catch (error) {
    console.error("GET PENDING POSTS ERROR:", error);
    res.status(500).json({ error: "Failed to fetch pending posts" });
  }
};

/* ================= APPROVE POST ================= */
export const approvePost = async (req, res) => {
  const postId = parseInt(req.params.id);

  try {
    const post = await prisma.post.update({
      where: { id: postId },
      data: { status: "APPROVED" },
      include: { author: true },
    });

    // Log activity for admin
    await logActivity({
      type: ActivityType.POST_APPROVED,
      message: `approved post "${post.title}"`,
      userId: req.user.id, // Admin
      entity: "POST",
      entityId: post.id,
    });

    // Log activity for post author
    await logActivity({
      type: ActivityType.POST_APPROVED,
      message: `your post "${post.title}" was approved by admin`,
      userId: post.authorId, // Author
      entity: "POST",
      entityId: post.id,
    });

    // ================= SOCKET.IO NOTIFICATION =================
    const io = req.app.get("io");
    io.to(`user-${post.authorId}`).emit("post-notification", {
      message: `Your post "${post.title}" was approved`,
      postId: post.id,
      status: "APPROVED",
    });

    res.json({ message: "Post approved and author notified" });
  } catch (error) {
    console.error("APPROVE POST ERROR:", error);
    res.status(500).json({ error: "Failed to approve post" });
  }
};

/* ================= REJECT POST ================= */
export const rejectPost = async (req, res) => {
  const postId = parseInt(req.params.id);

  try {
    const post = await prisma.post.update({
      where: { id: postId },
      data: { status: "REJECTED" },
      include: { author: true },
    });

    // Log activity for admin
    await logActivity({
      type: ActivityType.POST_REJECTED,
      message: `rejected post "${post.title}"`,
      userId: req.user.id, // Admin
      entity: "POST",
      entityId: post.id,
    });

    // Log activity for post author
    await logActivity({
      type: ActivityType.POST_REJECTED,
      message: `your post "${post.title}" was rejected by admin`,
      userId: post.authorId, // Author
      entity: "POST",
      entityId: post.id,
    });

    // ================= SOCKET.IO NOTIFICATION =================
    const io = req.app.get("io");
    io.to(`user-${post.authorId}`).emit("post-notification", {
      message: `Your post "${post.title}" was rejected`,
      postId: post.id,
      status: "REJECTED",
    });

    res.json({ message: "Post rejected and author notified" });
  } catch (error) {
    console.error("REJECT POST ERROR:", error);
    res.status(500).json({ error: "Failed to reject post" });
  }
};
