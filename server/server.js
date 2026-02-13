const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // allow all origins for frontend (Vercel)
  },
});

// Optional: store current whiteboard state to send to new users
let whiteboardHistory = [];

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Send existing whiteboard data to newly connected user
  whiteboardHistory.forEach((action) => {
    socket.emit("draw", action);
  });

  // ---- Chat messages ----
  socket.on("send_message", (message) => {
    io.emit("receive_message", message);
  });

  // ---- Drawing events ----
  socket.on("draw", (data) => {
    // Save the action
    whiteboardHistory.push(data);
    // Broadcast to all other users
    socket.broadcast.emit("draw", data);
  });

  // ---- Clear canvas ----
  socket.on("clear_canvas", () => {
    // Clear history
    whiteboardHistory = [];
    // Broadcast to all clients including sender
    io.emit("clear_canvas");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});