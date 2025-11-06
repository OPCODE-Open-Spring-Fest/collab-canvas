import {
  MousePointer2,
  Pen,
  Eraser,
  Square,
  Circle,
  Minus,
  Trash2,
  Download,
  FileImage,
  FileType,
  Brush,
  SquareDashed, // New import for the area select tool
  ImagePlus,
  Type
} from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./ui/Button";
import { Separator } from "./ui/Separator";
import { DropdownMenu, DropdownMenuItem } from "./ui/DropdownMenu";
import { useRef } from "react";

export const Toolbar = ({
  activeTool,
  onToolChange,
  onClear,
  onExport,
  onImageUpload, 
}) => {
  const imageInputRef = useRef(null);

  const tools = [
    { type: "select", icon: MousePointer2 },
    { type: "area-select", icon: SquareDashed }, // New Area Select Tool
    {type:"text",icon:Type},
    { type: "pen", icon: Pen },
    { type: "eraser", icon: Eraser },
    { type: "rectangle", icon: Square },
    { type: "circle", icon: Circle },
    { type: "line", icon: Minus },
  ];

  const handleExport = (format) => {
    onExport(format);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      onImageUpload(file); 
    }
  };

  const brushTypes = [
    {
      id: "solid",
      label: "Solid",
      preview: <div className="w-10 h-1 bg-black rounded-full"></div>,
    },
    {
      id: "dashed",
      label: "Dashed",
      preview: (
        <div className="w-10 h-1 border-b-2 border-dashed border-black"></div>
      ),
    },
    {
      id: "paint",
      label: "Paint",
      preview: (
        <div className="w-10 h-2 bg-gradient-to-r from-blue-500 to-pink-500 rounded-full opacity-80 blur-[1px]"></div>
      ),
    },
    {
      id: "crayon",
      label: "Crayon",
      preview: (
        <div className="w-10 h-1 bg-black/70 rounded-sm shadow-[0_0_3px_1px_rgba(0,0,0,0.3)]"></div>
      ),
    },
    {
      id: "oil-pastel",
      label: "Oil Pastel",
      preview: (
        <div className="w-10 h-2 bg-gradient-to-r from-yellow-400 via-red-400 to-purple-400 rounded-full blur-[0.5px] opacity-90"></div>
      ),
    },
  ];

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-toolbar border border-toolbar-border rounded-2xl shadow-xl backdrop-blur-sm p-2 flex items-center gap-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Button
              key={tool.type}
              variant="ghost"
              size="icon"
              onClick={() => onToolChange(tool.type)}
              className={cn(
                "h-10 w-10 transition-all duration-200 hover:bg-secondary active:scale-95",
                activeTool === tool.type
                  ? "bg-primary text-primary-foreground ring-2 ring-offset-2 ring-primary"
                  : ""
              )}
              aria-label={tool.type}
            >
              <Icon className="h-5 w-5" />
            </Button>
          );
        })}

        <Separator orientation="vertical" className="h-8 mx-1" />
        <DropdownMenu
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 transition-all duration-200 hover:bg-secondary active:scale-95",
                activeTool.startsWith("brush-")
                  ? "bg-primary text-primary-foreground ring-2 ring-offset-2 ring-primary"
                  : ""
              )}
              aria-label="Brush tool"
            >
              <Brush className="h-5 w-5" />
            </Button>
          }
        >
          {brushTypes.map((brush) => (
            <DropdownMenuItem
              key={brush.id}
              onClick={() => onToolChange(`brush-${brush.id}`)}
              className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 rounded-md px-2 py-1"
            >
              {brush.preview}
              <span className="capitalize">{brush.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenu>

        <Separator orientation="vertical" className="h-8 mx-1" />
        <input
          type="file"
          accept="image/*"
          ref={imageInputRef}
          style={{ display: "none" }}
          onChange={handleImageSelect}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => imageInputRef.current?.click()}
          className="h-10 w-10 transition-all duration-200 hover:bg-secondary active:scale-95"
          aria-label="Upload image"
        >
          <ImagePlus className="h-5 w-5" />
        </Button>

        <Separator orientation="vertical" className="h-8 mx-1" />

        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          className="h-10 w-10 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive active:scale-95"
          aria-label="Clear canvas"
        >
          <Trash2 className="h-5 w-5" />
        </Button>

        <Separator orientation="vertical" className="h-8 mx-1" />

        <DropdownMenu
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 transition-all duration-200 hover:bg-secondary active:scale-95"
              aria-label="Export canvas"
            >
              <Download className="h-5 w-5" />
            </Button>
          }
        >
          <DropdownMenuItem onClick={() => handleExport("png")}>
            <FileImage className="h-4 w-4" />
            Export as PNG
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("svg")}>
            <FileType className="h-4 w-4" />
            Export as SVG
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("pdf")}>
            <FileType className="h-4 w-4" />
            Export as PDF
          </DropdownMenuItem>
        </DropdownMenu>
      </div>
    </div>
  );
};