

// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();

// // ================================
// // GET all events (Public)
// // ================================
// export const getEvents = async (req, res) => {
//   try {
//     const page = Number(req.query.page) || 1;
//     const limit = Number(req.query.limit) || 10;
//     const skip = (page - 1) * limit;
//     const { search, location } = req.query;

//     const events = await prisma.event.findMany({
//       skip,
//       take: limit,
//       where: {
//         AND: [
//           search
//             ? { name: { contains: search, mode: "insensitive" } }
//             : {},
//           location
//             ? { location: { contains: location, mode: "insensitive" } }
//             : {},
//         ],
//       },
//       include: {
//         attendees: true,
//         createdBy: {
//           select: { id: true, name: true, email: true },
//         },
//       },
//       orderBy: { startsAt: "asc" },
//     });

//     res.json(events);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// // ================================
// // CREATE Event (ADMIN / MENTOR)
// // ================================
// export const createEvent = async (req, res) => {
//   try {
//     const { name, description, location, startsAt, endsAt } = req.body;

//     if (!name || !startsAt) {
//       return res
//         .status(400)
//         .json({ error: "Name and start date are required" });
//     }

//     const event = await prisma.event.create({
//       data: {
//         name,
//         description,
//         location,
//         startsAt: new Date(startsAt),
//         endsAt: endsAt ? new Date(endsAt) : null,
//         createdById: req.user.id,
//       },
//     });

//     res.status(201).json(event);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// // ================================
// // UPDATE Event (ADMIN or CREATOR)
// // ================================
// export const updateEvent = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { name, description, location, startsAt, endsAt } = req.body;

//     const event = await prisma.event.findUnique({
//       where: { id: parseInt(id) },
//     });

//     if (!event) {
//       return res.status(404).json({ error: "Event not found" });
//     }

//     if (req.user.role !== "ADMIN" && req.user.id !== event.createdById) {
//       return res.status(403).json({ error: "Not authorized" });
//     }

//     const updatedEvent = await prisma.event.update({
//       where: { id: parseInt(id) },
//       data: {
//         name: name ?? event.name,
//         description: description ?? event.description,
//         location: location ?? event.location,
//         startsAt: startsAt ? new Date(startsAt) : event.startsAt,
//         endsAt: endsAt ? new Date(endsAt) : event.endsAt,
//       },
//     });

//     res.json(updatedEvent);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// // ================================
// // DELETE Event (ADMIN or CREATOR)
// // ================================
// export const deleteEvent = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const event = await prisma.event.findUnique({
//       where: { id: parseInt(id) },
//     });

//     if (!event) {
//       return res.status(404).json({ error: "Event not found" });
//     }

//     if (req.user.role !== "ADMIN" && req.user.id !== event.createdById) {
//       return res.status(403).json({ error: "Not authorized" });
//     }

//     await prisma.event.delete({
//       where: { id: parseInt(id) },
//     });

//     res.status(204).send();
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// // ================================
// // JOIN / RSVP Event (USER)
// // ================================
// export const joinEvent = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const eventId = parseInt(id);

//     // 🔹 Check event exists
//     const event = await prisma.event.findUnique({
//       where: { id: eventId },
//     });

//     if (!event) {
//       return res.status(404).json({ error: "Event not found" });
//     }

//     // 🔹 Prevent creator from joining own event
//     if (event.createdById === req.user.id) {
//       return res
//         .status(400)
//         .json({ error: "Creator cannot join their own event" });
//     }

//     const attendee = await prisma.eventAttendee.create({
//       data: {
//         userId: req.user.id,
//         eventId,
//       },
//     });

//     res.status(201).json(attendee);
//   } catch (error) {
//     if (error.code === "P2002") {
//       return res.status(400).json({ error: "Already registered" });
//     }
//     res.status(500).json({ error: error.message });
//   }
// };



import { PrismaClient } from "@prisma/client";
import { logActivity } from "../services/activityService.js";

const prisma = new PrismaClient();

// ================================
// GET all events (Public)
// ================================
export const getEvents = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { search, location } = req.query;

    const events = await prisma.event.findMany({
      skip,
      take: limit,
      where: {
        AND: [
          search
            ? { name: { contains: search, mode: "insensitive" } }
            : {},
          location
            ? { location: { contains: location, mode: "insensitive" } }
            : {},
        ],
      },
      include: {
        attendees: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { startsAt: "asc" },
    });

    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================================
// CREATE Event (ADMIN / MENTOR)
// ================================
export const createEvent = async (req, res) => {
  try {
    const { name, description, location, startsAt, endsAt } = req.body;

    if (!name || !startsAt) {
      return res
        .status(400)
        .json({ error: "Name and start date are required" });
    }

    const event = await prisma.event.create({
      data: {
        name,
        description,
        location,
        startsAt: new Date(startsAt),
        endsAt: endsAt ? new Date(endsAt) : null,
        createdById: req.user.id,
      },
    });

    // ✅ ACTIVITY LOG
    await logActivity({
      type: "EVENT_CREATED",
      message: `created event "${event.name}"`,
      userId: req.user.id,
      entity: "EVENT",
      entityId: event.id,
    });

    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================================
// UPDATE Event (ADMIN or CREATOR)
// ================================
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, location, startsAt, endsAt } = req.body;

    const event = await prisma.event.findUnique({
      where: { id: parseInt(id) },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (req.user.role !== "ADMIN" && req.user.id !== event.createdById) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const updatedEvent = await prisma.event.update({
      where: { id: parseInt(id) },
      data: {
        name: name ?? event.name,
        description: description ?? event.description,
        location: location ?? event.location,
        startsAt: startsAt ? new Date(startsAt) : event.startsAt,
        endsAt: endsAt ? new Date(endsAt) : event.endsAt,
      },
    });

    res.json(updatedEvent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================================
// DELETE Event (ADMIN or CREATOR)
// ================================
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: parseInt(id) },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (req.user.role !== "ADMIN" && req.user.id !== event.createdById) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await prisma.event.delete({
      where: { id: parseInt(id) },
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================================
// JOIN / RSVP Event (USER)
// ================================
export const joinEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const eventId = parseInt(id);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // ❌ Creator cannot join own event
    if (event.createdById === req.user.id) {
      return res
        .status(400)
        .json({ error: "Creator cannot join their own event" });
    }

    const attendee = await prisma.eventAttendee.create({
      data: {
        userId: req.user.id,
        eventId,
      },
    });

    // ✅ ACTIVITY LOG
    await logActivity({
      type: "EVENT_JOINED",
      message: `joined event "${event.name}"`,
      userId: req.user.id,
      entity: "EVENT",
      entityId: event.id,
    });

    res.status(201).json(attendee);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Already registered" });
    }
    res.status(500).json({ error: error.message });
  }
};
