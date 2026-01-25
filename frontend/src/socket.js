// import { io } from "socket.io-client";

// const socket = io("http://localhost:4000", {
//   withCredentials: true,
// });

// export default socket;


import { io } from "socket.io-client";

const socket = io("http://localhost:4000", {
  withCredentials: true,
  autoConnect: true,
});

export default socket;
