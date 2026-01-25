// // controllers/adminController.js
// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();

// export const getDashboard = async (req, res) => {
//   const totalUsers = await prisma.user.count();
//   const totalPosts = await prisma.post.count();
//   const totalComments = await prisma.comment.count();
//   const totalEvents = await prisma.event.count();
//   res.json({ totalUsers, totalPosts, totalComments, totalEvents });
// };

// export const getAllUsers = async (req, res) => {
//   const users = await prisma.user.findMany();
//   res.json(users);
// };


import { PrismaClient, ActivityType } from "@prisma/client";
import { logActivity } from "../services/activityService.js";

const prisma = new PrismaClient();

/* ================= PENDING POSTS ================= */
export const getPendingPosts = async (req, res) => {
  const posts = await prisma.post.findMany({
    where: { status: "PENDING" },
    include: {
      author: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(posts);
};

/* ================= APPROVE POST ================= */
export const approvePost = async (req, res) => {
  const postId = parseInt(req.params.id);

  const post = await prisma.post.update({
    where: { id: postId },
    data: { status: "APPROVED" },
  });

  await logActivity({
    type: ActivityType.POST_APPROVED,
    message: `approved post "${post.title}"`,
    userId: req.user.id,
    entity: "POST",
    entityId: post.id,
  });

  res.json({ message: "Post approved" });
};

/* ================= REJECT POST ================= */
export const rejectPost = async (req, res) => {
  const postId = parseInt(req.params.id);

  await prisma.post.update({
    where: { id: postId },
    data: { status: "REJECTED" },
  });

  await logActivity({
    type: ActivityType.POST_REJECTED,
    message: `rejected a post`,
    userId: req.user.id,
    entity: "POST",
    entityId: postId,
  });

  res.json({ message: "Post rejected" });
};
