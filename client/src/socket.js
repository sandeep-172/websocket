import { io } from "socket.io-client";

// Connect to backend server
const socket = io("https://websocket-cafo.onrender.com");

export default socket;
