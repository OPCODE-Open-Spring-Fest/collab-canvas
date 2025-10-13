import React, { useRef, useEffect, useState } from "react";

const Canvas = () => {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [strokeSize, setStrokeSize] = useState(4); // default: medium

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Set canvas size
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const ctx = canvas.getContext("2d");
        if (ctx) {
            // Fill with white background
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = "black";
            ctx.lineWidth = strokeSize;
            ctxRef.current = ctx;
        }
    }, []);

    // Update stroke width whenever user changes stroke size
    useEffect(() => {
        if (ctxRef.current) {
            ctxRef.current.lineWidth = strokeSize;
        }
    }, [strokeSize]);

    const startDrawing = (e) => {
        const ctx = ctxRef.current;
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const ctx = ctxRef.current;
        if (!ctx) return;
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.stroke();
    };

    const stopDrawing = () => {
        const ctx = ctxRef.current;
        if (!ctx) return;
        ctx.closePath();
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (!canvas || !ctx) return;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    return (
        <div className="min-h-screen max-w-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-screen overflow-y-hidden w-full">
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                        Draw Something!
                    </h2>
                    <p className="text-gray-600">
                        Use your mouse to create a masterpiece
                    </p>
                </div>

                {/* 🎚️ Stroke Size Controls */}
                <div className="flex justify-center items-center gap-4 mb-4">
                    <label className="font-medium text-gray-700">Stroke Size:</label>
                    <div className="flex gap-2">
                        {[
                            { label: "Small", value: 2 },//2px
                            { label: "Medium", value: 4 },//4px
                            { label: "Large", value: 8 },//8px
                        ].map((size) => (
                            <button
                                key={size.value}
                                onClick={() => setStrokeSize(size.value)}
                                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md ${strokeSize === size.value
                                    ? "bg-purple-500 text-white scale-105"
                                    : "bg-gray-200 text-gray-700 hover:bg-purple-100"
                                    }`}
                            >
                                {size.label}
                            </button>
                        ))}
                    </div>
                </div>


                <canvas
                    ref={canvasRef}
                    className="border-4 border-gray-300 rounded-xl shadow-lg cursor-crosshair w-full hover:border-purple-400 transition-colors duration-200"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                />

                <div className="mt-6 flex justify-center">
                    <button
                        onClick={clearCanvas}
                        className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200 active:scale-95"
                    >
                        Clear Canvas
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Canvas;
