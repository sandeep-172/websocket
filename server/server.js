const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Allow requests from any frontend
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // ---- Chat messages ----
  socket.on("send_message", (message) => {
    console.log("Message received:", message);
    io.emit("receive_message", message); // broadcast to all
  });

  // ---- Whiteboard drawing ----
  socket.on("draw", (data) => {
    // data = { x0, y0, x1, y1, color, width }
    socket.broadcast.emit("draw", data);
  });

  // ---- Clear canvas ----
  socket.on("clear_canvas", () => {
    socket.broadcast.emit("clear_canvas");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});