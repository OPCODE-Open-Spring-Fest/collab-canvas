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
  CIRCLE: "circle",
  ERASER: "eraser",
  IMAGE: 'image',
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

const handleImageUpload = (file) => {
  if (!file) return; 
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const newShape = {
        id: Date.now().toString(),
        type: SHAPE_TYPE.IMAGE,
        image: img,
        start: { x: 100, y: 100 },
        end: { x: 100 + img.width, y: 100 + img.height },
        width: img.width,
        height: img.height,
      };
      setShapes((prev) => [...prev, newShape]);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
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

  // small deterministic PRNG (mulberry32) so brush textures are stable across renders
  const mulberry32 = (seed) => {
    let t = seed >>> 0;
    return () => {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  };

  // Compute bounding box for a shape (world coords)
 const getShapeBBox = useCallback((shape) => {
  if (!shape) return null;

  if (shape.type === SHAPE_TYPE.RECTANGLE || shape.type === SHAPE_TYPE.LINE) {
    const minX = Math.min(shape.start.x, shape.end.x);
    const maxX = Math.max(shape.start.x, shape.end.x);
    const minY = Math.min(shape.start.y, shape.end.y);
    const maxY = Math.max(shape.start.y, shape.end.y);
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }

  if (shape.type === SHAPE_TYPE.CIRCLE) {
    const r = Math.max(shape.radius || 0, 0);
    const minX = shape.start.x - r;
    const maxX = shape.start.x + r;
    const minY = shape.start.y - r;
    const maxY = shape.start.y + r;
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }

  if (shape.type === SHAPE_TYPE.PEN && shape.path && shape.path.length) {
    const minX = Math.min(...shape.path.map(p => p.x));
    const maxX = Math.max(...shape.path.map(p => p.x));
    const minY = Math.min(...shape.path.map(p => p.y));
    const maxY = Math.max(...shape.path.map(p => p.y));
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }
  if (shape.type === SHAPE_TYPE.IMAGE) {
  const minX = Math.min(shape.start.x, shape.end.x);
  const maxX = Math.max(shape.start.x, shape.end.x);
  const minY = Math.min(shape.start.y, shape.end.y);
  const maxY = Math.max(shape.start.y, shape.end.y);
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}


  return null;
}, []);


  // Returns array of handle objects: { x, y, dir }
  const getHandlesForShape = useCallback(
    (shape) => {
      const bbox = getShapeBBox(shape);
      if (!bbox) return [];
      const { minX, minY, maxX, maxY } = bbox;
      return [
        { x: minX, y: minY, dir: "nw" },
        { x: (minX + maxX) / 2, y: minY, dir: "n" },
        { x: maxX, y: minY, dir: "ne" },
        { x: maxX, y: (minY + maxY) / 2, dir: "e" },
        { x: maxX, y: maxY, dir: "se" },
        { x: (minX + maxX) / 2, y: maxY, dir: "s" },
        { x: minX, y: maxY, dir: "sw" },
        { x: minX, y: (minY + maxY) / 2, dir: "w" },
      ];
    },
    [getShapeBBox]
  );

  const handleHitTest = (point, handle, size = 8) => {
    return Math.abs(point.x - handle.x) <= size / 2 && Math.abs(point.y - handle.y) <= size / 2;
  };

  const getHandleUnderCursor = (point) => {
    if (!selectedShapeId) return null;
    const shape = shapes.find((s) => s.id === selectedShapeId);
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
    ctx.lineWidth = shape.type === SHAPE_TYPE.IMAGE ? 4 : shape.width + 4;
    ctx.strokeStyle = "rgba(76,29,149,1)";
    switch (shape.type) {
      case SHAPE_TYPE.LINE:
        ctx.beginPath();
        ctx.moveTo(shape.start.x, shape.start.y);
        ctx.lineTo(shape.end.x, shape.end.y);
        ctx.stroke();
        break;
      case SHAPE_TYPE.RECTANGLE:
        ctx.strokeRect(
          shape.start.x,
          shape.start.y,
          shape.end.x - shape.start.x,
          shape.end.y - shape.start.y
        );
        break;
      case SHAPE_TYPE.CIRCLE:
        ctx.beginPath();
        ctx.arc(shape.start.x, shape.start.y, shape.radius || 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case SHAPE_TYPE.PEN:
        if (shape.path && shape.path.length > 1) {
          ctx.beginPath();
          ctx.moveTo(shape.path[0].x, shape.path[0].y);
          shape.path.forEach((p) => ctx.lineTo(p.x, p.y));
          ctx.stroke();
        }
        break;
        case SHAPE_TYPE.ERASER:
  if (shape.path && shape.path.length > 1) {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out"; 
    ctx.lineWidth = shape.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.beginPath();
    ctx.moveTo(shape.path[0].x, shape.path[0].y);
    shape.path.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
    ctx.restore();
  }
  break;

      default:
        break;
    }
    ctx.restore();

      // then draw the actual shape on top
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = shape.type === SHAPE_TYPE.IMAGE ? 1 : shape.width;
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

    case SHAPE_TYPE.CIRCLE: {
      const r = Math.max(shape.radius || 0, 0);
      ctx.beginPath();
      ctx.arc(shape.start.x, shape.start.y, r, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case SHAPE_TYPE.PEN:
      if (shape.path && shape.path.length > 1) {
        const brush = shape.brush || "solid";

        const drawPath = (offsetJitter = 0) => {
          ctx.beginPath();
          ctx.moveTo(
            shape.path[0].x + (Math.random() - 0.5) * offsetJitter,
            shape.path[0].y + (Math.random() - 0.5) * offsetJitter
          );
          shape.path.forEach((p) =>
            ctx.lineTo(
              p.x + (Math.random() - 0.5) * offsetJitter,
              p.y + (Math.random() - 0.5) * offsetJitter
            )
          );
          ctx.stroke();
        };

        // Reset brush states
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        if (brush === "dashed") {
          const base = Math.max(4, shape.width * 3);
          const dash = Math.round(base);
          const gap = Math.round(base * 0.6);
          ctx.setLineDash([dash, gap]);
          ctx.lineWidth = shape.width;
          ctx.strokeStyle = shape.color;
          drawPath(0);
          ctx.setLineDash([]);
        } else if (brush === "paint") {
           ctx.lineCap = "round";
            ctx.lineJoin = "round";
          const baseWidth = Math.max(shape.width, 1.5);
          const layers = 8;

          for (let i = 0; i < layers; i++) {
            const opacity = 0.18 + Math.random() * 0.12;
            const color = tinycolor(shape.color)
              .brighten((Math.random() - 0.5) * 2.5)
              .setAlpha(opacity)
              .toRgbString();

            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.9;
            const widthFactor = baseWidth < 4 ? 3.8 : 2.2;
            ctx.lineWidth = baseWidth * (widthFactor + i * 0.2);

            drawPath(0);
          }

          ctx.globalAlpha = 0.25;
          ctx.lineWidth = baseWidth * (baseWidth < 4 ? 4.8 : 3.2);
          ctx.strokeStyle = tinycolor(shape.color)
            .lighten(3)
            .setAlpha(0.25)
            .toRgbString();
          drawPath(0);

          ctx.globalAlpha = 0.95;
          ctx.lineWidth = baseWidth * (baseWidth < 4 ? 3.4 : 2.4);
          ctx.strokeStyle = shape.color;
          drawPath(0);

            ctx.globalAlpha = 1;
            ctx.lineWidth = shape.width;
          } else if (brush === "crayon") {
            const pts = shape.path;
            if (pts.length >= 2) {
              ctx.save();
              ctx.globalCompositeOperation = 'source-over';
              ctx.save();
              ctx.globalAlpha = 0.72; // slightly translucent base
              ctx.lineWidth = Math.max(1, shape.width * 1.6);
              ctx.strokeStyle = tinycolor(shape.color).setAlpha(0.6).toRgbString();
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.shadowBlur = Math.max(1, shape.width * 0.9);
              ctx.shadowColor = tinycolor(shape.color).setAlpha(0.35).toRgbString();
              ctx.beginPath();
              ctx.moveTo(pts[0].x, pts[0].y);
              for (let i = 1; i < pts.length; i++) {
                const prev = pts[i - 1];
                const cur = pts[i];
                const midX = (prev.x + cur.x) / 2;
                const midY = (prev.y + cur.y) / 2;
                ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
              }
              ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
              ctx.stroke();
              ctx.restore();
              const scatterAlongSegment = (x0, y0, x1, y1, segIndex) => {
                const dx = x1 - x0;
                const dy = y1 - y0;
                const dist = Math.hypot(dx, dy);
                const step = Math.max(2, Math.floor(dist / Math.max(2, shape.width)));
                const rngSeg = mulberry32((shape._seed || 1) ^ (segIndex + 1));
                for (let s = 0; s < step; s++) {
                  const t = s / step;
                  const cx = x0 + dx * t;
                  const cy = y0 + dy * t;

                  const speckles = 1 + Math.round(shape.width * 0.6);
                  for (let k = 0; k < speckles; k++) {
                    const ox = (rngSeg() - 0.5) * shape.width * 1.8;
                    const oy = (rngSeg() - 0.5) * shape.width * 1.8;
                    const r = Math.max(0.4, rngSeg() * (shape.width * 0.6));
                    const alpha = 0.04 + rngSeg() * 0.18;
                    ctx.beginPath();
                    ctx.fillStyle = tinycolor(shape.color).setAlpha(alpha).toRgbString();
                    ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2);
                    ctx.fill();
                  }
                }
              };

              for (let i = 0; i < pts.length - 1; i++) {
                const a = pts[i];
                const b = pts[i + 1];
                scatterAlongSegment(a.x, a.y, b.x, b.y, i);
              }

              for (let g = 0; g < 2; g++) {
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = tinycolor(shape.color).darken(8 - g * 2).toRgbString();
                for (let i = 0; i < pts.length - 1; i++) {
                  const a = pts[i];
                  const b = pts[i + 1];
                  const rngG = mulberry32((shape._seed || 1) ^ (i + 1) ^ (g + 3));
                  const midx = (a.x + b.x) / 2 + (rngG() - 0.5) * shape.width * 0.6;
                  const midy = (a.y + b.y) / 2 + (rngG() - 0.5) * shape.width * 0.6;
                  const r = Math.max(0.6, rngG() * (shape.width * 0.9));
                  ctx.beginPath();
                  ctx.arc(midx, midy, r, 0, Math.PI * 2);
                  ctx.fill();
                }
              }

              ctx.globalAlpha = 0.9;
              ctx.lineWidth = Math.max(1, shape.width * 0.85);
              ctx.strokeStyle = tinycolor(shape.color).darken(6).toRgbString();
              ctx.beginPath();
              ctx.moveTo(pts[0].x, pts[0].y);
              for (let i = 1; i < pts.length; i++) {
                const prev = pts[i - 1];
                const cur = pts[i];
                const midX = (prev.x + cur.x) / 2;
                const midY = (prev.y + cur.y) / 2;
                ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
              }
              const last = pts[pts.length - 1];
              ctx.lineTo(last.x, last.y);
              ctx.stroke();

              ctx.globalAlpha = 0.08;
              ctx.lineWidth = Math.max(1, shape.width * 1.6);
              ctx.strokeStyle = tinycolor(shape.color).lighten(6).toRgbString();
              ctx.beginPath();
              ctx.moveTo(pts[0].x, pts[0].y);
              for (let i = 1; i < pts.length; i++) {
                const prev = pts[i - 1];
                const cur = pts[i];
                const midX = (prev.x + cur.x) / 2;
                const midY = (prev.y + cur.y) / 2;
                ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
              }
              ctx.lineTo(last.x, last.y);
              ctx.stroke();

              ctx.restore();
            }
            ctx.globalAlpha = 1;
            ctx.lineWidth = shape.width;
            ctx.strokeStyle = shape.color;
          } else if (brush === "oil-pastel") {
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            const baseWidth = Math.max(shape.width, 2);
            const seed = shape._seed || 1; // use shape seed for consistent randomness
            const rng = mulberry32(seed);

            for (let layer = 0; layer < 6; layer++) {
              const variation = (rng() - 0.5) * 10;
              const opacity = 0.12 + rng() * 0.1;
              const pastelColor = tinycolor(shape.color)
                .brighten(variation)
                .setAlpha(opacity)
                .toRgbString();

              ctx.strokeStyle = pastelColor;
              ctx.lineWidth = baseWidth * (1.2 + rng() * 0.6);

              ctx.beginPath();
              for (let i = 0; i < shape.path.length - 1; i++) {
                const p1 = shape.path[i];
                const p2 = shape.path[i + 1];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const steps = Math.ceil(Math.hypot(dx, dy) / 1.5);

                const segRng = mulberry32(seed ^ (layer * 999 + i * 31));

                for (let s = 0; s < steps; s++) {
                  const t = s / steps;
                  const x = p1.x + dx * t + (segRng() - 0.5) * 2.5;
                  const y = p1.y + dy * t + (segRng() - 0.5) * 2.5;

                  if (segRng() > 0.2) {
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + 0.3, y + 0.3);
                  }
                }
              }
              ctx.stroke();
            }

            ctx.strokeStyle = tinycolor(shape.color).darken(12).setAlpha(0.25).toRgbString();
            ctx.lineWidth = baseWidth * 1.8;
            ctx.globalAlpha = 0.9;
            drawPath(0);
            ctx.globalAlpha = 0.7;
            ctx.lineWidth = baseWidth * 2.2;
            ctx.strokeStyle = tinycolor(shape.color).setAlpha(0.25).toRgbString();
            drawPath(0);

            ctx.globalAlpha = 1;
            ctx.lineWidth = shape.width;
          } else {
            //default(solid)
            ctx.lineWidth = shape.width;
            ctx.strokeStyle = shape.color;
            ctx.setLineDash([]);
            drawPath(0);
          }
          ctx.setLineDash([]);
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
        break;
         case SHAPE_TYPE.IMAGE: {
      const { image, start, end } = shape;
      if (image) {
        const width = end.x - start.x;
        const height = end.y - start.y;
        ctx.drawImage(image, start.x, start.y, width, height);
      }
      break;
    }
      default:
        break;
    }

    ctx.restore();
  }, []);

  const drawHandles = useCallback((ctx, shape) => {
    const handles = getHandlesForShape(shape);
    if (!handles.length) return;
    ctx.save();
    const size = 8;
    handles.forEach((h) => {
      ctx.beginPath();
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "rgba(76,29,149,1)";
      ctx.lineWidth = 1.5;
      ctx.rect(h.x - size / 2, h.y - size / 2, size, size);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }, [getHandlesForShape]);

  // --- Rerender Canvas ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

  // clear and reset transform
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // apply pan & zoom
  ctx.setTransform(1, 0, 0, 1, offset.x, offset.y);
    ctx.scale(scale, scale);

    // draw non-selected shapes first
    shapes.forEach((shape) => {
      if (shape.id !== selectedShapeId) drawShape(ctx, shape, false);
    });

    // draw selected shape last with handles
    const selectedShape = shapes.find((s) => s.id === selectedShapeId);
    if (selectedShape) {
      drawShape(ctx, selectedShape, true);
      drawHandles(ctx, selectedShape);
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [shapes, scale, offset, selectedShapeId, drawShape, drawHandles]);

  // Update selected shape style when color/width changes
  useEffect(() => {
    if (!selectedShapeId) return;
    setShapes((prev) => {
      const i = prev.findIndex((s) => s.id === selectedShapeId);
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
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    toast.success("Canvas ready! Local mode active.");
    return () => window.removeEventListener("resize", resize);
  }, []);

  // --- Interaction Logic ---
  const startDrawing = (e) => {
    setIsPointerDown(true);
    const worldPoint = getWorldPoint(e);
    pointerStart.current = worldPoint;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    manipulationMode.current = null;

    if (isPanning) return;

    if (activeTool === "select") {
      // check handle hit first
      const handle = getHandleUnderCursor(worldPoint);
      // find topmost shape for selection
      const hitShape = shapes.slice().reverse().find((shape) => {
        return shape && isPointInShape(worldPoint, shape);
      });

      if (handle && hitShape && hitShape.id === selectedShapeId) {
        // begin resize
        const origShape = JSON.parse(JSON.stringify(hitShape));
        if (hitShape.type === SHAPE_TYPE.IMAGE) origShape.image = hitShape.image;
        const origBBox = getShapeBBox(origShape);
        manipulationMode.current = { mode: 'resize', dir: handle.dir, origShape, origBBox };
        setIsDrawing(true);
        return;
      }

      if (hitShape) {
        try {
          const _ctx = canvasRef.current?.getContext('2d');
          if (_ctx) {
            _ctx.globalCompositeOperation = 'source-over';
            _ctx.globalAlpha = 1;
            _ctx.shadowBlur = 0;
          }
        } catch (err) {
          console.debug('[canvas] composite reset failed', err);
        }
        setSelectedShapeId(hitShape.id);
        setIsDrawing(true);
        manipulationMode.current = { mode: "pending-move" };
        setActiveColor(hitShape.color);
        if (hitShape.type === SHAPE_TYPE.PEN) setStrokeWidth(hitShape.width);
      } else {
        setSelectedShapeId(null);
        setIsDrawing(false);
      }
      return;
    }

    if (activeTool === "area-select") {
      setSelectedShapeId(null);
      setIsDrawing(true);
      manipulationMode.current = { mode: "area" };
      return;
    }
  if (activeTool === SHAPE_TYPE.ERASER) {
  setIsDrawing(true);
  manipulationMode.current = { mode: "erase" };
  const ctx = canvasRef.current.getContext("2d");
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.lineWidth = strokeWidth * 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  const { x, y } = getWorldPoint(e);
  ctx.moveTo(x, y);
  ctx.restore();
  return;
}


    // creation tools
if ((Object.values(SHAPE_TYPE).includes(activeTool) || activeTool.startsWith('brush-')) && activeTool !== SHAPE_TYPE.IMAGE) {
      setSelectedShapeId(null);
      setIsDrawing(true);
      manipulationMode.current = { mode: "create" };
      const brushType = activeTool.startsWith("brush-")
        ? activeTool.slice("brush-".length)
        : undefined;
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
        newShape.brush = brushType || "solid";
        newShape._seed = Math.floor(Math.random() * 0xffffffff);
      }
      if (activeTool === SHAPE_TYPE.IMAGE) {
  const hitShape = shapes.slice().reverse().find((shape) => isPointInShape(worldPoint, shape));
  if (hitShape && hitShape.type === SHAPE_TYPE.IMAGE) {
    // Just select, don't draw a new one
    setSelectedShapeId(hitShape.id);
    setIsDrawing(false);
    return;
  }
}
      if (activeTool === SHAPE_TYPE.CIRCLE) {
      newShape.radius = 0;
    }
      newShapeId.current = newShape.id;
      setShapes((prev) => [...prev, newShape]);
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
    const tol = shape.type === SHAPE_TYPE.IMAGE ? 8 : (shape.width || 0) + 6;
    return (
      point.x >= bbox.minX - tol &&
      point.x <= bbox.maxX + tol &&
      point.y >= bbox.minY - tol &&
      point.y <= bbox.maxY + tol
    );
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
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }

  if (!isDrawing) return;
    if (
      activeTool === 'select' &&
      selectedShapeId &&
      manipulationMode.current &&
      manipulationMode.current.mode === 'pending-move'
    ) {
      const dx0 = worldPoint.x - pointerStart.current.x;
      const dy0 = worldPoint.y - pointerStart.current.y;
      const distSq0 = dx0 * dx0 + dy0 * dy0;
      const threshold = 4 * 4; // squared threshold in world coords
      if (distSq0 > threshold) {
        // begin move: set pointerStart so subsequent deltas work from here
        manipulationMode.current.mode = 'move';
        pointerStart.current = worldPoint;
      } else {
        return;
      }
    }

    // MOVE
    if (activeTool === 'select' && selectedShapeId && manipulationMode.current && manipulationMode.current.mode === 'move') {
      const dx = worldPoint.x - pointerStart.current.x;
      const dy = worldPoint.y - pointerStart.current.y;
      setShapes((prev) => {
        const i = prev.findIndex((s) => s.id === selectedShapeId);
        if (i === -1) return prev;
        const newShapes = [...prev];
        const sh = { ...newShapes[i] };
        sh.start = { x: sh.start.x + dx, y: sh.start.y + dy };
        sh.end = { x: sh.end.x + dx, y: sh.end.y + dy };
        if (sh.type === SHAPE_TYPE.PEN && sh.path) {
          sh.path = sh.path.map((p) => ({ x: p.x + dx, y: p.y + dy }));
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
      const shapeIndex = shapes.findIndex((s) => s.id === selectedShapeId);
      if (shapeIndex === -1) return;

  const newShapes = [...shapes];
  const sh = JSON.parse(JSON.stringify(origShape));
  if (origShape && origShape.type === SHAPE_TYPE.IMAGE) sh.image = origShape.image;

      // We'll compute a new bounding box keeping the opposite corner fixed depending on dir
      let { minX, minY, maxX, maxY } = origBBox;
      // which edges we change
      const changeN = dir.includes("n");
      const changeS = dir.includes("s");
      const changeW = dir.includes("w");
      const changeE = dir.includes("e");

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
      if (sh.type === SHAPE_TYPE.CIRCLE) {
      // Resize based on bounding box change
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const newRadius = Math.max(
        Math.abs(maxX - minX),
        Math.abs(maxY - minY)
      ) / 2;

      sh.start = { x: cx, y: cy };
      sh.radius = newRadius;
      sh.end = { x: cx + newRadius, y: cy }; // optional
    }
      newShapes[shapeIndex] = sh;
      setShapes(newShapes);
      return;
    }

    // AREA select skipping here
    if (activeTool === 'area-select') return;
    if (manipulationMode.current?.mode === "erase") {
  const ctx = canvasRef.current.getContext("2d");
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.lineWidth = strokeWidth * 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const { x, y } = getWorldPoint(e);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.restore();
  return;
}



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
        else if (cur.type === SHAPE_TYPE.CIRCLE) {
        // Circle creation: start = center, drag defines radius
        const dx = worldPoint.x - cur.start.x;
        const dy = worldPoint.y - cur.start.y;
        const r = Math.sqrt(dx * dx + dy * dy);
        cur.radius = r;
        cur.end = worldPoint; // optional for reference
      }

        return newShapes;
      });
    }
  };

  const stopDrawing = () => {
    setIsPointerDown(false);
    if (!isDrawing) return;
    setIsDrawing(false);
    const prevMode = manipulationMode.current?.mode;
    newShapeId.current = null;
    manipulationMode.current = null;
    if (prevMode === "erase") {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) ctx.globalCompositeOperation = "source-over";
    }

};

  // delete
  const handleDeleteSelectedShape = useCallback(() => {
    if (!selectedShapeId) return;
    setShapes((prev) => prev.filter((s) => s.id !== selectedShapeId));
    setSelectedShapeId(null);
    toast.success("Shape deleted! 🗑️");
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
    window.addEventListener("keydown", handleDeleteKey);
    return () => window.removeEventListener("keydown", handleDeleteKey);
  }, [selectedShapeId, handleDeleteSelectedShape]);

  const handleJoinRoom = () => { };
  const handleExitRoom = () => { };

  // cursor logic: prefer hovered handle
  const getCursor = () => {
    if (isPanning) return isPointerDown ? "cursor-grabbing" : "cursor-grab";
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
  useEffect(() => {
    const handleGlobalWheel = (e) => {
      // Block browser zoom if user scrolls with Ctrl/Cmd + trackpad
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", handleGlobalWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleGlobalWheel);
    };
  }, []);

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
        onImageUpload={handleImageUpload}
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
          e.preventDefault();
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
