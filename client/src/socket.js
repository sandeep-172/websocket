import { io } from "socket.io-client";

const socket = io("https://websocket-cafo.onrender.com", {
  transports: ["websocket"],
});

export default socket;