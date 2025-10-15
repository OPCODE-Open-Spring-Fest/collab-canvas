import { useEffect, useRef, useState } from "react";
import { Toolbar } from "./Toolbar";
import { ColorPicker } from "./ColorPicker";
import { StrokeControl } from "./StrokeControl";
import { toast } from "sonner";

export const Canvas = () => {
    const canvasRef = useRef(null);
    const [activeTool, setActiveTool] = useState("pen");
    const [activeColor, setActiveColor] = useState("#000000");
    const [strokeWidth, setStrokeWidth] = useState(3);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isCanvasFocused, setIsCanvasFocused] = useState(false); // 👈 new state

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const ctx = canvas.getContext("2d");
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener("resize", handleResize);
        toast.success("Canvas ready! Start drawing!");

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

    const startDrawing = (e) => {
        if (activeTool !== "pen" && activeTool !== "eraser") return;

        setIsDrawing(true);
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;

        const rect = canvasRef.current.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        if (activeTool !== "pen" && activeTool !== "eraser") return;

        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;

        const rect = canvasRef.current.getBoundingClientRect();
        ctx.strokeStyle = activeTool === "eraser" ? "#ffffff" : activeColor;
        ctx.lineWidth = activeTool === "eraser" ? strokeWidth * 3 : strokeWidth;
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
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
                tabIndex={0} // 👈 allows focus
                onFocus={() => setIsCanvasFocused(true)} // 👈 activate shortcuts
                onBlur={() => setIsCanvasFocused(false)} // 👈 deactivate shortcuts
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="cursor-crosshair focus:outline-2 focus:outline-primary"
            />

            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
                <div className="bg-toolbar/95 border border-toolbar-border rounded-xl shadow-lg backdrop-blur-sm px-6 py-3">
                    <p className="text-sm text-foreground font-medium">
                        Welcome to CollabCanvas - Select a tool and start drawing!
                    </p>
                </div>
            </div>
        </div>
    );
};
