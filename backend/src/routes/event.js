

// import express from "express";
// import { authenticate } from "../middleware/authMiddleware.js";
// import { authorizeRoles } from "../middleware/authorizeRoles.js";
// import * as eventController from "../controllers/eventController.js";

// const router = express.Router();

// /**
//  * @swagger
//  * tags:
//  *   name: Events
//  *   description: Event management
//  */

// // Public: List events
// router.get("/", eventController.getEvents);

// // Protected: Create/Update/Delete (ADMIN/MENTOR)
// router.post("/", authenticate, authorizeRoles("ADMIN", "MENTOR"), eventController.createEvent);
// router.put("/:id", authenticate, authorizeRoles("ADMIN", "MENTOR"), eventController.updateEvent);
// router.delete("/:id", authenticate, authorizeRoles("ADMIN", "MENTOR"), eventController.deleteEvent);

// // RSVP (USER)
// router.post("/:id/join", authenticate, authorizeRoles("USER"), eventController.joinEvent);

// export default router;


import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import * as eventController from "../controllers/eventController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Event management
 */

// Public: List events
router.get("/", eventController.getEvents);

// Protected: Create/Update/Delete (ADMIN/MENTOR)
router.post("/", authenticate, authorizeRoles("ADMIN", "MENTOR"), eventController.createEvent);
router.put("/:id", authenticate, authorizeRoles("ADMIN", "MENTOR"), eventController.updateEvent);
router.delete("/:id", authenticate, authorizeRoles("ADMIN", "MENTOR"), eventController.deleteEvent);

// RSVP (USER)
router.post("/:id/join", authenticate, authorizeRoles("USER"), eventController.joinEvent);

export default router;
