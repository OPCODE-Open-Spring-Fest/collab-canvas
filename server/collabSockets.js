// server/collabSockets.js

const roomStates = new Map();
const MAX_PATHS_PER_ROOM = 1000;

function setupCollabSockets(io) {
    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.id}`);

        // Join Room
        socket.on("join-room", (roomId) => {
            try {
                if (!roomId || typeof roomId !== 'string') {
                    socket.emit("join-room-error", { message: "Invalid room ID" });
                    return;
                }
                socket.join(roomId);
                if (!roomStates.has(roomId)) {
                    roomStates.set(roomId, {
                        paths: [],
                        users: new Set(),
                        createdAt: Date.now()
                    });
                }
                roomStates.get(roomId).users.add(socket.id);
                const roomState = roomStates.get(roomId);
                socket.emit("room-state", roomState.paths.slice(-100));
                socket.to(roomId).emit("user-joined", socket.id);
                io.to(roomId).emit("user-count", roomState.users.size);
                socket.emit("join-room-success", { roomId, userCount: roomState.users.size });
            } catch (error) {
                socket.emit("join-room-error", { message: "Server error joining room" });
            }
        });

        // Draw Event
        socket.on("draw", (data) => {
            const { roomId, path } = data;
            if (!roomStates.has(roomId)) {
                roomStates.set(roomId, {
                    paths: [],
                    users: new Set(),
                    createdAt: Date.now()
                });
            }
            const roomState = roomStates.get(roomId);
            roomState.paths.push(path);
            if (roomState.paths.length > MAX_PATHS_PER_ROOM) {
                roomState.paths = roomState.paths.slice(-MAX_PATHS_PER_ROOM);
            }
            socket.to(roomId).emit("draw", path);
        });

        // Clear Canvas
        socket.on("clear-canvas", (roomId) => {
            if (roomStates.has(roomId)) {
                roomStates.get(roomId).paths = [];
            }
            io.to(roomId).emit("canvas-cleared");
        });

        // Leave Room
        socket.on("leave-room", (roomId) => {
            if (roomStates.has(roomId)) {
                roomStates.get(roomId).users.delete(socket.id);
                io.to(roomId).emit("user-count", roomStates.get(roomId).users.size);
                if (roomStates.get(roomId).users.size === 0) {
                    roomStates.delete(roomId);
                }
            }
            socket.leave(roomId);
            console.log(`User ${socket.id} left room ${roomId}`);
        });

        // Disconnect
        socket.on("disconnect", () => {
            roomStates.forEach((roomState, roomId) => {
                if (roomState.users.has(socket.id)) {
                    roomState.users.delete(socket.id);
                    io.to(roomId).emit("user-count", roomState.users.size);
                    if (roomState.users.size === 0) {
                        roomStates.delete(roomId);
                    }
                }
            });
        });
    });
}

module.exports = { setupCollabSockets };