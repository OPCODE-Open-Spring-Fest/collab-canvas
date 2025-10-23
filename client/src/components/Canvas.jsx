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
  const [isCanvasFocused, setIsCanvasFocused] = useState(false);

  const startPoint = useRef({ x: 0, y: 0 });
  const snapshot = useRef(null);

  // --- Pan and Zoom State ---
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  // Ref to store the latest canvas state for redraws
  const canvasImage = useRef(null);

  // --- Collaboration State ---
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("token")
  );

  const handleLogout = async () => {
    // ... (existing logout logic - unchanged)
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.removeItem("token");
        setIsLoggedIn(false);
        toast.success("Logged out successfully!");
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error("Logout failed!");
    }
  };

  // --- Helper Function: Screen to World Coordinates ---
  /**
   * Converts mouse event coordinates (screen space) to canvas
   * coordinates (world space) respecting scale and offset.
   */
  const getWorldPoint = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    return {
      x: (screenX - offset.x) / scale,
      y: (screenY - offset.y) / scale,
    };
  };

  // --- Redraw canvas on Pan or Zoom ---
  /**
   * This effect redraws the entire canvas whenever scale or offset changes.
   * It preserves the destructive drawing by saving/redrawing the canvas content.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvasImage.current) return;

    const img = new Image();
    img.src = canvasImage.current;
    img.onload = () => {
      ctx.save();
      // Reset transform to clear and draw the image
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Apply the new transform
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);
      // Draw the saved canvas content
      ctx.drawImage(img, 0, 0);
      ctx.restore();
      // Re-apply settings for subsequent draws
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    };
  }, [scale, offset]);

  // --- Save Canvas State ---
  /**
   * Saves the canvas state to the ref.
   * This is called after any drawing operation.
   */
  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvasImage.current = canvas.toDataURL();
  };

  useEffect(() => {
    const s = io("http://localhost:3000");
    setSocket(s);
    s.on("connect", () => console.log("Connected to server:", s.id));
    s.on("draw", ({ x, y, color, width, type, tool }) => {
      if (!joined) return;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;

      // Apply current transform for socket drawings
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);

      if (type === "start") ctx.beginPath();
      ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
      ctx.lineWidth = tool === "eraser" ? width * 3 : width;
      ctx.lineTo(x, y);
      ctx.stroke();

      ctx.restore(); // Restore to default transform
      saveCanvasState(); // Save state after remote draw
    });
    return () => s.disconnect();
  }, [joined, scale, offset]); // Add scale/offset dependencies

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Initial canvas save
    saveCanvasState();

    const handleResize = () => {
      const img = new Image();
      // Use the saved image ref for resizing
      if (canvasImage.current) {
        img.src = canvasImage.current;
      }

      const oldWidth = canvas.width;
      const oldHeight = canvas.height;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Re-apply transform and draw image
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);
      if (img.src) {
        // Draw the image, scaling it to fit the old "world" size if needed
        // This simple redraw at (0,0) is usually sufficient for bitmap
        ctx.drawImage(img, 0, 0);
      }
      ctx.restore();

      // Re-apply settings
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Save new state after resize
      saveCanvasState();
    };

    window.addEventListener("resize", handleResize);
    toast.success("Canvas ready! Local mode active.");
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Remove scale/offset, handled by resize

  useEffect(() => {
    // ... (existing keydown logic for tools - unchanged)
    const handleKeyDown = (e) => {
      if (!isCanvasFocused) return;
      if (e.key === "p" || e.key === "P" || e.key === "1")
        handleToolChange("pen");
      else if (e.key === "e" || e.key === "E" || e.key === "2")
        handleToolChange("eraser");
      else if (e.key === "l" || e.key === "L" || e.key === "3")
        handleToolChange("line");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCanvasFocused]);

  // --- Panning Listeners (Spacebar) ---
  useEffect(() => {
    const handleSpaceDown = (e) => {
      if (e.key === " ") {
        e.preventDefault();
        setIsPanning(true);
      }
    };
    const handleSpaceUp = (e) => {
      if (e.key === " ") {
        e.preventDefault();
        setIsPanning(false);
      }
    };
    window.addEventListener("keydown", handleSpaceDown);
    window.addEventListener("keyup", handleSpaceUp);
    return () => {
      window.removeEventListener("keydown", handleSpaceDown);
      window.removeEventListener("keyup", handleSpaceUp);
    };
  }, []);

  // --- Drawing Logic Handlers (MODIFIED) ---

  const startDrawing = (e) => {
    setIsPointerDown(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    // Apply transform before drawing
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    const { x, y } = getWorldPoint(e);
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    if (isPanning) {
      // Panning logic is handled in `draw`
      ctx.restore();
      return;
    }

    startPoint.current = { x, y };
    setIsDrawing(true);

    if (activeTool === "pen" || activeTool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(x, y);
      if (joined && socket)
        socket.emit("draw", {
          roomId,
          x, // Send WORLD coordinates
          y, // Send WORLD coordinates
          type: "start",
          color: activeColor,
          width: strokeWidth,
          tool: activeTool,
        });
    }

    // Save snapshot for preview tools
    if (activeTool === "line" || activeTool === "rectangle") {
      // Snapshot must be taken from the *un-transformed* context
      ctx.restore(); // Restore *before* getImageData
      snapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Re-save to apply transform again for next draw
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);
    }
    ctx.restore(); // Restore transform
  };

  const draw = (e) => {
    if (!isPointerDown) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    // Apply transform
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    const { x, y } = getWorldPoint(e);

    // --- Handle Panning ---
    if (isPanning) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      ctx.restore();
      return;
    }

    if (!isDrawing) {
      ctx.restore();
      return;
    }

    // --- Handle Drawing ---
    if (activeTool === "pen" || activeTool === "eraser") {
      ctx.strokeStyle = activeTool === "eraser" ? "#ffffff" : activeColor;
      ctx.lineWidth = activeTool === "eraser" ? strokeWidth * 3 : strokeWidth;
      ctx.lineTo(x, y);
      ctx.stroke();
      if (joined && socket)
        socket.emit("draw", {
          roomId,
          x, // Send WORLD coordinates
          y, // Send WORLD coordinates
          type: "move",
          color: activeColor,
          width: strokeWidth,
          tool: activeTool,
        });
    } else if (activeTool === "line" || activeTool === "rectangle") {
      // --- Snapshot logic ---
      // 1. Restore to default transform to draw snapshot
      ctx.restore();
      if (snapshot.current) {
        ctx.putImageData(snapshot.current, 0, 0);
      }
      // 2. Save and re-apply panned/zoomed transform
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);

      // 3. Draw the preview shape in WORLD space
      ctx.beginPath();
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = strokeWidth;

      if (activeTool === "line") {
        ctx.moveTo(startPoint.current.x, startPoint.current.y);
        ctx.lineTo(x, y);
      } else if (activeTool === "rectangle") {
        const startX = startPoint.current.x;
        const startY = startPoint.current.y;
        const width = x - startX;
        const height = y - startY;
        ctx.strokeRect(startX, startY, width, height);
      }
      ctx.stroke();
      ctx.closePath();
    }

    ctx.restore(); // Restore transform
  };

  const stopDrawing = () => {
    setIsPointerDown(false);
    if (!isDrawing) return; // Don't save if we were just panning

    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.closePath();
      saveCanvasState(); // Save the final state
    }
  };

  // --- Zoom Handler (Mouse Wheel) ---
  const handleWheel = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Mouse position in world space before zoom
    const worldX = (screenX - offset.x) / scale;
    const worldY = (screenY - offset.y) / scale;

    // Zoom factor
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * delta, 0.5), 3);

    // New offset to keep worldX/worldY at the same screenX/screenY
    const newOffsetX = screenX - worldX * newScale;
    const newOffsetY = screenY - worldY * newScale;

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  const handleClear = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    // Reset transform before clearing
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.restore();
    // Re-apply current transform (which will be blank)
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    ctx.restore();

    saveCanvasState(); // Save the cleared state
    toast.success("Canvas cleared!");
  };

  // --- Collaboration Handlers (Unchanged) ---
  const handleJoinRoom = () => {
    if (!roomId.trim() || !socket) return;
    socket.emit("join-room", roomId.trim());
    setJoined(true);
    setIsModalOpen(false);
    toast.success(`Collaborative mode active - joined room: ${roomId}`);
  };

  const handleToolChange = (tool) => {
    setActiveTool(tool);
    toast.info(`${tool.charAt(0).toUpperCase() + tool.slice(1)} tool selected`);
  };

  const handleExitRoom = () => {
    if (socket) {
      socket.emit("leave-room", roomId);
      setJoined(false);
      toast.success(`Left room: ${roomId}`);
    }
  };

  // Determine cursor based on state
  const getCursor = () => {
    if (isPanning) {
      return isPointerDown ? "cursor-grabbing" : "cursor-grab";
    }
    return "cursor-crosshair";
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-canvas">
      {/* 🔹 Login / Logout buttons (Unchanged) */}
      <div className="fixed top-4 left-4 z-[9999]">
        {isLoggedIn ? (
          // ... (logout button)
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700"
          >
            Logout
          </button>
        ) : (
          <>
            {/* ... (desktop login/signup buttons) */}
            <div className="hidden sm:flex gap-3">
              <button
                onClick={() => (window.location.href = "/login")}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700"
              >
                Sign In
              </button>
              <button
                onClick={() => (window.location.href = "/register")}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700"
              >
                Sign Up
              </button>
            </div>
            {/* ... (mobile login/signup dropdown) */}
            <div className="sm:hidden relative">
              <details className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow cursor-pointer select-none">
                <summary className="outline-none list-none">Menu ☰</summary>
                <div className="absolute left-0 mt-2 w-32 bg-white text-black rounded-lg shadow-lg border">
                  <button
                    onClick={() => (window.location.href = "/login")}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => (window.location.href = "/register")}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Sign Up
                  </button>
                </div>
              </details>
            </div>
          </>
        )}
      </div>

      {/* --- UI Elements (Unchanged) --- */}
      <Toolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        onClear={handleClear}
      />
      {joined ? (
        <button
          onClick={() => handleExitRoom()}
          className="fixed top-4 right-4 bg-red-700 text-white px-4 py-2 rounded-lg shadow hover:bg-red-800 z-50"
        >
          Exit Room
        </button>
      ) : (
        <button
          onClick={() => setIsModalOpen(true)}
          className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 z-50"
        >
          Collaborate
        </button>
      )}
      <ColorPicker activeColor={activeColor} onColorChange={setActiveColor} />
      <StrokeControl
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
      />

      {/* --- Canvas Element (MODIFIED) --- */}
      <canvas
        ref={canvasRef}
        tabIndex={0}
        onFocus={() => setIsCanvasFocused(true)}
        onBlur={() => setIsCanvasFocused(false)}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onWheel={handleWheel} // Added wheel handler
        className={`${getCursor()} focus:outline-2 focus:outline-primary`} // Dynamic cursor
      />

      {/* --- Modal and Info (Unchanged) --- */}
      {isModalOpen && (
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
          <button
            onClick={() => setIsModalOpen(false)}
            className="text-sm text-gray-600 mt-2 hover:underline"
          >
            Cancel
          </button>
        </div>
      )}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="bg-toolbar/95 border border-toolbar-border rounded-xl shadow-lg backdrop-blur-sm px-6 py-3">
          <p className="text-sm text-foreground font-medium">
            {joined
              ? `Connected to Room: ${roomId}`
              : "Local mode - your drawings are not shared."}
          </p>
        </div>
      </div>
    </div>
  );
};