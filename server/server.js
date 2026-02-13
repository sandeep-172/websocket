const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

let whiteboardHistory = [];

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Send existing board to new user
  whiteboardHistory.forEach((action) => {
    socket.emit("draw", action);
  });

  // ---- Drawing ----
  socket.on("draw", (data) => {
    whiteboardHistory.push(data);
    io.emit("draw", data); // send to everyone
  });

  socket.on("clear_canvas", () => {
    whiteboardHistory = [];
    io.emit("clear_canvas");
  });

  // ---- WebRTC Signaling ----
  socket.on("offer", (offer) => {
    socket.broadcast.emit("offer", offer);
  });

  socket.on("answer", (answer) => {
    socket.broadcast.emit("answer", answer);
  });

  socket.on("ice_candidate", (candidate) => {
    socket.broadcast.emit("ice_candidate", candidate);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});