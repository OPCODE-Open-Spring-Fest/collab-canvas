import { useEffect, useRef, useState, useCallback } from "react";
import { Toolbar } from "./Toolbar";
import { ColorPicker } from "./ColorPicker";
import { StrokeControl } from "./StrokeControl";
import { RoomManager } from "./RoomManager";
import { useSocket } from "../contexts/SocketContext";
import { toast } from "sonner";

export const Canvas = () => {
    const canvasRef = useRef(null);
    const [activeTool, setActiveTool] = useState("pen");
    const [activeColor, setActiveColor] = useState("#000000");
    const [strokeWidth, setStrokeWidth] = useState(3);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);
    
    const { socket, currentRoom, draw, clearCanvas } = useSocket();

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        
        // Set canvas context properties
        const ctx = canvas.getContext("2d");
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        toast.success("Canvas ready! Join a room to start collaborating!");

        return () => window.removeEventListener("resize", resizeCanvas);
    }, []);

    // Socket event listeners
    useEffect(() => {
        if (!socket) return;

        const handleDraw = (path) => {
            drawPathOnCanvas(path);
        };

        const handleCanvasCleared = () => {
            const ctx = canvasRef.current?.getContext("2d");
            if (!ctx || !canvasRef.current) return;
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        };

        const handleRoomState = (paths) => {
            // Clear canvas first
            const ctx = canvasRef.current?.getContext("2d");
            if (!ctx || !canvasRef.current) return;
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            
            // Redraw all paths
            paths.forEach(path => {
                drawPathOnCanvas(path);
            });
        };

        socket.on('draw', handleDraw);
        socket.on('canvas-cleared', handleCanvasCleared);
        socket.on('room-state', handleRoomState);

        return () => {
            socket.off('draw', handleDraw);
            socket.off('canvas-cleared', handleCanvasCleared);
            socket.off('room-state', handleRoomState);
        };
    }, [socket]);

    const drawPathOnCanvas = (path) => {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;

        ctx.beginPath();
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.width;
        ctx.moveTo(path.points[0].x, path.points[0].y);

        for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
        }

        ctx.stroke();
        ctx.closePath();
    };

    const startDrawing = (e) => {
        console.log("🎨 Starting to draw");
        
        if (activeTool !== "pen" && activeTool !== "eraser") {
            return;
        }

        setIsDrawing(true);
        const rect = canvasRef.current.getBoundingClientRect();
        const point = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        setCurrentPath([point]);
        
        // Draw the first point immediately
        const ctx = canvasRef.current.getContext("2d");
        ctx.beginPath();
        ctx.strokeStyle = activeTool === "eraser" ? "#ffffff" : activeColor;
        ctx.lineWidth = activeTool === "eraser" ? strokeWidth * 3 : strokeWidth;
        ctx.arc(point.x, point.y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
    };

    const handleDraw = useCallback((e) => {
        if (!isDrawing) return;
        if (activeTool !== "pen" && activeTool !== "eraser") return;

        const rect = canvasRef.current.getBoundingClientRect();
        const point = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        setCurrentPath(prev => [...prev, point]);

        // Draw the line segment
        const ctx = canvasRef.current.getContext("2d");
        ctx.strokeStyle = activeTool === "eraser" ? "#ffffff" : activeColor;
        ctx.lineWidth = activeTool === "eraser" ? strokeWidth * 3 : strokeWidth;
        
        ctx.beginPath();
        ctx.moveTo(currentPath[currentPath.length - 1]?.x || point.x, currentPath[currentPath.length - 1]?.y || point.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
    }, [isDrawing, activeTool, activeColor, strokeWidth, currentPath]);

    const stopDrawing = useCallback(() => {
        if (!isDrawing) return;
        
        console.log("🛑 Stopping drawing");
        setIsDrawing(false);

        // Send path to other users
        if (currentPath.length > 0 && currentRoom) {
            const path = {
                points: currentPath,
                color: activeTool === "eraser" ? "#ffffff" : activeColor,
                width: activeTool === "eraser" ? strokeWidth * 3 : strokeWidth,
                timestamp: Date.now(),
                id: Math.random().toString(36).substr(2, 9)
            };
            
            console.log("📤 Sending path to server:", path);
            draw(path);
        }

        setCurrentPath([]);
    }, [isDrawing, currentPath, currentRoom, activeTool, activeColor, strokeWidth, draw]);

    const handleClear = () => {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx || !canvasRef.current) return;
        
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        if (currentRoom) {
            clearCanvas();
            toast.success("Canvas cleared!");
        } else {
            toast.info("Canvas cleared locally");
        }
    };

    const handleToolChange = (tool) => {
        setActiveTool(tool);
        toast.info(`${tool.charAt(0).toUpperCase() + tool.slice(1)} tool selected`);
    };

    return (
        <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.1) 1px, transparent 0)`,
                    backgroundSize: '20px 20px'
                }} />
            </div>
            
            <RoomManager />
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
                onMouseDown={startDrawing}
                onMouseMove={handleDraw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="cursor-crosshair transition-all duration-200 hover:shadow-inner absolute top-0 left-0 z-0"
                style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}
            />

            {/* Enhanced Status Bar */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-10">
                <div className="bg-white/90 border border-gray-200/50 rounded-2xl shadow-xl backdrop-blur-md px-8 py-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${currentRoom ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                        <p className="text-sm font-semibold text-gray-700">
                            {currentRoom 
                                ? `✨ Collaborating in room: ${currentRoom}` 
                                : "🎨 Join a room to start collaborating!"
                            }
                        </p>
                        {currentRoom && (
                            <div className="ml-2 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                                LIVE
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Drawing Indicator */}
            {isDrawing && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
                    <div className="bg-black/20 backdrop-blur-sm rounded-full px-4 py-2">
                        <p className="text-white text-sm font-medium">Drawing...</p>
                    </div>
                </div>
            )}
        </div>
    );
};