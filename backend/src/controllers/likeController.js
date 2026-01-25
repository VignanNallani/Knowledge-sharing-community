import prisma from "../config/prisma.js";

/* ================= TOGGLE POST LIKE ================= */
export const togglePostLike = async (req, res) => {
  const postId = Number(req.params.postId);
  const userId = req.user.id;

  if (isNaN(postId)) {
    return res.status(400).json({ error: "Invalid postId" });
  }

  try {
    const existingLike = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existingLike) {
      await prisma.like.delete({ where: { id: existingLike.id } });
      return res.json({ message: "Post unliked", liked: false });
    }

    await prisma.like.create({ data: { userId, postId } });
    res.json({ message: "Post liked", liked: true });
  } catch (err) {
    console.error("Toggle post like error:", err);
    res.status(500).json({ error: "Failed to toggle like" });
  }
};
