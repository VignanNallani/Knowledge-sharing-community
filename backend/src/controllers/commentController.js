

// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();

// /* GET COMMENTS FOR A POST */
// export const getComments = async (req, res) => {
//   const { postId } = req.params;

//   try {
//     const comments = await prisma.comment.findMany({
//       where: { postId: parseInt(postId) },
//       orderBy: { createdAt: "asc" },
//       include: {
//         author: {
//           select: { id: true, name: true, email: true },
//         },
//         commentLikes: {
//           select: { userId: true },
//         },
//       },
//     });

//     const userId = req.user.id;

//     const formattedComments = comments.map((comment) => ({
//       ...comment,
//       likeCount: comment.commentLikes.length,
//       isLiked: comment.commentLikes.some((like) => like.userId === userId),
//       commentLikes: undefined,
//     }));

//     res.json({ comments: formattedComments });
//   } catch (err) {
//     console.error("Get comments error:", err);
//     res.status(500).json({ error: "Failed to fetch comments" });
//   }
// };

// /* CREATE COMMENT */
// export const createComment = async (req, res) => {
//   const { postId } = req.params;
//   const { content } = req.body;

//   if (!content || content.trim().length === 0) {
//     return res.status(400).json({ error: "Comment content is required" });
//   }

//   try {
//     const comment = await prisma.comment.create({
//       data: {
//         content,
//         postId: parseInt(postId),
//         authorId: req.user.id,
//       },
//       include: {
//         author: { select: { id: true, name: true, email: true } },
//       },
//     });

//     res.status(201).json({ message: "Comment created", comment });
//   } catch (err) {
//     console.error("Create comment error:", err);
//     res.status(500).json({ error: "Failed to create comment" });
//   }
// };

// /* REPLY TO COMMENT (LOGICAL REPLY – SAME TABLE) */
// export const replyComment = async (req, res) => {
//   const { commentId } = req.params;
//   const { content } = req.body;

//   if (!content || content.trim().length === 0) {
//     return res.status(400).json({ error: "Reply content is required" });
//   }

//   try {
//     const parentComment = await prisma.comment.findUnique({
//       where: { id: parseInt(commentId) },
//     });

//     if (!parentComment) {
//       return res.status(404).json({ error: "Parent comment not found" });
//     }

//     const reply = await prisma.comment.create({
//       data: {
//         content,
//         postId: parentComment.postId,
//         authorId: req.user.id,
//       },
//       include: {
//         author: { select: { id: true, name: true, email: true } },
//       },
//     });

//     res.status(201).json({ message: "Reply added", reply });
//   } catch (err) {
//     console.error("Reply comment error:", err);
//     res.status(500).json({ error: "Failed to reply to comment" });
//   }
// };

// /* UPDATE COMMENT */
// export const updateComment = async (req, res) => {
//   const { id } = req.params;
//   const { content } = req.body;

//   try {
//     const comment = await prisma.comment.findUnique({
//       where: { id: parseInt(id) },
//     });

//     if (!comment) {
//       return res.status(404).json({ error: "Comment not found" });
//     }

//     if (comment.authorId !== req.user.id && req.user.role !== "ADMIN") {
//       return res.status(403).json({ error: "Not authorized" });
//     }

//     const updated = await prisma.comment.update({
//       where: { id: parseInt(id) },
//       data: { content },
//       include: {
//         author: { select: { id: true, name: true, email: true } },
//       },
//     });

//     res.json({ message: "Comment updated", comment: updated });
//   } catch (err) {
//     console.error("Update comment error:", err);
//     res.status(500).json({ error: "Failed to update comment" });
//   }
// };

// /* DELETE COMMENT */
// export const deleteComment = async (req, res) => {
//   const { id } = req.params;

//   try {
//     const comment = await prisma.comment.findUnique({
//       where: { id: parseInt(id) },
//     });

//     if (!comment) {
//       return res.status(404).json({ error: "Comment not found" });
//     }

//     if (comment.authorId !== req.user.id && req.user.role !== "ADMIN") {
//       return res.status(403).json({ error: "Not authorized" });
//     }

//     await prisma.comment.delete({
//       where: { id: parseInt(id) },
//     });

//     res.json({ message: "Comment deleted successfully" });
//   } catch (err) {
//     console.error("Delete comment error:", err);
//     res.status(500).json({ error: "Failed to delete comment" });
//   }
// };

// /* TOGGLE LIKE / UNLIKE COMMENT OR REPLY */
// export const toggleCommentLike = async (req, res) => {
//   const commentId = parseInt(req.params.commentId);
//   const userId = req.user.id;

//   try {
//     const comment = await prisma.comment.findUnique({
//       where: { id: commentId },
//     });

//     if (!comment) {
//       return res.status(404).json({ error: "Comment not found" });
//     }

//     const existingLike = await prisma.commentLike.findUnique({
//       where: {
//         userId_commentId: {
//           userId,
//           commentId,
//         },
//       },
//     });

//     if (existingLike) {
//       await prisma.commentLike.delete({
//         where: {
//           userId_commentId: {
//             userId,
//             commentId,
//           },
//         },
//       });

//       return res.json({ message: "Comment unliked", isLiked: false });
//     }

//     await prisma.commentLike.create({
//       data: {
//         userId,
//         commentId,
//       },
//     });

//     res.json({ message: "Comment liked", isLiked: true });
//   } catch (err) {
//     console.error("Toggle comment like error:", err);
//     res.status(500).json({ error: "Failed to toggle comment like" });
//   }
// };


import prisma from "../config/prisma.js";

/**
 * GET COMMENTS FOR A POST (with pagination + likes)
 * GET /api/comments/:postId?page=1&limit=10
 */
export const getComments = async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (isNaN(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid postId",
      });
    }

    const userId = req.user.id;

    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
      include: {
        author: {
          select: { id: true, name: true },
        },
        commentLikes: {
          select: { userId: true },
        },
      },
    });

    const formatted = comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      author: c.author,
      likesCount: c.commentLikes.length,
      isLiked: c.commentLikes.some((l) => l.userId === userId),
    }));

    res.json({
      success: true,
      message: "Comments fetched",
      data: {
        comments: formatted,
        page,
        limit,
      },
    });
  } catch (err) {
    console.error("GET COMMENTS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch comments",
    });
  }
};

/**
 * CREATE COMMENT
 * POST /api/comments/:postId
 */
export const createComment = async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment content required",
      });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        postId,
        authorId: req.user.id,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: "Comment created",
      data: comment,
    });
  } catch (err) {
    console.error("CREATE COMMENT ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create comment",
    });
  }
};

/**
 * REPLY TO COMMENT (logical reply)
 * POST /api/comments/:commentId/reply
 */
export const replyComment = async (req, res) => {
  try {
    const parentId = Number(req.params.commentId);
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply content required",
      });
    }

    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent comment not found",
      });
    }

    const reply = await prisma.comment.create({
      data: {
        content,
        postId: parent.postId,
        authorId: req.user.id,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: "Reply added",
      data: reply,
    });
  } catch (err) {
    console.error("REPLY COMMENT ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to reply",
    });
  }
};

/**
 * UPDATE COMMENT
 */
export const updateComment = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { content } = req.body;

    const comment = await prisma.comment.findUnique({ where: { id } });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (comment.authorId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { content },
    });

    res.json({
      success: true,
      message: "Comment updated",
      data: updated,
    });
  } catch (err) {
    console.error("UPDATE COMMENT ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update comment",
    });
  }
};

/**
 * DELETE COMMENT
 */
export const deleteComment = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const comment = await prisma.comment.findUnique({ where: { id } });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (comment.authorId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    await prisma.comment.delete({ where: { id } });

    res.json({
      success: true,
      message: "Comment deleted",
    });
  } catch (err) {
    console.error("DELETE COMMENT ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete comment",
    });
  }
};

/**
 * TOGGLE COMMENT LIKE
 */
export const toggleCommentLike = async (req, res) => {
  try {
    const commentId = Number(req.params.commentId);
    const userId = req.user.id;

    const existing = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: { userId, commentId },
      },
    });

    if (existing) {
      await prisma.commentLike.delete({
        where: { userId_commentId: { userId, commentId } },
      });

      return res.json({
        success: true,
        message: "Comment unliked",
        data: { isLiked: false },
      });
    }

    await prisma.commentLike.create({
      data: { userId, commentId },
    });

    res.json({
      success: true,
      message: "Comment liked",
      data: { isLiked: true },
    });
  } catch (err) {
    console.error("TOGGLE COMMENT LIKE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to toggle like",
    });
  }
};
