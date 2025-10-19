import { useEffect, useRef, useState } from "react";
import { Toolbar } from "./Toolbar";
import { ColorPicker } from "./ColorPicker";
import { StrokeControl } from "./StrokeControl";
import { toast } from "sonner";
import { io } from "socket.io-client";

export const Canvas = () => {
  const canvasRef = useRef(null);
  const [activeTool, setActiveTool] = useState("pen"); // default = pen
  const [activeColor, setActiveColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isCanvasFocused, setIsCanvasFocused] = useState(false);

  // For line tool
  const startPoint = useRef({ x: 0, y: 0 });
  const snapshot = useRef(null);

  // Collaboration
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [socket, setSocket] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    const s = io("http://localhost:3000"); // replace with your backend URL
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
    toast.success("Canvas ready! Start drawing!");
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isCanvasFocused) return;

      if (e.key === "p" || e.key === "P" || e.key === "1") {
        handleToolChange("pen");
      } else if (e.key === "e" || e.key === "E" || e.key === "2") {
        handleToolChange("eraser");
      } else if (e.key === "l" || e.key === "L" || e.key === "3") {
        handleToolChange("line");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCanvasFocused]);

  // Drawing logic
  const startDrawing = (e) => {
    if (!joined) {
      toast.error("Join a room first!");
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    startPoint.current = { x, y };
    setIsDrawing(true);

    if (activeTool === "pen" || activeTool === "eraser") {
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
    }

    if (activeTool === "line") {
      snapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === "pen" || activeTool === "eraser") {
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
    } else if (activeTool === "line") {
      ctx.putImageData(snapshot.current, 0, 0);
      ctx.beginPath();
      ctx.moveTo(startPoint.current.x, startPoint.current.y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
      ctx.closePath();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.closePath();
  };

  const handleClear = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    toast.success("Canvas cleared!");
  };

  const handleJoinRoom = () => {
    if (!roomId.trim() || !socket) return;
    socket.emit("join-room", roomId.trim());
    setJoined(true);
    toast.success(`Joined room: ${roomId}`);
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
      <StrokeControl
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
      />

      <canvas
        ref={canvasRef}
        tabIndex={0}
        onFocus={() => setIsCanvasFocused(true)}
        onBlur={() => setIsCanvasFocused(false)}
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

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="bg-toolbar/95 border border-toolbar-border rounded-xl shadow-lg backdrop-blur-sm px-6 py-3">
          <p className="text-sm text-foreground font-medium">
            Welcome to CollabCanvas — Select a tool and start drawing!
          </p>
        </div>
      </div>
    </div>
  );
};
