import { useEffect } from "react";
import socket from "../socket";

const NotificationHandler = ({ currentUser }) => {
  useEffect(() => {
    if (!currentUser) return;

    // Join personal room
    socket.emit("join-room", `user-${currentUser.id}`);

    // Listen for notifications
    socket.on("post-notification", (data) => {
      console.log("New Notification:", data);
      alert(data.message); // temporary UI
    });

    return () => {
      socket.off("post-notification");
    };
  }, [currentUser]);

  return null;
};

export default NotificationHandler;
