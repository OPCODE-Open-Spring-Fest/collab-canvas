import { Slider } from "./ui/slider";

export const StrokeControl = ({ strokeWidth, onStrokeWidthChange }) => {
    return (
        <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50">
            <div className="bg-white/95 border border-gray-200/50 rounded-2xl shadow-xl backdrop-blur-md p-5 w-52 animate-float">
                <div className="space-y-4">
                    <div className="text-center">
                        <div className="text-xs font-semibold text-gray-600 mb-2">Stroke Width</div>
                        <div className="text-lg font-bold text-gray-700">{strokeWidth}px</div>
                    </div>
                    
                    <Slider
                        value={[strokeWidth]}
                        onValueChange={([value]) => onStrokeWidthChange(value)}
                        min={1}
                        max={20}
                        step={1}
                        className="w-full"
                    />
                    
                    <div className="flex justify-center pt-3">
                        <div className="relative">
                            <div
                                className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg transition-all duration-200"
                                style={{
                                    width: `${Math.max(strokeWidth * 2, 8)}px`,
                                    height: `${Math.max(strokeWidth * 2, 8)}px`,
                                }}
                            />
                            <div className="absolute inset-0 rounded-full bg-white/20"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
