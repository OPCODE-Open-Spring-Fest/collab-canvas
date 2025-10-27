const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const URL=process.env.MONGO_URI||"mongodb://localhost:27017/collab-canvas";
connectDB(URL);

// Middleware
app.use(express.json());
app.use(cors());

// Routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// Root
app.get("/", (req, res) => {
  res.send("Collab Canvas server is running!");
});

// Create HTTP server and Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // change to your frontend URL in production
    methods: ["GET", "POST"],
  },
});

// Track users in rooms
const roomUsers = new Map(); // roomId -> Set of { socketId, username }

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Join room
  socket.on("join-room", (roomId, username) => {
    socket.join(roomId);
    
    // Add user to room tracking
    if (!roomUsers.has(roomId)) {
      roomUsers.set(roomId, new Map());
    }
    roomUsers.get(roomId).set(socket.id, { username: username || `User-${socket.id.slice(0, 4)}` });
    
    console.log(`User ${socket.id} joined room ${roomId}`);
    
    // Notify others in the room about the new user
    socket.to(roomId).emit("user-joined", {
      userId: socket.id,
      username: username || `User-${socket.id.slice(0, 4)}`
    });
    
    // Send existing users list to the new user
    const existingUsers = Array.from(roomUsers.get(roomId).entries())
      .filter(([id]) => id !== socket.id)
      .map(([id, data]) => ({ userId: id, username: data.username }));
    socket.emit("existing-users", existingUsers);
  });

  // Forward drawing events to all others in the room
  socket.on("draw", (data) => {
    const { roomId } = data;
    console.log(`🎨 Draw event from ${socket.id} in room ${roomId}`);
    socket.to(roomId).emit("draw", data);
  });
  
  // Handle cursor position updates
  socket.on("cursor-move", (data) => {
    const { roomId, x, y } = data;
    console.log(`🖱️ Cursor from ${socket.id} in room ${roomId}:`, x, y);
    socket.to(roomId).emit("cursor-move", {
      userId: socket.id,
      x,
      y
    });
  });
  
  // Handle leave room
  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
    
    // Remove user from room tracking
    if (roomUsers.has(roomId)) {
      roomUsers.get(roomId).delete(socket.id);
      if (roomUsers.get(roomId).size === 0) {
        roomUsers.delete(roomId);
      }
    }
    
    // Notify others in the room
    socket.to(roomId).emit("user-left", { userId: socket.id });
    console.log(`User ${socket.id} left room ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
    
    // Remove user from all rooms and notify others
    roomUsers.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        socket.to(roomId).emit("user-left", { userId: socket.id });
        
        if (users.size === 0) {
          roomUsers.delete(roomId);
        }
      }
    });
  });
});

// Only this one listen
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
