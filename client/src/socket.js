import { io } from "socket.io-client";

// Connect to backend server
const socket = io("http://localhost:3001");

export default socket;
