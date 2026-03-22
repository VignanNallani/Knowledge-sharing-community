import { io } from "socket.io-client";

export const socket = io(import.meta.env.VITE_API_BASE_URL || "http://localhost:4000", {
  autoConnect: false,
  withCredentials: true,
});

export const connectSocket = () => {
  socket.connect();
  
  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
  });
  
  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });
  
  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error);
  });
};

export const disconnectSocket = () => {
  socket.disconnect();
};

export const joinMentorRoom = (mentorId) => {
  socket.emit("join_mentor_room", mentorId);
};

export const leaveMentorRoom = (mentorId) => {
  socket.emit("leave_mentor_room", mentorId);
};

export const joinSessionRoom = (sessionId) => {
  socket.emit("join_session_room", sessionId);
};

export const leaveSessionRoom = (sessionId) => {
  socket.emit("leave_session_room", sessionId);
};
