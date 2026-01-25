


// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();
// export default prisma;

// /**
//  * ============================
//  * REQUEST MENTORSHIP (MENTEE)
//  * ============================
//  */
// export const requestMentorship = async (req, res) => {
//   try {
//     const { mentorId, topic, preferredSlot } = req.body;
//     const menteeId = req.user.id;

//     if (!mentorId || !topic) {
//       return res.status(400).json({ error: "Mentor ID and topic are required" });
//     }

//     const mentorIdInt = parseInt(mentorId);
//     if (isNaN(mentorIdInt)) return res.status(400).json({ error: "Invalid mentor ID" });

//     if (menteeId === mentorIdInt)
//       return res.status(400).json({ error: "You cannot request mentorship from yourself" });

//     const mentor = await prisma.user.findUnique({ where: { id: mentorIdInt } });
//     if (!mentor || mentor.role !== "MENTOR")
//       return res.status(404).json({ error: "Mentor not found" });

//     // Prevent duplicate active mentorships
//     const activeMentorship = await prisma.mentorship.findFirst({
//       where: {
//         menteeId,
//         mentorId: mentorIdInt,
//         status: { in: ["pending", "accepted"] },
//       },
//     });
//     if (activeMentorship)
//       return res.status(409).json({ error: "Active mentorship request already exists" });

//     const mentorship = await prisma.mentorship.create({
//       data: {
//         menteeId,
//         mentorId: mentorIdInt,
//         topic: topic.trim(),
//         status: "pending",
//         preferredSlot: preferredSlot ? new Date(preferredSlot) : null,
//       },
//       include: {
//         mentor: { select: { id: true, name: true, profileImage: true } },
//         mentee: { select: { id: true, name: true, profileImage: true } },
//       },
//     });

//     res.status(201).json({ message: "Mentorship request sent successfully", mentorship });
//   } catch (error) {
//     console.error("Request mentorship error:", error);
//     res.status(500).json({ error: "Failed to request mentorship" });
//   }
// };

// /**
//  * ============================
//  * GET PENDING REQUESTS (MENTOR)
//  * ============================
//  */
// export const getPendingRequests = async (req, res) => {
//   const page = Number(req.query.page) || 1;
//   const limit = Number(req.query.limit) || 10;
//   const skip = (page - 1) * limit;

//   try {
//     const requests = await prisma.mentorship.findMany({
//       where: { mentorId: req.user.id, status: "pending" },
//       skip,
//       take: limit,
//       include: { mentee: { select: { id: true, name: true, email: true, bio: true, profileImage: true } } },
//       orderBy: { createdAt: "desc" },
//     });

//     const total = await prisma.mentorship.count({ where: { mentorId: req.user.id, status: "pending" } });

//     res.json({ requests, pagination: { page, totalPages: Math.ceil(total / limit), total } });
//   } catch (error) {
//     console.error("Get pending requests error:", error);
//     res.status(500).json({ error: "Failed to fetch pending requests" });
//   }
// };

// /**
//  * ============================
//  * ACCEPT REQUEST (MENTOR)
//  * ============================
//  */
// export const acceptMentorship = async (req, res) => {
//   const mentorshipId = parseInt(req.params.id);
//   if (isNaN(mentorshipId)) return res.status(400).json({ error: "Invalid mentorship ID" });

//   try {
//     const mentorship = await prisma.mentorship.findUnique({ where: { id: mentorshipId } });
//     if (!mentorship) return res.status(404).json({ error: "Mentorship request not found" });
//     if (mentorship.mentorId !== req.user.id) return res.status(403).json({ error: "Not authorized" });
//     if (mentorship.status !== "pending") return res.status(400).json({ error: "Request is not pending" });

//     const updated = await prisma.mentorship.update({
//       where: { id: mentorshipId },
//       data: { status: "accepted" },
//       include: { mentor: { select: { id: true, name: true } }, mentee: { select: { id: true, name: true } } },
//     });

//     res.json({ message: "Mentorship accepted", mentorship: updated });
//   } catch (error) {
//     console.error("Accept mentorship error:", error);
//     res.status(500).json({ error: "Failed to accept mentorship" });
//   }
// };

// /**
//  * ============================
//  * REJECT REQUEST (MENTOR)
//  * ============================
//  */
// export const rejectMentorship = async (req, res) => {
//   const mentorshipId = parseInt(req.params.id);
//   if (isNaN(mentorshipId)) return res.status(400).json({ error: "Invalid mentorship ID" });

//   try {
//     const mentorship = await prisma.mentorship.findUnique({ where: { id: mentorshipId } });
//     if (!mentorship) return res.status(404).json({ error: "Mentorship request not found" });
//     if (mentorship.mentorId !== req.user.id) return res.status(403).json({ error: "Not authorized" });

//     const updated = await prisma.mentorship.update({ where: { id: mentorshipId }, data: { status: "rejected" } });
//     res.json({ message: "Mentorship request rejected", mentorship: updated });
//   } catch (error) {
//     console.error("Reject mentorship error:", error);
//     res.status(500).json({ error: "Failed to reject mentorship" });
//   }
// };

// /**
//  * ============================
//  * CANCEL REQUEST (MENTEE)
//  * ============================
//  */
// export const cancelMentorship = async (req, res) => {
//   const mentorshipId = parseInt(req.params.id);
//   if (isNaN(mentorshipId)) return res.status(400).json({ error: "Invalid mentorship ID" });

//   try {
//     const mentorship = await prisma.mentorship.findUnique({ where: { id: mentorshipId } });
//     if (!mentorship) return res.status(404).json({ error: "Mentorship request not found" });
//     if (mentorship.menteeId !== req.user.id) return res.status(403).json({ error: "Not authorized to cancel this request" });
//     if (mentorship.status !== "pending") return res.status(400).json({ error: "Only pending requests can be cancelled" });

//     const updated = await prisma.mentorship.update({ where: { id: mentorshipId }, data: { status: "rejected" } });
//     res.json({ message: "Mentorship request cancelled", mentorship: updated });
//   } catch (error) {
//     console.error("Cancel mentorship error:", error);
//     res.status(500).json({ error: "Failed to cancel mentorship" });
//   }
// };

// /**
//  * ============================
//  * END MENTORSHIP (MENTOR/MENTEE)
//  * ============================
//  */
// export const endMentorship = async (req, res) => {
//   const mentorshipId = parseInt(req.params.id);
//   if (isNaN(mentorshipId)) return res.status(400).json({ error: "Invalid mentorship ID" });

//   try {
//     const mentorship = await prisma.mentorship.findUnique({ where: { id: mentorshipId } });
//     if (!mentorship) return res.status(404).json({ error: "Mentorship not found" });

//     if (mentorship.mentorId !== req.user.id && mentorship.menteeId !== req.user.id)
//       return res.status(403).json({ error: "Not authorized" });

//     const updated = await prisma.mentorship.update({ where: { id: mentorshipId }, data: { status: "cancelled" } });
//     res.json({ message: "Mentorship ended successfully", mentorship: updated });
//   } catch (error) {
//     console.error("End mentorship error:", error);
//     res.status(500).json({ error: "Failed to end mentorship" });
//   }
// };

// /**
//  * ============================
//  * GET MY MENTORSHIPS (MENTOR)
//  * ============================
//  */
// export const getMyMentorships = async (req, res) => {
//   try {
//     const mentorships = await prisma.mentorship.findMany({
//       where: { mentorId: req.user.id, status: "accepted" },
//       include: { mentee: { select: { id: true, name: true, email: true, bio: true, profileImage: true } } },
//       orderBy: { createdAt: "desc" },
//     });
//     res.json({ mentorships, total: mentorships.length });
//   } catch (error) {
//     console.error("Get my mentorships error:", error);
//     res.status(500).json({ error: "Failed to fetch mentorships" });
//   }
// };

// /**
//  * ============================
//  * GET MY MENTEES (MENTOR)
//  * ============================
//  */
// export const getMyMentees = async (req, res) => {
//   try {
//     const mentorships = await prisma.mentorship.findMany({
//       where: { mentorId: req.user.id, status: "accepted" },
//       include: { mentee: true },
//     });

//     const mentees = mentorships.map(m => ({ ...m.mentee, mentorshipTopic: m.topic, mentorshipId: m.id }));
//     res.json({ mentees, totalMentees: mentees.length });
//   } catch (error) {
//     console.error("Get my mentees error:", error);
//     res.status(500).json({ error: "Failed to fetch mentees" });
//   }
// };

// /**
//  * ============================
//  * GET MY MENTORS (MENTEE)
//  * ============================
//  */
// export const getMyMentors = async (req, res) => {
//   try {
//     const mentorships = await prisma.mentorship.findMany({
//       where: { menteeId: req.user.id, status: "accepted" },
//       include: { mentor: true },
//     });

//     const mentors = mentorships.map(m => ({ ...m.mentor, mentorshipTopic: m.topic, mentorshipId: m.id }));
//     res.json({ mentors, totalMentors: mentors.length });
//   } catch (error) {
//     console.error("Get my mentors error:", error);
//     res.status(500).json({ error: "Failed to fetch mentors" });
//   }
// };

// /**
//  * ============================
//  * FIND MENTORS
//  * ============================
//  */
// export const findMentors = async (req, res) => {
//   const page = Number(req.query.page) || 1;
//   const limit = Number(req.query.limit) || 20;
//   const skip = (page - 1) * limit;
//   const { topic } = req.query;

//   try {
//     const mentors = await prisma.user.findMany({
//       where: { role: "MENTOR", id: { not: req.user.id }, bio: topic ? { contains: topic, mode: "insensitive" } : undefined },
//       skip,
//       take: limit,
//       select: { id: true, name: true, email: true, bio: true, profileImage: true, skills: true },
//     });

//     const total = await prisma.user.count({
//       where: { role: "MENTOR", bio: topic ? { contains: topic, mode: "insensitive" } : undefined },
//     });

//     res.json({ mentors, pagination: { page, totalPages: Math.ceil(total / limit), total } });
//   } catch (error) {
//     console.error("Find mentors error:", error);
//     res.status(500).json({ error: "Failed to find mentors" });
//   }
// };

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export default prisma;

/**
 * ============================
 * REQUEST MENTORSHIP (MENTEE)
 * ============================
 */
export const requestMentorship = async (req, res) => {
  try {
    const { mentorId, topic, preferredSlot } = req.body;
    const menteeId = req.user.id;

    if (!mentorId || !topic) {
      return res.status(400).json({ error: "Mentor ID and topic are required" });
    }

    const mentorIdInt = parseInt(mentorId);
    if (isNaN(mentorIdInt)) return res.status(400).json({ error: "Invalid mentor ID" });

    if (menteeId === mentorIdInt)
      return res.status(400).json({ error: "You cannot request mentorship from yourself" });

    const mentor = await prisma.user.findUnique({ where: { id: mentorIdInt } });
    if (!mentor || mentor.role !== "MENTOR")
      return res.status(404).json({ error: "Mentor not found" });

    // Prevent duplicate active mentorships
    const activeMentorship = await prisma.mentorship.findFirst({
      where: {
        menteeId,
        mentorId: mentorIdInt,
        status: { in: ["pending", "accepted"] },
      },
    });
    if (activeMentorship)
      return res.status(409).json({ error: "Active mentorship request already exists" });

    const mentorship = await prisma.mentorship.create({
      data: {
        menteeId,
        mentorId: mentorIdInt,
        topic: topic.trim(),
        status: "pending",
        preferredSlot: preferredSlot ? new Date(preferredSlot) : null,
      },
      include: {
        mentor: { select: { id: true, name: true, profileImage: true } },
        mentee: { select: { id: true, name: true, profileImage: true } },
      },
    });

    res.status(201).json({ message: "Mentorship request sent successfully", mentorship });
  } catch (error) {
    console.error("Request mentorship error:", error);
    res.status(500).json({ error: "Failed to request mentorship" });
  }
};

/**
 * ============================
 * GET PENDING REQUESTS (MENTOR)
 * ============================
 */
export const getPendingRequests = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const requests = await prisma.mentorship.findMany({
      where: { mentorId: req.user.id, status: "pending" },
      skip,
      take: limit,
      include: { mentee: { select: { id: true, name: true, email: true, bio: true, profileImage: true } } },
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.mentorship.count({ where: { mentorId: req.user.id, status: "pending" } });

    res.json({ requests, pagination: { page, totalPages: Math.ceil(total / limit), total } });
  } catch (error) {
    console.error("Get pending requests error:", error);
    res.status(500).json({ error: "Failed to fetch pending requests" });
  }
};

/**
 * ============================
 * ACCEPT REQUEST (MENTOR)
 * ============================
 */
export const acceptMentorship = async (req, res) => {
  const mentorshipId = parseInt(req.params.id);
  if (isNaN(mentorshipId)) return res.status(400).json({ error: "Invalid mentorship ID" });

  try {
    const mentorship = await prisma.mentorship.findUnique({ where: { id: mentorshipId } });
    if (!mentorship) return res.status(404).json({ error: "Mentorship request not found" });
    if (mentorship.mentorId !== req.user.id) return res.status(403).json({ error: "Not authorized" });
    if (mentorship.status !== "pending") return res.status(400).json({ error: "Request is not pending" });

    const updated = await prisma.mentorship.update({
      where: { id: mentorshipId },
      data: { status: "accepted" },
      include: { mentor: { select: { id: true, name: true } }, mentee: { select: { id: true, name: true } } },
    });

    res.json({ message: "Mentorship accepted", mentorship: updated });
  } catch (error) {
    console.error("Accept mentorship error:", error);
    res.status(500).json({ error: "Failed to accept mentorship" });
  }
};

/**
 * ============================
 * REJECT REQUEST (MENTOR)
 * ============================
 */
export const rejectMentorship = async (req, res) => {
  const mentorshipId = parseInt(req.params.id);
  if (isNaN(mentorshipId)) return res.status(400).json({ error: "Invalid mentorship ID" });

  try {
    const mentorship = await prisma.mentorship.findUnique({ where: { id: mentorshipId } });
    if (!mentorship) return res.status(404).json({ error: "Mentorship request not found" });
    if (mentorship.mentorId !== req.user.id) return res.status(403).json({ error: "Not authorized" });

    const updated = await prisma.mentorship.update({ where: { id: mentorshipId }, data: { status: "rejected" } });
    res.json({ message: "Mentorship request rejected", mentorship: updated });
  } catch (error) {
    console.error("Reject mentorship error:", error);
    res.status(500).json({ error: "Failed to reject mentorship" });
  }
};

/**
 * ============================
 * CANCEL REQUEST (MENTEE)
 * ============================
 */
export const cancelMentorship = async (req, res) => {
  const mentorshipId = parseInt(req.params.id);
  if (isNaN(mentorshipId)) return res.status(400).json({ error: "Invalid mentorship ID" });

  try {
    const mentorship = await prisma.mentorship.findUnique({ where: { id: mentorshipId } });
    if (!mentorship) return res.status(404).json({ error: "Mentorship request not found" });
    if (mentorship.menteeId !== req.user.id) return res.status(403).json({ error: "Not authorized to cancel this request" });
    if (mentorship.status !== "pending") return res.status(400).json({ error: "Only pending requests can be cancelled" });

    const updated = await prisma.mentorship.update({ where: { id: mentorshipId }, data: { status: "rejected" } });
    res.json({ message: "Mentorship request cancelled", mentorship: updated });
  } catch (error) {
    console.error("Cancel mentorship error:", error);
    res.status(500).json({ error: "Failed to cancel mentorship" });
  }
};

/**
 * ============================
 * END MENTORSHIP (MENTOR/MENTEE)
 * ============================
 */
export const endMentorship = async (req, res) => {
  const mentorshipId = parseInt(req.params.id);
  if (isNaN(mentorshipId)) return res.status(400).json({ error: "Invalid mentorship ID" });

  try {
    const mentorship = await prisma.mentorship.findUnique({ where: { id: mentorshipId } });
    if (!mentorship) return res.status(404).json({ error: "Mentorship not found" });

    if (mentorship.mentorId !== req.user.id && mentorship.menteeId !== req.user.id)
      return res.status(403).json({ error: "Not authorized" });

    const updated = await prisma.mentorship.update({ where: { id: mentorshipId }, data: { status: "cancelled" } });
    res.json({ message: "Mentorship ended successfully", mentorship: updated });
  } catch (error) {
    console.error("End mentorship error:", error);
    res.status(500).json({ error: "Failed to end mentorship" });
  }
};

/**
 * ============================
 * GET MY MENTORSHIPS (ALL)
 * ============================
 */
export const getMyMentorships = async (req, res) => {
  try {
    const mentors = await prisma.mentorship.findMany({
      where: { menteeId: req.user.id, status: "accepted" },
      include: { mentor: true },
    });
    const mentees = await prisma.mentorship.findMany({
      where: { mentorId: req.user.id, status: "accepted" },
      include: { mentee: true },
    });

    res.json({
      mentors: mentors.map(m => ({ ...m.mentor, topic: m.topic, mentorshipId: m.id })),
      mentees: mentees.map(m => ({ ...m.mentee, topic: m.topic, mentorshipId: m.id })),
    });
  } catch (err) {
    console.error("Get my mentorships error:", err);
    res.status(500).json({ error: "Failed to fetch mentorships" });
  }
};

/**
 * ============================
 * GET MY MENTEES (MENTOR)
 * ============================
 */
export const getMyMentees = async (req, res) => {
  try {
    const mentorships = await prisma.mentorship.findMany({
      where: { mentorId: req.user.id, status: "accepted" },
      include: { mentee: true },
    });

    const mentees = mentorships.map(m => ({ ...m.mentee, mentorshipTopic: m.topic, mentorshipId: m.id }));
    res.json({ mentees, totalMentees: mentees.length });
  } catch (error) {
    console.error("Get my mentees error:", error);
    res.status(500).json({ error: "Failed to fetch mentees" });
  }
};

/**
 * ============================
 * GET MY MENTORS (MENTEE)
 * ============================
 */
export const getMyMentors = async (req, res) => {
  try {
    const mentorships = await prisma.mentorship.findMany({
      where: { menteeId: req.user.id, status: "accepted" },
      include: { mentor: true },
    });

    const mentors = mentorships.map(m => ({ ...m.mentor, mentorshipTopic: m.topic, mentorshipId: m.id }));
    res.json({ mentors, totalMentors: mentors.length });
  } catch (error) {
    console.error("Get my mentors error:", error);
    res.status(500).json({ error: "Failed to fetch mentors" });
  }
};

/**
 * ============================
 * FIND MENTORS
 * ============================
 */
export const findMentors = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const { topic } = req.query;

  try {
    const mentors = await prisma.user.findMany({
      where: { role: "MENTOR", id: { not: req.user.id }, bio: topic ? { contains: topic, mode: "insensitive" } : undefined },
      skip,
      take: limit,
      select: { id: true, name: true, email: true, bio: true, profileImage: true, skills: true },
    });

    const total = await prisma.user.count({
      where: { role: "MENTOR", bio: topic ? { contains: topic, mode: "insensitive" } : undefined },
    });

    res.json({ mentors, pagination: { page, totalPages: Math.ceil(total / limit), total } });
  } catch (error) {
    console.error("Find mentors error:", error);
    res.status(500).json({ error: "Failed to find mentors" });
  }
};
