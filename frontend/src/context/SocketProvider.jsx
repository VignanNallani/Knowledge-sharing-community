import { createContext, useContext, useEffect, useState } from "react";
import { socket } from "../socket";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      socket.connect();
    } else {
      socket.disconnect();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    socket.on("connect", () => {
      setIsConnected(true);
      setIsReconnecting(false);
      console.log("🔌 Socket connected");
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      setIsReconnecting(true);
      console.log("❌ Socket disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("🔌 Socket connection error:", error);
      setIsReconnecting(true);
    });

    socket.on("reconnect", () => {
      setIsReconnecting(false);
      console.log("🔄 Socket reconnected");
    });

    socket.on("reconnect_attempt", () => {
      setIsReconnecting(true);
      console.log("🔄 Attempting to reconnect...");
    });

    // Cleanup on unmount
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("reconnect");
      socket.off("reconnect_attempt");
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, isReconnecting }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
}
