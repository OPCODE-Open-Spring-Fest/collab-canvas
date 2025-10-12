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
            <div className="bg-toolbar border border-toolbar-border rounded-2xl shadow-xl backdrop-blur-sm p-3 flex flex-col gap-2">
                {colors.map((color) => (
                    <button
                        key={color.value}
                        onClick={() => onColorChange(color.value)}
                        className={cn(
                            "h-10 w-10 rounded-lg transition-all duration-200 hover:scale-110 relative",
                            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        )}
                        style={{ backgroundColor: color.value }}
                        aria-label={`Color ${color.value}`}
                    >
                        {activeColor === color.value && (
                            <Check className="h-5 w-5 text-white absolute inset-0 m-auto drop-shadow-md" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};
