import { useEffect, useRef, useState } from "react";
import { Toolbar } from "./Toolbar";
import { ColorPicker } from "./ColorPicker";
import { StrokeControl } from "./StrokeControl";
import { Cursor } from "./Cursor";
import { toast } from "sonner";
import { io } from "socket.io-client";
import tinycolor from "tinycolor2";

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
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- Cursor Tracking State ---
  const [otherCursors, setOtherCursors] = useState(new Map()); // userId -> { x, y, username, color }
  const cursorColors = useRef(new Map()); // userId -> color

  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));

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

  // Generate a random color for a user
  const getColorForUser = (userId) => {
    if (!cursorColors.current.has(userId)) {
      const colors = [
        "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", 
        "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2",
        "#F8B739", "#52D3AA", "#E74C3C", "#3498DB"
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];
      cursorColors.current.set(userId, color);
    }
    return cursorColors.current.get(userId);
  };

  useEffect(() => {
    const s = io("http://localhost:3000");
    setSocket(s);
    
    s.on("connect", () => {
      console.log("✅ Connected to server:", s.id);
    });
    
    s.on("disconnect", () => {
      console.log("❌ Disconnected from server");
    });
    
    s.on("draw", ({ x, y, color, width, type, tool }) => {
      console.log("📥 Received draw event:", { x, y, type, tool });
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
    
    // Handle cursor movements from other users
    s.on("cursor-move", ({ userId, x, y }) => {
      console.log("🖱️ Received cursor from:", userId, "at", x, y);
      setOtherCursors((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(userId) || {};
        const newCursor = {
          x,
          y,
          username: existing.username || `User-${userId.slice(0, 4)}`,
          color: getColorForUser(userId)
        };
        console.log("📌 Setting cursor:", userId, newCursor);
        updated.set(userId, newCursor);
        console.log("🗺️ Total cursors:", updated.size);
        return updated;
      });
    });
    
    // Handle new user joining
    s.on("user-joined", ({ userId, username }) => {
      console.log("👤 User joined:", username, "(ID:", userId, ")");
      setOtherCursors((prev) => {
        const updated = new Map(prev);
        updated.set(userId, {
          x: 0,
          y: 0,
          username,
          color: getColorForUser(userId)
        });
        console.log("🗺️ Total cursors after join:", updated.size);
        return updated;
      });
      toast.info(`${username} joined the room`);
    });
    
    // Handle existing users when joining
    s.on("existing-users", (users) => {
      console.log("👥 Existing users:", users);
      setOtherCursors((prev) => {
        const updated = new Map(prev);
        users.forEach(({ userId, username }) => {
          updated.set(userId, {
            x: 0,
            y: 0,
            username,
            color: getColorForUser(userId)
          });
        });
        return updated;
      });
    });
    
    // Handle user leaving
    s.on("user-left", ({ userId }) => {
      console.log("👋 User left:", userId);
      setOtherCursors((prev) => {
        const updated = new Map(prev);
        const user = updated.get(userId);
        updated.delete(userId);
        cursorColors.current.delete(userId);
        if (user) {
          toast.info(`${user.username} left the room`);
        }
        return updated;
      });
    });
    
    return () => {
      console.log("🔌 Disconnecting socket...");
      s.disconnect();
    };
  }, []); // Remove dependencies to prevent socket recreation!

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

    // Begin drawing for pen, eraser, or brush tools
    if (
      activeTool === "pen" ||
      activeTool === "eraser" ||
      activeTool.startsWith("brush-")
    ) {
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

    // Snapshot for line/rectangle previews
    if (activeTool === "line" || activeTool === "rectangle") {
      ctx.restore(); // restore before snapshot
      snapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);
    }

    ctx.restore(); // Restore transform
  };

  const draw = (e) => {
    if (!isPointerDown || !isDrawing) return;

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

    // --- Brush / Pen / Eraser Tools ---
    if (
      activeTool === "pen" ||
      activeTool === "eraser" ||
      activeTool.startsWith("brush-")
    ) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      let color = activeColor;
      let width = strokeWidth;

      if (activeTool === "eraser") {
        color = "#ffffff";
        width = strokeWidth * 3;
      }

      if (activeTool.startsWith("brush-")) {
        const brush = activeTool.split("-")[1];
        switch (brush) {
          case "dashed": {
            const dashLength = strokeWidth * 4; 
            const gapLength = strokeWidth * 2.5;
            ctx.setLineDash([dashLength, gapLength]);
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            ctx.strokeStyle = activeColor;
            ctx.lineWidth = strokeWidth;

            const jitterX = x + (Math.random() - 0.5) * 0.5;
            const jitterY = y + (Math.random() - 0.5) * 0.5;
            ctx.lineTo(jitterX, jitterY);
            ctx.stroke();
            break;
          }

          case "paint":
            ctx.shadowColor = color;
            ctx.shadowBlur = 12;
            ctx.globalAlpha = 0.5 + Math.random() * 0.2;
            width = strokeWidth * 2;
            break;
          case "crayon":
            ctx.globalAlpha = 0.8;
            ctx.shadowBlur = 5;
            for (let i = 0; i < 4; i++) {
              const jitterX = x + (Math.random() - 0.5) * 1.5;
              const jitterY = y + (Math.random() - 0.5) * 1.5;
              ctx.lineTo(jitterX, jitterY);
            }
            break;
          case "oil-pastel": {
            console.log("this is oil")
            ctx.setLineDash([]);
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            const steps = 10; 
            for (let i = 0; i < steps; i++) {
              const jitterX = x + (Math.random() - 0.5) * 5;
              const jitterY = y + (Math.random() - 0.5) * 5;
              const jitterWidth = strokeWidth * (0.8 + Math.random() * 0.6);
              const opacity = 0.1 + Math.random() * 0.15;
              const color = tinycolor(activeColor)
                .brighten((Math.random() - 0.5) * 8)
                .setAlpha(opacity)
                .toRgbString();

              ctx.strokeStyle = color;
              ctx.lineWidth = jitterWidth;

              ctx.beginPath();
              ctx.moveTo(
                startPoint.current.x + (Math.random() - 0.5) * 3,
                startPoint.current.y + (Math.random() - 0.5) * 3
              );
              ctx.lineTo(jitterX, jitterY);
              ctx.stroke();
            }
            ctx.shadowColor = activeColor;
            ctx.shadowBlur = 2;
            ctx.globalAlpha = 0.7;
            ctx.lineWidth = strokeWidth * 1.5;
            ctx.beginPath();
            ctx.moveTo(startPoint.current.x, startPoint.current.y);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            break;
          }

          default:
            ctx.setLineDash([]);
        }
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = width;

      ctx.lineTo(x, y);
      ctx.stroke();

      if (joined && socket)
        socket.emit("draw", {
          roomId,
          x,
          y,
          type: "move",
          color,
          width,
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
    const displayName = username.trim() || `User-${socket.id?.slice(0, 4)}`;
    console.log("🚨 Joining room:", roomId.trim(), "as", displayName);
    socket.emit("join-room", roomId.trim(), displayName);
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
      setOtherCursors(new Map()); // Clear all cursors
      cursorColors.current.clear(); // Clear color mappings
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
        onMouseMove={(e) => {
          // Send cursor position to other users when in a room
          if (joined && socket) {
            const { x, y } = getWorldPoint(e);
            socket.emit("cursor-move", { roomId, x, y });
          }
          draw(e);
        }}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onWheel={handleWheel} // Added wheel handler
        className={`${getCursor()} focus:outline-2 focus:outline-primary`} // Dynamic cursor
      />
      
      {/* --- Render Other Users' Cursors --- */}
      {joined && Array.from(otherCursors.entries()).map(([userId, cursor]) => {
        console.log("🎯 Rendering cursor for:", userId, cursor);
        return (
          <Cursor
            key={userId}
            x={cursor.x * scale + offset.x}
            y={cursor.y * scale + offset.y}
            username={cursor.username}
            color={cursor.color}
          />
        );
      })}

      {/* --- Modal and Info (Unchanged) --- */}
      {isModalOpen && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 border border-gray-400 rounded-xl shadow-xl p-6 z-50 flex flex-col items-center gap-3">
          <h2 className="text-xl font-semibold">Join a Room</h2>
          <input
            type="text"
            placeholder="Enter Your Name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border border-gray-400 rounded-md px-4 py-2 w-64 text-center"
          />
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
