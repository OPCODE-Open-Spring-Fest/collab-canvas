import { Check } from "lucide-react";
import { cn } from "../lib/utils";

const colors = [
    { value: "#000000" },
    { value: "#6366F1" },
    { value: "#8B5CF6" },
    { value: "#EC4899" },
    { value: "#EF4444" },
    { value: "#F97316" },
    { value: "#EAB308" },
    { value: "#22C55E" },
    { value: "#3B82F6" },
    { value: "#06B6D4" },
];

export const ColorPicker = ({ activeColor, onColorChange }) => {
    return (
        <div className="fixed left-6 top-1/2 -translate-y-1/2 z-50">
            <div className="bg-white/95 border border-gray-200/50 rounded-2xl shadow-xl backdrop-blur-md p-4 flex flex-col gap-3 animate-float">
                <div className="text-xs font-semibold text-gray-600 text-center mb-1">Colors</div>
                {colors.map((color) => (
                    <button
                        key={color.value}
                        onClick={() => onColorChange(color.value)}
                        className={cn(
                            "h-12 w-12 rounded-xl transition-all duration-200 hover:scale-110 relative shadow-md hover:shadow-lg",
                            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                            activeColor === color.value && "ring-2 ring-gray-400 ring-offset-2 scale-105"
                        )}
                        style={{ backgroundColor: color.value }}
                        aria-label={`Color ${color.value}`}
                    >
                        {activeColor === color.value && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Check className="h-6 w-6 text-white drop-shadow-lg" />
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};
