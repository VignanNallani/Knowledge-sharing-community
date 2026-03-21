import { useEffect, useState, useRef } from "react";
import { useSocket } from "../context/SocketProvider";

export function useRealtime() {
  const [activity, setActivity] = useState({});
  const cleanupIntervalRef = useRef(null);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on("post-activity", (data) => {
      setActivity((prev) => ({
        ...prev,
        [data.postId]: {
          ...data,
          timestamp: Date.now(),
        },
      }));
    });

    // Cleanup stale activity every 5 seconds
    cleanupIntervalRef.current = setInterval(() => {
      setActivity((prev) => {
        const now = Date.now();
        const updated = {};

        Object.keys(prev).forEach((key) => {
          if (now - prev[key].timestamp < 10000) {
            updated[key] = prev[key];
          }
        });

        return updated;
      });
    }, 5000);

    return () => {
      socket.off("post-activity");
      
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [socket]);

  return { activity, isConnected: !!socket };
}
