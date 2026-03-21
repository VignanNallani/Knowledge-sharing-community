import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// Track activity per post
let postActivityMap = {};

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  socket.on("post-view", (data) => {
    console.log("👁️ Post viewed:", data.postId);
    
    // Initialize activity counter if not exists
    if (!postActivityMap[data.postId]) {
      postActivityMap[data.postId] = 0;
    }

    // Increment activity
    postActivityMap[data.postId] += 1;
    
    // Broadcast current activity
    io.emit("post-activity", {
      postId: data.postId,
      activeUsers: postActivityMap[data.postId],
      timestamp: Date.now(),
    });

    // Decay activity after 8 seconds (simulating users leaving)
    setTimeout(() => {
      if (postActivityMap[data.postId] > 0) {
        postActivityMap[data.postId] -= 1;
        
        io.emit("post-activity", {
          postId: data.postId,
          activeUsers: postActivityMap[data.postId],
          timestamp: Date.now(),
        });
      }
    }, 8000);
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

httpServer.listen(5000, () => {
  console.log("🚀 Mock Socket.IO server running on port 5000");
  console.log("📡 Frontend can connect to: http://localhost:5000");
  console.log("🔄 Activity will decay after 8 seconds");
});
