import { io } from "socket.io-client";
import { tokenManager } from "./lib/tokenManager";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

console.log('Socket URL:', SOCKET_URL);

export const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  auth: {
    token: () => tokenManager.getAccessToken()
  }
});

// Reconnect socket when token refreshes
window.addEventListener('auth-token-refreshed', () => {
  if (socket.connected) {
    socket.disconnect();
    socket.connect();
  }
});

// Disconnect socket when logout occurs
window.addEventListener('auth-logout-from-other-tab', () => {
  socket.disconnect();
});

export default socket;
