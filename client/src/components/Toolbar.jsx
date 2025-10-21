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
} from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./ui/Button";
import { Separator } from "./ui/Separator";
import { DropdownMenu, DropdownMenuItem } from "./ui/DropdownMenu";

export const Toolbar = ({ activeTool, onToolChange, onClear, onExport }) => {
  const tools = [
    { type: "select", icon: MousePointer2 },
    { type: "pen", icon: Pen },
    { type: "eraser", icon: Eraser },
    { type: "rectangle", icon: Square },
    { type: "circle", icon: Circle },
    { type: "line", icon: Minus },
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
                "h-10 w-10 transition-all duration-200 hover:bg-secondary",
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

        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          className="h-10 w-10 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
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
              className="h-10 w-10 transition-all duration-200 hover:bg-secondary"
              aria-label="Export canvas"
            >
              <Download className="h-5 w-5" />
            </Button>
          }
        >
          <DropdownMenuItem onClick={() => onExport("png")}>
            <FileImage className="h-4 w-4" />
            Export as PNG
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport("svg")}>
            <FileType className="h-4 w-4" />
            Export as SVG
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport("pdf")}>
            <FileType className="h-4 w-4" />
            Export as PDF
          </DropdownMenuItem>
        </DropdownMenu>
      </div>
    </div>
  );
};
