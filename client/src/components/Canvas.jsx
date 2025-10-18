import { useEffect, useRef, useState } from "react";
import { Toolbar } from "./Toolbar";
import { ColorPicker } from "./ColorPicker";
import { StrokeControl } from "./StrokeControl";
import { toast } from "sonner";
import { io } from "socket.io-client";

export const Canvas = () => {
    const canvasRef = useRef(null);
    const [activeTool, setActiveTool] = useState("pen");
    const [activeColor, setActiveColor] = useState("#000000");
    const [strokeWidth, setStrokeWidth] = useState(3);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isCanvasFocused, setIsCanvasFocused] = useState(false); // 👈 new state

    const [roomId, setRoomId] = useState("");
    const [joined, setJoined] = useState(false);
    const [socket, setSocket] = useState(null);

    // Initialize socket connection
    useEffect(() => {
        const s = io("http://localhost:3000"); // replace with deployed backend
        setSocket(s);

        s.on("connect", () => console.log("Connected to server:", s.id));

        // Handle strokes from other users
        s.on("draw", ({ x, y, color, width, type, tool }) => {
            const ctx = canvasRef.current?.getContext("2d");
            if (!ctx) return;

            if (type === "start") ctx.beginPath();
            ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
            ctx.lineWidth = tool === "eraser" ? width * 3 : width;
            ctx.lineTo(x, y);
            ctx.stroke();
        });

        return () => s.disconnect();
    }, []);

    // Canvas setup
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const handleResize = () => {
            const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            ctx.putImageData(image, 0, 0);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // 🎹 Keyboard shortcut handling
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isCanvasFocused) return; // only when canvas focused

            if (e.key === "p" || e.key === "P" || e.key === "1") {
                handleToolChange("pen");
            } else if (e.key === "e" || e.key === "E" || e.key === "2") {
                handleToolChange("eraser");
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isCanvasFocused]);

    // 🎹 Keyboard shortcut handling
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isCanvasFocused) return; // only when canvas focused

            if (e.key === "p" || e.key === "P" || e.key === "1") {
                handleToolChange("pen");
            } else if (e.key === "e" || e.key === "E" || e.key === "2") {
                handleToolChange("eraser");
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isCanvasFocused]);

    // Drawing functions
    const startDrawing = (e) => {
        if (!joined) {
            toast.error("Join a room first!");
            return;
        }
        setIsDrawing(true);
        const ctx = canvasRef.current.getContext("2d");
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);

        socket.emit("draw", {
            roomId,
            x,
            y,
            type: "start",
            color: activeColor,
            width: strokeWidth,
            tool: activeTool,
        });
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const ctx = canvasRef.current.getContext("2d");
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.strokeStyle = activeTool === "eraser" ? "#ffffff" : activeColor;
        ctx.lineWidth = activeTool === "eraser" ? strokeWidth * 3 : strokeWidth;
        ctx.lineTo(x, y);
        ctx.stroke();

        socket.emit("draw", {
            roomId,
            x,
            y,
            type: "move",
            color: activeColor,
            width: strokeWidth,
            tool: activeTool,
        });
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) ctx.closePath();
    };

    const handleJoinRoom = () => {
        if (!roomId.trim() || !socket) return;
        socket.emit("join-room", roomId.trim());
        setJoined(true);
        toast.success(`Joined room: ${roomId}`);
    };

    const handleClear = () => {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        toast.success("Canvas cleared!");
    };

    const handleToolChange = (tool) => {
        setActiveTool(tool);
        toast.info(`${tool.charAt(0).toUpperCase() + tool.slice(1)} tool selected`);
    };

    return (
        <div className="relative w-full h-screen overflow-hidden bg-canvas">
            <Toolbar
                activeTool={activeTool}
                onToolChange={handleToolChange}
                onClear={handleClear}
            />
            <ColorPicker activeColor={activeColor} onColorChange={setActiveColor} />
            <StrokeControl strokeWidth={strokeWidth} onStrokeWidthChange={setStrokeWidth} />

            <canvas
                ref={canvasRef}
                tabIndex={0} // 👈 allows focus
                onFocus={() => setIsCanvasFocused(true)} // 👈 activate shortcuts
                onBlur={() => setIsCanvasFocused(false)} // 👈 deactivate shortcuts
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="cursor-crosshair focus:outline-2 focus:outline-primary"
            />

            {!joined && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 border border-gray-400 rounded-xl shadow-xl p-6 z-50 flex flex-col items-center gap-3">
                    <h2 className="text-xl font-semibold">Join a Room</h2>
                    <input
                        type="text"
                        placeholder="Enter Room ID"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        className="border border-gray-400 rounded-md px-4 py-2 w-64 text-center"
                    />
                    <button
                        onClick={handleJoinRoom}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                    >
                        Join Room
                    </button>
                </div>
            )}
        </div>
    );
};
