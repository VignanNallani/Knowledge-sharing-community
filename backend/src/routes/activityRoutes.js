// import express from "express";
// import { getActivities } from "../controllers/activityController.js";
// import { authenticate } from "../middleware/authMiddleware.js";


// const router = express.Router();

// router.get("/", authenticate, getActivities);

// export default router;


import express from "express";
import { getActivities } from "../controllers/activityController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ================= USER ACTIVITY FEED ================= */

// Get activities for the logged-in user (paginated)
router.get("/", authenticate, getActivities);

export default router;
