

// import dotenv from "dotenv";
// dotenv.config();

// import express from "express";
// import cors from "cors";
// import http from "http";
// import { Server } from "socket.io";

// // Swagger
// import swaggerUi from "swagger-ui-express";
// import swaggerSpec from "./swagger.js";

// // Routes
// import authRoutes from "./src/routes/auth.js";
// import postRoutes from "./src/routes/posts.js";
// import userRoutes from "./src/routes/user.js";
// import commentRoutes from "./src/routes/comments.js";
// import likeRoutes from "./src/routes/likes.js";
// import adminRoutes from "./src/routes/admin.js";
// import adminPostRoutes from "./src/routes/admin/adminpost.js";
// import mentorshipRoutes from "./src/routes/mentorship.js";
// import eventRoutes from "./src/routes/event.js";
// import reportRoutes from "./src/routes/reports.js";
// import uploadRoutes from "./src/routes/uploads.js";
// import activityRoutes from "./src/routes/activityRoutes.js";
// import followRoutes from "./src/routes/followRoutes.js";

// // Middleware
// import { authenticate } from "./src/middleware/authMiddleware.js";

// const app = express();

// /* ================== ALLOWED FRONTEND ORIGINS ================== */
// const FRONTEND_ORIGINS = [
//   "http://localhost:5173",
//   "http://localhost:5174", // 👈 your current browser
// ];

// /* ================== CORS ================== */
// app.use(
//   cors({
//     origin: FRONTEND_ORIGINS,
//     credentials: true,
//   })
// );

// app.use(express.json());

// /* ================== SWAGGER ================== */
// app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// /* ================== HEALTH CHECK ================== */
// app.get("/health", (req, res) => {
//   res.json({
//     status: "OK",
//     uptime: process.uptime(),
//     timestamp: new Date().toISOString(),
//   });
// });

// /* ================== ROUTES ================== */
// // PUBLIC
// app.use("/api/auth", authRoutes);
// app.use("/api/posts", postRoutes);

// // PROTECTED
// app.use("/api/comments", authenticate, commentRoutes);
// app.use("/api/likes", authenticate, likeRoutes);
// app.use("/api/users", authenticate, userRoutes);
// app.use("/api/uploads", authenticate, uploadRoutes);
// app.use("/api/follow", authenticate, followRoutes);

// // ADMIN
// app.use("/api/admin", authenticate, adminRoutes);
// app.use("/api/admin/posts", authenticate, adminPostRoutes);

// // MENTORSHIP
// app.use("/api/mentorships", authenticate, mentorshipRoutes);

// // EVENTS
// app.use("/api/events", eventRoutes);

// // ACTIVITY FEED
// app.use("/api/activities", authenticate, activityRoutes);

// // REPORTS
// app.use("/api/reports", authenticate, reportRoutes);

// /* ================== GLOBAL ERROR HANDLER ================== */
// app.use((err, req, res, next) => {
//   console.error("🔥 Global Error:", err);
//   res.status(err.status || 500).json({
//     success: false,
//     message: err.message || "Internal Server Error",
//   });
// });

// /* ================== SERVER & SOCKET.IO ================== */
// const PORT = process.env.PORT || 4000;
// const server = http.createServer(app);

// export const io = new Server(server, {
//   cors: {
//     origin: FRONTEND_ORIGINS,
//     methods: ["GET", "POST"],
//     credentials: true,
//   },
// });

// io.on("connection", (socket) => {
//   console.log("⚡ Socket connected:", socket.id);

//   socket.on("join-room", (room) => {
//     socket.join(room);
//     console.log(`🔐 Joined room: ${room}`);
//   });

//   socket.on("disconnect", () => {
//     console.log("❌ Socket disconnected:", socket.id);
//   });
// });

// server.listen(PORT, () => {
//   console.log(`🚀 Server running on http://localhost:${PORT}`);
//   console.log(`📘 Swagger Docs: http://localhost:${PORT}/api/docs`);
// });

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

// Swagger
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger.js";

// Routes (MVP ONLY)
import authRoutes from "./src/routes/auth.js";
import postRoutes from "./src/routes/posts.js";
import userRoutes from "./src/routes/user.js";
import commentRoutes from "./src/routes/comments.js";
import likeRoutes from "./src/routes/likes.js";
import mentorshipRoutes from "./src/routes/mentorship.js";

// Middleware
import { authenticate } from "./src/middleware/authMiddleware.js";

const app = express();

/* ================== ALLOWED FRONTEND ORIGINS ================== */
const FRONTEND_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
];

/* ================== CORS ================== */
app.use(
  cors({
    origin: FRONTEND_ORIGINS,
    credentials: true,
  })
);

app.use(express.json());

/* ================== SWAGGER ================== */
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* ================== HEALTH CHECK ================== */
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/* ================== ROUTES ================== */
// PUBLIC
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);

// PROTECTED
app.use("/api/comments", authenticate, commentRoutes);
app.use("/api/likes", authenticate, likeRoutes);
app.use("/api/users", authenticate, userRoutes);

// MENTORSHIP
app.use("/api/mentorship", authenticate, mentorshipRoutes);

/* ================== GLOBAL ERROR HANDLER ================== */
app.use((err, req, res, next) => {
  console.error("🔥 Global Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

/* ================== SERVER & SOCKET.IO ================== */
const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("⚡ Socket connected:", socket.id);

  socket.on("join-room", (room) => {
    socket.join(room);
    console.log(`🔐 Joined room: ${room}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📘 Swagger Docs: http://localhost:${PORT}/api/docs`);
});
