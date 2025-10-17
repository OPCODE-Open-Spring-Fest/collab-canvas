const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

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

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);

const PORT = process.env.PORT || 3000;

// Basic root route
app.get("/", (req, res) => res.send("Collab Canvas server running!"));

// Create HTTP server and Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // update with your frontend URL in production
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Join room
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Forward drawing events to all others in the room
  socket.on("draw", (data) => {
    const { roomId } = data;
    socket.to(roomId).emit("draw", data); // forward full data
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
})