

// import express from "express";
// import prisma from "../config/prisma.js";
// import { authenticate } from "../middleware/authMiddleware.js";

// const router = express.Router();

// /**
//  * @swagger
//  * tags:
//  *   name: Likes
//  *   description: Like/Unlike posts
//  */

// router.post("/:postId", authenticate, async (req, res, next) => {
//   try {
//     const postId = Number(req.params.postId);

//     if (isNaN(postId)) {
//       return res.status(400).json({ message: "Invalid postId" });
//     }

//     const userId = req.user.id;

//     const existingLike = await prisma.like.findUnique({
//       where: {
//         userId_postId: { userId, postId },
//       },
//     });

//     if (existingLike) {
//       await prisma.like.delete({
//         where: { id: existingLike.id },
//       });
//       return res.json({ liked: false });
//     }

//     await prisma.like.create({
//       data: { userId, postId },
//     });

//     res.json({ liked: true });
//   } catch (err) {
//     next(err);
//   }
// });

// export default router;
 
import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { togglePostLike } from "../controllers/likeController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Likes
 *   description: Like/Unlike posts
 */

// Toggle post like
router.post("/:postId", authenticate, togglePostLike);

export default router;
