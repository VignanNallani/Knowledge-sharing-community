




// import { PrismaClient, ActivityType } from "@prisma/client";
// import { logActivity } from "../services/activityService.js";

// const prisma = new PrismaClient();

// /* ================= GET POSTS ================= */
// export const getPosts = async (req, res) => {
//   const page = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.limit) || 10;
//   const skip = (page - 1) * limit;

//   try {
//     const posts = await prisma.post.findMany({
//       where: { status: "APPROVED" }, // 🔥 moderation
//       skip,
//       take: limit,
//       orderBy: { createdAt: "desc" },
//       include: {
//         author: { select: { id: true, name: true, profileImage: true } },
//         likes: true,
//         comments: {
//           where: { parentCommentId: null },
//           include: {
//             author: true,
//             commentLikes: true,
//             replies: {
//               include: { author: true, commentLikes: true },
//             },
//           },
//         },
//         tags: { include: { tag: true } },
//       },
//     });

//     const totalPosts = await prisma.post.count({
//       where: { status: "APPROVED" },
//     });

//     res.json({
//       posts: posts.map((p) => ({
//         ...p,
//         likeCount: p.likes.length,
//         commentCount: p.comments.length,
//         isLiked: p.likes.some((l) => l.userId === req.user.id),
//         tags: p.tags.map((t) => t.tag.name),
//         comments: p.comments.map((c) => ({
//           ...c,
//           likeCount: c.commentLikes.length,
//           isLiked: c.commentLikes.some(
//             (l) => l.userId === req.user.id
//           ),
//           replies: c.replies.map((r) => ({
//             ...r,
//             likeCount: r.commentLikes.length,
//             isLiked: r.commentLikes.some(
//               (l) => l.userId === req.user.id
//             ),
//           })),
//         })),
//       })),
//       pagination: {
//         currentPage: page,
//         totalPages: Math.ceil(totalPosts / limit),
//         totalPosts,
//       },
//     });
//   } catch (err) {
//     console.error("GET POSTS ERROR:", err);
//     res.status(500).json({ error: "Failed to fetch posts" });
//   }
// };

// /* ================= CREATE POST ================= */
// export const createPost = async (req, res) => {
//   const { title, content, tags } = req.body;

//   if (!title || !content) {
//     return res.status(400).json({ error: "Title and content required" });
//   }

//   try {
//     const tagRecords = tags?.length
//       ? await Promise.all(
//           tags.map((tag) =>
//             prisma.tag.upsert({
//               where: { name: tag.toLowerCase() },
//               update: {},
//               create: { name: tag.toLowerCase() },
//             })
//           )
//         )
//       : [];

//     const post = await prisma.post.create({
//       data: {
//         title,
//         content,
//         authorId: req.user.id,
//         status: "PENDING", // 🔥 moderation
//         tags: { create: tagRecords.map((t) => ({ tagId: t.id })) },
//       },
//     });

//     await logActivity({
//       type: ActivityType.POST_CREATED,
//       message: `submitted post "${post.title}" for approval`,
//       userId: req.user.id,
//       entity: "POST",
//       entityId: post.id,
//     });

//     res.status(201).json({
//       message: "Post submitted for admin approval",
//       post,
//     });
//   } catch (err) {
//     console.error("CREATE POST ERROR:", err);
//     res.status(500).json({ error: "Failed to create post" });
//   }
// };

// /* ================= LIKE POST ================= */
// export const likePost = async (req, res) => {
//   const postId = parseInt(req.params.id);
//   const userId = req.user.id;

//   try {
//     const post = await prisma.post.findUnique({ where: { id: postId } });
//     if (!post) return res.status(404).json({ error: "Post not found" });

//     const existing = await prisma.like.findFirst({
//       where: { postId, userId },
//     });

//     if (existing) {
//       await prisma.like.delete({ where: { id: existing.id } });
//       return res.json({ liked: false });
//     }

//     await prisma.like.create({ data: { postId, userId } });

//     await logActivity({
//       type: ActivityType.POST_LIKED,
//       message: `liked post "${post.title}"`,
//       userId,
//       entity: "POST",
//       entityId: post.id,
//     });

//     res.json({ liked: true });
//   } catch (err) {
//     console.error("LIKE POST ERROR:", err);
//     res.status(500).json({ error: "Failed to like post" });
//   }
// };

// /* ================= CREATE COMMENT ================= */
// export const createComment = async (req, res) => {
//   const { postId, content, parentCommentId } = req.body;

//   if (!content) {
//     return res.status(400).json({ error: "Comment content required" });
//   }

//   try {
//     const post = await prisma.post.findUnique({
//       where: { id: parseInt(postId) },
//     });
//     if (!post) return res.status(404).json({ error: "Post not found" });

//     const comment = await prisma.comment.create({
//       data: {
//         content,
//         postId: post.id,
//         parentCommentId: parentCommentId || null,
//         authorId: req.user.id,
//       },
//       include: { author: true },
//     });

//     await logActivity({
//       type: ActivityType.COMMENT_CREATED,
//       message: `commented on post "${post.title}"`,
//       userId: req.user.id,
//       entity: "POST",
//       entityId: post.id,
//     });

//     res.status(201).json({ comment });
//   } catch (err) {
//     console.error("CREATE COMMENT ERROR:", err);
//     res.status(500).json({ error: "Failed to add comment" });
//   }
// };

// /* ================= GET COMMENTS ================= */
// export const getComments = async (req, res) => {
//   const postId = parseInt(req.params.postId);

//   try {
//     const comments = await prisma.comment.findMany({
//       where: { postId, parentCommentId: null },
//       include: {
//         author: true,
//         commentLikes: true,
//         replies: { include: { author: true, commentLikes: true } },
//       },
//       orderBy: { createdAt: "asc" },
//     });

//     res.json({
//       comments: comments.map((c) => ({
//         ...c,
//         likeCount: c.commentLikes.length,
//         isLiked: c.commentLikes.some(
//           (l) => l.userId === req.user.id
//         ),
//         replies: c.replies.map((r) => ({
//           ...r,
//           likeCount: r.commentLikes.length,
//           isLiked: r.commentLikes.some(
//             (l) => l.userId === req.user.id
//           ),
//         })),
//       })),
//     });
//   } catch (err) {
//     console.error("GET COMMENTS ERROR:", err);
//     res.status(500).json({ error: "Failed to fetch comments" });
//   }
// };

// /* ================= LIKE COMMENT ================= */
// export const likeComment = async (req, res) => {
//   const commentId = parseInt(req.params.commentId);
//   const userId = req.user.id;

//   try {
//     const comment = await prisma.comment.findUnique({
//       where: { id: commentId },
//       include: { post: true },
//     });
//     if (!comment) return res.status(404).json({ error: "Comment not found" });

//     const existing = await prisma.commentLike.findFirst({
//       where: { commentId, userId },
//     });

//     if (existing) {
//       await prisma.commentLike.delete({ where: { id: existing.id } });
//       return res.json({ liked: false });
//     }

//     await prisma.commentLike.create({ data: { commentId, userId } });

//     await logActivity({
//       type: ActivityType.COMMENT_LIKED,
//       message: `liked a comment`,
//       userId,
//       entity: "COMMENT",
//       entityId: comment.id,
//     });

//     res.json({ liked: true });
//   } catch (err) {
//     console.error("LIKE COMMENT ERROR:", err);
//     res.status(500).json({ error: "Failed to like comment" });
//   }
// };

// /* ================= DELETE COMMENT ================= */
// export const deleteComment = async (req, res) => {
//   const commentId = parseInt(req.params.commentId);

//   try {
//     const comment = await prisma.comment.findUnique({
//       where: { id: commentId },
//     });

//     if (!comment)
//       return res.status(404).json({ error: "Comment not found" });

//     if (
//       comment.authorId !== req.user.id &&
//       req.user.role !== "ADMIN"
//     ) {
//       return res.status(403).json({ error: "Not authorized" });
//     }

//     await prisma.comment.delete({ where: { id: commentId } });

//     res.json({ message: "Comment deleted successfully" });
//   } catch (err) {
//     console.error("DELETE COMMENT ERROR:", err);
//     res.status(500).json({ error: "Failed to delete comment" });
//   }
// };

// /* ================= DELETE POST ================= */
// export const deletePost = async (req, res) => {
//   const postId = parseInt(req.params.id);

//   try {
//     const post = await prisma.post.findUnique({
//       where: { id: postId },
//     });

//     if (!post)
//       return res.status(404).json({ error: "Post not found" });

//     if (
//       post.authorId !== req.user.id &&
//       req.user.role !== "ADMIN"
//     ) {
//       return res.status(403).json({ error: "Not authorized" });
//     }

//     await prisma.post.delete({ where: { id: postId } });

//     res.json({ message: "Post deleted successfully" });
//   } catch (err) {
//     console.error("DELETE POST ERROR:", err);
//     res.status(500).json({ error: "Failed to delete post" });
//   }
// };




import { PrismaClient, ActivityType } from "@prisma/client";
import { logActivity } from "../services/activityService.js";

const prisma = new PrismaClient();

/* ======================================================
   GET POSTS (PUBLIC FEED — DEMO SAFE)
   ====================================================== */
export const getPosts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // req.user may not exist (public feed)
  const userId = req.user?.id || null;

  try {
    const posts = await prisma.post.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },

      // 🔴 IMPORTANT: DO NOT FILTER BY STATUS FOR NOW
      // Visibility > moderation (demo phase)
      where: {},

      include: {
        author: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            role: true,
          },
        },
        likes: {
          select: { userId: true },
        },
        comments: {
          where: { parentCommentId: null },
          select: { id: true },
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    const totalPosts = await prisma.post.count();

    // console.log("POSTS FOUND:", posts.length);
    if (page === 1) {
  console.log("POSTS FOUND:", posts.length);
}


    res.json({
      posts: posts.map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        createdAt: p.createdAt,
        image: p.image,
        author: p.author,
        tags: p.tags.map((t) => t.tag.name),
        likeCount: p.likes.length,
        commentCount: p.comments.length,
        isLiked: userId
          ? p.likes.some((l) => l.userId === userId)
          : false,
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
      },
    });
  } catch (err) {
    console.error("GET POSTS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
};

/* ======================================================
   GET POST BY ID
   ====================================================== */
export const getPostById = async (req, res) => {
  const postId = parseInt(req.params.id);
  const userId = req.user?.id || null;

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            role: true,
          },
        },
        likes: {
          select: { userId: true },
        },
        comments: {
          where: { parentCommentId: null },
          select: { id: true },
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json({
      id: post.id,
      title: post.title,
      content: post.content,
      createdAt: post.createdAt,
      image: post.image,
      author: post.author,
      tags: post.tags.map((t) => t.tag.name),
      likeCount: post.likes.length,
      commentCount: post.comments.length,
      isLiked: userId
        ? post.likes.some((l) => l.userId === userId)
        : false,
    });
  } catch (err) {
    console.error("GET POST BY ID ERROR:", err);
    res.status(500).json({ error: "Failed to fetch post" });
  }
};

/* ======================================================
   CREATE POST
   ====================================================== */
export const createPost = async (req, res) => {
  const { title, content, tags } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Title and content required" });
  }

  try {
    const tagRecords = tags?.length
      ? await Promise.all(
          tags.map((tag) =>
            prisma.tag.upsert({
              where: { name: tag.toLowerCase() },
              update: {},
              create: { name: tag.toLowerCase() },
            })
          )
        )
      : [];

    const post = await prisma.post.create({
      data: {
        title,
        content,
        authorId: req.user.id,
        status: "PENDING",
        tags: {
          create: tagRecords.map((t) => ({ tagId: t.id })),
        },
      },
    });

    await logActivity({
      type: ActivityType.POST_CREATED,
      message: `created a post "${post.title}"`,
      userId: req.user.id,
      entity: "POST",
      entityId: post.id,
    });

    res.status(201).json({
      message: "Post created",
      post,
    });
  } catch (err) {
    console.error("CREATE POST ERROR:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
};

/* ======================================================
   LIKE / UNLIKE POST
   ====================================================== */
export const likePost = async (req, res) => {
  const postId = parseInt(req.params.id);
  const userId = req.user.id;

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const existing = await prisma.like.findFirst({
      where: { postId, userId },
    });

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      return res.json({ liked: false });
    }

    await prisma.like.create({
      data: { postId, userId },
    });

    await logActivity({
      type: ActivityType.POST_LIKED,
      message: `liked a post`,
      userId,
      entity: "POST",
      entityId: post.id,
    });

    res.json({ liked: true });
  } catch (err) {
    console.error("LIKE POST ERROR:", err);
    res.status(500).json({ error: "Failed to like post" });
  }
};

/* ======================================================
   CREATE COMMENT
   ====================================================== */
export const createComment = async (req, res) => {
  const { postId, content, parentCommentId } = req.body;

  if (!content) {
    return res.status(400).json({ error: "Comment content required" });
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: parseInt(postId) },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        postId: post.id,
        parentCommentId: parentCommentId || null,
        authorId: req.user.id,
      },
      include: { author: true },
    });

    await logActivity({
      type: ActivityType.COMMENT_CREATED,
      message: `commented on a post`,
      userId: req.user.id,
      entity: "POST",
      entityId: post.id,
    });

    res.status(201).json({ comment });
  } catch (err) {
    console.error("CREATE COMMENT ERROR:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
};

/* ======================================================
   GET COMMENTS
   ====================================================== */
export const getComments = async (req, res) => {
  const postId = parseInt(req.params.postId);
  const userId = req.user?.id;

  try {
    const comments = await prisma.comment.findMany({
      where: { postId, parentCommentId: null },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
            profileImage: true,
          },
        },
        commentLikes: {
          select: { userId: true },
        },
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                role: true,
                profileImage: true,
              },
            },
            commentLikes: {
              select: { userId: true },
            },
          },
        },
      },
    });

    res.json({
      comments: comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        postId: c.postId,
        author: c.author,
        likeCount: c.commentLikes.length,
        isLiked: userId
          ? c.commentLikes.some((l) => l.userId === userId)
          : false,
        replies: c.replies.map((r) => ({
          id: r.id,
          content: r.content,
          createdAt: r.createdAt,
          postId: r.postId,
          author: r.author,
          likeCount: r.commentLikes.length,
          isLiked: userId
            ? r.commentLikes.some((l) => l.userId === userId)
            : false,
        })),
      })),
    });
  } catch (err) {
    console.error("GET COMMENTS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
};

/* ======================================================
   LIKE COMMENT
   ====================================================== */
export const likeComment = async (req, res) => {
  const commentId = parseInt(req.params.commentId);
  const userId = req.user.id;

  try {
    const existing = await prisma.commentLike.findFirst({
      where: { commentId, userId },
    });

    if (existing) {
      await prisma.commentLike.delete({ where: { id: existing.id } });
      return res.json({ liked: false });
    }

    await prisma.commentLike.create({
      data: { commentId, userId },
    });

    res.json({ liked: true });
  } catch (err) {
    console.error("LIKE COMMENT ERROR:", err);
    res.status(500).json({ error: "Failed to like comment" });
  }
};

/* ======================================================
   DELETE COMMENT
   ====================================================== */
export const deleteComment = async (req, res) => {
  const commentId = parseInt(req.params.commentId);

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (comment.authorId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized" });
    }

    await prisma.comment.delete({ where: { id: commentId } });
    res.json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.error("DELETE COMMENT ERROR:", err);
    res.status(500).json({ error: "Failed to delete comment" });
  }
};

/* ======================================================
   DELETE POST
   ====================================================== */
export const deletePost = async (req, res) => {
  const postId = parseInt(req.params.id);

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.authorId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized" });
    }

    await prisma.post.delete({ where: { id: postId } });
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("DELETE POST ERROR:", err);
    res.status(500).json({ error: "Failed to delete post" });
  }
};
