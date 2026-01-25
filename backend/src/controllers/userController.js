// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// /**
//  * Get all users
//  */
// export const getAllUsers = async (req, res) => {
//   try {
//     const users = await prisma.user.findMany({
//       select: {
//         id: true,
//         name: true,
//         email: true,
//         createdAt: true,
//       },
//     });
//     res.json(users);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// /**
//  * Get user by ID (public profile)
//  */
// export const getUserProfile = async (req, res) => {
//   try {
//     const userId = Number(req.params.id);

//     const user = await prisma.user.findUnique({
//       where: { id: userId },
//       select: {
//         id: true,
//         name: true,
//         email: true,
//         createdAt: true,
//       },
//     });

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     res.json(user);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// /**
//  * Follow a user
//  */
// export const followUser = async (req, res) => {
//   try {
//     const followerId = Number(req.user.id);
//     const followingId = Number(req.params.id);

//     if (followerId === followingId) {
//       return res.status(400).json({ message: "You cannot follow yourself" });
//     }

//     const existing = await prisma.follower.findFirst({
//       where: { followerId, followingId },
//     });

//     if (existing) {
//       return res.status(400).json({ message: "Already following" });
//     }

//     await prisma.follower.create({
//       data: { followerId, followingId },
//     });

//     res.json({ message: "User followed successfully" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// /**
//  * Unfollow a user
//  */
// export const unfollowUser = async (req, res) => {
//   try {
//     const followerId = Number(req.user.id);
//     const followingId = Number(req.params.id);

//     await prisma.follower.deleteMany({
//       where: { followerId, followingId },
//     });

//     res.json({ message: "User unfollowed successfully" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// /**
//  * Get followers of a user
//  */
// export const getUserFollowers = async (req, res) => {
//   try {
//     const userId = Number(req.params.id);

//     const followers = await prisma.follower.findMany({
//       where: { followingId: userId },
//       include: {
//         follower: {
//           select: { id: true, name: true, email: true },
//         },
//       },
//     });

//     res.json(followers);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// /**
//  * Get following users
//  */
// export const getUserFollowing = async (req, res) => {
//   try {
//     const userId = Number(req.params.id);

//     const following = await prisma.follower.findMany({
//       where: { followerId: userId },
//       include: {
//         following: {
//           select: { id: true, name: true, email: true },
//         },
//       },
//     });

//     res.json(following);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /users/me
 * Logged-in user's profile
 */
export const getMyProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        skills: true,
        profileImage: true,
        role: true,
        createdAt: true,
      },
    });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * PATCH /users/me
 * Update own profile
 */
export const updateMyProfile = async (req, res) => {
  try {
    const { name, bio, skills, profileImage } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, bio, skills, profileImage },
      select: {
        id: true,
        name: true,
        bio: true,
        skills: true,
        profileImage: true,
      },
    });

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /users
 * Search + pagination
 */
export const getAllUsers = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || "";

    const where = {
      isActive: true,
      name: {
        contains: search,
        mode: "insensitive",
      },
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          bio: true,
          skills: true,
          profileImage: true,
          role: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /users/:id
 * Public profile
 */
export const getUserProfile = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        bio: true,
        skills: true,
        profileImage: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * FOLLOW / UNFOLLOW
 */
export const followUser = async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = Number(req.params.id);

    if (followerId === followingId) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    await prisma.follower.create({
      data: { followerId, followingId },
    });

    res.json({ message: "User followed successfully" });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ message: "Already following" });
    }
    res.status(500).json({ error: err.message });
  }
};

export const unfollowUser = async (req, res) => {
  try {
    await prisma.follower.deleteMany({
      where: {
        followerId: req.user.id,
        followingId: Number(req.params.id),
      },
    });

    res.json({ message: "User unfollowed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * FOLLOWERS / FOLLOWING
 */
export const getUserFollowers = async (req, res) => {
  const userId = Number(req.params.id);

  const followers = await prisma.follower.findMany({
    where: { followingId: userId },
    select: {
      follower: {
        select: {
          id: true,
          name: true,
          profileImage: true,
        },
      },
    },
  });

  res.json(followers.map(f => f.follower));
};

export const getUserFollowing = async (req, res) => {
  const userId = Number(req.params.id);

  const following = await prisma.follower.findMany({
    where: { followerId: userId },
    select: {
      following: {
        select: {
          id: true,
          name: true,
          profileImage: true,
        },
      },
    },
  });

  res.json(following.map(f => f.following));
};
