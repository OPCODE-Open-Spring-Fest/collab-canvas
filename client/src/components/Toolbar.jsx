import { MousePointer2, Pen, Eraser, Square, Circle, Minus, Trash2 } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./ui/Button";
import { Separator } from "./ui/Separator";

export const Toolbar = ({ activeTool, onToolChange, onClear }) => {
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
            <div className="bg-white/95 border border-gray-200/50 rounded-2xl shadow-xl backdrop-blur-md p-3 flex items-center gap-1 animate-float">
                {tools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                        <Button
                            key={tool.type}
                            variant="ghost"
                            size="icon"
                            onClick={() => onToolChange(tool.type)}
                            className={cn(
                                "h-11 w-11 transition-all duration-200 hover:bg-gray-100 rounded-xl",
                                activeTool === tool.type && "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg"
                            )}
                            aria-label={tool.type}
                        >
                            <Icon className="h-5 w-5" />
                        </Button>
                    );
                })}

                <Separator orientation="vertical" className="h-8 mx-2 bg-gray-200" />

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClear}
                    className="h-11 w-11 transition-all duration-200 hover:bg-red-50 hover:text-red-600 rounded-xl"
                    aria-label="Clear canvas"
                >
                    <Trash2 className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
};
