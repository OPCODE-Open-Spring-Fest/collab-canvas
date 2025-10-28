import { useEffect, useRef, useState, useCallback } from "react";
import { Toolbar } from "./Toolbar";
import { ColorPicker } from "./ColorPicker";
import { StrokeControl } from "./StrokeControl";
import { toast } from "sonner";
import { io } from "socket.io-client";
import tinycolor from "tinycolor2";
import { jsPDF } from "jspdf";
import C2S from "canvas2svg";

// --- New Type Definitions for a Shape Object ---
const SHAPE_TYPE = {
  RECTANGLE: "rectangle",
  LINE: "line",
  PEN: "pen",
};

export const Canvas = () => {
  const canvasRef = useRef(null);

  const [shapes, setShapes] = useState([]);
  const [selectedShapeId, setSelectedShapeId] = useState(null);

  const [activeTool, setActiveTool] = useState("select");
  const [activeColor, setActiveColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isCanvasFocused, setIsCanvasFocused] = useState(false);

  const pointerStart = useRef({ x: 0, y: 0 });
  // manipulationMode will be null or an object: { mode: 'move'|'create'|'resize', dir?, origShape?, origBBox?, handleIndex? }
  const manipulationMode = useRef(null);

  // Pan & zoom
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const newShapeId = useRef(null);

  // Collaboration
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));

  // Hovered handle for cursor feedback
  const [hoveredHandle, setHoveredHandle] = useState(null); // { id, dir }

  const handleLogout = async () => {
    // placeholder
  };

  // --- Helpers ---
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

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Compute bounding box for a shape (world coords)
  const getShapeBBox = (shape) => {
    if (!shape) return null;
    if (shape.type === SHAPE_TYPE.RECTANGLE || shape.type === SHAPE_TYPE.LINE) {
      const minX = Math.min(shape.start.x, shape.end.x);
      const maxX = Math.max(shape.start.x, shape.end.x);
      const minY = Math.min(shape.start.y, shape.end.y);
      const maxY = Math.max(shape.start.y, shape.end.y);
      return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
    }
    if (shape.type === SHAPE_TYPE.PEN && shape.path && shape.path.length) {
      const minX = Math.min(...shape.path.map(p => p.x));
      const maxX = Math.max(...shape.path.map(p => p.x));
      const minY = Math.min(...shape.path.map(p => p.y));
      const maxY = Math.max(...shape.path.map(p => p.y));
      return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
    }
    return null;
  };

  // Returns array of handle objects: { x, y, dir }
  const getHandlesForShape = (shape) => {
    const bbox = getShapeBBox(shape);
    if (!bbox) return [];
    const { minX, minY, maxX, maxY } = bbox;
    return [
      { x: minX, y: minY, dir: 'nw' },
      { x: (minX + maxX) / 2, y: minY, dir: 'n' },
      { x: maxX, y: minY, dir: 'ne' },
      { x: maxX, y: (minY + maxY) / 2, dir: 'e' },
      { x: maxX, y: maxY, dir: 'se' },
      { x: (minX + maxX) / 2, y: maxY, dir: 's' },
      { x: minX, y: maxY, dir: 'sw' },
      { x: minX, y: (minY + maxY) / 2, dir: 'w' },
    ];
  };

  const handleHitTest = (point, handle, size = 8) => {
    return Math.abs(point.x - handle.x) <= size / 2 && Math.abs(point.y - handle.y) <= size / 2;
  };

  const getHandleUnderCursor = (point) => {
    if (!selectedShapeId) return null;
    const shape = shapes.find(s => s.id === selectedShapeId);
    if (!shape) return null;
    const handles = getHandlesForShape(shape);
    for (let i = 0; i < handles.length; i++) {
      if (handleHitTest(point, handles[i], 12)) {
        return { dir: handles[i].dir, index: i };
      }
    }
    return null;
  };

  // --- Drawing Utilities ---
  const drawShape = useCallback((ctx, shape, isSelected = false) => {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = shape.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    if (isSelected) {
      // draw purple glow under the stroke for visibility
      ctx.save();
      ctx.lineWidth = shape.width + 4;
      ctx.strokeStyle = "rgba(76,29,149,1)";
      switch (shape.type) {
        case SHAPE_TYPE.LINE:
          ctx.beginPath();
          ctx.moveTo(shape.start.x, shape.start.y);
          ctx.lineTo(shape.end.x, shape.end.y);
          ctx.stroke();
          break;
        case SHAPE_TYPE.RECTANGLE:
          ctx.strokeRect(shape.start.x, shape.start.y, shape.end.x - shape.start.x, shape.end.y - shape.start.y);
          break;
        case SHAPE_TYPE.PEN:
          if (shape.path && shape.path.length > 1) {
            ctx.beginPath();
            ctx.moveTo(shape.path[0].x, shape.path[0].y);
            shape.path.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
          }
          break;
        default:
          break;
      }
      ctx.restore();

      // then draw the actual shape on top
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = shape.width;
    }

    switch (shape.type) {
      case SHAPE_TYPE.LINE:
        ctx.beginPath();
        ctx.moveTo(shape.start.x, shape.start.y);
        ctx.lineTo(shape.end.x, shape.end.y);
        ctx.stroke();
        break;
      case SHAPE_TYPE.RECTANGLE: {
        const x = shape.start.x;
        const y = shape.start.y;
        const width = shape.end.x - shape.start.x;
        const height = shape.end.y - shape.start.y;
        ctx.beginPath();
        ctx.strokeRect(x, y, width, height);
        break;
      }
      case SHAPE_TYPE.PEN:
        if (shape.path && shape.path.length > 1) {
          ctx.beginPath();
          ctx.moveTo(shape.path[0].x, shape.path[0].y);
          shape.path.forEach(p => ctx.lineTo(p.x, p.y));
          ctx.stroke();
        }
        break;
      default:
        break;
    }

    ctx.restore();
  }, []);

  const drawHandles = (ctx, shape) => {
    const handles = getHandlesForShape(shape);
    if (!handles.length) return;
    ctx.save();
    const size = 8;
    handles.forEach(h => {
      ctx.beginPath();
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "rgba(76,29,149,1)";
      ctx.lineWidth = 1.5;
      ctx.rect(h.x - size / 2, h.y - size / 2, size, size);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  };

  // --- Rerender Canvas ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    // clear and reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // apply pan & zoom
    ctx.setTransform(1, 0, 0, 1, offset.x, offset.y);
    ctx.scale(scale, scale);

    // draw non-selected shapes first
    shapes.forEach(shape => {
      if (shape.id !== selectedShapeId) drawShape(ctx, shape, false);
    });

    // draw selected shape last with handles
    const selectedShape = shapes.find(s => s.id === selectedShapeId);
    if (selectedShape) {
      drawShape(ctx, selectedShape, true);
      drawHandles(ctx, selectedShape);
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [shapes, scale, offset, selectedShapeId, drawShape]);

  // Update selected shape style when color/width changes
  useEffect(() => {
    if (!selectedShapeId) return;
    setShapes(prev => {
      const i = prev.findIndex(s => s.id === selectedShapeId);
      if (i === -1) return prev;
      const cur = prev[i];
      if (cur.color === activeColor && cur.width === strokeWidth) return prev;
      const copy = [...prev];
      copy[i] = { ...cur, color: activeColor, width: strokeWidth };
      return copy;
    });
  }, [activeColor, strokeWidth, selectedShapeId]);

  // initialize canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    toast.success('Canvas ready! Local mode active.');
    return () => window.removeEventListener('resize', resize);
  }, []);

  // --- Interaction Logic ---
  const startDrawing = (e) => {
    setIsPointerDown(true);
    const worldPoint = getWorldPoint(e);
    pointerStart.current = worldPoint;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    manipulationMode.current = null;

    if (isPanning) return;

    if (activeTool === 'select') {
      // check handle hit first
      const handle = getHandleUnderCursor(worldPoint);
      // find topmost shape for selection
      const hitShape = shapes.slice().reverse().find(shape => {
        return shape && isPointInShape(worldPoint, shape);
      });

      if (handle && hitShape && hitShape.id === selectedShapeId) {
        // begin resize
        const origShape = JSON.parse(JSON.stringify(hitShape));
        const origBBox = getShapeBBox(origShape);
        manipulationMode.current = { mode: 'resize', dir: handle.dir, origShape, origBBox };
        setIsDrawing(true);
        return;
      }

      if (hitShape) {
        setSelectedShapeId(hitShape.id);
        setIsDrawing(true);
        manipulationMode.current = { mode: 'move' };
        setActiveColor(hitShape.color);
        setStrokeWidth(hitShape.width);
      } else {
        setSelectedShapeId(null);
        setIsDrawing(false);
      }
      return;
    }

    if (activeTool === 'area-select') {
      setSelectedShapeId(null);
      setIsDrawing(true);
      manipulationMode.current = { mode: 'area' };
      return;
    }

    // creation tools
    if (Object.values(SHAPE_TYPE).includes(activeTool) || activeTool.startsWith('brush-')) {
      setSelectedShapeId(null);
      setIsDrawing(true);
      manipulationMode.current = { mode: 'create' };
      const newShape = {
        id: Date.now().toString(),
        type: activeTool,
        color: activeColor,
        width: strokeWidth,
        start: worldPoint,
        end: worldPoint,
      };
      if (activeTool === SHAPE_TYPE.PEN || activeTool.startsWith('brush-')) {
        newShape.type = SHAPE_TYPE.PEN;
        newShape.path = [worldPoint];
      }
      newShapeId.current = newShape.id;
      setShapes(prev => [...prev, newShape]);
    } else {
      setSelectedShapeId(null);
      setIsDrawing(false);
    }
  };

  // point-in-shape simplified
  const isPointInShape = (point, shape) => {
    if (!shape) return false;
    const bbox = getShapeBBox(shape);
    if (!bbox) return false;
    const tol = shape.width + 6;
    return (point.x >= bbox.minX - tol && point.x <= bbox.maxX + tol && point.y >= bbox.minY - tol && point.y <= bbox.maxY + tol);
  };

  const draw = (e) => {
    if (!isPointerDown) return;
    const worldPoint = getWorldPoint(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    // panning
    if (isPanning) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (!isDrawing) return;

    // MOVE
    if (activeTool === 'select' && selectedShapeId && manipulationMode.current && manipulationMode.current.mode === 'move') {
      const dx = worldPoint.x - pointerStart.current.x;
      const dy = worldPoint.y - pointerStart.current.y;
      setShapes(prev => {
        const i = prev.findIndex(s => s.id === selectedShapeId);
        if (i === -1) return prev;
        const newShapes = [...prev];
        const sh = { ...newShapes[i] };
        sh.start = { x: sh.start.x + dx, y: sh.start.y + dy };
        sh.end = { x: sh.end.x + dx, y: sh.end.y + dy };
        if (sh.type === SHAPE_TYPE.PEN && sh.path) {
          sh.path = sh.path.map(p => ({ x: p.x + dx, y: p.y + dy }));
        }
        newShapes[i] = sh;
        pointerStart.current = worldPoint;
        return newShapes;
      });
      return;
    }

    // RESIZE
    if (activeTool === 'select' && selectedShapeId && manipulationMode.current && manipulationMode.current.mode === 'resize') {
      const { dir, origShape, origBBox } = manipulationMode.current;
      if (!origShape || !origBBox) return;

      // compute new bbox based on which handles are moved
      const shapeIndex = shapes.findIndex(s => s.id === selectedShapeId);
      if (shapeIndex === -1) return;

      const newShapes = [...shapes];
      const sh = JSON.parse(JSON.stringify(origShape));

      // We'll compute a new bounding box keeping the opposite corner fixed depending on dir
      let { minX, minY, maxX, maxY } = origBBox;
      // which edges we change
      const changeN = dir.includes('n');
      const changeS = dir.includes('s');
      const changeW = dir.includes('w');
      const changeE = dir.includes('e');

      // Update edges
      if (changeW) minX = worldPoint.x;
      if (changeE) maxX = worldPoint.x;
      if (changeN) minY = worldPoint.y;
      if (changeS) maxY = worldPoint.y;

      // Prevent degenerate boxes by forcing a minimum size
      const minSize = 4;
      if (Math.abs(maxX - minX) < minSize) {
        if (changeW) minX = maxX - minSize; else minX = maxX - minSize;
      }
      if (Math.abs(maxY - minY) < minSize) {
        if (changeN) minY = maxY - minSize; else minY = maxY - minSize;
      }

      // For rectangle/line: set start/end
      if (sh.type === SHAPE_TYPE.RECTANGLE || sh.type === SHAPE_TYPE.LINE) {
        // Normalize start/end so start is top-left and end is bottom-right for storage simplicity
        const newStart = { x: Math.min(minX, maxX), y: Math.min(minY, maxY) };
        const newEnd = { x: Math.max(minX, maxX), y: Math.max(minY, maxY) };
        sh.start = newStart;
        sh.end = newEnd;
      }

      // For pen: scale all points from origBBox to new bbox
      if (sh.type === SHAPE_TYPE.PEN && sh.path && sh.path.length) {
        const ox = origBBox.minX;
        const oy = origBBox.minY;
        const ow = origBBox.width || 1;
        const oh = origBBox.height || 1;
        const nw = Math.max(1, maxX - minX);
        const nh = Math.max(1, maxY - minY);
        const sx = nw / ow;
        const sy = nh / oh;
        const nx = Math.min(minX, maxX);
        const ny = Math.min(minY, maxY);
        sh.path = sh.path.map(p => ({ x: nx + (p.x - ox) * sx, y: ny + (p.y - oy) * sy }));
        // update start/end for bounding box consistency
        sh.start = { x: nx, y: ny };
        sh.end = { x: nx + nw, y: ny + nh };
      }

      newShapes[shapeIndex] = sh;
      setShapes(newShapes);
      return;
    }

    // AREA select skipping here
    if (activeTool === 'area-select') return;

    // CREATE
    if (newShapeId.current && manipulationMode.current && manipulationMode.current.mode === 'create') {
      setShapes(prev => {
        const i = prev.findIndex(s => s.id === newShapeId.current);
        if (i === -1) return prev;
        const newShapes = [...prev];
        const cur = newShapes[i];
        if (cur.type === SHAPE_TYPE.PEN) {
          const last = cur.path[cur.path.length - 1];
          const distSq = (worldPoint.x - last.x) ** 2 + (worldPoint.y - last.y) ** 2;
          if (distSq > 1) cur.path.push(worldPoint);
        } else if (cur.type === SHAPE_TYPE.LINE || cur.type === SHAPE_TYPE.RECTANGLE) {
          cur.end = worldPoint;
        }
        return newShapes;
      });
    }
  };

  const stopDrawing = () => {
    setIsPointerDown(false);
    if (!isDrawing) return;
    setIsDrawing(false);
    newShapeId.current = null;
    manipulationMode.current = null;
  };

  // delete
  const handleDeleteSelectedShape = useCallback(() => {
    if (!selectedShapeId) return;
    setShapes(prev => prev.filter(s => s.id !== selectedShapeId));
    setSelectedShapeId(null);
    toast.success('Shape deleted! 🗑️');
  }, [selectedShapeId]);

  useEffect(() => {
    const handleDeleteKey = (e) => {
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) return;
      if (selectedShapeId && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        handleDeleteSelectedShape();
      }
    };
    window.addEventListener('keydown', handleDeleteKey);
    return () => window.removeEventListener('keydown', handleDeleteKey);
  }, [selectedShapeId, handleDeleteSelectedShape]);

  const handleJoinRoom = () => { };
  const handleExitRoom = () => { };

  // cursor logic: prefer hovered handle
  const getCursor = () => {
    if (isPanning) return isPointerDown ? 'cursor-grabbing' : 'cursor-grab';
    if (hoveredHandle) {
      const dir = hoveredHandle.dir;
      if (dir === 'n' || dir === 's') return 'ns-resize';
      if (dir === 'e' || dir === 'w') return 'ew-resize';
      if (dir === 'ne' || dir === 'sw') return 'nesw-resize';
      if (dir === 'nw' || dir === 'se') return 'nwse-resize';
    }
    if (activeTool === 'select' || activeTool === 'area-select') return 'cursor-default';
    return 'cursor-crosshair';
  };

  // track hovered handle on mouse move (when not dragging)
  const onPointerMove = (e) => {
    if (isPointerDown) return; // dragging handled in draw
    const worldPoint = getWorldPoint(e);
    const h = getHandleUnderCursor(worldPoint);
    if (h) setHoveredHandle(h); else setHoveredHandle(null);
  };

  const handleToolChange = (tool) => {
    setActiveTool(tool);
    if (tool === 'select' || tool === 'area-select') {
      toast.info(`${tool === 'select' ? 'Select/Move' : 'Area Select'} tool active`);
    } else {
      setSelectedShapeId(null);
      toast.info(`${tool.charAt(0).toUpperCase() + tool.slice(1)} tool selected`);
    }
  };

  const handleClear = () => {
    setShapes([]);
    setSelectedShapeId(null);
    toast.success('Canvas cleared! 🧹');
  };

  const handleExport = (format) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    switch (format) {
      case "png": {
        const link = document.createElement("a");
        link.download = "canvas.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
        break;
      }

      case "pdf": {
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "px",
          format: [canvas.width, canvas.height],
        });
        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
        pdf.save("canvas.pdf");
        break;
      }

      case "svg": {
        const svgCtx = new C2S(canvas.width, canvas.height);
        const svgData = svgCtx.getSerializedSvg();
        const blob = new Blob([svgData], { type: "image/svg+xml" });
        const link = document.createElement("a");
        link.download = "canvas.svg";
        link.href = URL.createObjectURL(blob);
        link.click();
        break;
      }

      default:
        console.warn("Unsupported format:", format);
    }
  };


  return (
    <div className="relative w-full h-screen overflow-hidden bg-canvas">
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
      <Toolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        onClear={handleClear}
        onExport={handleExport}
      />

      {joined ? (
        <button onClick={() => handleExitRoom()} className="fixed top-4 right-4 bg-red-700 text-white px-4 py-2 rounded-lg shadow hover:bg-red-800 z-50">Exit Room</button>
      ) : (
        <button onClick={() => setIsModalOpen(true)} className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 z-50">Collaborate</button>
      )}

      <ColorPicker activeColor={activeColor} onColorChange={setActiveColor} />
      <StrokeControl strokeWidth={strokeWidth} onStrokeWidthChange={setStrokeWidth} />

      {selectedShapeId && (
        <button onClick={handleDeleteSelectedShape} className="fixed bottom-4 right-1/2 translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow hover:bg-red-600 z-50">Delete Selected Shape</button>
      )}

      <canvas
        ref={canvasRef}
        tabIndex={0}
        onFocus={() => setIsCanvasFocused(true)}
        onBlur={() => setIsCanvasFocused(false)}
        onMouseDown={startDrawing}
        onMouseMove={(e) => { onPointerMove(e); draw(e); }}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onWheel={(e) => {
          e.preventDefault(); const handler = e; /* reuse handleWheel? kept inline for brevity */
          // simple zoom behavior: ctrl+wheel maybe
          const zoomSensitivity = 0.001;
          const scrollDelta = e.deltaY;
          const scaleFactor = 1 - scrollDelta * zoomSensitivity;
          let newScale = scale * scaleFactor;
          newScale = Math.max(0.1, Math.min(5, newScale));
          const rect = canvasRef.current.getBoundingClientRect();
          const screenX = e.clientX - rect.left;
          const screenY = e.clientY - rect.top;
          const worldX = (screenX - offset.x) / scale;
          const worldY = (screenY - offset.y) / scale;
          const newOffsetX = screenX - worldX * newScale;
          const newOffsetY = screenY - worldY * newScale;
          setScale(newScale);
          setOffset({ x: newOffsetX, y: newOffsetY });
        }}
        className={`${getCursor()} focus:outline-2 focus:outline-primary`}
      />

      {isModalOpen && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 border border-gray-400 rounded-xl shadow-xl p-6 z-50 flex flex-col items-center gap-3">
          <h2 className="text-xl font-semibold">Join a Room</h2>
          <input type="text" placeholder="Enter Room ID" value={roomId} onChange={(e) => setRoomId(e.target.value)} className="border border-gray-400 rounded-md px-4 py-2 w-64 text-center" />
          <button onClick={handleJoinRoom} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">Join Room</button>
          <button onClick={() => setIsModalOpen(false)} className="text-sm text-gray-600 mt-2 hover:underline">Cancel</button>
        </div>
      )}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="bg-toolbar/95 border border-toolbar-border rounded-xl shadow-lg backdrop-blur-sm px-6 py-3">
          <p className="text-sm text-foreground font-medium">{joined ? `Connected to Room: ${roomId}` : 'Local mode - your drawings are not shared.'}</p>
        </div>
      </div>
    </div>
  );
};
