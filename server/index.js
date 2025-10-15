const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { setupCollabSockets } = require("./collabSockets");

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"]
}));

// Initialize Socket.io with CORS
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Minimal: attach all socket/collab logic!
setupCollabSockets(io);

app.get("/", (req, res) => {
    res.send("Collab Canvas server is running!");
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Socket.io server ready for connections`);
});