const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // allow frontend connection
  },
});

// When a client connects
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Listen for message from client
  socket.on("send_message", (message) => {
    console.log("Message received:", message);

    // Broadcast to ALL connected clients
    io.emit("receive_message", message);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(3001, () => {
  console.log("Server running on port 3001");
});
